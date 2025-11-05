import { logger } from '../utils/logger.js';
import { redisService } from './redisService.js';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface DatabaseMetrics {
  activeConnections: number;
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalKeys: number;
  memoryUsage: number;
  evictions: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: {
    bytesIn: number;
    bytesOut: number;
  };
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000;
  private startTime = Date.now();
  private requestCounts = new Map<string, number>();
  private responseTimes = new Map<string, number[]>();

  // Track request performance
  trackRequest(method: string, path: string, duration: number, statusCode: number): void {
    const key = `${method}:${path}`;
    
    // Update request counts
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    
    // Update response times
    const times = this.responseTimes.get(key) || [];
    times.push(duration);
    
    // Keep only last 100 response times per endpoint
    if (times.length > 100) {
      times.shift();
    }
    this.responseTimes.set(key, times);

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected:', {
        method,
        path,
        duration: `${duration}ms`,
        statusCode,
      });
    }

    // Store metric
    this.addMetric({
      name: 'request_duration',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      metadata: { method, path, statusCode },
    });
  }

  // Track database query performance
  trackDatabaseQuery(query: string, duration: number, success: boolean): void {
    this.addMetric({
      name: 'db_query_duration',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      metadata: { query: query.substring(0, 100), success },
    });

    if (duration > 500) {
      logger.warn('Slow database query:', {
        query: query.substring(0, 200),
        duration: `${duration}ms`,
        success,
      });
    }
  }

  // Track cache performance
  trackCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, duration?: number): void {
    this.addMetric({
      name: `cache_${operation}`,
      value: duration || 1,
      unit: duration ? 'ms' : 'count',
      timestamp: new Date(),
      metadata: { key: key.substring(0, 50) },
    });
  }

  // Add a performance metric
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  // Get performance statistics
  getStats(): {
    uptime: number;
    requests: Record<string, { count: number; avgResponseTime: number; p95ResponseTime: number }>;
    database: Partial<DatabaseMetrics>;
    cache: Partial<CacheMetrics>;
    system: Partial<SystemMetrics>;
  } {
    const uptime = Date.now() - this.startTime;
    const requests: Record<string, { count: number; avgResponseTime: number; p95ResponseTime: number }> = {};

    // Calculate request statistics
    for (const [endpoint, times] of this.responseTimes.entries()) {
      const count = this.requestCounts.get(endpoint) || 0;
      const avgResponseTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      
      // Calculate 95th percentile
      const sortedTimes = [...times].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95ResponseTime = sortedTimes[p95Index] || 0;

      requests[endpoint] = {
        count,
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
      };
    }

    return {
      uptime,
      requests,
      database: this.getDatabaseMetrics(),
      cache: this.getCacheMetrics(),
      system: this.getSystemMetrics(),
    };
  }

  // Get database performance metrics
  private getDatabaseMetrics(): Partial<DatabaseMetrics> {
    const dbMetrics = this.metrics.filter(m => m.name.startsWith('db_'));
    const queryTimes = dbMetrics
      .filter(m => m.name === 'db_query_duration')
      .map(m => m.value);

    return {
      totalQueries: queryTimes.length,
      averageQueryTime: queryTimes.length > 0 
        ? Math.round(queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length)
        : 0,
      slowQueries: queryTimes.filter(time => time > 500).length,
    };
  }

  // Get cache performance metrics
  private getCacheMetrics(): Partial<CacheMetrics> {
    const cacheHits = this.metrics.filter(m => m.name === 'cache_hit').length;
    const cacheMisses = this.metrics.filter(m => m.name === 'cache_miss').length;
    const total = cacheHits + cacheMisses;

    return {
      hitRate: total > 0 ? Math.round((cacheHits / total) * 100) : 0,
      missRate: total > 0 ? Math.round((cacheMisses / total) * 100) : 0,
      totalKeys: cacheHits + cacheMisses,
    };
  }

  // Get system performance metrics
  private getSystemMetrics(): Partial<SystemMetrics> {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      cpuUsage: Math.round(process.cpuUsage().user / 1000000), // Convert to seconds
    };
  }

  // Get recent metrics for a specific type
  getRecentMetrics(name: string, limit: number = 50): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.name === name)
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get performance summary for the last period
  async getPerformanceSummary(periodMinutes: number = 60): Promise<{
    requests: { total: number; errors: number; avgResponseTime: number };
    cache: { hitRate: number; operations: number };
    database: { queries: number; avgQueryTime: number; slowQueries: number };
    alerts: string[];
  }> {
    const since = new Date(Date.now() - periodMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= since);

    // Request metrics
    const requestMetrics = recentMetrics.filter(m => m.name === 'request_duration');
    const errorRequests = requestMetrics.filter(m => 
      m.metadata?.statusCode >= 400
    );
    const avgResponseTime = requestMetrics.length > 0
      ? requestMetrics.reduce((sum, m) => sum + m.value, 0) / requestMetrics.length
      : 0;

    // Cache metrics
    const cacheHits = recentMetrics.filter(m => m.name === 'cache_hit').length;
    const cacheMisses = recentMetrics.filter(m => m.name === 'cache_miss').length;
    const cacheTotal = cacheHits + cacheMisses;
    const hitRate = cacheTotal > 0 ? (cacheHits / cacheTotal) * 100 : 0;

    // Database metrics
    const dbMetrics = recentMetrics.filter(m => m.name === 'db_query_duration');
    const avgQueryTime = dbMetrics.length > 0
      ? dbMetrics.reduce((sum, m) => sum + m.value, 0) / dbMetrics.length
      : 0;
    const slowQueries = dbMetrics.filter(m => m.value > 500).length;

    // Generate alerts
    const alerts: string[] = [];
    if (avgResponseTime > 2000) {
      alerts.push(`High average response time: ${Math.round(avgResponseTime)}ms`);
    }
    if (hitRate < 50 && cacheTotal > 10) {
      alerts.push(`Low cache hit rate: ${Math.round(hitRate)}%`);
    }
    if (slowQueries > 5) {
      alerts.push(`${slowQueries} slow database queries detected`);
    }
    if (errorRequests.length / requestMetrics.length > 0.05) {
      alerts.push(`High error rate: ${Math.round((errorRequests.length / requestMetrics.length) * 100)}%`);
    }

    return {
      requests: {
        total: requestMetrics.length,
        errors: errorRequests.length,
        avgResponseTime: Math.round(avgResponseTime),
      },
      cache: {
        hitRate: Math.round(hitRate),
        operations: cacheTotal,
      },
      database: {
        queries: dbMetrics.length,
        avgQueryTime: Math.round(avgQueryTime),
        slowQueries,
      },
      alerts,
    };
  }

  // Clear old metrics
  clearOldMetrics(olderThanHours: number = 24): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    const removed = initialLength - this.metrics.length;
    if (removed > 0) {
      logger.info(`Cleared ${removed} old performance metrics`);
    }
    
    return removed;
  }

  // Export metrics for external monitoring
  exportMetrics(): {
    timestamp: string;
    metrics: PerformanceMetric[];
    summary: ReturnType<typeof this.getStats>;
  } {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getStats(),
    };
  }

  // Health check based on performance metrics
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: 'pass' | 'fail'; message: string }>;
  }> {
    const checks: Record<string, { status: 'pass' | 'fail'; message: string }> = {};
    
    // Check Redis connection
    const redisHealthy = await redisService.ping();
    checks.redis = {
      status: redisHealthy ? 'pass' : 'fail',
      message: redisHealthy ? 'Redis is responding' : 'Redis is not responding',
    };

    // Check recent performance
    const summary = await this.getPerformanceSummary(10); // Last 10 minutes
    
    checks.responseTime = {
      status: summary.requests.avgResponseTime < 2000 ? 'pass' : 'fail',
      message: `Average response time: ${summary.requests.avgResponseTime}ms`,
    };

    checks.errorRate = {
      status: summary.requests.total > 0 && (summary.requests.errors / summary.requests.total) < 0.05 ? 'pass' : 'fail',
      message: `Error rate: ${summary.requests.total > 0 ? Math.round((summary.requests.errors / summary.requests.total) * 100) : 0}%`,
    };

    checks.cachePerformance = {
      status: summary.cache.operations === 0 || summary.cache.hitRate > 30 ? 'pass' : 'fail',
      message: `Cache hit rate: ${summary.cache.hitRate}%`,
    };

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail').length;
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (failedChecks === 0) {
      status = 'healthy';
    } else if (failedChecks <= 1) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks };
  }
}

// Create singleton instance
export const performanceService = new PerformanceService();

// Performance monitoring middleware
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    performanceService.trackRequest(
      req.method,
      req.route?.path || req.path,
      duration,
      res.statusCode
    );
  });
  
  next();
};