import { describe, it, expect } from '@jest/globals';

// Simple validation utility functions for testing
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateCNPJ = (cnpj: string): boolean => {
  // Remove non-numeric characters
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.length === 14;
};

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', () => {
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('123456')).toBe(true);
    });

    it('should return false for invalid password', () => {
      expect(validatePassword('12345')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('validateCNPJ', () => {
    it('should return true for valid CNPJ format', () => {
      expect(validateCNPJ('12.345.678/0001-90')).toBe(true);
      expect(validateCNPJ('12345678000190')).toBe(true);
    });

    it('should return false for invalid CNPJ format', () => {
      expect(validateCNPJ('123456789')).toBe(false);
      expect(validateCNPJ('12.345.678/0001')).toBe(false);
    });
  });
});