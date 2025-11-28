import { describe, it, expect } from 'vitest';
import { formatDisplayTime, parseToDate } from '../frontend/src/utils/parseDate';
import { formatDateShort } from '../backend/src/utils/formatDate';

describe('Date formatting', () => {
  it('formatDisplayTime should return dd/MM/yy HH:mm for numeric timestamp', () => {
    const d = new Date(2024, 0, 15, 10, 5); // 15 Jan 2024 10:05
    const out = formatDisplayTime(d);
    expect(out).toBe('15/01/24 10:05');
  });

  it('parseToDate should parse yyyy-mm-dd HH:MM:SS correctly', () => {
    const s = '2024-01-15 10:15:00';
    const d = parseToDate(s);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(15);
  });

  it('formatDateShort (backend) should format Date/ISO to dd/MM/yy HH:mm', () => {
    const s = '2024-01-15T10:30:00';
    const out = formatDateShort(s);
    expect(out).toBe('15/01/24 10:30');
  });
});
