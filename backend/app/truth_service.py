"""Core TruthLens service coordinating OCR, Open Food Facts, knowledge databases, scoring, and analysis."""
from __future__ import annotations

import json
import re
import urllib.request
import datetime as dt
from pathlib import Path

from .claim_buster import verify_claims
from .compliance.legal_metrology import check_legal_metrology
from .compliance.regulatory_rules import evaluate_versioned_legal_compliance
from .health_profiles import evaluate_health_profiles
from .nutrition_engine import calculate_truth_score, classify_nova, evaluate_traffic_lights, normalize_nutrition
from .schema import DataSource, FieldProvenance, StandardNutrition100g, TruthLensProductRecord
from .product_cache import (
    get_cached_product,
    save_product_to_cache,
    apply_user_correction_to_cache,
    get_cache_coverage_report,
)
from .off_client import fetch_open_food_facts_v3
from .knowledge.additive_standards import get_additive_standard

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"

INS_DB = json.loads((KNOWLEDGE_DIR / "ins_database.json").read_text(encoding="utf-8"))["additives"]
SUGARS_DB = json.loads((KNOWLEDGE_DIR / "hidden_sugars.json").read_text(encoding="utf-8"))["hidden_sugars"]
FATS_DB = json.loads((KNOWLEDGE_DIR / "industrial_fats.json").read_text(encoding="utf-8"))["industrial_fats"]
LOCAL_PRODUCTS = json.loads((KNOWLEDGE_DIR / "popular_indian_products.json").read_text(encoding="utf-8"))["products"]
ALTERNATIVES_DB = json.loads((KNOWLEDGE_DIR / "clean_alternatives.json").read_text(encoding="utf-8"))["alternatives"]


def match_additives(ingredients_text: str) -> list[dict]:
    """Matches INS numbers, E-numbers, and additive aliases in the ingredient statement with official citations."""
    matched = []
    text = (ingredients_text or "").lower()

    for item in INS_DB:
        found = False
        ins_code = item["ins"]
        code_pat = r"\b(ins|e)?\s*-?\s*" + re.escape(ins_code) + r"(\([a-z0-9]+\)|[a-z]{1,4})?\b"
        if re.search(code_pat, text, re.I):
            found = True
        else:
            for al in [item["name"].lower()] + [a.lower() for a in item.get("aliases", [])]:
                if re.search(r"\b" + re.escape(al) + r"\b", text):
                    found = True
                    break

        if found:
            # Enrich with Codex GSFA and JECFA ADI standards
            std = get_additive_standard(ins_code)
            enriched = std.to_citation_dict() if std else dict(item)
            matched.append(enriched)

    return matched


def match_hidden_sugars(ingredients_text: str) -> list[dict]:
    """Identifies disguised added sugars and syrups with glycemic index and scientific citations."""
    matched = []
    text = (ingredients_text or "").lower()

    for item in SUGARS_DB:
        name = item["name"].lower()
        if re.search(r"\b" + re.escape(name) + r"\b", text):
            entry = dict(item)
            entry["citation"] = "Source: Harvard Health GI Registry & FSSAI Labelling Regulations 2020"
            matched.append(entry)

    return matched


def match_industrial_fats(ingredients_text: str) -> list[dict]:
    """Identifies palm oil, palmolein, and hydrogenated fats with cardiovascular risk citations."""
    matched = []
    text = (ingredients_text or "").lower()

    for item in FATS_DB:
        found = False
        for al in [item["name"].lower()] + [a.lower() for a in item.get("aliases", [])]:
            if re.search(r"\b" + re.escape(al) + r"\b", text):
                found = True
                break
        if found:
            entry = dict(item)
            entry["citation"] = "Source: FSSAI Gazette Order F.No.1-116/FSSAI/T(TransFat-Order)/2019 & WHO REPLACE Initiative"
            matched.append(entry)

    return matched


def get_clean_alternatives(product_id: str, category: str) -> list[dict]:
    """Finds recommended clean alternatives in the same category."""
    recs = []
    # 1. Look in curated clean alternatives database
    for item in ALTERNATIVES_DB:
        if (product_id and product_id in item.get("target_ids", [])) or (category and item.get("category", "").lower() == category.lower()):
            recs.append(item["recommended"])

    # 2. If no direct alternatives, find cleaner items in local verified products
    if not recs and category:
        cat_lower = category.lower()
        for p in LOCAL_PRODUCTS:
            if p.get("id") != product_id and (p.get("category", "").lower() == cat_lower or any(w in p.get("category", "").lower() for w in cat_lower.split())):
                recs.append({
                    "name": p["name"],
                    "brand": p.get("brand", ""),
                    "image_url": p.get("image_url", ""),
                    "why_clean": f"Curated clean option in {p.get('category')}",
                    "id": p.get("id", p.get("barcode", ""))
                })
                if len(recs) >= 3:
                    break
    return recs


def get_source_label(source_str: str) -> str:
    labels = {
        "verified_local": "Verified Indian Catalogue (PackSure Audited)",
        "openfoodfacts_v3": "Open Food Facts API v3 (Third-Party Database)",
        "openfoodfacts_v2": "Open Food Facts API v2 (Third-Party Database)",
        "ocr_extracted": "Packaging Label OCR (Auto-Extracted)",
        "user_corrected": "Consumer / Inspector Verified & Corrected",
        "live_analysis": "Live Formulation Analysis",
    }
    return labels.get(source_str, source_str)


def analyze_product_data(name: str, brand: str = "", category: str = "",
                         ingredients_text: str = "", nutrition: dict | None = None,
                         claims: list[str] | None = None, raw_label_text: str = "",
                         serving_size_g: float | None = None, product_id: str = "",
                         image_url: str = "", primary_source: str = "verified_local",
                         retrieved_at: str = "", provenance: dict | None = None,
                         conflicts: list | None = None, barcode: str = "") -> dict:
    """Full-spectrum food intelligence analysis for any product across three separated engines:
    1. Nutrition & Traffic Light Engine (FSSAI/ICMR-NIN)
    2. Ingredient & Toxicological Assessment Engine (Codex GSFA / JECFA)
    3. Statutory Legal Metrology & Labelling Compliance Engine (LMPC 2011 & FSSAI 2020)
    """
    nutrition = nutrition or {}
    claims = claims or []

    # 1. Match against knowledge bases with official citations
    additives = match_additives(ingredients_text)
    hidden_sugars = match_hidden_sugars(ingredients_text)
    industrial_fats = match_industrial_fats(ingredients_text)

    # 2. Nutrition Normalization & Traffic Lights
    norm_nutr = normalize_nutrition(nutrition, serving_size_g)
    traffic_lights = evaluate_traffic_lights(norm_nutr)

    # 3. NOVA UPF Classification
    nova = classify_nova(
        ingredients_text,
        additives,
        has_industrial_fats=bool(industrial_fats),
        has_hidden_sugars=bool(hidden_sugars)
    )

    # 4. Deceptive Claim Buster
    claim_verdicts = verify_claims(claims, ingredients_text, norm_nutr)
    inconsistencies = [c for c in claim_verdicts if c["status"] in ("verified_inconsistency", "potential_inconsistency")]

    # 5. Personalized Health Profiles
    health_profiles = evaluate_health_profiles(ingredients_text, norm_nutr, additives)

    # 6. TruthScore Calculation
    is_liquid = any(term in category.lower() for term in ("drink", "beverage", "juice", "soda", "cola", "tea", "coffee")) or "ml" in (raw_label_text or "").lower()
    truth_score = calculate_truth_score(
        norm_nutr,
        nova["group"],
        additives,
        has_industrial_fats=bool(industrial_fats),
        has_hidden_sugars=bool(hidden_sugars),
        inconsistencies_count=len(inconsistencies),
        is_liquid=is_liquid,
        ingredients_text=ingredients_text
    )

    # 7. Versioned Legal Metrology & FSSAI Compliance Check
    compliance = evaluate_versioned_legal_compliance(
        raw_label_text or ingredients_text,
        is_food=category != "Personal Care"
    )

    # 8. Clean Alternatives
    alternatives = get_clean_alternatives(product_id, category)

    # 9. Provenance and Timestamp
    timestamp = retrieved_at or dt.datetime.now(dt.timezone.utc).isoformat()
    if not provenance:
        provenance = {
            "name": {"source": primary_source, "retrieved_at": timestamp},
            "ingredients_text": {"source": primary_source, "retrieved_at": timestamp},
            "nutrition_per_100g": {"source": primary_source, "retrieved_at": timestamp},
        }

    return {
        "id": product_id or re.sub(r"\W+", "_", name.lower()).strip("_"),
        "barcode": barcode or product_id,
        "name": name,
        "brand": brand,
        "category": category,
        "image_url": image_url,
        "ingredients_text": ingredients_text,
        "nutrition_per_100g": norm_nutr,
        "serving_size_g": serving_size_g,
        "traffic_lights": traffic_lights,
        "nova": nova,
        "truth_score": truth_score,
        "claim_verdicts": claim_verdicts,
        "additives": additives,
        "hidden_sugars": hidden_sugars,
        "industrial_fats": industrial_fats,
        "health_profiles": health_profiles,
        "compliance": compliance,
        "alternatives": alternatives,
        "primary_source": primary_source,
        "source": primary_source,
        "source_label": get_source_label(primary_source),
        "retrieved_at": timestamp,
        "provenance": provenance,
        "conflicts": conflicts or [],
        "citation_authorities": [
            "Food Safety and Standards Authority of India (FSSAI)",
            "Codex Alimentarius GSFA (CODEX STAN 192-1995)",
            "FAO/WHO JECFA Evaluation Monographs",
            "Legal Metrology (Packaged Commodities) Rules, 2011",
            "Open Food Facts API v3"
        ]
    }


def lookup_barcode(code: str) -> dict | None:
    """Finds product by barcode across multi-source architecture:
    1. Local SQLite Product Cache (contains verified Indian products & user corrections)
    2. Local Verified Catalogue (static fallback)
    3. Open Food Facts API v3 (normalizes, caches, and returns)
    4. None (triggers OCR fallback)
    """
    clean_code = code.strip()
    if not clean_code:
        return None

    # 1. Local SQLite Cache (contains audited records & human corrections)
    cached = get_cached_product(clean_code)
    if cached:
        nutr_dict = {k: v for k, v in cached.nutrition_per_100g.model_dump().items() if v is not None}
        return analyze_product_data(
            name=cached.name,
            brand=cached.brand,
            category=cached.category,
            ingredients_text=cached.ingredients_text,
            nutrition=nutr_dict,
            claims=cached.claims,
            serving_size_g=cached.serving_size_g,
            product_id=cached.id or clean_code,
            barcode=cached.barcode or clean_code,
            image_url=cached.image_url,
            primary_source=cached.primary_source.value,
            retrieved_at=cached.retrieved_at,
            provenance={k: v.model_dump() for k, v in cached.provenance.items()},
            conflicts=[c.model_dump() for c in cached.conflicts]
        )

    # 2. Local Verified Database (fallback if cache miss)
    for p in LOCAL_PRODUCTS:
        if p.get("barcode") == clean_code or p.get("id") == clean_code:
            return analyze_product_data(
                name=p["name"],
                brand=p.get("brand", ""),
                category=p.get("category", ""),
                ingredients_text=p.get("ingredients_text", ""),
                nutrition=p.get("nutrition_per_100g", {}),
                claims=p.get("claims", []),
                serving_size_g=p.get("serving_size_g"),
                product_id=p.get("id", clean_code),
                barcode=p.get("barcode", clean_code),
                image_url=p.get("image_url", ""),
                primary_source="verified_local"
            )

    # 3. Open Food Facts API v3
    try:
        off_record = fetch_open_food_facts_v3(clean_code)
        if off_record:
            save_product_to_cache(off_record)
            nutr_dict = {k: v for k, v in off_record.nutrition_per_100g.model_dump().items() if v is not None}
            return analyze_product_data(
                name=off_record.name,
                brand=off_record.brand,
                category=off_record.category,
                ingredients_text=off_record.ingredients_text,
                nutrition=nutr_dict,
                claims=off_record.claims,
                serving_size_g=off_record.serving_size_g,
                product_id=off_record.id or clean_code,
                barcode=off_record.barcode or clean_code,
                image_url=off_record.image_url,
                primary_source=off_record.primary_source.value,
                retrieved_at=off_record.retrieved_at,
                provenance={k: v.model_dump() for k, v in off_record.provenance.items()},
                conflicts=[c.model_dump() for c in off_record.conflicts]
            )
    except Exception:
        pass

    return None


def correct_product_data(barcode: str, corrections: dict, actor: str = "consumer") -> dict:
    """Applies human review and correction, preserving conflicts and updating provenance."""
    clean_barcode = barcode.strip()
    record = apply_user_correction_to_cache(clean_barcode, corrections, actor=actor)
    nutr_dict = {k: v for k, v in record.nutrition_per_100g.model_dump().items() if v is not None}
    return analyze_product_data(
        name=record.name,
        brand=record.brand,
        category=record.category,
        ingredients_text=record.ingredients_text,
        nutrition=nutr_dict,
        claims=record.claims,
        serving_size_g=record.serving_size_g,
        product_id=record.id or clean_barcode,
        image_url=record.image_url,
        primary_source=record.primary_source.value,
        retrieved_at=record.retrieved_at,
        provenance={k: v.model_dump() for k, v in record.provenance.items()},
        conflicts=[c.model_dump() for c in record.conflicts]
    )


def seed_local_products_to_cache() -> int:
    """Seeds verified Indian products into local SQLite cache with verified_local provenance."""
    count = 0
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
    for p in LOCAL_PRODUCTS:
        barcode = p.get("barcode")
        if barcode:
            nutr = p.get("nutrition_per_100g", {})
            record = TruthLensProductRecord(
                barcode=barcode,
                id=p.get("id", barcode),
                name=p["name"],
                brand=p.get("brand", ""),
                category=p.get("category", "Packaged Commodity"),
                ingredients_text=p.get("ingredients_text", ""),
                nutrition_per_100g=StandardNutrition100g(**nutr),
                serving_size_g=p.get("serving_size_g"),
                net_quantity=p.get("net_quantity", ""),
                mrp_inr=p.get("mrp_inr"),
                image_url=p.get("image_url", ""),
                claims=p.get("claims", []),
                primary_source=DataSource.VERIFIED_LOCAL,
                retrieved_at=now_iso,
                provenance={
                    "name": FieldProvenance(source=DataSource.VERIFIED_LOCAL, retrieved_at=now_iso, confidence=1.0, notes="Audited pack label"),
                    "ingredients_text": FieldProvenance(source=DataSource.VERIFIED_LOCAL, retrieved_at=now_iso, confidence=1.0, notes="Audited pack label"),
                    "nutrition_per_100g": FieldProvenance(source=DataSource.VERIFIED_LOCAL, retrieved_at=now_iso, confidence=1.0, notes="Audited pack label"),
                }
            )
            save_product_to_cache(record)
            count += 1
    return count


# Seed cache on module load
seed_local_products_to_cache()


def search_catalogue(query: str, category: str = "") -> list[dict]:
    """Searches local verified catalogue and cached products."""
    results = []
    q = query.strip().lower()

    for p in LOCAL_PRODUCTS:
        name_match = q in p.get("name", "").lower() or q in p.get("brand", "").lower() or q in p.get("barcode", "")
        cat_match = not category or (category.lower() in p.get("category", "").lower())
        if (not q or name_match) and cat_match:
            analyzed = analyze_product_data(
                name=p["name"],
                brand=p.get("brand", ""),
                category=p.get("category", ""),
                ingredients_text=p.get("ingredients_text", ""),
                nutrition=p.get("nutrition_per_100g", {}),
                claims=p.get("claims", []),
                serving_size_g=p.get("serving_size_g"),
                product_id=p.get("id", ""),
                image_url=p.get("image_url", ""),
            )
            results.append(analyzed)

    return results


def compare_products_data(prod1: dict, prod2: dict) -> dict:
    """Produces side-by-side comparative analysis with goal-based advice."""
    n1 = prod1.get("nutrition_per_100g", {})
    n2 = prod2.get("nutrition_per_100g", {})

    sugar1 = n1.get("total_sugars_g", 0) or 0
    sugar2 = n2.get("total_sugars_g", 0) or 0

    score1 = prod1.get("truth_score", {}).get("score", 50)
    score2 = prod2.get("truth_score", {}).get("score", 50)

    # Goal-based verdict
    advice = []
    if sugar1 < sugar2:
        advice.append(f"• For Sugar Reduction / Diabetes: '{prod1['name']}' has {sugar2 - sugar1:.1f}g less sugar per 100g.")
    elif sugar2 < sugar1:
        advice.append(f"• For Sugar Reduction / Diabetes: '{prod2['name']}' has {sugar1 - sugar2:.1f}g less sugar per 100g.")

    if score1 > score2:
        overall_winner = prod1["name"]
        reason = f"Higher clean food score ({score1} vs {score2}), lower industrial processing and fewer chemical additives."
    elif score2 > score1:
        overall_winner = prod2["name"]
        reason = f"Higher clean food score ({score2} vs {score1}), lower industrial processing and fewer chemical additives."
    else:
        overall_winner = "Tied"
        reason = "Both products share similar nutritional profiles and processing levels."

    return {
        "product_1": prod1,
        "product_2": prod2,
        "overall_winner": overall_winner,
        "reason": reason,
        "goal_advice": advice,
    }
