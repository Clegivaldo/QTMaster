import React, { useCallback } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify,
  EyeOff,
  Lock,
  Unlock,
  Eye,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Group,
  Ungroup
} from 'lucide-react';
import { PropertiesPanelProps, ElementStyles } from '../../../../types/editor';
import { AVAILABLE_FONTS, FONT_SIZES } from '../../../../types/editor-constants';

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElements,
  onUpdateStyles,
  onUpdateContent,
  onGroupElements,
  onUngroupElements,
  onBringToFront,
  onSendToBack,
  canGroup = false,
  canUngroup = false,
  isVisible,
  onToggleVisibility
}) => {
  const hasSelection = selectedElements.length > 0;
  const singleSelection = selectedElements.length === 1;


  // Obter estilos comuns entre elementos selecionados
  const getCommonStringStyle = useCallback((property: keyof ElementStyles): string | undefined => {
    if (!hasSelection) return undefined;
    
    const firstValue = selectedElements[0].styles[property] as string;
    const allSame = selectedElements.every(el => el.styles[property] === firstValue);
    
    return allSame ? firstValue : undefined;
  }, [selectedElements, hasSelection]);

  const getCommonNumberStyle = useCallback((property: keyof ElementStyles): number | undefined => {
    if (!hasSelection) return undefined;
    
    const firstValue = selectedElements[0].styles[property] as number;
    const allSame = selectedElements.every(el => el.styles[property] === firstValue);
    
    return allSame ? firstValue : undefined;
  }, [selectedElements, hasSelection]);

  // Aplicar estilo aos elementos selecionados
  const applyStyle = useCallback((styles: Partial<ElementStyles>) => {
    if (!hasSelection) return;
    
    const elementIds = selectedElements.map(el => el.id);
    onUpdateStyles(elementIds, styles);
  }, [selectedElements, hasSelection, onUpdateStyles]);

  // Toggle de formatação (negrito, itálico, etc.)
  const toggleFormat = useCallback((property: keyof ElementStyles, value: any, defaultValue: any = 'normal') => {
    const currentValue = getCommonStringStyle(property);
    const newValue = currentValue === value ? defaultValue : value;
    applyStyle({ [property]: newValue });
  }, [getCommonStringStyle, applyStyle]);

  // Verificar se elemento suporta formatação de texto
  const supportsTextFormatting = hasSelection && selectedElements.some(el => 
    el.type === 'text' || el.type === 'heading'
  );

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Propriedades</h3>
          <button
            onClick={onToggleVisibility}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Ocultar painel"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {!hasSelection ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-sm">Selecione um elemento</div>
            <div className="text-xs mt-1">para editar suas propriedades</div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Informações do elemento */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {singleSelection ? selectedElements[0].type : `${selectedElements.length} elementos`}
              </div>
              {singleSelection && (
                <div className="text-xs text-gray-500 font-mono">
                  {selectedElements[0].id}
                </div>
              )}
            </div>

            {/* Controles de visibilidade e bloqueio */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // TODO: Implementar toggle de visibilidade
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  {selectedElements.every(el => el.visible) ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  <span>Visível</span>
                </button>

                <button
                  onClick={() => {
                    // TODO: Implementar toggle de bloqueio
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  {selectedElements.every(el => el.locked) ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                  <span>Bloqueado</span>
                </button>
              </div>
            </div>

            {/* Controles de agrupamento */}
            {selectedElements.length > 1 && (
              <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Agrupamento</h4>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={onGroupElements}
                    disabled={!canGroup}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Agrupar elementos selecionados"
                  >
                    <Group className="h-4 w-4" />
                    <span>Agrupar</span>
                  </button>

                  <button
                    onClick={onUngroupElements}
                    disabled={!canUngroup}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Desagrupar elementos selecionados"
                  >
                    <Ungroup className="h-4 w-4" />
                    <span>Desagrupar</span>
                  </button>
                </div>

                {/* Informações do agrupamento */}
                <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <div className="space-y-1">
                    <div>• Elementos agrupados se movem juntos</div>
                    <div>• Use Ctrl+clique para selecionar múltiplos elementos</div>
                    <div>• Mínimo de 2 elementos para agrupar</div>
                  </div>
                </div>
              </div>
            )}

            {/* Informações de grupo existente */}
            {singleSelection && selectedElements[0].groupId && (
              <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Grupo</h4>
                
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    ID do Grupo: <span className="font-mono">{selectedElements[0].groupId}</span>
                  </div>
                  
                  <button
                    onClick={onUngroupElements}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors w-full justify-center"
                    title="Desagrupar este elemento"
                  >
                    <Ungroup className="h-4 w-4" />
                    <span>Desagrupar</span>
                  </button>
                  
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    Este elemento faz parte de um grupo. Selecione todos os elementos do grupo para ver mais opções.
                  </div>
                </div>
              </div>
            )}

            {/* Posição e tamanho */}
            {singleSelection && (
              <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Posição e Tamanho</h4>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">X</label>
                      <input
                        type="number"
                        value={Math.round(selectedElements[0].position.x)}
                        onChange={() => {
                          // TODO: Implementar atualização de posição X
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Y</label>
                      <input
                        type="number"
                        value={Math.round(selectedElements[0].position.y)}
                        onChange={() => {
                          // TODO: Implementar atualização de posição Y
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Largura</label>
                      <input
                        type="number"
                        value={Math.round(selectedElements[0].size.width)}
                        onChange={() => {
                          // TODO: Implementar atualização de largura
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        min="20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Altura</label>
                      <input
                        type="number"
                        value={Math.round(selectedElements[0].size.height)}
                        onChange={() => {
                          // TODO: Implementar atualização de altura
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        min="20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formatação de texto */}
            {supportsTextFormatting && (
              <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Formatação de Texto</h4>
                
                <div className="space-y-3">
                  {/* Fonte */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fonte</label>
                    <select
                      value={getCommonStringStyle('fontFamily') || 'Arial, sans-serif'}
                      onChange={(e) => applyStyle({ fontFamily: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {AVAILABLE_FONTS.map(font => (
                        <option key={font} value={font}>
                          {font.split(',')[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tamanho da fonte */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tamanho</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={getCommonNumberStyle('fontSize') || 14}
                        onChange={(e) => applyStyle({ fontSize: parseInt(e.target.value) })}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {FONT_SIZES.map(size => (
                          <option key={size} value={size}>{size}px</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={getCommonNumberStyle('fontSize') || 14}
                        onChange={(e) => applyStyle({ fontSize: parseInt(e.target.value) || 14 })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="8"
                        max="72"
                      />
                    </div>
                  </div>

                  {/* Botões de formatação */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Estilo</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleFormat('fontWeight', 'bold')}
                        className={`p-2 border rounded transition-colors ${
                          getCommonStringStyle('fontWeight') === 'bold'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Negrito"
                      >
                        <Bold className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => toggleFormat('fontStyle', 'italic')}
                        className={`p-2 border rounded transition-colors ${
                          getCommonStringStyle('fontStyle') === 'italic'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Itálico"
                      >
                        <Italic className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => toggleFormat('textDecoration', 'underline', 'none')}
                        className={`p-2 border rounded transition-colors ${
                          getCommonStringStyle('textDecoration') === 'underline'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Sublinhado"
                      >
                        <Underline className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Alinhamento */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Alinhamento</label>
                    <div className="flex gap-1">
                      {[
                        { value: 'left', icon: AlignLeft, title: 'Esquerda' },
                        { value: 'center', icon: AlignCenter, title: 'Centro' },
                        { value: 'right', icon: AlignRight, title: 'Direita' },
                        { value: 'justify', icon: AlignJustify, title: 'Justificado' }
                      ].map(({ value, icon: Icon, title }) => (
                        <button
                          key={value}
                          onClick={() => applyStyle({ textAlign: value as any })}
                          className={`p-2 border rounded transition-colors ${
                            getCommonStringStyle('textAlign') === value
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                          title={title}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cor do texto */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cor do Texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={getCommonStringStyle('color') || '#000000'}
                        onChange={(e) => applyStyle({ color: e.target.value })}
                        className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={getCommonStringStyle('color') || '#000000'}
                        onChange={(e) => applyStyle({ color: e.target.value })}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cor de fundo */}
            <div className="p-4 bg-white border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Aparência</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cor de Fundo</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={getCommonStringStyle('backgroundColor') || '#ffffff'}
                      onChange={(e) => applyStyle({ backgroundColor: e.target.value })}
                      className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={getCommonStringStyle('backgroundColor') || '#ffffff'}
                      onChange={(e) => applyStyle({ backgroundColor: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                      placeholder="#ffffff"
                    />
                    <button
                      onClick={() => applyStyle({ backgroundColor: 'transparent' })}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Transparente
                    </button>
                  </div>
                </div>

                {/* Opacidade */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Opacidade ({Math.round((getCommonNumberStyle('opacity') || 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={getCommonNumberStyle('opacity') || 1}
                    onChange={(e) => applyStyle({ opacity: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Borda radius */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Borda Arredondada</label>
                  <input
                    type="number"
                    value={getCommonNumberStyle('borderRadius') || 0}
                    onChange={(e) => applyStyle({ borderRadius: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                    max="50"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Controles específicos para linhas */}
            {singleSelection && selectedElements[0].type === 'line' && (
              <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Configurações da Linha</h4>
                
                <div className="space-y-3">
                  {/* Espessura da linha */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Espessura ({(selectedElements[0].content as any).thickness || 2}px)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={(selectedElements[0].content as any).thickness || 2}
                      onChange={(e) => {
                        const element = selectedElements[0];
                        const lineData = element.content as any;
                        const newData = { ...lineData, thickness: parseInt(e.target.value) };
                        onUpdateContent?.(element.id, newData);
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* Estilo e cor da linha */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Estilo</label>
                      <select
                        value={(selectedElements[0].content as any).style?.style || 'solid'}
                        onChange={(e) => {
                          const element = selectedElements[0];
                          const lineData = element.content as any;
                          const newData = { 
                            ...lineData, 
                            style: { ...lineData.style, style: e.target.value }
                          };
                          onUpdateContent?.(element.id, newData);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="solid">Sólida</option>
                        <option value="dashed">Tracejada</option>
                        <option value="dotted">Pontilhada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cor</label>
                      <input
                        type="color"
                        value={(selectedElements[0].content as any).style?.color || '#000000'}
                        onChange={(e) => {
                          const element = selectedElements[0];
                          const lineData = element.content as any;
                          const newData = { 
                            ...lineData, 
                            style: { ...lineData.style, color: e.target.value }
                          };
                          onUpdateContent?.(element.id, newData);
                        }}
                        className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Informações da linha */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <div>Comprimento: {Math.round(Math.sqrt(
                      Math.pow(((selectedElements[0].content as any).endPoint?.x || 0) - ((selectedElements[0].content as any).startPoint?.x || 0), 2) +
                      Math.pow(((selectedElements[0].content as any).endPoint?.y || 0) - ((selectedElements[0].content as any).startPoint?.y || 0), 2)
                    ))}px</div>
                    <div>Use as alças nos pontos para ajustar posição</div>
                  </div>
                </div>
              </div>
            )}

            {/* Controles específicos para formas */}
            {singleSelection && (selectedElements[0].type === 'rectangle' || selectedElements[0].type === 'circle') && (
              <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Configurações da Forma</h4>
                
                <div className="space-y-3">
                  {/* Preenchimento */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Preenchimento</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(selectedElements[0].content as any).fillColor === 'transparent' ? '#ffffff' : (selectedElements[0].content as any).fillColor || '#ffffff'}
                        onChange={(e) => {
                          const element = selectedElements[0];
                          const shapeData = element.content as any;
                          const newData = { ...shapeData, fillColor: e.target.value };
                          onUpdateContent?.(element.id, newData);
                        }}
                        className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={(selectedElements[0].content as any).fillColor || 'transparent'}
                        onChange={(e) => {
                          const element = selectedElements[0];
                          const shapeData = element.content as any;
                          const newData = { ...shapeData, fillColor: e.target.value };
                          onUpdateContent?.(element.id, newData);
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                        placeholder="transparent"
                      />
                      <button
                        onClick={() => {
                          const element = selectedElements[0];
                          const shapeData = element.content as any;
                          const newData = { ...shapeData, fillColor: 'transparent' };
                          onUpdateContent?.(element.id, newData);
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Transparente
                      </button>
                    </div>
                  </div>

                  {/* Borda */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Borda</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Espessura</label>
                        <input
                          type="number"
                          value={(selectedElements[0].content as any).strokeWidth || 0}
                          onChange={(e) => {
                            const element = selectedElements[0];
                            const shapeData = element.content as any;
                            const newData = { ...shapeData, strokeWidth: parseInt(e.target.value) || 0 };
                            onUpdateContent?.(element.id, newData);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          min="0"
                          max="20"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Cor</label>
                        <input
                          type="color"
                          value={(selectedElements[0].content as any).strokeColor || '#000000'}
                          onChange={(e) => {
                            const element = selectedElements[0];
                            const shapeData = element.content as any;
                            const newData = { ...shapeData, strokeColor: e.target.value };
                            onUpdateContent?.(element.id, newData);
                          }}
                          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informações da forma */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <div>Tipo: {selectedElements[0].type === 'circle' ? 'Círculo' : 'Retângulo'}</div>
                    <div>Dimensões: {selectedElements[0].size.width}×{selectedElements[0].size.height}px</div>
                  </div>
                </div>
              </div>
            )}

            {/* Controles específicos para tabelas */}
            {singleSelection && selectedElements[0].type === 'table' && (
              <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Configurações da Tabela</h4>
                
                <div className="space-y-3">
                  {/* Dimensões da tabela */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Linhas</label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const element = selectedElements[0];
                            const tableData = element.content as any;
                            if (tableData.rows > 1) {
                              const newData = { ...tableData };
                              newData.rows -= 1;
                              newData.data = newData.data.slice(0, -1);
                              onUpdateContent?.(element.id, newData);
                            }
                          }}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                          disabled={(selectedElements[0].content as any).rows <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center text-sm">
                          {(selectedElements[0].content as any).rows || 2}
                        </span>
                        <button
                          onClick={() => {
                            const element = selectedElements[0];
                            const tableData = element.content as any;
                            const newData = { ...tableData };
                            newData.rows += 1;
                            const newRow = Array.from({ length: newData.columns }, (_, colIndex) => 
                              `R${newData.rows}C${colIndex + 1}`
                            );
                            newData.data = [...(newData.data || []), newRow];
                            onUpdateContent?.(element.id, newData);
                          }}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Colunas</label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const element = selectedElements[0];
                            const tableData = element.content as any;
                            if (tableData.columns > 1) {
                              const newData = { ...tableData };
                              newData.columns -= 1;
                              newData.data = (newData.data || []).map((row: string[]) => row.slice(0, -1));
                              onUpdateContent?.(element.id, newData);
                            }
                          }}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                          disabled={(selectedElements[0].content as any).columns <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center text-sm">
                          {(selectedElements[0].content as any).columns || 2}
                        </span>
                        <button
                          onClick={() => {
                            const element = selectedElements[0];
                            const tableData = element.content as any;
                            const newData = { ...tableData };
                            newData.columns += 1;
                            newData.data = (newData.data || []).map((row: string[], rowIndex: number) => [
                              ...row,
                              `R${rowIndex + 1}C${newData.columns}`
                            ]);
                            onUpdateContent?.(element.id, newData);
                          }}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Estilo da tabela */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Estilo da Borda</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Espessura</label>
                        <input
                          type="number"
                          value={(selectedElements[0].styles.border as any)?.width || 1}
                          onChange={(e) => {
                            const currentBorder = selectedElements[0].styles.border as any || {};
                            applyStyle({ 
                              border: { 
                                ...currentBorder, 
                                width: parseInt(e.target.value) || 1 
                              } 
                            });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          min="0"
                          max="10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Estilo</label>
                        <select
                          value={(selectedElements[0].styles.border as any)?.style || 'solid'}
                          onChange={(e) => {
                            const currentBorder = selectedElements[0].styles.border as any || {};
                            applyStyle({ 
                              border: { 
                                ...currentBorder, 
                                style: e.target.value 
                              } 
                            });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="solid">Sólida</option>
                          <option value="dashed">Tracejada</option>
                          <option value="dotted">Pontilhada</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Cor</label>
                        <input
                          type="color"
                          value={(selectedElements[0].styles.border as any)?.color || '#000000'}
                          onChange={(e) => {
                            const currentBorder = selectedElements[0].styles.border as any || {};
                            applyStyle({ 
                              border: { 
                                ...currentBorder, 
                                color: e.target.value 
                              } 
                            });
                          }}
                          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informações da tabela */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <div>Total de células: {((selectedElements[0].content as any).rows || 2) * ((selectedElements[0].content as any).columns || 2)}</div>
                    <div>Clique duplo em uma célula para editar</div>
                  </div>
                </div>
              </div>
            )}

            {/* Z-Index */}
            <div className="p-4 bg-white">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Camadas</h4>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onBringToFront?.(selectedElements[0].id);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  <ChevronUp className="h-3 w-3" />
                  Frente
                </button>
                
                <button
                  onClick={() => {
                    onSendToBack?.(selectedElements[0].id);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  <ChevronDown className="h-3 w-3" />
                  Trás
                </button>
                
                {singleSelection && (
                  <div className="flex-1 text-right">
                    <span className="text-xs text-gray-500">
                      Z: {selectedElements[0].zIndex}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;