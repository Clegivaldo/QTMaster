import { Router } from 'express';
import { healthCheck, readinessCheck, livenessCheck } from '../controllers/healthController.js';
import { BackupService } from '../services/backupService.js';
import { AuditService } from '../services/auditService.js';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Public health check endpoints (no authentication required)
router.get('/health', healthCheck);
router.get('/readiness', readinessCheck);
router.get('/liveness', livenessCheck);

// Protected monitoring endpoints (require authentication)
router.use(authenticateToken);

// Backup management endpoints
router.get('/backups', async (req, res) => {
  try {
    const backups = await BackupService.listBackups();
    const status = BackupService.getBackupStatus();
    
    res.json({
      backups,
      status,
    });
  } catch (error) {
    logger.error('Failed to list backups:', error);
    res.status(500).json({
      error: 'Failed to retrieve backup information',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/backups', async (req, res) => {
  try {
    const backupPath = await BackupService.createBackup();
    
    if (backupPath) {
      res.json({
        success: true,
        message: 'Backup created successfully',
        backupPath,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create backup',
      });
    }
  } catch (error) {
    logger.error('Failed to create backup:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/backups/restore', async (req, res) => {
  try {
    const { backupPath } = req.body;
    
    if (!backupPath) {
      return res.status(400).json({
        error: 'Backup path is required',
      });
    }
    
    const success = await BackupService.restoreBackup(backupPath);
    
    if (success) {
      res.json({
        success: true,
        message: 'Database restored successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to restore database',
      });
    }
  } catch (error) {
    logger.error('Failed to restore backup:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Audit log endpoints
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      userId,
      resource,
      action,
      startDate,
      endDate,
      success,
      page = '1',
      limit = '50',
    } = req.query;
    
    const filters: any = {};
    
    if (userId) filters.userId = userId as string;
    if (resource) filters.resource = resource as string;
    if (action) filters.action = action as string;
    if (success !== undefined) filters.success = success === 'true';
    
    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }
    
    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }
    
    const result = await AuditService.getAuditLogs(
      filters,
      parseInt(page as string, 10),
      parseInt(limit as string, 10)
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve audit logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// System metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    res.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100, // MB
        heapTotal: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
        heapUsed: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
        external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100, // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    logger.error('Failed to retrieve system metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve system metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Log levels endpoint
router.get('/logs/levels', (req, res) => {
  res.json({
    current: logger.level,
    available: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
  });
});

router.put('/logs/levels', (req, res) => {
  try {
    const { level } = req.body;
    
    const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    
    if (!level || !validLevels.includes(level)) {
      return res.status(400).json({
        error: 'Invalid log level',
        validLevels,
      });
    }
    
    logger.level = level;
    
    logger.info('Log level changed', {
      newLevel: level,
      changedBy: (req as any).user?.email || 'unknown',
    });
    
    res.json({
      success: true,
      message: `Log level changed to ${level}`,
      currentLevel: logger.level,
    });
  } catch (error) {
    logger.error('Failed to change log level:', error);
    res.status(500).json({
      error: 'Failed to change log level',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;