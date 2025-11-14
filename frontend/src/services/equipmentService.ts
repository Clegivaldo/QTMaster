import { apiService } from './api';
import { ApiResponse } from '@/types/auth';
import {
  Brand,
  BrandFormData,
  EquipmentModel,
  EquipmentModelFormData,
  EquipmentType,
  EquipmentTypeFormData,
  ClientEquipment,
  ClientEquipmentFormData,
} from '@/types/equipment';

interface BrandResponse {
  brand: Brand;
}

interface BrandsResponse {
  brands: Brand[];
}

interface EquipmentTypeResponse {
  equipmentType: EquipmentType;
}

interface EquipmentTypesResponse {
  types: EquipmentType[];
}

interface ModelResponse {
  model: EquipmentModel;
}

interface ModelsResponse {
  models: EquipmentModel[];
}

interface ClientEquipmentResponse {
  equipment: ClientEquipment;
}

interface ClientEquipmentsResponse {
  equipment: ClientEquipment[];
}

class EquipmentService {
  async getBrands(): Promise<Brand[]> {
    const response = await apiService.api.get<ApiResponse<BrandsResponse>>('/metadata/brands');
    return response.data.data?.brands ?? [];
  }

  async createBrand(payload: BrandFormData): Promise<Brand> {
    const response = await apiService.api.post<ApiResponse<BrandResponse>>('/metadata/brands', payload);
    return response.data.data!.brand;
  }

  async updateBrand(id: string, payload: BrandFormData): Promise<Brand> {
    const response = await apiService.api.put<ApiResponse<BrandResponse>>(`/metadata/brands/${id}`, payload);
    return response.data.data!.brand;
  }

  async deleteBrand(id: string): Promise<void> {
    await apiService.api.delete(`/metadata/brands/${id}`);
  }

  async getEquipmentTypes(): Promise<EquipmentType[]> {
    const response = await apiService.api.get<ApiResponse<EquipmentTypesResponse>>('/metadata/types');
    return response.data.data?.types ?? [];
  }

  async createEquipmentType(payload: EquipmentTypeFormData): Promise<EquipmentType> {
    const response = await apiService.api.post<ApiResponse<EquipmentTypeResponse>>('/metadata/types', payload);
    return response.data.data!.equipmentType;
  }

  async updateEquipmentType(id: string, payload: EquipmentTypeFormData): Promise<EquipmentType> {
    const response = await apiService.api.put<ApiResponse<EquipmentTypeResponse>>(`/metadata/types/${id}`, payload);
    return response.data.data!.equipmentType;
  }

  async deleteEquipmentType(id: string): Promise<void> {
    await apiService.api.delete(`/metadata/types/${id}`);
  }

  async getModels(filter?: { brandId?: string; typeId?: string }): Promise<EquipmentModel[]> {
    const params = new URLSearchParams();
    if (filter?.brandId) params.append('brandId', filter.brandId);
    if (filter?.typeId) params.append('typeId', filter.typeId);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiService.api.get<ApiResponse<ModelsResponse>>(`/metadata/models${query}`);
    return response.data.data?.models ?? [];
  }

  async createModel(payload: EquipmentModelFormData): Promise<EquipmentModel> {
    const response = await apiService.api.post<ApiResponse<ModelResponse>>('/metadata/models', payload);
    return response.data.data!.model;
  }

  async updateModel(id: string, payload: Partial<EquipmentModelFormData>): Promise<EquipmentModel> {
    const response = await apiService.api.put<ApiResponse<ModelResponse>>(`/metadata/models/${id}`, payload);
    return response.data.data!.model;
  }

  async deleteModel(id: string): Promise<void> {
    await apiService.api.delete(`/metadata/models/${id}`);
  }

  async getClientEquipments(clientId?: string): Promise<ClientEquipment[]> {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiService.api.get<ApiResponse<ClientEquipmentsResponse>>(`/metadata/equipment${query}`);
    return response.data.data?.equipment ?? [];
  }

  async getClientEquipment(id: string): Promise<ClientEquipment> {
    const response = await apiService.api.get<ApiResponse<ClientEquipmentResponse>>(`/metadata/equipment/${id}`);
    return response.data.data!.equipment;
  }

  async createClientEquipment(payload: ClientEquipmentFormData): Promise<ClientEquipment> {
    const response = await apiService.api.post<ApiResponse<ClientEquipmentResponse>>('/metadata/equipment', payload);
    return response.data.data!.equipment;
  }

  async updateClientEquipment(id: string, payload: Partial<ClientEquipmentFormData>): Promise<ClientEquipment> {
    const response = await apiService.api.put<ApiResponse<ClientEquipmentResponse>>(`/metadata/equipment/${id}`, payload);
    return response.data.data!.equipment;
  }

  async deleteClientEquipment(id: string): Promise<void> {
    await apiService.api.delete(`/metadata/equipment/${id}`);
  }
}

export const equipmentService = new EquipmentService();