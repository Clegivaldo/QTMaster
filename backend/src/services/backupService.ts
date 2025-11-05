import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

const execAsync = promisify(exec);

export class BackupService {
  private static backupDir = 'backups';
  private static maxBackups = 30; // Keep 30 days of backups
  
  static init() {
    // Create backup directory if it doesn't exist
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
    
    // Schedule daily backups at 2 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting scheduled database backup');
      await this.createBackup();
    });
    
    // Schedule weekly cleanup on Sundays at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      logger.info('Starting backup cleanup');
      await this.cleanupOldBackups();
    });
    
    logger.info('Backup service initialized with daily backups at 2 AM');
  }
  
  static async createBackup(): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      
      // Parse database URL to extract connection details
      const url = new URL(databaseUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1); // Remove leading slash
      const username = url.username;
      const password = url.password;
      
      // Set environment variables for pg_dump
      const env = {
        ...process.env,
        PGPASSWORD: password,
      };
      
      // Create pg_dump command
      const command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-password --verbose --clean --if-exists --create > "${backupPath}"`;
      
      logger.info('Starting database backup', {
        backupFileName,
        database,
        host,
        port,
      });
      
      const startTime = Date.now();
      await execAsync(command, { env });
      const duration = Date.now() - startTime;
      
      // Get backup file size
      const stats = statSync(backupPath);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      logger.info('Database backup completed successfully', {
        backupFileName,
        fileSizeInMB,
        durationMs: duration,
        backupPath,
      });
      
      return backupPath;
      
    } catch (error) {
      logger.error('Database backup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      return null;
    }
  }
  
  static async cleanupOldBackups(): Promise<void> {
    try {
      if (!existsSync(this.backupDir)) {
        return;
      }
      
      const files = readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: statSync(path.join(this.backupDir, file)),
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime()); // Sort by modification time, newest first
      
      if (files.length <= this.maxBackups) {
        logger.info('No backup cleanup needed', {
          currentBackups: files.length,
          maxBackups: this.maxBackups,
        });
        return;
      }
      
      const filesToDelete = files.slice(this.maxBackups);
      let deletedCount = 0;
      let totalSizeDeleted = 0;
      
      for (const file of filesToDelete) {
        try {
          totalSizeDeleted += file.stats.size;
          unlinkSync(file.path);
          deletedCount++;
          
          logger.info('Deleted old backup file', {
            fileName: file.name,
            fileSizeInMB: (file.stats.size / (1024 * 1024)).toFixed(2),
          });
        } catch (error) {
          logger.error('Failed to delete backup file', {
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      logger.info('Backup cleanup completed', {
        deletedCount,
        totalSizeDeletedInMB: (totalSizeDeleted / (1024 * 1024)).toFixed(2),
        remainingBackups: files.length - deletedCount,
      });
      
    } catch (error) {
      logger.error('Backup cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
  
  static async listBackups(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    sizeInMB: string;
    createdAt: Date;
  }>> {
    try {
      if (!existsSync(this.backupDir)) {
        return [];
      }
      
      const files = readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = statSync(filePath);
          
          return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
            createdAt: stats.birthtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return files;
      
    } catch (error) {
      logger.error('Failed to list backups', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return [];
    }
  }
  
  static async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      if (!existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      
      // Parse database URL
      const url = new URL(databaseUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;
      
      // Set environment variables for psql
      const env = {
        ...process.env,
        PGPASSWORD: password,
      };
      
      // Create psql command to restore backup
      const command = `psql -h ${host} -p ${port} -U ${username} -d ${database} --no-password < "${backupPath}"`;
      
      logger.info('Starting database restore', {
        backupPath,
        database,
        host,
        port,
      });
      
      const startTime = Date.now();
      await execAsync(command, { env });
      const duration = Date.now() - startTime;
      
      logger.info('Database restore completed successfully', {
        backupPath,
        durationMs: duration,
      });
      
      return true;
      
    } catch (error) {
      logger.error('Database restore failed', {
        backupPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      return false;
    }
  }
  
  static getBackupStatus(): {
    enabled: boolean;
    backupDirectory: string;
    maxBackups: number;
    nextScheduledBackup: string;
  } {
    return {
      enabled: true,
      backupDirectory: this.backupDir,
      maxBackups: this.maxBackups,
      nextScheduledBackup: '2:00 AM daily',
    };
  }
}