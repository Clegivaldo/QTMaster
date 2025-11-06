import { describe, it, expect } from '@jest/globals';

// Simple date utility functions for testing
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should handle different dates correctly', () => {
      const date = new Date('2023-12-31T23:59:59Z');
      expect(formatDate(date)).toBe('2023-12-31');
    });
  });

  describe('addDays', () => {
    it('should add days to date correctly', () => {
      const date = new Date('2024-01-01');
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2024-01-06');
    });

    it('should subtract days when negative number provided', () => {
      const date = new Date('2024-01-10');
      const result = addDays(date, -3);
      expect(formatDate(result)).toBe('2024-01-07');
    });

    it('should handle month boundaries', () => {
      const date = new Date('2024-01-30');
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2024-02-04');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2024-01-01'))).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate('2024-01-01')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });
});