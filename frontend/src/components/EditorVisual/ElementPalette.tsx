import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ElementType } from '../../types/editor';
import { cn } from '../../utils/cn';
import { Heading, FileText, BarChart3, Image, Table, MoreHorizontal } from 'lucide-react';

interface PaletteElementProps {
  type: ElementType;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const PaletteElement: React.FC<PaletteElementProps> = ({ type, icon, label, description }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: {
      isNewElement: true,
      elementType: type,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'p-3 bg-white border border-gray-200 rounded-lg cursor-move transition-all duration-200',
        'hover:shadow-md hover:border-blue-300 hover:bg-blue-50',
        'active:scale-95',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 mb-1">{label}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
};

export const ElementPalette: React.FC = () => {
  const elements: PaletteElementProps[] = [
    {
      type: 'header',
      icon: <Heading size={16} />,
      label: 'Cabeçalho',
      description: 'Título e subtítulo do relatório',
    },
    {
      type: 'text',
      icon: <FileText size={16} />,
      label: 'Texto',
      description: 'Bloco de texto livre',
    },
    {
      type: 'table',
      icon: <Table size={16} />,
      label: 'Tabela',
      description: 'Tabela de dados com colunas',
    },
    {
      type: 'chart',
      icon: <BarChart3 size={16} />,
      label: 'Gráfico',
      description: 'Gráfico de barras, linhas ou pizza',
    },
    {
      type: 'image',
      icon: <Image size={16} />,
      label: 'Imagem',
      description: 'Imagem ou logo',
    },
    {
      type: 'footer',
      icon: <MoreHorizontal size={16} />,
      label: 'Rodapé',
      description: 'Rodapé com informações',
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Elementos</h2>
        <p className="text-sm text-gray-600">Arraste para o canvas</p>
      </div>
      
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {elements.map((element) => (
          <PaletteElement key={element.type} {...element} />
        ))}
      </div>
      
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="text-xs text-gray-500">
          <p className="mb-1">💡 <strong>Dica:</strong></p>
          <p>Arraste os elementos para o canvas e clique neles para configurar.</p>
        </div>
      </div>
    </div>
  );
};
