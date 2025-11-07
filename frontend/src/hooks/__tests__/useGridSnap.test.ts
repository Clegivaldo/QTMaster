import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGridSnap } from '../useGridSnap';

describe('useGridSnap', () => {
  it('snap to nearest grid point with default gridSize', () => {
    const { result } = renderHook(() => useGridSnap({ gridSize: 10, enabled: true }));
    const { snap } = result.current;
    expect(snap({ x: 12, y: 18 })).toEqual({ x: 10, y: 20 });
    expect(snap({ x: 5, y: 5 })).toEqual({ x: 10, y: 10 });
  });

  it('respects disabled flag', () => {
    const { result } = renderHook(() => useGridSnap({ gridSize: 10, enabled: false }));
    const { snap } = result.current;
    expect(snap({ x: 12, y: 18 })).toEqual({ x: 12, y: 18 });
  });

  it('uses custom gridSize', () => {
    const { result } = renderHook(() => useGridSnap({ gridSize: 25, enabled: true, tolerance: 15 }));
    const { snap } = result.current;
    expect(snap({ x: 37, y: 63 })).toEqual({ x: 25, y: 75 }); // 37 está a 12 do grid 25, dentro da tolerância 15
  });

  it('respects tolerance for snapping', () => {
    const { result } = renderHook(() => useGridSnap({ gridSize: 10, enabled: true, tolerance: 3 }));
    const { snap } = result.current;

    // Dentro da tolerância - deve fazer snap
    expect(snap({ x: 7, y: 8 })).toEqual({ x: 10, y: 10 }); // 7 está a 3 do grid 10, dentro da tolerância

    // Fora da tolerância - não deve fazer snap
    expect(snap({ x: 6, y: 12 })).toEqual({ x: 6, y: 10 }); // x=6 está a 4 do grid 10 (fora), y=12 está a 2 do grid 10 (dentro)
  });

  it('works with zero tolerance', () => {
    const { result } = renderHook(() => useGridSnap({ gridSize: 10, enabled: true, tolerance: 0 }));
    const { snap } = result.current;

    // Com tolerância 0, deve sempre fazer snap para o ponto mais próximo
    expect(snap({ x: 12, y: 18 })).toEqual({ x: 10, y: 20 });
    expect(snap({ x: 5, y: 5 })).toEqual({ x: 10, y: 10 });
  });

  it('handles edge cases with tolerance', () => {
    const { result } = renderHook(() => useGridSnap({ gridSize: 20, enabled: true, tolerance: 2 }));
    const { snap } = result.current;

    // Exatamente na tolerância
    expect(snap({ x: 18, y: 22 })).toEqual({ x: 20, y: 20 }); // 18 e 22 estão a 2 do grid 20

    // Um pixel além da tolerância
    expect(snap({ x: 17, y: 23 })).toEqual({ x: 17, y: 23 }); // x=17 está a 3 do grid 20 (fora), y=23 está a 3 do grid 20 (fora)
  });

  it('validates snap position correctly', () => {
    const { result } = renderHook(() => useGridSnap({ gridSize: 10, enabled: true, tolerance: 2 }));
    const { isSnapped } = result.current;

    // Posições válidas para snap
    expect(isSnapped({ x: 10, y: 10 })).toBe(true);
    expect(isSnapped({ x: 20, y: 30 })).toBe(true);

    // Posições dentro da tolerância também são consideradas válidas
    expect(isSnapped({ x: 8, y: 9 })).toBe(true); // Dentro da tolerância do grid 10,10

    // Posições fora da tolerância não são válidas
    expect(isSnapped({ x: 7, y: 6 })).toBe(false); // x=7 está a 3 do grid 10 (fora), y=6 está a 4 do grid 10 (fora)
  });
});
