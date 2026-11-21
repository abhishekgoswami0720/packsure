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


def test_letter_height_audit_endpoint():
    # Pass case: area 250 cm2 has statutory min 2.5 mm under Rule 7 Table I
    res = client.post("/api/compliance/letter-height", json={
        "panel_area_cm2": 250.0,
        "actual_height_mm": 4.5,
        "is_blown_or_moulded": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "PASS"
    assert data["statutory_min_height_mm"] == 2.5

    # Non-compliant case: area 600 cm2 requires min 4.0 mm, actual 1.8 mm
    res_fail = client.post("/api/compliance/letter-height", json={
        "panel_area_cm2": 600.0,
        "actual_height_mm": 1.8,
        "is_blown_or_moulded": False
    })
    assert res_fail.status_code == 200
    fail_data = res_fail.json()
    assert fail_data["verdict"] == "NON-COMPLIANT"
    assert fail_data["statutory_min_height_mm"] == 4.0
    assert fail_data["difference_mm"] < 0
    assert fail_data["statutory_penalty_inr"] > 0


def test_extract_declarations_endpoint():
    sample_label = "Mfd by Harvest Foods Ltd, Indiranagar, Bangalore 560038. Net Qty: 400g. MRP Rs 149.00 (inclusive of all taxes). Rs 0.37 per g. Pkd: 11/2026. Consumer care: 1800-111-222, support@harvest.in"
    res = client.post("/api/compliance/extract-declarations", json={"label_text": sample_label})
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] in ("compliant", "needs_review")
    assert data["n_pass"] >= 4
    assert data["extracted_values"]["mrp"] is not None
    assert data["extracted_values"]["net_quantity"] is not None


def test_inspection_dossiers_and_determination():
    # 1. List inspections
    res = client.get("/api/compliance/inspections")
    assert res.status_code == 200
    dossiers = res.json()
    assert len(dossiers) >= 3

    # 2. Create new inspection
    new_insp = {
        "product_name": "Test Snack Pack",
        "brand": "TestBrand",
        "retailer": "Indiranagar Supermart",
        "panel_area_cm2": 150.0,
        "detected_numeral_height_mm": 1.2,
        "inspector_notes": "Deficient net weight font size."
    }
    create_res = client.post("/api/compliance/inspections", json=new_insp)
    assert create_res.status_code == 200
    created = create_res.json()
    assert "id" in created
    assert created["violations"][0]["rule"] == "Rule 7(2) Table-I"

    # 3. Supervisory determination
    d_id = created["id"]
    det_res = client.post(f"/api/compliance/dossiers/{d_id}/determination", json={
        "action": "approve_notice",
        "comments": "Statutory notice under Section 36 issued.",
        "compounding_fee": 25000
    })
    assert det_res.status_code == 200
    assert det_res.json()["status"] == "notice_approved"

    # 4. Metrics
    met_res = client.get("/api/compliance/supervisor/metrics")
    assert met_res.status_code == 200
    metrics = met_res.json()
    assert metrics["total_dossiers"] >= 4
    assert metrics["clearance_velocity_percent"] > 0


def test_consumer_complaints_and_daily_log():
    # Complaints
    c_res = client.get("/api/consumer/complaints")
    assert c_res.status_code == 200
    assert len(c_res.json()) >= 3

    post_c = client.post("/api/consumer/complaints", json={
        "product_name": "SuperAtta Cookies",
        "brand": "CookieCo",
        "issue": "Claimed 100% Atta but maida is 45% of total ingredients.",
        "evidence_text": "Back of pack photo uploaded."
    })
    assert post_c.status_code == 200
    assert post_c.json()["status"] == "Active Petition"

    # Daily log
    log_res = client.get("/api/consumer/daily-log")
    assert log_res.status_code == 200
    data = log_res.json()
    assert "totals" in data
    assert "limits" in data
    assert data["limits"]["sugar_limit_g"] == 25.0

    # Add log item
    add_item = client.post("/api/consumer/daily-log", json={
        "product_name": "Fruit Snack Bar",
        "sugars_g": 8.0,
        "energy_kcal": 120.0,
        "serving_g": 35.0,
        "nova_group": 3
    })
    assert add_item.status_code == 200
    assert add_item.json()["product_name"] == "Fruit Snack Bar"


def test_additives_and_gut_biome_endpoints():
    # List additives
    res = client.get("/api/truth/additives?abroad_bans_only=true")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 5
    assert all(a.get("abroad_status") for a in data["additives"])

    # Gut biome for INS 330
    biome_res = client.get("/api/truth/additives/330/biome")
    assert biome_res.status_code == 200
    b_data = biome_res.json()
    assert b_data["ins"] == "330"
    assert "Aspergillus niger" in b_data["common_source"]
    assert len(b_data["gut_biome_findings"]) >= 1

    # Gut biome for INS 407
    biome_407 = client.get("/api/truth/additives/407/biome")
    assert biome_407.status_code == 200
    assert biome_407.json()["name"] == "Carrageenan"
