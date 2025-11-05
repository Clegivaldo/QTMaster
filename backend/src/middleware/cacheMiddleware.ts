import { Request, Response, NextFunction } from 'express';
import { redisService, CACHE_TTL } from '../services/redisService.js';
import { logger } from '../utils/logger.js';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  invalidatePatterns?: string[];
}

// Cache middleware for GET requests
export const cache = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition if provided
    if (options.condition && !options.condition(req)) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(req)
        : `cache:${req.originalUrl}`;

      // Try to get from cache
      const cachedData = await redisService.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Cache miss - continue to route handler
      logger.debug(`Cache miss for key: ${cacheKey}`);
      
      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ttl = options.ttl || CACHE_TTL.MEDIUM;
          redisService.set(cacheKey, data, ttl).catch(error => {
            logger.error('Failed to cache response:', error);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Cache invalidation middleware for POST, PUT, DELETE requests
export const invalidateCache = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override response methods to invalidate cache after successful operations
    const invalidateCachePatterns = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            const count = await redisService.invalidatePattern(pattern);
            if (count > 0) {
              logger.debug(`Invalidated ${count} cache entries for pattern: ${pattern}`);
            }
          }
        } catch (error) {
          logger.error('Failed to invalidate cache:', error);
        }
      }
    };

    res.json = function(data: any) {
      invalidateCachePatterns();
      return originalJson(data);
    };

    res.send = function(data: any) {
      invalidateCachePatterns();
      return originalSend(data);
    };

    next();
  };
};

// Specific cache middleware for common patterns
export const cacheClientList = cache({
  ttl: CACHE_TTL.MEDIUM,
  keyGenerator: (req) => {
    const { page = 1, limit = 10, search, sortBy, sortOrder } = req.query;
    return `clients:list:${page}:${limit}:${search || ''}:${sortBy || ''}:${sortOrder || ''}`;
  },
});

export const cacheSensorList = cache({
  ttl: CACHE_TTL.MEDIUM,
  keyGenerator: (req) => {
    const { page = 1, limit = 10, search, typeId } = req.query;
    return `sensors:list:${page}:${limit}:${search || ''}:${typeId || ''}`;
  },
});

export const cacheValidationList = cache({
  ttl: CACHE_TTL.SHORT,
  keyGenerator: (req) => {
    const { page = 1, limit = 10, isApproved, clientId } = req.query;
    return `validations:list:${page}:${limit}:${isApproved || ''}:${clientId || ''}`;
  },
});

export const cacheReportList = cache({
  ttl: CACHE_TTL.MEDIUM,
  keyGenerator: (req) => {
    const { page = 1, limit = 10, status, clientId } = req.query;
    return `reports:list:${page}:${limit}:${status || ''}:${clientId || ''}`;
  },
});

export const cacheClientDetail = cache({
  ttl: CACHE_TTL.LONG,
  keyGenerator: (req) => `client:${req.params.id}`,
});

export const cacheSensorDetail = cache({
  ttl: CACHE_TTL.LONG,
  keyGenerator: (req) => `sensor:${req.params.id}`,
});

export const cacheValidationDetail = cache({
  ttl: CACHE_TTL.SHORT,
  keyGenerator: (req) => `validation:${req.params.id}`,
});

export const cacheReportDetail = cache({
  ttl: CACHE_TTL.MEDIUM,
  keyGenerator: (req) => `report:${req.params.id}`,
});

// Cache invalidation patterns
export const invalidateClientCache = invalidateCache([
  'clients:*',
  'client:*',
  'validations:*',
  'reports:*',
]);

export const invalidateSensorCache = invalidateCache([
  'sensors:*',
  'sensor:*',
  'validations:*',
]);

export const invalidateValidationCache = invalidateCache([
  'validations:*',
  'validation:*',
  'reports:*',
]);

export const invalidateReportCache = invalidateCache([
  'reports:*',
  'report:*',
]);

// Session cache middleware
export const cacheSession = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const sessionKey = `session:${token}`;
    
    // Try to get user from cache
    const cachedUser = await redisService.get(sessionKey);
    if (cachedUser) {
      req.user = cachedUser;
      logger.debug('User loaded from session cache');
    }
    
    next();
  } catch (error) {
    logger.error('Session cache error:', error);
    next();
  }
};

// Rate limiting with Redis
export const rateLimitWithRedis = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : `rate_limit:${req.ip}`;

      const result = await redisService.checkRateLimit(
        key,
        options.max,
        options.windowMs
      );

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limit error:', error);
      next(); // Continue on error
    }
  };
};