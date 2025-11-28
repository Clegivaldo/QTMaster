import React, { useState, useEffect } from 'react';
import { parseToDate, formatDisplayTime } from '@/utils/parseDate';
import { Thermometer, Droplets, Clock, Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface CycleStatistic {
  cycleId: string;
  cycleName: string;
  cycleType: string;
  startAt: string;
  endAt: string;
  temperature: {
    min: number;
    max: number;
    avg: number;
  } | null;
  humidity: {
    min: number;
    max: number;
    avg: number;
  } | null;
  count: number;
  duration: number;
}

interface OverallStatistic {
  temperature: {
    min: number;
    max: number;
    avg: number;
  } | null;
  humidity: {
    min: number;
    max: number;
    avg: number;
  } | null;
  count: number;
}

interface StatisticsData {
  overall: OverallStatistic;
  byCycle: CycleStatistic[];
  parameters: {
    minTemperature: number;
    maxTemperature: number;
    minHumidity: number | null;
    maxHumidity: number | null;
  };
}

interface StatisticsTabsProps {
  validationId: string;
}

const CYCLE_TYPE_COLORS: Record<string, string> = {
  NORMAL: 'bg-blue-100 text-blue-800',
  CHEIO: 'bg-green-100 text-green-800',
  VAZIO: 'bg-yellow-100 text-yellow-800',
  FALTA_ENERGIA: 'bg-red-100 text-red-800',
  PORTA_ABERTA: 'bg-orange-100 text-orange-800'
};

const CYCLE_TYPE_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  CHEIO: 'Cheio',
  VAZIO: 'Vazio',
  FALTA_ENERGIA: 'Falta de Energia',
  PORTA_ABERTA: 'Porta Aberta'
};

export default function StatisticsTabs({ validationId }: StatisticsTabsProps) {
  const [activeTab, setActiveTab] = useState<'overall' | 'cycles'>('overall');
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, [validationId]);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/validations/${validationId}/cycle-statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar estatísticas');

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 
      ? `${days}d ${remainingHours.toFixed(1)}h` 
      : `${days}d`;
  };

  const isOutOfRange = (value: number, min: number, max: number) => {
    return value < min || value > max;
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('overall')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overall'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Estatísticas Gerais
          </button>
          <button
            onClick={() => setActiveTab('cycles')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cycles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔄 Estatísticas por Ciclo
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overall' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Período Completo</h3>
              
              {/* Acceptance Criteria */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Critérios de Aceitação</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Temperatura: </span>
                    <span className="font-medium">
                      {data.parameters.minTemperature}°C a {data.parameters.maxTemperature}°C
                    </span>
                  </div>
                  {data.parameters.minHumidity !== null && data.parameters.maxHumidity !== null && (
                    <div>
                      <span className="text-gray-600">Umidade: </span>
                      <span className="font-medium">
                        {data.parameters.minHumidity}% a {data.parameters.maxHumidity}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Overall Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.overall.temperature && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Thermometer className="h-5 w-5 text-orange-500" />
                      <h4 className="font-medium">Temperatura</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Mínima:</span>
                        <span className={`font-medium ${
                          isOutOfRange(data.overall.temperature.min, data.parameters.minTemperature, data.parameters.maxTemperature)
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {data.overall.temperature.min.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Máxima:</span>
                        <span className={`font-medium ${
                          isOutOfRange(data.overall.temperature.max, data.parameters.minTemperature, data.parameters.maxTemperature)
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {data.overall.temperature.max.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Média:</span>
                        <span className="font-medium text-gray-900">
                          {data.overall.temperature.avg.toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {data.overall.humidity && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Droplets className="h-5 w-5 text-blue-500" />
                      <h4 className="font-medium">Umidade</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Mínima:</span>
                        <span className={`font-medium ${
                          data.parameters.minHumidity !== null && data.parameters.maxHumidity !== null &&
                          isOutOfRange(data.overall.humidity.min, data.parameters.minHumidity, data.parameters.maxHumidity)
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {data.overall.humidity.min.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Máxima:</span>
                        <span className={`font-medium ${
                          data.parameters.minHumidity !== null && data.parameters.maxHumidity !== null &&
                          isOutOfRange(data.overall.humidity.max, data.parameters.minHumidity, data.parameters.maxHumidity)
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {data.overall.humidity.max.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Média:</span>
                        <span className="font-medium text-gray-900">
                          {data.overall.humidity.avg.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                <span>{data.overall.count.toLocaleString()} leituras no total</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cycles' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Estatísticas por Ciclo</h3>
            
            {data.byCycle.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">Nenhum ciclo cadastrado ainda.</p>
                <p className="text-xs mt-1">Adicione ciclos para ver estatísticas detalhadas por período.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.byCycle.map(cycle => (
                  <div key={cycle.cycleId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Cycle Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-lg">{cycle.cycleName}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${CYCLE_TYPE_COLORS[cycle.cycleType]}`}>
                          {CYCLE_TYPE_LABELS[cycle.cycleType]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(cycle.duration)}</span>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="text-xs text-gray-500 mb-3">
                      {formatDisplayTime(parseToDate(cycle.startAt))} → {formatDisplayTime(parseToDate(cycle.endAt))}
                    </div>

                    {/* Statistics */}
                    {cycle.count === 0 ? (
                      <p className="text-sm text-gray-500 italic">Nenhuma leitura neste período</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cycle.temperature && (
                          <div className="bg-gray-50 rounded p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Thermometer className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium">Temperatura</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Min:</span>
                                <span className={`font-medium ${
                                  isOutOfRange(cycle.temperature.min, data.parameters.minTemperature, data.parameters.maxTemperature)
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}>
                                  {cycle.temperature.min.toFixed(1)}°C
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Max:</span>
                                <span className={`font-medium ${
                                  isOutOfRange(cycle.temperature.max, data.parameters.minTemperature, data.parameters.maxTemperature)
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}>
                                  {cycle.temperature.max.toFixed(1)}°C
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Média:</span>
                                <span className="font-medium text-gray-900">
                                  {cycle.temperature.avg.toFixed(1)}°C
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {cycle.humidity && (
                          <div className="bg-gray-50 rounded p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Droplets className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">Umidade</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Min:</span>
                                <span className={`font-medium ${
                                  data.parameters.minHumidity !== null && data.parameters.maxHumidity !== null &&
                                  isOutOfRange(cycle.humidity.min, data.parameters.minHumidity, data.parameters.maxHumidity)
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}>
                                  {cycle.humidity.min.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Max:</span>
                                <span className={`font-medium ${
                                  data.parameters.minHumidity !== null && data.parameters.maxHumidity !== null &&
                                  isOutOfRange(cycle.humidity.max, data.parameters.minHumidity, data.parameters.maxHumidity)
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}>
                                  {cycle.humidity.max.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Média:</span>
                                <span className="font-medium text-gray-900">
                                  {cycle.humidity.avg.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                      <Activity className="h-3 w-3" />
                      <span>{cycle.count.toLocaleString()} leituras</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
