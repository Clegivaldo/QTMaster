import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { CSVProcessingService } from './csvProcessingService.js';
import { ExcelProcessingService } from './excelProcessingService.js';
import { detectFormat, sampleFile } from '../parsers/heuristics.js';
import { redisService } from './redisService.js';
import { performanceService } from './performanceService.js';

export interface EnhancedProcessingResult {
  fileName: string;
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
  warnings: string[];
  sensorId?: string;
  sensorSerialNumber?: string;
  processingTime: number;
  detailedErrors?: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
}

export interface EnhancedFileProcessingJob {
  id: string;
  files: Express.Multer.File[];
  suitcaseId: string;
  validationId: string | undefined;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'fallback_pending';
  results: EnhancedProcessingResult[];
  createdAt: Date;
  completedAt?: Date;
  totalProgress: number;
}

export class EnhancedFileProcessorService {
  private jobs = new Map<string, EnhancedFileProcessingJob>();
  private csvService = new CSVProcessingService();
  private excelService = new ExcelProcessingService();

  async processFiles(
    files: Express.Multer.File[],
    suitcaseId: string,
    userId: string,
    validationId?: string
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: EnhancedFileProcessingJob = {
      id: jobId,
      files,
      suitcaseId,
      validationId,
      userId,
      status: 'pending',
      results: [],
      createdAt: new Date(),
      totalProgress: 0,
    };

    this.jobs.set(jobId, job);
    // Persist a sanitized job representation immediately to Redis so polling clients
    // can get job metadata even if the process restarts.
    try {
      const sanitizedInitialJob = {
        id: job.id,
        suitcaseId: job.suitcaseId,
        validationId: job.validationId,
        userId: job.userId,
        status: job.status,
        createdAt: job.createdAt,
        totalProgress: job.totalProgress,
        files: job.files.map(f => ({ originalname: f.originalname, mimetype: f.mimetype, size: f.size })),
        // ensure consumers always have an array to work with
        results: [] as EnhancedProcessingResult[],
      } as Partial<EnhancedFileProcessingJob> & { files: Array<{ originalname: string; mimetype: string; size: number }>; results: EnhancedProcessingResult[] };
      await redisService.set(`job:results:${jobId}`, sanitizedInitialJob, 3600);
    } catch (err) {
      logger.warn('Failed to persist initial job to Redis', { jobId, error: err instanceof Error ? err.message : String(err) });
    }
    
    // Process files asynchronously
    this.processFilesAsync(jobId).catch(error => {
      logger.error('Enhanced file processing error', {
        jobId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.completedAt = new Date();
      }
    });

    return jobId;
  }

  async getJobStatus(jobId: string): Promise<EnhancedFileProcessingJob | null> {
    // First try to get from memory
    let job = this.jobs.get(jobId);
    
    // If not in memory, try to get from Redis (for completed jobs)
    if (!job) {
      try {
        const redisData = await redisService.get(`job:results:${jobId}`);
        if (redisData) {
          // ensure required defaults if persisted object is partial
          const safeJob = {
            id: (redisData as any).id,
            files: (redisData as any).files || [],
            suitcaseId: (redisData as any).suitcaseId,
            validationId: (redisData as any).validationId,
            userId: (redisData as any).userId,
            status: (redisData as any).status || 'pending',
            results: (redisData as any).results || [],
            createdAt: (redisData as any).createdAt ? new Date((redisData as any).createdAt) : new Date(),
            completedAt: (redisData as any).completedAt ? new Date((redisData as any).completedAt) : undefined,
            totalProgress: (typeof (redisData as any).totalProgress === 'number') ? (redisData as any).totalProgress : 0,
          } as EnhancedFileProcessingJob;
          return safeJob;
        }
      } catch (error) {
        logger.warn('Failed to get job from Redis:', { jobId, error });
      }
    }
    
    return job || null;
  }

  async getJobProgress(jobId: string): Promise<any | null> {
    try {
      // redisService.get already returns a parsed object (or null), so no JSON.parse here
      const progressData = await redisService.get(`job:progress:${jobId}`);
      return progressData || null;
    } catch (error) {
      logger.warn('Failed to get job progress from Redis:', { jobId, error });
      return null;
    }
  }

  private async processFilesAsync(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    logger.info('Starting enhanced file processing job:', { jobId, filesCount: job.files.length });

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

      if (suitcase.sensors.length === 0) {
        throw new Error('Suitcase has no sensors configured');
      }

      // Process each file
      let processedFiles = 0;
      logger.info('Beginning file loop', { jobId, totalFiles: job.files.length });
      for (const file of job.files) {
        try {
          logger.info('Processing individual file', { jobId, fileName: file.originalname });
          const result = await this.processFileWithRobustService(file, suitcase, job.userId, job.validationId);
          logger.info('File processing completed', { jobId, fileName: file.originalname, success: result.success });
          job.results.push(result);
          processedFiles++;

          // Detect timeout-specific error to mark job as needing fallback
          if (result.errors.some(e => /XLS read timeout/i.test(e))) {
            job.status = 'fallback_pending';
            logger.warn('Job marked fallback_pending due to XLS read timeout', { jobId, fileName: file.originalname });
          }
          
          // Update overall progress
          job.totalProgress = Math.round((processedFiles / job.files.length) * 100);
          
          // Update job progress in Redis for real-time updates
          await this.updateJobProgress(jobId, {
            processed: processedFiles,
            total: job.files.length,
            percentage: job.totalProgress,
            currentFile: file.originalname,
          });
          
        } catch (error) {
          job.results.push({
            fileName: file.originalname,
            success: false,
            recordsProcessed: 0,
            recordsFailed: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            warnings: [],
            processingTime: 0,
          });
          processedFiles++;
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();

      logger.info('Enhanced file processing job completed:', {
        jobId,
        totalFiles: job.files.length,
        successfulFiles: job.results.filter(r => r.success).length,
        totalRecords: job.results.reduce((sum, r) => sum + r.recordsProcessed, 0),
        failedRecords: job.results.reduce((sum, r) => sum + r.recordsFailed, 0),
      });

      // Store final results in Redis for 24 hours
      // Sanitize job object to avoid serializing non-serializable fields (file buffers, streams)
      const sanitizedJob = {
        ...job,
        files: job.files.map(f => ({ originalname: f.originalname, mimetype: f.mimetype, size: f.size }))
      };
      await redisService.set(`job:results:${jobId}`, sanitizedJob, 86400);
      // Ensure final progress is stored so clients polling progress see 100%
      try {
        await this.updateJobProgress(jobId, {
          processed: job.files.length,
          total: job.files.length,
          percentage: 100,
          currentFile: null,
        });
      } catch (e) {
        logger.warn('Failed to set final job progress in Redis:', { jobId, error: e instanceof Error ? e.message : String(e) });
      }
      
      } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      logger.error('Enhanced file processing job failed', {
        jobId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  private async processFileWithRobustService(
    file: Express.Multer.File,
    suitcase: any,
    userId: string,
    validationId?: string
  ): Promise<EnhancedProcessingResult> {
    const startTime = Date.now();
    logger.info('processFileWithRobustService started', { fileName: file.originalname, suitcaseId: suitcase.id });
    const tempFilePath = await this.saveTempFile(file);
    logger.info('Temp file saved', { fileName: file.originalname, tempFilePath });
    // Heuristic detection before choosing parser
    try {
      const meta = {
        fileName: file.originalname,
        extension: '.' + (file.originalname.split('.').pop() || '').toLowerCase(),
        sizeBytes: file.size,
        absolutePath: tempFilePath
      };
      const sample = sampleFile(meta);
      const heuristics = detectFormat(meta, sample || undefined);
      logger.info('Heuristic detection', { fileName: file.originalname, heuristics });
    } catch (heurErr) {
      logger.warn('Heuristic detection failed', { fileName: file.originalname, error: heurErr instanceof Error ? heurErr.message : String(heurErr) });
    }
    let detailedErrors: Array<{row: number, error: string, data?: any}> = [];
    
    try {
      // Determine file type
      const extension = file.originalname.toLowerCase().split('.').pop();
      logger.info('File extension determined', { fileName: file.originalname, extension });
      let processingResult: any;

      // Match file to sensor first
      logger.info('Attempting to match file to sensor', { fileName: file.originalname, suitcaseSensorCount: suitcase.sensors?.length || 0 });
      const matchedSensor = await this.matchFileToSensor(file, suitcase, tempFilePath);
      logger.info('Sensor matching result', { fileName: file.originalname, matched: !!matchedSensor, sensorId: matchedSensor?.sensor?.id });
      if (!matchedSensor) {
        throw new Error('Could not match file to any sensor in the suitcase');
      }

      const options = {
        suitcaseId: suitcase.id,
        userId: userId,
        validateData: true,
        chunkSize: 1000,
        jobId: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.originalname,
        validationId,
        // force sensor id when file doesn't contain sensor identifier
        forceSensorId: matchedSensor.sensor.id,
        vendorGuess: undefined,
      } as any;

      // Attempt vendor guess again using filename simple heuristic (reuse minimal logic)
      const lowerName = file.originalname.toLowerCase();
      // Heuristic: many Elitech logger files use serials like EF7217100050.xls
      // If filename contains 'elitech' or matches serial pattern EF##########, prefer Elitech
      if (/elitech/.test(lowerName) || /\bef\d{10}\b/i.test(file.originalname)) options.vendorGuess = 'Elitech';
      if (/novus/.test(lowerName)) options.vendorGuess = 'Novus';
      if (/instrutemp/.test(lowerName)) options.vendorGuess = 'Instrutemp';

      switch (extension) {
        case 'csv':
                    logger.info('Calling CSV processing service', { fileName: file.originalname });
          processingResult = await this.csvService.processCSVFile(
            tempFilePath,
            file.originalname,
            options
          );
                    logger.info('CSV processing service returned', { fileName: file.originalname, success: !!processingResult });
          break;
          
        case 'xls':
                              // Use Python fallback directly for .xls files (better compatibility)
                              logger.info('Using Python fallback for .xls file', { fileName: file.originalname });
                              try {
                                const fallback = await this.invokePythonFallback(tempFilePath, file.originalname, options);
                                processingResult = fallback;
                                logger.info('Python fallback succeeded', { fileName: file.originalname, processedRows: fallback?.processedRows });
                              } catch (pfErr: any) {
                                logger.error('Python fallback failed', { fileName: file.originalname, message: pfErr?.message });
                                throw new Error(`Failed to process XLS file: ${pfErr?.message}`);
                              }
                              break;
          
                            case 'xlsx':
                    logger.info('Calling Excel processing service', { fileName: file.originalname, tempFilePath });
          try {
            processingResult = await this.excelService.processExcelFile(
              tempFilePath,
              file.originalname,
              options
            );
            logger.info('Excel processing service returned', { fileName: file.originalname, success: !!processingResult });
          } catch (e: any) {
            const code = e?.code;
            logger.warn('Excel primary parser failed', { fileName: file.originalname, code, message: e?.message });
            if (code === 'XLS_READ_TIMEOUT' || /XLS read timeout/i.test(e?.message || '')) {
              logger.info('Attempting Python fallback for legacy XLS', { fileName: file.originalname });
              try {
                const fallback = await this.invokePythonFallback(tempFilePath, file.originalname, options);
                processingResult = fallback;
                logger.info('Python fallback succeeded', { fileName: file.originalname, processedRows: fallback?.processedRows });
              } catch (pfErr: any) {
                logger.error('Python fallback failed', { fileName: file.originalname, message: pfErr?.message });
                throw e; // rethrow original timeout
              }
            } else {
              throw e;
            }
          }
          break;
          
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }

      const processingTime = Date.now() - startTime;
  logger.info('Processing time calculated', { fileName: file.originalname, processingTime });

      // Extract detailed errors if available
      if (processingResult.detailedErrors) {
        detailedErrors = processingResult.detailedErrors;
      }

      return {
        fileName: file.originalname,
        success: processingResult.failedRows === 0 || processingResult.processedRows > 0,
        recordsProcessed: processingResult.processedRows,
        recordsFailed: processingResult.failedRows,
        errors: processingResult.errors || [],
        warnings: processingResult.warnings || [],
        sensorId: matchedSensor.sensor.id,
        sensorSerialNumber: matchedSensor.sensor.serialNumber,
        processingTime,
        detailedErrors,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Log detailed error for debugging (include stack)
      logger.error('Enhanced file processing error', {
        fileName: file.originalname,
        suitcaseId: suitcase.id,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const msg = error instanceof Error ? error.message : 'Unknown processing error';

      return {
        fileName: file.originalname,
        success: false,
        recordsProcessed: 0,
        recordsFailed: 0,
        errors: [msg],
        warnings: [],
        processingTime,
        detailedErrors: [{
          row: 0,
          error: msg,
          data: { fileName: file.originalname }
        }]
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch {}
    }
  }

  private async invokePythonFallback(tempFilePath: string, originalName: string, options: any): Promise<any> {
    // Lazy import to avoid overhead if never used
    const { pythonFallbackService } = await import('./pythonFallbackService.js');
    return pythonFallbackService.processLegacyXls(tempFilePath, originalName, options);
  }

  private async saveTempFile(file: Express.Multer.File): Promise<string> {
    const tempDir = path.join(os.tmpdir(), 'qt-master-enhanced-uploads');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${Date.now()}-${file.originalname}`);
    
    if (file.buffer) {
      await fs.writeFile(tempFilePath, file.buffer);
    } else if ((file as any).path) {
      await fs.copyFile((file as any).path, tempFilePath);
    } else {
      throw new Error('File has no buffer or path');
    }
    
    return tempFilePath;
  }

  private async matchFileToSensor(file: Express.Multer.File, suitcase: any, tempFilePath?: string): Promise<any | null> {
    let extractedSerial: string | null = null;

    // Strategy 1: Attempt to read serial from Excel 'Resumo' sheet (cell B6) FIRST
    try {
      const ext = (file.originalname.split('.').pop() || '').toLowerCase();
      // Only attempt for modern Excel formats (.xlsx)
      // Skip .xls (Excel 97-2003) as it causes hangs with xlsx library
      if (ext === 'xlsx') {
        // Get file path in order of priority
        const filePath = tempFilePath || (file as any).path || (file as any).tempFilePath;
        
        if (!filePath) {
          logger.warn('No file path available for serial extraction', { fileName: file.originalname });
        } else {
          const XLSXMod: any = (await import('xlsx')) as any;
          const XLSXLib: any = (XLSXMod as any)?.default ?? XLSXMod;
          const wb = XLSXLib.readFile(filePath);
          const sheetNames: string[] = wb.SheetNames || [];
          // Try common variants of the summary sheet name
          const resumoName = sheetNames.find((n: string) => n.toLowerCase() === 'resumo') || sheetNames.find((n: string) => /resumo/i.test(n));
          if (resumoName) {
            const resumo = wb.Sheets[resumoName];
            const cell = resumo && resumo['B6'];
            const serialStr = cell ? String((cell as any).v ?? (cell as any).w ?? '').trim() : '';
            if (serialStr) {
              extractedSerial = serialStr;
              logger.info('Extracted serial from Excel Resumo sheet', { fileName: file.originalname, serial: extractedSerial });
              // Try to match existing sensor
              const match = suitcase.sensors.find((s: any) => s.sensor.serialNumber.trim().toLowerCase() === serialStr.trim().toLowerCase());
              if (match) {
                logger.info('Matched existing sensor by extracted serial', { fileName: file.originalname, sensorId: match.sensor.id });
                return match;
              }
            }
          }
        }
      } else if (ext === 'xls') {
        logger.info('Skipping serial extraction for legacy .xls format (potential hang)', { fileName: file.originalname });
      }
    } catch (_err) {
      logger.warn('Failed to extract serial from Excel', { fileName: file.originalname, error: _err instanceof Error ? _err.message : String(_err) });
    }

    // Strategy 2: Match by filename containing serial number (DISABLED - always create new sensor for each file)
    // This strategy was causing all files to match the same sensor when serial is "1", "2", etc.
    // Now we skip this and go directly to creating a new sensor for each file
    logger.info('Skipping filename match strategy, will create new sensor', { 
      fileName: file.originalname, 
      extractedSerial,
      existingSensorCount: suitcase.sensors.length 
    });

    // Strategy 3: Create new sensor for this file
    // Use extracted serial or generate one from filename + timestamp
    let newSerial: string;
    if (extractedSerial) {
      newSerial = extractedSerial;
    } else {
      // Extract potential serial from filename (e.g., "EF7216103539" from the example)
      const serialMatch = file.originalname.match(/[A-Z]{2}\d{10,}/);
      if (serialMatch) {
        newSerial = serialMatch[0];
      } else {
        // Fallback: use filename base + timestamp
        const baseName = file.originalname.replace(/\.[^/.]+$/, '').substring(0, 20);
        newSerial = `${baseName}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      }
    }
    logger.info('Creating new sensor for file', { fileName: file.originalname, serial: newSerial, extracted: !!extractedSerial });
    
    try {
      // Get default sensor type (or create one if needed)
      let sensorType = await prisma.sensorType.findFirst({
        where: { name: 'Generic Logger' }
      });
      
      if (!sensorType) {
        sensorType = await prisma.sensorType.create({
          data: {
            name: 'Generic Logger',
            description: 'Auto-created sensor type for imported files',
            dataConfig: {
              temperatureRange: { min: -40, max: 85 },
              humidityRange: { min: 0, max: 100 },
              accuracy: { temperature: 0.5, humidity: 3 }
            }
          }
        });
      }

      // Create new sensor (handle potential unique-constraint race)
      let newSensor: any;
      try {
          newSensor = await prisma.sensor.create({
          data: {
            serialNumber: newSerial,
            model: 'Auto-detected',
            typeId: sensorType.id
          }
        });
      } catch (err: any) {
        // If serialNumber already exists, reuse existing sensor
        if (err && /Unique constraint failed/.test(String(err.message || err))) {
          logger.warn('Sensor serial already exists, attempting to reuse existing sensor', { serial: newSerial });
          newSensor = await prisma.sensor.findFirst({ where: { serialNumber: newSerial } });
          if (!newSensor) throw err; // rethrow if we couldn't recover
        } else {
          throw err;
        }
      }

      // Associate sensor with suitcase (idempotent - may already exist)
        // Associate sensor with suitcase (idempotent - may already exist)
        let suitcaseSensor: any;
        try {
          suitcaseSensor = await prisma.suitcaseSensor.create({
        data: {
          suitcaseId: suitcase.id,
          sensorId: newSensor.id
        },
        include: {
          sensor: {
            include: {
              type: true
            }
          }
        }
      });
        } catch (assocErr: any) {
          // If the association already exists (unique constraint), reuse it
          if (assocErr && /Unique constraint failed/.test(String(assocErr.message || assocErr))) {
            logger.warn('Suitcase-sensor association already exists, reusing it', { suitcaseId: suitcase.id, sensorId: newSensor.id });
            suitcaseSensor = await prisma.suitcaseSensor.findFirst({
              where: { suitcaseId: suitcase.id, sensorId: newSensor.id },
              include: { sensor: { include: { type: true } } }
            });
            if (!suitcaseSensor) throw assocErr; // unexpected: rethrow if we couldn't find it
          } else {
            throw assocErr;
          }
        }

      logger.info('Created new sensor and associated with suitcase', { 
        fileName: file.originalname, 
        sensorId: newSensor.id, 
        serial: newSerial 
      });

      return suitcaseSensor;
    } catch (createErr) {
      logger.error('Failed to create new sensor', { 
        fileName: file.originalname, 
        error: createErr instanceof Error ? createErr.message : String(createErr) 
      });
      return null;
    }
  }

  private async updateJobProgress(jobId: string, progress: any): Promise<void> {
    try {
      await redisService.set(`job:progress:${jobId}`, progress, 3600);
    } catch (error) {
      logger.warn('Failed to update job progress in Redis:', { jobId, error });
    }
  }

  private generateJobId(): string {
    return `enhanced_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

export const enhancedFileProcessorService = new EnhancedFileProcessorService();