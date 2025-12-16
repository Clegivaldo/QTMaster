import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
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

type EnrichedRow = SensorDataRow & { tsMs: number };

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
    
    // Determine which sensors are selected in the chart (respect saved selection / hidden list)
    const selectedSensorIds: Set<string> = new Set();
    // If chartConfig has explicit selectedSensorIds, prefer it
    const cfgSelected: string[] | undefined = data.chartConfig?.selectedSensorIds || data.chartConfig?.visibleSensors;
    if (Array.isArray(cfgSelected) && cfgSelected.length > 0) {
      cfgSelected.forEach(id => selectedSensorIds.add(id));
    } else if (Array.isArray((data as any).hiddenSensorIds)) {
      // If backend stores hiddenSensorIds, consider sensors not in that list as selected
      const hidden = new Set((data as any).hiddenSensorIds as string[]);
      sensors.forEach(s => {
        const sid = (s as any).id || s.serialNumber;
        if (!hidden.has(sid)) selectedSensorIds.add(sid);
      });
    } else {
      // default: all sensors selected
      sensors.forEach(s => selectedSensorIds.add((s as any).id || s.serialNumber));
    }

    // Add sensor columns with names (defensive: some sensors may not have `type`)
    const visibleSensorsList = sensors.filter(s => selectedSensorIds.has((s as any).id || s.serialNumber));
    visibleSensorsList.forEach(s => {
      const sensorName = (s && (s.type?.name || s.serialNumber)) || 'Sensor';
      tempHeaders.push(`${sensorName} Temp (°C)`);
      humHeaders.push(`${sensorName} Umidade (%RH)`);
    });
    
    // Add acceptance limits columns (rename per request)
    tempHeaders.push('Limite Min', 'Limite Max');
    humHeaders.push('Limite Min', 'Limite Max');
    
    // Add calculated statistics columns (short names)
    tempHeaders.push('Mín', 'Média', 'Máx');
    humHeaders.push('Mín', 'Média', 'Máx');

    const tempRows: any[][] = [tempHeaders];
    const humRows: any[][] = [humHeaders];
    
    // Export should respect chart dateRange and visible sensors. Use full primary timeline (no pagination)
    const chartRange = data.chartConfig?.dateRange;
    const startMs = chartRange ? parseToDate(chartRange.start).getTime() : Number.MIN_SAFE_INTEGER;
    const endMs = chartRange ? parseToDate(chartRange.end).getTime() : Number.MAX_SAFE_INTEGER;

    // Use primary timeline (all rows) instead of paginatedData
    const primaryTimelineAll = primarySensor ? readingsBySensor.get(primarySensor) || [] : [];
    // Build exportPrimary in the same shape as paginatedData (ts/readings map)
    const exportPrimary = primaryTimelineAll
      .filter(base => base.tsMs >= startMs && base.tsMs <= endMs)
      .map(base => {
        const map = new Map<string, SensorDataRow | EnrichedRow>();
        map.set(base.sensor.serialNumber, base);
        visibleSensorsList.forEach(s => {
          if (s.serialNumber === base.sensor.serialNumber) return;
          const arr = readingsBySensor.get(s.serialNumber) || [];
          const nearest = findNearestWithinToleranceBinary(arr, base.tsMs);
          if (nearest) map.set(s.serialNumber, nearest);
        });
        return { tsMs: base.tsMs, readings: map };
      });

    exportPrimary.forEach(pr => {
      const dt = formatBRShort(pr.tsMs);
      const tRow: any[] = [dt];
      const hRow: any[] = [dt];

      // Add sensor readings only for visible sensors
      visibleSensorsList.forEach(s => {
        const sid = s.serialNumber;
        const r = pr.readings.get(sid);
        tRow.push(r ? Number(r.temperature.toFixed(2)) : '');
        hRow.push(r && r.humidity !== null ? Number(r.humidity.toFixed(2)) : '');
      });
      
      // Add acceptance limits
      tRow.push(data.minTemperature, data.maxTemperature);
      hRow.push(data.minHumidity || '', data.maxHumidity || '');
      
      // Calculate statistics for this row (only visible sensors)
      const tempValues = Array.from(pr.readings.entries())
        .filter(([k]) => visibleSensorsList.some(s => s.serialNumber === k))
        .map(([, r]) => r.temperature).filter(v => v !== null);
      const humValues = Array.from(pr.readings.entries())
        .filter(([k]) => visibleSensorsList.some(s => s.serialNumber === k))
        .map(([, r]) => r.humidity).filter(v => v !== null && v !== undefined);
      
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
      for (let i = 0; i < exportPrimary.length; i++) {
        const rowIndex = i + 1; // aoa_to_sheet has header at row 0
        const cellAddr = XLSX.utils.encode_cell({ c: 0, r: rowIndex });
        const tsMs = exportPrimary[i].tsMs; // stored as numeric ms
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
        for (let i = 0; i < exportPrimary.length; i++) {
          const rowIndex = i + 1;
          const cellAddr = XLSX.utils.encode_cell({ c: 0, r: rowIndex });
          const tsMs = exportPrimary[i].tsMs;
          if (tsMs == null) continue;
          wsHum[cellAddr] = { t: 'd', v: new Date(Number(tsMs)), z: 'dd/mm/yy hh:mm' } as any;
        }
      } catch (err) {
        console.warn('Could not set date cells for XLSX Umidade sheet', err);
      }
      XLSX.utils.book_append_sheet(wb, wsHum, 'Umidade');
    }
    const fileName = `validacao_${data.validationNumber}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  React.useEffect(() => {
    if (id) {
      fetchValidationDetails();
    }
  }, [id]);

  // Performance: heavy processing is memoized and must be declared before any early returns
  const uniqueRows = useMemo<EnrichedRow[]>(() => {
    if (!data || !Array.isArray(data.sensorData)) return [];
    const map = new Map<string, SensorDataRow>();
    for (const row of data.sensorData) {
      try {
        if (!row || !row.timestamp || !row.sensor) continue;
        const dt = parseToDate(row.timestamp);
        const serial = (row.sensor as any).serialNumber || (row.sensor as any).id || 'unknown';
        const key = `${dt.toISOString()}|${serial}`;
        if (!map.has(key)) map.set(key, row);
      } catch (e) {
        continue;
      }
    }
    return Array.from(map.values()).map(r => ({ ...r, tsMs: (() => { try { return parseToDate(r.timestamp).getTime(); } catch { return 0; } })() }));
  }, [data?.sensorData]);

  const sensors = useMemo(() => {
    const order = new Map<string, SensorDataRow['sensor']>();
    uniqueRows.forEach(r => {
      if (!order.has(r.sensor.serialNumber)) order.set(r.sensor.serialNumber, r.sensor);
    });
    return Array.from(order.values());
  }, [uniqueRows]);

  const readingsBySensor = useMemo(() => {
    const m = new Map<string, EnrichedRow[]>();
    sensors.forEach(s => m.set(s.serialNumber, []));
    uniqueRows.forEach(r => {
      const arr = m.get(r.sensor.serialNumber)!;
      if (arr) arr.push(r);
    });
    m.forEach((arr) => arr.sort((a, b) => a.tsMs - b.tsMs));
    return m;
  }, [uniqueRows, sensors]);

  const TOLERANCE_SECONDS = toleranceSec;
  const primarySensor = sensors[0]?.serialNumber;
  const primaryTimeline = primarySensor ? readingsBySensor.get(primarySensor) || [] : [];

  const findNearestWithinToleranceBinary = useCallback((arr: EnrichedRow[], targetMs: number): EnrichedRow | undefined => {
    if (!arr || arr.length === 0) return undefined;
    let lo = 0, hi = arr.length - 1;
    if (targetMs <= arr[0].tsMs) {
      return Math.abs(arr[0].tsMs - targetMs) / 1000 <= TOLERANCE_SECONDS ? arr[0] : undefined;
    }
    if (targetMs >= arr[hi].tsMs) {
      return Math.abs(arr[hi].tsMs - targetMs) / 1000 <= TOLERANCE_SECONDS ? arr[hi] : undefined;
    }
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const midTs = arr[mid].tsMs;
      if (midTs === targetMs) return arr[mid];
      if (midTs < targetMs) lo = mid + 1;
      else hi = mid - 1;
    }
    const candidates = [] as EnrichedRow[];
    if (arr[lo]) candidates.push(arr[lo]);
    if (arr[lo - 1]) candidates.push(arr[lo - 1]);
    let best: EnrichedRow | undefined;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const diff = Math.abs(c.tsMs - targetMs) / 1000;
      if (diff < bestDiff) {
        bestDiff = diff;
        best = c;
      }
    }
    if (bestDiff <= TOLERANCE_SECONDS) return best;
    return undefined;
  }, [TOLERANCE_SECONDS]);

  const totalPivotRows = primaryTimeline.length;
  const totalPages = Math.max(1, Math.ceil(totalPivotRows / rowsPerPage));

  const paginatedData = useMemo(() => {
    if (!primaryTimeline || primaryTimeline.length === 0) return [];
    const start = (currentPage - 1) * rowsPerPage;
    const end = currentPage * rowsPerPage;
    const pagePrimary = primaryTimeline.slice(start, end);
    return pagePrimary.map(base => {
      const map = new Map<string, SensorDataRow | EnrichedRow>();
      map.set(base.sensor.serialNumber, base);
      sensors.forEach(s => {
        if (s.serialNumber === base.sensor.serialNumber) return;
        const arr = readingsBySensor.get(s.serialNumber) || [];
        const nearest = findNearestWithinToleranceBinary(arr, base.tsMs);
        if (nearest) map.set(s.serialNumber, nearest);
      });
      return { ts: base.tsMs, readings: map };
    });
  // Intentionally depend on these values so page recalculates when they change
  }, [primaryTimeline, currentPage, rowsPerPage, sensors, readingsBySensor, findNearestWithinToleranceBinary]);

  // Using shared parseToDate from utils for deterministic parsing

  const fetchValidationDetails = async () => {
    try {
      setIsLoading(true);
      const resp = await apiService.api.get(`/validations/${id}`);
      const validationData = resp.data?.data?.validation;
      
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
              name: cycle?.name || `Ciclo ${cycle.id || ''}`,
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
            name: cycle?.name || `Ciclo ${cycle.id || ''}`,
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
      const response = await apiService.api.delete(`/validations/${id}/sensor-data`);
      toast.success(response.data?.message || 'Dados deletados com sucesso!');
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

  // production: no debug logs here

  return (
    <>
      <PageHeader
        title={data.name || `Validação #${data.validationNumber}`}
        description={`Validação #${data.validationNumber} - ${data.client?.name || ''}`}
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
                        {s.serialNumber}
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

// Wrap with ErrorBoundary to capture runtime render errors and log details
import ErrorBoundary from '@/components/ErrorBoundary';

export default function ValidationDetailsWrapper() {
  return (
    <ErrorBoundary componentName="ValidationDetails">
      <ValidationDetails />
    </ErrorBoundary>
  );
}
