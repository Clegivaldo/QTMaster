import React from 'react';
import { Position } from '../../../../types/editor';

interface GridOverlayProps {
  show?: boolean;
  gridSize?: number; // em pixels
  color?: string;
  opacity?: number;
  snapHighlight?: {
    position: Position | null;
    tolerance: number;
  };
  pageSize?: { width: number; height: number }; // tamanho da página em pixels
  className?: string;
}

const GridOverlay: React.FC<GridOverlayProps> = ({
  show = true,
  gridSize = 20,
  color = '#cbd5e1',
  opacity = 0.6,
  snapHighlight,
  pageSize,
  className
}) => {
  if (!show) return null;

  const background = `linear-gradient(0deg, rgba(0,0,0,0) ${gridSize - 1}px, ${color} ${gridSize - 1}px), linear-gradient(90deg, rgba(0,0,0,0) ${gridSize - 1}px, ${color} ${gridSize - 1}px)`;

  // Se temos pageSize, limitar a grade ao tamanho da página
  const gridStyle: React.CSSProperties = pageSize ? {
    position: 'absolute',
    left: 0,
    top: 0,
    width: pageSize.width,
    height: pageSize.height,
    pointerEvents: 'none',
    backgroundImage: background,
    backgroundSize: `${gridSize}px ${gridSize}px`,
    opacity,
    zIndex: 500
  } : {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: background,
    backgroundSize: `${gridSize}px ${gridSize}px`,
    opacity,
    zIndex: 500
  };

  return (
    <div
      aria-hidden
      className={className}
      style={gridStyle}
    >
      {/* Highlight snap points */}
      {snapHighlight?.position && (
        <div
          style={{
            position: 'absolute',
            left: snapHighlight.position.x - 4,
            top: snapHighlight.position.y - 4,
            width: 8,
            height: 8,
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)',
            zIndex: 501
          }}
        />
      )}
    </div>
  );
};

export default GridOverlay;
