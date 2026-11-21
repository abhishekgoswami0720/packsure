"""Automated tests for FastAPI endpoints in TruthLens API."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "TruthLens API"
    assert data["catalog_size"] > 0


def test_web_app_served_at_root():
    res = client.get("/")
    assert res.status_code == 200
    assert "TruthLens" in res.text
    assert "Know what's really inside" in res.text


def test_barcode_lookup_endpoint_success():
    res = client.get("/api/truth/barcode/8901719101013")  # Parle-G
    assert res.status_code == 200
    data = res.json()
    assert "Parle-G" in data["name"]
    assert "truth_score" in data
    assert "nova" in data
    assert "traffic_lights" in data


def test_barcode_lookup_endpoint_not_found():
    res = client.get("/api/truth/barcode/0000000000000")
    assert res.status_code == 404


def test_popular_products_endpoint():
    res = client.get("/api/truth/popular")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 5


def test_search_endpoint():
    res = client.get("/api/truth/search?q=noodles")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert any("Maggi" in p["name"] for p in data)


def test_ingredient_lookup_endpoint():
    res = client.get("/api/truth/ingredients/lookup?q=211")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    hit = data["results"][0]
    assert hit["ins"] == "211"
    assert "Sodium Benzoate" in hit["name"]


def test_manual_scan_endpoint():
    payload = {
        "name": "Test Healthy Bar",
        "claims": ["100% Atta", "No Added Sugar"],
        "ingredients_text": "Refined Wheat Flour (Maida), Sugar, Palm Oil, Invert Syrup, INS 211, INS 102.",
        "nutrition": {
            "energy_kcal": 450,
            "total_sugars_g": 22.0,
            "saturated_fat_g": 7.0,
            "sodium_mg": 400
        }
    }
    res = client.post("/api/truth/scan/manual", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test Healthy Bar"
    assert data["nova"]["group"] == 4
    # Deceptive claim buster should flag maida
    inconsistencies = [c for c in data["claim_verdicts"] if c["status"] in ("verified_inconsistency", "potential_inconsistency")]
    assert len(inconsistencies) >= 1


def test_compare_endpoint():
    payload = {
        "product_id_1": "parle_g",
        "product_id_2": "britannia_nutrichoice_atta"
    }
    res = client.post("/api/truth/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "overall_winner" in data
    assert "product_1" in data
    assert "product_2" in data


def test_alternatives_endpoint():
    payload = {
        "product_id": "maggi_masala_noodles",
        "category": "Instant Noodles & Pasta"
    }
    res = client.post("/api/truth/alternatives", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    assert any("Slurrp Farm" in r["brand"] for r in data["recommendations"])


def test_stitch_screens_endpoint():
    res = client.get("/api/stitch/screens")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 15
    assert len(data["screens"]) == 15
    # Verify screen ids exist
    ids = [s["id"] for s in data["screens"]]
    assert "packsure_ai_consumer_home_dashboard" in ids
    assert "packsure_ai_voice_lens_assistant" in ids
    assert "packsure_ai_letter_height_audit" in ids


def test_voice_assistant_endpoint():
    payload = {
        "query": "Is maltodextrin safe for a diabetic person?",
        "product_context": {
            "name": "Bournvita",
            "hidden_sugars": [{"name": "Maltodextrin", "gi": 110}]
        }
    }
    res = client.post("/api/truth/voice-assistant", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "answer" in data
    assert len(data["answer"]) > 10
