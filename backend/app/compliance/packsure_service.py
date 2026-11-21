"""PackSure Legal Metrology & Inspection Service Layer.
Integrates statutory compliance rules under Legal Metrology (Packaged Commodities) Rules, 2011,
enforcement dossiers, consumer complaints, and field inspection workflows.
"""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Any, Dict, List, Optional
from pathlib import Path
import json

# Import statutory rules from project rules engine
import sys
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from rules.lmpc import min_numeral_height_mm, rules_in_force, is_exempt_small_pack
except ImportError:
    def min_numeral_height_mm(area: float, blown: bool = False) -> float:
        if area <= 50:
            return 1.5 if not blown else 2.0
        elif area <= 100:
            return 2.0 if not blown else 2.5
        elif area <= 500:
            return 4.0 if not blown else 4.0
        elif area <= 1000:
            return 6.0 if not blown else 6.0
        return 8.0 if not blown else 8.0

    def rules_in_force(rules: dict, on: str | None = None) -> list:
        return []

    def is_exempt_small_pack(net_qty: float, prod: str = "", on: str | None = None) -> bool:
        return net_qty <= 10.0


# ------------------------------------------------------------------ In-Memory State & Seed Data
INSPECTION_DOSSIERS: List[Dict[str, Any]] = [
    {
        "id": "DOS-2026-KA-8841",
        "dossier_no": "LMD-2026-KA-8841-F6",
        "created_at": "2026-11-20T10:30:00Z",
        "product_name": "Harvest Crunch Multigrain Granola & Berries",
        "brand": "Harvest Foods Ltd.",
        "category": "Breakfast Cereals",
        "batch_no": "HC-0924-B",
        "retailer": "Spencer's Retail, 100ft Road, Indiranagar, Bangalore",
        "district": "Bangalore Urban (South Hub)",
        "inspector_id": "INS-704 (S. Murthy)",
        "status": "under_review",  # draft, submitted, under_review, notice_approved, compounded, dismissed
        "priority": "high",
        "panel_area_cm2": 320.0,
        "declared_net_quantity": "400 g",
        "detected_numeral_height_mm": 1.8,
        "statutory_min_height_mm": 4.0,
        "violations": [
            {
                "rule": "Rule 7(2) Table-I",
                "title": "Sub-standard Numeral Height",
                "finding": "Net quantity numeral height is 1.8 mm against statutory minimum requirement of 4.0 mm for a 320 cm² display panel.",
                "severity": "major",
                "section": "Sec 36(1) Legal Metrology Act, 2009"
            },
            {
                "rule": "Rule 6(1)(s)",
                "title": "Missing Unit Sale Price (USP)",
                "finding": "Unit Sale Price (₹ per gram) declaration missing on packaging above 100g.",
                "severity": "major",
                "section": "Sec 36(1) Legal Metrology Act, 2009"
            }
        ],
        "evidence_photos": [
            "https://images.unsplash.com/photo-1517479149777-5f3b1511d7ad?w=600",
            "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600"
        ],
        "inspector_notes": "Spot inspection verified 48 retail units on shelf displaying sub-statutory font size. Seizure memo prepared.",
        "compounding_fee_proposed": 25000,
        "review_comments": "",
        "determination": None
    },
    {
        "id": "DOS-2026-MH-4102",
        "dossier_no": "LMD-2026-MH-4102-F4",
        "created_at": "2026-11-19T14:15:00Z",
        "product_name": "Fresh Valley Cow Ghee",
        "brand": "Fresh Valley Dairies",
        "category": "Dairy",
        "batch_no": "FVG-1102",
        "retailer": "Nature's Basket, Hill Road, Bandra, Mumbai",
        "district": "Mumbai Suburban",
        "inspector_id": "INS-512 (A. Kadam)",
        "status": "notice_approved",
        "priority": "medium",
        "panel_area_cm2": 210.0,
        "declared_net_quantity": "500 ml",
        "detected_numeral_height_mm": 4.2,
        "statutory_min_height_mm": 4.0,
        "violations": [
            {
                "rule": "Rule 6(1)(e)",
                "title": "Improper MRP Declaration",
                "finding": "MRP declared without mandatory 'inclusive of all taxes' statement.",
                "severity": "moderate",
                "section": "Sec 36(1) Legal Metrology Act, 2009"
            }
        ],
        "evidence_photos": [
            "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600"
        ],
        "inspector_notes": "Manufacturer omitted statutory tax clause on retail lot of 120 units.",
        "compounding_fee_proposed": 20000,
        "review_comments": "Formal notice under Section 36 approved with 15 days compliance window.",
        "determination": "approved"
    },
    {
        "id": "DOS-2026-DL-1944",
        "dossier_no": "LMD-2026-DL-1944-F9",
        "created_at": "2026-11-18T11:00:00Z",
        "product_name": "Artisan Roasted Almonds",
        "brand": "NutriCraft Snacks",
        "category": "Nuts & Dry Fruits",
        "batch_no": "NC-8821",
        "retailer": "Modern Bazaar, Vasant Vihar, New Delhi",
        "district": "New Delhi (South Division)",
        "inspector_id": "INS-309 (V. Sharma)",
        "status": "compounded",
        "priority": "high",
        "panel_area_cm2": 150.0,
        "declared_net_quantity": "200 g",
        "detected_numeral_height_mm": 2.5,
        "statutory_min_height_mm": 4.0,
        "violations": [
            {
                "rule": "Sec 36(2) LMA 2009",
                "title": "Dual MRP Sticker Alteration",
                "finding": "Printed MRP ₹199 overwritten with sticker of ₹249 at retail store.",
                "severity": "critical",
                "section": "Sec 36(2) Legal Metrology Act, 2009"
            }
        ],
        "evidence_photos": [
            "https://images.unsplash.com/photo-1508061252966-f72fb98abc22?w=600"
        ],
        "inspector_notes": "Retailer admitted overpricing. Compounding notice issued.",
        "compounding_fee_proposed": 50000,
        "review_comments": "Compounded by Assistant Controller; fee of ₹50,000 deposited.",
        "determination": "compounded"
    }
]

CONSUMER_PETITIONS: List[Dict[str, Any]] = [
    {
        "id": "PET-2026-081",
        "title": "Harvest Crunch Granola 400g — Deceptive '100% Whole Grain' Claim",
        "product_name": "Harvest Crunch Multigrain Granola",
        "brand": "Harvest Foods Ltd.",
        "filed_on": "2026-11-19",
        "category": "Misleading Advertising / Consumer Protection",
        "issue": "Front package boldly claims '100% Whole Wheat & Oats', whereas ingredient list reveals Refined Wheat Flour (Maida) as the predominant flour ingredient (42%).",
        "evidence_text": "Ingredients: Refined Wheat Flour (Maida 42%), Whole Wheat (14%), Sugar, Palm Oil...",
        "status": "Active Petition",
        "authority": "Legal Metrology Enforcement Directorate & CCPA",
        "case_stage": "Statutory Notice Served to Packer",
        "claimant": "Parv Mishra (Consumer)",
        "responses_count": 4
    },
    {
        "id": "PET-2026-042",
        "title": "Fresh Valley Cow Ghee 500ml — Overcharging above printed MRP",
        "product_name": "Fresh Valley Cow Ghee",
        "brand": "Fresh Valley Dairies",
        "filed_on": "2026-11-15",
        "category": "Overpricing / Section 36 LMA",
        "issue": "Supermarket billed ₹380 against printed Maximum Retail Price (MRP) of ₹360.",
        "evidence_text": "Cash memo #5521 dated 15-Nov-2026 showing billing at ₹380.",
        "status": "Active Petition",
        "authority": "District Legal Metrology Inspector",
        "case_stage": "Retailer Summoned for Compounding",
        "claimant": "Ananya K. (Consumer)",
        "responses_count": 2
    },
    {
        "id": "PET-2026-019",
        "title": "Artisan Roasted Almonds 200g — Missing Net Quantity Standard Symbol",
        "product_name": "Artisan Roasted Almonds",
        "brand": "NutriCraft Snacks",
        "filed_on": "2026-11-04",
        "category": "Non-compliant Packaging / Rule 13 LMPC",
        "issue": "Declared as 'Net Wt. 200 Gms' using non-statutory symbol 'Gms' instead of mandatory standard 'g'.",
        "evidence_text": "Packaging back photo showing '200 Gms'.",
        "status": "Settled & Redressed",
        "authority": "Standards Officer",
        "case_stage": "Corrective Packaging Undertaking Filed",
        "claimant": "Vikram S.",
        "responses_count": 1
    }
]

DAILY_CONSUMPTION_LOG: List[Dict[str, Any]] = [
    {
        "id": "LOG-1",
        "date": dt.date.today().isoformat(),
        "product_name": "Organic Almond Milk (500ml)",
        "brand": "Silk & Pure",
        "meal": "Breakfast",
        "serving_g": 200,
        "energy_kcal": 78,
        "sugars_g": 3.2,
        "sat_fat_g": 0.4,
        "sodium_mg": 92,
        "nova_group": 1,
        "truth_score": 88
    },
    {
        "id": "LOG-2",
        "date": dt.date.today().isoformat(),
        "product_name": "Harvest Crunch Granola",
        "brand": "Harvest Foods",
        "meal": "Breakfast",
        "serving_g": 45,
        "energy_kcal": 195,
        "sugars_g": 14.5,
        "sat_fat_g": 3.8,
        "sodium_mg": 140,
        "nova_group": 4,
        "truth_score": 42
    },
    {
        "id": "LOG-3",
        "date": dt.date.today().isoformat(),
        "product_name": "Quinoa Veggie Bowl (250g)",
        "brand": "The Good Bowl",
        "meal": "Lunch",
        "serving_g": 250,
        "energy_kcal": 310,
        "sugars_g": 4.1,
        "sat_fat_g": 1.9,
        "sodium_mg": 380,
        "nova_group": 3,
        "truth_score": 79
    }
]

GUT_BIOME_EVIDENCE: Dict[str, Any] = {
    "330": {
        "ins": "330",
        "name": "Citric Acid",
        "common_source": "Submerged fermentation of molasses / corn steep liquor using Aspergillus niger mould.",
        "natural_vs_synthetic": {
            "synthetic_share": "99% of global food-grade citric acid is industrially produced via Aspergillus niger fungal fermentation.",
            "natural_source": "Naturally occurring in lemons, limes, and oranges."
        },
        "gut_biome_findings": [
            {
                "claim": "Mild acidification of gastric environment",
                "evidence_strength": "Established (Peer-Reviewed)",
                "detail": "Standard dietary intakes (up to 50mg/kg bw) pose negligible disruption to healthy colonic microbiota.",
                "status": "safe"
            },
            {
                "claim": "Fungal allergen residue in highly sensitive individuals",
                "evidence_strength": "Emerging Clinical Hypothesis",
                "detail": "Rare case reports suggest trace mycotoxin or fungal protein remnants from A. niger fermentation may trigger mild inflammatory responses in genetically predisposed individuals.",
                "status": "caution"
            }
        ],
        "international_status": {
            "fssai": "Permitted as Acid Regulator (GMP)",
            "eu_efsa": "Approved (E330) with no ADI limit",
            "us_fda": "GRAS (21 CFR 184.1033)"
        }
    },
    "407": {
        "ins": "407",
        "name": "Carrageenan",
        "common_source": "Red seaweed (Rhodophyceae) extraction with alkaline treatment.",
        "natural_vs_synthetic": {
            "synthetic_share": "Chemically isolated sulphated galactans from seaweed.",
            "natural_source": "Extracted from edible red seaweeds."
        },
        "gut_biome_findings": [
            {
                "claim": "Epithelial barrier disruption & low-grade inflammation",
                "evidence_strength": "Established in animal models & clinical cohorts",
                "detail": "Carrageenan induces degradation of the colonic epithelial mucus layer and activates the NF-kB inflammatory cascade.",
                "status": "warning"
            },
            {
                "claim": "IBS & IBD symptom flare-ups",
                "evidence_strength": "Moderate Clinical Evidence",
                "detail": "Dietary exclusion of carrageenan is clinically associated with prolonged remission in patients with Ulcerative Colitis.",
                "status": "warning"
            }
        ],
        "international_status": {
            "fssai": "Permitted in dairy, confectionery and desserts",
            "eu_efsa": "Permitted (E407), but strictly banned in infant formulas",
            "us_fda": "Permitted food additive"
        }
    },
    "466": {
        "ins": "466",
        "name": "Carboxymethylcellulose (CMC / Sodium CMC)",
        "common_source": "Synthetic chemical etherification of alkali cellulose with sodium monochloroacetate.",
        "natural_vs_synthetic": {
            "synthetic_share": "100% synthetic industrial chemical synthesis.",
            "natural_source": "None."
        },
        "gut_biome_findings": [
            {
                "claim": "Direct encroachment of gut bacteria onto epithelial surface",
                "evidence_strength": "High (Cell & Human Microbiome Clinical Studies)",
                "detail": "CMC alters gut microbiota composition, reducing short-chain fatty acid (SCFA) producers and thinning the colonic mucus wall.",
                "status": "warning"
            }
        ],
        "international_status": {
            "fssai": "Permitted emulsifier and stabilizer",
            "eu_efsa": "Permitted (E466); currently under re-evaluation for chronic inflammatory effects",
            "us_fda": "GRAS affirmed"
        }
    }
}


# ------------------------------------------------------------------ Service Functions

def audit_letter_height(
    panel_area_cm2: float,
    actual_height_mm: float,
    is_blown_or_moulded: bool = False
) -> Dict[str, Any]:
    """Calculates Rule 7(2) Table-I statutory numeral height compliance in millimeters."""
    statutory_min = min_numeral_height_mm(panel_area_cm2, is_blown_or_moulded)
    diff = round(actual_height_mm - statutory_min, 2)
    is_compliant = actual_height_mm >= statutory_min

    # Determine recommended action
    if is_compliant:
        verdict = "PASS"
        action = "Package satisfies statutory font height under Legal Metrology Rule 7(2)."
        penalty = 0
    else:
        verdict = "NON-COMPLIANT"
        action = f"Deficiency of {abs(diff)} mm detected. Requires notice under Rule 7(2) read with Section 36 of Legal Metrology Act, 2009."
        penalty = 25000  # First offence compounding fee

    return {
        "panel_area_cm2": panel_area_cm2,
        "actual_height_mm": actual_height_mm,
        "is_blown_or_moulded": is_blown_or_moulded,
        "statutory_min_height_mm": statutory_min,
        "difference_mm": diff,
        "verdict": verdict,
        "action_required": action,
        "statutory_penalty_inr": penalty,
        "governing_rule": "Rule 7(2) Table-I, Legal Metrology (Packaged Commodities) Rules, 2011"
    }


def get_inspection_dossiers(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves field inspection dossiers, optionally filtered by status."""
    if not status_filter or status_filter == "all":
        return list(INSPECTION_DOSSIERS)
    return [d for d in INSPECTION_DOSSIERS if d.get("status") == status_filter]


def get_dossier_by_id(dossier_id: str) -> Optional[Dict[str, Any]]:
    """Finds inspection dossier by ID."""
    for d in INSPECTION_DOSSIERS:
        if d["id"] == dossier_id or d.get("dossier_no") == dossier_id:
            return d
    return None


def create_field_inspection(data: Dict[str, Any]) -> Dict[str, Any]:
    """Creates a new field inspection record."""
    new_id = f"DOS-2026-{uuid.uuid4().hex[:4].upper()}"
    dossier_no = f"LMD-2026-REG-{uuid.uuid4().hex[:4].upper()}"
    panel_area = float(data.get("panel_area_cm2", 100.0))
    detected_height = float(data.get("detected_numeral_height_mm", 2.0))
    is_blown = bool(data.get("is_blown_or_moulded", False))

    audit = audit_letter_height(panel_area, detected_height, is_blown)
    violations = []
    if audit["verdict"] == "NON-COMPLIANT":
        violations.append({
            "rule": "Rule 7(2) Table-I",
            "title": "Sub-standard Numeral Height",
            "finding": f"Detected height {detected_height}mm is below statutory minimum of {audit['statutory_min_height_mm']}mm.",
            "severity": "major",
            "section": "Sec 36(1) Legal Metrology Act, 2009"
        })

    record = {
        "id": new_id,
        "dossier_no": dossier_no,
        "created_at": dt.datetime.utcnow().isoformat() + "Z",
        "product_name": data.get("product_name", "Unlabeled Packaged Commodity"),
        "brand": data.get("brand", "Unknown Brand"),
        "category": data.get("category", "Packaged Commodity"),
        "batch_no": data.get("batch_no", "BATCH-NOT-SPECIFIED"),
        "retailer": data.get("retailer", "Retail Inspection Location"),
        "district": data.get("district", "Field Inspection Division"),
        "inspector_id": data.get("inspector_id", "INS-OFFICER-ON-DUTY"),
        "status": "under_review" if violations else "submitted",
        "priority": "high" if violations else "low",
        "panel_area_cm2": panel_area,
        "declared_net_quantity": data.get("declared_net_quantity", ""),
        "detected_numeral_height_mm": detected_height,
        "statutory_min_height_mm": audit["statutory_min_height_mm"],
        "violations": violations,
        "evidence_photos": data.get("evidence_photos", []),
        "inspector_notes": data.get("inspector_notes", "Automated field inspection submission."),
        "compounding_fee_proposed": 25000 if violations else 0,
        "review_comments": "",
        "determination": None
    }
    INSPECTION_DOSSIERS.insert(0, record)
    return record


def apply_supervisor_determination(
    dossier_id: str,
    action: str,  # "approve_notice", "dismiss", "compound"
    comments: str = "",
    compounding_fee: Optional[int] = None
) -> Dict[str, Any]:
    """Applies supervisory determination (approves formal notice or dismisses infraction)."""
    dossier = get_dossier_by_id(dossier_id)
    if not dossier:
        raise ValueError(f"Dossier '{dossier_id}' not found.")

    if action == "approve_notice":
        dossier["status"] = "notice_approved"
        dossier["determination"] = "Notice Approved under Sec 36 LMA 2009"
    elif action == "compound":
        dossier["status"] = "compounded"
        dossier["determination"] = "Compounding Approved"
    elif action == "dismiss":
        dossier["status"] = "dismissed"
        dossier["determination"] = "Dismissed by Enforcement Supervisor"
    else:
        raise ValueError(f"Invalid determination action '{action}'.")

    dossier["review_comments"] = comments
    if compounding_fee is not None:
        dossier["compounding_fee_proposed"] = compounding_fee
    return dossier


def get_supervisor_metrics() -> Dict[str, Any]:
    """Computes operational metrics for supervisory enforcement dashboard."""
    total = len(INSPECTION_DOSSIERS)
    under_review = sum(1 for d in INSPECTION_DOSSIERS if d["status"] == "under_review")
    notices_approved = sum(1 for d in INSPECTION_DOSSIERS if d["status"] == "notice_approved")
    compounded = sum(1 for d in INSPECTION_DOSSIERS if d["status"] == "compounded")
    dismissed = sum(1 for d in INSPECTION_DOSSIERS if d["status"] == "dismissed")

    total_fees = sum(d.get("compounding_fee_proposed", 0) for d in INSPECTION_DOSSIERS if d["status"] in ("compounded", "notice_approved"))

    return {
        "total_dossiers": total,
        "under_review_count": under_review,
        "notices_approved_count": notices_approved,
        "compounded_count": compounded,
        "dismissed_count": dismissed,
        "clearance_velocity_percent": round(((notices_approved + compounded + dismissed) / max(1, total)) * 100, 1),
        "total_compounding_fines_inr": total_fees,
        "active_field_squads": 4,
        "seizures_this_month": 18
    }


def get_consumer_petitions() -> List[Dict[str, Any]]:
    """Retrieves consumer complaint petitions."""
    return list(CONSUMER_PETITIONS)


def create_consumer_petition(data: Dict[str, Any]) -> Dict[str, Any]:
    """Files a new consumer infraction petition."""
    new_id = f"PET-2026-{len(CONSUMER_PETITIONS) + 1:03d}"
    petition = {
        "id": new_id,
        "title": data.get("title", f"{data.get('product_name', 'Packaged Commodity')} — Infraction Petition"),
        "product_name": data.get("product_name", "Unknown Commodity"),
        "brand": data.get("brand", "Unknown Brand"),
        "filed_on": dt.date.today().isoformat(),
        "category": data.get("category", "Misleading Declaration"),
        "issue": data.get("issue", "Reported statutory or food label non-compliance."),
        "evidence_text": data.get("evidence_text", ""),
        "status": "Active Petition",
        "authority": "District Legal Metrology & FSSAI Cell",
        "case_stage": "Petition Logged & Assigned to Field Officer",
        "claimant": data.get("claimant", "Consumer"),
        "responses_count": 0
    }
    CONSUMER_PETITIONS.insert(0, petition)
    return petition


def get_daily_consumption(date_str: Optional[str] = None) -> Dict[str, Any]:
    """Calculates daily consumption totals and WHO/ICMR guideline comparisons."""
    target_date = date_str or dt.date.today().isoformat()
    items = [it for it in DAILY_CONSUMPTION_LOG if it.get("date") == target_date]

    tot_cal = sum(it.get("energy_kcal", 0) for it in items)
    tot_sugar = round(sum(it.get("sugars_g", 0) for it in items), 1)
    tot_sat_fat = round(sum(it.get("sat_fat_g", 0) for it in items), 1)
    tot_sodium = sum(it.get("sodium_mg", 0) for it in items)
    upf_count = sum(1 for it in items if it.get("nova_group") == 4)

    # WHO / ICMR reference upper limits
    SUGAR_LIMIT_G = 25.0
    SODIUM_LIMIT_MG = 2000.0
    SAT_FAT_LIMIT_G = 20.0

    return {
        "date": target_date,
        "items_count": len(items),
        "items": items,
        "totals": {
            "energy_kcal": tot_cal,
            "sugars_g": tot_sugar,
            "sat_fat_g": tot_sat_fat,
            "sodium_mg": tot_sodium,
            "upf_count": upf_count
        },
        "limits": {
            "sugar_limit_g": SUGAR_LIMIT_G,
            "sugar_percent_used": round((tot_sugar / SUGAR_LIMIT_G) * 100, 1),
            "sodium_limit_mg": SODIUM_LIMIT_MG,
            "sodium_percent_used": round((tot_sodium / SODIUM_LIMIT_MG) * 100, 1),
            "sat_fat_limit_g": SAT_FAT_LIMIT_G,
            "sat_fat_percent_used": round((tot_sat_fat / SAT_FAT_LIMIT_G) * 100, 1)
        }
    }


def add_daily_consumption_item(data: Dict[str, Any]) -> Dict[str, Any]:
    """Adds a food item to today's consumer daily log."""
    new_id = f"LOG-{len(DAILY_CONSUMPTION_LOG) + 1}"
    item = {
        "id": new_id,
        "date": data.get("date", dt.date.today().isoformat()),
        "product_name": data.get("product_name", "Logged Food"),
        "brand": data.get("brand", ""),
        "meal": data.get("meal", "Snack"),
        "serving_g": float(data.get("serving_g", 100)),
        "energy_kcal": float(data.get("energy_kcal", 0)),
        "sugars_g": float(data.get("sugars_g", 0)),
        "sat_fat_g": float(data.get("sat_fat_g", 0)),
        "sodium_mg": float(data.get("sodium_mg", 0)),
        "nova_group": int(data.get("nova_group", 4)),
        "truth_score": int(data.get("truth_score", 50))
    }
    DAILY_CONSUMPTION_LOG.insert(0, item)
    return item


def get_gut_biome_info(ins_code: str) -> Optional[Dict[str, Any]]:
    """Retrieves evidence-based gut biome details for an additive."""
    clean_code = ins_code.strip().lower().replace("ins", "").replace("e", "").strip()
    return GUT_BIOME_EVIDENCE.get(clean_code)
