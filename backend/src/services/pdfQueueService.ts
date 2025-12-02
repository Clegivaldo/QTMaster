import Queue from 'bull';
import { logger } from '../utils/logger.js';
import { pdfGenerationService } from './pdfGenerationService.js';

interface PDFJobData {
  templateId: string;
  validationId: string;
  userId: string;
  options?: any;
  jobId: string;
}

interface PDFJobResult {
  pdfBuffer: Buffer;
  metadata: {
    pageCount: number;
    fileSize: number;
    processingTime: number;
    warnings: string[];
    errors: string[];
  };
}

export class PDFQueueService {
  private queue: Queue.Queue<PDFJobData>;
  private processingJobs = new Set<string>();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    logger.info('Initializing PDF Queue Service', { redisUrl: redisUrl.replace(/:[^:]*@/, ':***@') });

    try {
      this.queue = new Queue('pdf-generation', redisUrl, {
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          timeout: 300000, // 5 minutes timeout for job processing
        },
      });

      this.setupQueueEvents();
      this.setupWorker();
      logger.info('PDF Queue Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PDF Queue Service', error);
      throw error;
    }
  }

  private setupQueueEvents(): void {
    this.queue.on('ready', () => {
      logger.info('PDF queue is ready and connected to Redis');
    });

    this.queue.on('error', (error) => {
      logger.error('PDF queue error - this may prevent job processing', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    });

    this.queue.on('waiting', (jobId) => {
      logger.info(`Job ${jobId} is waiting in queue`);
    });

    this.queue.on('active', (job, jobPromise) => {
      logger.info(`Job ${job.id} is now active - starting PDF generation`, {
        templateId: job.data.templateId,
        validationId: job.data.validationId
      });
    });

    this.queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed successfully`, {
        fileSize: result?.pdfBuffer?.length || 0,
        processingTime: result?.metadata?.processingTime || 0
      });
      this.processingJobs.delete(job.id.toString());
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed with error`, {
        error: err.message,
        stack: err.stack,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        templateId: job.data.templateId,
        validationId: job.data.validationId
      });
      this.processingJobs.delete(job.id.toString());
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} has stalled - may be stuck`, {
        templateId: job.data.templateId,
        validationId: job.data.validationId
      });
    });
  }

  private setupWorker(): void {
    this.queue.process(async (job) => {
      const { templateId, validationId, userId, options, jobId } = job.data;

      logger.info(`[Worker] Starting to process PDF job ${jobId}`, {
        templateId,
        validationId,
        userId,
        queuePosition: await this.queue.getWaitingCount()
      });

      try {
        this.processingJobs.add(jobId);
        await job.progress(10); // Report progress

        // Check if this is an editor template
        logger.info(`[Worker] Checking template type for ${templateId}`);
        const { prisma } = await import('../lib/prisma.js');
        const editorTemplate = await prisma.editorTemplate.findUnique({
          where: { id: templateId },
          select: { id: true, name: true },
        });

        if (!editorTemplate) {
          logger.warn(`[Worker] Template ${templateId} not found in editor templates, trying legacy`);
        }

        await job.progress(20); // Report progress
        let result: PDFJobResult;

        if (editorTemplate) {
          // Use editor template generation
          logger.info(`[Worker] Using editor template generation for ${editorTemplate.name} (${templateId})`);
          await job.progress(30);

          result = await pdfGenerationService.generateFromEditorTemplate(
            templateId,
            validationId,
            userId,
            options
          );

          await job.progress(90);
        } else {
          // Use legacy template generation
          logger.info(`[Worker] Using legacy template generation for ${templateId}`);
          await job.progress(30);

          result = await pdfGenerationService.generateReportPDF(
            templateId,
            validationId,
            userId,
            options
          );

          await job.progress(90);
        }

        logger.info(`[Worker] PDF job ${jobId} completed successfully`, {
          fileSize: result.pdfBuffer.length,
          processingTime: result.metadata.processingTime,
          pageCount: result.metadata.pageCount
        });

        await job.progress(100);
        return result;
      } catch (error) {
        logger.error(`[Worker] PDF job ${jobId} failed`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          templateId,
          validationId,
          userId
        });
        throw error;
      } finally {
        this.processingJobs.delete(jobId);
      }
    });

    logger.info('[Worker] PDF queue worker is set up and ready to process jobs');
  }

  async addJob(templateId: string, validationId: string, userId: string, options?: any): Promise<string> {
    const jobId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const jobData: PDFJobData = {
      templateId,
      validationId,
      userId,
      options,
      jobId,
    };

    await this.queue.add(jobData, {
      jobId,
      priority: 0,
      delay: 0,
    });

    logger.info(`Added PDF job to queue`, { jobId, templateId, validationId });

    return jobId;
  }

  async getJobStatus(jobId: string | number): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'notfound';
    progress?: number;
    result?: PDFJobResult;
    error?: string | undefined;
    createdAt?: Date | undefined;
    startedAt?: Date | undefined;
    finishedAt?: Date | undefined;
  }> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return { status: 'notfound' };
    }

    const state = await job.getState();

    switch (state) {
      case 'waiting':
        return {
          status: 'waiting',
          createdAt: job.timestamp ? new Date(job.timestamp) : undefined,
        };
      case 'active':
        return {
          status: 'active',
          progress: job.progress(),
          startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        };
      case 'completed':
        return {
          status: 'completed',
          result: job.returnvalue,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        };
      case 'failed':
        return {
          status: 'failed',
          error: job.failedReason || undefined,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        };
      default:
        return { status: 'notfound' };
    }
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async close(): Promise<void> {
    await this.queue.close();
    logger.info('PDF queue closed');
  }
}

export const pdfQueueService = new PDFQueueService();