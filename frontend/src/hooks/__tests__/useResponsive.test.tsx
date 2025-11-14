import { describe, it, expect } from 'vitest';

describe('useResponsive Hook', () => {
  it('should be importable', () => {
    // Testar apenas se o hook pode ser importado sem erros
    expect(() => {
      // Importar dinamicamente para evitar erros de execução
      const hook = require('../../hooks/useResponsive');
      expect(hook.useResponsive).toBeDefined();
      expect(typeof hook.useResponsive).toBe('function');
    }).not.toThrow();
  });
});