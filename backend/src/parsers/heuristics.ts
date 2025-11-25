import * as fs from 'fs';
import path from 'path';
import { FileMeta } from './fileParser.js';
import { logger } from '../utils/logger.js';

export interface HeuristicResult {
  score: number;
  reasons: string[];
  vendorGuess: string | null;
  format: 'excel' | 'csv' | 'text' | 'unknown';
}

// Lightweight sampling (avoid heavy XLS parse). For .csv / .txt just read first 4KB.
export function sampleFile(meta: FileMeta, maxBytes = 4096): Buffer | null {
  try {
    const stat = fs.statSync(meta.absolutePath);
    if (stat.size === 0) return null;
    const fd = fs.openSync(meta.absolutePath, 'r');
    const size = Math.min(maxBytes, stat.size);
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, 0);
    fs.closeSync(fd);
    return buf;
  } catch (e) {
    return null;
  }
}

export function detectFormat(meta: FileMeta, sample?: Buffer): HeuristicResult {
  const reasons: string[] = [];
  let score = 0;
  let format: HeuristicResult['format'] = 'unknown';
  const ext = meta.extension.toLowerCase();

  if (ext === '.csv') { format = 'csv'; score += 10; reasons.push('Extension .csv'); }
  else if (ext === '.xls' || ext === '.xlsx') { format = 'excel'; score += 10; reasons.push(`Extension ${ext}`); }
  else if (ext === '.txt') { format = 'text'; score += 5; reasons.push('Extension .txt'); }

  // Check for vendor hints in fileName
  const nameLower = meta.fileName.toLowerCase();
  let vendorGuess: string | null = null;
  const vendorMap: Record<string,string> = {
    elitech: 'Elitech', novus: 'Novus', instrutemp: 'Instrutemp', testo: 'Testo', dlog: 'GenericDatalogger'
  };
  for (const key of Object.keys(vendorMap)) {
    if (nameLower.includes(key)) { vendorGuess = vendorMap[key] || null; reasons.push(`Filename contains vendor hint: ${key}`); score += 4; break; }
  }

  // CSV header heuristics
  if (format === 'csv' && sample) {
    const text = sample.toString('utf8');
    const firstLine = text.split(/\r?\n/)[0] || '';
    if (/temper/i.test(firstLine)) { score += 3; reasons.push('Header line contains temperature'); }
    if (/(umid|humid)/i.test(firstLine)) { score += 3; reasons.push('Header line contains humidity'); }
    if (/(data.*hora|date.*time)/i.test(firstLine)) { score += 3; reasons.push('Header seems to have date/time'); }
  }

  return { score, reasons, vendorGuess, format };
}
