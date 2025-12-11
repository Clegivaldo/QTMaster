import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { validateSensorData } from '../utils/validationUtils.js';
import { logger } from '../utils/logger.js';
import { redisService } from './redisService.js';
import { performanceService } from './performanceService.js';
import { processingMetricsService } from './processingMetricsService.js';
import {
  sensorDataRowSchema,
  sensorDataBatchSchema,
  type SensorDataRow
} from '../validators/dataImportSchemas.js';
import { z } from 'zod';

interface ProcessingOptions {
  suitcaseId: string;
  userId: string;
  validateData: boolean;
  chunkSize: number;
  jobId: string;
  fileName: string;
  validationId?: string;
  fileSensorSerial?: string;
  vendorGuess?: string | null;
}

interface ProcessingResult {
  totalRows: number;
  processedRows: number;
  failedRows: number;
  errors: string[];
  processingTime: number;
  warnings: string[];
}

interface ColumnMapping {
  timestamp?: string;
  temperature?: string;
  humidity?: string;
  sensorId?: string;
}

interface ParsedRow {
  sensorId: string;
  timestamp: Date;
  temperature: number;
  humidity: number | null;
}

interface ChunkResult {
  successful: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

export class ExcelProcessingService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_ROWS_PER_BATCH = 10000;
  private readonly ACCEPTED_FORMATS = ['.xlsx', '.xls', '.csv'];

  async processExcelFile(
    filePath: string,
    originalName: string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    logger.info('processExcelFile entry', { filePath, originalName, suitcaseId: options.suitcaseId });
    processingMetricsService.startTracking(options.jobId, originalName, options.vendorGuess || undefined, 'excel');
    try {
      logger.info('Validating file', { filePath });
      await this.validateFile(filePath, originalName);
      logger.info('File validated, reading workbook', { filePath });
      const XLSXLib: any = (XLSX as any)?.default ?? XLSX;
      const timeoutMs = Number(process.env.XLS_READ_TIMEOUT_MS || 10000);
      const readStart = Date.now();
      logger.info('Attempting workbook read', { timeoutMs, filePath, originalName });
      const workbook = await Promise.race([
        new Promise<any>((resolve, reject) => {
          try {
            const wb = XLSXLib.readFile(filePath);
            resolve(wb);
          } catch (e) {
            reject(e);
          }
        }),
        new Promise((_resolve, reject) => {
          const to = setTimeout(() => {
            const err: any = new Error(`XLS read timeout after ${timeoutMs}ms`);
            err.code = 'XLS_READ_TIMEOUT';
            reject(err);
          }, timeoutMs);
          // No clear needed; timeout will fire or promise resolved earlier
        })
      ]).catch(err => {
        logger.error('Workbook read failed', { message: err?.message, code: err?.code });
        throw err;
      });
      const readDuration = Date.now() - readStart;
      processingMetricsService.recordStage(options.jobId, 'workbook_load', readDuration);
      logger.info('Workbook loaded', { sheetCount: workbook.SheetNames.length, sheets: workbook.SheetNames, readDuration });

      // Detect model/serial from 'Resumo' sheet for specific sensor parsing
      let defaultSensorSerial: string | undefined = undefined;
      let preferLista = false;
      const resumo = workbook.SheetNames.includes('Resumo') ? workbook.Sheets['Resumo'] : undefined;
      if (resumo) {
        try {
          const modelCell = resumo['B5'];
          const serialCell = resumo['B6'];
          const modelStr = modelCell ? String((modelCell as any).v || (modelCell as any).w || '').trim() : '';
          const serialStr = serialCell ? String((serialCell as any).v || (serialCell as any).w || '').trim() : '';
          if (modelStr) {
            const modelLower = modelStr.toLowerCase();
            if (modelLower.includes('rc-4hc') || modelLower.includes('rc4hc')) {
              preferLista = true;
            }
          }
          if (serialStr) {
            defaultSensorSerial = serialStr;
          }
        } catch (e) {
          // ignore, proceed with default behaviour
        }
      }

      // Choose sheet with vendor-aware heuristics
      let sheetName = workbook.SheetNames[0];
      const sheetNamesLower = workbook.SheetNames.map((s: string) => s.toLowerCase());
      // Elitech preference already captured by preferLista (RC-4HC)
      if (preferLista && workbook.SheetNames.includes('Lista')) {
        sheetName = 'Lista';
      } else if (options.vendorGuess) {
        switch (options.vendorGuess) {
          case 'Elitech':
            // Common possibilities: Lista, Dados, Data, Registros
            for (const candidate of ['Lista', 'Dados', 'Data', 'Registros']) {
              if (workbook.SheetNames.includes(candidate)) { sheetName = candidate; break; }
            }
            break;
          case 'Novus':
            for (const candidate of ['Dados', 'Data', 'Log', 'Medicoes']) {
              if (workbook.SheetNames.includes(candidate)) { sheetName = candidate; break; }
            }
            break;
          case 'Instrutemp':
            for (const candidate of ['Registros', 'Dados', 'Lista']) {
              if (workbook.SheetNames.includes(candidate)) { sheetName = candidate; break; }
            }
            break;
          case 'Testo':
            for (const candidate of ['Data', 'Log', 'Measurements']) {
              if (workbook.SheetNames.includes(candidate)) { sheetName = candidate; break; }
            }
            break;
          default:
            break;
        }
      }
      logger.info('Selected sheet', { chosen: sheetName, vendorGuess: options.vendorGuess, allSheets: workbook.SheetNames });
      if (!sheetName) throw new Error('Planilha não encontrada');
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) throw new Error('Worksheet não encontrada');
      const range = XLSXLib.utils.decode_range(worksheet['!ref'] as string);
      const headerRow = XLSXLib.utils.sheet_to_json(worksheet, { header: 1, range: { s: { r: range.s.r, c: range.s.c }, e: { r: range.s.r, c: range.e.c } } }) as any[];
      const headers: string[] = (headerRow[0] || []).map((h: any) => String(h || '').trim());
      if (headers.length === 0) {
        throw new Error('Cabeçalhos não encontrados no Excel');
      }
      const mapping = this.detectColumnStructure(Object.fromEntries(headers.map(h => [h, ''])));
      // If we detected a sensor serial in Resumo, attach to options so processChunk can use as fallback
      if (defaultSensorSerial) {
        options.fileSensorSerial = defaultSensorSerial;
      }
      this.validateColumnMapping(mapping);
      const chunkSize = Math.min(options.chunkSize || 1000, this.MAX_ROWS_PER_BATCH);
      const totalRows = range.e.r - range.s.r;
      logger.info('Starting chunk processing loop', { totalRows, chunkSize, startRow: range.s.r + 1, endRow: range.e.r });
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];
      const warnings: string[] = [];
      for (let start = range.s.r + 1; start <= range.e.r; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, range.e.r);
        logger.info('Processing chunk', { start, end, chunkSize });
        const rows = XLSXLib.utils.sheet_to_json(worksheet, { header: 1, range: { s: { r: start, c: range.s.c }, e: { r: end, c: range.e.c } }, defval: null, raw: false }) as any[];
        const objects = rows.map((arr: any[]) => Object.fromEntries(headers.map((h, idx) => [h, arr[idx]])));
        logger.info('Calling processChunk', { rowCount: objects.length });
        const chunkResults = await this.processChunk(objects, mapping, options);
        logger.info('processChunk returned', { successful: chunkResults.successful, failed: chunkResults.failed });
        successful += chunkResults.successful;
        failed += chunkResults.failed;
        errors.push(...chunkResults.errors);
        warnings.push(...chunkResults.warnings);
        await this.updateJobProgress(options.jobId, { processed: Math.min(end - range.s.r, totalRows), total: totalRows, percentage: Math.round((Math.min(end - range.s.r, totalRows) / totalRows) * 100) });
        if (end < range.e.r) {
          await new Promise(r => setTimeout(r, 50));
        }
      }
      const processingTime = Date.now() - startTime;
      processingMetricsService.recordStage(options.jobId, 'total_processing', processingTime);
      processingMetricsService.incrementCounter(options.jobId, 'rows_processed', successful);
      processingMetricsService.incrementCounter(options.jobId, 'rows_failed', failed);
      processingMetricsService.logSummary(options.jobId);
      // TODO: Implementar recordProcessingStats no performanceService
      logger.info(`Processamento concluído: ${originalName}`, { totalRows, processedRows: successful, failedRows: failed, processingTime, userId: options.userId });
      return { totalRows, processedRows: successful, failedRows: failed, errors, warnings, processingTime };
    } catch (error) {
      logger.error(`Erro ao processar arquivo Excel: ${originalName}`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async validateFile(filePath: string, originalName: string): Promise<void> {
    const stats = fs.statSync(filePath);

    // Validar tamanho do arquivo
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error(`Arquivo muito grande. Máximo permitido: 50MB`);
    }

    // Validar extensão
    const ext = originalName.toLowerCase().substring(originalName.lastIndexOf('.'));
    if (!this.ACCEPTED_FORMATS.includes(ext)) {
      throw new Error(`Formato de arquivo não suportado. Formatos aceitos: ${this.ACCEPTED_FORMATS.join(', ')}`);
    }
  }

  private detectColumnStructure(firstRow: any): ColumnMapping {
    const mapping: ColumnMapping = {};

    const possibleTimestampColumns = [
      'tempo',
      'timestamp', 'data', 'hora', 'time', 'date', 'data_hora', 'datetime',
      'data/hora', 'data e hora', 'timestamp_leitura', 'leitura_data'
    ];
    const possibleTemperatureColumns = [
      'temperatura', 'temperature', 'temp', 'temp_celsius', 'temp_c', 'temperatura_c'
    ];
    const possibleHumidityColumns = [
      'umidade', 'humidity', 'hum', 'hum_rel', 'umidade_relativa', 'humidity_rel'
    ];
    const possibleSensorColumns = [
      'sensor', 'sensor_id', 'serial', 'serial_number', 'numero_serie',
      'sensor_serial', 'id_sensor', 'sensor_id'
    ];

    Object.keys(firstRow).forEach(column => {
      const lowerColumn = column.toLowerCase().trim();

      if (possibleTimestampColumns.some(col => lowerColumn.includes(col))) {
        mapping.timestamp = column;
      } else if (possibleTemperatureColumns.some(col => lowerColumn.includes(col))) {
        mapping.temperature = column;
      } else if (possibleHumidityColumns.some(col => lowerColumn.includes(col))) {
        mapping.humidity = column;
      } else if (possibleSensorColumns.some(col => lowerColumn.includes(col))) {
        mapping.sensorId = column;
      }
    });

    return mapping;
  }

  private validateColumnMapping(mapping: ColumnMapping): void {
    if (!mapping.timestamp) {
      throw new Error('Coluna de timestamp não encontrada no arquivo');
    }
    if (!mapping.temperature) {
      throw new Error('Coluna de temperatura não encontrada no arquivo');
    }
  }

  private async processInChunks(
    data: any[],
    mapping: ColumnMapping,
    options: ProcessingOptions
  ): Promise<{ successful: number; failed: number; errors: string[]; warnings: string[] }> {
    const chunkSize = Math.min(options.chunkSize || 1000, this.MAX_ROWS_PER_BATCH);
    const results = { successful: 0, failed: 0, errors: [] as string[], warnings: [] as string[] };

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = await this.processChunk(chunk, mapping, options);

      results.successful += chunkResults.successful;
      results.failed += chunkResults.failed;
      results.errors.push(...chunkResults.errors);
      results.warnings.push(...chunkResults.warnings);

      // Atualizar progresso no Redis
      await this.updateJobProgress(options.jobId, {
        processed: i + chunk.length,
        total: data.length,
        percentage: Math.round(((i + chunk.length) / data.length) * 100)
      });

      // Pequena pausa para não sobrecarregar o sistema
      if (i + chunkSize < data.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  private async processChunk(
    chunk: any[],
    mapping: ColumnMapping,
    options: ProcessingOptions
  ): Promise<ChunkResult> {
    const sensorDataToCreate = [];
    const errors = [];
    const warnings = [];
    let successful = 0;
    let failed = 0;

    for (let index = 0; index < chunk.length; index++) {
      const row = chunk[index];
      const rowNumber = index + 1;

      try {
        const parsedData = this.parseRow(row, mapping);
        // Temporary debug: log first few parsed rows to help diagnose parsing issues
        try {
          if (index < 10) {
            logger.info('Parsed sample row', { rowNumber, parsedData, fileName: options.fileName, jobId: options.jobId });
          }
        } catch (e) {
          // ignore logging errors
        }
        // If sensorId not present in rows, use file-level detected serial as fallback
        if ((parsedData.sensorId === 'unknown' || !parsedData.sensorId) && options.fileSensorSerial) {
          parsedData.sensorId = options.fileSensorSerial;
        }

        // Validação com Zod schema
        if (options.validateData) {
          try {
            const validatedData = sensorDataRowSchema.parse({
              sensorId: parsedData.sensorId,
              timestamp: parsedData.timestamp,
              temperature: parsedData.temperature,
              humidity: parsedData.humidity,
            });

            // Validação adicional customizada
            const validation = await validateSensorData(parsedData);
            if (!validation.isValid) {
              const errorDetails = validation.errors.map(e => `[${e}]`).join(' ');
              errors.push(`Linha ${rowNumber}: ${errorDetails}`);
              failed++;
              continue;
            }

            if (validation.warnings && validation.warnings.length > 0) {
              const warningDetails = validation.warnings.map(w => `[${w}]`).join(' ');
              warnings.push(`Linha ${rowNumber}: ${warningDetails}`);
            }

            sensorDataToCreate.push({
              sensorId: validatedData.sensorId,
              timestamp: validatedData.timestamp,
              temperature: validatedData.temperature,
              humidity: validatedData.humidity ?? null,
              fileName: options.fileName,
              rowNumber: rowNumber,
              validationId: options.validationId ?? null,
              createdAt: new Date()
            });

            successful++;

          } catch (zodError) {
            if (zodError instanceof z.ZodError) {
              const fieldErrors = zodError.issues.map((e: any) =>
                `${e.path.join('.')}: ${e.message}`
              ).join('; ');
              errors.push(`Linha ${rowNumber}: ${fieldErrors}`);
            } else {
              throw zodError;
            }
            failed++;
            continue;
          }
        } else {
          // Sem validação, apenas inserir
          sensorDataToCreate.push({
            sensorId: parsedData.sensorId,
            timestamp: parsedData.timestamp,
            temperature: parsedData.temperature,
            humidity: parsedData.humidity ?? null,
            fileName: options.fileName,
            rowNumber: rowNumber,
            validationId: options.validationId ?? null,
            createdAt: new Date()
          });
          successful++;
        }
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        errors.push(`Linha ${rowNumber}: ${errorMsg}`);

        // Log detalhado para debugging
        logger.debug('Error processing row', {
          rowNumber,
          error: errorMsg,
          stack: errorStack,
          rowData: row
        });
      }
    }

    // Inserir dados válidos em lote
    if (sensorDataToCreate.length > 0) {
      try {
        await prisma.sensorData.createMany({
          data: sensorDataToCreate,
          skipDuplicates: true
        });
      } catch (error) {
        logger.error('Erro ao inserir dados em lote', error);
        errors.push('Erro ao inserir dados no banco de dados');
      }
    }

    return { successful, failed, errors, warnings };
  }

  private parseRow(row: any, mapping: ColumnMapping): ParsedRow {
    const sensorIdCol = mapping.sensorId ?? '';
    const timestampCol = mapping.timestamp ?? '';
    const tempCol = mapping.temperature ?? '';
    const humidityCol = mapping.humidity ?? '';

    return {
      sensorId: this.parseSensorId(row[sensorIdCol]),
      timestamp: this.parseTimestamp(row[timestampCol]),
      temperature: this.parseTemperature(row[tempCol]),
      humidity: humidityCol ? this.parseHumidity(row[humidityCol]) : null
    };
  }

  private parseSensorId(value: any): string {
    if (!value || value === null || value === '') {
      return 'unknown';
    }
    return String(value).trim();
  }

  private parseTimestamp(value: any): Date {
    if (!value) {
      throw new Error('Timestamp não pode ser vazio');
    }

    // Detectar formato automático
    if (typeof value === 'number') {
      // Excel serial date
      return this.excelSerialToDate(value);
    } else if (typeof value === 'string') {
      const strValue = value.trim();

      // Elitech format: YYYY-MM-DD HH:MM:SS -> normalize to UTC
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(strValue)) {
        const m = strValue.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/);
        if (m) {
          const [, Y, M, D, hh, mm, ss] = m;
          return new Date(Date.UTC(Number(Y), Number(M) - 1, Number(D), Number(hh), Number(mm), Number(ss)));
        }
      }

      // DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM
      const brMatch = strValue.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
      if (brMatch) {
        const [_, day, month, year, hour, minute, second] = brMatch;
        return new Date(
          Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour || 0), Number(minute || 0), Number(second || 0))
        );
      }

      // Tentar parsear diferentes formatos
      const formats = [
        'YYYY-MM-DD HH:mm:ss',
        'DD/MM/YYYY HH:mm:ss',
        'MM/DD/YYYY HH:mm:ss',
        'ISO8601',
        'DD-MM-YYYY HH:mm:ss',
        'YYYY/MM/DD HH:mm:ss'
      ];

      for (const format of formats) {
        const date = this.tryParseDate(value, format);
        if (date) return date;
      }
    }

    throw new Error(`Formato de timestamp inválido: ${value}`);
  }

  private parseTemperature(value: any): number {
    const temp = parseFloat(value);
    if (isNaN(temp)) {
      throw new Error(`Temperatura inválida: ${value}`);
    }

    // Validar faixa razoável
    if (temp < -50 || temp > 100) {
      throw new Error(`Temperatura fora da faixa aceitável (-50°C a 100°C): ${temp}°C`);
    }

    return temp;
  }

  private parseHumidity(value: any): number {
    const humidity = parseFloat(value);
    if (isNaN(humidity)) {
      throw new Error(`Umidade inválida: ${value}`);
    }

    // Validar faixa de umidade
    if (humidity < 0 || humidity > 100) {
      throw new Error(`Umidade fora da faixa aceitável (0% a 100%): ${humidity}%`);
    }

    return humidity;
  }

  private excelSerialToDate(serial: number): Date {
    const excelEpoch = new Date(1900, 0, 1);
    const days = serial - 2; // Excel bug com 29/02/1900
    return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private tryParseDate(value: string, format: string): Date | null {
    try {
      if (format === 'ISO8601') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      }

      // Implementar parsing para outros formatos
      // Por simplicidade, vamos usar o construtor Date por enquanto
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  private async updateJobProgress(jobId: string, progress: any): Promise<void> {
    try {
      await redisService.set(`job:progress:${jobId}`, JSON.stringify(progress), 3600); // 1 hora
    } catch (error) {
      logger.error('Erro ao atualizar progresso do job', error);
    }
  }
}

// Singleton instance
export const excelProcessingService = new ExcelProcessingService();

// Interface para validação de dados (será implementada posteriormente)
export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}
