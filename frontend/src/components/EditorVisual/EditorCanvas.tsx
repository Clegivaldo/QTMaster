import React, { useState, useCallback } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { ElementType, CanvasElement, ElementConfig } from '../../types/editor';
import { cn } from '../../utils/cn';
import { X, Settings, Copy, Trash2 } from 'lucide-react';

interface EditorCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  onElementSelect: (element: CanvasElement | null) => void;
  selectedElement: CanvasElement | null;
}

interface CanvasElementComponentProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const CanvasElementComponent: React.FC<CanvasElementComponentProps> = ({
  element,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: element.id,
    data: {
      isExistingElement: true,
      elementId: element.id,
    },
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined;

  const renderElement = () => {
    switch (element.type) {
      case 'header':
        return (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {element.config.title || 'Título do Relatório'}
            </h1>
            {element.config.subtitle && (
              <p className="text-gray-600 mt-1">{element.config.subtitle}</p>
            )}
          </div>
        );
      case 'text':
        return (
          <div className="p-4">
            <p className="text-gray-800">
              {element.config.content || 'Texto do conteúdo...'}
            </p>
          </div>
        );
      case 'table':
        return (
          <div className="p-4">
            <div className="bg-gray-100 rounded p-3">
              <p className="text-sm text-gray-600 mb-2">Tabela de Dados</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[1, 2, 3].map((row) => (
                  <React.Fragment key={row}>
                    <div className="bg-white p-2 rounded">Coluna A{row}</div>
                    <div className="bg-white p-2 rounded">Coluna B{row}</div>
                    <div className="bg-white p-2 rounded">Coluna C{row}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        );
      case 'chart':
        return (
          <div className="p-4">
            <div className="bg-gray-100 rounded p-3">
              <p className="text-sm text-gray-600 mb-2">Gráfico</p>
              <div className="h-32 bg-gradient-to-r from-blue-200 to-blue-400 rounded flex items-center justify-center">
                <span className="text-white font-medium">Gráfico Placeholder</span>
              </div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="p-4">
            <div className="bg-gray-200 rounded p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 rounded mx-auto mb-2 flex items-center justify-center">
                  <span className="text-gray-500 text-2xl">📷</span>
                </div>
                <p className="text-sm text-gray-600">Imagem Placeholder</p>
              </div>
            </div>
          </div>
        );
      case 'footer':
        return (
          <div className="p-4">
            <div className="border-t border-gray-200 pt-3">
              <p className="text-sm text-gray-600">
                {element.config.text || 'Rodapé do relatório'}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      className={cn(
        'relative bg-white border-2 rounded-lg shadow-sm transition-all duration-200',
        'hover:shadow-md hover:border-gray-300',
        isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 bg-white rounded shadow-sm hover:bg-gray-50 text-gray-600 hover:text-gray-800"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 bg-white rounded shadow-sm hover:bg-red-50 text-red-600 hover:text-red-800"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      {renderElement()}
    </div>
  );
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  elements,
  onElementsChange,
  onElementSelect,
  selectedElement,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'editor-canvas',
  });

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1123 });

  const handleDeleteElement = useCallback((elementId: string) => {
    const newElements = elements.filter((el) => el.id !== elementId);
    onElementsChange(newElements);
    if (selectedElement?.id === elementId) {
      onElementSelect(null);
    }
  }, [elements, onElementsChange, selectedElement, onElementSelect]);

  const handleDuplicateElement = useCallback((elementId: string) => {
    const element = elements.find((el) => el.id === elementId);
    if (element) {
      const newElement: CanvasElement = {
        ...element,
        id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: element.position.x + 20,
          y: element.position.y + 20,
        },
      };
      onElementsChange([...elements, newElement]);
    }
  }, [elements, onElementsChange]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Canvas do Editor</h2>
            <p className="text-sm text-gray-600">Arraste elementos para montar seu relatório</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={`${canvasSize.width}x${canvasSize.height}`}
              onChange={(e) => {
                const [width, height] = e.target.value.split('x').map(Number);
                setCanvasSize({ width, height });
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="800x1123">A4 (210x297mm)</option>
              <option value="1123x800">A4 Paisagem (297x210mm)</option>
              <option value="600x800">Custom</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-8">
        <div className="flex justify-center">
          <div
            ref={setNodeRef}
            className={cn(
              'bg-white shadow-lg transition-all duration-200',
              'border-2 border-dashed',
              isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            )}
            style={{
              width: canvasSize.width,
              minHeight: canvasSize.height,
            }}
          >
            <div className="space-y-4 p-8">
              {elements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium mb-2">Canvas vazio</h3>
                  <p className="text-center max-w-sm">
                    Arraste elementos da paleta para começar a criar seu relatório
                  </p>
                </div>
              ) : (
                elements.map((element) => (
                  <CanvasElementComponent
                    key={element.id}
                    element={element}
                    isSelected={selectedElement?.id === element.id}
                    onSelect={() => onElementSelect(element)}
                    onDelete={() => handleDeleteElement(element.id)}
                    onDuplicate={() => handleDuplicateElement(element.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
