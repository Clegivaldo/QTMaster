import { AxiosResponse } from 'axios';
import { apiService } from './api';
import { ApiResponse } from '@/types/auth';
import { Client, ClientFormData, ClientsResponse, ClientFilters } from '@/types/client';

class ClientService {
  async getClients(filters?: ClientFilters): Promise<AxiosResponse<ApiResponse<ClientsResponse>>> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return apiService['api'].get(`/clients?${params.toString()}`);
  }

  async getClient(id: string): Promise<AxiosResponse<ApiResponse<{ client: Client }>>> {
    return apiService['api'].get(`/clients/${id}`);
  }

  async createClient(data: ClientFormData): Promise<AxiosResponse<ApiResponse<{ client: Client }>>> {
    return apiService['api'].post('/clients', data);
  }

  async updateClient(id: string, data: Partial<ClientFormData>): Promise<AxiosResponse<ApiResponse<{ client: Client }>>> {
    return apiService['api'].put(`/clients/${id}`, data);
  }

  async deleteClient(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService['api'].delete(`/clients/${id}`);
  }
}

export const clientService = new ClientService();