"""Deceptive marketing claim verification engine comparing front-of-package claims against back-of-pack realities."""
from __future__ import annotations

import re


def verify_claims(claims: list[str], ingredients_text: str, nutrition: dict) -> list[dict]:
    """Evaluates packaging claims against ingredient list and nutrition table facts.
    Returns:
      claim: The claim analyzed
      status: 'verified_inconsistency' | 'potential_inconsistency' | 'insufficient_info' | 'no_inconsistency'
      evidence: Specific ingredient or nutritional facts found
      explanation: Clear plain-language explanation for consumers
    """
    results = []
    ing_lower = (ingredients_text or "").lower()

    for raw_claim in claims:
        claim_str = raw_claim.strip()
        claim_lower = claim_str.lower()
        matched = False

        # 1. Whole Wheat / 100% Atta Claims
        if re.search(r"\b(100%\s*atta|whole\s*wheat|atta\s*biscuit|made\s*with\s*atta|wheat\s*goodness)\b", claim_lower):
            matched = True
            has_maida = bool(re.search(r"\b(refined\s*wheat\s*flour|maida)\b", ing_lower))
            has_atta = bool(re.search(r"\b(whole\s*wheat\s*flour|atta)\b", ing_lower))

            if has_maida:
                # Check order: ingredient lists list by descending weight in India
                maida_idx = ing_lower.find("maida")
                if maida_idx == -1:
                    maida_idx = ing_lower.find("refined wheat flour")
                atta_idx = ing_lower.find("atta")
                if atta_idx == -1:
                    atta_idx = ing_lower.find("whole wheat")

                if "100%" in claim_lower:
                    status = "verified_inconsistency"
                    expl = "Product claims '100% Atta / Whole Wheat' on the front, but the ingredient list discloses Refined Wheat Flour (Maida)."
                elif maida_idx != -1 and atta_idx != -1 and maida_idx < atta_idx:
                    status = "potential_inconsistency"
                    expl = "Product promotes wheat/atta on the front, but Refined Wheat Flour (Maida) appears before Atta in the ingredients, indicating Maida is the primary flour by weight."
                else:
                    status = "potential_inconsistency"
                    expl = "Contains both Atta and Refined Wheat Flour (Maida). Not purely whole wheat."

                results.append({
                    "claim": claim_str,
                    "status": status,
                    "evidence": "Ingredients list includes Refined Wheat Flour (Maida)",
                    "explanation": expl,
                })
            elif has_atta:
                results.append({
                    "claim": claim_str,
                    "status": "no_inconsistency",
                    "evidence": "Ingredients confirm Whole Wheat Flour (Atta) without maida.",
                    "explanation": "No maida detected in the ingredient statement.",
                })
            else:
                results.append({
                    "claim": claim_str,
                    "status": "insufficient_info",
                    "evidence": "Flour type not explicitly parsed from OCR.",
                    "explanation": "Could not confirm flour breakdown from available text.",
                })

        # 2. Sugar-Free / Zero Sugar Claims
        elif re.search(r"\b(sugar\s*free|zero\s*sugar|no\s*sugar)\b", claim_lower):
            matched = True
            has_maltodextrin = "maltodextrin" in ing_lower
            has_artificial_sweeteners = bool(re.search(r"\b(sucralose|aspartame|acesulfame|saccharin|ins 951|ins 955|ins 950)\b", ing_lower))
            has_polyols = bool(re.search(r"\b(maltitol|sorbitol|xylitol|erythritol|ins 965|ins 420)\b", ing_lower))
            sugar_g = nutrition.get("total_sugars_g", nutrition.get("sugar_g", 0))

            if sugar_g and sugar_g > 1.0:
                results.append({
                    "claim": claim_str,
                    "status": "verified_inconsistency",
                    "evidence": f"Nutrition table lists {sugar_g:g}g total sugars per 100g.",
                    "explanation": "Claimed sugar-free, but nutrition declaration confirms measurable sugar content.",
                })
            elif has_maltodextrin:
                results.append({
                    "claim": claim_str,
                    "status": "potential_inconsistency",
                    "evidence": "Ingredient list contains Maltodextrin.",
                    "explanation": "Marketed as 'sugar-free', but contains Maltodextrin, which has a higher glycemic index (GI 110) than table sugar and spikes blood glucose.",
                })
            elif has_artificial_sweeteners or has_polyols:
                results.append({
                    "claim": claim_str,
                    "status": "no_inconsistency",
                    "evidence": "Sweetened using non-caloric sweeteners or polyols.",
                    "explanation": "Contains zero sucrose, sweetened via non-nutritive intense sweeteners / sugar alcohols.",
                })
            else:
                results.append({
                    "claim": claim_str,
                    "status": "no_inconsistency",
                    "evidence": "No simple sugars or artificial sweeteners found.",
                    "explanation": "Consistent with low/zero sugar formulation.",
                })

        # 3. No Added Sugar Claims
        elif re.search(r"\b(no\s*added\s*sugar|without\s*added\s*sugar)\b", claim_lower):
            matched = True
            hidden_sugar_matches = [
                k for k in ("invert sugar", "liquid glucose", "corn syrup", "date syrup", "date powder",
                            "apple juice concentrate", "malt extract", "barley malt", "maltodextrin")
                if k in ing_lower
            ]
            if hidden_sugar_matches:
                results.append({
                    "claim": claim_str,
                    "status": "potential_inconsistency",
                    "evidence": f"Ingredients list includes: {', '.join(hidden_sugar_matches)}",
                    "explanation": f"Front pack claims 'No Added Sugar', but uses {', '.join(hidden_sugar_matches)}, which act as concentrated sweeteners and spike glycemic load.",
                })
            else:
                results.append({
                    "claim": claim_str,
                    "status": "no_inconsistency",
                    "evidence": "No synthetic syrups or concentrated fruit sugars found.",
                    "explanation": "No added refined sugars or high-fructose syrups detected in ingredient list.",
                })

        # 4. Real Honey / Fruit / Nuts Claims
        elif re.search(r"\b(real\s*honey|real\s*almonds?|real\s*fruit|made\s*with\s*honey|made\s*with\s*fruit)\b", claim_lower):
            matched = True
            # Look for percentage declaration like "Honey (0.5%)" or "Almond (1.2%)"
            pct_match = re.search(r"(honey|almonds?|fruit|kaju|cashews?)\s*\([^\)]*?(\d+(?:\.\d+)?)\s*%\)", ing_lower)
            if pct_match:
                pct_val = float(pct_match.group(2))
                if pct_val < 5.0:
                    results.append({
                        "claim": claim_str,
                        "status": "potential_inconsistency",
                        "evidence": f"Ingredient declaration reveals only {pct_val:g}% {pct_match.group(1)}.",
                        "explanation": f"Product branding emphasizes real ingredients, but it contains only {pct_val:g}% actual {pct_match.group(1)} by weight.",
                    })
                else:
                    results.append({
                        "claim": claim_str,
                        "status": "no_inconsistency",
                        "evidence": f"Declared at {pct_val:g}% in ingredient list.",
                        "explanation": f"Contains a substantial {pct_val:g}% {pct_match.group(1)}.",
                    })
            else:
                results.append({
                    "claim": claim_str,
                    "status": "insufficient_info",
                    "evidence": "No quantitative ingredient declaration (%) found on label.",
                    "explanation": "Cannot confirm the exact percentage of the claimed ingredient.",
                })

        # 5. Preservative Claims
        elif re.search(r"\b(no\s*preservatives?|zero\s*preservatives?|preservative\s*free)\b", claim_lower):
            matched = True
            pres_matches = [
                k for k in ("sodium benzoate", "potassium sorbate", "sorbic acid", "benzoic acid",
                            "ins 211", "ins 202", "ins 200", "ins 220", "sulphur dioxide", "bha", "bht", "tbhq")
                if k in ing_lower
            ]
            if pres_matches:
                results.append({
                    "claim": claim_str,
                    "status": "verified_inconsistency",
                    "evidence": f"Contains chemical preservatives/antioxidants: {', '.join(pres_matches)}",
                    "explanation": f"Front pack claims zero preservatives, but ingredients reveal {', '.join(pres_matches)}.",
                })
            else:
                results.append({
                    "claim": claim_str,
                    "status": "no_inconsistency",
                    "evidence": "No Class II synthetic preservatives detected.",
                    "explanation": "Formulation does not list standard chemical preservatives.",
                })

        # 6. High Protein Claims
        elif re.search(r"\b(high\s*protein|protein\s*rich|source\s*of\s*protein)\b", claim_lower):
            matched = True
            prot = nutrition.get("protein_g", 0)
            if prot is not None and prot < 5.0:
                results.append({
                    "claim": claim_str,
                    "status": "verified_inconsistency",
                    "evidence": f"Contains only {prot:g}g protein per 100g.",
                    "explanation": f"Claims high protein, but the nutrition table confirms only {prot:g}g protein per 100g, below standard thresholds.",
                })
            elif prot is not None and prot >= 10.0:
                results.append({
                    "claim": claim_str,
                    "status": "no_inconsistency",
                    "evidence": f"Contains {prot:g}g protein per 100g.",
                    "explanation": "Meets high protein nutritional threshold (>= 10g/100g).",
                })
            else:
                results.append({
                    "claim": claim_str,
                    "status": "potential_inconsistency",
                    "evidence": f"Contains {prot:g}g protein per 100g.",
                    "explanation": "Moderate protein content, may not qualify as high-protein under FSSAI front-of-pack guidelines.",
                })

        # 7. Generic check if no specific rule caught it
        if not matched:
            results.append({
                "claim": claim_str,
                "status": "no_inconsistency",
                "evidence": "General brand slogan or marketing claim.",
                "explanation": "No direct contradiction found in parsed label data.",
            })

    return results
