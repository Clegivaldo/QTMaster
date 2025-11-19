import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { CSVProcessingService } from './csvProcessingService.js';
import { ExcelProcessingService } from './excelProcessingService.js';
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
  status: 'pending' | 'processing' | 'completed' | 'failed';
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
    
    // Process files asynchronously
    this.processFilesAsync(jobId).catch(error => {
      logger.error('Enhanced file processing error:', { jobId, error: error instanceof Error ? error.message : String(error) });
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
          return redisData as EnhancedFileProcessingJob;
        }
      } catch (error) {
        logger.warn('Failed to get job from Redis:', { jobId, error });
      }
    }
    
    return job || null;
  }

  async getJobProgress(jobId: string): Promise<any | null> {
    try {
      const progressData = await redisService.get(`job:progress:${jobId}`);
      return progressData ? JSON.parse(progressData) : null;
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
      for (const file of job.files) {
        try {
          const result = await this.processFileWithRobustService(file, suitcase, job.userId, job.validationId);
          job.results.push(result);
          processedFiles++;
          
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
      await redisService.set(`job:results:${jobId}`, job, 86400);
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
      logger.error('Enhanced file processing job failed:', { jobId, error: error instanceof Error ? error.message : error });
    }
  }

  private async processFileWithRobustService(
    file: Express.Multer.File,
    suitcase: any,
    userId: string,
    validationId?: string
  ): Promise<EnhancedProcessingResult> {
    const startTime = Date.now();
    const tempFilePath = await this.saveTempFile(file);
    let detailedErrors: Array<{row: number, error: string, data?: any}> = [];
    
    try {
      // Determine file type
      const extension = file.originalname.toLowerCase().split('.').pop();
      let processingResult: any;

      // Match file to sensor first
      const matchedSensor = await this.matchFileToSensor(file, suitcase);
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
      } as any;

      switch (extension) {
        case 'csv':
          processingResult = await this.csvService.processCSVFile(
            tempFilePath,
            file.originalname,
            options
          );
          break;
          
        case 'xlsx':
        case 'xls':
          processingResult = await this.excelService.processExcelFile(
            tempFilePath,
            file.originalname,
            options
          );
          break;
          
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }

      const processingTime = Date.now() - startTime;

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
      
      // Log detailed error for debugging
      logger.error('Enhanced file processing error:', {
        fileName: file.originalname,
        suitcaseId: suitcase.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      return {
        fileName: file.originalname,
        success: false,
        recordsProcessed: 0,
        recordsFailed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown processing error'],
        warnings: [],
        processingTime,
        detailedErrors: [{
          row: 0,
          error: error instanceof Error ? error.message : 'Unknown processing error',
          data: { fileName: file.originalname }
        }],
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch {}
    }
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

  private async matchFileToSensor(file: Express.Multer.File, suitcase: any): Promise<any | null> {
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

    return null;
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