"""Voice Lens: spoken results and spoken questions in Indian languages, using Google Gemini.

- spoken_summary(): turns a scan result into 2-3 short sentences in the user's language.
- synthesize(): Gemini text-to-speech -> playable audio (WAV), cached so a replay costs nothing.
- ask_by_voice(): Gemini listens to a recorded question, writes it down and answers it.

Without a GEMINI_API_KEY the summary still works (fixed templates in Hindi and English);
speech endpoints then return an explanatory error instead of failing silently.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import wave
from pathlib import Path

from .gemini_service import DEFAULT_MODEL, get_genai_client

# Languages offered in the app: code -> (name in its own script, English name)
LANGUAGES: dict[str, tuple[str, str]] = {
    "hi": ("हिन्दी", "Hindi"),
    "en": ("English", "English"),
    "bn": ("বাংলা", "Bengali"),
    "mr": ("मराठी", "Marathi"),
    "ta": ("தமிழ்", "Tamil"),
    "te": ("తెలుగు", "Telugu"),
    "gu": ("ગુજરાતી", "Gujarati"),
    "kn": ("ಕನ್ನಡ", "Kannada"),
    "ml": ("മലയാളം", "Malayalam"),
    "pa": ("ਪੰਜਾਬੀ", "Punjabi"),
}

TTS_MODELS = [m for m in [os.environ.get("GEMINI_TTS_MODEL"),
                          "gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts",
                          "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"] if m]
VOICE_NAME = os.environ.get("GEMINI_TTS_VOICE", "Kore")
CACHE_DIR = Path(os.environ.get("VOICE_CACHE_DIR", Path(__file__).resolve().parent.parent / "data" / "voice_cache"))

NOT_ADVICE = {
    "hi": "यह सामान्य जानकारी है, डॉक्टर की सलाह नहीं।",
    "en": "This is general information, not medical advice.",
}

# Short on-screen and spoken lines used by the first-run guide, in Hindi and English.
GUIDE_LINES = {
    "hi": [
        "नमस्ते! मैं आपको तीन आसान कदम में यह ऐप सिखाऊँगा।",
        "पैकेट को पलटिए और पीछे वाले हिस्से की फ़ोटो लीजिए।",
        "फ़ोटो के बाद मैं ख़ुद बोलकर बताऊँगा कि इसमें क्या है।",
        "कुछ पूछना हो तो माइक वाला बटन दबाकर बोलिए।",
    ],
    "en": [
        "Hello! I will teach you this app in three easy steps.",
        "Turn the packet over and take a photo of the back.",
        "After the photo, I will tell you out loud what is inside.",
        "To ask anything, press the microphone button and speak.",
    ],
}


def lang_or_default(lang: str | None) -> str:
    return lang if lang in LANGUAGES else "hi"


_GUIDE_CACHE: dict[str, list[str]] = {}


def guide_lines(lang: str) -> dict:
    """First-run guide in the chosen language. Hindi and English are fixed text; other languages
    are translated once by Gemini and kept in memory. Falls back to Hindi."""
    lang = lang_or_default(lang)
    if lang in GUIDE_LINES:
        return {"lang": lang, "lines": GUIDE_LINES[lang]}
    if lang in _GUIDE_CACHE:
        return {"lang": lang, "lines": _GUIDE_CACHE[lang]}
    client = get_genai_client()
    if client:
        prompt = (f"Translate these 4 short app-guide lines into simple spoken {LANGUAGES[lang][1]} "
                  f"({LANGUAGES[lang][0]} script). Reply only with a JSON array of 4 strings.\n"
                  + json.dumps(GUIDE_LINES["en"]))
        try:
            raw = client.models.generate_content(model=DEFAULT_MODEL, contents=prompt).text or ""
            lines = json.loads(re.search(r"\[.*\]", raw, re.S).group(0))
            if isinstance(lines, list) and len(lines) == 4:
                _GUIDE_CACHE[lang] = [str(x) for x in lines]
                return {"lang": lang, "lines": _GUIDE_CACHE[lang]}
        except Exception:
            pass
    return {"lang": "hi", "lines": GUIDE_LINES["hi"]}


# ---------------------------------------------------------------- spoken summary

def _facts(result: dict) -> dict:
    """The few facts worth saying out loud, pulled from a scan / product result."""
    ts = result.get("truth_score") or {}
    comp = result.get("compliance") or {}
    return {
        "name": result.get("name") or "",
        "score": ts.get("score"),
        "grade": ts.get("grade"),
        "sugars": [s.get("name") for s in (result.get("hidden_sugars") or [])][:3],
        "fats": [f.get("name") for f in (result.get("industrial_fats") or [])][:2],
        "risky_additives": [a.get("name") for a in (result.get("additives") or [])
                            if str(a.get("risk", a.get("safety", ""))).lower() in ("high", "avoid", "high risk")][:2],
        "misleading_claims": [c.get("claim") for c in (result.get("claim_verdicts") or [])
                              if "inconsisten" in str(c.get("status", ""))][:2],
        "missing_declarations": [c.get("label") for c in (comp.get("checks") or []) if c.get("status") == "fail"][:3],
    }


def template_summary(result: dict, lang: str) -> str:
    """Deterministic fallback when Gemini is unavailable (Hindi or English only)."""
    f = _facts(result)
    hi = lang_or_default(lang) != "en"
    parts = []
    if f["score"] is not None:
        parts.append(f"{f['name']} का स्कोर 100 में से {f['score']} है।" if hi
                     else f"{f['name']} scores {f['score']} out of 100.")
    if f["sugars"]:
        parts.append(("इसमें छिपी हुई चीनी है: " if hi else "It has hidden sugar: ") + ", ".join(f["sugars"]) + ("।" if hi else "."))
    if f["fats"]:
        parts.append(("इसमें पाम ऑयल या हाइड्रोजनेटेड फ़ैट है।" if hi else "It contains palm oil or hydrogenated fat."))
    if f["misleading_claims"]:
        parts.append(("पैकेट का यह दावा सही नहीं लगता: " if hi else "This claim on the pack looks misleading: ") + f["misleading_claims"][0] + ("।" if hi else "."))
    if f["missing_declarations"]:
        parts.append(("पैकेट पर ज़रूरी जानकारी नहीं मिली: " if hi else "Required label details are missing: ") + ", ".join(f["missing_declarations"]) + ("।" if hi else "."))
    if not parts:
        parts.append("इस पैकेट में कोई बड़ी समस्या नहीं मिली।" if hi else "No major problem was found on this pack.")
    return " ".join(parts[:3])


def spoken_summary(result: dict, lang: str = "hi") -> dict:
    """2-3 short sentences in the user's language, written for listening, not reading."""
    lang = lang_or_default(lang)
    facts = _facts(result)
    client = get_genai_client()
    if client:
        prompt = (
            f"Write what a phone app should SAY OUT LOUD to a shopper in a small Indian town, in "
            f"{LANGUAGES[lang][1]} ({LANGUAGES[lang][0]}), using simple everyday words a person with little schooling "
            "understands. At most 3 short sentences, about 40 words in total. Start with the single most important "
            "point. Use only these facts and add nothing else; do not give medical advice. No markdown, no emoji, "
            f"no lists.\n\nFacts: {json.dumps(facts, ensure_ascii=False)}"
        )
        try:
            res = client.models.generate_content(model=DEFAULT_MODEL, contents=prompt)
            text = (res.text or "").strip()
            if text:
                return {"lang": lang, "text": text, "source": "gemini"}
        except Exception:
            pass
    return {"lang": lang, "text": template_summary(result, lang), "source": "template"}


# ---------------------------------------------------------------- text-to-speech

def _pcm_to_wav(pcm: bytes, rate: int = 24000, channels: int = 1, width: int = 2) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


def _as_playable(data: bytes, mime: str) -> tuple[bytes, str]:
    """Gemini TTS has returned raw 16-bit PCM (audio/L16;rate=24000); wrap that in WAV.
    Already-encoded audio (wav, mp3, ogg) is passed through."""
    mime = (mime or "").lower()
    if "l16" in mime or "pcm" in mime or not mime:
        m = re.search(r"rate=(\d+)", mime)
        return _pcm_to_wav(data, int(m.group(1)) if m else 24000), "audio/wav"
    return data, mime.split(";")[0]


def audio_key(text: str, lang: str) -> str:
    return hashlib.sha256(f"{VOICE_NAME}|{lang}|{text}".encode()).hexdigest()[:24]


def cached_audio(key: str) -> tuple[bytes, str] | None:
    for ext, mime in (("wav", "audio/wav"), ("mp3", "audio/mpeg"), ("ogg", "audio/ogg")):
        p = CACHE_DIR / f"{key}.{ext}"
        if p.exists():
            return p.read_bytes(), mime
    return None


def synthesize(text: str, lang: str = "hi") -> dict:
    """Returns {"key", "mime"}; audio is stored in the cache and served by key."""
    lang = lang_or_default(lang)
    key = audio_key(text, lang)
    if cached_audio(key):
        return {"key": key, "cached": True}
    client = get_genai_client()
    if not client:
        raise RuntimeError("Voice needs GEMINI_API_KEY in backend/.env")
    from google.genai import types

    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE_NAME))),
    )
    errors = []
    for model in TTS_MODELS:
        try:
            res = client.models.generate_content(model=model, contents=text, config=config)
            part = next(p for p in res.candidates[0].content.parts if getattr(p, "inline_data", None))
            audio, mime = _as_playable(part.inline_data.data, part.inline_data.mime_type)
            ext = {"audio/wav": "wav", "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/ogg": "ogg"}.get(mime, "wav")
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            (CACHE_DIR / f"{key}.{ext}").write_bytes(audio)
            return {"key": key, "cached": False, "model": model}
        except Exception as e:  # try the next model name
            errors.append(f"{model}: {e}")
    raise RuntimeError("Text-to-speech failed: " + " | ".join(errors))


# ---------------------------------------------------------------- speech-to-text + answer

def ask_by_voice(audio: bytes, mime: str, lang: str = "hi", product_context: dict | None = None) -> dict:
    """Gemini listens to the recorded question, transcribes it and answers in the same language."""
    lang = lang_or_default(lang)
    client = get_genai_client()
    if not client:
        raise RuntimeError("Voice needs GEMINI_API_KEY in backend/.env")
    from google.genai import types

    context = json.dumps(_facts(product_context), ensure_ascii=False) if product_context else "none"
    instruction = (
        "The audio is a shopper's spoken question about a packaged food product or its label. "
        f"Reply ONLY with JSON: {{\"question\": <exact transcript in the language spoken>, \"answer\": <answer>}}. "
        f"Write the answer in {LANGUAGES[lang][1]} unless the question was clearly in another language; then use that. "
        "Answer in at most 3 short, simple spoken sentences. Use the product facts if they help. "
        "If the question is about a disease or a child's health, give general information only and say to ask a doctor. "
        f"Product facts: {context}"
    )
    res = client.models.generate_content(
        model=DEFAULT_MODEL,
        contents=[types.Part.from_bytes(data=audio, mime_type=(mime or "audio/webm").split(";")[0]), instruction],
    )
    raw = (res.text or "").strip()
    m = re.search(r"\{.*\}", raw, re.S)
    try:
        data = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        data = {}
    answer = (data.get("answer") or raw or "").strip()
    return {"lang": lang, "question": (data.get("question") or "").strip(), "answer": answer}
