import { AppError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';
import { ValidationCycleType, type ValidationImportItem } from '@prisma/client';

export type ParameterRange = {
  minTemperature: number;
  maxTemperature: number;
  minHumidity?: number;
  maxHumidity?: number;
};

interface ValidationCyclePayload {
  name: string;
  cycleType: ValidationCycleType;
  startAt: Date;
  endAt: Date;
  notes?: string | undefined;
}

interface ValidationImportItemPayload {
  timestamp: Date;
  temperature: number;
  humidity?: number | undefined;
  cycleName?: string | undefined;
  note?: string | undefined;
  fileName?: string | undefined;
  rowNumber?: number | undefined;
  isVisible?: boolean | undefined;
}

interface CreateValidationPayload {
  suitcaseId?: string;
  clientId: string;
  userId: string;
  name: string;
  description?: string | null;
  validationNumber: string;
  equipmentId?: string | undefined;
  equipmentSerial?: string | undefined;
  equipmentTag?: string | undefined;
  equipmentPatrimony?: string | undefined;
  startAt?: Date | undefined;
  endAt?: Date | undefined;
  parameters: ParameterRange;
  sensorDataIds?: string[] | undefined;
  cycles?: ValidationCyclePayload[] | undefined;
  importedItems?: ValidationImportItemPayload[] | undefined;
}

export class ValidationService {
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  private cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
  private cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
  private dateFormats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];

  // Validação de email
  isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    return this.emailRegex.test(email.trim());
  }

  // Validação de CPF
  isValidCPF(cpf: string): boolean {
    if (!cpf) return false;
    
    // Remover caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Verificar se tem 11 dígitos
    if (cleanCPF.length !== 11) {
      return false;
    }

    // Verificar se todos os dígitos são iguais (CPF inválido)
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return false;
    }

    // Validar dígitos verificadores
    let sum = 0;
    let remainder;

    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
      remainder = 0;
    }
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) {
      return false;
    }

    // Segundo dígito verificador
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
      remainder = 0;
    }
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) {
      return false;
    }

    return true;
  }

  // Validação de CNPJ
  isValidCNPJ(cnpj: string): boolean {
    if (!cnpj) return false;
    
    // Remover caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    // Verificar se tem 14 dígitos
    if (cleanCNPJ.length !== 14) {
      return false;
    }

    // Verificar se todos os dígitos são iguais (CNPJ inválido)
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      return false;
    }

    // Validar dígitos verificadores
    let length = cleanCNPJ.length - 2;
    let numbers = cleanCNPJ.substring(0, length);
    let digits = cleanCNPJ.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) {
      return false;
    }

    length = length + 1;
    numbers = cleanCNPJ.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) {
      return false;
    }

    return true;
  }

  // Validação de data
  isValidDate(date: string): boolean {
    if (!date || typeof date !== 'string') {
      return false;
    }

    // Verificar formato
    const isValidFormat = this.dateFormats.some(format => format.test(date));
    if (!isValidFormat) {
      return false;
    }

    // Verificar se é uma data válida
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }

  // Validação de telefone
  isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return this.phoneRegex.test(cleanPhone);
  }

  // Validação de CEP
  isValidCEP(cep: string): boolean {
    if (!cep || typeof cep !== 'string') {
      return false;
    }

    const cleanCEP = cep.replace(/\D/g, '');
    return /^\d{8}$/.test(cleanCEP);
  }

  // Validação de senha forte
  isStrongPassword(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Mínimo 8 caracteres
    if (password.length < 8) {
      return false;
    }

    // Pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Pelo menos uma letra minúscula
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Pelo menos um número
    if (!/\d/.test(password)) {
      return false;
    }

    // Pelo menos um caractere especial
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return false;
    }

    return true;
  }

  // Validação de URL
  isValidURL(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Validação de número inteiro
  isValidInteger(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const num = Number(value);
    return Number.isInteger(num);
  }

  // Validação de número decimal
  isValidDecimal(value: any, options: {
    min?: number;
    max?: number;
    precision?: number;
  } = {}): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const num = Number(value);
    if (isNaN(num)) {
      return false;
    }

    // Verificar mínimo
    if (options.min !== undefined && num < options.min) {
      return false;
    }

    // Verificar máximo
    if (options.max !== undefined && num > options.max) {
      return false;
    }

    // Verificar precisão decimal
    if (options.precision !== undefined) {
      const decimalPart = num.toString().split('.')[1];
      if (decimalPart && decimalPart.length > options.precision) {
        return false;
      }
    }

    return true;
  }

  // Validação de tamanho de string
  isValidStringLength(value: string, options: {
    min?: number;
    max?: number;
    exact?: number;
  } = {}): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const str = String(value);

    // Verificar tamanho mínimo
    if (options.min !== undefined && str.length < options.min) {
      return false;
    }

    // Verificar tamanho máximo
    if (options.max !== undefined && str.length > options.max) {
      return false;
    }

    // Verificar tamanho exato
    if (options.exact !== undefined && str.length !== options.exact) {
      return false;
    }

    return true;
  }

  // Validação de valor único (no banco de dados)
  async isUnique(
    value: any,
    tableName: string,
    fieldName: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      // Esta validação precisa ser implementada com base no seu ORM
      // Aqui está um exemplo genérico
      
      // const count = await this.prisma[tableName].count({
      //   where: {
      //     [fieldName]: value,
      //     ...(excludeId && { id: { not: excludeId } }),
      //   },
      // });

      // return count === 0;
      
      // Por enquanto, retornamos true para não bloquear o desenvolvimento
      return true;
    } catch (error) {
      throw new AppError(`Unique validation failed: ${(error as any)?.message ?? String(error)}`, 400);
    }
  }

  // Domain-specific methods used by ValidationController
  async getSensorDataForValidation(
    suitcaseId: string,
    start?: Date,
    end?: Date
  ): Promise<any[]> {
    const sensors = await prisma.suitcaseSensor.findMany({
      where: { suitcaseId },
      select: { sensorId: true },
    });
    const sensorIds = sensors.map(s => s.sensorId);
    if (sensorIds.length === 0) return [];
    return prisma.sensorData.findMany({
      where: {
        sensorId: { in: sensorIds },
        ...(start && { timestamp: { gte: start } }),
        ...(end && { timestamp: { lte: end } }),
      },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        sensorId: true,
        timestamp: true,
        temperature: true,
        humidity: true,
        fileName: true,
        rowNumber: true,
      },
    });
  }

  async getChartData(sensorDataIds: string[], parameters: any, selectedSensorIds?: string[], hiddenSensorIds?: string[]): Promise<any> {
    // Buscar dados dos sensores com informações do sensor
    const rawData = await prisma.sensorData.findMany({
      where: { 
        id: { in: sensorDataIds },
        ...(selectedSensorIds && selectedSensorIds.length > 0 && {
          sensorId: { in: selectedSensorIds }
        })
      },
      orderBy: { timestamp: 'asc' },
      select: { 
        id: true,
        sensorId: true,
        timestamp: true, 
        temperature: true, 
        humidity: true,
        sensor: {
          select: {
            id: true,
            serialNumber: true
          }
        }
      },
    });

    // Deduplicar por (sensorId, timestamp)
    const dedupSeen = new Set<string>();
    const data = rawData.filter((item) => {
      const key = `${item.sensorId}|${item.timestamp.toISOString()}`;
      if (dedupSeen.has(key)) return false;
      dedupSeen.add(key);
      return true;
    });

    // Filtrar sensores ocultos
    const visibleData = hiddenSensorIds && hiddenSensorIds.length > 0
      ? data.filter(item => !hiddenSensorIds.includes(item.sensorId))
      : data;

    // Agrupar dados por sensor
    const sensorDataMap = new Map<string, any[]>();
    
    visibleData.forEach(item => {
      const sensorId = item.sensorId;
      if (!sensorDataMap.has(sensorId)) {
        sensorDataMap.set(sensorId, []);
      }
      
      // Calcular validação para cada ponto
      const isTemperatureValid = item.temperature >= parameters.minTemperature && 
                                item.temperature <= parameters.maxTemperature;
      
      const isHumidityValid = parameters.minHumidity !== undefined && 
                             parameters.maxHumidity !== undefined &&
                             item.humidity !== null && item.humidity !== undefined
        ? item.humidity >= parameters.minHumidity && item.humidity <= parameters.maxHumidity
        : true;

      sensorDataMap.get(sensorId)!.push({
        timestamp: item.timestamp.toISOString(),
        temperature: item.temperature,
        humidity: item.humidity,
        isTemperatureValid,
        isHumidityValid
      });
    });

    // Converter para formato esperado pelo frontend
    const chartData = Array.from(sensorDataMap.entries()).map(([sensorId, sensorData]) => ({
      sensorId,
      serialNumber: visibleData.find(d => d.sensorId === sensorId)?.sensor?.serialNumber || sensorId,
      data: sensorData
    }));

    return {
      chartData,
      parameters
    };
  }

  async createValidation(payload: CreateValidationPayload): Promise<any> {
    const startEpochs = [
      ...(payload.cycles?.map((cycle) => cycle.startAt.getTime()) ?? []),
      ...(payload.importedItems?.map((item) => item.timestamp.getTime()) ?? []),
    ];
    const endEpochs = [
      ...(payload.cycles?.map((cycle) => cycle.endAt.getTime()) ?? []),
      ...(payload.importedItems?.map((item) => item.timestamp.getTime()) ?? []),
    ];

    const startAt = payload.startAt ?? (startEpochs.length ? new Date(Math.min(...startEpochs)) : undefined);
    const endAt = payload.endAt ?? (endEpochs.length ? new Date(Math.max(...endEpochs)) : undefined);

    const validation = await prisma.validation.create({
      data: {
        suitcaseId: payload.suitcaseId ?? null,
        clientId: payload.clientId,
        userId: payload.userId,
        name: payload.name,
        description: payload.description || null,
        validationNumber: payload.validationNumber,
        equipmentId: payload.equipmentId ?? null,
        equipmentSerial: payload.equipmentSerial ?? null,
        equipmentTag: payload.equipmentTag ?? null,
        equipmentPatrimony: payload.equipmentPatrimony ?? null,
        startAt: startAt ?? null,
        endAt: endAt ?? null,
        minTemperature: payload.parameters.minTemperature,
        maxTemperature: payload.parameters.maxTemperature,
        minHumidity: payload.parameters.minHumidity ?? null,
        maxHumidity: payload.parameters.maxHumidity ?? null,
      },
    });

    if (payload.sensorDataIds?.length) {
      await prisma.sensorData.updateMany({
        where: { id: { in: payload.sensorDataIds } },
        data: { validationId: validation.id },
      });
    }

    const createdCycles: { id: string; name: string }[] = [];

    if (payload.cycles?.length) {
      for (const cycle of payload.cycles) {
        const createdCycle = await prisma.validationCycle.create({
          data: {
            validationId: validation.id,
            name: cycle.name,
            cycleType: cycle.cycleType,
            startAt: cycle.startAt,
            endAt: cycle.endAt,
            notes: cycle.notes ?? null,
          },
        });
        createdCycles.push(createdCycle);
      }
    }

    if (payload.importedItems?.length) {
      const cycleLookup = new Map<string, string>();
      createdCycles.forEach((cycle) => cycleLookup.set(cycle.name, cycle.id));

      const importData = payload.importedItems.map((item) => ({
        validationId: validation.id,
        cycleId: item.cycleName ? cycleLookup.get(item.cycleName) ?? null : null,
        timestamp: item.timestamp,
        temperature: item.temperature,
        humidity: item.humidity ?? null,
        fileName: item.fileName ?? null,
        rowNumber: item.rowNumber ?? null,
        note: item.note ?? null,
        isVisible: item.isVisible ?? true,
      }));

      await prisma.validationImportItem.createMany({
        data: importData,
      });

      const importedItems = await prisma.validationImportItem.findMany({
        where: { validationId: validation.id },
        orderBy: { timestamp: 'asc' },
      });

      const stats = this.buildStatisticsFromImportedItems(importedItems, payload.parameters);
      if (stats) {
        await prisma.validation.update({
          where: { id: validation.id },
          data: { statistics: stats },
        });
      }

      for (const cycle of createdCycles) {
        const itemsForCycle = importedItems.filter((item) => item.cycleId === cycle.id);
        const duration = this.calculateUninterruptedDurationMs(itemsForCycle, payload.parameters);
        await prisma.validationCycle.update({
          where: { id: cycle.id },
          data: { uninterruptedDuration: duration },
        });
      }
    }

    return validation;
  }

  private calculateUninterruptedDurationMs(
    items: ValidationImportItem[],
    parameters: ParameterRange
  ): number {
    if (!items.length) return 0;

    const windows = this.calculateAcceptanceWindows(items, parameters);
    return windows.length > 0 ? Math.max(...windows.map(w => w.duration)) : 0;
  }

  calculateAcceptanceWindows(
    items: ValidationImportItem[],
    parameters: ParameterRange
  ): Array<{
    start: Date;
    end: Date;
    duration: number;
    startIndex: number;
    endIndex: number;
  }> {
    if (!items.length) return [];

    const windows: Array<{
      start: Date;
      end: Date;
      duration: number;
      startIndex: number;
      endIndex: number;
    }> = [];

    let windowStart: Date | null = null;
    let windowEnd: Date | null = null;
    let startIndex = -1;

    const sortedItems = [...items].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      if (!item) continue; // Skip undefined items
      
      const isValid = this.isWithinAcceptance(item, parameters);
      
      if (isValid) {
        if (!windowStart) {
          windowStart = item.timestamp;
          startIndex = i;
        }
        windowEnd = item.timestamp;
      } else if (windowStart && windowEnd) {
        windows.push({
          start: windowStart,
          end: windowEnd,
          duration: windowEnd.getTime() - windowStart.getTime(),
          startIndex,
          endIndex: i - 1
        });
        windowStart = null;
        windowEnd = null;
        startIndex = -1;
      }
    }

    // Adicionar última janela se necessário
    if (windowStart && windowEnd) {
      windows.push({
        start: windowStart,
        end: windowEnd,
        duration: windowEnd.getTime() - windowStart.getTime(),
        startIndex,
        endIndex: sortedItems.length - 1
      });
    }

    return windows;
  }

  private isWithinAcceptance(item: ValidationImportItem, parameters: ParameterRange): boolean {
    const withinTemperature =
      item.temperature >= parameters.minTemperature && item.temperature <= parameters.maxTemperature;

    const humidityDefined =
      parameters.minHumidity !== undefined && parameters.maxHumidity !== undefined;

    const withinHumidity = humidityDefined
      ? typeof item.humidity === 'number' && item.humidity >= parameters.minHumidity! && item.humidity <= parameters.maxHumidity!
      : true;

    return withinTemperature && withinHumidity;
  }

  private buildStatisticsFromImportedItems(
    items: ValidationImportItem[],
    parameters: ParameterRange
  ): object | null {
    if (!items.length) return null;

    const totalReadings = items.length;
    const sorted = [...items].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const validReadings = items.filter((item) => this.isWithinAcceptance(item, parameters)).length;
    const invalidReadings = totalReadings - validReadings;
    const conformityPercentage = totalReadings ? (validReadings / totalReadings) * 100 : 0;

    const temperatures = items.map((item) => item.temperature);
    const tempMin = Math.min(...temperatures);
    const tempMax = Math.max(...temperatures);
    const tempAverage = temperatures.reduce((sum, value) => sum + value, 0) / totalReadings;
    const tempStdDev = Math.sqrt(
      temperatures.reduce((sum, value) => sum + Math.pow(value - tempAverage, 2), 0) / totalReadings
    );
    const tempOutOfRangeCount = items.filter(
      (item) => item.temperature < parameters.minTemperature || item.temperature > parameters.maxTemperature
    ).length;

    const humidityValues = items
      .filter((item) => typeof item.humidity === 'number')
      .map((item) => item.humidity as number);

    const humidityStats =
      parameters.minHumidity !== undefined &&
      parameters.maxHumidity !== undefined &&
      humidityValues.length
        ? (() => {
            const min = Math.min(...humidityValues);
            const max = Math.max(...humidityValues);
            const sum = humidityValues.reduce((acc, value) => acc + value, 0);
            const average = sum / humidityValues.length;
            const standardDeviation = Math.sqrt(
              humidityValues.reduce((acc, value) => acc + Math.pow(value - average, 2), 0) / humidityValues.length
            );
            const outOfRangeCount = humidityValues.filter(
              (value) => value < parameters.minHumidity! || value > parameters.maxHumidity!
            ).length;

            return {
              min,
              max,
              average,
              standardDeviation,
              outOfRangeCount,
            };
          })()
        : undefined;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return null;

    const timeRange = {
      start: first.timestamp.toISOString(),
      end: last.timestamp.toISOString(),
      duration: Math.max(0, last.timestamp.getTime() - first.timestamp.getTime()),
    };

    // Calcular janelas de conformidade
    const acceptanceWindows = this.calculateAcceptanceWindows(items, parameters);
    const longestWindow = acceptanceWindows.length > 0 
      ? acceptanceWindows.reduce((prev, current) => 
          prev.duration > current.duration ? prev : current
        )
      : null;

    const statistics: any = {
      totalReadings,
      validReadings,
      invalidReadings,
      conformityPercentage,
      temperature: {
        min: tempMin,
        max: tempMax,
        average: tempAverage,
        standardDeviation: tempStdDev,
        outOfRangeCount: tempOutOfRangeCount,
      },
      timeRange,
      acceptanceWindows: acceptanceWindows.map(window => ({
        start: window.start.toISOString(),
        end: window.end.toISOString(),
        duration: window.duration,
        durationFormatted: this.formatDuration(window.duration)
      })),
      longestAcceptanceWindow: longestWindow ? {
        start: longestWindow.start.toISOString(),
        end: longestWindow.end.toISOString(),
        duration: longestWindow.duration,
        durationFormatted: this.formatDuration(longestWindow.duration)
      } : null
    };

    if (humidityStats) {
      statistics.humidity = humidityStats;
    }

    return statistics;
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  async updateValidationApproval(id: string, isApproved: boolean, _userId: string): Promise<any> {
    return prisma.validation.update({
      where: { id },
      data: { isApproved },
    });
  }

  async toggleImportItemVisibility(validationId: string, itemId: string, isVisible: boolean) {
    const item = await prisma.validationImportItem.findUnique({
      where: { id: itemId },
      select: { id: true, validationId: true },
    });

    if (!item || item.validationId !== validationId) {
      throw new AppError('Imported item not found for this validation', 404);
    }

    return prisma.validationImportItem.update({
      where: { id: itemId },
      data: { isVisible },
    });
  }

  // Validação de CPF ou CNPJ
  isValidCPForCNPJ(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const cleanValue = value.replace(/\D/g, '');

    if (cleanValue.length === 11) {
      return this.isValidCPF(cleanValue);
    } else if (cleanValue.length === 14) {
      return this.isValidCNPJ(cleanValue);
    }

    return false;
  }

  // Validação de horário
  isValidTime(time: string): boolean {
    if (!time || typeof time !== 'string') {
      return false;
    }

    // Formato HH:MM ou HH:MM:SS
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    return timeRegex.test(time);
  }

  // Validação de cor hexadecimal
  isValidHexColor(color: string): boolean {
    if (!color || typeof color !== 'string') {
      return false;
    }

    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  // Validação de placa de veículo (Brasil)
  isValidLicensePlate(plate: string): boolean {
    if (!plate || typeof plate !== 'string') {
      return false;
    }

    // Formato antigo: ABC-1234 ou ABC1234
    const oldFormat = /^[A-Z]{3}-?\d{4}$/;
    
    // Formato novo: ABC1D23
    const newFormat = /^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$/;

    return oldFormat.test(plate.toUpperCase()) || newFormat.test(plate.toUpperCase());
  }

  // Validação de coordenadas geográficas
  isValidCoordinates(latitude: number, longitude: number): boolean {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return false;
    }

    // Latitude: -90 a 90
    if (latitude < -90 || latitude > 90) {
      return false;
    }

    // Longitude: -180 a 180
    if (longitude < -180 || longitude > 180) {
      return false;
    }

    return true;
  }

  // Validação de MAC address
  isValidMACAddress(mac: string): boolean {
    if (!mac || typeof mac !== 'string') {
      return false;
    }

    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  }

  // Validação de IP address
  isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // Validação de percentual
  isValidPercentage(value: any, options: {
    min?: number;
    max?: number;
    allowDecimal?: boolean;
  } = {}): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const num = Number(value);
    if (isNaN(num)) {
      return false;
    }

    // Valores padrão
    const min = options.min !== undefined ? options.min : 0;
    const max = options.max !== undefined ? options.max : 100;

    // Verificar se está dentro do intervalo
    if (num < min || num > max) {
      return false;
    }

    // Verificar se permite decimal
    if (!options.allowDecimal && !Number.isInteger(num)) {
      return false;
    }

    return true;
  }

  // Validação de idade
  isValidAge(value: any, options: {
    min?: number;
    max?: number;
  } = {}): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const age = Number(value);
    if (!Number.isInteger(age) || age < 0) {
      return false;
    }

    // Verificar idade mínima
    if (options.min !== undefined && age < options.min) {
      return false;
    }

    // Verificar idade máxima
    if (options.max !== undefined && age > options.max) {
      return false;
    }

    return true;
  }

  // Validação de moeda
  isValidCurrency(value: any, options: {
    currency?: string;
    min?: number;
    max?: number;
  } = {}): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const num = Number(value);
    if (isNaN(num)) {
      return false;
    }

    // Verificar valor mínimo
    if (options.min !== undefined && num < options.min) {
      return false;
    }

    // Verificar valor máximo
    if (options.max !== undefined && num > options.max) {
      return false;
    }

    return true;
  }

  // Validação de número de cartão de crédito
  isValidCreditCard(cardNumber: string): boolean {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return false;
    }

    // Remover espaços e traços
    const cleanNumber = cardNumber.replace(/[\s\-]/g, '');

    // Verificar se contém apenas números
    if (!/^\d+$/.test(cleanNumber)) {
      return false;
    }

    // Verificar tamanho mínimo e máximo
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return false;
    }

    // Algoritmo de Luhn
    let sum = 0;
    let isEven = false;

    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i));

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  // Validação de número de série
  isValidSerialNumber(serial: string, options: {
    format?: string;
    length?: number;
    prefix?: string;
    suffix?: string;
  } = {}): boolean {
    if (!serial || typeof serial !== 'string') {
      return false;
    }

    // Verificar comprimento
    if (options.length !== undefined && serial.length !== options.length) {
      return false;
    }

    // Verificar prefixo
    if (options.prefix && !serial.startsWith(options.prefix)) {
      return false;
    }

    // Verificar sufixo
    if (options.suffix && !serial.endsWith(options.suffix)) {
      return false;
    }

    // Verificar formato (regex)
    if (options.format && !new RegExp(options.format).test(serial)) {
      return false;
    }

    return true;
  }

  // Validação de latitude e longitude
  isValidLatitude(latitude: any): boolean {
    return this.isValidDecimal(latitude, { min: -90, max: 90 });
  }

  isValidLongitude(longitude: any): boolean {
    return this.isValidDecimal(longitude, { min: -180, max: 180 });
  }

  // Validação de temperatura
  isValidTemperature(value: any, unit: 'celsius' | 'fahrenheit' | 'kelvin' = 'celsius'): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const temp = Number(value);
    if (isNaN(temp)) {
      return false;
    }

    switch (unit) {
      case 'celsius':
        return temp >= -273.15 && temp <= 1000;
      case 'fahrenheit':
        return temp >= -459.67 && temp <= 1832;
      case 'kelvin':
        return temp >= 0 && temp <= 1273.15;
      default:
        return false;
    }
  }

  // Validação de umidade
  isValidHumidity(value: any): boolean {
    return this.isValidPercentage(value, { min: 0, max: 100 });
  }

  // Validação de pressão atmosférica
  isValidPressure(value: any, unit: 'hpa' | 'mbar' | 'inhg' = 'hpa'): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const pressure = Number(value);
    if (isNaN(pressure)) {
      return false;
    }

    switch (unit) {
      case 'hpa':
      case 'mbar':
        return pressure >= 870 && pressure <= 1085;
      case 'inhg':
        return pressure >= 25.7 && pressure <= 32.0;
      default:
        return false;
    }
  }

  // Validação de velocidade do vento
  isValidWindSpeed(value: any, unit: 'kmh' | 'ms' | 'mph' | 'knots' = 'kmh'): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const speed = Number(value);
    if (isNaN(speed) || speed < 0) {
      return false;
    }

    // Limites razoáveis para cada unidade
    switch (unit) {
      case 'kmh':
        return speed <= 500; // 500 km/h máximo
      case 'ms':
        return speed <= 140; // 140 m/s máximo
      case 'mph':
        return speed <= 310; // 310 mph máximo
      case 'knots':
        return speed <= 270; // 270 knots máximo
      default:
        return false;
    }
  }

  // Validação de direção do vento
  isValidWindDirection(value: any, unit: 'degrees' | 'cardinal' = 'degrees'): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (unit === 'degrees') {
      const degrees = Number(value);
      return this.isValidDecimal(degrees, { min: 0, max: 360 });
    } else {
      // Direções cardeais
      const cardinalDirections = [
        'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
      ];
      return cardinalDirections.includes(value.toUpperCase());
    }
  }

  // Validação de precipitação
  isValidPrecipitation(value: any, unit: 'mm' | 'inches' = 'mm'): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const precipitation = Number(value);
    if (isNaN(precipitation) || precipitation < 0) {
      return false;
    }

    // Limites razoáveis
    switch (unit) {
      case 'mm':
        return precipitation <= 2000; // 2000mm máximo
      case 'inches':
        return precipitation <= 80; // 80 inches máximo
      default:
        return false;
    }
  }

  // Validação de visibilidade
  isValidVisibility(value: any, unit: 'km' | 'miles' | 'meters' = 'km'): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const visibility = Number(value);
    if (isNaN(visibility) || visibility < 0) {
      return false;
    }

    // Limites razoáveis
    switch (unit) {
      case 'km':
        return visibility <= 100; // 100km máximo
      case 'miles':
        return visibility <= 62; // 62 miles máximo
      case 'meters':
        return visibility <= 100000; // 100km em metros
      default:
        return false;
    }
  }

  // Validação de índice UV
  isValidUVIndex(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const uvIndex = Number(value);
    return this.isValidDecimal(uvIndex, { min: 0, max: 20 }); // Índice UV máximo é 20
  }

  // Validação de dados de sensor
  validateSensorData(data: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    windSpeed?: number;
    windDirection?: number;
    precipitation?: number;
    visibility?: number;
    uvIndex?: number;
  }): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar temperatura
    if (data.temperature !== undefined) {
      if (!this.isValidTemperature(data.temperature)) {
        errors.push(`Invalid temperature: ${data.temperature}`);
      }
    }

    // Validar umidade
    if (data.humidity !== undefined) {
      if (!this.isValidHumidity(data.humidity)) {
        errors.push(`Invalid humidity: ${data.humidity}`);
      }
    }

    // Validar pressão
    if (data.pressure !== undefined) {
      if (!this.isValidPressure(data.pressure)) {
        errors.push(`Invalid pressure: ${data.pressure}`);
      }
    }

    // Validar velocidade do vento
    if (data.windSpeed !== undefined) {
      if (!this.isValidWindSpeed(data.windSpeed)) {
        errors.push(`Invalid wind speed: ${data.windSpeed}`);
      }
    }

    // Validar direção do vento
    if (data.windDirection !== undefined) {
      if (!this.isValidWindDirection(data.windDirection)) {
        errors.push(`Invalid wind direction: ${data.windDirection}`);
      }
    }

    // Validar precipitação
    if (data.precipitation !== undefined) {
      if (!this.isValidPrecipitation(data.precipitation)) {
        errors.push(`Invalid precipitation: ${data.precipitation}`);
      }
    }

    // Validar visibilidade
    if (data.visibility !== undefined) {
      if (!this.isValidVisibility(data.visibility)) {
        errors.push(`Invalid visibility: ${data.visibility}`);
      }
    }

    // Validar índice UV
    if (data.uvIndex !== undefined) {
      if (!this.isValidUVIndex(data.uvIndex)) {
        errors.push(`Invalid UV index: ${data.uvIndex}`);
      }
    }

    // Verificar consistência entre dados
    if (data.temperature !== undefined && data.humidity !== undefined) {
      if (data.temperature < -10 && data.humidity > 90) {
        warnings.push('Unusual combination: very low temperature with very high humidity');
      }
    }

    if (data.windSpeed !== undefined && data.windDirection !== undefined) {
      if (data.windSpeed > 100 && data.windDirection === 0) {
        warnings.push('Unusual combination: very high wind speed with direction 0');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validação de dados de cliente
  validateClientData(data: {
    name?: string;
    email?: string;
    cpf?: string;
    cnpj?: string;
    phone?: string;
    cep?: string;
  }): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar nome
    if (data.name !== undefined) {
      if (!this.isValidStringLength(data.name, { min: 3, max: 100 })) {
        errors.push(`Invalid name length: must be between 3 and 100 characters`);
      }
    }

    // Validar email
    if (data.email !== undefined) {
      if (!this.isValidEmail(data.email)) {
        errors.push(`Invalid email: ${data.email}`);
      }
    }

    // Validar CPF ou CNPJ
    if (data.cpf !== undefined && data.cnpj !== undefined) {
      errors.push('Cannot have both CPF and CNPJ');
    } else if (data.cpf !== undefined) {
      if (!this.isValidCPF(data.cpf)) {
        errors.push(`Invalid CPF: ${data.cpf}`);
      }
    } else if (data.cnpj !== undefined) {
      if (!this.isValidCNPJ(data.cnpj)) {
        errors.push(`Invalid CNPJ: ${data.cnpj}`);
      }
    }

    // Validar telefone
    if (data.phone !== undefined) {
      if (!this.isValidPhone(data.phone)) {
        errors.push(`Invalid phone: ${data.phone}`);
      }
    }

    // Validar CEP
    if (data.cep !== undefined) {
      if (!this.isValidCEP(data.cep)) {
        errors.push(`Invalid CEP: ${data.cep}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validação de dados de equipamento (maleta/sensor)
  validateEquipmentData(data: {
    serialNumber?: string;
    model?: string;
    manufacturer?: string;
    calibrationDate?: string;
    nextCalibrationDate?: string;
  }): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar número de série
    if (data.serialNumber !== undefined) {
      if (!this.isValidSerialNumber(data.serialNumber)) {
        errors.push(`Invalid serial number: ${data.serialNumber}`);
      }
    }

    // Validar modelo
    if (data.model !== undefined) {
      if (!this.isValidStringLength(data.model, { min: 2, max: 50 })) {
        errors.push(`Invalid model length: must be between 2 and 50 characters`);
      }
    }

    // Validar fabricante
    if (data.manufacturer !== undefined) {
      if (!this.isValidStringLength(data.manufacturer, { min: 2, max: 50 })) {
        errors.push(`Invalid manufacturer length: must be between 2 and 50 characters`);
      }
    }

    // Validar datas de calibração
    if (data.calibrationDate !== undefined) {
      if (!this.isValidDate(data.calibrationDate)) {
        errors.push(`Invalid calibration date: ${data.calibrationDate}`);
      }
    }

    if (data.nextCalibrationDate !== undefined) {
      if (!this.isValidDate(data.nextCalibrationDate)) {
        errors.push(`Invalid next calibration date: ${data.nextCalibrationDate}`);
      }
    }

    // Verificar consistência entre datas
    if (data.calibrationDate && data.nextCalibrationDate) {
      const calDate = new Date(data.calibrationDate);
      const nextCalDate = new Date(data.nextCalibrationDate);
      
      if (nextCalDate <= calDate) {
        errors.push('Next calibration date must be after calibration date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const validationService = new ValidationService();