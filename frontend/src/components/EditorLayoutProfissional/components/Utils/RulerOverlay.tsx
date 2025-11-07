import React from 'react';

interface RulerOverlayProps {
  show?: boolean;
  unit?: 'px' | 'mm' | 'cm';
  zoom?: number; // fator de zoom aplicado ao canvas
  gridSize?: number; // distância base em pixels entre principais marcas
  pageSize?: { width: number; height: number }; // tamanho da página em pixels
  insideCanvas?: boolean; // quando true, offsets are zero so it aligns inside canvas
  className?: string;
}

const mmToPx = (mm: number, zoom: number = 1) => (mm * 96) / 25.4 * zoom;
const cmToPx = (cm: number, zoom: number = 1) => mmToPx(cm * 10, zoom);

const RulerOverlay: React.FC<RulerOverlayProps> = ({
  show = true,
  unit = 'cm',
  zoom = 1,
  gridSize = 50,
  pageSize = { width: 800, height: 600 },
  insideCanvas = false,
  className
}) => {
  if (!show) return null;

  // Calcular conversão baseada na unidade
  const getUnitConversion = () => {
    switch (unit) {
      case 'mm': return (px: number) => px / mmToPx(1, zoom);
      case 'cm': return (px: number) => px / cmToPx(1, zoom);
      default: return (px: number) => px / zoom;
    }
  };

  const unitConversion = getUnitConversion();

  // Render ticks for ruler
  const createTicks = (lengthPx: number, isHorizontal = true) => {
    const ticks: React.ReactNode[] = [];
    const majorStep = gridSize * zoom;
    const minorStep = majorStep / 5;
    const steps = Math.ceil(lengthPx / minorStep);

    for (let i = 0; i <= steps; i++) {
      const pos = i * minorStep;
      const isMajor = (i % 5) === 0;
      const style: React.CSSProperties = isHorizontal
        ? { left: pos }
        : { top: pos };

      const value = unitConversion(pos);

      ticks.push(
        <div
          key={`${isHorizontal ? 'h' : 'v'}-tick-${i}`}
          className={`absolute ${isHorizontal ? 'h-3 top-0' : 'w-3 left-0'}`}
          style={{
            ...(style as any),
            background: 'transparent'
          }}
        >
          <div
            style={{
              width: isHorizontal ? 1 : (isMajor ? 8 : 4),
              height: isHorizontal ? (isMajor ? 12 : 6) : 1,
              background: '#333',
              opacity: 0.8,
              marginLeft: isHorizontal ? -0.5 : 0,
              marginTop: isHorizontal ? 0 : -0.5
            }}
          />
          {isMajor && (
            <div
              style={{
                position: 'absolute',
                top: isHorizontal ? 12 : 0,
                left: isHorizontal ? -8 : 12,
                fontSize: 10,
                color: '#333',
                whiteSpace: 'nowrap'
              }}
            >
              {Math.round(value)}
            </div>
          )}
        </div>
      );
    }

    return ticks;
  };

  // Rulers rendered as overlay bars
  const horizontalLeft = insideCanvas ? 0 : 24;
  const verticalTop = insideCanvas ? 0 : 24;

  return (
    <div aria-hidden className={className} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Horizontal ruler */}
      <div style={{
        position: 'absolute',
        left: horizontalLeft,
        top: 0,
        width: pageSize.width,
        height: 24,
        background: 'linear-gradient(180deg,#f8fafc,#fff)',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 520
      }}>
        <div style={{ position: 'relative', height: '100%' }}>
          {createTicks(pageSize.width, true)}
        </div>
      </div>

      {/* Vertical ruler */}
      <div style={{
        position: 'absolute',
        top: verticalTop,
        left: 0,
        width: 24,
        height: pageSize.height,
        background: 'linear-gradient(90deg,#f8fafc,#fff)',
        borderRight: '1px solid #e5e7eb',
        zIndex: 520
      }}>
        <div style={{ position: 'relative', height: '100%' }}>
          {createTicks(pageSize.height, false)}
        </div>
      </div>

      {/* Corner spacer (hidden when insideCanvas) */}
      {!insideCanvas && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          background: '#f8fafc',
          borderRight: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          zIndex: 521
        }} />
      )}
    </div>
  );
};

export default RulerOverlay;
