import React, { useState, useEffect } from 'react';
import { ChartElement } from '../../../../types/editor';
import { BarChart, LineChart, PieChart, Activity, Database, Settings } from 'lucide-react';

interface ChartElementConfigProps {
    element: ChartElement;
    onUpdate: (updates: any) => void;
}

export const ChartElementConfig: React.FC<ChartElementConfigProps> = ({
    element,
    onUpdate
}) => {
    // Ensure properties object exists
    const properties = element.properties || {
        chartType: 'line',
        dataSource: '',
        title: 'Novo Gráfico',
        width: 400,
        height: 300,
        showLegend: true,
        showGrid: true
    };

    const handleChange = (field: string, value: any) => {
        onUpdate({
            properties: {
                ...properties,
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Configuração do Gráfico
                </h4>

                {/* Tipo de Gráfico */}
                <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-2">Tipo de Gráfico</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { type: 'line', label: 'Linha', icon: LineChart },
                            { type: 'bar', label: 'Barra', icon: BarChart },
                            { type: 'pie', label: 'Pizza', icon: PieChart },
                            { type: 'doughnut', label: 'Rosca', icon: PieChart }, // Reusing PieChart icon
                            { type: 'area', label: 'Área', icon: Activity },
                        ].map((chart) => (
                            <button
                                key={chart.type}
                                onClick={() => handleChange('chartType', chart.type)}
                                className={`flex flex-col items-center justify-center p-2 border rounded transition-colors ${properties.chartType === chart.type
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <chart.icon className="h-5 w-5 mb-1" />
                                <span className="text-xs">{chart.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Título */}
                <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-1">Título do Gráfico</label>
                    <input
                        type="text"
                        value={properties.title || ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Ex: Temperatura vs Tempo"
                    />
                </div>
            </div>

            <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Dados
                </h4>

                {/* Fonte de Dados */}
                <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-1">Fonte de Dados</label>
                    <select
                        value={properties.dataSource || ''}
                        onChange={(e) => handleChange('dataSource', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                        <option value="">Selecione uma fonte...</option>
                        <option value="{{sensorData}}">Dados dos Sensores</option>
                        <option value="{{validation.cycles}}">Ciclos da Validação</option>
                        <option value="custom">Dados Personalizados</option>
                    </select>
                </div>

                {/* Campos (Eixos) */}
                {(properties.dataSource === '{{sensorData}}' || properties.dataSource === '{{validation.cycles}}') && (
                    <div className="space-y-3">
                        {properties.dataSource === '{{validation.cycles}}' && (
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tipo de Ciclo</label>
                                <select
                                    value={properties.cycleType || ''}
                                    onChange={(e) => handleChange('cycleType', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value="">Selecione o Ciclo...</option>
                                    {[
                                        { value: 'NORMAL', label: 'Normal' },
                                        { value: 'CHEIO', label: 'Cheio' },
                                        { value: 'VAZIO', label: 'Vazio' },
                                        { value: 'FALTA_ENERGIA', label: 'Falta de Energia' },
                                        { value: 'PORTA_ABERTA', label: 'Porta Aberta' }
                                    ].map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Eixo X (Categoria)</label>
                            <select
                                value={properties.xAxis || ''}
                                onChange={(e) => handleChange('xAxis', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                                <option value="timestamp">Data/Hora</option>
                                <option value="cycleNumber">Número do Ciclo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Eixo Y (Valor)</label>
                            <select
                                value={Array.isArray(properties.yAxis) ? properties.yAxis[0] : properties.yAxis || ''}
                                onChange={(e) => handleChange('yAxis', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                                <option value="temperature">Temperatura</option>
                                <option value="humidity">Umidade</option>
                                <option value="pressure">Pressão</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-white border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Opções
                </h4>

                <div className="space-y-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={properties.showLegend !== false}
                            onChange={(e) => handleChange('showLegend', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mostrar Legenda</span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={properties.showGrid !== false}
                            onChange={(e) => handleChange('showGrid', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mostrar Grade</span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={properties.showLabels !== false}
                            onChange={(e) => handleChange('showLabels', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mostrar Rótulos de Dados</span>
                    </label>
                </div>
            </div>
        </div>
    );
};
