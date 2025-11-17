import { useQuery, useMutation, useQueryClient } from 'react-query';
import { clientService } from '@/services/clientService';
import { ClientFormData, ClientFilters } from '@/types/client';

function resolveIdAndData(arg: any) {
  if (!arg || !('id' in arg)) throw new Error('Invalid update payload: missing id');
  const { id, data, ...rest } = arg;
  return { id, data: data ?? rest };
}

// Query keys
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (filters?: ClientFilters) => [...clientKeys.lists(), filters] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
};

// Get clients list
export const useClients = (filters?: ClientFilters) => {
  return useQuery({
    queryKey: clientKeys.list(filters),
    queryFn: async () => {
      const response = await clientService.getClients(filters);
      return response.data.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single client
export const useClient = (id: string) => {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async () => {
      const response = await clientService.getClient(id);
      return response.data.data?.client;
    },
    enabled: !!id,
  });
};

// Create client mutation
export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClientFormData) => clientService.createClient(data),
    onSuccess: () => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries(clientKeys.lists());
    },
  });
};

// Update client mutation
export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => {
      const { id, data } = resolveIdAndData(payload);
      return clientService.updateClient(id, data as Partial<ClientFormData>);
    },
    onSuccess: (response, variables) => {
      // Update the client in cache
      queryClient.setQueryData(
        clientKeys.detail(variables.id),
        response.data.data?.client
      );
      // Invalidate lists to refresh
      queryClient.invalidateQueries(clientKeys.lists());
    },
  });
};

// Delete client mutation
export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientService.deleteClient(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries(clientKeys.detail(deletedId));
      // Invalidate lists to refresh
      queryClient.invalidateQueries(clientKeys.lists());
    },
  });
};