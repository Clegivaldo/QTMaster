import React, { useCallback, useState } from 'react';
import { Settings } from 'lucide-react';
import { TemplateElement, LineData } from '../../../../types/editor';

interface LineElementProps {
  element: TemplateElement & { content: LineData };
  isSelected: boolean;
  zoom: number;
  onEdit?: (elementId: string, newContent: LineData) => void;
}

const LineElement: React.FC<LineElementProps> = ({
  element,
  isSelected,
  zoom,
  onEdit
}) => {
  const [showControls, setShowControls] = useState(false);

  // Garantir que os dados da linha existam
  const lineData: LineData = {
    startPoint: element.content.startPoint || { x: 0, y: 0 },
    endPoint: element.content.endPoint || { x: element.size.width, y: element.size.height },
    thickness: element.content.thickness || 2,
    style: element.content.style || { width: 2, style: 'solid', color: '#000000' }
  };

  // Calcular ângulo e comprimento da linha
  const deltaX = lineData.endPoint.x - lineData.startPoint.x;
  const deltaY = lineData.endPoint.y - lineData.startPoint.y;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  // Handler para alterar espessura
  const handleThicknessChange = useCallback((newThickness: number) => {
    const newData = { ...lineData, thickness: Math.max(1, Math.min(20, newThickness)) };
    onEdit?.(element.id, newData);
  }, [lineData, element.id, onEdit]);

  // Handler para alterar cor
  const handleColorChange = useCallback((newColor: string) => {
    const newData = { 
      ...lineData, 
      style: { 
        width: lineData.style.width,
        style: lineData.style.style,
        color: newColor 
      }
    };
    onEdit?.(element.id, newData);
  }, [lineData, element.id, onEdit]);

  // Handler para alterar estilo da linha
  const handleStyleChange = useCallback((newStyle: 'solid' | 'dashed' | 'dotted') => {
    const newData = { 
      ...lineData, 
      style: { 
        width: lineData.style.width,
        style: newStyle,
        color: lineData.style.color 
      }
    };
    onEdit?.(element.id, newData);
  }, [lineData, element.id, onEdit]);

  return (
    <div 
      className="w-full h-full relative"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Controles da linha (visíveis apenas quando selecionado) */}
      {isSelected && showControls && (
        <div className="absolute -top-12 left-0 flex items-center gap-1 bg-white border border-gray-300 rounded shadow-lg px-2 py-1 z-10">
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Espessura:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={lineData.thickness}
              onChange={(e) => handleThicknessChange(parseInt(e.target.value))}
              className="w-16"
            />
            <span className="text-xs text-gray-600 w-6">{lineData.thickness}px</span>
          </div>
          
          <div className="w-px h-4 bg-gray-300 mx-1" />
          
          <input
            type="color"
            value={lineData.style.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
            title="Cor da linha"
          />
          
          <select
            value={lineData.style.style}
            onChange={(e) => handleStyleChange(e.target.value as 'solid' | 'dashed' | 'dotted')}
            className="text-xs border border-gray-300 rounded px-1"
          >
            <option value="solid">Sólida</option>
            <option value="dashed">Tracejada</option>
            <option value="dotted">Pontilhada</option>
          </select>
          
          <div className="w-px h-4 bg-gray-300 mx-1" />
          
          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Configurações avançadas"
          >
            <Settings className="h-3 w-3 text-gray-600" />
          </button>
        </div>
      )}

      {/* Linha usando SVG para melhor renderização */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <line
          x1={lineData.startPoint.x}
          y1={lineData.startPoint.y}
          x2={lineData.endPoint.x}
          y2={lineData.endPoint.y}
          stroke={lineData.style.color}
          strokeWidth={lineData.thickness}
          strokeDasharray={
            lineData.style.style === 'dashed' ? '5,5' :
            lineData.style.style === 'dotted' ? '2,2' : 
            undefined
          }
          strokeLinecap="round"
        />
      </svg>

      {/* Pontos de controle nas extremidades (quando selecionado) */}
      {isSelected && (
        <>
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-move"
            style={{
              left: `${lineData.startPoint.x - 4}px`,
              top: `${lineData.startPoint.y - 4}px`,
              transform: `scale(${Math.max(0.5, 1 / zoom)})`
            }}
            title="Ponto inicial"
          />
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-move"
            style={{
              left: `${lineData.endPoint.x - 4}px`,
              top: `${lineData.endPoint.y - 4}px`,
              transform: `scale(${Math.max(0.5, 1 / zoom)})`
            }}
            title="Ponto final"
          />
        </>
      )}

      {/* Informações da linha (quando selecionada) */}
      {isSelected && (
        <div className="absolute -bottom-6 left-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {Math.round(length)}px • {Math.round(angle)}°
        </div>
      )}
    </div>
  );
};

export default LineElement;