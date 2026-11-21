"""Nutrition analysis engine, traffic light scoring, NOVA UPF classification, and TruthScore."""
from __future__ import annotations

import re


def normalize_nutrition(raw: dict, serving_size_g: float | None = None, is_liquid: bool = False) -> dict:
    """Normalizes nutritional values to 100g / 100ml while keeping per-serving context."""
    norm = {}
    multiplier = 1.0

    # If the user or OCR provided per-serving values instead of per 100g
    if serving_size_g and serving_size_g > 0 and raw.get("is_per_serving"):
        multiplier = 100.0 / serving_size_g

    for k, v in raw.items():
        if k in ("is_per_serving", "serving_size_g"):
            continue
        if isinstance(v, (int, float)):
            norm[k] = round(v * multiplier, 2)
        else:
            norm[k] = v

    # Derive sodium or salt if one is missing
    if "sodium_mg" not in norm and "salt_g" in norm:
        norm["sodium_mg"] = round(norm["salt_g"] * 400.0, 1)  # 1g salt ≈ 400mg sodium
    elif "salt_g" not in norm and "sodium_mg" in norm:
        norm["salt_g"] = round(norm["sodium_mg"] / 400.0, 2)

    return norm


def evaluate_traffic_lights(norm: dict, is_liquid: bool = False) -> dict:
    """Computes traffic lights (green, amber, red) for sugar, sat fat, and sodium.
    Thresholds reflect standardized Front-of-Pack nutrition benchmarks per 100g/ml:
    - Sugar: Green <= 5g (liq <= 2.5g), Amber <= 15g (liq <= 7.5g), Red > 15g
    - Saturated Fat: Green <= 1.5g (liq <= 0.75g), Amber <= 5g (liq <= 2.5g), Red > 5g
    - Sodium: Green <= 300mg (0.3g), Amber <= 1500mg (1.5g), Red > 1500mg
    """
    tl = {}

    # Sugar
    sugar = norm.get("total_sugars_g", norm.get("sugar_g"))
    if sugar is not None:
        g_lim = 2.5 if is_liquid else 5.0
        a_lim = 7.5 if is_liquid else 15.0
        if sugar <= g_lim:
            status = "green"
            desc = f"Low sugar ({sugar:g}g / 100{'ml' if is_liquid else 'g'})"
        elif sugar <= a_lim:
            status = "amber"
            desc = f"Moderate sugar ({sugar:g}g / 100{'ml' if is_liquid else 'g'})"
        else:
            status = "red"
            desc = f"High sugar ({sugar:g}g / 100{'ml' if is_liquid else 'g'})"
        tl["sugar"] = {"value": sugar, "unit": "g", "status": status, "label": desc}

    # Saturated Fat
    sat_fat = norm.get("saturated_fat_g")
    if sat_fat is not None:
        g_lim = 0.75 if is_liquid else 1.5
        a_lim = 2.5 if is_liquid else 5.0
        if sat_fat <= g_lim:
            status = "green"
            desc = f"Low saturated fat ({sat_fat:g}g / 100{'ml' if is_liquid else 'g'})"
        elif sat_fat <= a_lim:
            status = "amber"
            desc = f"Moderate saturated fat ({sat_fat:g}g / 100{'ml' if is_liquid else 'g'})"
        else:
            status = "red"
            desc = f"High saturated fat ({sat_fat:g}g / 100{'ml' if is_liquid else 'g'})"
        tl["saturated_fat"] = {"value": sat_fat, "unit": "g", "status": status, "label": desc}

    # Sodium
    sod_mg = norm.get("sodium_mg")
    if sod_mg is not None:
        if sod_mg <= 300:
            status = "green"
            desc = f"Low sodium ({sod_mg:g}mg / 100{'ml' if is_liquid else 'g'})"
        elif sod_mg <= 1500:
            status = "amber"
            desc = f"Moderate sodium ({sod_mg:g}mg / 100{'ml' if is_liquid else 'g'})"
        else:
            status = "red"
            desc = f"High sodium ({sod_mg:g}mg / 100{'ml' if is_liquid else 'g'})"
        tl["sodium"] = {"value": sod_mg, "unit": "mg", "status": status, "label": desc}

    # Protein / Fiber highlights
    prot = norm.get("protein_g")
    if prot is not None and prot >= 10.0:
        tl["protein"] = {"value": prot, "unit": "g", "status": "green", "label": f"High protein ({prot:g}g / 100g)"}

    fib = norm.get("fiber_g")
    if fib is not None and fib >= 6.0:
        tl["fiber"] = {"value": fib, "unit": "g", "status": "green", "label": f"High dietary fiber ({fib:g}g / 100g)"}

    return tl


def classify_nova(ingredients_text: str, matched_additives: list[dict],
                  has_industrial_fats: bool, has_hidden_sugars: bool) -> dict:
    """Assigns NOVA Food Classification (Group 1 to 4) based on ingredient characteristics.
    - Group 1: Unprocessed / minimally processed foods.
    - Group 2: Processed culinary ingredients (pure salt, oils, butter, sugar).
    - Group 3: Processed foods (canned vegetables in brine, simple cheeses, freshly baked breads).
    - Group 4: Ultra-processed food (UPF) containing cosmetic additives (colors, sweeteners,
               flavor enhancers, emulsifiers) or industrial fractionated/hydrogenated fats.
    """
    raw_lower = (ingredients_text or "").lower()

    # Cosmetic additive classes that systematically indicate NOVA Group 4
    cosmetic_classes = {
        "synthetic food colour", "food colour / opacifier", "food colour",
        "artificial non-nutritive sweetener", "artificial sweetener", "sugar alcohol / polyol",
        "flavour enhancer", "emulsifier", "emulsifier / thickener", "emulsifier / clouding agent"
    }

    cosmetic_hits = [
        a for a in matched_additives
        if a.get("class", "").lower() in cosmetic_classes
    ]

    # Industrial markers (maltodextrin, high fructose corn syrup, protein isolates)
    industrial_isolate_pattern = re.compile(
        r"\b(maltodextrin|high fructose corn syrup|hfcs|soy protein isolate|whey protein isolate|"
        r"hydrolysed vegetable protein|hvp|inulin extract|modified starch|dextrose monohydrate)\b",
        re.I
    )
    has_industrial_isolates = bool(industrial_isolate_pattern.search(raw_lower))

    reasons = []

    if cosmetic_hits or has_industrial_fats or has_industrial_isolates:
        group = 4
        title = "Ultra-Processed Food (UPF)"
        if cosmetic_hits:
            names = [a["name"] for a in cosmetic_hits[:3]]
            reasons.append(f"Contains industrial cosmetic additives: {', '.join(names)}")
        if has_industrial_fats:
            reasons.append("Contains refined industrial fats (palm oil, palmolein, or hydrogenated fat)")
        if has_industrial_isolates:
            reasons.append("Contains industrial food isolates or high-fructose/maltodextrin hydrolysates")
        confidence = "high"
    elif any(k in raw_lower for k in ("beans", "fish", "meat", "vegetables", "fruit", "cheese", "bread")) and any(k in raw_lower for k in ("salt", "brine", "syrup", "oil")):
        group = 3
        title = "Processed Food"
        reasons.append("Basic food preserved or seasoned with salt, oil, or sugar (NOVA Group 3)")
        confidence = "high"
    elif len(raw_lower.split(",")) <= 2 and any(k in raw_lower for k in ("butter", "oil", "sugar", "salt", "ghee")):
        # Single culinary ingredient
        group = 2
        title = "Processed Culinary Ingredient"
        reasons.append("Composed of single culinary ingredients extracted from nature (e.g. butter, oil, salt)")
        confidence = "high"
    elif any(k in raw_lower for k in ("salt", "sugar", "brine", "oil")) and len(raw_lower.split(",")) <= 6:
        group = 3
        title = "Processed Food"
        reasons.append("Simple food made by preserving or cooking basic foods with oil, salt, or sugar, without cosmetic additives")
        confidence = "medium"
    elif not ingredients_text or len(raw_lower.split(",")) <= 2:
        group = 1
        title = "Unprocessed or Minimally Processed"
        reasons.append("Single natural whole food (e.g., pure grains, legumes, milk, or fresh fruit) with minimal industrial modification")
        confidence = "high" if ingredients_text else "low"
    else:
        group = 3
        title = "Processed Food"
        reasons.append("Processed formulation without confirmed cosmetic additives")
        confidence = "low"

    return {
        "group": group,
        "title": title,
        "confidence": confidence,
        "reasons": reasons,
    }


def calculate_truth_score(norm: dict, nova_group: int, matched_additives: list[dict],
                          has_industrial_fats: bool, has_hidden_sugars: bool,
                          inconsistencies_count: int = 0) -> dict:
    """Calculates transparent 0-100 TruthScore with clear point breakdown."""
    score = 100
    factors = []

    # Nutrition Penalties
    sugar = norm.get("total_sugars_g", norm.get("sugar_g"))
    if sugar is not None:
        if sugar > 25.0:
            ded = 20
            score -= ded
            factors.append(f"-{ded} pts: Very high sugar ({sugar:g}g / 100g)")
        elif sugar > 15.0:
            ded = 12
            score -= ded
            factors.append(f"-{ded} pts: High sugar ({sugar:g}g / 100g)")

    sat_fat = norm.get("saturated_fat_g")
    if sat_fat is not None:
        if sat_fat > 10.0:
            ded = 15
            score -= ded
            factors.append(f"-{ded} pts: High saturated fat ({sat_fat:g}g / 100g)")
        elif sat_fat > 5.0:
            ded = 8
            score -= ded
            factors.append(f"-{ded} pts: Moderate-to-high saturated fat ({sat_fat:g}g / 100g)")

    sod_mg = norm.get("sodium_mg")
    if sod_mg is not None and sod_mg > 1000:
        ded = 12
        score -= ded
        factors.append(f"-{ded} pts: High sodium content ({sod_mg:g}mg / 100g)")

    # Processing & Additives Penalties
    if nova_group == 4:
        ded = 15
        score -= ded
        factors.append(f"-{ded} pts: Ultra-Processed Food (NOVA Group 4)")
    elif nova_group == 1:
        bonus = 5
        score += bonus
        factors.append(f"+{bonus} pts: Wholesome minimally processed food (NOVA Group 1)")

    # Additives hazard penalty
    for a in matched_additives:
        rating = a.get("safety_rating", "safe")
        if rating == "high_risk":
            ded = 15
            score -= ded
            factors.append(f"-{ded} pts: High-risk additive ({a['name']})")
        elif rating == "caution":
            ded = 6
            score -= ded
            factors.append(f"-{ded} pts: Additive with caution advisories ({a['name']})")
        elif rating == "moderate":
            ded = 3
            score -= ded
            factors.append(f"-{ded} pts: Artificial additive ({a['name']})")

    # Industrial fats
    if has_industrial_fats:
        ded = 10
        score -= ded
        factors.append(f"-{ded} pts: Contains refined palm oil or hydrogenated vegetable fats")

    # Marketing inconsistencies
    if inconsistencies_count > 0:
        ded = min(15, inconsistencies_count * 6)
        score -= ded
        factors.append(f"-{ded} pts: Detected {inconsistencies_count} deceptive marketing claim inconsistency")

    # Clamping
    final_score = max(5, min(100, score))

    if final_score >= 80:
        grade = "A (Clean & Wholesome)"
    elif final_score >= 60:
        grade = "B (Moderate Quality)"
    elif final_score >= 40:
        grade = "C (Processed / Caution)"
    elif final_score >= 20:
        grade = "D (Ultra-Processed / High Sugars)"
    else:
        grade = "E (Avoid Frequent Intake)"

    return {
        "score": final_score,
        "grade": grade,
        "breakdown": factors,
    }
