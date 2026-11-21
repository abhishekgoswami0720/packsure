/**
 * The transparent scoring engine.
 *
 * Hard rule from the product brief: scoring is **never** AI-driven. It is a
 * deterministic, rule-based deduction the user can read line by line:
 *
 *     Base score ............ 100
 *     − Artificial sweetener . 15
 *     − Artificial colour .... 12
 *     − Preservative ......... 6
 *     ...
 *     = Final score
 *
 * Same input always yields the same score, and every point removed is
 * attributable to one named ingredient.
 */
import {
  categoryLabel,
  Ingredient,
  IngredientCategory,
} from '@/domain/ingredients/types';
import { ProductNutrition } from '@/domain/products/types';
import { computeNutriScore } from './nutriScore';
import { NutritionMetric, ScoreLine, ScoreResult, Verdict, VerdictKind } from './types';

const BASE_SCORE = 100;

/**
 * Default points removed per category. Per-ingredient `scorePenalty` overrides
 * these for the handful of additives that warrant special weight.
 */
export const CATEGORY_PENALTY: Record<IngredientCategory, number> = {
  trans_fat: 22,
  artificial_sweetener: 15,
  flour_treatment: 14,
  artificial_color: 12,
  flavour_enhancer: 10,
  added_sugar: 8,
  preservative: 6,
  refined_oil: 6,
  antioxidant: 4,
  emulsifier: 4,
  stabiliser: 3,
  anticaking_agent: 2,
  glazing_agent: 2,
  acidity_regulator: 2,
  raising_agent: 2,
  colour_natural: 1,
  natural: 0,
};

/** Score bands, tuned to the Nutri-Score mapping (A/B good, C/D caution, E concern). */
const GOOD_AT = 72;
const CAUTION_AT = 45;

export function penaltyFor(ingredient: Ingredient): number {
  const base =
    ingredient.scorePenalty != null
      ? Math.abs(ingredient.scorePenalty)
      : CATEGORY_PENALTY[ingredient.category];
  // High-risk ingredients carry a small additional penalty regardless of category.
  const riskBump = ingredient.riskLevel === 'high' ? 4 : 0;
  return base + riskBump;
}

function reasonFor(ingredient: Ingredient): string {
  return categoryLabel[ingredient.category].toLowerCase();
}

export function verdictFor(score: number): Verdict {
  let kind: VerdictKind;
  if (score >= GOOD_AT) kind = 'good';
  else if (score >= CAUTION_AT) kind = 'caution';
  else kind = 'concern';

  switch (kind) {
    case 'good':
      return {
        kind,
        tone: 'success',
        title: 'Good choice',
        subtitle: 'A solid everyday option.',
      };
    case 'caution':
      return {
        kind,
        tone: 'warning',
        title: 'Think twice',
        subtitle: 'A few things worth a closer look.',
      };
    case 'concern':
      return {
        kind,
        tone: 'danger',
        title: 'High concern',
        subtitle: 'Several things you may want to avoid.',
      };
  }
}

/**
 * Build the processing + nutrition signals (and their score impact) from a
 * product's facts. Thresholds follow the UK FSA traffic-light bands for solids,
 * which OFF uses too. Everything is plain-language and optional.
 */
export function nutritionMetrics(
  n: ProductNutrition | undefined,
  referenceGrams = 100,
): NutritionMetric[] {
  if (!n) return [];
  const out: NutritionMetric[] = [];
  // Show the amounts for a realistic serving, matching how the score is computed,
  // so a condiment's figures read "per serving" instead of an alarming per-100g.
  const f = referenceGrams / 100;
  const per = referenceGrams === 100 ? 'per 100g' : `per serving (~${referenceGrams}g)`;
  const g = (v?: number) => (typeof v === 'number' && isFinite(v) ? v * f : undefined);

  // Processing level (NOVA) — shown as context only, with no score weight: OFF's
  // NOVA tag is crowd-sourced, and nutritional quality is already captured above.
  if (n.novaGroup === 4) {
    out.push({ key: 'processing', label: 'Ultra-processed', level: 'moderate', detail: 'Heavily processed food', points: 0 });
  } else if (n.novaGroup === 3) {
    out.push({ key: 'processing', label: 'Processed', level: 'moderate', detail: 'Processed food', points: 0 });
  } else if (n.novaGroup === 1 || n.novaGroup === 2) {
    out.push({ key: 'processing', label: 'Minimally processed', level: 'good', points: 0 });
  }

  // Nutrients to limit — bands follow the UK FSA front-of-pack traffic lights,
  // with steeper deductions at the very-high end (sodas, sweets).
  const sugar = g(n.sugars100g);
  if (sugar !== undefined) {
    if (sugar > 45) out.push({ key: 'sugar', label: 'Too much sugar', level: 'high', detail: `${Math.round(sugar)}g sugar ${per}`, points: -28 });
    else if (sugar > 22.5) out.push({ key: 'sugar', label: 'Too much sugar', level: 'high', detail: `${Math.round(sugar)}g sugar ${per}`, points: -16 });
    else if (sugar > 5) out.push({ key: 'sugar', label: 'Some sugar', level: 'moderate', detail: `${Math.round(sugar)}g sugar ${per}`, points: -6 });
    else out.push({ key: 'sugar', label: 'Low sugar', level: 'good', detail: `${Math.round(sugar)}g ${per}`, points: 0 });
  }

  // Salt: ≤0.5g/100g is genuinely low (a trace) — don't flag it as "some".
  const salt = g(n.salt100g);
  if (salt !== undefined) {
    if (salt > 1.5) out.push({ key: 'salt', label: 'High salt', level: 'high', detail: `${salt.toFixed(1)}g salt ${per}`, points: -10 });
    else if (salt > 0.5) out.push({ key: 'salt', label: 'Some salt', level: 'moderate', detail: `${salt.toFixed(1)}g salt ${per}`, points: -4 });
    else out.push({ key: 'salt', label: 'Low salt', level: 'good', detail: `${salt.toFixed(1)}g ${per}`, points: 0 });
  }

  const satFat = g(n.saturatedFat100g);
  if (satFat !== undefined) {
    if (satFat > 10) out.push({ key: 'satfat', label: 'High saturated fat', level: 'high', detail: `${Math.round(satFat)}g ${per}`, points: -16 });
    else if (satFat > 5) out.push({ key: 'satfat', label: 'High saturated fat', level: 'high', detail: `${Math.round(satFat)}g ${per}`, points: -10 });
    else if (satFat > 1.5) out.push({ key: 'satfat', label: 'Some saturated fat', level: 'moderate', detail: `${Math.round(satFat)}g ${per}`, points: -3 });
  }

  // Beneficial nutrients — credited so a genuinely nutritious product reads well.
  // Total positive credit is capped in computeScore.
  const fiber = g(n.fiber100g);
  if (fiber !== undefined && fiber >= 3) {
    out.push({ key: 'fiber', label: fiber >= 6 ? 'High fibre' : 'Good fibre', level: 'good', detail: `${Math.round(fiber)}g ${per}`, points: fiber >= 6 ? 5 : 2, positive: true });
  }
  const protein = g(n.proteins100g);
  if (protein !== undefined && protein >= 8) {
    out.push({ key: 'protein', label: protein >= 15 ? 'High protein' : 'Good protein', level: 'good', detail: `${Math.round(protein)}g ${per}`, points: protein >= 15 ? 5 : 3, positive: true });
  }

  return out;
}

/**
 * Compute the overall health score. Two independent axes are combined:
 *
 *   1. Nutritional quality — via {@link computeNutriScore} (the validated
 *      Nutri-Score algorithm, with the stricter table for beverages). This is
 *      the starting score.
 *   2. Additive concerns — resolved ingredients that carry a deduction
 *      (artificial colours, sweeteners…) lower that score, capped so a single
 *      flag has limited impact while several compound.
 *
 * With no nutrition facts (a label-only scan) the score starts from a neutral
 * 100 and the additive concerns alone determine it.
 *
 * @param ingredients distinct ingredients matched off the label.
 * @param nutrition   product nutrition facts (barcode products); optional.
 * @param isBeverage  true for drinks — scored on the Nutri-Score beverage table.
 */
export function computeScore(
  ingredients: Ingredient[],
  nutrition?: ProductNutrition,
  isBeverage = false,
): ScoreResult {
  const breakdown: ScoreLine[] = [];

  for (const ingredient of ingredients) {
    const points = penaltyFor(ingredient);
    if (points <= 0) continue;
    breakdown.push({ ingredient, points: -points, reason: reasonFor(ingredient) });
  }

  // Worst offenders first so the UI leads with what matters.
  breakdown.sort((a, b) => a.points - b.points);

  const nutri = computeNutriScore(nutrition, isBeverage);
  const nutritionBase = nutri ? nutri.score : BASE_SCORE;
  // Serving size the score was computed for — the display rows use it too so the
  // "At a glance" figures match the score (beverages stay per-100g by their table).
  const referenceGrams = isBeverage ? 100 : nutrition?.referenceGrams ?? 100;

  const MAX_ADDITIVE_PENALTY = 45;
  const additivePenalty = Math.max(
    -MAX_ADDITIVE_PENALTY,
    breakdown.reduce((sum, line) => sum + line.points, 0),
  );

  const score = Math.max(0, Math.min(100, nutritionBase + additivePenalty));

  return {
    score,
    baseScore: nutritionBase,
    verdict: verdictFor(score),
    breakdown,
    nutrition: nutritionMetrics(nutrition, referenceGrams),
    nutriGrade: nutri?.grade,
    matchedCount: ingredients.length,
    concernCount: breakdown.length,
  };
}
