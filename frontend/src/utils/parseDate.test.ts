import { describe, it, expect } from 'vitest';
import { parseToDate, formatDisplayTime } from './parseDate';

describe('parseDate util', () => {
  it('parses yyyy-mm-dd HH:MM:SS and formats dd/MM/yy HH:mm', () => {
    const s = '2024-01-15 10:15:00';
    const d = parseToDate(s);
    expect(d instanceof Date).toBe(true);
    expect(formatDisplayTime(d)).toBe('15/01/24 10:15');
  });

  it('parses ISO with Z and treats as naive (no tz shift)', () => {
    const s = '2024-01-15T10:15:00Z';
    const d = parseToDate(s);
    expect(formatDisplayTime(d)).toBe('15/01/24 10:15');
  });

  it('parses dd/mm/yyyy HH:mm and returns correct format', () => {
    const s = '15/01/2024 10:15';
    const d = parseToDate(s);
    expect(formatDisplayTime(d)).toBe('15/01/24 10:15');
  });
});
