import { Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { enhancedFileProcessorService } from '../services/enhancedFileProcessorService.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { requireParam } from '../utils/requestUtils.js';

const uploadDir = path.join(os.tmpdir(), 'qt-master-uploads');
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    files: 120,
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const allowedMimes = new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'text/plain'
    ]);
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
      return;
    }
    if (!allowedMimes.has(file.mimetype)) {
      cb(new Error('Invalid MIME type'));
      return;
    }
    cb(null, true);
  },
});

// Validation schemas
const processFilesSchema = z.object({
  suitcaseId: z.string().min(1, 'Suitcase ID is required'),
});

export class FileController {
  // Multer middleware for handling file uploads
  uploadMiddleware = upload.array('files', 120);

  async uploadFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const { suitcaseId } = processFilesSchema.parse(req.body);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      if (files.length > 120) {
        res.status(400).json({ error: 'Too many files. Maximum 120 files allowed' });
        return;
      }

      // Validate file types
      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      for (const file of files) {
        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension)) {
          res.status(400).json({ error: `Invalid file type: ${file.originalname}. Allowed types: ${allowedExtensions.join(', ')}` });
          return;
        }
      }

      // Check if suitcase exists and user has access
      const suitcase = await prisma.suitcase.findUnique({
        where: { id: suitcaseId },
        include: {
          sensors: {
            include: {
              sensor: {
                select: {
                  id: true,
                  serialNumber: true,
                },
              },
            },
          },
        },
      });

      if (!suitcase) {
        res.status(404).json({ error: 'Suitcase not found' });
        return;
      }

      if (suitcase.sensors.length === 0) {
        res.status(400).json({ error: 'Suitcase has no sensors configured' });
        return;
      }

      // Start enhanced file processing job with robust error handling
      const jobId = await enhancedFileProcessorService.processFiles(
        files,
        suitcaseId,
        req.user!.id
      );

      logger.info('File upload started:', {
        jobId,
        filesCount: files.length,
        suitcaseId,
        userId: req.user!.id,
        fileNames: files.map(f => f.originalname),
      });

      res.json({
        success: true,
        data: {
          jobId,
          filesCount: files.length,
          message: 'Files uploaded and processing started',
        },
      });
      return;

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
        return;
      }

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File too large. Maximum size is 10MB per file' });
          return;
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          res.status(400).json({ error: 'Too many files. Maximum 120 files allowed' });
          return;
        }
      }

      logger.error('File upload error:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async getProcessingStatus(req: Request, res: Response) {
    try {
  const jobId = requireParam(req, res, 'jobId');
  if (!jobId) return;

      const job = await enhancedFileProcessorService.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Calculate progress - enhanced service provides more detailed progress
      const totalFiles = job.files.length;
      const processedFiles = job.results.length;
      const progress = job.totalProgress || (totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0);

      // Calculate detailed statistics
      const successfulFiles = job.results.filter(r => r.success).length;
      const failedFiles = job.results.filter(r => !r.success).length;
      const totalRecords = job.results.reduce((sum, r) => sum + r.recordsProcessed, 0);
      const totalFailedRecords = job.results.reduce((sum, r) => sum + r.recordsFailed, 0);
      const totalWarnings = job.results.reduce((sum, r) => sum + r.warnings.length, 0);
      const totalErrors = job.results.reduce((sum, r) => sum + r.errors.length, 0);

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          progress,
          statistics: {
            totalFiles,
            processedFiles,
            successfulFiles,
            failedFiles,
            totalRecords,
            totalFailedRecords,
            totalWarnings,
            totalErrors,
            averageProcessingTime: job.results.length > 0 
              ? Math.round(job.results.reduce((sum, r) => sum + r.processingTime, 0) / job.results.length)
              : 0,
          },
          results: job.results.map(result => ({
            fileName: result.fileName,
            success: result.success,
            recordsProcessed: result.recordsProcessed,
            recordsFailed: result.recordsFailed,
            sensorId: result.sensorId,
            sensorSerialNumber: result.sensorSerialNumber,
            processingTime: result.processingTime,
            errorCount: result.errors.length,
            warningCount: result.warnings.length,
            errors: result.errors.slice(0, 5), // Limit to first 5 errors for brevity
            warnings: result.warnings.slice(0, 5), // Limit to first 5 warnings for brevity
          })),
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        },
      });
      return;

    } catch (error) {
      logger.error('Get processing status error:', {
        error: error instanceof Error ? error.message : error,
        jobId: req.params.jobId,
      });

      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async getFileProcessingDetails(req: Request, res: Response) {
    try {
      const jobId = requireParam(req, res, 'jobId');
      const fileName = requireParam(req, res, 'fileName');
      if (!jobId || !fileName) return;

      const job = await enhancedFileProcessorService.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Find the specific file result
      const fileResult = job.results.find(r => r.fileName === decodeURIComponent(fileName));

      if (!fileResult) {
        res.status(404).json({ error: 'File result not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          fileName: fileResult.fileName,
          success: fileResult.success,
          recordsProcessed: fileResult.recordsProcessed,
          recordsFailed: fileResult.recordsFailed,
          sensorId: fileResult.sensorId,
          sensorSerialNumber: fileResult.sensorSerialNumber,
          processingTime: fileResult.processingTime,
          errors: fileResult.errors,
          warnings: fileResult.warnings,
          detailedErrors: fileResult.detailedErrors || [],
        },
      });
      return;

    } catch (error) {
      logger.error('Get file processing details error:', {
        error: error instanceof Error ? error.message : error,
        jobId: req.params.jobId,
        fileName: req.params.fileName,
      });

      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async getJobProgress(req: Request, res: Response) {
    try {
      const jobId = requireParam(req, res, 'jobId');
      if (!jobId) return;

      const job = await enhancedFileProcessorService.getJobStatus(jobId);
      const progress = await enhancedFileProcessorService.getJobProgress(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.totalProgress,
          currentFile: progress?.currentFile || null,
          processed: progress?.processed || job.results.length,
          total: progress?.total || job.files.length,
          percentage: progress?.percentage || job.totalProgress,
          lastUpdated: new Date().toISOString(),
        },
      });
      return;

    } catch (error) {
      logger.error('Get job progress error:', {
        error: error instanceof Error ? error.message : error,
        jobId: req.params.jobId,
      });

      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  async getProcessingHistory(req: AuthenticatedRequest, res: Response) {
    try {
      // This would typically be stored in database, but for now we'll return empty
      // In a production system, you'd want to persist job history
      res.json({
        success: true,
        data: {
          jobs: [],
          message: 'Processing history feature will be implemented with database persistence',
        },
      });

    } catch (error) {
      logger.error('Get processing history error:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}

// Import prisma here to avoid circular dependency
import { prisma } from '../lib/prisma.js';
