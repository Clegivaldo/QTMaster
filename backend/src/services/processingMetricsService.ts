import { logger } from '../utils/logger.js';

export interface ProcessingMetrics {
  jobId: string;
  fileName: string;
  vendor: string | undefined;
  format: string | undefined;
  stages: Record<string, { durationMs: number; timestamp: Date }>;
  counters: Record<string, number>;
  errors: string[];
}

class ProcessingMetricsService {
  private metrics = new Map<string, ProcessingMetrics>();
  private readonly MAX_STORED = 1000;

  startTracking(jobId: string, fileName: string, vendor?: string, format?: string): void {
    this.metrics.set(jobId, {
      jobId,
      fileName,
      vendor,
      format,
      stages: {},
      counters: {},
      errors: []
    });
    this.cleanup();
  }

  recordStage(jobId: string, stage: string, durationMs: number): void {
    const metric = this.metrics.get(jobId);
    if (metric) {
      metric.stages[stage] = { durationMs, timestamp: new Date() };
    }
  }

  incrementCounter(jobId: string, counter: string, amount: number = 1): void {
    const metric = this.metrics.get(jobId);
    if (metric) {
      metric.counters[counter] = (metric.counters[counter] || 0) + amount;
    }
  }

  recordError(jobId: string, error: string): void {
    const metric = this.metrics.get(jobId);
    if (metric) {
      metric.errors.push(error);
    }
  }

  getMetrics(jobId: string): ProcessingMetrics | null {
    return this.metrics.get(jobId) || null;
  }

  getAllMetrics(): ProcessingMetrics[] {
    return Array.from(this.metrics.values());
  }

  logSummary(jobId: string): void {
    const metric = this.metrics.get(jobId);
    if (!metric) return;
    
    const totalTime = Object.values(metric.stages).reduce((sum, s) => sum + s.durationMs, 0);
    logger.info('Processing metrics summary', {
      jobId,
      fileName: metric.fileName,
      vendor: metric.vendor,
      format: metric.format,
      totalTimeMs: totalTime,
      stages: Object.entries(metric.stages).map(([name, data]) => ({
        name,
        durationMs: data.durationMs,
        percentage: totalTime > 0 ? Math.round((data.durationMs / totalTime) * 100) : 0
      })),
      counters: metric.counters,
      errorCount: metric.errors.length
    });
  }

  private cleanup(): void {
    if (this.metrics.size > this.MAX_STORED) {
      const toDelete = this.metrics.size - this.MAX_STORED;
      const keys = Array.from(this.metrics.keys());
      for (let i = 0; i < toDelete; i++) {
        const key = keys[i];
        if (key) this.metrics.delete(key);
      }
    }
  }
}

export const processingMetricsService = new ProcessingMetricsService();
