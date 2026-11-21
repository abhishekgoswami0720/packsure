import { VerdictTone } from '@/core/theme';
import { Ingredient } from '@/domain/ingredients/types';
import { NutriGrade } from './nutriScore';

/** The three decision states the whole product is built around. */
export type VerdictKind = 'good' | 'caution' | 'concern';

export interface Verdict {
  kind: VerdictKind;
  /** Maps to the success / warning / danger colour ramp. */
  tone: VerdictTone;
  /** Headline shown on the results card, e.g. "Good choice". */
  title: string;
  /** One supporting line under the headline. */
  subtitle: string;
}

/** A single transparent line in the score breakdown. */
export interface ScoreLine {
  ingredient: Ingredient;
  /** Negative number of points removed by this ingredient. */
  points: number;
  /** Why those points were removed, in plain language. */
  reason: string;
}

/** Plain-language level for a single nutrition signal, drives colour + copy. */
export type NutritionLevel = 'good' | 'moderate' | 'high';

/**
 * One at-a-glance nutrition fact (processing / sugar / salt / sat-fat / the good
 * stuff). Kept separate from the additive `breakdown` so the UI can lead with
 * the few things a shopper decides on, plain-language, no jargon.
 */
export interface NutritionMetric {
  key: 'processing' | 'sugar' | 'salt' | 'satfat' | 'fiber' | 'protein';
  /** Headline word, e.g. "Ultra-processed", "Too much sugar", "Good fibre". */
  label: string;
  level: NutritionLevel;
  /** Supporting detail, e.g. "24g sugar per 100g". */
  detail?: string;
  /** Score contribution (negative = penalty, positive = credit, 0 = info only). */
  points: number;
  /** True for the "what's good inside" positives (fibre / protein). */
  positive?: boolean;
}

export interface ScoreResult {
  /** Final clamped score, 0..100. */
  score: number;
  /** Always 100 — surfaced so the UI can show "100 − …". */
  baseScore: number;
  verdict: Verdict;
  /** Per-ingredient deductions, ordered worst-first. */
  breakdown: ScoreLine[];
  /** Processing + nutrition signals (present when the product carries the data). */
  nutrition: NutritionMetric[];
  /** Nutri-Score grade A–E for the nutrition, when nutrition facts are present. */
  nutriGrade?: NutriGrade;
  /** How many label phrases resolved to a known ingredient. */
  matchedCount: number;
  /** How many of those carry a deduction. */
  concernCount: number;
}
