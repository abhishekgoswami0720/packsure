"""Legal Metrology compliance checking module integrating PackSure statutory standards."""
from __future__ import annotations

import datetime as dt
import json
import re
from functools import lru_cache
from pathlib import Path

# Rule data built from the legal corpus (repo root: rules/lmpc_rules.json, legal/text/).
RULES_FILE = Path(__file__).resolve().parents[3] / "rules" / "lmpc_rules.json"
ACT_REF = "Legal Metrology Act, 2009: s.18 (declarations on pre-packaged commodities); s.36 (penalty for non-standard packages)"

I = re.IGNORECASE
P = {
    "manufacturer": re.compile(r"\b(manufactured|mfd\.?|mfg\.?|marketed|packed|imported|distributed)\s*(and\s+\w+\s*)?(by|for)\b|\bmfr\b", I),
    "pin": re.compile(r"\b\d{3}\s?\d{3}\b"),
    "net_kw": re.compile(r"\bnet\s*\.?\s*(qty|quantity|wt|weight|vol|volume|content|contents|mass)?\b", I),
    "net_val": re.compile(r"(\d+(?:[.,]\d+)?)\s*(kgs|kg|gms|gm|grams|gram|gr|g|mg|mls|ml|ltrs|ltr|litres|litre|liters|liter|lt|l|n|nos|pcs|pieces|units?)\b", I),
    "date_kw": re.compile(r"\b(mfg|mfd|manufactured|date\s+of\s+(manufacture|mfg|packing|import)|pkd|packed|pkg|month\s*(and|&)\s*year\s+of\s+(manufacture|packing|import))\b", I),
    "mrp_kw": re.compile(r"\bm\.?\s?r\.?\s?p\.?\b|maximum\s+retail\s+price|max\.?\s*retail\s*price", I),
    "incl_taxes": re.compile(r"incl(\.|usive|uding)?\s*(of\s*)?(all\s*)?taxes|all\s*taxes\s*incl(\.|usive|uded)?", I),
    "usp": re.compile(r"unit\s*sale\s*price|\busp\b|(₹|rs\.?|inr)\s*\d+(?:[.,]\d+)?\s*(/|per)\s*(1\s*)?(g|kg|ml|l|unit|piece|pc|100\s*(g|ml))\b", I),
    "phone": re.compile(r"(\+?91[\s-]?)?(1800[\s-]?\d{3}[\s-]?\d{3,4}|[6-9]\d{9}|\d{2,5}[\s-]\d{6,8})"),
    "email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),
}


@lru_cache(maxsize=1)
def load_rules() -> dict:
    return json.loads(RULES_FILE.read_text(encoding="utf-8"))


def _rule(rule_id: str) -> dict:
    rules = load_rules()
    return next(r for r in rules["declarations"] + rules["presentation"] if r["id"] == rule_id)


def _cite(check: dict, rule_id: str) -> dict:
    """Attach the rule reference, its in-force date and the source page from the rule file."""
    r = _rule(rule_id)
    check.update(rule=f"LMPC Rules 2011, Rule {r['rule']}", in_force_from=r["in_force_from"],
                 basis=r["basis"], source_pages=r["source"]["pages"], act_reference=ACT_REF)
    return check


def min_numeral_height_mm(panel_area_cm2: float, blown_or_moulded: bool = False) -> float:
    """Rule 7(2), Table I: minimum numeral/letter height for a principal display panel area."""
    for row in _rule("numeral_height")["table_I"]:
        if row["area_cm2_max"] is None or panel_area_cm2 <= row["area_cm2_max"]:
            return row["min_mm_blown_moulded" if blown_or_moulded else "min_mm"]
    raise AssertionError("Table I has an open-ended last row")


def check_letter_height(panel_area_cm2: float | None, numeral_height_mm: float | None,
                        blown_or_moulded: bool = False) -> dict:
    """Rule 7 check. The numeral height must be measured (by the inspector, or from a photo with a
    reference marker); PackSure does not guess physical size from an ordinary photo."""
    check = {"id": "letter_height", "label": "Minimum Letter Height (Rule 7)"}
    if not panel_area_cm2 or not numeral_height_mm:
        check.update(status="warn", detail="Needs the display panel area (cm\u00b2) and the measured numeral height (mm) to check Rule 7.")
        return _cite(check, "numeral_height")
    need = min_numeral_height_mm(panel_area_cm2, blown_or_moulded)
    ok = numeral_height_mm >= need
    check.update(status="pass" if ok else "fail", measured_mm=numeral_height_mm, required_mm=need,
                 panel_area_cm2=panel_area_cm2,
                 detail=(f"Numerals measure {numeral_height_mm:g} mm; Table I requires at least {need:g} mm "
                         f"for a {panel_area_cm2:g} cm\u00b2 display panel."))
    return _cite(check, "numeral_height")


def check_legal_metrology(label_text: str, product_name: str = "", is_food: bool = True,
                          panel_area_cm2: float | None = None, numeral_height_mm: float | None = None,
                          on: str | None = None) -> dict:
    """Verifies mandatory declarations under the Legal Metrology (Packaged Commodities) Rules, 2011
    (Rule 6), and Rule 7 letter height when measurements are supplied. Each check cites its rule,
    in-force date and source page. Results support an inspector; they are not a legal finding."""
    checks = []
    text = label_text or ""

    # 1. Manufacturer / Packer Address
    has_mfr = bool(P["manufacturer"].search(text))
    has_pin = bool(P["pin"].search(text))
    if has_mfr and has_pin:
        checks.append({"id": "mfr_address", "label": "Manufacturer Details & PIN Code", "status": "pass", "detail": "Manufacturer details found with postal PIN code."})
    elif has_mfr:
        checks.append({"id": "mfr_address", "label": "Manufacturer Details", "status": "warn", "detail": "Manufacturer keyword found, but no clear postal PIN code detected."})
    elif is_food:
        checks.append({"id": "mfr_address", "label": "Manufacturer Details", "status": "warn", "detail": "Not found. For food, Rule 6(1)(a) Explanation III defers to FSSAI labelling rules; verify against those."})
    else:
        checks.append({"id": "mfr_address", "label": "Manufacturer Details", "status": "fail", "detail": "No 'Manufactured / Packed / Marketed by' declaration found."})

    # 2. Net Quantity
    m_net = P["net_val"].search(text)
    if m_net:
        unit = m_net.group(2).lower()
        if unit in ("gm", "gms", "grams", "gram"):
            checks.append({"id": "net_quantity", "label": "Net Quantity", "status": "warn", "detail": f"Net quantity uses non-standard symbol '{m_net.group(2)}'; statutory symbol is 'g'."})
        else:
            checks.append({"id": "net_quantity", "label": "Net Quantity", "status": "pass", "detail": f"Net quantity declared in statutory unit: {m_net.group(0)}."})
    elif P["net_kw"].search(text):
        checks.append({"id": "net_quantity", "label": "Net Quantity", "status": "warn", "detail": "Net quantity keyword present, but value could not be confirmed."})
    else:
        checks.append({"id": "net_quantity", "label": "Net Quantity", "status": "fail", "detail": "Net quantity declaration not found."})

    # 3. Maximum Retail Price (MRP)
    has_mrp = bool(P["mrp_kw"].search(text))
    has_taxes = bool(P["incl_taxes"].search(text))
    if has_mrp and has_taxes:
        checks.append({"id": "mrp", "label": "MRP Declaration", "status": "pass", "detail": "MRP with 'inclusive of all taxes' found."})
    elif has_mrp:
        checks.append({"id": "mrp", "label": "MRP Declaration", "status": "warn", "detail": "MRP found, but statutory statement 'inclusive of all taxes' was not confirmed."})
    else:
        checks.append({"id": "mrp", "label": "MRP Declaration", "status": "fail", "detail": "Retail sale price (MRP) not found."})

    # 4. Manufacturing / Packing Date
    has_date = bool(P["date_kw"].search(text))
    if has_date:
        checks.append({"id": "mfg_date", "label": "Date of Manufacture / Packing", "status": "pass", "detail": "Manufacturing / packing date declaration found."})
    elif is_food:
        checks.append({"id": "mfg_date", "label": "Date of Manufacture / Packing", "status": "warn", "detail": "Not found. For food, the proviso to Rule 6(1)(d) applies FSSAI date-marking rules instead; verify against those."})
    else:
        checks.append({"id": "mfg_date", "label": "Date of Manufacture / Packing", "status": "fail", "detail": "Month and year of manufacture or packing not found."})

    # 5. Consumer Care Details
    has_phone = bool(P["phone"].search(text))
    has_email = bool(P["email"].search(text))
    if has_phone and has_email:
        checks.append({"id": "consumer_care", "label": "Consumer Care Helpline", "status": "pass", "detail": "Consumer care phone number and email address found."})
    elif has_phone or has_email:
        checks.append({"id": "consumer_care", "label": "Consumer Care Helpline", "status": "warn", "detail": "Partial consumer care details found (requires both telephone and email under Rule 6)."})
    else:
        checks.append({"id": "consumer_care", "label": "Consumer Care Helpline", "status": "fail", "detail": "Consumer care telephone and email contact not found."})

    # 6. Common or generic name (Rule 6(1)(b))
    words = [w for w in re.findall(r"[a-z]{4,}", product_name.lower())]
    if not product_name:
        checks.append({"id": "common_name", "label": "Common / Generic Name", "status": "warn", "detail": "No product name supplied to compare against the label."})
    elif any(w in text.lower() for w in words):
        checks.append({"id": "common_name", "label": "Common / Generic Name", "status": "pass", "detail": "Product name found on the label."})
    else:
        checks.append({"id": "common_name", "label": "Common / Generic Name", "status": "warn", "detail": "Product name not found in the label text; check the front of pack."})

    # 7. Unit sale price (Rule 6(11), in force 1 Jan 2024)
    if P["usp"].search(text):
        checks.append({"id": "unit_sale_price", "label": "Unit Sale Price", "status": "pass", "detail": "Unit sale price declaration found."})
    else:
        checks.append({"id": "unit_sale_price", "label": "Unit Sale Price", "status": "fail", "detail": "Unit sale price (e.g. \u20b9 x.xx per g) not found. Not required only where MRP equals the unit sale price."})

    # 8. Rule 7 letter height (only when measurements are supplied)
    if panel_area_cm2 or numeral_height_mm:
        checks.append(check_letter_height(panel_area_cm2, numeral_height_mm))

    # Cite each Rule 6 check and drop any rule not yet in force on the inspection date.
    rule_ids = {"mfr_address": "manufacturer_name_address", "net_quantity": "net_quantity", "mrp": "mrp",
                "mfg_date": "month_year_of_manufacture", "consumer_care": "consumer_care",
                "common_name": "common_name", "unit_sale_price": "unit_sale_price"}
    day = dt.date.fromisoformat(on) if on else dt.date.today()
    cited = []
    for c in checks:
        if c["id"] in rule_ids:
            _cite(c, rule_ids[c["id"]])
        if dt.date.fromisoformat(c["in_force_from"]) <= day:
            cited.append(c)
    checks = cited

    n_fail = sum(c["status"] == "fail" for c in checks)
    n_warn = sum(c["status"] == "warn" for c in checks)

    if n_fail == 0 and n_warn == 0:
        verdict = "compliant"
    elif n_fail == 0:
        verdict = "needs_review"
    else:
        verdict = "non_compliant"

    return {
        "verdict": verdict,
        "checks": checks,
        "n_pass": sum(c["status"] == "pass" for c in checks),
        "n_warn": n_warn,
        "n_fail": n_fail,
    }
