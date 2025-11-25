import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';
import * as fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { redisService } from './redisService.js';

interface FallbackOptions {
  suitcaseId: string;
  userId: string;
  validateData: boolean;
  chunkSize: number;
  jobId: string;
  fileName: string;
  validationId?: string;
  vendorGuess?: string;
}

export class PythonFallbackService {
  private readonly PYTHON_BIN = process.env.PYTHON_FALLBACK_BIN || 'python3';
  private readonly SCRIPT_PATH = process.env.PYTHON_FALLBACK_SCRIPT || '/app/python/fallback_parser.py';
  private readonly TIMEOUT_MS = Number(process.env.PYTHON_FALLBACK_TIMEOUT_MS || 20000);

  async processLegacyXls(filePath: string, originalName: string, options: FallbackOptions & { forceSensorId?: string }): Promise<any> {
    if (!fs.existsSync(filePath)) {
      throw new Error('Fallback: file not found');
    }
    
    // Determine sheet name based on vendor
    let sheetName: string | undefined;
    switch (options.vendorGuess?.toLowerCase()) {
      case 'elitech':
        sheetName = 'Lista';
        break;
      case 'novus':
        sheetName = 'Dados';
        break;
      case 'instrutemp':
        sheetName = 'Dados';
        break;
      case 'testo':
        sheetName = 'Data';
        break;
      default:
        sheetName = undefined; // Let Python use default (first sheet)
    }
    
    logger.info('Python fallback sheet selection', { vendor: options.vendorGuess, sheetName: sheetName || '(default)' });
    
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const args = sheetName ? [this.SCRIPT_PATH, filePath, sheetName] : [this.SCRIPT_PATH, filePath];
      const child = spawn(this.PYTHON_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const rows: any[] = [];
      let stderr = '';
      let resolved = false;
      let totalLines = 0;
      let failedLines = 0;
      const batch: any[] = [];
      const BATCH_SIZE = Math.min(options.chunkSize || 500, 1000);

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { child.kill('SIGKILL'); } catch {}
          reject(new Error('Python fallback timeout'));
        }
      }, this.TIMEOUT_MS);

      child.stdout.on('data', async chunk => {
        const text = chunk.toString();
        for (const line of text.split(/\r?\n/)) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.error) {
              failedLines++;
              continue;
            }
            totalLines++;
            const sensorId = options.forceSensorId || 'unknown';
            const timestampStr = obj.timestamp;
            let timestamp: Date | null = null;
            if (timestampStr) {
              const d = new Date(timestampStr);
              if (!isNaN(d.getTime())) timestamp = d; else timestamp = null;
            }
            const temperature = typeof obj.temperature === 'number' ? obj.temperature : parseFloat(String(obj.temperature));
            const humidity = obj.humidity == null ? null : (typeof obj.humidity === 'number' ? obj.humidity : parseFloat(String(obj.humidity)));
            // Basic validations
            if (timestamp && !isNaN(temperature) && temperature >= -80 && temperature <= 120) {
              batch.push({
                sensorId,
                timestamp,
                temperature,
                humidity: humidity == null || isNaN(humidity) ? null : humidity,
                fileName: options.fileName,
                rowNumber: totalLines,
                validationId: options.validationId ?? null,
                createdAt: new Date()
              });
            } else {
              failedLines++;
            }
            if (batch.length >= BATCH_SIZE) {
              try {
                await prisma.sensorData.createMany({ data: batch, skipDuplicates: true });
              } catch (dbErr) {
                logger.error('Python fallback batch insert error', { message: (dbErr as any)?.message });
                failedLines += batch.length;
              }
              batch.length = 0;
              // progress update
              try {
                await redisService.set(`job:progress:${options.jobId}`, { processed: totalLines, failed: failedLines }, 3600);
              } catch {}
            }
          } catch (e) {
            // ignore malformed line
          }
        }
      });

      child.stderr.on('data', chunk => { stderr += chunk.toString(); });

      child.on('error', err => {
        if (!resolved) {
          clearTimeout(timer);
          resolved = true;
          reject(err);
        }
      });

      child.on('close', async code => {
        if (resolved) return;
        clearTimeout(timer);
        resolved = true;
        if (code !== 0) {
          logger.error('Python fallback exited with non-zero code', { code, stderr });
          return reject(new Error(stderr || `Python fallback failed with code ${code}`));
        }
        const duration = Date.now() - start;
        // Flush remaining batch
        if (batch.length) {
          try {
            await prisma.sensorData.createMany({ data: batch, skipDuplicates: true });
          } catch (dbErr) {
            logger.error('Python fallback final batch insert error', { message: (dbErr as any)?.message });
            failedLines += batch.length;
          }
        }
        logger.info('Python fallback completed', { originalName, totalLines, failedLines, duration });
        const processedRows = totalLines - failedLines;
        resolve({
          totalRows: totalLines,
          processedRows,
            failedRows: failedLines,
          errors: [],
          warnings: [],
          processingTime: duration,
        });
      });
    });
  }
}

export const pythonFallbackService = new PythonFallbackService();
