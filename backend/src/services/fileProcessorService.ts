import ExcelJS from 'exceljs';
import { parse as parseCSV } from 'csv-parse/sync';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';

export interface ProcessingResult {
  fileName: string;
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  sensorId?: string;
  sensorSerialNumber?: string;
}

export interface FileProcessingJob {
  id: string;
  files: Express.Multer.File[];
  suitcaseId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: ProcessingResult[];
  createdAt: Date;
  completedAt?: Date;
}

export class FileProcessorService {
  private jobs = new Map<string, FileProcessingJob>();

  async processFiles(
    files: Express.Multer.File[],
    suitcaseId: string,
    userId: string
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: FileProcessingJob = {
      id: jobId,
      files,
      suitcaseId,
      userId,
      status: 'pending',
      results: [],
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    
    // Process files asynchronously
    this.processFilesAsync(jobId).catch(error => {
      logger.error('File processing error:', { jobId, error: error instanceof Error ? error.message : String(error) });
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.completedAt = new Date();
      }
    });

    return jobId;
  }

  async getJobStatus(jobId: string): Promise<FileProcessingJob | null> {
    return this.jobs.get(jobId) || null;
  }

  private async processFilesAsync(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    logger.info('Starting file processing job:', { jobId, filesCount: job.files.length });

    try {
      // Get suitcase with sensors and their types
      const suitcase = await prisma.suitcase.findUnique({
        where: { id: job.suitcaseId },
        include: {
          sensors: {
            include: {
              sensor: {
                include: {
                  type: true,
                },
              },
            },
          },
        },
      });

      if (!suitcase) {
        throw new Error('Suitcase not found');
      }

      // Process each file
      for (const file of job.files) {
        try {
          const result = await this.processFile(file, suitcase);
          job.results.push(result);
        } catch (error) {
          job.results.push({
            fileName: file.originalname,
            success: false,
            recordsProcessed: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
          });
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();

      logger.info('File processing job completed:', {
        jobId,
        totalFiles: job.files.length,
        successfulFiles: job.results.filter(r => r.success).length,
        totalRecords: job.results.reduce((sum, r) => sum + r.recordsProcessed, 0),
      });
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      logger.error('File processing job failed:', { jobId, error: error instanceof Error ? error.message : error });
    }
  }

  private async processFile(
    file: Express.Multer.File,
    suitcase: any
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      fileName: file.originalname,
      success: false,
      recordsProcessed: 0,
      errors: [],
    };

    try {
      // Determine file type and parse data
      const data = await this.parseFile(file);
      
      // Try to match file to a sensor based on filename or content
      const matchedSensor = await this.matchFileToSensor(file, data, suitcase);
      
      if (!matchedSensor) {
        result.errors.push('Could not match file to any sensor in the suitcase');
        return result;
      }

      result.sensorId = matchedSensor.sensor.id;
      result.sensorSerialNumber = matchedSensor.sensor.serialNumber;

      // Process data according to sensor type configuration
      const processedData = await this.processDataBySensorType(
        data,
        matchedSensor.sensor.type,
        file.originalname
      );

      if (processedData.length === 0) {
        result.errors.push('No valid data found in file');
        return result;
      }

      // Save data to database
      await this.saveDataToDatabase(processedData, matchedSensor.sensor.id);

      result.success = true;
      result.recordsProcessed = processedData.length;

      logger.info('File processed successfully:', {
        fileName: file.originalname,
        sensorId: matchedSensor.sensor.id,
        recordsProcessed: processedData.length,
      });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown processing error');
      logger.error('File processing error:', {
        fileName: file.originalname,
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      try {
        if ((file as any).path) {
          await fs.unlink((file as any).path).catch(() => {});
        }
      } catch {}
    }

    return result;
  }

  private async parseFile(file: Express.Multer.File): Promise<any[][]> {
    const extension = file.originalname.toLowerCase().split('.').pop();

    switch (extension) {
      case 'xlsx':
      case 'xls':
        return this.parseExcelFile(file);
      case 'csv':
        return this.parseCSVFile(file);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  private async parseExcelFile(file: Express.Multer.File): Promise<any[][]> {
  const workbook = new ExcelJS.Workbook();
  let buf: Buffer;
  if (file.buffer) {
    buf = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer as any);
  } else if ((file as any).path) {
    buf = await fs.readFile((file as any).path);
  } else {
    throw new Error('Arquivo não possui buffer ou path válido');
  }
  await workbook.xlsx.load(buf as any);
    
    const worksheet = workbook.getWorksheet(1); // Get first worksheet
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const data: any[][] = [];
    worksheet.eachRow((row, rowNumber) => {
      const rowData: any[] = [];
      row.eachCell((cell, colNumber) => {
        rowData[colNumber - 1] = cell.value;
      });
      data.push(rowData);
    });

    return data;
  }

  private parseCSVFile(file: Express.Multer.File): any[][] {
    const content = file.buffer
      ? file.buffer.toString('utf-8')
      : (file as any).path
        ? (require('fs').readFileSync((file as any).path, 'utf-8'))
        : '';
    return parseCSV(content, {
      skip_empty_lines: true,
      relax_column_count: true,
    });
  }

  private async matchFileToSensor(
    file: Express.Multer.File,
    data: any[][],
    suitcase: any
  ): Promise<any | null> {
    // Strategy 1: Match by filename containing serial number
    for (const suitcaseSensor of suitcase.sensors) {
      const serialNumber = suitcaseSensor.sensor.serialNumber.toLowerCase();
      const fileName = file.originalname.toLowerCase();
      
      if (fileName.includes(serialNumber)) {
        return suitcaseSensor;
      }
    }

    // Strategy 2: If only one sensor in suitcase, use it
    if (suitcase.sensors.length === 1) {
      return suitcase.sensors[0];
    }

    // Strategy 3: Try to find sensor serial in file content (first few rows)
    const searchRows = data.slice(0, 5); // Check first 5 rows
    for (const suitcaseSensor of suitcase.sensors) {
      const serialNumber = suitcaseSensor.sensor.serialNumber.toLowerCase();
      
      for (const row of searchRows) {
        for (const cell of row) {
          if (cell && cell.toString().toLowerCase().includes(serialNumber)) {
            return suitcaseSensor;
          }
        }
      }
    }

    // If no match found, create a new sensor and associate with suitcase (fallback)
    try {
      // Attempt to extract a reasonable serial from filename
      const serialMatch = file.originalname.match(/[A-Z]{2}\d{6,}/i);
      let newSerial = serialMatch ? serialMatch[0] : file.originalname.replace(/\.[^/.]+$/, '').substring(0, 30);
      newSerial = String(newSerial).replace(/[^a-zA-Z0-9_-]/g, '_');

      // Ensure a sensor type exists
      let sensorType = await prisma.sensorType.findFirst({ where: { name: 'Generic Logger' } });
      if (!sensorType) {
        sensorType = await prisma.sensorType.create({ data: {
          name: 'Generic Logger',
          description: 'Auto-created sensor type for imported files',
          dataConfig: {
            temperatureRange: { min: -40, max: 85 },
            humidityRange: { min: 0, max: 100 },
            accuracy: { temperature: 0.5, humidity: 3 }
          }
        }});
      }

      const newSensor = await prisma.sensor.create({ data: {
        serialNumber: newSerial,
        model: 'Auto-detected',
        typeId: sensorType.id
      }});

      const suitcaseSensor = await prisma.suitcaseSensor.create({ data: { suitcaseId: suitcase.id, sensorId: newSensor.id }, include: { sensor: { include: { type: true } } } });

      logger.info('Created new sensor as fallback for file', { fileName: file.originalname, sensorId: newSensor.id, serial: newSerial });
      return suitcaseSensor;
    } catch (createErr) {
      logger.error('Failed to create fallback sensor', { fileName: file.originalname, error: createErr instanceof Error ? createErr.message : String(createErr) });
      return null;
    }
  }

  private async processDataBySensorType(
    data: any[][],
    sensorType: any,
    fileName: string
  ): Promise<any[]> {
    const config = sensorType.dataConfig;
    const processedData: any[] = [];

    // Skip header rows if configured
    const startRow = config.startRow - 1; // Convert to 0-based index
    const dataRows = data.slice(startRow);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || !Array.isArray(row)) continue;
      const rowNumber = startRow + i + 1; // 1-based row number for logging

      try {
        // Extract temperature (required)
  const tempColumnIndex = this.columnLetterToIndex(config.temperatureColumn);
  const temperature = this.parseNumber(row[tempColumnIndex]);
        
        if (temperature === null) {
          continue; // Skip rows without valid temperature
        }

        // Extract humidity (optional)
        let humidity: number | null = null;
        if (config.humidityColumn) {
          const humidityColumnIndex = this.columnLetterToIndex(config.humidityColumn);
          humidity = this.parseNumber(row[humidityColumnIndex]);
        }

        // Extract timestamp (required)
        const timestampColumnIndex = this.columnLetterToIndex(config.timestampColumn);
        const timestamp = this.parseTimestamp(row[timestampColumnIndex], config.dateFormat);
        
        if (!timestamp) {
          continue; // Skip rows without valid timestamp
        }

        processedData.push({
          temperature,
          humidity,
          timestamp,
          fileName,
          rowNumber,
        });

      } catch (error) {
        logger.warn('Error processing row:', {
          fileName,
          rowNumber,
          error: error instanceof Error ? error.message : error,
        });
        // Continue processing other rows
      }
    }

    return processedData;
  }

  private columnLetterToIndex(letter: string): number {
    let result = 0;
    for (let i = 0; i < letter.length; i++) {
      result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return result - 1; // Convert to 0-based index
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const num = parseFloat(value.toString().replace(',', '.'));
    return isNaN(num) ? null : num;
  }

  private parseTimestamp(value: any, format: string): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Handle Excel date numbers
    if (typeof value === 'number') {
      // Excel date serial number (days since 1900-01-01)
      // CORREÇÃO: Usar (value - 2) para compensar o bug do Excel 1900
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle string dates
    const dateStr = value.toString().trim();
    
    // Prefer explicit Brazilian format (dd/mm/yyyy) before relying on native parse
    const brWithTime = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{1,2}))?)?$/.exec(dateStr);
    if (brWithTime) {
      const [, dd, mm, yy, hh = '0', mi = '0', ss = '0'] = brWithTime;
      const year = yy.length === 2 ? ((Number(yy) >= 50 ? 1900 : 2000) + Number(yy)) : Number(yy);
      const dt = new Date(year, Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
      return isNaN(dt.getTime()) ? null : dt;
    }

    // ISO / YYYY-MM-DD with optional time
    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{1,2}))?)?$/.exec(dateStr);
    if (isoMatch) {
      const [, Y, M, D, hh = '0', mm = '0', ss = '0'] = isoMatch;
      const dt = new Date(Number(Y), Number(M) - 1, Number(D), Number(hh), Number(mm), Number(ss));
      return isNaN(dt.getTime()) ? null : dt;
    }

    // Fallback to native Date (covers ISO variants), but avoid US-style ambiguity when possible
    const native = new Date(dateStr);
    return isNaN(native.getTime()) ? null : native;
  }

  private async saveDataToDatabase(data: any[], sensorId: string): Promise<void> {
    // Save in batches to avoid memory issues
    const batchSize = 1000;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      await prisma.sensorData.createMany({
        data: batch.map(item => ({
          sensorId,
          timestamp: item.timestamp,
          temperature: item.temperature,
          humidity: item.humidity,
          fileName: item.fileName,
          rowNumber: item.rowNumber,
        })),
        skipDuplicates: true,
      });
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup old jobs (call periodically)
  cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < cutoffTime) {
        this.jobs.delete(jobId);
      }
    }
  }
}

export const fileProcessorService = new FileProcessorService();
