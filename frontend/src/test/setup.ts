import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.confirm
global.confirm = vi.fn(() => true);

// Mock window.alert
global.alert = vi.fn();

// Minimal ResizeObserver mock for jsdom (vitest)
;(global as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};