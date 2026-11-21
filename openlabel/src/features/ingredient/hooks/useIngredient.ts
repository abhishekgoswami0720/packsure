import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query';
import { ingredientRepository } from '@/data';
import { Ingredient } from '@/domain/ingredients/types';

export function useIngredient(id: string | undefined) {
  return useQuery<Ingredient | null>({
    queryKey: id ? queryKeys.ingredient(id) : ['ingredients', 'none'],
    enabled: Boolean(id),
    queryFn: async () => (id ? ingredientRepository.getById(id) : null),
  });
}
