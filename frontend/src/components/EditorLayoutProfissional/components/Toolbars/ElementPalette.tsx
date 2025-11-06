import React, { useCallback, useState } from 'react';
import { 
  Type, 
  Heading, 
  Image, 
  Table, 
  BarChart3, 
  Minus,
  Square,
  Circle,
  FileSignature,
  Scan,
  Hash,
  ChevronDown,
  ChevronRight,
  EyeOff
} from 'lucide-react';
import { ElementPaletteProps, ElementType, Position } from '../../../../types/editor';
import { TOOLTIPS } from '../../../../types/editor-constants';

interface PaletteItem {
  type: ElementType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
  category: 'text' | 'media' | 'layout' | 'forms';
}

interface PaletteCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: PaletteItem[];
  expanded: boolean;
}

const ElementPalette: React.FC<ElementPaletteProps> = ({
  onAddElement,
  isVisible,
  onToggleVisibility
}) => {
  // Estado para controlar categorias expandidas
  const [categories, setCategories] = useState<PaletteCategory[]>([
    {
      id: 'text',
      label: 'Texto',
      icon: Type,
      expanded: true,
      items: [
        { 
          type: 'text', 
          icon: Type, 
          label: 'Texto', 
          description: 'Parágrafo de texto editável',
          color: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
          category: 'text'
        },
        { 
          type: 'heading', 
          icon: Heading, 
          label: 'Título', 
          description: 'Cabeçalho ou título',
          color: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
          category: 'text'
        }
      ]
    },
    {
      id: 'media',
      label: 'Mídia',
      icon: Image,
      expanded: true,
      items: [
        { 
          type: 'image', 
          icon: Image, 
          label: 'Imagem', 
          description: 'Inserir imagem ou logo',
          color: 'bg-green-100 text-green-600 hover:bg-green-200',
          category: 'media'
        },
        { 
          type: 'chart', 
          icon: BarChart3, 
          label: 'Gráfico', 
          description: 'Gráfico ou visualização',
          color: 'bg-red-100 text-red-600 hover:bg-red-200',
          category: 'media'
        }
      ]
    },
    {
      id: 'layout',
      label: 'Layout',
      icon: Square,
      expanded: true,
      items: [
        { 
          type: 'table', 
          icon: Table, 
          label: 'Tabela', 
          description: 'Tabela de dados',
          color: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200',
          category: 'layout'
        },
        { 
          type: 'line', 
          icon: Minus, 
          label: 'Linha', 
          description: 'Linha divisória',
          color: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          category: 'layout'
        },
        { 
          type: 'rectangle', 
          icon: Square, 
          label: 'Retângulo', 
          description: 'Forma retangular',
          color: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
          category: 'layout'
        },
        { 
          type: 'circle', 
          icon: Circle, 
          label: 'Círculo', 
          description: 'Forma circular',
          color: 'bg-pink-100 text-pink-600 hover:bg-pink-200',
          category: 'layout'
        }
      ]
    },
    {
      id: 'forms',
      label: 'Formulários',
      icon: FileSignature,
      expanded: false,
      items: [
        { 
          type: 'signature', 
          icon: FileSignature, 
          label: 'Assinatura', 
          description: 'Área para assinatura',
          color: 'bg-teal-100 text-teal-600 hover:bg-teal-200',
          category: 'forms'
        },
        { 
          type: 'barcode', 
          icon: Scan, 
          label: 'Código de Barras', 
          description: 'Código de barras',
          color: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
          category: 'forms'
        },
        { 
          type: 'qrcode', 
          icon: Hash, 
          label: 'QR Code', 
          description: 'Código QR',
          color: 'bg-cyan-100 text-cyan-600 hover:bg-cyan-200',
          category: 'forms'
        }
      ]
    }
  ]);

  // Toggle categoria expandida/colapsada
  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, expanded: !cat.expanded }
        : cat
    ));
  }, []);

  // Handler para adicionar elemento via clique
  const handleAddElement = useCallback((type: ElementType) => {
    // Adicionar no centro do canvas visível
    const defaultPosition: Position = { x: 100, y: 100 };
    onAddElement(type, defaultPosition);
  }, [onAddElement]);

  // Handler para início do drag
  const handleDragStart = useCallback((e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Criar imagem de drag personalizada
    const dragImage = document.createElement('div');
    dragImage.textContent = type;
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      background: #3b82f6;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Remover elemento temporário após um tempo
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header da paleta */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Elementos</h3>
          <button
            onClick={onToggleVisibility}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Ocultar paleta"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Clique ou arraste para adicionar
        </p>
      </div>
      
      {/* Conteúdo da paleta */}
      <div className="flex-1 overflow-y-auto">
        {categories.map((category) => {
          const CategoryIcon = category.icon;
          
          return (
            <div key={category.id} className="border-b border-gray-200 last:border-b-0">
              {/* Header da categoria */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-3 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm text-gray-700">
                    {category.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({category.items.length})
                  </span>
                </div>
                {category.expanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {/* Itens da categoria */}
              {category.expanded && (
                <div className="p-2 space-y-1">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
                    const tooltip = TOOLTIPS[`ADD_${item.type.toUpperCase()}` as keyof typeof TOOLTIPS] || `Adicionar ${item.label}`;
                    
                    return (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.type)}
                        onClick={() => handleAddElement(item.type)}
                        className={`
                          w-full p-3 rounded-lg border-2 border-dashed border-gray-300 
                          hover:border-blue-400 transition-all cursor-pointer
                          flex items-center gap-3 ${item.color}
                          hover:shadow-sm active:scale-95
                        `}
                        title={tooltip}
                      >
                        <ItemIcon className="h-5 w-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.label}
                          </div>
                          <div className="text-xs opacity-75 truncate">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer com dicas */}
      <div className="p-3 bg-gray-100 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Clique para adicionar no centro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Arraste para posicionar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElementPalette;