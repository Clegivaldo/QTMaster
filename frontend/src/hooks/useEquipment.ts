import { useQuery, useMutation, useQueryClient } from 'react-query';
import { equipmentService } from '@/services/equipmentService';
import { 
  BrandFormData, 
  EquipmentModelFormData, 
  EquipmentTypeFormData, 
  ClientEquipmentFormData 
} from '@/types/equipment';

// Query keys
export const equipmentKeys = {
  all: ['equipment'] as const,
  brands: () => [...equipmentKeys.all, 'brands'] as const,
  brand: (id: string) => [...equipmentKeys.brands(), id] as const,
  models: () => [...equipmentKeys.all, 'models'] as const,
  model: (id: string) => [...equipmentKeys.models(), id] as const,
  types: () => [...equipmentKeys.all, 'types'] as const,
  type: (id: string) => [...equipmentKeys.types(), id] as const,
  clientEquipments: (clientId?: string) => [...equipmentKeys.all, 'client-equipments', clientId] as const,
  clientEquipment: (id: string) => [...equipmentKeys.clientEquipments(), id] as const,
  cycles: (validationId: string) => [...equipmentKeys.all, 'cycles', validationId] as const,
};

// Brand hooks
export const useBrands = () => {
  return useQuery({
    queryKey: equipmentKeys.brands(),
    queryFn: async () => {
      const response = await equipmentService.getBrands();
      return response.data?.brands || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useBrand = (id: string) => {
  return useQuery({
    queryKey: equipmentKeys.brand(id),
    queryFn: async () => {
      const response = await equipmentService.getBrand(id);
      return response.data?.brand;
    },
    enabled: !!id,
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BrandFormData) => equipmentService.createBrand(data),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.brands());
    },
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BrandFormData }) => 
      equipmentService.updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.brands());
    },
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipmentService.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.brands());
    },
  });
};

// Equipment Model hooks
export const useEquipmentModels = () => {
  return useQuery({
    queryKey: equipmentKeys.models(),
    queryFn: async () => {
      const response = await equipmentService.getModels();
      return response.data?.models || [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useEquipmentModel = (id: string) => {
  return useQuery({
    queryKey: equipmentKeys.model(id),
    queryFn: async () => {
      const response = await equipmentService.getModel(id);
      return response.data?.model;
    },
    enabled: !!id,
  });
};

export const useCreateEquipmentModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EquipmentModelFormData) => equipmentService.createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.models());
    },
  });
};

export const useUpdateEquipmentModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EquipmentModelFormData }) => 
      equipmentService.updateModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.models());
    },
  });
};

export const useDeleteEquipmentModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipmentService.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.models());
    },
  });
};

// Equipment Type hooks
export const useEquipmentTypes = () => {
  return useQuery({
    queryKey: equipmentKeys.types(),
    queryFn: async () => {
      const response = await equipmentService.getEquipmentTypes();
      return response.data?.equipmentTypes || [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useEquipmentType = (id: string) => {
  return useQuery({
    queryKey: equipmentKeys.type(id),
    queryFn: async () => {
      const response = await equipmentService.getEquipmentType(id);
      return response.data?.equipmentType;
    },
    enabled: !!id,
  });
};

export const useCreateEquipmentType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EquipmentTypeFormData) => equipmentService.createEquipmentType(data),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.types());
    },
  });
};

export const useUpdateEquipmentType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EquipmentTypeFormData }) => 
      equipmentService.updateEquipmentType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.types());
    },
  });
};

export const useDeleteEquipmentType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipmentService.deleteEquipmentType(id),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.types());
    },
  });
};

// Client Equipment hooks
export const useClientEquipments = (clientId?: string) => {
  return useQuery({
    queryKey: equipmentKeys.clientEquipments(clientId),
    queryFn: async () => {
      const response = await equipmentService.getClientEquipments(clientId);
      return response.data?.clientEquipments || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useClientEquipment = (id: string) => {
  return useQuery({
    queryKey: equipmentKeys.clientEquipment(id),
    queryFn: async () => {
      const response = await equipmentService.getClientEquipment(id);
      return response.data?.clientEquipment;
    },
    enabled: !!id,
  });
};

export const useCreateClientEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClientEquipmentFormData) => equipmentService.createClientEquipment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.clientEquipments());
    },
  });
};

export const useUpdateClientEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientEquipmentFormData }) => 
      equipmentService.updateClientEquipment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.clientEquipments());
    },
  });
};

export const useDeleteClientEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipmentService.deleteClientEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(equipmentKeys.clientEquipments());
    },
  });
};

// Validation import and calculation hooks
export const useImportValidationData = () => {
  return useMutation({
    mutationFn: ({ validationId, file }: { validationId: string; file: File }) => 
      equipmentService.importValidationData(validationId, file),
  });
};

export const useValidationCycles = (validationId: string) => {
  return useQuery({
    queryKey: equipmentKeys.cycles(validationId),
    queryFn: async () => {
      const response = await equipmentService.getValidationCycles(validationId);
      return response.data?.cycles || [];
    },
    enabled: !!validationId,
  });
};

export const useCalculateValidationStatistics = () => {
  return useMutation({
    mutationFn: (validationId: string) => equipmentService.calculateStatistics(validationId),
  });
};

export const useToggleDataPoint = () => {
  return useMutation({
    mutationFn: ({ validationId, dataPointId, selected }: { validationId: string; dataPointId: string; selected: boolean }) => 
      equipmentService.toggleDataPoint(validationId, dataPointId, selected),
  });
};