import Bull from 'bull';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';

export interface JobData {
  type: 'import' | 'report' | 'notification' | 'cleanup';
  payload: any;
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  data?: any;
  result?: any;
  error?: string;
  attemptsMade?: number;
  createdAt?: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

export class QueueService {
  private redis: Redis;
  private queues: Map<string, Bull.Queue> = new Map();
  private prisma: PrismaClient;
  
  // Configurações padrão
  private readonly DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 horas
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 dias
      count: 5000,
    },
  };

  constructor(redisConfig: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxRetriesPerRequest?: number;
  }, prisma: PrismaClient) {
    this.redis = new Redis(redisConfig);
    this.prisma = prisma;
    
    // Configurar queues padrão
    this.setupDefaultQueues();
  }

  private setupDefaultQueues(): void {
    const queueConfigs = [
      { name: 'import', concurrency: 2 },
      { name: 'report', concurrency: 3 },
      { name: 'notification', concurrency: 5 },
      { name: 'cleanup', concurrency: 1 },
      { name: 'high-priority', concurrency: 1 },
    ];

    queueConfigs.forEach(config => {
      this.createQueue(config.name, { concurrency: config.concurrency });
    });
  }

  createQueue(name: string, options: {
    concurrency?: number;
    defaultJobOptions?: any;
  } = {}): Bull.Queue {
    try {
      const host = this.redis.options.host ?? '127.0.0.1';
      const port = this.redis.options.port ?? 6379;
      const db = this.redis.options.db ?? 0;
      const password = this.redis.options.password;
      const authPart = password ? `:${password}@` : '';
      const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

      const queue = new Bull(name, redisUrl, {
        defaultJobOptions: {
          ...this.DEFAULT_JOB_OPTIONS,
          ...options.defaultJobOptions,
        },
        settings: {
          maxStalledCount: 3,
          stalledInterval: 30000,
          retryProcessDelay: 5000,
        },
      });

      // Configurar processamento
      if (options.concurrency) {
        this.setupQueueProcessor(queue, name, options.concurrency);
      }

      // Event listeners
      this.setupQueueEventListeners(queue);

      this.queues.set(name, queue);
      return queue;
    } catch (error) {
      throw new AppError(`Failed to create queue ${name}: ${(error as any)?.message ?? String(error)}`, 500);
    }
  }

  private setupQueueProcessor(queue: Bull.Queue, queueName: string, concurrency: number): void {
    queue.process(concurrency, async (job) => {
      try {
        console.log(`[Queue:${queueName}] Processing job ${job.id} of type ${job.data.type}`);
        
        // Registrar início do processamento
        await this.logJobStart(job);
        
        // Processar job baseado no tipo
        const result = await this.processJob(job);
        
        // Registrar sucesso
        await this.logJobSuccess(job, result);
        
        return result;
      } catch (error) {
        // Registrar erro
        await this.logJobError(job, error);
        
        // Re-throw para que o Bull gerencie o retry
        throw error;
      }
    });
  }

  private setupQueueEventListeners(queue: Bull.Queue): void {
    queue.on('completed', (job, result) => {
      console.log(`[Queue:${queue.name}] Job ${job.id} completed`);
    });

    queue.on('failed', (job, err) => {
      console.error(`[Queue:${queue.name}] Job ${job.id} failed:`, err.message);
    });

    queue.on('stalled', (job) => {
      console.warn(`[Queue:${queue.name}] Job ${job.id} stalled`);
    });

    queue.on('progress', (job, progress) => {
      console.log(`[Queue:${queue.name}] Job ${job.id} progress: ${progress}%`);
    });
  }

  private async processJob(job: Bull.Job): Promise<any> {
    const { type, payload } = job.data;

    switch (type) {
      case 'import':
        return await this.processImportJob(payload, job);
      
      case 'report':
        return await this.processReportJob(payload, job);
      
      case 'notification':
        return await this.processNotificationJob(payload, job);
      
      case 'cleanup':
        return await this.processCleanupJob(payload, job);
      
      default:
        throw new AppError(`Unknown job type: ${type}`, 400);
    }
  }

  private async processImportJob(payload: any, job: Bull.Job): Promise<any> {
    // Import job processing logic
    const { fileBuffer, fileName, config, userId } = payload;
    
    // Aqui você chamaria o serviço de importação real
    // Por enquanto, simulamos o processamento
    const totalSteps = 100;
    
    for (let i = 0; i <= totalSteps; i++) {
      // Simular progresso
      await new Promise(resolve => setTimeout(resolve, 100));
      await job.progress(Math.round((i / totalSteps) * 100));
    }
    
    return {
      importId: `import_${job.id}`,
      totalRows: 1000,
      successfulRows: 950,
      failedRows: 50,
      duration: 5000,
    };
  }

  private async processReportJob(payload: any, job: Bull.Job): Promise<any> {
    // Report generation job processing logic
    const { templateId, data, format, userId } = payload;
    
    // Simular geração de relatório
    const totalSteps = 50;
    
    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      await job.progress(Math.round((i / totalSteps) * 100));
    }
    
    return {
      reportId: `report_${job.id}`,
      templateId,
      format,
      filePath: `/reports/report_${job.id}.${format}`,
      size: 1024 * 1024, // 1MB
      duration: 10000,
    };
  }

  private async processNotificationJob(payload: any, job: Bull.Job): Promise<any> {
    // Notification job processing logic
    const { type, recipients, subject, content, priority } = payload;
    
    // Simular envio de notificações
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      notificationId: `notification_${job.id}`,
      type,
      recipients: recipients.length,
      sent: true,
      duration: 1000,
    };
  }

  private async processCleanupJob(payload: any, job: Bull.Job): Promise<any> {
    // Cleanup job processing logic
    const { type, olderThanDays } = payload;
    
    let cleanedItems = 0;
    
    switch (type) {
      case 'old_imports':
        // Limpar importações antigas
        const importService = require('./importService').ImportService;
        const importServiceInstance = new importService(this.prisma);
        cleanedItems = await importServiceInstance.cleanupOldImports(olderThanDays);
        break;
      
      case 'old_reports':
        // Limpar relatórios antigos
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        
        const result = await this.prisma.report.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        });
        cleanedItems = result.count;
        break;
      
      case 'temp_files':
        // Limpar arquivos temporários
        const fs = require('fs').promises;
        const path = require('path');
        const tempDir = path.join(__dirname, '../../temp');
        
        try {
          const files = await fs.readdir(tempDir);
          const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
          
          for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime.getTime() < cutoffTime) {
              await fs.unlink(filePath);
              cleanedItems++;
            }
          }
        } catch (error) {
          console.warn('Error cleaning temp files:', (error as any)?.message ?? String(error));
        }
        break;
    }
    
    return {
      cleanupId: `cleanup_${job.id}`,
      type,
      cleanedItems,
      olderThanDays,
      duration: 2000,
    };
  }

  async addJob(queueName: string, data: JobData, options: {
    priority?: number;
    delay?: number;
    attempts?: number;
    backoff?: number;
    jobId?: string;
  } = {}): Promise<Bull.Job> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new AppError(`Queue ${queueName} not found`, 404);
      }

      const jobOptions: Bull.JobOptions = {
        ...this.DEFAULT_JOB_OPTIONS,
        ...options,
      };

      // Adicionar prioridade se especificada
      if (options.priority) {
        jobOptions.priority = options.priority;
      }

      // Adicionar delay se especificado
      if (options.delay) {
        jobOptions.delay = options.delay;
      }

      // Adicionar attempts customizadas se especificadas
      if (options.attempts) {
        jobOptions.attempts = options.attempts;
      }

      // Adicionar backoff customizado se especificado
      if (options.backoff) {
        jobOptions.backoff = {
          type: 'exponential',
          delay: options.backoff,
        };
      }

      const job = await queue.add(data, jobOptions);
      
      // Registrar job criado
      await this.logJobCreated(job);
      
      console.log(`[Queue:${queueName}] Job ${job.id} added`);
      return job;
    } catch (error) {
      throw new AppError(`Failed to add job to queue ${queueName}: ${(error as any)?.message ?? String(error)}`, 500);
    }
  }

  async updateJobProgress(jobId: string, progress: number): Promise<void> {
    try {
      // Procurar job em todas as queues
      for (const [queueName, queue] of this.queues) {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.progress(progress);
          return;
        }
      }
      
      console.warn(`Job ${jobId} not found for progress update`);
    } catch (error) {
      console.error(`Error updating job ${jobId} progress:`, (error as any)?.message ?? String(error));
    }
  }

  async getJobProgress(jobId: string): Promise<JobProgress | null> {
    try {
      // Procurar job em todas as queues
      for (const [queueName, queue] of this.queues) {
        const job = await queue.getJob(jobId);
        if (job) {
          const rawProgress = job.progress() as any;
          const progressVal = typeof rawProgress === 'number' ? rawProgress : 0;
          const status = await job.getState();
          const createdAt = job.timestamp ? new Date(job.timestamp) : undefined;
          const processedAt = job.processedOn ? new Date(job.processedOn) : undefined;
          const finishedAt = job.finishedOn ? new Date(job.finishedOn) : undefined;
          return {
            jobId,
            progress: progressVal,
            status: status as any,
            data: job.data,
            result: job.returnvalue,
            error: job.failedReason ?? '',
            attemptsMade: job.attemptsMade,
            ...(createdAt ? { createdAt } : {}),
            ...(processedAt ? { processedAt } : {}),
            ...(finishedAt ? { finishedAt } : {}),
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting job ${jobId} progress:`, (error as any)?.message ?? String(error));
      return null;
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      // Procurar job em todas as queues
      for (const [queueName, queue] of this.queues) {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.remove();
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error canceling job ${jobId}:`, (error as any)?.message ?? String(error));
      return false;
    }
  }

  async getQueueStats(queueName: string): Promise<any> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new AppError(`Queue ${queueName} not found`, 404);
      }

      const [
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        delayedCount,
        pausedCount,
      ] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.getPausedCount(),
      ]);

      return {
        queueName,
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
        paused: pausedCount,
        total: waitingCount + activeCount + completedCount + failedCount + delayedCount + pausedCount,
      };
    } catch (error) {
      throw new AppError(`Failed to get queue stats for ${queueName}: ${(error as any)?.message ?? String(error)}`, 500);
    }
  }

  async getAllQueueStats(): Promise<any[]> {
    const stats = [];
    
    for (const queueName of this.queues.keys()) {
      try {
        const queueStats = await this.getQueueStats(queueName);
        stats.push(queueStats);
      } catch (error) {
        console.error(`Error getting stats for queue ${queueName}:`, (error as any)?.message ?? String(error));
      }
    }
    
    return stats;
  }

  async pauseQueue(queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new AppError(`Queue ${queueName} not found`, 404);
      }

      await queue.pause();
      console.log(`[Queue:${queueName}] Paused`);
    } catch (error) {
      throw new AppError(`Failed to pause queue ${queueName}: ${(error as any)?.message ?? String(error)}`, 500);
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new AppError(`Queue ${queueName} not found`, 404);
      }

      await queue.resume();
      console.log(`[Queue:${queueName}] Resumed`);
    } catch (error) {
      throw new AppError(`Failed to resume queue ${queueName}: ${(error as any)?.message ?? String(error)}`, 500);
    }
  }

  async cleanQueue(queueName: string, status: 'completed' | 'failed' | 'delayed' | 'wait' | 'active', olderThanMs: number): Promise<number> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new AppError(`Queue ${queueName} not found`, 404);
      }

      const cleaned = await queue.clean(olderThanMs, status);
      console.log(`[Queue:${queueName}] Cleaned ${cleaned.length} ${status} jobs`);
      
      return cleaned.length;
    } catch (error) {
      throw new AppError(`Failed to clean queue ${queueName}: ${(error as any)?.message ?? String(error)}`, 500);
    }
  }

  async closeAllQueues(): Promise<void> {
    try {
      const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
      await Promise.all(closePromises);
      
      await this.redis.disconnect();
      console.log('All queues closed');
    } catch (error) {
      console.error('Error closing queues:', (error as any)?.message ?? String(error));
    }
  }

  // Métodos de logging
  private async logJobCreated(job: Bull.Job): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'queue_job_created',
          resource: 'queue',
          resourceId: String(job.id),
          success: true,
          metadata: JSON.stringify({
            queueName: job.queue.name,
            type: job.data?.type,
            data: job.data,
            createdAt: job.timestamp ? new Date(job.timestamp) : new Date(),
          }),
        },
      });
    } catch (error) {
      console.error('Error logging job creation:', (error as any)?.message ?? String(error));
    }
  }

  private async logJobStart(job: Bull.Job): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'queue_job_started',
          resource: 'queue',
          resourceId: String(job.id),
          success: true,
          metadata: JSON.stringify({ processedAt: new Date(), queueName: job.queue.name }),
        },
      });
    } catch (error) {
      console.error('Error logging job start:', (error as any)?.message ?? String(error));
    }
  }

  private async logJobSuccess(job: Bull.Job, result: any): Promise<void> {
    try {
      const duration = (job.finishedOn && job.processedOn) ? (job.finishedOn - job.processedOn) : undefined;
      await this.prisma.auditLog.create({
        data: {
          action: 'queue_job_completed',
          resource: 'queue',
          resourceId: String(job.id),
          success: true,
          metadata: JSON.stringify({ finishedAt: new Date(), result, duration, queueName: job.queue.name }),
        },
      });
    } catch (error) {
      console.error('Error logging job success:', (error as any)?.message ?? String(error));
    }
  }

  private async logJobError(job: Bull.Job, error: unknown): Promise<void> {
    try {
      const err: any = error as any;
      const duration = (job.finishedOn && job.processedOn) ? (job.finishedOn - job.processedOn) : undefined;
      await this.prisma.auditLog.create({
        data: {
          action: 'queue_job_failed',
          resource: 'queue',
          resourceId: String(job.id),
          success: false,
          errorMessage: err?.message ?? String(error),
          metadata: JSON.stringify({ finishedAt: new Date(), errorStack: err?.stack, duration, queueName: job.queue.name }),
        },
      });
    } catch (logError) {
      console.error('Error logging job error:', (logError as any)?.message ?? String(logError));
    }
  }
}