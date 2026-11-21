"""Voice Lens: summaries, audio wrapping and endpoints work without a Gemini key."""
import wave, io
from fastapi.testclient import TestClient

from app import voice_service
from app.main import app

client = TestClient(app)
RESULT = {"name": "Choco Bites", "truth_score": {"score": 38, "grade": "D"},
          "hidden_sugars": [{"name": "Maltodextrin"}], "industrial_fats": [{"name": "Palmolein"}],
          "compliance": {"checks": [{"label": "Unit Sale Price", "status": "fail"}]}}


def test_template_summary_hindi_and_english():
    hi = voice_service.template_summary(RESULT, "hi")
    en = voice_service.template_summary(RESULT, "en")
    assert "38" in hi and "Maltodextrin" in hi and "चीनी" in hi
    assert en.startswith("Choco Bites scores 38 out of 100.")


def test_unknown_language_falls_back_to_hindi():
    assert voice_service.lang_or_default("xx") == "hi"


def test_pcm_is_wrapped_as_wav():
    data, mime = voice_service._as_playable(bytes(4800), "audio/L16;codec=pcm;rate=24000")
    assert mime == "audio/wav"
    with wave.open(io.BytesIO(data)) as w:
        assert w.getframerate() == 24000 and w.getnframes() == 2400


def test_languages_endpoint_lists_native_names_and_guide():
    body = client.get("/api/voice/languages").json()
    assert body["default"] == "hi" and any(l["native"] == "हिन्दी" for l in body["languages"])
    assert len(body["guide"]["hi"]) == 4


def test_summary_returns_text_even_without_speech(monkeypatch):
    monkeypatch.setattr(voice_service, "get_genai_client", lambda: None)
    body = client.post("/api/voice/summary", json={"lang": "en", "result": RESULT}).json()
    assert body["source"] == "template" and body["audio_url"] is None and body["audio_error"]


def test_audio_key_is_validated():
    assert client.get("/api/voice/audio/..%2Fsecret").status_code in (400, 404)


def test_guide_falls_back_to_hindi_without_gemini(monkeypatch):
    monkeypatch.setattr(voice_service, "get_genai_client", lambda: None)
    assert client.get("/api/voice/guide?lang=ta").json()["lang"] == "hi"
    assert client.get("/api/voice/guide?lang=en").json()["lines"][0].startswith("Hello")


def test_provider_falls_back_to_gemini_without_sarvam_key(monkeypatch):
    monkeypatch.setattr(voice_service, "SARVAM_KEY", "")
    monkeypatch.setattr(voice_service, "VOICE_PROVIDER", "sarvam")
    assert voice_service.provider() == "gemini"


def test_sarvam_tts_used_and_cached(monkeypatch, tmp_path):
    import base64
    monkeypatch.setattr(voice_service, "SARVAM_KEY", "k")
    monkeypatch.setattr(voice_service, "VOICE_PROVIDER", "sarvam")
    monkeypatch.setattr(voice_service, "CACHE_DIR", tmp_path)
    wav = voice_service._pcm_to_wav(bytes(480))
    calls = []
    def fake(text, lang):
        calls.append((text, lang)); return wav
    monkeypatch.setattr(voice_service, "_sarvam_tts", fake)
    out = voice_service.synthesize("नमस्ते", "hi")
    assert out["provider"] == "sarvam" and calls == [("नमस्ते", "hi")]
    assert voice_service.synthesize("नमस्ते", "hi")["cached"] is True
