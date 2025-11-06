import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock do ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock do matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});