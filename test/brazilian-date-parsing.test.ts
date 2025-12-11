import { describe, it, expect } from 'vitest';
import { parseToDate, formatDisplayTime } from '../frontend/src/utils/parseDate';

describe('Brazilian Date Parsing', () => {
  describe('parseToDate function', () => {
    it('should parse dd/mm/yyyy HH:MM format correctly', () => {
      const result = parseToDate('15/01/2024 10:30');
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(0); // January (0-based)
      expect(result.getFullYear()).toBe(2024);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
    });

    it('should parse dd/mm/yyyy HH:MM:SS format correctly', () => {
      const result = parseToDate('15/01/2024 10:30:45');
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(45);
    });

    it('should handle single digit day and month', () => {
      const result = parseToDate('5/1/2024 10:30');
      expect(result.getDate()).toBe(5);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should handle 2-digit year correctly (assuming 2000s for years >= 50)', () => {
      const result = parseToDate('15/01/24 10:30');
      expect(result.getFullYear()).toBe(2024); // 24 + 2000
    });

    it('should handle 2-digit year correctly (assuming 1900s for years < 50)', () => {
      const result = parseToDate('15/01/45 10:30');
      expect(result.getFullYear()).toBe(2045); // 45 + 2000
    });

    it('should parse 4-digit year correctly', () => {
      const result = parseToDate('15/01/1995 10:30');
      expect(result.getFullYear()).toBe(1995);
    });

    it('should handle different day/month formats', () => {
      // Test various combinations
      expect(parseToDate('1/2/2024 10:30').getDate()).toBe(1);
      expect(parseToDate('1/2/2024 10:30').getMonth()).toBe(1);

      expect(parseToDate('10/12/2024 10:30').getDate()).toBe(10);
      expect(parseToDate('10/12/2024 10:30').getMonth()).toBe(11);
    });

    it('should return invalid date for malformed input', () => {
      const result = parseToDate('invalid date');
      expect(result.getTime()).toBeNaN();
    });

    it('should handle Date objects correctly', () => {
      const inputDate = new Date(2024, 0, 15, 10, 30);
      const result = parseToDate(inputDate);
      expect(result.getTime()).toBe(inputDate.getTime());
    });

    it('should parse ISO format correctly', () => {
      const result = parseToDate('2024-01-15T10:30:00');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('formatDisplayTime function', () => {
    it('should format date to dd/MM/yy HH:mm format', () => {
      const date = new Date(2024, 0, 15, 10, 30); // Jan 15, 2024 10:30
      const result = formatDisplayTime(date);
      expect(result).toBe('15/01/24 10:30');
    });

    it('should handle single digit hours and minutes', () => {
      const date = new Date(2024, 0, 15, 9, 5); // Jan 15, 2024 09:05
      const result = formatDisplayTime(date);
      expect(result).toBe('15/01/24 09:05');
    });

    it('should return empty string for invalid date', () => {
      const result = formatDisplayTime(new Date(NaN));
      expect(result).toBe('');
    });

    it('should handle timestamp numbers', () => {
      const timestamp = new Date(2024, 0, 15, 10, 30).getTime();
      const result = formatDisplayTime(timestamp);
      expect(result).toBe('15/01/24 10:30');
    });

    it('should handle string timestamps', () => {
      const dateStr = '2024-01-15T10:30:00';
      const result = formatDisplayTime(dateStr);
      expect(result).toBe('15/01/24 10:30');
    });
  });

  describe('Edge cases and real-world scenarios', () => {
    it('should handle dates from Excel exports (common in thermal qualification)', () => {
      // Common Excel date formats that might appear
      const testCases = [
        '01/12/2024 08:00',
        '31/12/2024 23:59',
        '15/06/2024 14:30:00',
        '5/3/2024 9:15',
      ];

      testCases.forEach(dateStr => {
        const result = parseToDate(dateStr);
        expect(result.getTime()).not.toBeNaN();
        expect(isNaN(result.getTime())).toBe(false);
      });
    });

    it('should not confuse month/day order (Brazilian vs American format)', () => {
      // In Brazilian format: dd/mm/yyyy
      const brDate = parseToDate('15/01/2024 10:30'); // January 15
      expect(brDate.getDate()).toBe(15);
      expect(brDate.getMonth()).toBe(0); // January

      // Should NOT be interpreted as American format (mm/dd/yyyy = January 15)
      // If it were American, month would be 15 (invalid) and day would be 1
      expect(brDate.getMonth()).not.toBe(14); // Not month 15 (invalid)
    });
  });
});