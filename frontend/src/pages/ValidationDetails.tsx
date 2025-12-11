import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
import { parseToDate, formatBRShort } from '@/utils/parseDate';

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
    cycles?: Array<{
      id: string;
      name: string;
      totalReadings: number;
      conformityPercentage: number;
      temperature: {
        min: number;
        max: number;
        average: number;
      };
      humidity?: {
        min: number;
        max: number;
        average: number;
      };
    }>;
  };
  chartConfig?: any;
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
  const [activeDataTab, setActiveDataTab] = useState<'temperature' | 'humidity'>('temperature');
  const [toleranceSec, setToleranceSec] = useState<number>(() => {
    const saved = localStorage.getItem('validationToleranceSec');
    return saved ? Number(saved) : 30;
  });
  const handleExportXLSX = async () => {
    if (!data) return;
    const XLSX = await import('xlsx');

    // Use all sensors with their registered names
    const tempHeaders = ['Data/Hora'];
    const humHeaders = ['Data/Hora'];
    
    // Add sensor columns with names
    sensors.forEach(s => {
      tempHeaders.push(`${s.type.name} Temp (°C)`);
      humHeaders.push(`${s.type.name} Umidade (%RH)`);
    });
    
    // Add acceptance limits columns
    tempHeaders.push('Temp Mín Aceitação (°C)', 'Temp Máx Aceitação (°C)');
    humHeaders.push('Umidade Mín Aceitação (%RH)', 'Umidade Máx Aceitação (%RH)');
    
    // Add calculated statistics columns
    tempHeaders.push('Temp Mín Calculada (°C)', 'Temp Média Calculada (°C)', 'Temp Máx Calculada (°C)');
    humHeaders.push('Umidade Mín Calculada (%RH)', 'Umidade Média Calculada (%RH)', 'Umidade Máx Calculada (%RH)');

    const tempRows: any[][] = [tempHeaders];
    const humRows: any[][] = [humHeaders];
    
    pivotRows.forEach(pr => {
      const dt = formatBRShort(pr.ts);
      const tRow: any[] = [dt];
      const hRow: any[] = [dt];
      
      // Add sensor readings
      sensors.forEach(s => {
        const r = pr.readings.get(s.serialNumber);
        tRow.push(r ? Number(r.temperature.toFixed(2)) : '');
        hRow.push(r && r.humidity !== null ? Number(r.humidity.toFixed(2)) : '');
      });
      
      // Add acceptance limits
      tRow.push(data.minTemperature, data.maxTemperature);
      hRow.push(data.minHumidity || '', data.maxHumidity || '');
      
      // Calculate statistics for this row
      const tempValues = Array.from(pr.readings.values()).map(r => r.temperature).filter(v => v !== null);
      const humValues = Array.from(pr.readings.values()).map(r => r.humidity).filter(v => v !== null && v !== undefined);
      
      if (tempValues.length > 0) {
        const minTemp = Math.min(...tempValues);
        const maxTemp = Math.max(...tempValues);
        const avgTemp = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;
        tRow.push(Number(minTemp.toFixed(2)), Number(avgTemp.toFixed(2)), Number(maxTemp.toFixed(2)));
      } else {
        tRow.push('', '', '');
      }
      
      if (humValues.length > 0) {
        const minHum = Math.min(...humValues);
        const maxHum = Math.max(...humValues);
        const avgHum = humValues.reduce((a, b) => a + b, 0) / humValues.length;
        hRow.push(Number(minHum.toFixed(2)), Number(avgHum.toFixed(2)), Number(maxHum.toFixed(2)));
      } else {
        hRow.push('', '', '');
      }
      
      tempRows.push(tRow);
      humRows.push(hRow);
    });

    const wb = XLSX.utils.book_new();
    const wsTemp = XLSX.utils.aoa_to_sheet(tempRows);
    // Ensure column A (Data/Hora) is written as Excel date cells with format dd/mm/yy hh:mm
    try {
      for (let i = 0; i < pivotRows.length; i++) {
        const rowIndex = i + 1; // aoa_to_sheet has header at row 0
        const cellAddr = XLSX.utils.encode_cell({ c: 0, r: rowIndex });
        const tsMs = pivotRows[i].ts; // stored as numeric ms
        if (tsMs == null) continue;
        // overwrite cell with date type
        wsTemp[cellAddr] = { t: 'd', v: new Date(Number(tsMs)), z: 'dd/mm/yy hh:mm' } as any;
      }
    } catch (err) {
      // If any error, fall back to string cells (already present)
      console.warn('Could not set date cells for XLSX Temperatura sheet', err);
    }
    XLSX.utils.book_append_sheet(wb, wsTemp, 'Temperatura');
    if (data.statistics?.humidity) {
      const wsHum = XLSX.utils.aoa_to_sheet(humRows);
      try {
        for (let i = 0; i < pivotRows.length; i++) {
          const rowIndex = i + 1;
          const cellAddr = XLSX.utils.encode_cell({ c: 0, r: rowIndex });
          const tsMs = pivotRows[i].ts;
          if (tsMs == null) continue;
          wsHum[cellAddr] = { t: 'd', v: new Date(Number(tsMs)), z: 'dd/mm/yy hh:mm' } as any;
        }
      } catch (err) {
        console.warn('Could not set date cells for XLSX Umidade sheet', err);
      }
      XLSX.utils.book_append_sheet(wb, wsHum, 'Umidade');
    }
    const fileName = `validacao_${data.validationNumber}_pivot.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  React.useEffect(() => {
    if (id) {
      fetchValidationDetails();
    }
  }, [id]);

  // Using shared parseToDate from utils for deterministic parsing

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

        // Calculate per-cycle statistics
        const cycleStats = validationData.cycles?.map(cycle => {
          const cycleStart = parseToDate(cycle.startAt);
          const cycleEnd = parseToDate(cycle.endAt);
          
          const cycleData = sensorData.filter((row: any) => {
            const rowTime = parseToDate(row.timestamp);
            return rowTime >= cycleStart && rowTime <= cycleEnd;
          });

          if (cycleData.length === 0) {
            return {
              id: cycle.id,
              name: cycle.name,
              totalReadings: 0,
              conformityPercentage: 0,
              temperature: { min: 0, max: 0, average: 0 },
              humidity: { min: 0, max: 0, average: 0 }
            };
          }

          const cycleTemps = cycleData.map((d: any) => d.temperature);
          const cycleHumids = cycleData.map((d: any) => d.humidity).filter((h: any) => h !== null);
          
          let cycleConformCount = 0;
          cycleData.forEach((row: any) => {
            const tempOk = row.temperature >= validationData.minTemperature && row.temperature <= validationData.maxTemperature;
            let humidOk = true;
            if (validationData.minHumidity !== null && validationData.maxHumidity !== null && row.humidity !== null) {
              humidOk = row.humidity >= validationData.minHumidity && row.humidity <= validationData.maxHumidity;
            }
            if (tempOk && humidOk) cycleConformCount++;
          });

          return {
            id: cycle.id,
            name: cycle.name,
            totalReadings: cycleData.length,
            conformityPercentage: (cycleConformCount / cycleData.length) * 100,
            temperature: {
              min: Math.min(...cycleTemps),
              max: Math.max(...cycleTemps),
              average: cycleTemps.reduce((a: number, b: number) => a + b, 0) / cycleTemps.length
            },
            humidity: cycleHumids.length > 0 ? {
              min: Math.min(...cycleHumids),
              max: Math.max(...cycleHumids),
              average: cycleHumids.reduce((a: number, b: number) => a + b, 0) / cycleHumids.length
            } : undefined
          };
        }) || [];
        
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
          } : null,
          cycles: cycleStats
        };
      }
      
      setData(validationData);
    } catch (error) {
      console.error('Error fetching validation:', error);
      toast.error('Erro ao carregar dados da validação');
    } finally {
      setIsLoading(false);
    }
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
      toast.success(result.message || 'Dados deletados com sucesso!');
      setShowDeleteModal(false);
      
      // Recarregar página para atualizar dados
      window.location.reload();
    } catch (error) {
      console.error('Error deleting sensor data:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar dados dos sensores');
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

  const isWithinCycleDates = (timestamp: number): boolean => {
    if (!data.cycles || data.cycles.length === 0) return true; // If no cycles, consider all within
    const ts = new Date(timestamp);
    return data.cycles.some(cycle => {
      const start = parseToDate(cycle.startAt);
      const end = parseToDate(cycle.endAt);
      return ts >= start && ts <= end;
    });
  };

  const getRowStats = (readings: Map<string, SensorDataRow>) => {
    const temps = Array.from(readings.values()).map(r => r.temperature).filter(t => !isNaN(t));
    const humids = Array.from(readings.values()).map(r => r.humidity).filter(h => h !== null && !isNaN(h)) as number[];
    
    return {
      tempMax: temps.length > 0 ? Math.max(...temps) : null,
      tempAvg: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      tempMin: temps.length > 0 ? Math.min(...temps) : null,
      humidMax: humids.length > 0 ? Math.max(...humids) : null,
      humidAvg: humids.length > 0 ? humids.reduce((a, b) => a + b, 0) / humids.length : null,
      humidMin: humids.length > 0 ? Math.min(...humids) : null,
    };
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
    const dt = parseToDate(row.timestamp);
    const key = `${dt.toISOString()}|${row.sensor.id}`;
    if (!uniqueRowsMap.has(key)) uniqueRowsMap.set(key, row);
  });
  const uniqueRows = Array.from(uniqueRowsMap.values());

  // Util: formatar data como dd/mm/aa hh:mm
  // Using shared formatBRShort from utils

  // PIVOT VIEW: construir linhas por timestamp com cada sensor em colunas, alinhando por tolerância
  const sensorOrderMap = new Map<string, SensorDataRow['sensor']>();
  uniqueRows.forEach(r => {
    if (!sensorOrderMap.has(r.sensor.serialNumber)) {
      sensorOrderMap.set(r.sensor.serialNumber, r.sensor);
    }
  });
  const sensors = Array.from(sensorOrderMap.values());

  // Preparar listas por sensor (ordenadas por timestamp)
  const readingsBySensor = new Map<string, SensorDataRow[]>();
  sensors.forEach(s => readingsBySensor.set(s.serialNumber, []));
  uniqueRows.forEach(r => {
    const arr = readingsBySensor.get(r.sensor.serialNumber)!;
    arr.push(r);
  });
  sensors.forEach(s => {
    const arr = readingsBySensor.get(s.serialNumber)!;
    arr.sort((a, b) => parseToDate(a.timestamp).getTime() - parseToDate(b.timestamp).getTime());
  });

  const TOLERANCE_SECONDS = toleranceSec; // alinhar leituras conforme configuração
  const primarySensor = sensors[0]?.serialNumber;
  const primaryTimeline = primarySensor ? readingsBySensor.get(primarySensor)! : [];

  // Função para achar leitura mais próxima dentro da tolerância
  const findNearestWithinTolerance = (arr: SensorDataRow[], targetMs: number): SensorDataRow | undefined => {
    if (arr.length === 0) return undefined;
    // busca linear simples (dataset pequeno); pode otimizar com busca binária se necessário
    let best: SensorDataRow | undefined;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const r of arr) {
      const diff = Math.abs(parseToDate(r.timestamp).getTime() - targetMs) / 1000;
      if (diff < bestDiff) {
        bestDiff = diff;
        best = r;
      }
    }
    if (bestDiff <= TOLERANCE_SECONDS) return best;
    return undefined;
  };

  // Construir pivotRows a partir da linha do sensor primário, alinhando os demais
  const pivotRows = primaryTimeline.map(base => {
    const baseMs = parseToDate(base.timestamp).getTime();
    const map = new Map<string, SensorDataRow>();
    // sempre incluir leitura do sensor primário
    map.set(base.sensor.serialNumber, base);
    // alinhar demais sensores
    sensors.forEach(s => {
      if (s.serialNumber === base.sensor.serialNumber) return;
      const arr = readingsBySensor.get(s.serialNumber)!;
      const nearest = findNearestWithinTolerance(arr, baseMs);
      if (nearest) map.set(s.serialNumber, nearest);
    });
    return {
      // store timestamp as numeric ms since epoch (naive) — formatting happens on demand
      ts: baseMs,
      readings: map
    };
  });

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
            Exibindo {paginatedData.length} de {uniqueRows.length} leituras (agrupadas por timestamp)
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 mr-4">
              <label className="text-sm text-gray-700">Tolerância (s):</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={toleranceSec}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setToleranceSec(v);
                  localStorage.setItem('validationToleranceSec', String(v));
                }}
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </div>
            <button
              onClick={handleExportXLSX}
              className="btn-secondary flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar
            </button>
            {data.sensorData.length > 0 && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn-danger flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Dados
              </button>
            )}
          </div>
        </div>

        {/* Data Tables Tabs */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b bg-gray-50 px-4">
            <div className="flex gap-2">
              <button
                className={`px-3 py-2 text-sm rounded-t ${activeDataTab === 'temperature' ? 'bg-white border border-b-transparent' : 'text-gray-600'}`}
                onClick={() => setActiveDataTab('temperature')}
              >
                Temperatura
              </button>
              {data.statistics?.humidity && (
                <button
                  className={`px-3 py-2 text-sm rounded-t ${activeDataTab === 'humidity' ? 'bg-white border border-b-transparent' : 'text-gray-600'}`}
                  onClick={() => setActiveDataTab('humidity')}
                >
                  Umidade
                </button>
              )}
            </div>
          </div>

          {/* Temperature Table */}
          {activeDataTab === 'temperature' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                    {sensors.map(s => (
                      <th key={s.serialNumber + '-temp'} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {s.serialNumber} Temp (°C)
                      </th>
                    ))}
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máx</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Média</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mín</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map(pivot => {
                    const rowStats = getRowStats(pivot.readings);
                    const withinCycle = isWithinCycleDates(pivot.ts);
                    return (
                      <tr key={pivot.ts}>
                        <td className={`px-3 py-4 whitespace-nowrap text-sm ${withinCycle ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                          {formatBRShort(pivot.ts)}
                        </td>
                        {sensors.map(s => {
                          const reading = pivot.readings.get(s.serialNumber);
                          const withinLimits = reading ? isWithinLimits(reading) : false;
                          const textClass = reading 
                            ? (withinLimits ? 'text-green-600' : 'text-red-600 font-medium')
                            : 'text-gray-400';
                          const finalClass = withinCycle ? textClass : `${textClass} line-through`;
                          return (
                            <td key={pivot.ts + s.serialNumber + '-t'} className="px-3 py-4 whitespace-nowrap text-sm">
                              {reading ? (
                                <span className={finalClass}>
                                  {reading.temperature.toFixed(2)}
                                </span>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rowStats.tempMax !== null ? `${rowStats.tempMax.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rowStats.tempAvg !== null ? `${rowStats.tempAvg.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rowStats.tempMin !== null ? `${rowStats.tempMin.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Humidity Table */}
          {activeDataTab === 'humidity' && data.statistics?.humidity && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                    {sensors.map(s => (
                      <th key={s.serialNumber + '-hum'} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {s.serialNumber} Umid (%RH)
                      </th>
                    ))}
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máx</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Média</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mín</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map(pivot => {
                    const rowStats = getRowStats(pivot.readings);
                    const withinCycle = isWithinCycleDates(pivot.ts);
                    return (
                      <tr key={pivot.ts}>
                        <td className={`px-3 py-4 whitespace-nowrap text-sm ${withinCycle ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                          {formatBRShort(pivot.ts)}
                        </td>
                        {sensors.map(s => {
                          const reading = pivot.readings.get(s.serialNumber);
                          const withinLimits = reading && reading.humidity !== null 
                            ? (reading.humidity >= (data.minHumidity || 0) && reading.humidity <= (data.maxHumidity || 100))
                            : false;
                          const textClass = reading && reading.humidity !== null
                            ? (withinLimits ? 'text-green-600' : 'text-red-600 font-medium')
                            : 'text-gray-400';
                          const finalClass = withinCycle ? textClass : `${textClass} line-through`;
                          return (
                            <td key={pivot.ts + s.serialNumber + '-h'} className="px-3 py-4 whitespace-nowrap text-sm">
                              {reading ? (reading.humidity !== null ? 
                                <span className={finalClass}>{reading.humidity.toFixed(2)}%</span> : 
                                <span className="text-gray-400">N/A</span>) : 
                                <span className="text-gray-400">-</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rowStats.humidMax !== null ? `${rowStats.humidMax.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rowStats.humidAvg !== null ? `${rowStats.humidAvg.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rowStats.humidMin !== null ? `${rowStats.humidMin.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
