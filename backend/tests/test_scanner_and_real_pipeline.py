"""Comprehensive tests for real barcode scanner, Open Food Facts v3, label OCR, and data pipeline."""
import io
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.off_client import fetch_open_food_facts_v3
from app.product_cache import get_cached_product, get_db_connection

client = TestClient(app)


def test_known_ean13_verified_local_barcode():
    """Tests scanning a known Indian product (Parle-G 8901719101013)."""
    res = client.get("/api/truth/barcode/8901719101013")
    assert res.status_code == 200
    data = res.json()
    assert "Parle-G" in data["name"]
    assert data["barcode"] == "8901719101013"
    assert data["primary_source"] in ("verified_local", "user_corrected")
    assert data["truth_score"]["score_out_of_5"] is not None
    assert "nova" in data
    assert "traffic_lights" in data
    assert len(data.get("additives", [])) >= 1


def test_open_food_facts_real_lookup_and_caching():
    """Tests looking up a real global product from Open Food Facts API v3 (Nutella 3017620422003)."""
    res = client.get("/api/truth/barcode/3017620422003")
    assert res.status_code == 200
    data = res.json()
    assert "Nutella" in data["name"]
    assert data["barcode"] == "3017620422003"
    assert "openfoodfacts" in data["primary_source"].lower()
    assert data["truth_score"]["score_out_of_5"] <= 3.0  # Nutella is high sugar/palm oil

    # Verify cached in SQLite
    cached = get_cached_product("3017620422003")
    assert cached is not None
    assert "Nutella" in cached.name


def test_unknown_barcode_honest_404():
    """Tests that an unknown barcode returns honest 404 and does NOT return Red Bull or default product."""
    unknown_code = "0000000000000"
    res = client.get(f"/api/truth/barcode/{unknown_code}")
    assert res.status_code == 404
    err_msg = res.json()["detail"]
    assert unknown_code in err_msg
    assert "not found" in err_msg.lower()


def test_invalid_empty_barcode_400():
    """Tests that empty or whitespace barcode returns 400 Bad Request."""
    res = client.get("/api/truth/barcode/%20%20")
    assert res.status_code == 400


def test_label_photo_upload_ocr_pipeline(monkeypatch):
    """Tests POST /api/truth/scan with packaging image and mock Gemini OCR transcription."""
    from app import gemini_service

    mock_ocr_result = {
        "product_name": "Organic Almond Milk",
        "brand": "PureHarvest",
        "claims": ["Unsweetened", "No Added Sugar", "100% Plant Based"],
        "ingredients_text": "Filtered Water, Activated Organic Almonds (10%), Sea Salt, Mineral (Calcium Carbonate).",
        "nutrition_per_100g": {
            "energy_kcal": 38,
            "protein_g": 1.5,
            "carbohydrates_g": 0.5,
            "total_sugars_g": 0.2,
            "fat_g": 3.2,
            "saturated_fat_g": 0.3,
            "sodium_mg": 45
        }
    }

    monkeypatch.setattr("app.main.gemini_parse_label_image", lambda img_bytes: mock_ocr_result)
    monkeypatch.setattr("app.gemini_service.gemini_parse_label_image", lambda img_bytes: mock_ocr_result)

    test_barcode = "8909876543210"
    img_data = b"FAKE_JPEG_IMAGE_DATA_12345"
    files = {"image": ("label.jpg", img_data, "image/jpeg")}
    data = {"barcode": test_barcode}

    try:
        res = client.post("/api/truth/scan", files=files, data=data)
        assert res.status_code == 200
        prod = res.json()
        assert prod["name"] == "Organic Almond Milk"
        assert prod["brand"] == "PureHarvest"
        assert prod["primary_source"] == "ocr_extracted"
        assert prod["truth_score"]["score_out_of_5"] >= 4.0  # Clean score
        assert prod["nova"]["group"] in (1, 3)

        # Verify saved to cache
        cached = get_cached_product(test_barcode)
        assert cached is not None
        assert cached.name == "Organic Almond Milk"

        # Subsequent barcode lookup should now hit the newly cached record
        lookup_res = client.get(f"/api/truth/barcode/{test_barcode}")
        assert lookup_res.status_code == 200
        assert lookup_res.json()["name"] == "Organic Almond Milk"
    finally:
        # Cleanup
        with get_db_connection() as conn:
            conn.execute("DELETE FROM product_cache WHERE barcode = ?", (test_barcode,))
            conn.commit()


def test_label_upload_unreadable_image_fails_honestly():
    """Tests that an unreadable blank image returns 422 error and does NOT return a fake report."""
    files = {"image": ("corrupted.jpg", b"NOT_A_VALID_IMAGE", "image/jpeg")}
    res = client.post("/api/truth/scan", files=files)
    assert res.status_code == 422
    assert "Could not detect readable ingredients" in res.json()["detail"]


def test_no_default_product_substitution():
    """Verifies that queries for different barcodes never silently substitute Red Bull or another product."""
    # 1. Query Bournvita
    res_b = client.get("/api/truth/barcode/8901233010123")
    assert res_b.status_code == 200
    assert "Bournvita" in res_b.json()["name"]
    assert "Red Bull" not in res_b.json()["name"]

    # 2. Query Maggi
    res_m = client.get("/api/truth/barcode/8901058852230")
    assert res_m.status_code == 200
    assert "Maggi" in res_m.json()["name"]
    assert "Red Bull" not in res_m.json()["name"]


def test_expanded_indian_fmcg_barcodes_found():
    """Verifies popular Indian FMCG products resolve immediately with nutrition & score."""
    test_cases = [
        ("8901063018249", "Britannia"),
        ("7622201138248", "Cadbury"),
        ("8901491103756", "Kurkure"),
        ("8904004400588", "Haldiram"),
        ("8901764012234", "Thums Up"),
    ]
    for code, expected_kw in test_cases:
        res = client.get(f"/api/truth/barcode/{code}")
        assert res.status_code == 200, f"Barcode {code} should resolve with 200"
        data = res.json()
        assert expected_kw.lower() in data["name"].lower() or expected_kw.lower() in data["brand"].lower()
        assert data["truth_score"]["score"] is not None
        assert data["nova"]["group"] is not None


def test_unindexed_barcode_ai_synthesis_fallback():
    """Verifies that an unindexed real barcode triggers AI synthesis instead of dead-end 404."""
    test_unindexed_code = "8901030554433"  # HUL prefix, unindexed
    try:
        res = client.get(f"/api/truth/barcode/{test_unindexed_code}")
        assert res.status_code == 200
        data = res.json()
        assert data["primary_source"] == "ai_synthesized"
        assert data["truth_score"]["score"] is not None
        assert len(data["ingredients_text"]) > 10
    finally:
        # Clean up cache
        import sqlite3
        conn = sqlite3.connect("backend/app/knowledge/product_cache.sqlite")
        conn.execute("DELETE FROM product_cache WHERE barcode = ?", (test_unindexed_code,))
        conn.commit()
        conn.close()

