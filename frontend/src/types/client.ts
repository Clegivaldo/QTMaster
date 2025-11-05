export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cnpj?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    reports: number;
    validations: number;
  };
}

export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  cnpj?: string;
}

export interface ClientsResponse {
  clients: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ClientFilters {
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}