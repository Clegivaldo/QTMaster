import winston from 'winston';
import { mkdirSync } from 'fs';
import path from 'path';

const { combine, timestamp, errors, json, colorize, simple, printf } = winston.format;

// Custom format for structured logging
const structuredFormat = printf(({ level, message, timestamp, service, ...meta }) => {
  const logEntry = {
    timestamp,
    level,
    service,
    message,
    ...meta,
  };
  return JSON.stringify(logEntry);
});

// Create logs directory structure
const createLogDirectories = () => {
  const logDirs = ['logs', 'logs/audit', 'logs/security', 'logs/performance'];
  
  logDirs.forEach(dir => {
    try {
      mkdirSync(dir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create log directory ${dir}:`, error);
    }
  });
};

createLogDirectories();

// Base logger configuration
const baseLoggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    structuredFormat
  ),
  defaultMeta: { 
    service: 'laudo-termico-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },
};

// Main application logger
export const logger = winston.createLogger({
  ...baseLoggerConfig,
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
    // Warning logs
    new winston.transports.File({ 
      filename: 'logs/warn.log', 
      level: 'warn',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    // All logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
  ],
});

// Audit logger for security and compliance
export const auditLogger = winston.createLogger({
  ...baseLoggerConfig,
  defaultMeta: { 
    ...baseLoggerConfig.defaultMeta,
    logType: 'audit',
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/audit/audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 20, // Keep more audit logs
      tailable: true,
    }),
  ],
});

// Security logger for authentication and authorization events
export const securityLogger = winston.createLogger({
  ...baseLoggerConfig,
  defaultMeta: { 
    ...baseLoggerConfig.defaultMeta,
    logType: 'security',
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security/security.log',
      maxsize: 10485760, // 10MB
      maxFiles: 15,
      tailable: true,
    }),
  ],
});

// Performance logger for monitoring application performance
export const performanceLogger = winston.createLogger({
  ...baseLoggerConfig,
  defaultMeta: { 
    ...baseLoggerConfig.defaultMeta,
    logType: 'performance',
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/performance/performance.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
  ],
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  const consoleTransport = new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      printf(({ level, message, timestamp, service, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
      })
    )
  });
  
  logger.add(consoleTransport);
  auditLogger.add(consoleTransport);
  securityLogger.add(consoleTransport);
}

// Utility functions for structured logging
export const logAuditEvent = (event: string, details: Record<string, any>) => {
  auditLogger.info(event, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logSecurityEvent = (event: string, details: Record<string, any>) => {
  securityLogger.warn(event, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logPerformanceEvent = (event: string, metrics: Record<string, any>) => {
  performanceLogger.info(event, {
    event,
    ...metrics,
    timestamp: new Date().toISOString(),
  });
};

// Error handling for logger itself
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

auditLogger.on('error', (error) => {
  console.error('Audit logger error:', error);
});

securityLogger.on('error', (error) => {
  console.error('Security logger error:', error);
});

performanceLogger.on('error', (error) => {
  console.error('Performance logger error:', error);
});