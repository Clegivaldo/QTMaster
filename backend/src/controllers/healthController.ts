import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { performanceService } from '../services/performanceService.js';
import { redisService } from '../services/redisService.js';
import os from 'os';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
      usage: number;
    };
  };
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      responseTime?: number;
      error?: string;
    };
    fileSystem: {
      status: 'accessible' | 'error';
      logsDirectory: boolean;
      uploadsDirectory: boolean;
      tempDirectory: boolean;
    };
  };
  metrics: {
    totalRequests?: number;
    errorRate?: number;
    averageResponseTime?: number;
  };
}

// Simple in-memory metrics store (in production, use Redis or proper metrics store)
let requestCount = 0;
let errorCount = 0;
let responseTimes: number[] = [];

export const updateMetrics = (responseTime: number, isError: boolean = false) => {
  requestCount++;
  if (isError) errorCount++;
  
  responseTimes.push(responseTime);
  // Keep only last 1000 response times
  if (responseTimes.length > 1000) {
    responseTimes = responseTimes.slice(-1000);
  }
};

const checkDatabaseHealth = async (): Promise<{ status: 'connected' | 'disconnected' | 'error'; responseTime?: number; error?: string }> => {
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = performance.now() - start;
    
    return {
      status: 'connected',
      responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
};

const checkFileSystemHealth = () => {
  try {
    const fs = require('fs');
    
    const logsDirectory = fs.existsSync('logs');
    const uploadsDirectory = fs.existsSync('uploads');
    const tempDirectory = fs.existsSync('temp');
    
    return {
      status: 'accessible' as const,
      logsDirectory,
      uploadsDirectory,
      tempDirectory,
    };
  } catch (error) {
    logger.error('File system health check failed:', error);
    return {
      status: 'error' as const,
      logsDirectory: false,
      uploadsDirectory: false,
      tempDirectory: false,
    };
  }
};

const getSystemMetrics = () => {
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    memory: {
      used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
      total: Math.round((totalMemory / 1024 / 1024) * 100) / 100, // MB
      percentage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
    },
    cpu: {
      loadAverage: os.loadavg(),
      usage: Math.round(process.cpuUsage().user / 1000000 * 100) / 100, // Convert to percentage
    },
  };
};

const calculateMetrics = () => {
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  const averageResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
    : 0;
  
  return {
    totalRequests: requestCount,
    errorRate: Math.round(errorRate * 100) / 100,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
  };
};

export const healthCheck = async (req: Request, res: Response) => {
  try {
    const start = performance.now();
    
    // Check all services
    const [databaseHealth, fileSystemHealth] = await Promise.all([
      checkDatabaseHealth(),
      Promise.resolve(checkFileSystemHealth()),
    ]);
    
    const systemMetrics = getSystemMetrics();
    const appMetrics = calculateMetrics();
    
    // Determine overall health status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (databaseHealth.status === 'error') {
      overallStatus = 'unhealthy';
    } else if (
      databaseHealth.status === 'disconnected' ||
      fileSystemHealth.status === 'error' ||
      systemMetrics.memory.percentage > 90 ||
      appMetrics.errorRate > 10
    ) {
      overallStatus = 'degraded';
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      system: systemMetrics,
      services: {
        database: databaseHealth,
        fileSystem: fileSystemHealth,
      },
      metrics: appMetrics,
    };
    
    const responseTime = performance.now() - start;
    updateMetrics(responseTime, false);
    
    // Log health check if status is not healthy
    if (overallStatus !== 'healthy') {
      logger.warn('Health check shows degraded/unhealthy status:', {
        status: overallStatus,
        services: healthStatus.services,
        metrics: healthStatus.metrics,
      });
    }
    
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    logger.error('Health check endpoint error:', error);
    updateMetrics(0, true);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Check if the application is ready to serve requests
    const databaseHealth = await checkDatabaseHealth();
    
    if (databaseHealth.status === 'connected') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: {
          database: databaseHealth,
        },
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        services: {
          database: databaseHealth,
        },
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const livenessCheck = (req: Request, res: Response) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};