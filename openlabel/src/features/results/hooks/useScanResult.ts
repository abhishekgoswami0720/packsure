/**
 * Reconstruct a full, scored analysis from a stored scan.
 *
 * History stores only the resolved ingredient ids, so here we re-fetch those
 * ingredients and recompute the score deterministically — the scoring rules
 * stay the single source of truth and old scans reflect the current rules.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query';
import {
  ingredientRepository,
  scanRepository,
  offRepository,
  bundledProductRepository,
} from '@/data';
import { Ingredient } from '@/domain/ingredients/types';
import { computeScore } from '@/domain/scoring/scoring';
import { ScoreResult } from '@/domain/scoring/types';
import { ScanRecord } from '@/domain/scans';

export interface ScanResultView {
  scan: ScanRecord;
  ingredients: Ingredient[];
  result: ScoreResult;
  /** True when this product's data came from Open Food Facts (drives ODbL credit). */
  fromOpenFoodFacts: boolean;
}

export function useScanResult(scanId: string | undefined) {
  return useQuery<ScanResultView | null>({
    queryKey: scanId ? queryKeys.scan(scanId) : ['scans', 'none'],
    enabled: Boolean(scanId),
    queryFn: async () => {
      if (!scanId) return null;
      const scan = await scanRepository.getById(scanId);
      if (!scan) return null;

      // OFF data reaches us two ways — a live lookup cached in off_cache, or the
      // bundled OFF-India set. Both are Open Food Facts, so either earns the credit.
      const [fetched, inCache, inBundled] = await Promise.all([
        Promise.all(scan.ingredientIds.map((id) => ingredientRepository.getById(id))),
        offRepository.has(scan.barcode),
        bundledProductRepository.has(scan.barcode),
      ]);
      const ingredients = fetched.filter((i): i is Ingredient => i !== null);

      return {
        scan,
        ingredients,
        result: computeScore(ingredients, scan.nutrition ?? undefined, scan.isBeverage),
        fromOpenFoodFacts: inCache || inBundled,
      };
    },
  });
}
