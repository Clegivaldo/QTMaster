import { useQuery, useMutation, useQueryClient } from 'react-query';
import { validationService } from '@/services/validationService';
import { ValidationFormData, ValidationFilters } from '@/types/validation';

// Query keys
export const validationKeys = {
  all: ['validations'] as const,
  lists: () => [...validationKeys.all, 'list'] as const,
  list: (filters?: ValidationFilters) => [...validationKeys.lists(), filters] as const,
  details: () => [...validationKeys.all, 'detail'] as const,
  detail: (id: string) => [...validationKeys.details(), id] as const,
  chartData: (id: string) => [...validationKeys.detail(id), 'chart-data'] as const,
  sensorData: (suitcaseId: string, startDate?: string, endDate?: string) => 
    ['sensor-data', suitcaseId, startDate, endDate] as const,
};

// Get validations list
export const useValidations = (filters?: ValidationFilters) => {
  return useQuery({
    queryKey: validationKeys.list(filters),
    queryFn: async () => {
      const response = await validationService.getValidations(filters);
      return response.data.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single validation
export const useValidation = (id: string) => {
  return useQuery({
    queryKey: validationKeys.detail(id),
    queryFn: async () => {
      const response = await validationService.getValidation(id);
      return response.data.data?.validation;
    },
    enabled: !!id,
  });
};

// Get sensor data for validation
export const useSensorDataForValidation = (
  suitcaseId: string, 
  startDate?: string, 
  endDate?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: validationKeys.sensorData(suitcaseId, startDate, endDate),
    queryFn: async () => {
      const response = await validationService.getSensorDataForValidation(suitcaseId, startDate, endDate);
      return response.data.data?.sensorData || [];
    },
    enabled: enabled && !!suitcaseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get chart data for validation
export const useValidationChartData = (validationId: string) => {
  return useQuery({
    queryKey: validationKeys.chartData(validationId),
    queryFn: async () => {
      const response = await validationService.getChartData(validationId);
      return response.data.data;
    },
    enabled: !!validationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Create validation mutation
export const useCreateValidation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ValidationFormData) => validationService.createValidation(data),
    onSuccess: () => {
      // Invalidate and refetch validations list
      queryClient.invalidateQueries(validationKeys.lists());
    },
  });
};

// Update validation approval mutation
export const useUpdateValidationApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      validationService.updateApproval(id, isApproved),
    onSuccess: (response, variables) => {
      // Update the validation in cache
      queryClient.setQueryData(
        validationKeys.detail(variables.id),
        response.data.data?.validation
      );
      // Invalidate lists to refresh
      queryClient.invalidateQueries(validationKeys.lists());
    },
  });
};

// Delete validation mutation
export const useDeleteValidation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => validationService.deleteValidation(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries(validationKeys.detail(deletedId));
      queryClient.removeQueries(validationKeys.chartData(deletedId));
      // Invalidate lists to refresh
      queryClient.invalidateQueries(validationKeys.lists());
    },
  });
};