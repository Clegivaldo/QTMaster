import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToParentElement, restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { snapCenterToCursor } from '@dnd-kit/snap-modifiers';
import { ElementPalette } from './ElementPalette';
import { EditorCanvas } from './EditorCanvas';
import { ElementPropertiesPanel } from './ElementPropertiesPanel';
import { EditorToolbar } from './EditorToolbar';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { VariableSelector } from './VariableSelector';
import { useTemplateEngine } from '../../hooks/useTemplateEngine';
import { EditorElement, ElementType, Position, Size } from '../../types/editor';
import { TableElement } from './Elements/TableElement';
import { ChartElement } from './Elements/ChartElement';
import { TextElement } from './Elements/TextElement';
import { ImageElement } from './Elements/ImageElement';
import { HeaderElement } from './Elements/HeaderElement';
import { FooterElement } from './Elements/FooterElement';
import { Settings, Save, Download, Eye, Grid3x3, Type, Image, BarChart3, Table, PanelTop, PanelBottom } from 'lucide-react';
import html2canvas from 'html2canvas';

interface VisualEditorProps {
  templateId?: string;
  initialElements?: EditorElement[];
  onSave?: (elements: EditorElement[]) => void;
  onExport?: (format: 'pdf' | 'html') => void;
  className?: string;
}

export const VisualEditor: React.FC<VisualEditorProps> = ({
  templateId,
  initialElements = [],
  onSave,
  onExport,
  className = ''
}) => {
  const [elements, setElements] = useState<EditorElement[]>(initialElements);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isLoading, setIsLoading] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { variables } = useTemplateEngine();

  // Configurar sensores do DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Carregar template existente se fornecido
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      setIsLoading(true);
      // Implementar carregamento de template
      // const response = await templateService.getTemplate(id);
      // setElements(response.elements || []);
    } catch (error) {
      console.error('Erro ao carregar template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // Verificar se é um novo elemento da paleta
    if (active.data.current?.type === 'palette-element') {
      const elementType = active.data.current.elementType as ElementType;
      const newElement = createNewElement(elementType, over.id as string);
      
      if (newElement) {
        setElements(prev => [...prev, newElement]);
      }
    } else if (active.data.current?.type === 'canvas-element') {
      // Movendo elemento existente no canvas
      const elementId = active.id as string;
      const newPosition = calculateNewPosition(active, over);
      
      if (newPosition) {
        setElements(prev => prev.map(el => 
          el.id === elementId 
            ? { ...el, position: newPosition }
            : el
        ));
      }
    }

    setActiveId(null);
  };

  const createNewElement = (type: ElementType, dropTargetId: string): EditorElement | null => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    const position = calculateDropPosition(dropTargetId, canvasRect);
    const newId = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const baseElement: Omit<EditorElement, 'type' | 'properties'> = {
      id: newId,
      position,
      size: getDefaultSize(type),
      rotation: 0,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
    };

    switch (type) {
      case 'text':
        return {
          ...baseElement,
          type: 'text',
          properties: {
            content: 'Texto de exemplo',
            fontSize: 16,
            fontFamily: 'Inter',
            color: '#374151',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            lineHeight: 1.5,
            padding: 8,
            borderRadius: 0,
            borderWidth: 0,
            borderColor: 'transparent',
            shadow: false,
          }
        };
      
      case 'table':
        return {
          ...baseElement,
          type: 'table',
          properties: {
            dataSource: '{{sensorData}}',
            columns: [
              { field: 'timestamp', header: 'Data/Hora', width: 150, align: 'left', format: 'date' },
              { field: 'temperature', header: 'Temperatura', width: 100, align: 'center', format: 'temperature' },
              { field: 'humidity', header: 'Umidade', width: 100, align: 'center', format: 'humidity' },
            ],
            showHeader: true,
            headerStyle: { backgroundColor: '#f9fafb', fontWeight: 'bold' },
            rowStyle: { backgroundColor: 'white' },
            alternatingRowColors: true,
            borderStyle: 'grid',
            fontSize: 14,
            fontFamily: 'Inter',
            maxRows: 50,
          }
        };
      
      case 'chart':
        return {
          ...baseElement,
          type: 'chart',
          properties: {
            chartType: 'line',
            dataSource: '{{sensorData}}',
            xAxis: 'timestamp',
            yAxis: 'temperature',
            title: 'Gráfico de Temperatura',
            width: '100%',
            height: 300,
            colors: ['#3b82f6', '#10b981', '#f59e0b'],
            showLegend: true,
            showGrid: true,
            responsive: true,
          }
        };
      
      case 'image':
        return {
          ...baseElement,
          type: 'image',
          properties: {
            src: '',
            alt: 'Imagem',
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: 0,
            borderWidth: 0,
            borderColor: 'transparent',
            shadow: false,
          }
        };
      
      case 'header':
        return {
          ...baseElement,
          type: 'header',
          properties: {
            content: 'Cabeçalho do Relatório',
            fontSize: 24,
            fontFamily: 'Inter',
            color: '#1e40af',
            backgroundColor: '#f8fafc',
            textAlign: 'center',
            fontWeight: 'bold',
            padding: 20,
            borderBottomWidth: 2,
            borderBottomColor: '#3b82f6',
            showLogo: false,
            logoPosition: 'left',
          }
        };
      
      case 'footer':
        return {
          ...baseElement,
          type: 'footer',
          properties: {
            content: 'Rodapé do Relatório - Página {{pageNumber}} de {{totalPages}}',
            fontSize: 12,
            fontFamily: 'Inter',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            textAlign: 'center',
            padding: 15,
            borderTopWidth: 1,
            borderTopColor: '#d1d5db',
            showDate: true,
            showPageNumbers: true,
          }
        };
      
      default:
        return null;
    }
  };

  const calculateDropPosition = (dropTargetId: string, canvasRect: DOMRect): Position => {
    // Implementar lógica de cálculo de posição baseada no drop target
    return {
      x: Math.random() * (canvasRect.width - 200),
      y: Math.random() * (canvasRect.height - 100),
    };
  };

  const calculateNewPosition = (active: any, over: any): Position | null => {
    // Implementar lógica de cálculo de nova posição
    return null;
  };

  const getDefaultSize = (type: ElementType): Size => {
    const sizes: Record<ElementType, Size> = {
      text: { width: 200, height: 50 },
      table: { width: 400, height: 200 },
      chart: { width: 400, height: 300 },
      image: { width: 200, height: 150 },
      header: { width: 600, height: 80 },
      footer: { width: 600, height: 60 },
    };
    return sizes[type];
  };

  const handleElementSelect = (elementId: string) => {
    setSelectedElementId(elementId);
  };

  const handleElementUpdate = (elementId: string, updates: Partial<EditorElement>) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  };

  const handleElementDelete = (elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      if (onSave) {
        await onSave(elements);
      } else {
        // Salvar template no backend
        // await templateService.saveTemplate({ elements, ... });
      }
      
      // Mostrar notificação de sucesso
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      // Mostrar notificação de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'html') => {
    if (onExport) {
      onExport(format);
    } else {
      // Implementar exportação padrão
      console.log(`Exportando como ${format}...`);
    }
  };

  const exportSelectedElementAs = async (format: 'png' | 'jpg' | 'svg') => {
    if (!selectedElementId) return;
    const el = document.querySelector(`[data-element-id="${selectedElementId}"]`) as HTMLElement | null;
    if (!el) return;
    if (format === 'svg') {
      const svg = el.querySelector('svg');
      if (svg) {
        const serializer = new XMLSerializer();
        const svgData = serializer.serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `element_${selectedElementId}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    }
    const canvasEl = el.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvasEl) {
      const dataUrl = canvasEl.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `element_${selectedElementId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    const canvas = await html2canvas(el);
    const dataUrl = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `element_${selectedElementId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      {/* Barra lateral esquerda - Paleta de elementos */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <ElementPalette
          onElementSelect={(type) => console.log('Elemento selecionado:', type)}
          className="flex-1"
        />
        
        {/* Seletor de variáveis */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowVariables(!showVariables)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Type size={16} />
            Variáveis
          </button>
        </div>
      </div>

      {/* Área principal */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar superior */}
        <EditorToolbar
          onSave={handleSave}
          onPreview={handlePreview}
          onExport={handleExport}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          snapToGrid={snapToGrid}
          onToggleSnap={() => setSnapToGrid(!snapToGrid)}
          isLoading={isLoading}
          className="border-b border-gray-200"
        />

        {/* Canvas do editor */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement]}
        >
          <div className="flex-1 flex">
            <EditorCanvas
              ref={canvasRef}
              elements={elements}
              selectedElementId={selectedElementId}
              showGrid={showGrid}
              snapToGrid={snapToGrid}
              gridSize={gridSize}
              canvasSize={canvasSize}
              onElementSelect={handleElementSelect}
              onElementUpdate={handleElementUpdate}
              onElementDelete={handleElementDelete}
              className="flex-1"
            />

            {/* Painel de propriedades */}
            {selectedElement && (
              <ElementPropertiesPanel
                element={selectedElement}
                onUpdate={(updates) => handleElementUpdate(selectedElement.id, updates)}
                onDelete={() => handleElementDelete(selectedElement.id)}
                className="w-80 border-l border-gray-200"
              />
            )}
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg p-4 opacity-80">
                Elemento em movimento
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modais */}
      <TemplatePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        elements={elements}
        templateData={{
          client: { name: 'Empresa Exemplo', cnpj: '12.345.678/0001-90' },
          validation: { name: 'Validação Teste', isApproved: true },
          statistics: { temperature: { average: 22.5, min: 20.1, max: 24.8 } },
        }}
      />

      <VariableSelector
        isOpen={showVariables}
        onClose={() => setShowVariables(false)}
        variables={variables}
        onVariableSelect={(variable) => {
          // Inserir variável no elemento selecionado
          if (selectedElement && selectedElement.type === 'text') {
            const currentContent = selectedElement.properties.content || '';
            handleElementUpdate(selectedElement.id, {
              properties: {
                ...selectedElement.properties,
                content: currentContent + `{{${variable.name}}}`
              }
            });
          }
          setShowVariables(false);
        }}
      />
    </div>
  );
};

// Componentes auxiliares
const ElementPalette: React.FC<{ onElementSelect: (type: ElementType) => void; className?: string }> = ({
  onElementSelect,
  className = ''
}) => {
  const elements = [
    { type: 'text' as ElementType, icon: Type, label: 'Texto' },
    { type: 'table' as ElementType, icon: Table, label: 'Tabela' },
    { type: 'chart' as ElementType, icon: BarChart3, label: 'Gráfico' },
    { type: 'image' as ElementType, icon: Image, label: 'Imagem' },
    { type: 'header' as ElementType, icon: PanelTop, label: 'Cabeçalho' },
    { type: 'footer' as ElementType, icon: PanelBottom, label: 'Rodapé' },
  ];

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Elementos</h3>
      <div className="grid grid-cols-2 gap-2">
        {elements.map(({ type, icon: Icon, label }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('elementType', type);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => onElementSelect(type)}
            className="flex flex-col items-center p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <Icon size={20} className="text-gray-600 mb-1" />
            <span className="text-xs text-gray-700 text-center">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const EditorToolbar: React.FC<{
  onSave: () => void;
  onPreview: () => void;
  onExport?: (format: 'pdf' | 'html') => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  isLoading: boolean;
  className?: string;
}> = ({
  onSave,
  onPreview,
  onExport,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  isLoading,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between p-4 bg-white ${className}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleGrid}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            showGrid 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Grid3x3 size={16} />
          Grade
        </button>
        
        <button
          onClick={onToggleSnap}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            snapToGrid 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Settings size={16} />
          Snap
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Eye size={16} />
          Preview
        </button>
        
        {onExport && (
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download size={16} />
              Exportar
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => onExport('pdf')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Exportar PDF
              </button>
              <button
                onClick={() => onExport('html')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Exportar HTML
              </button>
              <div className="border-t border-gray-200" />
              <button
                onClick={() => exportSelectedElementAs('png')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Exportar elemento PNG
              </button>
              <button
                onClick={() => exportSelectedElementAs('jpg')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Exportar elemento JPG
              </button>
              <button
                onClick={() => exportSelectedElementAs('svg')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Exportar elemento SVG
              </button>
            </div>
          </div>
        )}
        
        <button
          onClick={onSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={16} />
          {isLoading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
};

const TemplatePreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  elements: EditorElement[];
  templateData: any;
}> = ({ isOpen, onClose, elements, templateData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Preview do Template</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white border border-gray-200 rounded-lg min-h-[600px]">
            {elements.map((element) => (
              <div key={element.id} style={{
                position: 'absolute',
                left: element.position.x,
                top: element.position.y,
                width: element.size.width,
                height: element.size.height,
              }}>
                {renderPreviewElement(element, templateData)}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              // Implementar geração de PDF
              console.log('Gerando PDF...');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

const VariableSelector: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  variables: any[];
  onVariableSelect: (variable: any) => void;
}> = ({ isOpen, onClose, variables, onVariableSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Selecionar Variável</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-2">
            {variables.map((variable) => (
              <button
                key={variable.name}
                onClick={() => onVariableSelect(variable)}
                className="flex items-center justify-between p-3 text-left bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">{variable.name}</div>
                  <div className="text-sm text-gray-600">{variable.description}</div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {variable.type}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// Função auxiliar para renderizar preview de elementos
const renderPreviewElement = (element: EditorElement, data: any) => {
  switch (element.type) {
    case 'text':
      return (
        <div style={{
          fontSize: element.properties.fontSize,
          fontFamily: element.properties.fontFamily,
          color: element.properties.color,
          backgroundColor: element.properties.backgroundColor,
          textAlign: element.properties.textAlign,
          fontWeight: element.properties.fontWeight,
          padding: element.properties.padding,
        }}>
          {element.properties.content.replace(/\{\{(.*?)\}\}/g, (match, varName) => {
            return data[varName.trim()] || match;
          })}
        </div>
      );
    
    case 'table':
      return (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {element.properties.columns.map((col: any) => (
                <th key={col.field} className="border border-gray-300 p-2 text-left">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2">01/01/2024 10:00</td>
              <td className="border border-gray-300 p-2 text-center">22.5°C</td>
              <td className="border border-gray-300 p-2 text-center">65.2%</td>
            </tr>
          </tbody>
        </table>
      );
    
    case 'chart':
      return (
        <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-600">
          <BarChart3 size={48} className="mx-auto mb-2" />
          <div>Gráfico de {element.properties.chartType}</div>
          <div className="text-sm">(Preview com dados de exemplo)</div>
        </div>
      );
    
    case 'image':
      return (
        <div className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
          <Image size={32} />
        </div>
      );
    
    case 'header':
      return (
        <div className="bg-blue-50 border-b-2 border-blue-500 p-4 text-center">
          <h1 className="text-2xl font-bold text-blue-900">
            {element.properties.content}
          </h1>
        </div>
      );
    
    case 'footer':
      return (
        <div className="bg-gray-50 border-t border-gray-300 p-3 text-center text-sm text-gray-600">
          {element.properties.content}
        </div>
      );
    
    default:
      return <div>Elemento não suportado</div>;
  }
};
