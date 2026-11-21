/**
 * Nutri-Score — the EU's validated front-of-pack nutrition algorithm.
 *
 * It scores a food's overall nutritional quality by balancing "negative"
 * nutrients (energy, sugar, saturated fat, sodium) against "positive" ones
 * (fibre, protein), each on a graduated points table. Crucially it uses a
 * separate, stricter table for **beverages**, which is what lets a sugary drink
 * land at grade E even though its per-100g sugar looks modest — the gap the old
 * subtractive model couldn't close.
 *
 * References: Santé publique France Nutri-Score algorithm (2017 tables).
 * We map the A–E grade onto the app's 0–100 ring so the existing UI is unchanged.
 */
import { ProductNutrition } from '@/domain/products/types';

export type NutriGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface NutriScoreResult {
  /** Final Nutri-Score points (negatives − positives); lower is better. */
  points: number;
  grade: NutriGrade;
  /** 0–100 nutrition quality mapped from the grade, for the app's score ring. */
  score: number;
}

/** Count how many ascending thresholds a value exceeds (the Nutri-Score points). */
function pointsFor(value: number, thresholds: number[]): number {
  let p = 0;
  for (const t of thresholds) {
    if (value > t) p += 1;
    else break;
  }
  return p;
}

// ── Negative-nutrient tables (points 1..10), per 100g ────────────────────────
const ENERGY_KJ_SOLID = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
const SUGAR_SOLID = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
const SATFAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SODIUM_MG = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];

// Beverages use much stricter energy + sugar tables.
const ENERGY_KJ_BEV = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300];
const SUGAR_BEV = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5];

// ── Positive-nutrient tables (points 1..5), per 100g ─────────────────────────
const FIBRE = [0.9, 1.9, 2.8, 3.7, 4.7];
const PROTEIN = [1.6, 3.2, 4.8, 6.4, 8.0];

const GRADE_SCORE: Record<NutriGrade, number> = { A: 92, B: 80, C: 64, D: 46, E: 24 };

/** Grade a *solid* food from its final points. */
function solidGrade(points: number): NutriGrade {
  if (points <= -1) return 'A';
  if (points <= 2) return 'B';
  if (points <= 10) return 'C';
  if (points <= 18) return 'D';
  return 'E';
}

/** Grade a *beverage* — the stricter scale; A is effectively water only. */
function beverageGrade(points: number, isWater: boolean): NutriGrade {
  if (isWater) return 'A';
  if (points <= 1) return 'B';
  if (points <= 5) return 'C';
  if (points <= 9) return 'D';
  return 'E';
}

/**
 * Compute the Nutri-Score for a product. Missing nutrients are treated as zero
 * (benefit of the doubt). Returns null when there's no usable nutrition at all,
 * so the caller can fall back to an additive-only score.
 */
export function computeNutriScore(
  n: ProductNutrition | undefined,
  isBeverage = false,
): NutriScoreResult | null {
  if (!n) return null;
  const num = (v?: number) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const has =
    n.energyKcal100g != null ||
    n.sugars100g != null ||
    n.saturatedFat100g != null ||
    n.salt100g != null;
  if (!has) return null;

  // Score per a realistic serving, not a flat 100g — a spoonful of chutney
  // shouldn't be judged as if you ate 100g of it. Beverages keep their own
  // stricter table (already tuned for a ~250ml serving), so they stay per-100g
  // here. Any product without a reference amount defaults to 100g ⇒ no change.
  const ref = isBeverage ? 100 : n.referenceGrams ?? 100;
  const f = ref / 100;

  const energyKj = num(n.energyKcal100g) * 4.184 * f;
  const sugar = num(n.sugars100g) * f;
  const satFat = num(n.saturatedFat100g) * f;
  const sodiumMg = num(n.salt100g) * 400 * f; // salt g → sodium mg (÷2.5, ×1000)
  const fibre = num(n.fiber100g) * f;
  const protein = num(n.proteins100g) * f;

  const negative =
    pointsFor(energyKj, isBeverage ? ENERGY_KJ_BEV : ENERGY_KJ_SOLID) +
    pointsFor(sugar, isBeverage ? SUGAR_BEV : SUGAR_SOLID) +
    pointsFor(satFat, SATFAT) +
    pointsFor(sodiumMg, SODIUM_MG);

  const fibrePoints = pointsFor(fibre, FIBRE);
  const proteinPoints = pointsFor(protein, PROTEIN);
  // Standard rule: when negatives are high, protein no longer counts toward the
  // positive score (so high-protein processed foods can't offset it); fibre always does.
  const positive = negative >= 11 ? fibrePoints : fibrePoints + proteinPoints;

  const points = negative - positive;
  const isWater = isBeverage && sugar === 0 && energyKj === 0;
  const grade = isBeverage ? beverageGrade(points, isWater) : solidGrade(points);

  return { points, grade, score: GRADE_SCORE[grade] };
}
