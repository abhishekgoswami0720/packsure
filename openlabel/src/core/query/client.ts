import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Everything here is backed by local SQLite, so data
 * never goes stale on its own — we disable refetch-on-focus and keep results
 * fresh until a mutation explicitly invalidates them.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

/** Centralised query keys so invalidation stays consistent. */
export const queryKeys = {
  ingredients: ['ingredients'] as const,
  ingredientIndex: ['ingredients', 'index'] as const,
  ingredient: (id: string) => ['ingredients', id] as const,
  scans: ['scans'] as const,
  scan: (id: string) => ['scans', id] as const,
};
