import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';
import { redisService } from './services/redisService.js';
import { 
  generalRateLimit, 
  authRateLimit, 
  fileUploadRateLimit, 
  reportGenerationRateLimit,
  dataModificationRateLimit,
  skipRateLimit 
} from './middleware/rateLimitMiddleware.js';
import { 
  metricsMiddleware, 
  auditMiddleware, 
  errorTrackingMiddleware 
} from './middleware/metricsMiddleware.js';
import { performanceMiddleware } from './services/performanceService.js';
import { BackupService } from './services/backupService.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Request metrics and audit middleware
app.use(metricsMiddleware);
app.use(auditMiddleware);
app.use(performanceMiddleware);

// Rate limiting with different limits for different endpoints
app.use((req, res, next) => {
  if (skipRateLimit(req)) {
    return next();
  }
  
  // Apply specific rate limits based on endpoint
  if (req.originalUrl.startsWith('/api/auth')) {
    return authRateLimit(req, res, next);
  }
  
  if (req.originalUrl.startsWith('/api/files/upload') || req.originalUrl.startsWith('/api/files/process')) {
    return fileUploadRateLimit(req, res, next);
  }
  
  if (req.originalUrl.startsWith('/api/reports') && req.method === 'POST') {
    return reportGenerationRateLimit(req, res, next);
  }
  
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return dataModificationRateLimit(req, res, next);
  }
  
  // Default rate limit
  return generalRateLimit(req, res, next);
});

// Body parsing middleware with optimized compression
app.use(compression({
  level: 6, // Compression level (0-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if the request includes a Cache-Control: no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// API routes
app.use('/api', routes);

// Error tracking middleware
app.use(errorTrackingMiddleware);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    requestId: (req as any).requestId,
  });
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    requestId: (req as any).requestId,
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    requestId: (req as any).requestId,
  });
  
  res.status(404).json({ 
    error: 'Route not found',
    requestId: (req as any).requestId,
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redisService.disconnect();
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason,
    promise,
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/api/monitoring/health`);
  logger.info(`🔍 Monitoring: http://localhost:${PORT}/api/monitoring`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize Redis
  try {
    await redisService.connect();
    logger.info('🔴 Redis connected successfully');
  } catch (error) {
    logger.warn('🔴 Redis connection failed, continuing without cache:', error);
  }
  
  // Initialize backup service
  BackupService.init();
  logger.info('💾 Backup service initialized');
});