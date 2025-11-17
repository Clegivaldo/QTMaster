import { useQuery, useMutation, useQueryClient } from 'react-query';
import { equipmentService } from '@/services/equipmentService';
import { 
  BrandFormData, 
  EquipmentModelFormData, 
  EquipmentTypeFormData, 
  ClientEquipmentFormData 
} from '@/types/equipment';

function resolveIdAndData(arg: any) {
  if (!arg || !('id' in arg)) throw new Error('Invalid update payload: missing id');
  const { id, data, ...rest } = arg;
  return { id, data: data ?? rest };
}

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
};

// Brand hooks
export const useBrands = () => {
  return useQuery({
    queryKey: equipmentKeys.brands(),
    queryFn: async () => {
      return equipmentService.getBrands();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useBrand = (id: string) => {
  return useQuery({
    queryKey: equipmentKeys.brand(id),
    queryFn: async () => {
      const brands = await equipmentService.getBrands();
      return brands.find((brand) => brand.id === id);
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

  function resolveIdAndData(arg: any) {
    if (!arg || !('id' in arg)) throw new Error('Invalid update payload: missing id');
    const { id, data, ...rest } = arg;
    return { id, data: data ?? rest };
  }

  return useMutation({
    mutationFn: (payload: any) => {
      const { id, data } = resolveIdAndData(payload);
      return equipmentService.updateBrand(id, data as BrandFormData);
    },
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
      return equipmentService.getModels();
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useEquipmentModel = (id: string) => {
  return useQuery({
    queryKey: equipmentKeys.model(id),
    queryFn: async () => {
      const models = await equipmentService.getModels();
      return models.find((model) => model.id === id);
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
    mutationFn: (payload: any) => {
      const { id, data } = resolveIdAndData(payload);
      return equipmentService.updateModel(id, data as EquipmentModelFormData);
    },
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
      return equipmentService.getEquipmentTypes();
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useEquipmentType = (id: string) => {
  return useQuery({
    queryKey: equipmentKeys.type(id),
    queryFn: async () => {
      const types = await equipmentService.getEquipmentTypes();
      return types.find((type) => type.id === id);
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
    mutationFn: (payload: any) => {
      const { id, data } = resolveIdAndData(payload);
      return equipmentService.updateEquipmentType(id, data as EquipmentTypeFormData);
    },
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
      return equipmentService.getClientEquipments(clientId);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useClientEquipment = (id: string) => {
  return useQuery({
    queryKey: equipmentKeys.clientEquipment(id),
    queryFn: async () => {
      return equipmentService.getClientEquipment(id);
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
    mutationFn: (payload: any) => {
      const { id, data } = resolveIdAndData(payload);
      return equipmentService.updateClientEquipment(id, data as ClientEquipmentFormData);
    },
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
// Additional validation helpers can be implemented when the relevant APIs are exposed.