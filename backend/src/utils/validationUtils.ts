import { DataValidationResult } from '../services/excelProcessingService.js';

interface SensorDataPoint {
  sensorId: string;
  timestamp: Date;
  temperature: number;
  humidity: number | null;
}

export async function validateSensorData(data: SensorDataPoint): Promise<DataValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Validar timestamp
    if (!data.timestamp || isNaN(data.timestamp.getTime())) {
      errors.push('Timestamp inválido');
    } else {
      // Verificar se não é uma data futura (máximo 1 hora de diferença)
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      if (data.timestamp > oneHourLater) {
        warnings.push('Timestamp parece estar no futuro');
      }
      
      // Verificar se não é muito antiga (máximo 10 anos)
      const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
      if (data.timestamp < tenYearsAgo) {
        warnings.push('Timestamp parece estar muito antigo');
      }
    }
    
    // Validar temperatura
    if (typeof data.temperature !== 'number' || isNaN(data.temperature)) {
      errors.push('Temperatura inválida');
    } else {
      // Faixa aceitável para sensores de temperatura comum
      if (data.temperature < -50) {
        errors.push(`Temperatura muito baixa: ${data.temperature}°C (mínimo: -50°C)`);
      } else if (data.temperature > 100) {
        errors.push(`Temperatura muito alta: ${data.temperature}°C (máximo: 100°C)`);
      }
      
      // Alertas para temperaturas extremas mas possíveis
      if (data.temperature < -40) {
        warnings.push(`Temperatura extremamente baixa: ${data.temperature}°C`);
      } else if (data.temperature > 85) {
        warnings.push(`Temperatura extremamente alta: ${data.temperature}°C`);
      }
    }
    
    // Validar umidade (se fornecida)
    if (data.humidity !== undefined && data.humidity !== null) {
      if (typeof data.humidity !== 'number' || isNaN(data.humidity)) {
        errors.push('Umidade inválida');
      } else {
        if (data.humidity < 0) {
          errors.push(`Umidade negativa: ${data.humidity}%`);
        } else if (data.humidity > 100) {
          errors.push(`Umidade acima de 100%: ${data.humidity}%`);
        }
        
        // Alerta para umidades extremas
        if (data.humidity > 95) {
          warnings.push(`Umidade muito alta: ${data.humidity}%`);
        } else if (data.humidity < 5) {
          warnings.push(`Umidade muito baixa: ${data.humidity}%`);
        }
      }
    }
    
    // Validar sensorId
    if (!data.sensorId || typeof data.sensorId !== 'string') {
      warnings.push('Sensor ID inválido ou ausente');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : []
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      isValid: false,
      errors: [`Erro na validação: ${errorMsg}`],
      warnings: []
    };
  }
}

export function detectOutliers(dataPoints: SensorDataPoint[]): {
  outliers: SensorDataPoint[];
  normal: SensorDataPoint[];
  statistics: {
    temperature: { mean: number; stdDev: number; q1: number; q3: number };
    humidity?: { mean: number; stdDev: number; q1: number; q3: number };
  };
} {
  if (dataPoints.length === 0) {
    return { outliers: [], normal: [], statistics: { temperature: { mean: 0, stdDev: 0, q1: 0, q3: 0 } } };
  }
  
  // Calcular estatísticas de temperatura
  const temperatures = dataPoints.map(d => d.temperature).sort((a, b) => a - b);
  const tempMean = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
  const tempVariance = temperatures.reduce((sum, temp) => sum + Math.pow(temp - tempMean, 2), 0) / temperatures.length;
  const tempStdDev = Math.sqrt(tempVariance);
  
  // Calcular quartis para temperatura
  const tempQ1 = calculatePercentile(temperatures, 25);
  const tempQ3 = calculatePercentile(temperatures, 75);
  const tempIQR = tempQ3 - tempQ1;
  
  // Calcular estatísticas de umidade (se disponível)
  const humidityData = dataPoints.filter(d => d.humidity !== undefined && d.humidity !== null);
  let humidityStats: { mean: number; stdDev: number; q1: number; q3: number } | undefined;
  
  if (humidityData.length > 0) {
    const humidities = humidityData.map(d => d.humidity!).sort((a, b) => a - b);
    const humidityMean = humidities.reduce((sum, hum) => sum + hum, 0) / humidities.length;
    const humidityVariance = humidities.reduce((sum, hum) => sum + Math.pow(hum - humidityMean, 2), 0) / humidities.length;
    const humidityStdDev = Math.sqrt(humidityVariance);
    
    const humidityQ1 = calculatePercentile(humidities, 25);
    const humidityQ3 = calculatePercentile(humidities, 75);
    
    humidityStats = {
      mean: humidityMean,
      stdDev: humidityStdDev,
      q1: humidityQ1,
      q3: humidityQ3
    };
  }
  
  // Detectar outliers usando o método IQR
  const outliers: SensorDataPoint[] = [];
  const normal: SensorDataPoint[] = [];
  
  dataPoints.forEach(point => {
    let isOutlier = false;
    
    // Verificar temperatura
    const tempLowerBound = tempQ1 - 1.5 * tempIQR;
    const tempUpperBound = tempQ3 + 1.5 * tempIQR;
    
    if (point.temperature < tempLowerBound || point.temperature > tempUpperBound) {
      isOutlier = true;
    }
    
    // Verificar umidade (se disponível)
    if (humidityStats && point.humidity !== undefined && point.humidity !== null) {
      const humidityIQR = humidityStats.q3 - humidityStats.q1;
      const humidityLowerBound = humidityStats.q1 - 1.5 * humidityIQR;
      const humidityUpperBound = humidityStats.q3 + 1.5 * humidityIQR;
      
      if (point.humidity < humidityLowerBound || point.humidity > humidityUpperBound) {
        isOutlier = true;
      }
    }
    
    if (isOutlier) {
      outliers.push(point);
    } else {
      normal.push(point);
    }
  });
  
  return {
    outliers,
    normal,
    statistics: {
      temperature: {
        mean: tempMean,
        stdDev: tempStdDev,
        q1: tempQ1,
        q3: tempQ3
      },
      humidity: humidityStats ?? { mean: 0, stdDev: 0, q1: 0, q3: 0 }
    }
  };
}

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedArray[lower] ?? 0;
  }
  
  const weight = index - lower;
  return (sortedArray[lower] ?? 0) * (1 - weight) + (sortedArray[upper] ?? 0) * weight;
}

export function validateDataConsistency(
  dataPoints: SensorDataPoint[],
  maxTimeGapMinutes: number = 60
): {
  isConsistent: boolean;
  issues: string[];
  gaps: Array<{ start: Date; end: Date; durationMinutes: number }>;
} {
  if (dataPoints.length < 2) {
    return { isConsistent: true, issues: [], gaps: [] };
  }
  
  // Ordenar por timestamp
  const sorted = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  const issues: string[] = [];
  const gaps: Array<{ start: Date; end: Date; durationMinutes: number }> = [];
  
  // Verificar lacunas temporais
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    if (!prev || !curr) continue;
    
    const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60); // minutos
    
    if (timeDiff > maxTimeGapMinutes) {
      gaps.push({
        start: prev.timestamp,
        end: curr.timestamp,
        durationMinutes: timeDiff
      });
      
      issues.push(`Lacuna temporal detectada: ${timeDiff.toFixed(1)} minutos entre ${prev.timestamp.toISOString()} e ${curr.timestamp.toISOString()}`);
    }
  }
  
  // Verificar duplicatas exatas
  const duplicates = findExactDuplicates(sorted);
  if (duplicates.length > 0) {
    issues.push(`${duplicates.length} registros duplicados encontrados`);
  }
  
  return {
    isConsistent: issues.length === 0,
    issues,
    gaps
  };
}

function findExactDuplicates(dataPoints: SensorDataPoint[]): SensorDataPoint[] {
  const seen = new Set<string>();
  const duplicates: SensorDataPoint[] = [];
  
  dataPoints.forEach(point => {
    const key = `${point.sensorId}-${point.timestamp.getTime()}-${point.temperature}-${point.humidity}`;
    if (seen.has(key)) {
      duplicates.push(point);
    } else {
      seen.add(key);
    }
  });
  
  return duplicates;
}
