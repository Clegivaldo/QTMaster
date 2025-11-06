import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, ChevronDown } from 'lucide-react';
import { ZOOM_LEVELS, MIN_ZOOM, MAX_ZOOM } from '../../../../types/editor-constants';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
  onZoomChange: (zoom: number) => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomToFit,
  onZoomChange
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const zoomPercentage = Math.round(zoom * 100);

  // Zoom presets comuns
  const zoomPresets = [
    { label: 'Ajustar à tela', value: 'fit', zoom: 1 },
    { label: '25%', value: '25', zoom: 0.25 },
    { label: '50%', value: '50', zoom: 0.5 },
    { label: '75%', value: '75', zoom: 0.75 },
    { label: '100%', value: '100', zoom: 1 },
    { label: '125%', value: '125', zoom: 1.25 },
    { label: '150%', value: '150', zoom: 1.5 },
    { label: '200%', value: '200', zoom: 2 },
    { label: '300%', value: '300', zoom: 3 },
    { label: '400%', value: '400', zoom: 4 }
  ];

  // Encontrar o próximo nível de zoom
  const getNextZoomLevel = useCallback((direction: 'in' | 'out') => {
    const currentIndex = ZOOM_LEVELS.findIndex(level => level >= zoom);
    
    if (direction === 'in') {
      return currentIndex < ZOOM_LEVELS.length - 1 
        ? ZOOM_LEVELS[currentIndex + 1] 
        : MAX_ZOOM;
    } else {
      return currentIndex > 0 
        ? ZOOM_LEVELS[currentIndex - 1] 
        : MIN_ZOOM;
    }
  }, [zoom]);

  // Zoom inteligente (vai para o próximo nível predefinido)
  const handleSmartZoomIn = useCallback(() => {
    const nextLevel = getNextZoomLevel('in');
    onZoomChange(nextLevel);
  }, [getNextZoomLevel, onZoomChange]);

  const handleSmartZoomOut = useCallback(() => {
    const nextLevel = getNextZoomLevel('out');
    onZoomChange(nextLevel);
  }, [getNextZoomLevel, onZoomChange]);

  // Handler para mudança no input
  const handleZoomInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 25 && numValue <= 400) {
      onZoomChange(numValue / 100);
    }
  }, [onZoomChange]);

  // Handler para Enter no input
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const value = parseInt(inputValue || zoomPercentage.toString());
      if (!isNaN(value)) {
        const clampedValue = Math.max(25, Math.min(400, value));
        onZoomChange(clampedValue / 100);
        setInputValue('');
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setInputValue('');
      inputRef.current?.blur();
    }
  }, [inputValue, zoomPercentage, onZoomChange]);

  // Handler para seleção de preset
  const handlePresetSelect = useCallback((preset: typeof zoomPresets[0]) => {
    if (preset.value === 'fit') {
      onZoomToFit();
    } else {
      onZoomChange(preset.zoom);
    }
    setShowPresets(false);
  }, [onZoomChange, onZoomToFit]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPresets(false);
      }
    };

    if (showPresets) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPresets]);

  // Atualizar input value quando zoom muda externamente
  useEffect(() => {
    if (!inputRef.current || document.activeElement !== inputRef.current) {
      setInputValue('');
    }
  }, [zoom]);

  const displayValue = inputValue || zoomPercentage.toString();
  const isAtMinZoom = zoom <= MIN_ZOOM;
  const isAtMaxZoom = zoom >= MAX_ZOOM;

  return (
    <div className="flex items-center gap-1 relative">
      {/* Zoom Out */}
      <button
        onClick={handleSmartZoomOut}
        disabled={isAtMinZoom}
        className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Diminuir zoom (Ctrl + -) - Próximo: ${Math.round(getNextZoomLevel('out') * 100)}%`}
      >
        <ZoomOut className="h-4 w-4" />
      </button>

      {/* Zoom Input com Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleZoomInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setInputValue(zoomPercentage.toString())}
            onBlur={() => setInputValue('')}
            className="w-16 px-2 py-1 text-xs text-center bg-gray-800 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={zoomPercentage.toString()}
          />
          <span className="text-xs text-gray-300">%</span>
          
          {/* Dropdown Button */}
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Presets de zoom"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown de Presets */}
        {showPresets && (
          <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-[140px]">
            <div className="py-1">
              {zoomPresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700 transition-colors ${
                    preset.zoom === zoom ? 'bg-gray-700 text-blue-400' : 'text-gray-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zoom In */}
      <button
        onClick={handleSmartZoomIn}
        disabled={isAtMaxZoom}
        className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Aumentar zoom (Ctrl + +) - Próximo: ${Math.round(getNextZoomLevel('in') * 100)}%`}
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      {/* Zoom to Fit */}
      <button
        onClick={onZoomToFit}
        className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Ajustar zoom à tela (Ctrl + 0)"
      >
        <Maximize className="h-4 w-4" />
      </button>

      {/* Indicador de zoom atual (apenas em desenvolvimento) */}
      {import.meta.env?.DEV && (
        <div className="ml-2 text-xs text-gray-500">
          {ZOOM_LEVELS.includes(zoom) ? '●' : '○'}
        </div>
      )}
    </div>
  );
};

export default ZoomControls;