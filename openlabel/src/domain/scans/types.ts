/**
 * Scan domain model — what we persist for every analysis the user runs.
 *
 * We store a denormalised snapshot (resolved ingredient ids + the phrases that
 * didn't resolve) rather than the full computed result. The score is then
 * re-derived deterministically from those ids, so the scoring rules stay the
 * single source of truth and history survives a rules update.
 */
import { VerdictKind } from '@/domain/scoring/types';
import { ProductNutrition } from '@/domain/products/types';

/** Where the ingredients came from. */
export type ScanSource = 'barcode' | 'label' | 'image';

export const scanSourceLabel: Record<ScanSource, string> = {
  barcode: 'Barcode',
  label: 'Ingredients',
  image: 'Photo',
};

/** What the scanner hands to the analyser before anything is resolved. */
export interface ScanInput {
  source: ScanSource;
  /** Present for barcode scans. */
  barcode?: string;
  /** Raw label text for label / image scans. */
  rawText?: string;
  /** Product name when known (barcode lookup or user-entered). */
  productName?: string;
}

/** A persisted scan row. */
export interface ScanRecord {
  id: string;
  createdAt: number;
  source: ScanSource;
  productName: string | null;
  barcode: string | null;
  rawText: string | null;
  score: number;
  verdictKind: VerdictKind;
  matchedCount: number;
  concernCount: number;
  /** Resolved ingredient ids, in label order. */
  ingredientIds: string[];
  /** Label phrases that did not resolve to a known ingredient. */
  unresolved: string[];
  /** Product processing + nutrition snapshot (barcode products); null otherwise. */
  nutrition: ProductNutrition | null;
  /** True when the product is a drink — scored on the stricter Nutri-Score beverage table. */
  isBeverage: boolean;
}
