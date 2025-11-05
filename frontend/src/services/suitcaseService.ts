import { AxiosResponse } from 'axios';
import { apiService } from './api';
import { ApiResponse } from '@/types/auth';
import { 
  Suitcase, 
  SuitcaseFormData, 
  SuitcasesResponse, 
  SuitcaseFilters 
} from '@/types/suitcase';

class SuitcaseService {
  async getSuitcases(filters?: SuitcaseFilters): Promise<AxiosResponse<ApiResponse<SuitcasesResponse>>> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return apiService['api'].get(`/suitcases?${params.toString()}`);
  }

  async getSuitcase(id: string): Promise<AxiosResponse<ApiResponse<{ suitcase: Suitcase }>>> {
    return apiService['api'].get(`/suitcases/${id}`);
  }

  async createSuitcase(data: SuitcaseFormData): Promise<AxiosResponse<ApiResponse<{ suitcase: Suitcase }>>> {
    return apiService['api'].post('/suitcases', data);
  }

  async updateSuitcase(id: string, data: Partial<SuitcaseFormData>): Promise<AxiosResponse<ApiResponse<{ suitcase: Suitcase }>>> {
    return apiService['api'].put(`/suitcases/${id}`, data);
  }

  async deleteSuitcase(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService['api'].delete(`/suitcases/${id}`);
  }
}

export const suitcaseService = new SuitcaseService();