import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResponsive } from '../../../hooks/useResponsive';

describe('useResponsive', () => {
  it('should work', () => {
    const { result } = renderHook(() => useResponsive());
    expect(result.current).toBeDefined();
  });
});