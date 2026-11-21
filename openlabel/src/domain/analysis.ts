/**
 * The analysis use-case: the one place that wires the matching engine to the
 * scoring engine. Presentation code calls this and never touches the two
 * engines directly.
 */
import { splitIngredientList } from './ingredients/parse';
import {
  IngredientIndex,
  matchTokens,
  resolvedIngredients,
  TokenMatch,
} from './ingredients/matching';
import { Ingredient } from './ingredients/types';
import { ProductNutrition } from './products/types';
import { computeScore } from './scoring/scoring';
import { ScoreResult } from './scoring/types';

export interface Analysis {
  result: ScoreResult;
  /** Every label phrase with its match outcome (drives the "we read…" list). */
  matches: TokenMatch[];
  /** Distinct resolved ingredients. */
  resolved: Ingredient[];
  /** Label phrases we couldn't identify. */
  unresolved: string[];
}

/** Analyse an already-tokenised ingredient list (e.g. a product's fields). */
export function analyzeTokens(
  rawTokens: string[],
  index: IngredientIndex,
  nutrition?: ProductNutrition,
  isBeverage = false,
): Analysis {
  const matches = matchTokens(rawTokens, index);
  const resolved = resolvedIngredients(matches);
  const unresolved = matches.filter((m) => !m.ingredient).map((m) => m.raw);
  return { result: computeScore(resolved, nutrition, isBeverage), matches, resolved, unresolved };
}

/** Analyse a raw label string (typed, pasted, or OCR'd). */
export function analyzeRawText(
  raw: string,
  index: IngredientIndex,
  nutrition?: ProductNutrition,
  isBeverage = false,
): Analysis {
  return analyzeTokens(splitIngredientList(raw), index, nutrition, isBeverage);
}
