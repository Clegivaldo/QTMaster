import * as fs from 'fs';
import * as readline from 'readline';
import { Transform, Writable } from 'stream';
import { logger } from '../utils/logger.js';

/**
 * Interface para configuração de processamento em streaming
 */
export interface StreamProcessorConfig {
  chunkSize: number;
  highWaterMark?: number;
  encoding?: BufferEncoding;
  skipEmptyLines?: boolean;
  maxConcurrency?: number;
}

/**
 * Processador de linhas em streaming para arquivos grandes
 */
export class LineStreamProcessor {
  private processed = 0;
  private failed = 0;
  private config: Required<StreamProcessorConfig>;

  constructor(config: Partial<StreamProcessorConfig> = {}) {
    this.config = {
      chunkSize: config.chunkSize || 1000,
      highWaterMark: config.highWaterMark || 64 * 1024, // 64KB
      encoding: config.encoding || 'utf8',
      skipEmptyLines: config.skipEmptyLines ?? true,
      maxConcurrency: config.maxConcurrency || 5,
    };
  }

  /**
   * Processa um arquivo linha por linha usando streaming
   */
  async processFile<T>(
    filePath: string,
    lineProcessor: (line: string, lineNumber: number) => Promise<T | null>,
    onProgress?: (progress: { processed: number; failed: number; percentage: number }) => void
  ): Promise<{ results: T[]; processed: number; failed: number }> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const errors: Error[] = [];
      let lineNumber = 0;
      let totalLines = 0;

      // Primeiro, contar total de linhas para progresso preciso
      const countStream = fs.createReadStream(filePath, { 
        encoding: this.config.encoding,
        highWaterMark: this.config.highWaterMark
      });
      
      const countRl = readline.createInterface({
        input: countStream,
        crlfDelay: Infinity,
      });

      countRl.on('line', () => totalLines++);
      countRl.on('close', () => {
        // Agora processar o arquivo
        this.processLines(filePath, totalLines, lineProcessor, onProgress)
          .then(result => resolve(result))
          .catch(err => reject(err));
      });
    });
  }

  private async processLines<T>(
    filePath: string,
    totalLines: number,
    lineProcessor: (line: string, lineNumber: number) => Promise<T | null>,
    onProgress?: (progress: { processed: number; failed: number; percentage: number }) => void
  ): Promise<{ results: T[]; processed: number; failed: number }> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let lineNumber = 0;
      let processingBatch: Promise<void>[] = [];

      const fileStream = fs.createReadStream(filePath, {
        encoding: this.config.encoding,
        highWaterMark: this.config.highWaterMark
      });

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        lineNumber++;

        // Pular linhas vazias se configurado
        if (this.config.skipEmptyLines && line.trim() === '') {
          return;
        }

        // Controlar concorrência
        if (processingBatch.length >= this.config.maxConcurrency) {
          rl.pause();
          Promise.race(processingBatch).then(() => {
            rl.resume();
          });
        }

        // Processar linha
        const processingPromise = lineProcessor(line, lineNumber)
          .then(result => {
            if (result !== null) {
              results.push(result);
            }
            this.processed++;

            // Reportar progresso
            if (onProgress && this.processed % this.config.chunkSize === 0) {
              const percentage = totalLines > 0 
                ? Math.round((this.processed / totalLines) * 100)
                : 0;
              
              onProgress({
                processed: this.processed,
                failed: this.failed,
                percentage,
              });
            }
          })
          .catch(error => {
            this.failed++;
            logger.error(`Error processing line ${lineNumber}`, {
              line: line.substring(0, 100),
              error: error instanceof Error ? error.message : String(error)
            });
          })
          .finally(() => {
            // Remover da lista de processamento
            processingBatch = processingBatch.filter(p => p !== processingPromise);
          });

        processingBatch.push(processingPromise);
      });

      rl.on('close', async () => {
        // Aguardar todas as operações pendentes
        await Promise.all(processingBatch);

        // Progresso final
        if (onProgress) {
          onProgress({
            processed: this.processed,
            failed: this.failed,
            percentage: 100,
          });
        }

        resolve({
          results,
          processed: this.processed,
          failed: this.failed,
        });
      });

      rl.on('error', (error) => {
        reject(error);
      });

      fileStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Processa um arquivo em batches
   */
  async processBatches<T>(
    filePath: string,
    batchProcessor: (batch: string[], startLine: number) => Promise<T[]>,
    onProgress?: (progress: { processed: number; failed: number; percentage: number }) => void
  ): Promise<{ results: T[]; processed: number; failed: number }> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let batch: string[] = [];
      let lineNumber = 0;
      let batchStartLine = 1;

      const fileStream = fs.createReadStream(filePath, {
        encoding: this.config.encoding,
        highWaterMark: this.config.highWaterMark
      });

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const processBatch = async () => {
        if (batch.length === 0) return;

        try {
          const batchResults = await batchProcessor(batch, batchStartLine);
          results.push(...batchResults);
          this.processed += batch.length;

          if (onProgress) {
            onProgress({
              processed: this.processed,
              failed: this.failed,
              percentage: 0, // Não temos total aqui
            });
          }
        } catch (error) {
          this.failed += batch.length;
          logger.error(`Error processing batch starting at line ${batchStartLine}`, {
            error: error instanceof Error ? error.message : String(error),
            batchSize: batch.length
          });
        }

        batch = [];
        batchStartLine = lineNumber + 1;
      };

      rl.on('line', async (line) => {
        lineNumber++;

        if (this.config.skipEmptyLines && line.trim() === '') {
          return;
        }

        batch.push(line);

        if (batch.length >= this.config.chunkSize) {
          rl.pause();
          await processBatch();
          rl.resume();
        }
      });

      rl.on('close', async () => {
        // Processar batch final
        await processBatch();

        if (onProgress) {
          onProgress({
            processed: this.processed,
            failed: this.failed,
            percentage: 100,
          });
        }

        resolve({
          results,
          processed: this.processed,
          failed: this.failed,
        });
      });

      rl.on('error', (error) => {
        reject(error);
      });

      fileStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Reseta contadores
   */
  reset(): void {
    this.processed = 0;
    this.failed = 0;
  }

  /**
   * Obtém estatísticas atuais
   */
  getStats() {
    return {
      processed: this.processed,
      failed: this.failed,
      successRate: this.processed > 0 
        ? ((this.processed - this.failed) / this.processed) * 100 
        : 0,
    };
  }
}

/**
 * Stream Transform para processar dados em chunks
 */
export class ChunkTransformStream<T, R> extends Transform {
  private buffer: T[] = [];
  private chunkSize: number;
  private processor: (chunk: T[]) => Promise<R[]>;

  constructor(
    chunkSize: number,
    processor: (chunk: T[]) => Promise<R[]>,
    options?: any
  ) {
    super({ ...options, objectMode: true });
    this.chunkSize = chunkSize;
    this.processor = processor;
  }

  override async _transform(data: T, encoding: string, callback: Function) {
    this.buffer.push(data);

    if (this.buffer.length >= this.chunkSize) {
      try {
        const results = await this.processor(this.buffer);
        this.buffer = [];
        results.forEach(result => this.push(result));
        callback();
      } catch (error) {
        callback(error);
      }
    } else {
      callback();
    }
  }

  override async _flush(callback: Function) {
    if (this.buffer.length > 0) {
      try {
        const results = await this.processor(this.buffer);
        results.forEach(result => this.push(result));
        callback();
      } catch (error) {
        callback(error);
      }
    } else {
      callback();
    }
  }
}

/**
 * Utilitário para estimar tamanho de arquivo
 */
export async function estimateFileLineCount(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    rl.on('line', () => lineCount++);
    rl.on('close', () => resolve(lineCount));
    rl.on('error', reject);
    stream.on('error', reject);
  });
}
