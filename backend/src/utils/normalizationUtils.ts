import { logger } from '../utils/logger.js';

const DATE_PATTERNS = [
  /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
];

export interface RawReading {
  timestamp: any;
  temperature: any;
  humidity?: any;
  sensorId?: string;
}

export interface NormalizedReading {
  sensorId: string;
  timestamp: Date;
  temperature: number;
  humidity: number | null;
}

export function parseNumberLocale(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (!str) return null;
  // Remove thousand separators (either . or ,) heuristically
  const cleaned = str
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(/,(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseTimestampFlexible(raw: any): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) return raw;
  const str = String(raw).trim();
  if (!str) return null;
  // Try native Date first
  const native = new Date(str);
  if (!isNaN(native.getTime())) return native;
  for (const pattern of DATE_PATTERNS) {
    const m = str.match(pattern);
    if (m) {
      try {
        if (pattern === DATE_PATTERNS[0]) { // dd/MM/YYYY
          const [_, d, M, Y, hh, mm, ss] = m;
          return new Date(Number(Y), Number(M) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0));
        } else { // YYYY-MM-DD
          const [_, Y, M, d, hh, mm, ss] = m;
          return new Date(Number(Y), Number(M) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0));
        }
      } catch {}
    }
  }
  return null;
}

export function normalizeReading(raw: RawReading, fallbackSensorId?: string): NormalizedReading | null {
  try {
    const ts = parseTimestampFlexible(raw.timestamp);
    if (!ts) return null;
    const temp = parseNumberLocale(raw.temperature);
    if (temp == null) return null;
    let hum = parseNumberLocale(raw.humidity);
    if (hum != null && (hum < 0 || hum > 100)) hum = null;
    const sensorId = raw.sensorId || fallbackSensorId || 'unknown';
    return { sensorId, timestamp: ts, temperature: temp, humidity: hum };
  } catch (e) {
    logger.debug('normalizeReading failed', { error: (e as any)?.message });
    return null;
  }
}
