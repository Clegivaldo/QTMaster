import { AxiosResponse } from 'axios';
import { apiService } from './api';
import { ApiResponse } from '@/types/auth';
import { 
  Validation, 
  ValidationFormData, 
  ValidationsResponse, 
  ValidationFilters,
  SensorDataPoint,
  ChartData
} from '@/types/validation';

class ValidationService {
  async getValidations(filters?: ValidationFilters): Promise<AxiosResponse<ApiResponse<ValidationsResponse>>> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.isApproved !== undefined) params.append('isApproved', filters.isApproved.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return apiService['api'].get(`/validations?${params.toString()}`);
  }

  async getValidation(id: string): Promise<AxiosResponse<ApiResponse<{ validation: Validation }>>> {
    return apiService['api'].get(`/validations/${id}`);
  }

  async getSensorDataForValidation(
    suitcaseId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<AxiosResponse<ApiResponse<{ sensorData: SensorDataPoint[] }>>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiService['api'].get(`/validations/suitcase/${suitcaseId}/sensor-data?${params.toString()}`);
  }

  async getChartData(validationId: string): Promise<AxiosResponse<ApiResponse<ChartData>>> {
    return apiService['api'].get(`/validations/${validationId}/chart-data`);
  }

  async createValidation(data: ValidationFormData): Promise<AxiosResponse<ApiResponse<{ validation: Validation }>>> {
    return apiService['api'].post('/validations', data);
  }

  async updateApproval(id: string, isApproved: boolean): Promise<AxiosResponse<ApiResponse<{ validation: Validation }>>> {
    return apiService['api'].put(`/validations/${id}/approval`, { isApproved });
  }

  async deleteValidation(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService['api'].delete(`/validations/${id}`);
  }
}

export const validationService = new ValidationService();