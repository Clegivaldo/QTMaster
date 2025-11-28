export interface Brand {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentModel {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  brand?: Brand;
}

export interface EquipmentType {
  id: string;
  name: string;
  description?: string;
  validationCycles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientEquipment {
  id: string;
  clientId: string;
  equipmentTypeId: string;
  brandId: string;
  modelId: string;
  name?: string;
  serialNumber: string;
  assetNumber?: string;
  tag?: string;
  acceptanceConditions: {
    minTemperature: number;
    maxTemperature: number;
    minHumidity?: number;
    maxHumidity?: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
  };
  equipmentType?: EquipmentType;
  brand?: Brand;
  model?: EquipmentModel;
}

export interface ValidationCycle {
  id: string;
  validationId: string;
  equipmentId: string;
  cycleType: 'EMPTY' | 'FULL' | 'OPEN_DOOR' | 'POWER_OUTAGE' | 'NORMAL';
  startDate: string;
  endDate: string;
  duration: number;
  interruptionTime: number;
  conformityPercentage: number;
  isApproved: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationDataPoint {
  id: string;
  validationId: string;
  sensorId: string;
  timestamp: string;
  temperature: number;
  humidity?: number;
  isValid: boolean;
  isSelected: boolean;
  notes?: string;
  createdAt: string;
}

export interface BrandFormData {
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EquipmentModelFormData {
  brandId: string;
  name: string;
  description?: string;
  specifications?: Record<string, any>;
}

export interface EquipmentTypeFormData {
  name: string;
  description?: string;
  validationCycles?: string[];
}

export interface ClientEquipmentFormData {
  clientId: string;
  equipmentTypeId: string;
  brandId: string;
  modelId: string;
  name?: string;
  serialNumber: string;
  assetNumber?: string;
  tag?: string;
  acceptanceConditions: {
    minTemperature: number;
    maxTemperature: number;
    minHumidity?: number;
    maxHumidity?: number;
  };
  notes?: string;
}