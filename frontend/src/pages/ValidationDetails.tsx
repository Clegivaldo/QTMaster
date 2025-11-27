import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileSpreadsheet,
  Calendar,
  Thermometer,
  Droplets,
  TrendingUp,
  TrendingDown,
  Activity,
  Trash2,
  X
} from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import CycleManager from '@/components/CycleManager';
import StatisticsTabs from '@/components/StatisticsTabs';

interface SensorDataRow {
  id: string;
  timestamp: string;
  temperature: number;
  humidity: number | null;
  sensor: {
    serialNumber: string;
    type: {
      name: string;
    };
  };
}

interface ValidationData {
  id: string;
  name: string;
  validationNumber: string;
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number | null;
  maxHumidity: number | null;
  client: {
    name: string;
  };
  suitcase: {
    name: string;
  };
  sensorData: SensorDataRow[];
  cycles: Array<{
    id: string;
    name: string;
    cycleType: string;
    startAt: string;
    endAt: string;
    notes?: string;
    _count?: { importedItems: number };
  }>;
  statistics: {
    totalReadings: number;
    conformityPercentage: number;
    temperature: {
      min: number;
      max: number;
      average: number;
    };
    humidity: {
      min: number;
      max: number;
      average: number;
    };
  };
}

const ValidationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ValidationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    if (id) {
      fetchValidationDetails();
    }
  }, [id]);

  const fetchValidationDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/validations/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar dados');

      const result = await response.json();
      const validationData = result.data.validation;
      
      // Calcular statistics se não existir
      if (!validationData.statistics && validationData.sensorData && validationData.sensorData.length > 0) {
        const sensorData = validationData.sensorData;
        const totalReadings = sensorData.length;
        const temperatures = sensorData.map((d: any) => d.temperature);
        const humidities = sensorData.map((d: any) => d.humidity).filter((h: any) => h !== null);
        
        let conformCount = 0;
        sensorData.forEach((row: any) => {
          const tempOk = row.temperature >= validationData.minTemperature && row.temperature <= validationData.maxTemperature;
          let humidOk = true;
          if (validationData.minHumidity !== null && validationData.maxHumidity !== null && row.humidity !== null) {
            humidOk = row.humidity >= validationData.minHumidity && row.humidity <= validationData.maxHumidity;
          }
          if (tempOk && humidOk) conformCount++;
        });
        
        validationData.statistics = {
          totalReadings,
          conformityPercentage: (conformCount / totalReadings) * 100,
          temperature: {
            min: Math.min(...temperatures),
            max: Math.max(...temperatures),
            average: temperatures.reduce((a: number, b: number) => a + b, 0) / temperatures.length
          },
          humidity: humidities.length > 0 ? {
            min: Math.min(...humidities),
            max: Math.max(...humidities),
            average: humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length
          } : null
        };
      }
      
      setData(validationData);
    } catch (error) {
      console.error('Error fetching validation:', error);
      alert('Erro ao carregar dados da validação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    // Pivot: cada sensor em sua(s) coluna(s)
    // Obter lista única de sensores preservando ordem de aparecimento
    const sensorOrderMap = new Map<string, SensorDataRow['sensor']>();
    data.sensorData.forEach(r => {
      if (!sensorOrderMap.has(r.sensor.serialNumber)) {
        sensorOrderMap.set(r.sensor.serialNumber, r.sensor);
      }
    });
    const sensors = Array.from(sensorOrderMap.values());

    // Agrupar leituras por timestamp ISO (normalizado)
    const groupMap = new Map<string, Map<string, SensorDataRow>>();
    data.sensorData.forEach(r => {
      const tsKey = new Date(r.timestamp).toISOString();
      if (!groupMap.has(tsKey)) groupMap.set(tsKey, new Map());
      groupMap.get(tsKey)!.set(r.sensor.serialNumber, r);
    });
    const sortedTimestamps = Array.from(groupMap.keys()).sort();

    // Definir cabeçalhos dinâmicos
    // Coluna de data/hora + para cada sensor: Temperatura e, se existir algum valor de umidade, coluna de umidade
    const anyHumidity = data.sensorData.some(r => r.humidity !== null);
    const headers = ['Data/Hora'];
    sensors.forEach(s => {
      headers.push(`${s.serialNumber} Temperatura (°C)`);
      if (anyHumidity) headers.push(`${s.serialNumber} Umidade (%RH)`);
    });

    const rows: string[][] = [];
    sortedTimestamps.forEach(ts => {
      const sensorMap = groupMap.get(ts)!;
      const row: string[] = [new Date(ts).toLocaleString('pt-BR')];
      sensors.forEach(s => {
        const reading = sensorMap.get(s.serialNumber);
        if (reading) {
          row.push(reading.temperature.toFixed(2));
          if (anyHumidity) row.push(reading.humidity !== null ? reading.humidity.toFixed(2) : '');
        } else {
          // Sem leitura para este timestamp/sensor
          row.push('');
          if (anyHumidity) row.push('');
        }
      });
      rows.push(row);
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `validacao_${data.validationNumber}_pivot.csv`;
    link.click();
  };

  const handleDeleteSensorData = async () => {
    if (!id) return;
    
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/validations/${id}/sensor-data`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar dados');
      }

      const result = await response.json();
      alert(result.data.message || 'Dados deletados com sucesso!');
      setShowDeleteModal(false);
      
      // Recarregar página para atualizar dados
      window.location.reload();
    } catch (error) {
      console.error('Error deleting sensor data:', error);
      alert(error instanceof Error ? error.message : 'Erro ao deletar dados dos sensores');
    } finally {
      setIsDeleting(false);
    }
  };

  const isWithinLimits = (row: SensorDataRow): boolean => {
    if (!data) return false;
    
    const tempOk = row.temperature >= data.minTemperature && row.temperature <= data.maxTemperature;
    
    if (data.minHumidity !== null && data.maxHumidity !== null && row.humidity !== null) {
      const humidOk = row.humidity >= data.minHumidity && row.humidity <= data.maxHumidity;
      return tempOk && humidOk;
    }
    
    return tempOk;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Validação não encontrada</p>
        <button onClick={() => navigate('/validations')} className="btn-secondary mt-4">
          Voltar
        </button>
      </div>
    );
  }

  // De-duplicar linhas por timestamp+sensor para evitar repetição 3x
  const uniqueRowsMap = new Map<string, SensorDataRow>();
  data.sensorData.forEach((row) => {
    const key = `${new Date(row.timestamp).toISOString()}|${row.sensor.id}`;
    if (!uniqueRowsMap.has(key)) uniqueRowsMap.set(key, row);
  });
  const uniqueRows = Array.from(uniqueRowsMap.values());

  // PIVOT VIEW: construir linhas por timestamp com cada sensor em colunas
  const sensorOrderMap = new Map<string, SensorDataRow['sensor']>();
  uniqueRows.forEach(r => {
    if (!sensorOrderMap.has(r.sensor.serialNumber)) {
      sensorOrderMap.set(r.sensor.serialNumber, r.sensor);
    }
  });
  const sensors = Array.from(sensorOrderMap.values());

  const groupMap = new Map<string, Map<string, SensorDataRow>>();
  uniqueRows.forEach(r => {
    const tsKey = new Date(r.timestamp).toISOString();
    if (!groupMap.has(tsKey)) groupMap.set(tsKey, new Map());
    groupMap.get(tsKey)!.set(r.sensor.serialNumber, r);
  });
  const sortedTimestamps = Array.from(groupMap.keys()).sort();

  const pivotRows = sortedTimestamps.map(ts => ({
    ts,
    readings: groupMap.get(ts)!
  }));

  const paginatedData = pivotRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const totalPages = Math.ceil(pivotRows.length / rowsPerPage);

  return (
    <>
      <PageHeader
        title={data.name}
        description={`Validação #${data.validationNumber} - ${data.client.name}`}
        actions={(
          <button
            onClick={() => navigate('/validations')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}
      />

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Leituras</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.statistics?.totalReadings?.toLocaleString() || '0'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conformidade</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.statistics?.conformityPercentage?.toFixed(1) || '0'}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Temperatura Média</p>
                <p className="text-2xl font-bold text-orange-600">
                  {data.statistics?.temperature?.average?.toFixed(1) || '0'}°C
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.statistics?.temperature?.min?.toFixed(1) || '0'}°C - {data.statistics?.temperature?.max?.toFixed(1) || '0'}°C
                </p>
              </div>
              <Thermometer className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          {data.statistics?.humidity && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Umidade Média</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {data.statistics.humidity.average?.toFixed(1) || '0'}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.statistics.humidity.min?.toFixed(1) || '0'}% - {data.statistics.humidity.max?.toFixed(1) || '0'}%
                  </p>
                </div>
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* Min/Max Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-semibold">Temperatura Mínima</p>
                <p className="text-3xl font-bold text-blue-900">
                  {data.statistics?.temperature?.min?.toFixed(1) || '0'}°C
                </p>
              </div>
              <TrendingDown className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg shadow border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-semibold">Temperatura Máxima</p>
                <p className="text-3xl font-bold text-red-900">
                  {data.statistics?.temperature?.max?.toFixed(1) || '0'}°C
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-red-600" />
            </div>
          </div>

          {data.statistics?.humidity && (
            <>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-lg shadow border-2 border-cyan-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-700 font-semibold">Umidade Mínima</p>
                    <p className="text-3xl font-bold text-cyan-900">
                      {data.statistics.humidity.min?.toFixed(1) || '0'}%
                    </p>
                  </div>
                  <TrendingDown className="h-10 w-10 text-cyan-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow border-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-semibold">Umidade Máxima</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {data.statistics.humidity.max?.toFixed(1) || '0'}%
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-purple-600" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Statistics Tabs */}
        <StatisticsTabs validationId={data.id} />

        {/* Cycle Manager */}
        <div className="bg-white p-6 rounded-lg shadow">
          <CycleManager 
            validationId={data.id} 
            cycles={data.cycles || []} 
            onUpdate={fetchValidationDetails}
          />
        </div>

        {/* Actions */}
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Exibindo {paginatedData.length} de {uniqueRows.length} leituras
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="btn-secondary flex items-center gap-2"
            >
              {/* Data Table Pivot (sensores em colunas) */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                        {sensors.map(s => (
                          <th key={s.serialNumber + '-temp'} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {s.serialNumber} Temp (°C)
                          </th>
                        ))}
                        {data.statistics?.humidity && sensors.map(s => (
                          <th key={s.serialNumber + '-hum'} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {s.serialNumber} Umid (%RH)
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedData.map(pivot => {
                        return (
                          <tr key={pivot.ts}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(pivot.ts).toLocaleString('pt-BR')}
                            </td>
                            {sensors.map(s => {
                              const reading = pivot.readings.get(s.serialNumber);
                              const tempOut = reading && (reading.temperature < data.minTemperature || reading.temperature > data.maxTemperature);
                              return (
                                <td key={pivot.ts + s.serialNumber + '-t'} className="px-6 py-4 whitespace-nowrap text-sm">
                                  {reading ? (
                                    <span className={tempOut ? 'text-red-600 font-medium' : 'text-gray-900'}>
                                      {reading.temperature.toFixed(2)}°C
                                    </span>
                                  ) : <span className="text-gray-400">-</span>}
                                </td>
                              );
                            })}
                            {data.statistics?.humidity && sensors.map(s => {
                              const reading = pivot.readings.get(s.serialNumber);
                              return (
                                <td key={pivot.ts + s.serialNumber + '-h'} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {reading ? (reading.humidity !== null ? `${reading.humidity.toFixed(2)}%` : 'N/A') : <span className="text-gray-400">-</span>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                          {row.temperature.toFixed(2)}°C
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Página {currentPage} de {totalPages} (leituras agrupadas por timestamp)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          withinLimits
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {withinLimits ? 'Conforme' : 'Não Conforme'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Confirmar Exclusão de Dados
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-3">
                    Você está prestes a excluir <strong>{data?.sensorData.length || 0} leituras</strong> desta validação.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ Esta ação é irreversível!
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Todos os dados importados serão permanentemente removidos. As estatísticas e gráficos ficarão vazios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="button"
                onClick={handleDeleteSensorData}
                disabled={isDeleting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deletando...
                  </div>
                ) : (
                  'Sim, Excluir Todos os Dados'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ValidationDetails;
