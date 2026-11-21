/**
 * The analyse-and-persist use-case behind every capture.
 *
 *   barcode  -> look up the product, analyse its ingredient list
 *   label    -> analyse the typed / pasted / OCR'd label text
 *   image    -> same as label, from text extracted off a photo
 *
 * On success it writes a {@link ScanRecord} to history and returns its id so the
 * caller can route to the results screen. Unknown barcodes resolve to a
 * dedicated outcome so the UI can nudge the user to scan the label instead.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query';
import { scanRepository, lookupProductByBarcode } from '@/data';
import { analyzeRawText } from '@/domain/analysis';
import { ProductNutrition, referenceAmountFor } from '@/domain/products';
import { isBeverageProduct } from '@/domain/products/beverage';
import { ScanInput, ScanRecord } from '@/domain/scans';
import { createId } from '@/shared/utils/id';
import { useIngredientIndex } from './useIngredientIndex';

export type AnalyzeOutcome =
  | { kind: 'analyzed'; scanId: string }
  | { kind: 'unknown_barcode'; barcode: string }
  | { kind: 'offline'; barcode: string }
  | { kind: 'no_ingredients'; barcode: string; productName: string | null }
  | { kind: 'empty' };

export function useAnalyzeScan() {
  const queryClient = useQueryClient();
  const { data: index, isLoading: indexLoading } = useIngredientIndex();

  const mutation = useMutation<AnalyzeOutcome, Error, ScanInput>({
    mutationFn: async (input) => {
      if (!index) throw new Error('Ingredient database is still loading.');

      let rawText = input.rawText ?? '';
      let productName = input.productName ?? null;
      const barcode = input.barcode ?? null;
      let nutrition: ProductNutrition | null = null;
      let isBeverage = false;

      if (input.source === 'barcode') {
        if (!input.barcode) return { kind: 'empty' };
        const lookup = await lookupProductByBarcode(input.barcode);
        if (lookup.status === 'offline') {
          return { kind: 'offline', barcode: input.barcode };
        }
        if (lookup.status === 'not_found') {
          return { kind: 'unknown_barcode', barcode: input.barcode };
        }
        productName = lookup.product.name;
        // Tag the nutrition with a realistic serving size (from the product's
        // category) so a condiment/spice is scored per spoonful, not per 100g.
        nutrition = lookup.product.nutrition
          ? { ...lookup.product.nutrition, referenceGrams: referenceAmountFor(lookup.product.category) }
          : null;
        isBeverage = isBeverageProduct(lookup.product);
        rawText = lookup.product.ingredients.join(', ');
        // With nutrition data we can still analyse processing/sugar even if the
        // ingredient list is missing; only bail when there's nothing at all.
        if (!rawText.trim() && !nutrition) {
          return { kind: 'no_ingredients', barcode: input.barcode, productName };
        }
      }

      if (!rawText.trim() && !nutrition) return { kind: 'empty' };

      const analysis = analyzeRawText(rawText, index, nutrition ?? undefined, isBeverage);

      const record: ScanRecord = {
        id: createId('scan'),
        createdAt: Date.now(),
        source: input.source,
        productName,
        barcode,
        rawText,
        score: analysis.result.score,
        verdictKind: analysis.result.verdict.kind,
        matchedCount: analysis.result.matchedCount,
        concernCount: analysis.result.concernCount,
        ingredientIds: analysis.resolved.map((i) => i.id),
        unresolved: analysis.unresolved,
        nutrition,
        isBeverage,
      };

      await scanRepository.insert(record);
      return { kind: 'analyzed', scanId: record.id };
    },
    onSuccess: (outcome) => {
      if (outcome.kind === 'analyzed') {
        queryClient.invalidateQueries({ queryKey: queryKeys.scans });
      }
    },
  });

  return { ...mutation, indexLoading };
}
