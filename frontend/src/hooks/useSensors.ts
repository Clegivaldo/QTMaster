import { useQuery, useMutation, useQueryClient } from 'react-query';
import { sensorService } from '@/services/sensorService';
import { SensorTypeFormData, SensorFormData, SensorFilters } from '@/types/sensor';

function resolveIdAndData(arg: any) {
  if (!arg || !('id' in arg)) throw new Error('Invalid update payload: missing id');
  const { id, data, ...rest } = arg;
  return { id, data: data ?? rest };
}

// Query keys
export const sensorKeys = {
  all: ['sensors'] as const,
  types: () => [...sensorKeys.all, 'types'] as const,
  type: (id: string) => [...sensorKeys.types(), id] as const,
  lists: () => [...sensorKeys.all, 'list'] as const,
  list: (filters?: SensorFilters) => [...sensorKeys.lists(), filters] as const,
  details: () => [...sensorKeys.all, 'detail'] as const,
  detail: (id: string) => [...sensorKeys.details(), id] as const,
};

// Sensor Types
export const useSensorTypes = () => {
  return useQuery({
    queryKey: sensorKeys.types(),
    queryFn: async () => {
      const response = await sensorService.getSensorTypes();
      return response.data.data?.sensorTypes || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSensorType = (id: string) => {
  return useQuery({
    queryKey: sensorKeys.type(id),
    queryFn: async () => {
      const response = await sensorService.getSensorType(id);
      return response.data.data?.sensorType;
    },
    enabled: !!id,
  });
};

export const useCreateSensorType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SensorTypeFormData) => sensorService.createSensorType(data),
    onSuccess: () => {
      queryClient.invalidateQueries(sensorKeys.types());
    },
  });
};

export const useUpdateSensorType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => {
      const { id, data } = resolveIdAndData(payload);
      return sensorService.updateSensorType(id, data as Partial<SensorTypeFormData>);
    },
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        sensorKeys.type(variables.id),
        response.data.data?.sensorType
      );
      queryClient.invalidateQueries(sensorKeys.types());
    },
  });
};

export const useDeleteSensorType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sensorService.deleteSensorType(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries(sensorKeys.type(deletedId));
      queryClient.invalidateQueries(sensorKeys.types());
    },
  });
};

// Sensors
export const useSensors = (filters?: SensorFilters) => {
  return useQuery({
    queryKey: sensorKeys.list(filters),
    queryFn: async () => {
      const response = await sensorService.getSensors(filters);
      return response.data.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSensor = (id: string) => {
  return useQuery({
    queryKey: sensorKeys.detail(id),
    queryFn: async () => {
      const response = await sensorService.getSensor(id);
      return response.data.data?.sensor;
    },
    enabled: !!id,
  });
};

export const useCreateSensor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SensorFormData) => sensorService.createSensor(data),
    onSuccess: () => {
      queryClient.invalidateQueries(sensorKeys.lists());
    },
  });
};

export const useUpdateSensor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => {
      const { id, data } = resolveIdAndData(payload);
      return sensorService.updateSensor(id, data as Partial<SensorFormData>);
    },
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        sensorKeys.detail(variables.id),
        response.data.data?.sensor
      );
      queryClient.invalidateQueries(sensorKeys.lists());
    },
  });
};

export const useDeleteSensor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sensorService.deleteSensor(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries(sensorKeys.detail(deletedId));
      queryClient.invalidateQueries(sensorKeys.lists());
    },
  });
};