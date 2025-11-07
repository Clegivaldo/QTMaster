import React from 'react';
import { PageSettings } from '../Modals/PageSettingsModal';

interface PageMarginsProps {
  pageSettings: PageSettings;
  zoom: number;
  className?: string;
}

const PageMargins: React.FC<PageMarginsProps> = ({
  pageSettings,
  zoom,
  className = ''
}) => {
  if (!pageSettings.showMargins) {
    return null;
  }

  const margins = pageSettings.margins;
  
  // Converter mm para pixels (assumindo 96 DPI)
  const mmToPx = (mm: number) => (mm * 96) / 25.4 * zoom;
  
  const marginStyles = {
    top: mmToPx(margins.top),
    right: mmToPx(margins.right),
    bottom: mmToPx(margins.bottom),
    left: mmToPx(margins.left)
  };

  // pageWidthPx and pageHeightPx not used; removed to satisfy strict TS checks

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Área de margem - overlay semi-transparente */}
      <div className="absolute inset-0">
        {/* Margem superior */}
        <div
          className="absolute top-0 left-0 right-0 bg-red-100 bg-opacity-30 border-b border-red-300 border-dashed"
          style={{ height: marginStyles.top }}
        />
        
        {/* Margem inferior */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-red-100 bg-opacity-30 border-t border-red-300 border-dashed"
          style={{ height: marginStyles.bottom }}
        />
        
        {/* Margem esquerda */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-red-100 bg-opacity-30 border-r border-red-300 border-dashed"
          style={{ width: marginStyles.left }}
        />
        
        {/* Margem direita */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-red-100 bg-opacity-30 border-l border-red-300 border-dashed"
          style={{ width: marginStyles.right }}
        />
      </div>

      {/* Área de conteúdo - borda da área editável */}
      <div
        className="absolute border-2 border-blue-400 border-dashed"
        style={{
          top: marginStyles.top,
          left: marginStyles.left,
          right: marginStyles.right,
          bottom: marginStyles.bottom
        }}
      />

      {/* Labels das margens (visíveis apenas em zoom alto) */}
      {zoom > 0.5 && (
        <>
          {/* Label margem superior */}
          {margins.top > 0 && (
            <div
              className="absolute left-1/2 transform -translate-x-1/2 text-xs text-red-600 bg-white px-1 rounded"
              style={{ top: marginStyles.top / 2 - 8 }}
            >
              {margins.top}mm
            </div>
          )}
          
          {/* Label margem inferior */}
          {margins.bottom > 0 && (
            <div
              className="absolute left-1/2 transform -translate-x-1/2 text-xs text-red-600 bg-white px-1 rounded"
              style={{ bottom: marginStyles.bottom / 2 - 8 }}
            >
              {margins.bottom}mm
            </div>
          )}
          
          {/* Label margem esquerda */}
          {margins.left > 0 && (
            <div
              className="absolute top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-red-600 bg-white px-1 rounded"
              style={{ left: marginStyles.left / 2 - 12 }}
            >
              {margins.left}mm
            </div>
          )}
          
          {/* Label margem direita */}
          {margins.right > 0 && (
            <div
              className="absolute top-1/2 transform -translate-y-1/2 rotate-90 text-xs text-red-600 bg-white px-1 rounded"
              style={{ right: marginStyles.right / 2 - 12 }}
            >
              {margins.right}mm
            </div>
          )}
        </>
      )}

      {/* Indicadores de canto */}
      <div className="absolute top-0 left-0 w-2 h-2 bg-red-400 rounded-full transform -translate-x-1 -translate-y-1" />
      <div className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full transform translate-x-1 -translate-y-1" />
      <div className="absolute bottom-0 left-0 w-2 h-2 bg-red-400 rounded-full transform -translate-x-1 translate-y-1" />
      <div className="absolute bottom-0 right-0 w-2 h-2 bg-red-400 rounded-full transform translate-x-1 translate-y-1" />
    </div>
  );
};

export default PageMargins;