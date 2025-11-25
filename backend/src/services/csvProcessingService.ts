import * as fs from 'fs/promises';
import * as fsStream from 'fs';
import { parse } from 'csv-parse';
import { prisma } from '../lib/prisma.js';
import { validateSensorData } from '../utils/validationUtils.js';
import { logger } from '../utils/logger.js';
import { redisService } from './redisService.js';

interface CSVProcessingOptions {
  suitcaseId: string;
  userId: string;
  validateData: boolean;
  chunkSize: number;
  jobId: string;
  fileName: string;
  delimiter?: string;
  encoding?: BufferEncoding;
  hasHeader?: boolean;
  validationId?: string;
  forceSensorId?: string;
}

interface CSVProcessingResult {
  totalRows: number;
  processedRows: number;
  failedRows: number;
  errors: string[];
  warnings: string[];
  processingTime: number;
}

interface ColumnMapping {
  timestamp?: string;
  temperature?: string;
  humidity?: string;
  sensorId?: string;
}

export class CSVProcessingService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_ROWS_PER_BATCH = 10000;
  private readonly SUPPORTED_ENCODINGS = ['utf8', 'latin1', 'iso-8859-1', 'windows-1252'];
  private readonly COMMON_DELIMITERS = [',', ';', '\t', '|'];

  async processCSVFile(
    filePath: string,
    originalName: string,
    options: CSVProcessingOptions
  ): Promise<CSVProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Validações iniciais
      await this.validateFile(filePath, originalName);
      
      // Detectar encoding e delimitador automaticamente
      const encoding = options.encoding || await this.detectEncoding(filePath);
      const delimiter = options.delimiter || await this.detectDelimiter(filePath, encoding);
      
      const result = await this.parseAndProcessCSVStream(filePath, {
        ...options,
        delimiter,
        encoding
      });
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Processamento CSV concluído: ${originalName}`, {
        totalRows: result.totalRows,
        processedRows: result.processedRows,
        failedRows: result.failedRows,
        processingTime
      });
      
      return {
        ...result,
        processingTime
      };
      
    } catch (error) {
      logger.error(`Erro ao processar arquivo CSV: ${originalName}`, error);
      throw error;
    }
  }
  
  private async validateFile(filePath: string, originalName: string): Promise<void> {
    const stats = await fs.stat(filePath);
    
    // Validar tamanho do arquivo
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error(`Arquivo muito grande. Máximo permitido: 50MB`);
    }
    
    // Validar extensão
    if (!originalName.toLowerCase().endsWith('.csv')) {
      throw new Error('Arquivo deve ter extensão .csv');
    }
  }
  
  private async detectEncoding(filePath: string): Promise<BufferEncoding> {
    try {
      // Ler uma amostra do arquivo para detectar encoding
      const buffer = await fs.readFile(filePath, null);
      
      // Tentar diferentes encodings
      for (const encoding of this.SUPPORTED_ENCODINGS) {
        try {
          const content = buffer.toString(encoding as BufferEncoding);
          // Verificar se o conteúdo faz sentido (não tem caracteres estranhos)
          if (this.isValidText(content)) {
            return encoding as BufferEncoding;
          }
        } catch {
          continue;
        }
      }
      
      // Default para UTF-8 se não conseguir detectar
      return 'utf8';
    } catch (error) {
      logger.warn('Erro ao detectar encoding, usando UTF-8 como padrão', error);
      return 'utf8';
    }
  }
  
  private isValidText(text: string): boolean {
    // Verificar se o texto não tem muitos caracteres de controle inválidos
    const invalidChars = text.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g);
    if (invalidChars && invalidChars.length > text.length * 0.01) {
      return false; // Mais de 1% de caracteres inválidos
    }
    return true;
  }
  
  private async detectDelimiter(filePath: string, encoding: BufferEncoding): Promise<string> {
    try {
      // Ler primeiras linhas do arquivo
      const content = await fs.readFile(filePath, encoding);
      const lines = content.split('\n').slice(0, 10); // Primeiras 10 linhas
      
      // Testar diferentes delimitadores
      const delimiterScores = new Map<string, number>();
      
      for (const delimiter of this.COMMON_DELIMITERS) {
        let totalColumns = 0;
        let consistentColumns = 0;
        
        for (const line of lines) {
          if (line.trim()) {
            const columns = line.split(delimiter);
            totalColumns += columns.length;
            
            // Verificar consistência de número de colunas
            if (consistentColumns === 0) {
              consistentColumns = columns.length;
            } else if (consistentColumns === columns.length) {
              consistentColumns = columns.length;
            }
          }
        }
        
        const avgColumns = totalColumns / lines.filter(line => line.trim()).length;
        const score = avgColumns > 1 ? (consistentColumns / lines.length) * avgColumns : 0;
        delimiterScores.set(delimiter, score);
      }
      
      // Escolher delimitador com melhor pontuação
      let bestDelimiter = ',';
      let bestScore = 0;
      
      for (const [delimiter, score] of delimiterScores) {
        if (score > bestScore) {
          bestScore = score;
          bestDelimiter = delimiter;
        }
      }
      
      return bestDelimiter;
    } catch (error) {
      logger.warn('Erro ao detectar delimitador, usando vírgula como padrão', error);
      return ',';
    }
  }
  
  private async parseAndProcessCSVStream(
    filePath: string,
    options: CSVProcessingOptions
  ): Promise<CSVProcessingResult> {
    const startTime = Date.now();
    const results = {
      totalRows: 0,
      processedRows: 0,
      failedRows: 0,
      errors: [] as string[],
      warnings: [] as string[]
    };
    const chunkSize = Math.min(options.chunkSize || 1000, this.MAX_ROWS_PER_BATCH);
    let buffer: any[] = [];
    let mapping: ColumnMapping | null = null;
    let processedCount = 0;
    
    return new Promise((resolve, reject) => {
      const stream = fsStream.createReadStream(filePath, { encoding: options.encoding || 'utf8' });
      const parser = parse({
        delimiter: options.delimiter || ',',
        columns: options.hasHeader !== false,
        skip_empty_lines: true,
        trim: true
      });
      
      const processBuffer = async () => {
        if (buffer.length === 0) return;
        try {
          if (!mapping && buffer[0]) {
            mapping = this.detectColumnStructure(buffer[0]);
          }
          const chunkResults = await this.processChunk(buffer, mapping || {}, options);
          results.processedRows += chunkResults.successful;
          results.failedRows += chunkResults.failed;
          results.errors.push(...chunkResults.errors);
          results.warnings.push(...chunkResults.warnings);
          processedCount += buffer.length;
          buffer = [];
          await this.updateJobProgress(options.jobId, {
            processed: processedCount,
            total: results.totalRows,
            percentage: results.totalRows > 0 ? Math.round((processedCount / results.totalRows) * 100) : 0
          });
        } catch (err) {
          reject(err);
        }
      };
      
      parser.on('readable', async () => {
        let record;
        // @ts-ignore
        while ((record = parser.read()) !== null) {
          results.totalRows++;
          buffer.push(record);
          if (buffer.length >= chunkSize) {
            // pause parser while processing
            parser.pause();
            processBuffer().then(() => parser.resume()).catch(reject);
          }
        }
      });
      
      parser.on('error', (err) => {
        results.errors.push(`Erro de parsing CSV: ${err.message}`);
      });
      
      parser.on('end', () => {
        (async () => {
          await processBuffer();
          const processingTime = Date.now() - startTime;
          resolve({ ...results, processingTime });
        })().catch(reject);
      });
      
      stream.on('error', (err) => reject(err));
      stream.pipe(parser);
    });
  }
  
  private detectColumnStructure(firstRow: any): ColumnMapping {
    const mapping: ColumnMapping = {};
    const columns = Object.keys(firstRow);
    
    const possibleTimestampColumns = [
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
    
    columns.forEach(column => {
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
  
  private async processChunk(
    chunk: any[],
    mapping: ColumnMapping,
    options: CSVProcessingOptions
  ): Promise<{ successful: number; failed: number; errors: string[]; warnings: string[] }> {
    let sensorDataToCreate = [];
    const errors = [];
    const warnings = [];
    let successful = 0;
    let failed = 0;
    
    for (let index = 0; index < chunk.length; index++) {
      const row = chunk[index];
      const rowNumber = index + 1;
      
      try {
        const parsedData = this.parseRow(row, mapping);
        
        // Validar dados se solicitado
        if (options.validateData) {
          const validation = await validateSensorData(parsedData);
          if (!validation.isValid) {
            errors.push(`Linha ${rowNumber}: ${validation.errors.join(', ')}`);
            failed++;
            continue;
          }
          
          if (validation.warnings && validation.warnings.length > 0) {
            warnings.push(`Linha ${rowNumber}: ${validation.warnings.join(', ')}`);
          }
        }
        
        // Prefer forced sensor id (from suitcase matching). If not present, use parsed sensor id when valid.
        const finalSensorId = options.forceSensorId ?? ((parsedData.sensorId && parsedData.sensorId !== 'unknown') ? parsedData.sensorId : null);
        // Normalize sensor id to avoid hidden characters or extra whitespace
        const normalizedSensorId = finalSensorId == null ? null : String(finalSensorId).trim();

        if (!normalizedSensorId) {
          failed++;
          errors.push(`Linha ${rowNumber}: Sensor não encontrado ou inválido`);
          continue;
        }

        sensorDataToCreate.push({
          sensorId: normalizedSensorId,
          timestamp: parsedData.timestamp,
          temperature: parsedData.temperature,
          humidity: parsedData.humidity,
          fileName: options.fileName,
          rowNumber: rowNumber,
          validationId: options.validationId ?? null,
          createdAt: new Date()
        });
        
        successful++;
      } catch (error) {
        failed++;
        errors.push(`Linha ${rowNumber}: ${(error as any)?.message ?? String(error)}`);
      }
    }
    
    // Inserir dados válidos em lote
    if (sensorDataToCreate.length > 0) {
      try {
        // Structured summary (kept for log parsers)
        logger.info('DEBUG_SENSOR_DATA_BATCH', {
          jobId: options.jobId,
          fileName: options.fileName,
          forceSensorId: (options as any).forceSensorId ?? null,
          count: sensorDataToCreate.length,
          sample: sensorDataToCreate.slice(0, 10)
        });

        // Console logs to increase chances of visibility in container logs
        try {
          console.log(`DEBUG_SENSOR_IDS job=${options.jobId} file=${options.fileName} ids=${sensorDataToCreate.map(d => d.sensorId).join(',')}`);
          console.log('DEBUG_SENSOR_DATA_SAMPLE', JSON.stringify(sensorDataToCreate.slice(0, 10)));
        } catch (e) {
          // ignore console logging failures
        }
        // Verify sensor IDs exist to avoid FK violations
        const sensorIds = Array.from(new Set(sensorDataToCreate.map(d => d.sensorId)));
        const existingSensors = await prisma.sensor.findMany({ where: { id: { in: sensorIds } }, select: { id: true } });
        const existingIds = new Set(existingSensors.map(s => s.id));
        const missingIds = sensorIds.filter(id => !existingIds.has(id));

        // Log the lookup results to help diagnose FK violations
        try {
          logger.info('EXISTING_SENSORS_CHECK', {
            jobId: options.jobId,
            fileName: options.fileName,
            sensorIds,
            existingIds: Array.from(existingIds),
            missingIds
          });
        } catch (e) {
          // ignore logging failures
        }

        // Additional diagnostic: record length and hex representation
        try {
          const sensorHexes = sensorIds.map(id => {
            const s = id == null ? String(id) : String(id);
            let hex = null;
            try {
              hex = Buffer.from(s).toString('hex');
            } catch (e) {
              hex = 'hex-failed';
            }
            return { id: s, len: s.length, hex };
          });

          logger.info('EXISTING_SENSOR_HEX', {
            jobId: options.jobId,
            fileName: options.fileName,
            sensorHexes
          });

          try {
            console.log('EXISTING_SENSOR_HEX', JSON.stringify({ jobId: options.jobId, fileName: options.fileName, sensorHexes }));
          } catch (e) {}
        } catch (e) {
          // ignore
        }

        // Build final payload: remove rows referencing missing sensors and record errors
        if (missingIds.length > 0) {
          logger.error('MISSING_SENSORS_BEFORE_INSERT', { jobId: options.jobId, fileName: options.fileName, missingIds });
          const beforeCount = sensorDataToCreate.length;
          sensorDataToCreate = sensorDataToCreate.filter(d => existingIds.has(d.sensorId));
          const removedCount = beforeCount - sensorDataToCreate.length;
          if (removedCount > 0) {
            errors.push(`${removedCount} linhas removidas por sensor inexistente: ${missingIds.join(',')}`);
          }
        }

        if (sensorDataToCreate.length === 0) {
          logger.warn('Nenhuma linha válida para inserir após remover sensores faltantes', { jobId: options.jobId, fileName: options.fileName });
          return { successful, failed, errors, warnings };
        }

        // Insert per-row in chunks to avoid a createMany FK edge-case
        const CHUNK = 100;
        for (let i = 0; i < sensorDataToCreate.length; i += CHUNK) {
          const chunk = sensorDataToCreate.slice(i, i + CHUNK);
          try {
            const tx = chunk.map(d => prisma.sensorData.create({ data: d }));
            await prisma.$transaction(tx);
          } catch (e) {
            logger.error('Erro ao inserir chunk de sensor_data', { jobId: options.jobId, fileName: options.fileName, index: i, error: e });
            errors.push('Erro ao inserir dados no banco de dados');
          }
        }
      } catch (error) {
        logger.error('Erro ao inserir dados em lote', error);
        try {
          logger.error('BATCH_PAYLOAD_SNAPSHOT', {
            jobId: options.jobId,
            fileName: options.fileName,
            count: sensorDataToCreate.length,
            sensorIds: sensorDataToCreate.map(d => d.sensorId),
            sample: sensorDataToCreate.slice(0, 10)
          });
            // Also print snapshot to stdout so it's visible in plain container logs
            try {
              console.log('BATCH_PAYLOAD_SNAPSHOT', JSON.stringify({ jobId: options.jobId, fileName: options.fileName, count: sensorDataToCreate.length, sensorIds: sensorDataToCreate.map(d => d.sensorId), sample: sensorDataToCreate.slice(0,10) }));
            } catch (e) {
              // ignore
            }
        } catch (e) {
          // ignore snapshot failures
        }
        errors.push('Erro ao inserir dados no banco de dados');
      }
    }
    
    return { successful, failed, errors, warnings };
  }
  
  private parseRow(row: any, mapping: ColumnMapping): any {
    return {
      sensorId: this.parseSensorId(row[mapping.sensorId || '']),
      timestamp: this.parseTimestamp(row[mapping.timestamp || '']),
      temperature: this.parseTemperature(row[mapping.temperature || '']),
      humidity: mapping.humidity ? this.parseHumidity(row[mapping.humidity]) : null
    };
  }
  
  private parseSensorId(value: any): string {
    if (!value || value === null || value === '') {
      return 'unknown';
    }
    try {
      let s = String(value).trim();
      // Normalize unicode (NFKC) and strip invisible/control characters (including zero-width)
      if (s.normalize) {
        s = s.normalize('NFKC');
      }
      // Remove control characters and zero-width/byte-order-mark
      s = s.replace(/[\p{C}\u200B-\u200D\uFEFF]/gu, '');
      s = s.trim();
      if (s === '') return 'unknown';
      return s;
    } catch (e) {
      return String(value).trim();
    }
  }
  
  private parseTimestamp(value: any): Date {
    if (!value) {
      throw new Error('Timestamp não pode ser vazio');
    }
    
    // Tentar diferentes formatos de data
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Formato de timestamp inválido: ${value}`);
    }
    
    return date;
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
  
  private async updateJobProgress(jobId: string, progress: any): Promise<void> {
    try {
      await redisService.set(`job:progress:${jobId}`, JSON.stringify(progress), 3600); // 1 hora
    } catch (error) {
      logger.error('Erro ao atualizar progresso do job', error);
    }
  }
}

// Singleton instance
export const csvProcessingService = new CSVProcessingService();
