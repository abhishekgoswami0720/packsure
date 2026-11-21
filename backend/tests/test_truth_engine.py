"""Comprehensive automated test suite for TruthLens intelligence engines.
Covers Section 16: Ingredient tests, Claim tests, NOVA tests, Nutrition tests, and Integration tests.
"""
import pytest
from app.claim_buster import verify_claims
from app.nutrition_engine import calculate_truth_score, classify_nova, evaluate_traffic_lights, normalize_nutrition
from app.truth_service import (
    analyze_product_data,
    compare_products_data,
    get_clean_alternatives,
    lookup_barcode,
    match_additives,
    match_hidden_sugars,
    match_industrial_fats,
    search_catalogue,
)


# ===================================================================
# 1. INGREDIENT & ADDITIVE TESTS (Section 16)
# ===================================================================
def test_ins_211_detection():
    # Sodium Benzoate
    text = "Ingredients: Water, Sugar, Carbon Dioxide, Preservative (INS 211), Flavourings."
    hits = match_additives(text)
    ins_codes = [a["ins"] for a in hits]
    assert "211" in ins_codes
    benzoate = next(a for a in hits if a["ins"] == "211")
    assert benzoate["name"] == "Sodium Benzoate"
    assert benzoate["safety_rating"] == "moderate"


def test_ins_102_detection_and_abroad_warnings():
    # Tartrazine
    text = "Ingredients: Potato, Salt, Edible Vegetable Oil, Synthetic Food Colour (INS 102)."
    hits = match_additives(text)
    ins_codes = [a["ins"] for a in hits]
    assert "102" in ins_codes
    tartrazine = next(a for a in hits if a["ins"] == "102")
    assert tartrazine["safety_rating"] == "caution"
    assert "children" in tartrazine["abroad_status"]["EU"].lower()


def test_ins_955_detection():
    # Sucralose
    text = "Ingredients: Water, Acidity Regulator (INS 330), Non-caloric Sweetener (Sucralose - INS 955)."
    hits = match_additives(text)
    ins_codes = [a["ins"] for a in hits]
    assert "955" in ins_codes
    assert any("sucralose" in a["name"].lower() for a in hits)


def test_ins_407_detection():
    # Carrageenan
    text = "Ingredients: Almond milk, Sea salt, Stabiliser (Carrageenan / INS 407)."
    hits = match_additives(text)
    ins_codes = [a["ins"] for a in hits]
    assert "407" in ins_codes
    carrageenan = next(a for a in hits if a["ins"] == "407")
    assert carrageenan["safety_rating"] == "caution"


def test_maltodextrin_detection():
    text = "Ingredients: Whey protein concentrate, Cocoa powder, Maltodextrin, Emulsifier."
    hits = match_hidden_sugars(text)
    names = [h["name"].lower() for h in hits]
    assert "maltodextrin" in names
    malto = next(h for h in hits if h["name"].lower() == "maltodextrin")
    assert malto["gi"] >= 100  # High GI verified


def test_invert_sugar_detection():
    text = "Ingredients: Wheat flour, Palm oil, Invert Sugar Syrup, Raising agent."
    hits = match_hidden_sugars(text)
    names = [h["name"].lower() for h in hits]
    assert any("invert sugar" in n for n in names)


def test_palmolein_detection():
    text = "Ingredients: Potatoes, Edible Vegetable Oil (Palmolein), Spices, Salt."
    hits = match_industrial_fats(text)
    names = [h["name"].lower() for h in hits]
    assert "palmolein" in names


def test_hydrogenated_vegetable_fat_detection():
    text = "Ingredients: Sugar, Hydrogenated Vegetable Fat, Cocoa solids, Emulsifier."
    hits = match_industrial_fats(text)
    names = [h["name"].lower() for h in hits]
    assert any("hydrogenated" in n for n in names)


# ===================================================================
# 2. MARKETING CLAIM BUSTER TESTS (Section 16)
# ===================================================================
def test_whole_wheat_claim_with_maida_before_atta():
    # Deceptive atta biscuit
    claims = ["100% Atta Goodness", "Whole Wheat Biscuits"]
    ingredients = "Refined Wheat Flour (Maida) (50%), Whole Wheat Flour (Atta) (15%), Sugar, Palm Oil."
    nutrition = {"protein_g": 6.5, "fiber_g": 2.0}
    verdicts = verify_claims(claims, ingredients, nutrition)

    v1 = next(v for v in verdicts if "100% Atta" in v["claim"])
    assert v1["status"] in ("verified_inconsistency", "potential_inconsistency")
    assert "maida" in v1["explanation"].lower()


def test_no_added_sugar_claim_with_added_sugar_syrup():
    claims = ["No Added Sugar", "Guilt Free"]
    ingredients = "Oats, Date Syrup, Apple Juice Concentrate, Nuts, Salt."
    nutrition = {"total_sugars_g": 18.0}
    verdicts = verify_claims(claims, ingredients, nutrition)

    v = next(v for v in verdicts if "No Added Sugar" in v["claim"])
    assert v["status"] == "potential_inconsistency"
    assert "date syrup" in v["evidence"].lower()


def test_sugar_free_claim_with_maltodextrin():
    claims = ["Sugar Free", "Zero Sugar"]
    ingredients = "Almond Flour, Maltodextrin, Butter, Cocoa Powder."
    nutrition = {"total_sugars_g": 0.5}
    verdicts = verify_claims(claims, ingredients, nutrition)

    v = next(v for v in verdicts if "Sugar Free" in v["claim"])
    assert v["status"] == "potential_inconsistency"
    assert "maltodextrin" in v["evidence"].lower()


def test_real_honey_claim_with_low_percentage():
    claims = ["Made with Real Honey"]
    ingredients = "Wheat flour, Sugar, Palm oil, Honey (0.8%), Salt."
    nutrition = {"total_sugars_g": 20.0}
    verdicts = verify_claims(claims, ingredients, nutrition)

    v = verdicts[0]
    assert v["status"] == "potential_inconsistency"
    assert "0.8%" in v["evidence"]


# ===================================================================
# 3. NOVA CLASSIFICATION TESTS (Section 16)
# ===================================================================
def test_nova_group_1_plain_oats():
    ing = "100% Rolled Oats."
    res = classify_nova(ing, [], has_industrial_fats=False, has_hidden_sugars=False)
    assert res["group"] == 1
    assert "minimally processed" in res["title"].lower()


def test_nova_group_1_plain_milk():
    ing = "Pasteurised Toned Milk."
    res = classify_nova(ing, [], has_industrial_fats=False, has_hidden_sugars=False)
    assert res["group"] == 1


def test_nova_group_2_butter_and_sugar():
    ing = "Butter, Salt."
    res = classify_nova(ing, [], has_industrial_fats=False, has_hidden_sugars=False)
    assert res["group"] == 2
    assert "culinary ingredient" in res["title"].lower()


def test_nova_group_3_canned_beans_in_salt():
    ing = "Red Kidney Beans, Water, Common Salt."
    res = classify_nova(ing, [], has_industrial_fats=False, has_hidden_sugars=False)
    assert res["group"] == 3
    assert "processed food" in res["title"].lower()


def test_nova_group_4_cookies_with_emulsifiers_and_palm_oil():
    ing = "Refined Wheat Flour, Sugar, Palm Oil, Invert Syrup, Emulsifier (INS 322), Synthetic Flavour."
    additives = match_additives(ing)
    res = classify_nova(ing, additives, has_industrial_fats=True, has_hidden_sugars=True)
    assert res["group"] == 4
    assert "ultra-processed" in res["title"].lower()


# ===================================================================
# 4. NUTRITION ENGINE & TRAFFIC LIGHT TESTS (Section 16)
# ===================================================================
def test_serving_size_normalization():
    # Product provides nutrition for 25g serving
    raw = {
        "is_per_serving": True,
        "serving_size_g": 25,
        "energy_kcal": 100,
        "total_sugars_g": 5.0,
        "sodium_mg": 50,
    }
    norm = normalize_nutrition(raw, serving_size_g=25)
    # Per 100g should be 4x
    assert norm["energy_kcal"] == 400.0
    assert norm["total_sugars_g"] == 20.0
    assert norm["sodium_mg"] == 200.0


def test_traffic_lights_solid_food():
    norm = {
        "total_sugars_g": 22.0,  # > 15g -> Red
        "saturated_fat_g": 1.0,   # <= 1.5g -> Green
        "sodium_mg": 450,         # 300 - 1500mg -> Amber
    }
    tl = evaluate_traffic_lights(norm, is_liquid=False)
    assert tl["sugar"]["status"] == "red"
    assert tl["saturated_fat"]["status"] == "green"
    assert tl["sodium"]["status"] == "amber"


def test_traffic_lights_liquid_food():
    # Liquid product has lower sugar threshold: > 7.5g is red
    norm = {
        "total_sugars_g": 9.0,   # > 7.5g -> Red for liquids
        "saturated_fat_g": 0.5,  # <= 0.75g -> Green
    }
    tl = evaluate_traffic_lights(norm, is_liquid=True)
    assert tl["sugar"]["status"] == "red"
    assert tl["saturated_fat"]["status"] == "green"


def test_sodium_to_salt_conversion():
    norm = {"salt_g": 2.5}
    res = normalize_nutrition(norm)
    assert res["sodium_mg"] == 1000.0  # 2.5 * 400


# ===================================================================
# 5. INTEGRATION TESTS (Section 16)
# ===================================================================
def test_barcode_lookup_parle_g():
    res = lookup_barcode("8901719101013")
    assert res is not None
    assert "Parle-G" in res["name"]
    assert res["nova"]["group"] == 4
    assert res["truth_score"]["score"] < 60  # Ultra processed high sugar biscuit


def test_barcode_lookup_clean_peanut_butter():
    res = lookup_barcode("8908013210041")
    assert res is not None
    assert "The Whole Truth" in res["name"]
    assert res["nova"]["group"] == 1  # 100% roasted peanuts
    assert res["truth_score"]["score"] >= 80  # Clean score


def test_catalogue_search():
    results = search_catalogue("butter")
    assert len(results) >= 1
    assert any("Butter" in r["name"] for r in results)


def test_product_comparison():
    p1 = lookup_barcode("8901719101013")  # Parle-G
    p2 = lookup_barcode("8901063013280")  # NutriChoice Atta
    comp = compare_products_data(p1, p2)
    assert "overall_winner" in comp
    assert len(comp["goal_advice"]) >= 1


def test_clean_alternatives_recommendation():
    recs = get_clean_alternatives("maggi_masala_noodles", "Instant Noodles & Pasta")
    assert len(recs) >= 1
    assert "Slurrp Farm" in recs[0]["brand"]
    assert recs[0]["clean_score"] >= 85
