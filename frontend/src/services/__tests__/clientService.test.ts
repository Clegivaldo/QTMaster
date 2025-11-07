import { vi, describe, it, expect, beforeEach } from 'vitest';
import { clientService } from '../clientService';
import { apiService } from '../api';
import { ClientFormData, ClientFilters } from '@/types/client';

// Mock the API service
vi.mock('../api', () => ({
  apiService: {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('ClientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClients', () => {
    it('should fetch clients without filters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            clients: [
              {
                id: '1',
                name: 'Test Client',
                email: 'test@example.com',
                phone: '(11) 99999-9999',
                address: 'Test Address',
                cnpj: '12.345.678/0001-90',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        },
      };

      (apiService.api.get as any).mockResolvedValue(mockResponse);

      const result = await clientService.getClients();

      expect(apiService.api.get).toHaveBeenCalledWith('/clients?');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch clients with filters', async () => {
      const filters: ClientFilters = {
        search: 'test',
        sortBy: 'name',
        sortOrder: 'desc',
        page: 2,
        limit: 20,
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            clients: [],
            pagination: {
              page: 2,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: true,
            },
          },
        },
      };

      (apiService.api.get as any).mockResolvedValue(mockResponse);

      const result = await clientService.getClients(filters);

      expect(apiService.api.get).toHaveBeenCalledWith(
        '/clients?search=test&sortBy=name&sortOrder=desc&page=2&limit=20'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle partial filters', async () => {
      const filters: ClientFilters = {
        search: 'partial',
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            clients: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          },
        },
      };

      (apiService.api.get as any).mockResolvedValue(mockResponse);

      const result = await clientService.getClients(filters);

      expect(apiService.api.get).toHaveBeenCalledWith('/clients?search=partial');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getClient', () => {
    it('should fetch a single client by id', async () => {
      const clientId = '1';
      const mockResponse = {
        data: {
          success: true,
          data: {
            client: {
              id: '1',
              name: 'Test Client',
              email: 'test@example.com',
              phone: '(11) 99999-9999',
              address: 'Test Address',
              cnpj: '12.345.678/0001-90',
              createdAt: new Date(),
              updatedAt: new Date(),
              reports: [],
              validations: [],
            },
          },
        },
      };

      (apiService.api.get as any).mockResolvedValue(mockResponse);

      const result = await clientService.getClient(clientId);

      expect(apiService.api.get).toHaveBeenCalledWith('/clients/1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createClient', () => {
    it('should create a new client', async () => {
      const clientData: ClientFormData = {
        name: 'New Client',
        email: 'new@example.com',
        phone: '(11) 88888-8888',
        address: 'New Address',
        cnpj: '98.765.432/0001-10',
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            client: {
              id: '2',
              ...clientData,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        },
      };

      (apiService.api.post as any).mockResolvedValue(mockResponse);

      const result = await clientService.createClient(clientData);

      expect(apiService.api.post).toHaveBeenCalledWith('/clients', clientData);
      expect(result).toEqual(mockResponse);
    });

    it('should create client with minimal data', async () => {
      const clientData: ClientFormData = {
        name: 'Minimal Client',
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            client: {
              id: '3',
              name: 'Minimal Client',
              email: null,
              phone: null,
              address: null,
              cnpj: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        },
      };

      (apiService.api.post as any).mockResolvedValue(mockResponse);

      const result = await clientService.createClient(clientData);

      expect(apiService.api.post).toHaveBeenCalledWith('/clients', clientData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateClient', () => {
    it('should update an existing client', async () => {
      const clientId = '1';
      const updateData: Partial<ClientFormData> = {
        name: 'Updated Client',
        email: 'updated@example.com',
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            client: {
              id: '1',
              name: 'Updated Client',
              email: 'updated@example.com',
              phone: '(11) 99999-9999',
              address: 'Test Address',
              cnpj: '12.345.678/0001-90',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        },
      };

      (apiService.api.put as any).mockResolvedValue(mockResponse);

      const result = await clientService.updateClient(clientId, updateData);

      expect(apiService.api.put).toHaveBeenCalledWith('/clients/1', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should update client with partial data', async () => {
      const clientId = '1';
      const updateData: Partial<ClientFormData> = {
        phone: '(11) 77777-7777',
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            client: {
              id: '1',
              name: 'Test Client',
              email: 'test@example.com',
              phone: '(11) 77777-7777',
              address: 'Test Address',
              cnpj: '12.345.678/0001-90',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        },
      };

      (apiService.api.put as any).mockResolvedValue(mockResponse);

      const result = await clientService.updateClient(clientId, updateData);

      expect(apiService.api.put).toHaveBeenCalledWith('/clients/1', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteClient', () => {
    it('should delete a client', async () => {
      const clientId = '1';
      const mockResponse = {
        data: {
          success: true,
          message: 'Cliente excluído com sucesso',
        },
      };

      (apiService.api.delete as any).mockResolvedValue(mockResponse);

      const result = await clientService.deleteClient(clientId);

      expect(apiService.api.delete).toHaveBeenCalledWith('/clients/1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      const error = new Error('Network error');
      (apiService.api.get as any).mockRejectedValue(error);

      await expect(clientService.getClients()).rejects.toThrow('Network error');
    });

    it('should propagate validation errors', async () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            error: 'Validation error',
            details: [{ message: 'Nome é obrigatório' }],
          },
        },
      };

      (apiService.api.post as any).mockRejectedValue(validationError);

      await expect(
        clientService.createClient({ name: '' })
      ).rejects.toEqual(validationError);
    });

    it('should propagate authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            error: 'Token required',
          },
        },
      };

      (apiService.api.get as any).mockRejectedValue(authError);

      await expect(clientService.getClients()).rejects.toEqual(authError);
    });
  });
});