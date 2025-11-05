import { AxiosResponse } from 'axios';
import { apiService } from './api';
import { ApiResponse } from '@/types/auth';
import { 
  SensorType, 
  Sensor, 
  SensorTypeFormData, 
  SensorFormData, 
  SensorsResponse, 
  SensorFilters 
} from '@/types/sensor';

class SensorService {
  // Sensor Types
  async getSensorTypes(): Promise<AxiosResponse<ApiResponse<{ sensorTypes: SensorType[] }>>> {
    return apiService['api'].get('/sensor-types');
  }

  async getSensorType(id: string): Promise<AxiosResponse<ApiResponse<{ sensorType: SensorType }>>> {
    return apiService['api'].get(`/sensor-types/${id}`);
  }

  async createSensorType(data: SensorTypeFormData): Promise<AxiosResponse<ApiResponse<{ sensorType: SensorType }>>> {
    return apiService['api'].post('/sensor-types', data);
  }

  async updateSensorType(id: string, data: Partial<SensorTypeFormData>): Promise<AxiosResponse<ApiResponse<{ sensorType: SensorType }>>> {
    return apiService['api'].put(`/sensor-types/${id}`, data);
  }

  async deleteSensorType(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService['api'].delete(`/sensor-types/${id}`);
  }

  // Sensors
  async getSensors(filters?: SensorFilters): Promise<AxiosResponse<ApiResponse<SensorsResponse>>> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.typeId) params.append('typeId', filters.typeId);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return apiService['api'].get(`/sensors?${params.toString()}`);
  }

  async getSensor(id: string): Promise<AxiosResponse<ApiResponse<{ sensor: Sensor }>>> {
    return apiService['api'].get(`/sensors/${id}`);
  }

  async createSensor(data: SensorFormData): Promise<AxiosResponse<ApiResponse<{ sensor: Sensor }>>> {
    return apiService['api'].post('/sensors', data);
  }

  async updateSensor(id: string, data: Partial<SensorFormData>): Promise<AxiosResponse<ApiResponse<{ sensor: Sensor }>>> {
    return apiService['api'].put(`/sensors/${id}`, data);
  }

  async deleteSensor(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService['api'].delete(`/sensors/${id}`);
  }
}

export const sensorService = new SensorService();