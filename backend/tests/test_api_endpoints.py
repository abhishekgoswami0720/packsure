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
    assert data["service"] == "PackSure API"
    assert data["catalog_size"] > 0


def test_web_app_served_at_root():
    res = client.get("/")
    assert res.status_code == 200
    assert "PackSure" in res.text
    assert "Know what's really inside" in res.text
    # Ensure all primary navigation views exist in DOM
    assert 'id="view-search"' in res.text
    assert 'id="view-categories"' in res.text
    assert 'id="view-profile"' in res.text


def test_pwa_and_favicon_assets():
    # 1. Manifest
    res = client.get("/manifest.json")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("application/manifest+json")
    manifest = res.json()
    assert manifest["name"] == "PackSure — Food Intelligence & Consumer Transparency"
    assert manifest["display"] == "standalone"
    assert len(manifest["icons"]) >= 3

    # 2. Service Worker
    res = client.get("/sw.js")
    assert res.status_code == 200
    assert "application/javascript" in res.headers["content-type"]
    assert "packsure-pwa" in res.text

    # 3. Favicon & Icons
    for path in ("/favicon.svg", "/favicon.ico", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"):
        res = client.get(path)
        assert res.status_code == 200, f"Failed for {path}"
        assert len(res.content) > 0


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


def test_categories_endpoint():
    res = client.get("/api/truth/categories")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 5
    cat_names = [c["name"] for c in data]
    assert "Food" in cat_names
    assert "Personal Care" in cat_names
    assert "Energy & Sports Drinks" in cat_names


def test_red_bull_and_alternatives():
    res = client.get("/api/truth/barcode/9002490100070")
    assert res.status_code == 200
    data = res.json()
    assert "Red Bull" in data["name"]
    assert data["truth_score"]["score_out_of_5"] == 1.5
    assert data["truth_score"]["rating_label"] == "Poor"
    assert data["nova"]["group"] == 4
    # Clean alternatives
    alts = data["alternatives"]
    assert len(alts) >= 1
    alt_names = [a["name"] for a in alts]
    assert any("Delulu" in n or "Fast&Up" in n for n in alt_names)


def test_consumer_favorites_lifecycle():
    # 1. Get favorites
    res = client.get("/api/consumer/favorites")
    assert res.status_code == 200
    favs = res.json()["favorites"]
    assert len(favs) >= 1

    # 2. Add favorite
    add_res = client.post("/api/consumer/favorites", json={"product_id": "9002490100070"})
    assert add_res.status_code == 200

    # 3. Check is_favorite
    chk_res = client.get("/api/consumer/favorites/check/9002490100070")
    assert chk_res.status_code == 200
    assert chk_res.json()["is_favorite"] is True

    # 4. Remove favorite
    del_res = client.delete("/api/consumer/favorites/9002490100070")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # 5. Verify removed
    chk_after = client.get("/api/consumer/favorites/check/9002490100070")
    assert chk_after.json()["is_favorite"] is False


def test_consumer_history_and_feedback():
    # History
    h_res = client.get("/api/consumer/history")
    assert h_res.status_code == 200
    assert len(h_res.json()["history"]) >= 1

    # Feedback
    fb_res = client.post("/api/consumer/feedback", json={
        "product_id": "9002490100070",
        "purchase_intent": "no",
        "helpful": True,
        "comment": "Too much sugar and caffeine"
    })
    assert fb_res.status_code == 200
    assert fb_res.json()["status"] == "success"


def test_consumer_profile():
    # Get profile
    p_res = client.get("/api/consumer/profile")
    assert p_res.status_code == 200
    profile = p_res.json()
    assert profile["diet"] == "vegetarian"

    # Update profile
    up_res = client.post("/api/consumer/profile", json={
        "diet": "vegan",
        "goals": ["high_protein", "low_added_sugar"]
    })
    assert up_res.status_code == 200
    updated = up_res.json()
    assert updated["diet"] == "vegan"
    assert "high_protein" in updated["goals"]


def test_multi_source_provenance_and_citations():
    # 1. Barcode lookup has full provenance & citations
    res = client.get("/api/truth/barcode/8901719101013")  # Parle-G
    assert res.status_code == 200
    data = res.json()
    assert data["primary_source"] in ("verified_local", "user_corrected")
    assert "retrieved_at" in data
    assert "provenance" in data
    assert "citation_authorities" in data
    assert len(data["citation_authorities"]) >= 4

    # 2. Additive citations include Codex GSFA & JECFA ADI
    additives = data.get("additives", [])
    assert len(additives) >= 1
    ins_item = next((a for a in additives if a.get("ins") in ("322", "500")), None)
    assert ins_item is not None
    assert "citations" in ins_item
    assert "codex_gsfa" in ins_item["citations"]
    assert "jecfa" in ins_item["citations"]


def test_user_product_correction_and_conflict_preservation():
    from app.product_cache import save_product_to_cache, get_db_connection
    from app.schema import TruthLensProductRecord, DataSource, StandardNutrition100g, FieldProvenance
    import datetime as dt

    test_barcode = "8909999999999"
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()

    # 1. Seed initial record
    initial_record = TruthLensProductRecord(
        barcode=test_barcode,
        id="test_prod_999",
        name="Original Test Name",
        brand="TestBrand",
        category="Snacks",
        ingredients_text="Wheat, Sugar, Salt.",
        nutrition_per_100g=StandardNutrition100g(energy_kcal=400, total_sugars_g=20.0, sodium_mg=200),
        primary_source=DataSource.VERIFIED_LOCAL,
        retrieved_at=now_iso,
        provenance={"name": FieldProvenance(source=DataSource.VERIFIED_LOCAL, retrieved_at=now_iso, confidence=1.0)}
    )
    save_product_to_cache(initial_record)

    try:
        # 2. Submit user correction
        correction_payload = {
            "barcode": test_barcode,
            "name": "Corrected Test Name (Verified)",
            "brand": "TestBrand",
            "category": "Snacks",
            "ingredients_text": "Whole Wheat, Raw Cane Sugar, Himalayan Rock Salt, Emulsifier INS 322.",
            "nutrition_per_100g": {
                "energy_kcal": 410,
                "total_sugars_g": 18.0,
                "sodium_mg": 180
            },
            "serving_size_g": 30.0,
            "actor": "qa_inspector_01"
        }
        res = client.post("/api/truth/product/correct", json=correction_payload)
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "success"
        prod = res_data["product"]
        assert prod["name"] == "Corrected Test Name (Verified)"
        assert prod["provenance"]["name"]["source"] == "user_corrected"
        assert "qa_inspector_01" in prod["provenance"]["name"]["notes"]

        # Conflicting previous name should be recorded
        conflicts = prod.get("conflicts", [])
        assert any(c["field_name"] == "name" for c in conflicts)
        name_conflict = next(c for c in conflicts if c["field_name"] == "name")
        assert name_conflict["previous_value"] == "Original Test Name"

        # 3. Lookup via barcode should reflect corrected data and conflicts
        lookup_res = client.get(f"/api/truth/barcode/{test_barcode}")
        assert lookup_res.status_code == 200
        lookup_data = lookup_res.json()
        assert lookup_data["name"] == "Corrected Test Name (Verified)"
        assert lookup_data["provenance"]["name"]["source"] == "user_corrected"
    finally:
        # Clean up test record from database
        with get_db_connection() as conn:
            conn.execute("DELETE FROM product_cache WHERE barcode = ?", (test_barcode,))
            conn.execute("DELETE FROM audit_log WHERE barcode = ?", (test_barcode,))
            conn.commit()


def test_source_coverage_and_transparency_endpoint():
    res = client.get("/api/truth/sources/coverage")
    assert res.status_code == 200
    report = res.json()
    assert "total_cached_products" in report
    assert report["total_cached_products"] >= 14
    assert "sources_breakdown" in report
    assert "completeness_rates" in report
    assert report["completeness_rates"]["ingredients_declared_pct"] > 0
    assert "disclaimer" in report
    assert "official_citation_registry" in report
    assert len(report["official_citation_registry"]) >= 5


