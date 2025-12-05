import React, { useState } from 'react';
import { TableElement, TableColumn } from '../../../../types/editor';
import { Plus, Trash2, GripVertical, Settings, Database, Layout } from 'lucide-react';

interface TableBuilderProps {
    element: TableElement;
    onUpdate: (updates: any) => void;
}

export const TableBuilder: React.FC<TableBuilderProps> = ({
    element,
    onUpdate
}) => {
    // Get raw content
    const rawContent = (element as any).content || {};

    // Handle the case where 'columns' is a number (simple table format from ELEMENT_DEFAULTS)
    // vs an array (advanced TableBuilder format)
    let columnsArray: TableColumn[] = [];
    if (Array.isArray(rawContent.columns)) {
        columnsArray = rawContent.columns;
    } else if (typeof rawContent.columns === 'number' && rawContent.columns > 0) {
        // Convert numeric columns to TableColumn array using headers or generating defaults
        const headers = rawContent.headers || rawContent.data?.[0] || [];
        columnsArray = Array.from({ length: rawContent.columns }, (_, i) => ({
            field: `col${i}`,
            header: headers[i] || `Coluna ${i + 1}`,
            width: 100,
            align: 'left' as const,
            format: 'text' as const
        }));
    }

    const config = {
        dataSource: rawContent.dataSource || '',
        columns: columnsArray,
        showHeader: rawContent.showHeader !== false,
        alternatingRowColors: rawContent.alternatingRowColors !== false,
        styles: rawContent.styles || {},
        pagination: rawContent.pagination
    };

    const [activeTab, setActiveTab] = useState<'columns' | 'data' | 'style'>('columns');

    const handleUpdate = (updates: any) => {
        onUpdate({
            content: {
                ...config,
                ...updates
            }
        });
    };

    const addColumn = () => {
        const newColumn: TableColumn = {
            field: '',
            header: 'Nova Coluna',
            width: 100,
            align: 'left',
            format: 'text'
        };
        handleUpdate({ columns: [...(config.columns || []), newColumn] });
    };

    const updateColumn = (index: number, updates: Partial<TableColumn>) => {
        const newColumns = [...(config.columns || [])];
        newColumns[index] = { ...newColumns[index], ...updates };
        handleUpdate({ columns: newColumns });
    };

    const removeColumn = (index: number) => {
        const newColumns = [...(config.columns || [])];
        newColumns.splice(index, 1);
        handleUpdate({ columns: newColumns });
    };

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
                <button
                    onClick={() => setActiveTab('columns')}
                    className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'columns' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Layout className="h-3 w-3 mx-auto mb-1" />
                    Colunas
                </button>
                <button
                    onClick={() => setActiveTab('data')}
                    className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Database className="h-3 w-3 mx-auto mb-1" />
                    Dados
                </button>
                <button
                    onClick={() => setActiveTab('style')}
                    className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'style' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Settings className="h-3 w-3 mx-auto mb-1" />
                    Estilo
                </button>
            </div>

            {/* Columns Tab */}
            {activeTab === 'columns' && (
                <div className="p-4 bg-white">
                    <div className="space-y-3">
                        {(config.columns || []).map((col: TableColumn, index: number) => (
                            <div key={index} className="p-3 border border-gray-200 rounded bg-gray-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                                    <input
                                        type="text"
                                        value={col.header}
                                        onChange={(e) => updateColumn(index, { header: e.target.value })}
                                        className="flex-1 px-2 py-1 text-sm font-medium border-none bg-transparent focus:ring-0"
                                        placeholder="Título da Coluna"
                                    />
                                    <button
                                        onClick={() => removeColumn(index)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        title="Remover coluna"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pl-6">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Campo de Dados</label>
                                        <input
                                            type="text"
                                            value={col.field}
                                            onChange={(e) => updateColumn(index, { field: e.target.value })}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                            placeholder="ex: sensor.temp"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Formato</label>
                                        <select
                                            value={col.format || 'text'}
                                            onChange={(e) => updateColumn(index, { format: e.target.value as any })}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                        >
                                            <option value="text">Texto</option>
                                            <option value="number">Número</option>
                                            <option value="date">Data</option>
                                            <option value="temperature">Temperatura</option>
                                            <option value="humidity">Umidade</option>
                                            <option value="currency">Moeda</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Largura</label>
                                        <input
                                            type="text"
                                            value={col.width || ''}
                                            onChange={(e) => updateColumn(index, { width: parseInt(e.target.value) || undefined })}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                            placeholder="Auto"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Alinhamento</label>
                                        <select
                                            value={col.align || 'left'}
                                            onChange={(e) => updateColumn(index, { align: e.target.value as any })}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                        >
                                            <option value="left">Esquerda</option>
                                            <option value="center">Centro</option>
                                            <option value="right">Direita</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addColumn}
                            className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded text-gray-500 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="text-sm">Adicionar Coluna</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
                <div className="p-4 bg-white">
                    <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">Fonte de Dados</label>
                        <select
                            value={config.dataSource || ''}
                            onChange={(e) => handleUpdate({ dataSource: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                            <option value="">Selecione uma fonte...</option>
                            <option value="sensorData">Dados dos Sensores</option>
                            <option value="validation.cycles">Ciclos da Validação</option>
                            <option value="custom">Dados Personalizados</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">Linhas por Página</label>
                        <input
                            type="number"
                            value={config.pagination?.rowsPerPage || 50}
                            onChange={(e) => handleUpdate({
                                pagination: { ...config.pagination, rowsPerPage: parseInt(e.target.value) }
                            })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                    </div>
                </div>
            )}

            {/* Style Tab */}
            {activeTab === 'style' && (
                <div className="p-4 bg-white">
                    <div className="space-y-3">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.showHeader !== false}
                                onChange={(e) => handleUpdate({ showHeader: e.target.checked })}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Mostrar Cabeçalho</span>
                        </label>

                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.alternatingRowColors !== false}
                                onChange={(e) => handleUpdate({ alternatingRowColors: e.target.checked })}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Linhas Alternadas</span>
                        </label>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Cor do Cabeçalho</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={config.styles?.headerBackground || '#f3f4f6'}
                                    onChange={(e) => handleUpdate({
                                        styles: { ...config.styles, headerBackground: e.target.value }
                                    })}
                                    className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                                />
                                <span className="text-xs text-gray-500">{config.styles?.headerBackground || '#f3f4f6'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
