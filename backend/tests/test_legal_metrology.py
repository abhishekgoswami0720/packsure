"""Legal Metrology checks are tied to rules/lmpc_rules.json and their in-force dates."""
from fastapi.testclient import TestClient

from app.compliance.legal_metrology import check_legal_metrology, min_numeral_height_mm
from app.main import app

LABEL = ("Glucose Biscuits Net Wt. 150 g MRP Rs 10 (incl. of all taxes) Rs 0.07 per g "
         "Mfd by X Ltd, Pune 411001 Mfg 10/2026 Customer care 1800 123 4567 care@x.com")


def test_table_I_boundaries():
    assert [min_numeral_height_mm(a) for a in (50, 50.1, 100, 500, 2500, 2501)] == [1.0, 1.5, 1.5, 2.5, 4.0, 6.0]
    assert min_numeral_height_mm(100, blown_or_moulded=True) == 3.0


def test_full_label_passes_rule6_and_cites_rules():
    r = check_legal_metrology(LABEL, product_name="Glucose Biscuits", on="2026-11-21")
    assert r["verdict"] == "compliant"
    assert all(c["rule"].startswith("LMPC Rules 2011") and c["source_pages"] for c in r["checks"])


def test_letter_height_fails_below_table_I():
    r = check_legal_metrology(LABEL, "Glucose Biscuits", panel_area_cm2=180, numeral_height_mm=1.75)
    lh = next(c for c in r["checks"] if c["id"] == "letter_height")
    assert lh["status"] == "fail" and lh["required_mm"] == 2.5


def test_unit_sale_price_not_checked_before_it_was_in_force():
    ids = [c["id"] for c in check_legal_metrology("", on="2023-06-01")["checks"]]
    assert "unit_sale_price" not in ids
    ids = [c["id"] for c in check_legal_metrology("", on="2024-01-01")["checks"]]
    assert "unit_sale_price" in ids


def test_food_defers_to_fssai_for_maker_and_date():
    checks = {c["id"]: c["status"] for c in check_legal_metrology("", is_food=True)["checks"]}
    assert checks["mfr_address"] == "warn" and checks["mfg_date"] == "warn"
    checks = {c["id"]: c["status"] for c in check_legal_metrology("", is_food=False)["checks"]}
    assert checks["mfr_address"] == "fail" and checks["mfg_date"] == "fail"


def test_letter_height_endpoint():
    res = TestClient(app).post("/api/compliance/letter-height",
                               json={"panel_area_cm2": 180, "numeral_height_mm": 3.0})
    assert res.status_code == 200 and res.json()["status"] == "pass"
