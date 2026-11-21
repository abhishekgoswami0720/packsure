import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query';
import { scanRepository } from '@/data';
import { ScanRecord } from '@/domain/scans';

export function useHistory() {
  return useQuery<ScanRecord[]>({
    queryKey: queryKeys.scans,
    queryFn: () => scanRepository.list(),
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => scanRepository.clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.scans }),
  });
}

export function useDeleteScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scanRepository.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.scans }),
  });
}
