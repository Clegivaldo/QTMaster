import { Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { fileProcessorService } from '../services/fileProcessorService.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { requireParam } from '../utils/requestUtils.js';

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 120, // Maximum 120 files as per requirements
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
    }
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

      // Start file processing job
      const jobId = await fileProcessorService.processFiles(
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
        res.status(400).json({ error: 'Validation error', details: error.errors });
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

      const job = await fileProcessorService.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Calculate progress
      const totalFiles = job.files.length;
      const processedFiles = job.results.length;
      const progress = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;

      // Calculate statistics
      const successfulFiles = job.results.filter(r => r.success).length;
      const failedFiles = job.results.filter(r => !r.success).length;
      const totalRecords = job.results.reduce((sum, r) => sum + r.recordsProcessed, 0);

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
          },
          results: job.results,
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