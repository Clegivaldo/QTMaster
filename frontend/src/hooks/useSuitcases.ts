import { useQuery, useMutation, useQueryClient } from 'react-query';
import { suitcaseService } from '@/services/suitcaseService';
import { SuitcaseFormData, SuitcaseFilters } from '@/types/suitcase';

function resolveIdAndData(arg: any) {
  if (!arg || !('id' in arg)) throw new Error('Invalid update payload: missing id');
  const { id, data, ...rest } = arg;
  return { id, data: data ?? rest };
}

// Query keys
export const suitcaseKeys = {
  all: ['suitcases'] as const,
  lists: () => [...suitcaseKeys.all, 'list'] as const,
  list: (filters?: SuitcaseFilters) => [...suitcaseKeys.lists(), filters] as const,
  details: () => [...suitcaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...suitcaseKeys.details(), id] as const,
};

// Get suitcases list
export const useSuitcases = (filters?: SuitcaseFilters) => {
  return useQuery({
    queryKey: suitcaseKeys.list(filters),
    queryFn: async () => {
      const response = await suitcaseService.getSuitcases(filters);
      return response.data.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single suitcase
export const useSuitcase = (id: string) => {
  return useQuery({
    queryKey: suitcaseKeys.detail(id),
    queryFn: async () => {
      const response = await suitcaseService.getSuitcase(id);
      return response.data.data?.suitcase;
    },
    enabled: !!id,
  });
};

// Create suitcase mutation
export const useCreateSuitcase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SuitcaseFormData) => suitcaseService.createSuitcase(data),
    onSuccess: () => {
      // Invalidate and refetch suitcases list
      queryClient.invalidateQueries(suitcaseKeys.lists());
    },
  });
};

// Update suitcase mutation
export const useUpdateSuitcase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => {
      const { id, data } = resolveIdAndData(payload);
      return suitcaseService.updateSuitcase(id, data as Partial<SuitcaseFormData>);
    },
    onSuccess: (response, variables) => {
      // Update the suitcase in cache
      queryClient.setQueryData(
        suitcaseKeys.detail(variables.id),
        response.data.data?.suitcase
      );
      // Invalidate lists to refresh
      queryClient.invalidateQueries(suitcaseKeys.lists());
    },
  });
};

// Delete suitcase mutation
export const useDeleteSuitcase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => suitcaseService.deleteSuitcase(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries(suitcaseKeys.detail(deletedId));
      // Invalidate lists to refresh
      queryClient.invalidateQueries(suitcaseKeys.lists());
    },
  });
};