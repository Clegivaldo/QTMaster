export interface ValidationStatistics {
  totalReadings: number;
  validReadings: number;
  invalidReadings: number;
  conformityPercentage: number;
  temperature: {
    min: number;
    max: number;
    average: number;
    standardDeviation: number;
    outOfRangeCount: number;
  };
  humidity?: {
    min: number;
    max: number;
    average: number;
    standardDeviation: number;
    outOfRangeCount: number;
  };
  timeRange: {
    start: string;
    end: string;
    duration: number;
  };
}

export interface ValidationParameters {
  minTemperature: number;
  maxTemperature: number;
  minHumidity?: number;
  maxHumidity?: number;
}

export interface Validation {
  id: string;
  suitcaseId: string;
  clientId: string;
  userId: string;
  name: string;
  description?: string | null;
  minTemperature: number;
  maxTemperature: number;
  minHumidity?: number | null;
  maxHumidity?: number | null;
  isApproved?: boolean | null;
  statistics?: ValidationStatistics;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
  };
  suitcase?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
  };
  _count?: {
    sensorData: number;
    reports: number;
  };
}

export interface ValidationFormData {
  suitcaseId: string;
  clientId: string;
  name: string;
  description?: string;
  parameters: ValidationParameters;
  sensorDataIds: string[];
  startDate?: string;
  endDate?: string;
}

export interface ValidationsResponse {
  validations: Validation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationFilters {
  search?: string;
  clientId?: string;
  isApproved?: boolean;
  sortBy?: 'name' | 'createdAt' | 'isApproved';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SensorDataPoint {
  id: string;
  timestamp: string;
  temperature: number;
  humidity?: number | null;
  fileName: string;
  rowNumber: number;
  sensor: {
    id: string;
    serialNumber: string;
  };
}

export interface ChartDataPoint {
  timestamp: string;
  temperature: number;
  humidity?: number | null;
  isTemperatureValid: boolean;
  isHumidityValid: boolean;
}

export interface ChartSensorData {
  sensorId: string;
  serialNumber: string;
  data: ChartDataPoint[];
}

export interface ChartData {
  chartData: ChartSensorData[];
  parameters: ValidationParameters;
}