import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger, securityLogger } from '../utils/logger.js';

// Custom key generator that includes user ID if available
const keyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id;
  return userId ? `user:${userId}` : `ip:${req.ip}`;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  const userId = (req as any).user?.id || 'anonymous';
  const userEmail = (req as any).user?.email || 'anonymous';
  
  securityLogger.warn('Rate limit exceeded', {
    event: 'RATE_LIMIT_EXCEEDED',
    userId,
    userEmail,
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
  
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes',
  });
};

// General rate limiter - applies to all requests
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP/user to 5000 requests per windowMs (development-friendly)
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
  },
});

// Strict rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  keyGenerator: (req: Request) => `auth:${req.ip}`, // Always use IP for auth
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Authentication rate limit exceeded', {
      event: 'AUTH_RATE_LIMIT_EXCEEDED',
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Too Many Authentication Attempts',
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: '15 minutes',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for file upload endpoints
export const fileUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each user to 50 file uploads per hour
  keyGenerator,
  handler: (req: Request, res: Response) => {
    const userId = (req as any).user?.id || 'anonymous';
    
    securityLogger.warn('File upload rate limit exceeded', {
      event: 'FILE_UPLOAD_RATE_LIMIT_EXCEEDED',
      userId,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'File Upload Limit Exceeded',
      message: 'Too many file uploads. Please try again in 1 hour.',
      retryAfter: '1 hour',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for report generation
export const reportGenerationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each user to 20 report generations per hour
  keyGenerator,
  handler: (req: Request, res: Response) => {
    const userId = (req as any).user?.id || 'anonymous';
    
    logger.warn('Report generation rate limit exceeded', {
      event: 'REPORT_GENERATION_RATE_LIMIT_EXCEEDED',
      userId,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Report Generation Limit Exceeded',
      message: 'Too many report generation requests. Please try again in 1 hour.',
      retryAfter: '1 hour',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for API endpoints that modify data
export const dataModificationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each user to 30 data modification requests per minute
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Skip rate limiting for health checks and static assets
export const skipRateLimit = (req: Request): boolean => {
  const skipPaths = [
    '/api/health',
    '/api/readiness',
    '/api/liveness',
  ];
  
  return skipPaths.some(path => req.originalUrl.startsWith(path));
};