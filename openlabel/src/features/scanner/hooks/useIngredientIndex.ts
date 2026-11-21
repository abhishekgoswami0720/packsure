import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query';
import { ingredientRepository } from '@/data';
import { buildIngredientIndex, IngredientIndex } from '@/domain/ingredients/matching';

/**
 * Loads the ingredient knowledge base from SQLite and builds the matching index
 * once, caching it for the whole session. Every analysis reuses this.
 */
export function useIngredientIndex() {
  return useQuery<IngredientIndex>({
    queryKey: queryKeys.ingredientIndex,
    queryFn: async () => {
      const ingredients = await ingredientRepository.getAll();
      return buildIngredientIndex(ingredients);
    },
  });
}
