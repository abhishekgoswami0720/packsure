"""Core TruthLens service coordinating OCR, Open Food Facts, knowledge databases, scoring, and analysis."""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

from .claim_buster import verify_claims
from .compliance.legal_metrology import check_legal_metrology
from .health_profiles import evaluate_health_profiles
from .nutrition_engine import calculate_truth_score, classify_nova, evaluate_traffic_lights, normalize_nutrition

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"

INS_DB = json.loads((KNOWLEDGE_DIR / "ins_database.json").read_text())["additives"]
SUGARS_DB = json.loads((KNOWLEDGE_DIR / "hidden_sugars.json").read_text())["hidden_sugars"]
FATS_DB = json.loads((KNOWLEDGE_DIR / "industrial_fats.json").read_text())["industrial_fats"]
LOCAL_PRODUCTS = json.loads((KNOWLEDGE_DIR / "popular_indian_products.json").read_text())["products"]
ALTERNATIVES_DB = json.loads((KNOWLEDGE_DIR / "clean_alternatives.json").read_text())["alternatives"]


def match_additives(ingredients_text: str) -> list[dict]:
    """Matches INS numbers, E-numbers, and additive aliases in the ingredient statement."""
    matched = []
    text = (ingredients_text or "").lower()

    for item in INS_DB:
        found = False
        ins_code = item["ins"]
        # Check code pattern like "INS 211", "INS-211", "E211", "211(i)"
        code_pat = r"\b(ins|e)?\s*-?\s*" + re.escape(ins_code) + r"(\([a-z0-9]+\))?\b"
        if re.search(code_pat, text, re.I):
            found = True
        else:
            # Check name or aliases
            for al in [item["name"].lower()] + [a.lower() for a in item.get("aliases", [])]:
                if re.search(r"\b" + re.escape(al) + r"\b", text):
                    found = True
                    break

        if found:
            matched.append(item)

    return matched


def match_hidden_sugars(ingredients_text: str) -> list[dict]:
    """Identifies disguised added sugars and syrups in the ingredient statement."""
    matched = []
    text = (ingredients_text or "").lower()

    for item in SUGARS_DB:
        name = item["name"].lower()
        if re.search(r"\b" + re.escape(name) + r"\b", text):
            matched.append(item)

    return matched


def match_industrial_fats(ingredients_text: str) -> list[dict]:
    """Identifies palm oil, palmolein, and hydrogenated fats in the ingredient statement."""
    matched = []
    text = (ingredients_text or "").lower()

    for item in FATS_DB:
        found = False
        for al in [item["name"].lower()] + [a.lower() for a in item.get("aliases", [])]:
            if re.search(r"\b" + re.escape(al) + r"\b", text):
                found = True
                break
        if found:
            matched.append(item)

    return matched


def get_clean_alternatives(product_id: str, category: str) -> list[dict]:
    """Finds recommended clean alternatives in the same category."""
    recs = []
    for item in ALTERNATIVES_DB:
        if (product_id and product_id in item.get("target_ids", [])) or (category and item.get("category", "").lower() == category.lower()):
            recs.append(item["recommended"])
    return recs


def analyze_product_data(name: str, brand: str = "", category: str = "",
                         ingredients_text: str = "", nutrition: dict | None = None,
                         claims: list[str] | None = None, raw_label_text: str = "",
                         serving_size_g: float | None = None, product_id: str = "",
                         image_url: str = "") -> dict:
    """Full-spectrum food intelligence analysis for any product."""
    nutrition = nutrition or {}
    claims = claims or []

    # 1. Match against knowledge bases
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
    truth_score = calculate_truth_score(
        norm_nutr,
        nova["group"],
        additives,
        has_industrial_fats=bool(industrial_fats),
        has_hidden_sugars=bool(hidden_sugars),
        inconsistencies_count=len(inconsistencies)
    )

    # 7. Legal Metrology Compliance Check
    compliance = check_legal_metrology(raw_label_text or ingredients_text)

    # 8. Clean Alternatives
    alternatives = get_clean_alternatives(product_id, category)

    return {
        "id": product_id or re.sub(r"\W+", "_", name.lower()).strip("_"),
        "name": name,
        "brand": brand,
        "category": category,
        "image_url": image_url,
        "ingredients_text": ingredients_text,
        "nutrition_per_100g": norm_nutr,
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
        "source": "verified_local" if product_id else "live_analysis"
    }


def lookup_barcode(code: str) -> dict | None:
    """Finds product by barcode: checks local database first, then queries Open Food Facts API."""
    clean_code = code.strip()

    # 1. Local Database
    for p in LOCAL_PRODUCTS:
        if p.get("barcode") == clean_code:
            return analyze_product_data(
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

    # 2. Open Food Facts
    try:
        url = f"https://world.openfoodfacts.org/api/v2/product/{clean_code}.json"
        req = urllib.request.Request(url, headers={"User-Agent": "TruthLens/1.0 (truthlens@packsure.in)"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            if data.get("status") == 1 and "product" in data:
                p = data["product"]
                nutr_raw = p.get("nutriments", {})
                nutrition = {
                    "energy_kcal": nutr_raw.get("energy-kcal_100g", nutr_raw.get("energy-kcal")),
                    "protein_g": nutr_raw.get("proteins_100g", nutr_raw.get("proteins")),
                    "carbohydrates_g": nutr_raw.get("carbohydrates_100g", nutr_raw.get("carbohydrates")),
                    "total_sugars_g": nutr_raw.get("sugars_100g", nutr_raw.get("sugars")),
                    "fat_g": nutr_raw.get("fat_100g", nutr_raw.get("fat")),
                    "saturated_fat_g": nutr_raw.get("saturated-fat_100g", nutr_raw.get("saturated-fat")),
                    "sodium_mg": round(nutr_raw.get("sodium_100g", 0) * 1000.0, 1) if nutr_raw.get("sodium_100g") else None,
                    "fiber_g": nutr_raw.get("fiber_100g", nutr_raw.get("fiber")),
                }
                # Clean empty None values
                nutrition = {k: v for k, v in nutrition.items() if v is not None}
                return analyze_product_data(
                    name=p.get("product_name", f"Product #{clean_code}"),
                    brand=p.get("brands", ""),
                    category=p.get("categories", ""),
                    ingredients_text=p.get("ingredients_text", ""),
                    nutrition=nutrition,
                    claims=[],
                    product_id=clean_code,
                    image_url=p.get("image_front_url", ""),
                )
    except Exception:
        pass

    return None


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
