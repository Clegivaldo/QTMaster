import { describe, it, expect, vi, beforeEach } from 'vitest';
import { equipmentService } from '../equipmentService';
import { apiService } from '../api';

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

describe('equipmentService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiService.api = mockApi as any;
  });

  it('fetches brands from the metadata endpoint', async () => {
    const mockBrands = [{ id: '1', name: 'Test Brand' }];
    mockApi.get.mockResolvedValue({ data: { data: { brands: mockBrands } } });

    const result = await equipmentService.getBrands();

    expect(mockApi.get).toHaveBeenCalledWith('/metadata/brands');
    expect(result).toEqual(mockBrands);
  });

  it('creates a brand via POST', async () => {
    const payload = { name: 'New Brand', description: 'Description' };
    const mockBrand = { id: '2', ...payload };
    mockApi.post.mockResolvedValue({ data: { data: { brand: mockBrand } } });

    const result = await equipmentService.createBrand(payload);

    expect(mockApi.post).toHaveBeenCalledWith('/metadata/brands', payload);
    expect(result).toEqual(mockBrand);
  });

  it('deletes an equipment type', async () => {
    await equipmentService.deleteEquipmentType('type-1');

    expect(mockApi.delete).toHaveBeenCalledWith('/metadata/types/type-1');
  });

  it('fetches models with filtering query params', async () => {
    const mockModels = [{ id: 'mdl-1', name: 'Model X', brandId: 'b1', typeId: 't1' }];
    mockApi.get.mockResolvedValue({ data: { data: { models: mockModels } } });

    const result = await equipmentService.getModels({ brandId: 'b1', typeId: 't1' });

    expect(mockApi.get).toHaveBeenCalledWith('/metadata/models?brandId=b1&typeId=t1');
    expect(result).toEqual(mockModels);
  });

  it('removes a client equipment entry', async () => {
    await equipmentService.deleteClientEquipment('equip-123');

    expect(mockApi.delete).toHaveBeenCalledWith('/metadata/equipment/equip-123');
  });
});
