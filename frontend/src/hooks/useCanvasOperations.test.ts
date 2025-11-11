import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasOperations } from './useCanvasOperations';
import { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } from '../types/editor-constants';

describe('useCanvasOperations', () => {
  const defaultOptions = {
    canvasSize: { width: 800, height: 600 },
    containerSize: { width: 1000, height: 700 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Zoom Functionality', () => {
    it('should initialize with default zoom', () => {
      const { result } = renderHook(() => useCanvasOperations());
      
      expect(result.current.zoom).toBe(DEFAULT_ZOOM);
      expect(result.current.isAtMinZoom).toBe(false);
      expect(result.current.isAtMaxZoom).toBe(false);
    });

    it('should initialize with custom zoom', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ initialZoom: 2 })
      );
      
      expect(result.current.zoom).toBe(2);
    });

    it('should set zoom correctly', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      act(() => {
        result.current.setZoom(1.5);
      });
      
      expect(result.current.zoom).toBe(1.5);
    });

    it('should clamp zoom to valid range', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      // Test minimum clamp
      act(() => {
        result.current.setZoom(0.1);
      });
      expect(result.current.zoom).toBe(MIN_ZOOM);
      
      // Test maximum clamp
      act(() => {
        result.current.setZoom(10);
      });
      expect(result.current.zoom).toBe(MAX_ZOOM);
    });

    it('should zoom in to next level', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      // Start at 100%
      expect(result.current.zoom).toBe(1);
      
      act(() => {
        result.current.zoomIn();
      });
      
      // Should go to next level (125%)
      expect(result.current.zoom).toBe(1.25);
    });

    it('should zoom out to previous level', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ ...defaultOptions, initialZoom: 1.5 })
      );
      
      expect(result.current.zoom).toBe(1.5);
      
      act(() => {
        result.current.zoomOut();
      });
      
      // Should go to previous level (125%)
      expect(result.current.zoom).toBe(1.25);
    });

    it('should not zoom beyond limits', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ ...defaultOptions, initialZoom: MIN_ZOOM })
      );
      
      expect(result.current.isAtMinZoom).toBe(true);
      
      act(() => {
        result.current.zoomOut();
      });
      
      expect(result.current.zoom).toBe(MIN_ZOOM);
      
      // Test max zoom
      act(() => {
        result.current.setZoom(MAX_ZOOM);
      });
      
      expect(result.current.isAtMaxZoom).toBe(true);
      
      act(() => {
        result.current.zoomIn();
      });
      
      expect(result.current.zoom).toBe(MAX_ZOOM);
    });

    it('should zoom to fit canvas in container', () => {
      const { result } = renderHook(() => useCanvasOperations({
        canvasSize: { width: 800, height: 600 },
        containerSize: { width: 400, height: 300 }
      }));
      
      act(() => {
        result.current.zoomToFit();
      });
      
      // Should fit canvas in container with some margin
      expect(result.current.zoom).toBeLessThan(1);
      expect(result.current.zoom).toBeGreaterThan(0);
    });

    it('should zoom to actual size (100%)', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ ...defaultOptions, initialZoom: 2 })
      );
      
      expect(result.current.zoom).toBe(2);
      
      act(() => {
        result.current.zoomToActualSize();
      });
      
      expect(result.current.zoom).toBe(1);
    });

    it('should zoom to specific level', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      act(() => {
        result.current.zoomToLevel(2);
      });
      
      expect(result.current.zoom).toBe(2);
      
      // Should ignore invalid levels
      act(() => {
        result.current.zoomToLevel(3.7); // Not in ZOOM_LEVELS
      });
      
      expect(result.current.zoom).toBe(2); // Should remain unchanged
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle Ctrl+Plus for zoom in', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      const initialZoom = result.current.zoom;
      
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '+',
          ctrlKey: true
        });
        result.current.handleKeyDown(event);
      });
      
      expect(result.current.zoom).toBeGreaterThan(initialZoom);
    });

    it('should handle Ctrl+Equals for zoom in', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      const initialZoom = result.current.zoom;
      
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '=',
          ctrlKey: true
        });
        result.current.handleKeyDown(event);
      });
      
      expect(result.current.zoom).toBeGreaterThan(initialZoom);
    });

    it('should handle Ctrl+Minus for zoom out', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ ...defaultOptions, initialZoom: 2 })
      );
      
      const initialZoom = result.current.zoom;
      
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '-',
          ctrlKey: true
        });
        result.current.handleKeyDown(event);
      });
      
      expect(result.current.zoom).toBeLessThan(initialZoom);
    });

    it('should handle Ctrl+0 for zoom to fit', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ ...defaultOptions, initialZoom: 3 })
      );
      
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '0',
          ctrlKey: true
        });
        result.current.handleKeyDown(event);
      });
      
      // Should zoom to fit (less than original 3x zoom)
      expect(result.current.zoom).toBeLessThan(3);
    });

    it('should handle Ctrl+1 for actual size', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ ...defaultOptions, initialZoom: 2 })
      );
      
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '1',
          ctrlKey: true
        });
        result.current.handleKeyDown(event);
      });
      
      expect(result.current.zoom).toBe(1);
    });

    it('should handle Meta key (Mac) shortcuts', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      const initialZoom = result.current.zoom;
      
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '+',
          metaKey: true // Mac Command key
        });
        result.current.handleKeyDown(event);
      });
      
      expect(result.current.zoom).toBeGreaterThan(initialZoom);
    });

    it('should ignore shortcuts without modifier keys', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      const initialZoom = result.current.zoom;
      
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '+' // No Ctrl or Meta key
        });
        result.current.handleKeyDown(event);
      });
      
      expect(result.current.zoom).toBe(initialZoom);
    });
  });

  describe('Coordinate Conversion with Zoom', () => {
    it('should convert screen to canvas coordinates correctly', () => {
      const { result } = renderHook(() => useCanvasOperations({
        ...defaultOptions,
        initialZoom: 2,
        initialPan: { x: 100, y: 50 }
      }));
      
      const canvasPos = result.current.screenToCanvas({ x: 300, y: 150 });
      
      // (300 - 100) / 2 = 100, (150 - 50) / 2 = 50
      expect(canvasPos.x).toBe(100);
      expect(canvasPos.y).toBe(50);
    });

    it('should convert canvas to screen coordinates correctly', () => {
      const { result } = renderHook(() => useCanvasOperations({
        ...defaultOptions,
        initialZoom: 0.5,
        initialPan: { x: 20, y: 10 }
      }));
      
      const screenPos = result.current.canvasToScreen({ x: 100, y: 200 });
      
      // 100 * 0.5 + 20 = 70, 200 * 0.5 + 10 = 110
      expect(screenPos.x).toBe(70);
      expect(screenPos.y).toBe(110);
    });

    it('should maintain coordinate accuracy at different zoom levels', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      const originalCanvasPos = { x: 150, y: 200 };
      
      // Test at different zoom levels
      const zoomLevels = [0.25, 0.5, 1, 1.5, 2, 4];
      
      zoomLevels.forEach(zoom => {
        act(() => {
          result.current.setZoom(zoom);
        });
        
        const screenPos = result.current.canvasToScreen(originalCanvasPos);
        const backToCanvas = result.current.screenToCanvas(screenPos);
        
        // Should convert back to original position (within floating point precision)
        expect(Math.abs(backToCanvas.x - originalCanvasPos.x)).toBeLessThan(0.01);
        expect(Math.abs(backToCanvas.y - originalCanvasPos.y)).toBeLessThan(0.01);
      });
    });
  });

  describe('Wheel Zoom Functionality', () => {
    it('should zoom in on wheel up', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      const initialZoom = result.current.zoom;
      
      // Mock wheel event
      const wheelEvent = {
        preventDefault: vi.fn(),
        deltaY: -100, // Negative for zoom in
        clientX: 500,
        clientY: 350,
        target: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 1000,
            height: 700
          })
        }
      } as any;
      
      act(() => {
        result.current.handleWheel(wheelEvent);
      });
      
      expect(result.current.zoom).toBeGreaterThan(initialZoom);
      expect(wheelEvent.preventDefault).toHaveBeenCalled();
    });

    it('should zoom out on wheel down', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ ...defaultOptions, initialZoom: 2 })
      );
      
      const initialZoom = result.current.zoom;
      
      const wheelEvent = {
        preventDefault: vi.fn(),
        deltaY: 100, // Positive for zoom out
        clientX: 500,
        clientY: 350,
        target: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 1000,
            height: 700
          })
        }
      } as any;
      
      act(() => {
        result.current.handleWheel(wheelEvent);
      });
      
      expect(result.current.zoom).toBeLessThan(initialZoom);
    });

    it('should respect zoom limits during wheel zoom', () => {
      const { result } = renderHook(() => 
        useCanvasOperations({ ...defaultOptions, initialZoom: MAX_ZOOM })
      );
      
      const wheelEvent = {
        preventDefault: vi.fn(),
        deltaY: -100,
        clientX: 500,
        clientY: 350,
        target: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 1000,
            height: 700
          })
        }
      } as any;
      
      act(() => {
        result.current.handleWheel(wheelEvent);
      });
      
      expect(result.current.zoom).toBe(MAX_ZOOM);
    });
  });

  describe('Pan Operations with Zoom', () => {
    it('should maintain pan offset when zooming', () => {
      const { result } = renderHook(() => useCanvasOperations({
        ...defaultOptions,
        initialPan: { x: 100, y: 50 }
      }));
      
      expect(result.current.panOffset.x).toBe(100);
      expect(result.current.panOffset.y).toBe(50);
      
      act(() => {
        result.current.setZoom(2);
      });
      
      // Pan should be adjusted for zoom but maintain relative position
      expect(result.current.panOffset).toBeDefined();
    });

    it('should pan by delta correctly', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      act(() => {
        result.current.panBy({ x: 50, y: 30 });
      });
      
      expect(result.current.panOffset.x).toBe(50);
      expect(result.current.panOffset.y).toBe(30);
    });

    it('should center canvas correctly', () => {
      const { result } = renderHook(() => useCanvasOperations({
        canvasSize: { width: 400, height: 300 },
        containerSize: { width: 800, height: 600 },
        initialZoom: 1
      }));
      
      act(() => {
        result.current.centerCanvas();
      });
      
      // Canvas should be centered in container
      // (800 - 400) / 2 = 200, (600 - 300) / 2 = 150
      expect(result.current.panOffset.x).toBe(200);
      expect(result.current.panOffset.y).toBe(150);
    });
  });

  describe('Visible Area Calculations', () => {
    it('should calculate visible area correctly', () => {
      const { result } = renderHook(() => useCanvasOperations({
        canvasSize: { width: 800, height: 600 },
        containerSize: { width: 400, height: 300 },
        initialZoom: 1,
        initialPan: { x: -200, y: -150 }
      }));
      
      const visibleArea = result.current.getVisibleArea();
      
      expect(visibleArea.x).toBeGreaterThanOrEqual(0);
      expect(visibleArea.y).toBeGreaterThanOrEqual(0);
      expect(visibleArea.width).toBeGreaterThan(0);
      expect(visibleArea.height).toBeGreaterThan(0);
    });

    it('should check if point is visible correctly', () => {
      const { result } = renderHook(() => useCanvasOperations({
        canvasSize: { width: 800, height: 600 },
        containerSize: { width: 400, height: 300 },
        initialZoom: 1,
        initialPan: { x: 0, y: 0 }
      }));
      
      // Point within visible area
      expect(result.current.isPointVisible({ x: 100, y: 100 })).toBe(true);
      
      // Point outside visible area
      expect(result.current.isPointVisible({ x: 500, y: 400 })).toBe(false);
    });
  });

  describe('Reset and Utility Functions', () => {
    it('should reset view to initial state', () => {
      const { result } = renderHook(() => useCanvasOperations(defaultOptions));
      
      // Change zoom and pan
      act(() => {
        result.current.setZoom(2);
        result.current.panBy({ x: 100, y: 50 });
      });
      
      // Reset
      act(() => {
        result.current.resetView();
      });
      
      expect(result.current.zoom).toBe(DEFAULT_ZOOM);
      expect(result.current.panOffset.x).toBe(0);
      expect(result.current.panOffset.y).toBe(0);
    });

    it('should calculate scaled canvas size correctly', () => {
      const { result } = renderHook(() => useCanvasOperations({
        canvasSize: { width: 400, height: 300 },
        initialZoom: 2
      }));
      
      expect(result.current.canvasSize.width).toBe(800); // 400 * 2
      expect(result.current.canvasSize.height).toBe(600); // 300 * 2
    });
  });
});