export interface Suitcase {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  sensors?: SuitcaseSensor[];
  _count?: {
    validations: number;
  };
}

export interface SuitcaseSensor {
  id: string;
  suitcaseId: string;
  sensorId: string;
  position?: number | null;
  sensor: {
    id: string;
    serialNumber: string;
    model: string;
    type: {
      id: string;
      name: string;
    };
  };
}

export interface SuitcaseFormData {
  name: string;
  description?: string;
  sensors: {
    sensorId: string;
    position?: number;
  }[];
}

export interface SuitcasesResponse {
  suitcases: Suitcase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SuitcaseFilters {
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}