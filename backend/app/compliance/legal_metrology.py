"""Legal Metrology compliance checking module integrating PackSure statutory standards."""
from __future__ import annotations

import re

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


def check_legal_metrology(label_text: str) -> dict:
    """Verifies mandatory declarations under the Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 6)."""
    checks = []
    text = label_text or ""

    # 1. Manufacturer / Packer Address
    has_mfr = bool(P["manufacturer"].search(text))
    has_pin = bool(P["pin"].search(text))
    if has_mfr and has_pin:
        checks.append({"id": "mfr_address", "label": "Manufacturer Details & PIN Code", "status": "pass", "detail": "Manufacturer details found with postal PIN code."})
    elif has_mfr:
        checks.append({"id": "mfr_address", "label": "Manufacturer Details", "status": "warn", "detail": "Manufacturer keyword found, but no clear postal PIN code detected."})
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
