import React, { useCallback, useState } from 'react';
import { Square, Circle, Settings, Palette } from 'lucide-react';
import { TemplateElement, ShapeData } from '../../../../types/editor';

interface ShapeElementProps {
  element: TemplateElement & { content: ShapeData };
  isSelected: boolean;
  zoom: number;
  onEdit?: (elementId: string, newContent: ShapeData) => void;
}

const ShapeElement: React.FC<ShapeElementProps> = ({
  element,
  isSelected,
  zoom: _zoom, // Prefixed with underscore to indicate intentionally unused
  onEdit
}) => {
  const [showControls, setShowControls] = useState(false);

  // Garantir que os dados da forma existam
  const shapeData: ShapeData = {
    fillColor: element.content.fillColor || 'transparent',
    strokeColor: element.content.strokeColor || '#000000',
    strokeWidth: element.content.strokeWidth || 2
  };

  // Handler para alterar cor de preenchimento
  const handleFillColorChange = useCallback((newColor: string) => {
    const newData = { ...shapeData, fillColor: newColor };
    onEdit?.(element.id, newData);
  }, [shapeData, element.id, onEdit]);

  // Handler para alterar cor da borda
  const handleStrokeColorChange = useCallback((newColor: string) => {
    const newData = { ...shapeData, strokeColor: newColor };
    onEdit?.(element.id, newData);
  }, [shapeData, element.id, onEdit]);

  // Handler para alterar espessura da borda
  const handleStrokeWidthChange = useCallback((newWidth: number) => {
    const newData = { ...shapeData, strokeWidth: Math.max(0, Math.min(20, newWidth)) };
    onEdit?.(element.id, newData);
  }, [shapeData, element.id, onEdit]);

  // Handler para remover preenchimento (transparente)
  const handleRemoveFill = useCallback(() => {
    const newData = { ...shapeData, fillColor: 'transparent' };
    onEdit?.(element.id, newData);
  }, [shapeData, element.id, onEdit]);

  // Estilos da forma baseados no tipo e zoom
  const getShapeStyles = () => {
    const baseStyles = {
      width: '100%',
      height: '100%',
      backgroundColor: shapeData.fillColor,
      border: (shapeData.strokeWidth || 0) > 0 ? 
        `${shapeData.strokeWidth}px solid ${shapeData.strokeColor}` : 
        'none',
      opacity: element.styles.opacity || 1,
      borderRadius: element.type === 'circle' ? '50%' : (element.styles.borderRadius || 0)
    };

    return baseStyles;
  };

  // Renderizar ícone baseado no tipo
  const renderIcon = () => {
    switch (element.type) {
      case 'circle':
        return <Circle className="h-6 w-6 text-gray-400" />;
      case 'rectangle':
      default:
        return <Square className="h-6 w-6 text-gray-400" />;
    }
  };

  // Verificar se a forma está vazia (sem preenchimento e sem borda)
  const isEmpty = shapeData.fillColor === 'transparent' && shapeData.strokeWidth === 0;

  return (
    <div 
      className="w-full h-full relative"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Controles da forma (visíveis apenas quando selecionado) */}
      {isSelected && showControls && (
        <div className="absolute -top-12 left-0 flex items-center gap-1 bg-white border border-gray-300 rounded shadow-lg px-2 py-1 z-10">
          {/* Cor de preenchimento */}
          <div className="flex items-center gap-1">
            <Palette className="h-3 w-3 text-gray-500" />
            <input
              type="color"
              value={shapeData.fillColor === 'transparent' ? '#ffffff' : shapeData.fillColor}
              onChange={(e) => handleFillColorChange(e.target.value)}
              className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
              title="Cor de preenchimento"
            />
            <button
              onClick={handleRemoveFill}
              className="text-xs px-1 py-0.5 border border-gray-300 rounded hover:bg-gray-50"
              title="Remover preenchimento"
            >
              ∅
            </button>
          </div>
          
          <div className="w-px h-4 bg-gray-300 mx-1" />
          
          {/* Borda */}
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Borda:</label>
            <input
              type="range"
              min="0"
              max="20"
              value={shapeData.strokeWidth}
              onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
              className="w-12"
            />
            <span className="text-xs text-gray-600 w-6">{shapeData.strokeWidth}px</span>
            <input
              type="color"
              value={shapeData.strokeColor}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
              title="Cor da borda"
            />
          </div>
          
          <div className="w-px h-4 bg-gray-300 mx-1" />
          
          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Configurações avançadas"
          >
            <Settings className="h-3 w-3 text-gray-600" />
          </button>
        </div>
      )}

      {/* Forma principal */}
      {isEmpty ? (
        // Placeholder quando a forma está vazia
        <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50">
          <div className="text-center text-gray-500">
            {renderIcon()}
            <div className="text-xs mt-1 capitalize">{element.type}</div>
          </div>
        </div>
      ) : (
        // Forma renderizada
        <div style={getShapeStyles()} />
      )}

      {/* Informações da forma (quando selecionada) */}
      {isSelected && (
        <div className="absolute -bottom-6 left-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {element.type} • {element.size.width}×{element.size.height}px
        </div>
      )}

      {/* Indicador de tipo no canto superior esquerdo (quando selecionado) */}
      {isSelected && (
        <div className="absolute -top-6 -left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          {element.type}
        </div>
      )}
    </div>
  );
};

export default ShapeElement;