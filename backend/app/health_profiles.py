"""Personalized informational health profiles evaluating suitability for specific dietary and wellness needs."""
from __future__ import annotations

import json
import re
from pathlib import Path

ALLERGENS_DATA = json.loads((Path(__file__).parent / "knowledge" / "allergens.json").read_text())["allergens"]


def evaluate_health_profiles(ingredients_text: str, nutrition: dict, matched_additives: list[dict],
                             active_profiles: list[str] | None = None) -> dict:
    """Evaluates ingredients and nutrition against 6 clinical & lifestyle health profiles:
    - diabetic: Glycemic load, total sugars, maltodextrin, high GI syrups
    - heart_bp: Sodium, saturated fats, trans fats, palm oils
    - pcos: Endocrine disruptors, intense added sugars, high GI starches
    - gut_health: Emulsifiers (CMC, carrageenan), non-nutritive sweeteners
    - child_safe: Southampton azo dyes, artificial sweeteners, caffeine
    - allergens: Gluten, dairy, soy, nuts, egg, etc. (confirmed vs precautionary)
    """
    ing_lower = (ingredients_text or "").lower()
    add_classes = {a.get("class", "").lower() for a in matched_additives}
    add_ins = {a.get("ins") for a in matched_additives}

    profiles = {}

    # --- 1. Diabetic & Pre-Diabetic
    sugar_g = nutrition.get("total_sugars_g", nutrition.get("sugar_g", 0)) or 0
    carbs_g = nutrition.get("carbohydrates_g", 0) or 0
    has_maltodextrin = "maltodextrin" in ing_lower
    has_high_gi = any(k in ing_lower for k in ("liquid glucose", "corn syrup", "invert sugar", "dextrose", "rice syrup"))

    diabetic_alerts = []
    if sugar_g > 10.0:
        diabetic_alerts.append(f"High sugar content ({sugar_g:g}g / 100g) can cause acute glycemic spikes.")
    elif sugar_g > 5.0:
        diabetic_alerts.append(f"Moderate sugar ({sugar_g:g}g / 100g); consume in controlled portions.")

    if has_maltodextrin:
        diabetic_alerts.append("Contains Maltodextrin: exceptionally high Glycemic Index (GI 110), spikes blood sugar faster than table sugar.")
    if has_high_gi:
        diabetic_alerts.append("Contains high-glycemic refined syrups (liquid glucose / invert sugar).")

    profiles["diabetic"] = {
        "status": "caution" if (sugar_g > 10 or has_maltodextrin) else ("moderate" if sugar_g > 5 else "good"),
        "title": "Diabetes & Blood Sugar",
        "alerts": diabetic_alerts,
        "recommendation": "Avoid frequent consumption if managing pre-diabetes or Type-2 diabetes." if diabetic_alerts else "Suitable for balanced diabetic intake."
    }

    # --- 2. Heart & Blood Pressure
    sod_mg = nutrition.get("sodium_mg", 0) or 0
    sat_fat_g = nutrition.get("saturated_fat_g", 0) or 0
    has_palm = any(k in ing_lower for k in ("palm oil", "palmolein", "palm kernel oil", "hydrogenated"))

    heart_alerts = []
    if sod_mg > 800:
        heart_alerts.append(f"Very high sodium ({sod_mg:g}mg / 100g) contributes to elevated arterial blood pressure.")
    elif sod_mg > 400:
        heart_alerts.append(f"Moderate sodium ({sod_mg:g}mg / 100g).")

    if sat_fat_g > 6.0:
        heart_alerts.append(f"High saturated fat ({sat_fat_g:g}g / 100g) may elevate LDL cholesterol.")
    if has_palm:
        heart_alerts.append("Contains refined palm oil / palmolein, rich in atherogenic palmitic acid.")

    profiles["heart_bp"] = {
        "status": "caution" if (sod_mg > 800 or sat_fat_g > 8) else ("moderate" if (sod_mg > 400 or has_palm) else "good"),
        "title": "Heart & Hypertension",
        "alerts": heart_alerts,
        "recommendation": "Individuals with hypertension or dyslipidemia should strictly moderate portion size." if heart_alerts else "Heart-friendly nutrient profile."
    }

    # --- 3. PCOS & Hormonal Health
    pcos_alerts = []
    if sugar_g > 15:
        pcos_alerts.append(f"High sugar load ({sugar_g:g}g / 100g) exacerbates insulin resistance, a root driver of PCOS.")
    if "320" in add_ins or "321" in add_ins:
        pcos_alerts.append("Contains synthetic antioxidants (BHA / BHT) currently under review for endocrine activity.")
    if has_palm or "interesterified" in ing_lower:
        pcos_alerts.append("Refined inflammatory seed/palm oils may worsen systemic low-grade inflammation.")

    profiles["pcos"] = {
        "status": "caution" if (sugar_g > 15 or "320" in add_ins) else "good",
        "title": "PCOS & Hormonal Wellness",
        "alerts": pcos_alerts,
        "recommendation": "Consider clean whole-food alternatives with lower glycemic impact and zero synthetic additives." if pcos_alerts else "Low endocrine and glycemic risk."
    }

    # --- 4. Gut Health & IBS
    gut_alerts = []
    mucus_disruptors = []
    if "407" in add_ins or "carrageenan" in ing_lower:
        mucus_disruptors.append("Carrageenan (INS 407)")
    if "466" in add_ins or "carboxymethyl" in ing_lower:
        mucus_disruptors.append("Carboxymethyl Cellulose / CMC (INS 466)")
    if "955" in add_ins or "sucralose" in ing_lower:
        mucus_disruptors.append("Sucralose (INS 955)")
    if "965" in add_ins or "maltitol" in ing_lower:
        mucus_disruptors.append("Maltitol (INS 965)")

    if mucus_disruptors:
        gut_alerts.append(f"Contains additives linked to gut lining irritation or microbiome shift: {', '.join(mucus_disruptors)}.")
    if "965" in add_ins or "maltitol" in ing_lower:
        gut_alerts.append("Contains polyols (sugar alcohols) known to trigger osmotic bloating, gas, and IBS flare-ups.")

    profiles["gut_health"] = {
        "status": "caution" if mucus_disruptors else "good",
        "title": "Gut Barrier & Digestive Health",
        "alerts": gut_alerts,
        "recommendation": "Individuals with IBS or gut sensitivity may experience discomfort." if gut_alerts else "Gentle on intestinal lining."
    }

    # --- 5. Child & Family Safe
    child_alerts = []
    southampton_dyes = [a["name"] for a in matched_additives if a.get("ins") in ("102", "110", "122", "124", "127", "129")]
    if southampton_dyes:
        child_alerts.append(f"Contains synthetic azo dyes ({', '.join(southampton_dyes)}) that require UK/EU warning labels for pediatric hyperactivity.")
    if any(a.get("ins") in ("951", "955", "950") for a in matched_additives):
        child_alerts.append("Contains non-nutritive intense sweeteners not advised for routine pediatric development.")
    if sugar_g > 20:
        child_alerts.append(f"Contains high sugar ({sugar_g:g}g / 100g), exceeding recommended daily pediatric limits in one serving.")

    profiles["child_safe"] = {
        "status": "caution" if (southampton_dyes or sugar_g > 20) else "good",
        "title": "Child Safe & Family Friendly",
        "alerts": child_alerts,
        "recommendation": "Limit frequency for young children." if child_alerts else "Family-friendly ingredient profile."
    }

    # --- 6. Allergens (Confirmed vs Precautionary)
    detected_allergens = []
    precautionary_statement = ""

    # Check for "May contain traces of..." or "Manufactured in a facility that also handles..."
    may_contain_match = re.search(r"(may\s*contain|allergen\s*advice|processed\s*in\s*a\s*facility|made\s*on\s*shared\s*equipment)[^\.\n]*", ing_lower)
    if may_contain_match:
        precautionary_statement = may_contain_match.group(0).strip().capitalize()

    for item in ALLERGENS_DATA:
        # Check if confirmed in ingredients
        is_confirmed = False
        is_precautionary = False

        for kw in item["keywords"]:
            if re.search(r"\b" + re.escape(kw) + r"\b", ing_lower):
                if precautionary_statement and kw in precautionary_statement.lower() and not re.search(r"\b" + re.escape(kw) + r"\b", ing_lower[:may_contain_match.start()]):
                    is_precautionary = True
                else:
                    is_confirmed = True
                break

        if is_confirmed:
            detected_allergens.append({"name": item["name"], "type": "confirmed", "severity": item["severity"]})
        elif is_precautionary:
            detected_allergens.append({"name": item["name"], "type": "precautionary", "severity": item["severity"]})

    profiles["allergens"] = {
        "detected": detected_allergens,
        "precautionary_statement": precautionary_statement,
        "is_vegetarian": not any(k in ing_lower for k in ("chicken", "meat", "fish", "gelatin", "gelatine", "egg", "pork", "beef")),
        "is_vegan": not any(k in ing_lower for k in ("milk", "butter", "cheese", "curd", "ghee", "honey", "dairy", "whey", "casein", "egg", "meat", "fish")),
    }

    return profiles
