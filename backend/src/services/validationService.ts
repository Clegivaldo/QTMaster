import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

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
    start: Date;
    end: Date;
    duration: number; // in hours
  };
}

export interface ValidationParameters {
  minTemperature: number;
  maxTemperature: number;
  minHumidity?: number;
  maxHumidity?: number;
}

export class ValidationService {
  async calculateStatistics(
    sensorDataIds: string[],
    parameters: ValidationParameters
  ): Promise<ValidationStatistics> {
    // Get all sensor data
    const sensorData = await prisma.sensorData.findMany({
      where: {
        id: { in: sensorDataIds },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (sensorData.length === 0) {
      throw new Error('No sensor data found');
    }

    // Calculate temperature statistics
    const temperatures = sensorData.map(d => d.temperature);
    const tempStats = this.calculateNumericStatistics(temperatures);
    const tempOutOfRange = temperatures.filter(
      t => t < parameters.minTemperature || t > parameters.maxTemperature
    ).length;

    // Calculate humidity statistics (if available)
    let humidityStats: any = undefined;
    const humidityValues = sensorData
      .map(d => d.humidity)
      .filter(h => h !== null) as number[];

    if (humidityValues.length > 0 && parameters.minHumidity !== undefined && parameters.maxHumidity !== undefined) {
      humidityStats = this.calculateNumericStatistics(humidityValues);
      humidityStats.outOfRangeCount = humidityValues.filter(
        h => h < parameters.minHumidity! || h > parameters.maxHumidity!
      ).length;
    }

    // Calculate time range
    const timestamps = sensorData.map(d => d.timestamp);
    const startTime = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const endTime = new Date(Math.max(...timestamps.map(t => t.getTime())));
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours

    // Calculate overall conformity
    const totalOutOfRange = tempOutOfRange + (humidityStats?.outOfRangeCount || 0);
    const totalReadings = sensorData.length;
    const validReadings = totalReadings - totalOutOfRange;
    const conformityPercentage = totalReadings > 0 ? (validReadings / totalReadings) * 100 : 0;

    const result: any = {
      totalReadings,
      validReadings,
      invalidReadings: totalOutOfRange,
      conformityPercentage: Math.round(conformityPercentage * 100) / 100,
      temperature: {
        min: tempStats.min,
        max: tempStats.max,
        average: tempStats.average,
        standardDeviation: tempStats.standardDeviation,
        outOfRangeCount: tempOutOfRange,
      },
      timeRange: {
        start: startTime,
        end: endTime,
        duration: Math.round(duration * 100) / 100,
      },
    };

    if (humidityStats) {
      result.humidity = {
        min: humidityStats.min,
        max: humidityStats.max,
        average: humidityStats.average,
        standardDeviation: humidityStats.standardDeviation,
        outOfRangeCount: humidityStats.outOfRangeCount,
      };
    }

    return result as ValidationStatistics;
  }

  async getSensorDataForValidation(suitcaseId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      sensor: {
        suitcaseSensors: {
          some: {
            suitcaseId,
          },
        },
      },
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    return prisma.sensorData.findMany({
      where: whereClause,
      include: {
        sensor: {
          select: {
            id: true,
            serialNumber: true,
            model: true,
            type: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getChartData(sensorDataIds: string[], parameters: ValidationParameters) {
    const sensorData = await prisma.sensorData.findMany({
      where: {
        id: { in: sensorDataIds },
      },
      include: {
        sensor: {
          select: {
            id: true,
            serialNumber: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group data by sensor
    const groupedData = sensorData.reduce((acc, data) => {
      const sensorId = data.sensor.id;
      if (!acc[sensorId]) {
        acc[sensorId] = {
          sensorId,
          serialNumber: data.sensor.serialNumber,
          data: [],
        };
      }

      acc[sensorId].data.push({
        timestamp: data.timestamp,
        temperature: data.temperature,
        humidity: data.humidity,
        isTemperatureValid: data.temperature >= parameters.minTemperature && 
                           data.temperature <= parameters.maxTemperature,
        isHumidityValid: data.humidity === null || 
                        (parameters.minHumidity !== undefined && parameters.maxHumidity !== undefined &&
                         data.humidity >= parameters.minHumidity && data.humidity <= parameters.maxHumidity),
      });

      return acc;
    }, {} as any);

    return Object.values(groupedData);
  }

  private calculateNumericStatistics(values: number[]) {
    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        standardDeviation: 0,
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;

    // Calculate standard deviation
    const squaredDifferences = values.map(value => Math.pow(value - average, 2));
    const avgSquaredDiff = squaredDifferences.reduce((a, b) => a + b, 0) / values.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      average: Math.round(average * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
    };
  }

  async createValidation(
    suitcaseId: string,
    clientId: string,
    userId: string,
    name: string,
    description: string | undefined,
    parameters: ValidationParameters,
    sensorDataIds: string[]
  ) {
    // Calculate statistics
    const statistics = await this.calculateStatistics(sensorDataIds, parameters);
    
    // Determine if validation is approved (e.g., >95% conformity)
    const isApproved = statistics.conformityPercentage >= 95;

    // Create validation record
    const validation = await prisma.validation.create({
      data: {
        suitcaseId,
        clientId,
        userId,
        name,
        description: description || null,
        minTemperature: parameters.minTemperature,
        maxTemperature: parameters.maxTemperature,
        minHumidity: parameters.minHumidity || null,
        maxHumidity: parameters.maxHumidity || null,
        isApproved,
        statistics: statistics as any,
      },
    });

    // Associate sensor data with validation
    await prisma.sensorData.updateMany({
      where: {
        id: { in: sensorDataIds },
      },
      data: {
        validationId: validation.id,
      },
    });

    logger.info('Validation created:', {
      validationId: validation.id,
      name: validation.name,
      isApproved,
      conformityPercentage: statistics.conformityPercentage,
      totalReadings: statistics.totalReadings,
      userId,
    });

    return validation;
  }

  async updateValidationApproval(validationId: string, isApproved: boolean, userId: string) {
    const validation = await prisma.validation.update({
      where: { id: validationId },
      data: { isApproved },
    });

    logger.info('Validation approval updated:', {
      validationId,
      isApproved,
      userId,
    });

    return validation;
  }
}

export const validationService = new ValidationService();