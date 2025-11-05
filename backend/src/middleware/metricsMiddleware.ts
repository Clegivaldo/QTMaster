import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { updateMetrics } from '../controllers/healthController.js';
import { performance } from 'perf_hooks';

interface RequestWithMetrics extends Request {
  startTime?: number;
  requestId?: string;
}

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const metricsMiddleware = (req: RequestWithMetrics, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const requestId = generateRequestId();
  
  req.startTime = startTime;
  req.requestId = requestId;
  
  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', requestId);
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    const isError = res.statusCode >= 400;
    
    // Update metrics
    updateMetrics(responseTime, isError);
    
    // Log response
    const logLevel = isError ? 'warn' : 'info';
    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: Math.round(responseTime * 100) / 100,
      contentLength: res.get('Content-Length') || 0,
      timestamp: new Date().toISOString(),
    });
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

export const auditMiddleware = (req: RequestWithMetrics, res: Response, next: NextFunction) => {
  // Only audit critical operations
  const criticalOperations = [
    'POST', 'PUT', 'DELETE'
  ];
  
  const criticalPaths = [
    '/api/auth/login',
    '/api/clients',
    '/api/sensors',
    '/api/suitcases',
    '/api/validations',
    '/api/reports',
    '/api/files/upload',
    '/api/files/process',
  ];
  
  const shouldAudit = criticalOperations.includes(req.method) || 
                     criticalPaths.some(path => req.originalUrl.startsWith(path));
  
  if (shouldAudit) {
    // Log audit information
    logger.info('Audit log', {
      requestId: req.requestId,
      operation: `${req.method} ${req.originalUrl}`,
      userId: (req as any).user?.id || 'anonymous',
      userEmail: (req as any).user?.email || 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
      params: req.params,
      query: req.query,
    });
  }
  
  next();
};

// Sanitize request body to remove sensitive information
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

export const errorTrackingMiddleware = (err: Error, req: RequestWithMetrics, res: Response, next: NextFunction) => {
  const responseTime = req.startTime ? performance.now() - req.startTime : 0;
  
  // Update error metrics
  updateMetrics(responseTime, true);
  
  // Log detailed error information
  logger.error('Request error', {
    requestId: req.requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: sanitizeHeaders(req.headers),
      body: sanitizeBody(req.body),
      params: req.params,
      query: req.query,
    },
    user: {
      id: (req as any).user?.id || 'anonymous',
      email: (req as any).user?.email || 'anonymous',
    },
    timestamp: new Date().toISOString(),
  });
  
  next(err);
};

// Sanitize headers to remove sensitive information
const sanitizeHeaders = (headers: any): any => {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const sanitized = { ...headers };
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  
  return sanitized;
};