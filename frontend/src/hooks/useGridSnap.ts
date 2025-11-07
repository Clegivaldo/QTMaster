import { useCallback } from 'react';
import { Position } from '../types/editor';

interface UseGridSnapOptions {
  gridSize: number;
  enabled: boolean;
  tolerance?: number; // pixels
}

interface UseGridSnapReturn {
  snap: (position: Position) => Position;
  snapX: (x: number) => number;
  snapY: (y: number) => number;
  isSnapped: (position: Position) => boolean;
  getNearestGridPoint: (position: Position) => Position;
}

export const useGridSnap = ({
  gridSize,
  enabled,
  tolerance = 5
}: UseGridSnapOptions): UseGridSnapReturn => {

  const snapX = useCallback((x: number): number => {
    if (!enabled) return x;

    const gridX = Math.round(x / gridSize) * gridSize;
    
    // Se tolerância for 0, sempre faz snap
    if (tolerance === 0) return gridX;
    
    const distance = Math.abs(x - gridX);

    // Só aplica snap se estiver dentro da tolerância
    return distance <= tolerance ? gridX : x;
  }, [gridSize, enabled, tolerance]);

  const snapY = useCallback((y: number): number => {
    if (!enabled) return y;

    const gridY = Math.round(y / gridSize) * gridSize;
    
    // Se tolerância for 0, sempre faz snap
    if (tolerance === 0) return gridY;
    
    const distance = Math.abs(y - gridY);

    // Só aplica snap se estiver dentro da tolerância
    return distance <= tolerance ? gridY : y;
  }, [gridSize, enabled, tolerance]);

  const snap = useCallback((position: Position): Position => {
    return {
      x: snapX(position.x),
      y: snapY(position.y)
    };
  }, [snapX, snapY]);

  const isSnapped = useCallback((position: Position): boolean => {
    if (!enabled) return false;

    const gridX = Math.round(position.x / gridSize) * gridSize;
    const gridY = Math.round(position.y / gridSize) * gridSize;
    const distanceX = Math.abs(position.x - gridX);
    const distanceY = Math.abs(position.y - gridY);

    return distanceX <= tolerance && distanceY <= tolerance;
  }, [enabled, gridSize, tolerance]);

  const getNearestGridPoint = useCallback((position: Position): Position => {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
  }, [gridSize]);

  return {
    snap,
    snapX,
    snapY,
    isSnapped,
    getNearestGridPoint
  };
};
