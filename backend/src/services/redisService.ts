import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private skipped = false;

  async connect(): Promise<void> {
    // Allow skipping Redis in local/dev/test environments by setting SKIP_REDIS to
    // common truthy values ('true','1','yes') or when running tests (NODE_ENV=test).
    const skipEnv = String(process.env.SKIP_REDIS || '').toLowerCase();
    if (skipEnv === 'true' || skipEnv === '1' || skipEnv === 'yes' || process.env.NODE_ENV === 'test') {
      logger.info('Redis: connection skipped (SKIP_REDIS or NODE_ENV=test)');
      this.isConnected = false;
      this.client = null;
      this.skipped = true;
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Max reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis: Connected successfully');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis: Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Redis: Failed to connect:', error);
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    // Only attempt to disconnect if a client exists and we didn't skip Redis
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (err) {
        logger.warn('Redis: Error during disconnect', err);
      }
      this.isConnected = false;
      this.client = null;
      logger.info('Redis: Disconnected');
    }
  }

  isReady(): boolean {
    return !this.skipped && this.isConnected && this.client !== null;
  }

  // Expose whether Redis was intentionally skipped (useful for tests/environments)
  isSkipped(): boolean {
    return this.skipped;
  }

  // Session management
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<boolean> {
    if (!this.isReady()) return false;
    
    try {
      await this.client!.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Redis: Failed to set session:', error);
      return false;
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
    if (!this.isReady()) return null;
    
    try {
      const data = await this.client!.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis: Failed to get session:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.isReady()) return false;
    
    try {
      await this.client!.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Redis: Failed to delete session:', error);
      return false;
    }
  }

  // Generic caching
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isReady()) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client!.setEx(key, ttl, serializedValue);
      } else {
        await this.client!.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      logger.error('Redis: Failed to set key:', error);
      return false;
    }
  }

  async get(key: string): Promise<any | null> {
    if (!this.isReady()) return null;
    
    try {
      const data = await this.client!.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis: Failed to get key:', error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    
    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      logger.error('Redis: Failed to delete key:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    
    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis: Failed to check key existence:', error);
      return false;
    }
  }

  // Cache with automatic expiration
  async cache<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached as T;
    }

    // If not in cache, fetch and store
    try {
      const data = await fetchFunction();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      logger.error('Redis: Failed to cache data:', error);
      throw error;
    }
  }

  // Invalidate cache patterns
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isReady()) return 0;
    
    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(keys);
        return keys.length;
      }
      return 0;
    } catch (error) {
      logger.error('Redis: Failed to invalidate pattern:', error);
      return 0;
    }
  }

  // Rate limiting
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.isReady()) {
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowMs };
    }

    try {
      const current = await this.client!.incr(key);
      
      if (current === 1) {
        await this.client!.expire(key, Math.ceil(windowMs / 1000));
      }

      const ttl = await this.client!.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      logger.error('Redis: Failed to check rate limit:', error);
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowMs };
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    if (!this.isReady()) return false;
    
    try {
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis: Ping failed:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    if (!this.isReady()) return null;
    
    try {
      const info = await this.client!.info('memory');
      const keyspace = await this.client!.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
      };
    } catch (error) {
      logger.error('Redis: Failed to get stats:', error);
      return null;
    }
  }
}

// Create singleton instance
export const redisService = new RedisService();

// Cache keys constants
export const CACHE_KEYS = {
  USER_SESSION: (userId: string) => `session:user:${userId}`,
  CLIENT_LIST: (page: number, limit: number) => `clients:list:${page}:${limit}`,
  CLIENT_DETAIL: (id: string) => `client:${id}`,
  SENSOR_LIST: (page: number, limit: number) => `sensors:list:${page}:${limit}`,
  SENSOR_DETAIL: (id: string) => `sensor:${id}`,
  VALIDATION_LIST: (page: number, limit: number) => `validations:list:${page}:${limit}`,
  VALIDATION_DETAIL: (id: string) => `validation:${id}`,
  REPORT_LIST: (page: number, limit: number) => `reports:list:${page}:${limit}`,
  REPORT_DETAIL: (id: string) => `report:${id}`,
  SENSOR_DATA: (sensorId: string, date: string) => `sensor_data:${sensorId}:${date}`,
  STATISTICS: (type: string, period: string) => `stats:${type}:${period}`,
} as const;

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
  VERY_LONG: 3600,  // 1 hour
  SESSION: 28800,   // 8 hours
} as const;