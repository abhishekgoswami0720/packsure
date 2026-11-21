/**
 * The ingredient intelligence domain model.
 *
 * This is the heart of OpenLabel: a transparent, offline knowledge base about
 * food additives. Everything here is plain data — no React, no SQLite — so the
 * matching and scoring engines stay pure and unit-testable.
 *
 * Entries come in two tiers:
 *   - **dossier**  — fully researched: purpose, evidence, per-region regulation,
 *                    references. The additives users care most about.
 *   - **registry** — identification only: number → canonical name + category, so
 *                    almost any additive on a label still resolves and scores
 *                    via its category, even before it has a full dossier.
 */

/** How concerned a user should be about a single ingredient. */
export type RiskLevel = 'low' | 'moderate' | 'high';

/**
 * Functional category of an additive. Categories drive the default score
 * penalty (see scoring engine) and the iconography used across the UI.
 */
export type IngredientCategory =
  | 'artificial_sweetener'
  | 'artificial_color'
  | 'colour_natural'
  | 'preservative'
  | 'flavour_enhancer'
  | 'emulsifier'
  | 'stabiliser'
  | 'acidity_regulator'
  | 'antioxidant'
  | 'anticaking_agent'
  | 'glazing_agent'
  | 'added_sugar'
  | 'refined_oil'
  | 'trans_fat'
  | 'raising_agent'
  | 'flour_treatment'
  | 'natural';

/** Major regulatory jurisdictions OpenLabel tracks. */
export type Region = 'INTL' | 'IN' | 'EU' | 'US' | 'AU';

/** A normalised regulatory posture, comparable across regions. */
export type RegulatoryStatus =
  | 'permitted'
  | 'permitted_with_limits'
  | 'restricted'
  | 'banned'
  | 'not_evaluated';

/** One region's stance on an additive. */
export interface RegionRegulation {
  region: Region;
  status: RegulatoryStatus;
  /** Short qualifier, e.g. "Warning label required", "Cured meats only". */
  note?: string;
}

export interface IngredientReference {
  label: string;
  url: string;
}

/**
 * A single entry in the local ingredient knowledge base.
 *
 * `id` is a stable slug ('aspartame', 'ins-407') used as the primary key in
 * SQLite and in deep links (`/ingredient/aspartame`).
 */
export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  riskLevel: RiskLevel;
  /** One calm sentence: what this does in food. Always present. */
  purpose: string;
  /** E-number digits without the leading "E" (e.g. "951"). */
  eNumber?: string;
  /** INS number digits (usually identical to the E-number). */
  insNumber?: string;
  /** Other names this ingredient hides behind on a label. */
  aliases: string[];
  /** Structured, per-region regulatory posture (dossier tier). */
  regulations?: RegionRegulation[];
  /** Plain-language regulatory summary (legacy / fallback display). */
  regulatoryStatus?: string;
  /** ISO-ish country labels where it is banned or restricted. */
  countriesRestricted?: string[];
  /** Two to three sentences summarising the evidence (dossier tier only). */
  scientificSummary?: string;
  references?: IngredientReference[];
  /**
   * Optional explicit score penalty (a negative number or its magnitude). When
   * omitted the scoring engine falls back to the category default.
   */
  scorePenalty?: number;
}

/** Whether an entry carries a full evidence dossier or is identification-only. */
export function hasDossier(ingredient: Ingredient): boolean {
  return Boolean(ingredient.scientificSummary);
}

/** Human-readable label for each category. */
export const categoryLabel: Record<IngredientCategory, string> = {
  artificial_sweetener: 'Artificial sweetener',
  artificial_color: 'Artificial colour',
  colour_natural: 'Natural colour',
  preservative: 'Preservative',
  flavour_enhancer: 'Flavour enhancer',
  emulsifier: 'Emulsifier',
  stabiliser: 'Stabiliser / thickener',
  acidity_regulator: 'Acidity regulator',
  antioxidant: 'Antioxidant',
  anticaking_agent: 'Anti-caking agent',
  glazing_agent: 'Glazing agent',
  added_sugar: 'Added sugar',
  refined_oil: 'Refined oil',
  trans_fat: 'Trans fat',
  raising_agent: 'Raising agent',
  flour_treatment: 'Flour treatment agent',
  natural: 'Natural ingredient',
};

export const riskLabel: Record<RiskLevel, string> = {
  low: 'Low concern',
  moderate: 'Moderate concern',
  high: 'High concern',
};

export const regionLabel: Record<Region, string> = {
  INTL: 'International (Codex)',
  IN: 'India (FSSAI)',
  EU: 'European Union',
  US: 'United States (FDA)',
  AU: 'Australia / NZ',
};

export const regulatoryStatusLabel: Record<RegulatoryStatus, string> = {
  permitted: 'Permitted',
  permitted_with_limits: 'Permitted with limits',
  restricted: 'Restricted',
  banned: 'Banned',
  not_evaluated: 'Not evaluated',
};
