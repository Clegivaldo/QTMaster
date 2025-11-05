export interface SensorType {
  id: string;
  name: string;
  description?: string | null;
  dataConfig: {
    temperatureColumn: string;
    humidityColumn?: string;
    timestampColumn: string;
    startRow: number;
    dateFormat: string;
    hasHeader?: boolean;
    separator?: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    sensors: number;
  };
}

export interface Sensor {
  id: string;
  serialNumber: string;
  model: string;
  typeId: string;
  calibrationDate?: string | null;
  createdAt: string;
  updatedAt: string;
  type?: {
    id: string;
    name: string;
  };
  _count?: {
    sensorData: number;
    suitcaseSensors: number;
  };
}

export interface SensorTypeFormData {
  name: string;
  description?: string;
  dataConfig: {
    temperatureColumn: string;
    humidityColumn?: string;
    timestampColumn: string;
    startRow: number;
    dateFormat: string;
    hasHeader?: boolean;
    separator?: string;
  };
}

export interface SensorFormData {
  serialNumber: string;
  model: string;
  typeId: string;
  calibrationDate?: string;
}

export interface SensorsResponse {
  sensors: Sensor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SensorFilters {
  search?: string;
  typeId?: string;
  sortBy?: 'serialNumber' | 'model' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}