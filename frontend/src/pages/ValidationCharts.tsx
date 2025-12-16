import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Settings, Calendar, Maximize } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
  , ReferenceArea
} from 'recharts';
import PageHeader from '@/components/Layout/PageHeader';
import { parseToDate, formatDisplayTime } from '@/utils/parseDate';
import { apiService } from '@/services/api';

interface SensorReading {
  timestamp: string;
  temperature: number;
  humidity: number | null;
  sensor: {
    id: string;
    serialNumber: string;
    name?: string;
  };
}

interface Cycle {
  id: string;
  name: string;
  cycleType: string;
  startAt: string;
  endAt: string;
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
  sensorData: SensorReading[];
  cycles?: Cycle[];
  chartConfig?: any;
  hiddenSensorIds?: string[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const ValidationCharts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ValidationData | null>(null);
  const [showTemperature, setShowTemperature] = useState(true);
  const [showHumidity, setShowHumidity] = useState(true);
  const [visibleSensors, setVisibleSensors] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [yAxisConfig, setYAxisConfig] = useState({
    tempMin: 0,
    tempMax: 30,
    tempTick: 5,
    humMin: 0,
    humMax: 100,
    humTick: 10
  });
  const [showSettings, setShowSettings] = useState(true);
  const [showCycleBands, setShowCycleBands] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alignmentBucketSec, setAlignmentBucketSec] = useState<number>(() => {
    const saved = localStorage.getItem('validationToleranceSec');
    return saved ? Math.max(1, Number(saved)) : 60;
  }); // agrupar leituras por janela (s)

  // Helper: format a Date for `input[type=datetime-local]` (local time, no timezone)
  const toLocalDatetimeInput = (d: Date) => {
    if (!d || isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const getCycleLegend = () => {
    if (!data?.cycles || data.cycles.length === 0) return [] as Array<{ type: string; color: string; label: string }>;
    const unique = Array.from(new Set(data.cycles.map(c => c.cycleType)));
    return unique.map(t => ({ type: t, color: cycleColor(t), label: t.replace('_', ' ') }));
  };

  useEffect(() => {
    if (id) {
      fetchValidation();
    }
  }, [id]);

  // Atualizar range de datas quando ciclo é selecionado
  useEffect(() => {
    if (selectedCycleId && data?.cycles) {
      const cycle = data.cycles.find(c => c.id === selectedCycleId);
      if (cycle) {
        setDateRange({
          start: toLocalDatetimeInput(parseToDate(cycle.startAt)),
          end: toLocalDatetimeInput(parseToDate(cycle.endAt))
        });
      }
    }
  }, [selectedCycleId, data?.cycles]);

  const fetchValidation = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.api.get(`/validations/${id}`);
      const validationData = response.data?.data?.validation;
      if (!validationData) throw new Error('Erro ao buscar dados');
      setData(validationData);

      // Inicializar configurações (Defaults vs Salvos)
      if (validationData.sensorData && validationData.sensorData.length > 0) {

        // 1. Sensores Visíveis
        const allSensorIds = [...new Set(validationData.sensorData.map((d: SensorReading) => d.sensor.id))] as string[];
        const hiddenSet = new Set(validationData.hiddenSensorIds || []);
        // Se houver hiddenSensorIds salvo, usa-o. Se não, todos visíveis.
        const initialVisible = new Set(allSensorIds.filter(id => !hiddenSet.has(id)));
        setVisibleSensors(initialVisible);

        // 2. Data Range Default
        const timestamps = validationData.sensorData.map((d: SensorReading) => parseToDate(d.timestamp).getTime());
        const minDate = new Date(Math.min(...timestamps));
        let maxDate = new Date(Math.max(...timestamps));

        // Limitar range a 30 dias para evitar gráficos muito largos
        const rangeMs = maxDate.getTime() - minDate.getTime();
        const maxRangeMs = 30 * 24 * 60 * 60 * 1000; // 30 dias
        if (rangeMs > maxRangeMs) {
          maxDate = new Date(minDate.getTime() + maxRangeMs);
        }

        let initialDateRange = {
          start: toLocalDatetimeInput(minDate),
          end: toLocalDatetimeInput(maxDate)
        };

        // 3. Eixo Y Default
        const temps = validationData.sensorData.map((d: SensorReading) => d.temperature);
        const tempMinInfo = temps.length > 0 ? Math.floor(Math.min(...temps) - 2) : 0;
        const tempMaxInfo = temps.length > 0 ? Math.ceil(Math.max(...temps) + 2) : 30;

        const humidities = validationData.sensorData
          .map((d: SensorReading) => d.humidity)
          .filter((h: number | null) => h !== null) as number[];

        if (humidities.length > 0) {
          setShowHumidity(true);
        }

        let initialYAxis = {
          tempMin: tempMinInfo,
          tempMax: tempMaxInfo,
          tempTick: 5,
          humMin: humidities.length > 0 ? Math.floor(Math.min(...humidities) - 5) : 0,
          humMax: humidities.length > 0 ? Math.ceil(Math.max(...humidities) + 5) : 100,
          humTick: 10
        };

        // 4. Sobrescrever com configurações salvas (se existirem)
        if (validationData.chartConfig) {
          if (validationData.chartConfig.yAxisConfig) {
            initialYAxis = { ...initialYAxis, ...validationData.chartConfig.yAxisConfig };
          }
          if (validationData.chartConfig.dateRange) {
            initialDateRange = validationData.chartConfig.dateRange;
          }
        }

        // 5. Aplicar Estado Final
        setYAxisConfig(initialYAxis);
        setDateRange(initialDateRange);
      }
    } catch (error) {
      console.error('Error fetching validation:', error);
      alert('Erro ao carregar dados da validação');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSensor = (sensorId: string) => {
    const newVisible = new Set(visibleSensors);
    if (newVisible.has(sensorId)) {
      newVisible.delete(sensorId);
    } else {
      newVisible.add(sensorId);
    }
    setVisibleSensors(newVisible);
  };

  const getChartData = () => {
    if (!data || !data.sensorData) return [];

    // Filtrar por range de datas
    let filtered = data.sensorData;
    if (dateRange) {
      const startTime = parseToDate(dateRange.start).getTime();
      const endTime = parseToDate(dateRange.end).getTime();
      filtered = filtered.filter(d => {
        const time = parseToDate(d.timestamp).getTime();
        return time >= startTime && time <= endTime;
      });
    }

    // Filtrar por sensores visíveis
    filtered = filtered.filter(d => visibleSensors.has(d.sensor.id));

    // Agrupar por bucket temporal (alinhamento entre sensores)
    const bucketMs = Math.max(1, alignmentBucketSec) * 1000;
    // Anchor buckets to epoch using floor so timestamps in the same interval map consistently
    const grouped = filtered.reduce((acc: any, reading) => {
      const ts = parseToDate(reading.timestamp).getTime();
      const bucketTs = Math.floor(ts / bucketMs) * bucketMs; // floor to bucket start
      const key = String(bucketTs);
      if (!acc[key]) {
        acc[key] = {
          timestampNum: bucketTs,
          displayTime: formatDisplayTime(bucketTs)
        };
      }

      const sensorKey = reading.sensor.serialNumber;
      // Se houver múltiplas leituras do mesmo sensor no mesmo bucket, mantemos a última
      acc[key][`temp_${sensorKey}`] = reading.temperature;
      if (reading.humidity !== null) {
        acc[key][`hum_${sensorKey}`] = reading.humidity;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) => a.timestampNum - b.timestampNum);
  };


  const getCycleBands = () => {
    if (!data?.cycles || data.cycles.length === 0) return [] as Array<{ x1: number; x2: number; label: string; type: string }>;
    const cyclesToShow = selectedCycleId
      ? data.cycles.filter(c => c.id === selectedCycleId)
      : data.cycles;
    return cyclesToShow.map(c => ({
      x1: parseToDate(c.startAt).getTime(),
      x2: parseToDate(c.endAt).getTime(),
      label: `${c.name} (${c.cycleType})`,
      type: c.cycleType
    }));
  };

  const cycleColor = (type: string) => {
    switch (type) {
      case 'CHEIO': return '#10b98133';
      case 'VAZIO': return '#f59e0b33';
      case 'FALTA_ENERGIA': return '#ef444433';
      case 'PORTA_ABERTA': return '#f9731633';
      default: return '#3b82f633';
    }
  };

  const getSensorInfo = () => {
    if (!data || !data.sensorData) return [];

    const sensorMap = new Map();
    data.sensorData.forEach(reading => {
      if (!sensorMap.has(reading.sensor.id)) {
        sensorMap.set(reading.sensor.id, {
          id: reading.sensor.id,
          serialNumber: reading.sensor.serialNumber,
          name: reading.sensor.name
        });
      }
    });

    const sensors = Array.from(sensorMap.values());
    console.log('getSensorInfo() returning', sensors.length, 'sensors:', sensors.map(s => s.serialNumber).join(', '));
    return sensors;
  };

  const handleExport = () => {
    alert('Funcionalidade de exportar imagem será implementada com html2canvas');
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

  const chartData = getChartData();
  const sensors = getSensorInfo();
  const hasHumidity = data.sensorData.some(d => d.humidity !== null);

  return (
    <>
      <PageHeader
        title={`Gráficos - ${data.name}`}
        description={`Validação #${data.validationNumber} - ${data.client.name}`}
        actions={(
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-secondary flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </button>
            <button
              onClick={handleExport}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button
              onClick={() => navigate(`/validations/${id}/details`)}
              className="btn-secondary flex items-center gap-2"
            >
              Ver Dados
            </button>
            <button
              onClick={() => navigate('/validations')}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        )}
      />

      <div className="space-y-6">
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <h3 className="text-lg font-semibold mb-4">Configurações do Gráfico</h3>

            {/* Cycle Filter */}
            {data.cycles && data.cycles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔄 Filtrar por Ciclo
                </label>
                <select
                  value={selectedCycleId}
                  onChange={(e) => setSelectedCycleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">Todos os dados (sem filtro)</option>
                  {data.cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name} ({cycle.cycleType}) - {formatDisplayTime(cycle.startAt)}
                    </option>
                  ))}
                </select>
                {selectedCycleId && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 O período de visualização foi ajustado automaticamente para o ciclo selecionado
                  </p>
                )}
              </div>
            )}

            {/* Date Range */}
            {dateRange && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data/Hora Início
                  </label>
                  <input
                    type="datetime-local"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data/Hora Fim
                  </label>
                  <input
                    type="datetime-local"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}

            {/* Temporal Alignment */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alinhamento Temporal (segundos)
                </label>
                <input
                  type="number"
                  min={1}
                  value={alignmentBucketSec}
                  onChange={(e) => setAlignmentBucketSec(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Agrupa leituras de sensores no mesmo intervalo para alinhar no tempo.</p>
              </div>
            </div>

            {/* Chart Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exibir Gráficos
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showTemperature}
                    onChange={(e) => setShowTemperature(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>Temperatura</span>
                </label>
                {hasHumidity && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showHumidity}
                      onChange={(e) => setShowHumidity(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Umidade</span>
                  </label>
                )}
                {data.cycles && data.cycles.length > 0 && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showCycleBands}
                      onChange={(e) => setShowCycleBands(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Destacar ciclos</span>
                  </label>
                )}
              </div>
              {data.cycles && data.cycles.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Legenda dos ciclos
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {getCycleLegend().map((item) => (
                      <div key={item.type} className="flex items-center gap-2 text-sm">
                        <span className="inline-block w-4 h-4 rounded-sm" style={{ backgroundColor: item.color }}></span>
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Acceptance Criteria Inputs + Save */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Critérios de Aceitação
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Temp Mín (°C)</label>
                  <input
                    type="number"
                    value={data.minTemperature}
                    onChange={(e) => setData(prev => prev ? { ...prev, minTemperature: Number(e.target.value) } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Temp Máx (°C)</label>
                  <input
                    type="number"
                    value={data.maxTemperature}
                    onChange={(e) => setData(prev => prev ? { ...prev, maxTemperature: Number(e.target.value) } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Umid Mín (%RH)</label>
                  <input
                    type="number"
                    value={data.minHumidity ?? 0}
                    onChange={(e) => setData(prev => prev ? { ...prev, minHumidity: Number(e.target.value) } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Umid Máx (%RH)</label>
                  <input
                    type="number"
                    value={data.maxHumidity ?? 100}
                    onChange={(e) => setData(prev => prev ? { ...prev, maxHumidity: Number(e.target.value) } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  disabled={saving}
                  onClick={async () => {
                    if (!data || !data.sensorData) return;
                    if (!window.confirm('Restaurar padrões? Isso resetará zoom, eixos e sensores.')) return;

                    // Recalcular defaults
                    const timestamps = data.sensorData.map((d: SensorReading) => parseToDate(d.timestamp).getTime());
                    const minDate = new Date(Math.min(...timestamps));
                    const maxDate = new Date(Math.max(...timestamps));

                    const temps = data.sensorData.map((d: SensorReading) => d.temperature);

                    // Ajustar limites padrões
                    const tempMinInfo = temps.length > 0 ? Math.floor(Math.min(...temps) - 2) : 0;
                    const tempMaxInfo = temps.length > 0 ? Math.ceil(Math.max(...temps) + 2) : 30;

                    const humidities = data.sensorData
                      .map((d: SensorReading) => d.humidity)
                      .filter((h: number | null) => h !== null) as number[];

                    const defaultY = {
                      tempMin: tempMinInfo,
                      tempMax: tempMaxInfo,
                      tempTick: 5,
                      humMin: humidities.length > 0 ? Math.floor(Math.min(...humidities) - 5) : 0,
                      humMax: humidities.length > 0 ? Math.ceil(Math.max(...humidities) + 5) : 100,
                      humTick: 10
                    };

                    const defaultDates = {
                      start: toLocalDatetimeInput(minDate),
                      end: toLocalDatetimeInput(maxDate)
                    };

                    setYAxisConfig(defaultY);
                    setDateRange(defaultDates);
                    setSelectedCycleId(''); // Limpar ciclo

                    // Resetar sensores para TODOS visíveis
                    const allSensorIds = [...new Set(data.sensorData.map((d: SensorReading) => d.sensor.id))] as string[];
                    setVisibleSensors(new Set(allSensorIds));

                    // Salvar o reset
                      try {
                      setSaving(true);

                      // Salvar sensores (enviando TODOS selecionados = nenhum oculto)
                      await apiService.api.put(`/validations/${id}/sensors/selection`, { selectedSensorIds: allSensorIds });

                      // Salvar config resetada
                      await apiService.api.put(`/validations/${id}/criteria`, {
                        minTemperature: data.minTemperature,
                        maxTemperature: data.maxTemperature,
                        minHumidity: data.minHumidity,
                        maxHumidity: data.maxHumidity,
                        chartConfig: {
                          yAxisConfig: defaultY,
                          dateRange: defaultDates
                        }
                      });
                      alert('Configurações restauradas.');
                    } catch (err) {
                      console.error(err);
                      alert('Erro ao restaurar.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="btn-secondary mr-2"
                >
                  Restaurar Padrão
                </button>
                <button
                  disabled={saving}
                  onClick={async () => {
                    if (!id || !data) return;
                    try {
                      setSaving(true);
                      await apiService.api.put(`/validations/${id}/criteria`, {
                        minTemperature: data.minTemperature,
                        maxTemperature: data.maxTemperature,
                        minHumidity: data.minHumidity,
                        maxHumidity: data.maxHumidity,
                        chartConfig: {
                          yAxisConfig,
                          dateRange
                        }
                      });
                      // Persistir seleção de sensores visíveis
                      const selectedSensorIds = Array.from(visibleSensors);
                      await apiService.api.put(`/validations/${id}/sensors/selection`, { selectedSensorIds });
                      alert('Critérios e seleção de sensores salvos.');
                    } catch (err) {
                      console.error('Erro ao salvar critérios/seleção:', err);
                      alert('Erro ao salvar.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="btn-primary"
                >
                  {saving ? 'Salvando...' : 'Salvar Critérios e Seleção'}
                </button>
              </div>
            </div>

            {/* Sensor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sensores Visíveis
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sensors.map((sensor, idx) => (
                  <label key={sensor.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleSensors.has(sensor.id)}
                      onChange={() => toggleSensor(sensor.id)}
                      className="rounded border-gray-300"
                      style={{ accentColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-sm">{sensor.serialNumber}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Y-Axis Configuration - Temperature */}
            {showTemperature && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eixo Y - Temperatura (°C)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mínimo</label>
                    <input
                      type="number"
                      value={yAxisConfig.tempMin}
                      onChange={(e) => setYAxisConfig({ ...yAxisConfig, tempMin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Máximo</label>
                    <input
                      type="number"
                      value={yAxisConfig.tempMax}
                      onChange={(e) => setYAxisConfig({ ...yAxisConfig, tempMax: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Espaçamento</label>
                    <input
                      type="number"
                      value={yAxisConfig.tempTick}
                      onChange={(e) => setYAxisConfig({ ...yAxisConfig, tempTick: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Y-Axis Configuration - Humidity */}
            {showHumidity && hasHumidity && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eixo Y - Umidade (%RH)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mínimo</label>
                    <input
                      type="number"
                      value={yAxisConfig.humMin}
                      onChange={(e) => setYAxisConfig({ ...yAxisConfig, humMin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Máximo</label>
                    <input
                      type="number"
                      value={yAxisConfig.humMax}
                      onChange={(e) => setYAxisConfig({ ...yAxisConfig, humMax: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Espaçamento</label>
                    <input
                      type="number"
                      value={yAxisConfig.humTick}
                      onChange={(e) => setYAxisConfig({ ...yAxisConfig, humTick: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Temperature Chart */}
        {showTemperature && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Gráfico de Temperatura</h3>
              <button
                onClick={() => window.open(`/validations/${id}/charts/fullscreen?type=temperature`, '_blank')}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Abrir em Nova Janela"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestampNum"
                  type="number"
                  domain={dateRange ? [parseToDate(dateRange.start).getTime(), parseToDate(dateRange.end).getTime()] : ['dataMin', 'dataMax']}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatDisplayTime(value)}
                  interval={0}
                  tickCount={50}
                />
                {showCycleBands && getCycleBands().map((c, idx) => (
                  <ReferenceArea key={`t-area-${idx}`} x1={c.x1} x2={c.x2} y1={yAxisConfig.tempMin} y2={yAxisConfig.tempMax} fill={cycleColor(c.type)} strokeOpacity={0} />
                ))}
                <YAxis
                  domain={[yAxisConfig.tempMin, yAxisConfig.tempMax]}
                  ticks={(function () {
                    const min = yAxisConfig.tempMin;
                    const max = yAxisConfig.tempMax;
                    const step = Math.max(1, yAxisConfig.tempTick);
                    const ticks: number[] = [];
                    for (let v = min; v <= max + 1e-9; v += step) {
                      // evitar acumular erro de ponto flutuante
                      ticks.push(parseFloat(v.toFixed(6)));
                    }
                    return ticks;
                  })()}
                  label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  labelFormatter={(label: any) => formatDisplayTime(label)}
                  formatter={(value: any, name: string) => {
                    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) return ['-', name];
                    const num = Number(value);
                    if (name && name.includes('Temp')) return [`${num.toFixed(2)}°C`, name];
                    if (name && name.includes('Umid')) return [`${num.toFixed(2)}%`, name];
                    // fallback
                    return [typeof value === 'number' ? num.toFixed(2) : String(value), name];
                  }}
                />
                <Legend />

                {/* Reference Lines */}
                <ReferenceLine
                  y={data.minTemperature}
                  stroke="red"
                  strokeDasharray="5 5"
                />
                <ReferenceLine
                  y={data.maxTemperature}
                  stroke="red"
                  strokeDasharray="5 5"
                />

                {/* Lines for each sensor */}
                {sensors.filter(s => visibleSensors.has(s.id)).map((sensor, idx) => (
                  <Line
                    key={sensor.id}
                    type="monotone"
                    dataKey={`temp_${sensor.serialNumber}`}
                    stroke={COLORS[idx % COLORS.length]}
                    name={sensor.name ? `${sensor.name} (Temp)` : `${sensor.serialNumber} (Temp)`}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Humidade Chart (renderiza se houver qualquer dado, independentemente de parâmetros definidos) */}
        {showHumidity && hasHumidity && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Gráfico de Umidade</h3>
              <button
                onClick={() => window.open(`/validations/${id}/charts/fullscreen?type=humidity`, '_blank')}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Abrir em Nova Janela"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestampNum"
                  type="number"
                  domain={dateRange ? [parseToDate(dateRange.start).getTime(), parseToDate(dateRange.end).getTime()] : ['dataMin', 'dataMax']}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatDisplayTime(value)}
                  interval={0}
                  tickCount={50}
                />
                {showCycleBands && getCycleBands().map((c, idx) => (
                  <ReferenceArea key={`h-area-${idx}`} x1={c.x1} x2={c.x2} y1={yAxisConfig.humMin} y2={yAxisConfig.humMax} fill={cycleColor(c.type)} strokeOpacity={0} />
                ))}
                <YAxis
                  domain={[yAxisConfig.humMin, yAxisConfig.humMax]}
                  ticks={(function () {
                    const min = yAxisConfig.humMin;
                    const max = yAxisConfig.humMax;
                    const step = Math.max(1, yAxisConfig.humTick);
                    const ticks: number[] = [];
                    for (let v = min; v <= max + 1e-9; v += step) {
                      ticks.push(parseFloat(v.toFixed(6)));
                    }
                    return ticks;
                  })()}
                  label={{ value: 'Umidade (%RH)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  labelFormatter={(label: any) => formatDisplayTime(label)}
                  formatter={(value: any, name: string) => {
                    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) return ['-', name];
                    const num = Number(value);
                    if (name && name.includes('Temp')) return [`${num.toFixed(2)}°C`, name];
                    if (name && name.includes('Umid')) return [`${num.toFixed(2)}%`, name];
                    return [typeof value === 'number' ? num.toFixed(2) : String(value), name];
                  }}
                />
                <Legend />

                {/* Reference Lines */}
                {data.minHumidity !== null && (
                  <ReferenceLine
                    y={data.minHumidity}
                    stroke="red"
                    strokeDasharray="5 5"
                  />
                )}
                {data.maxHumidity !== null && (
                  <ReferenceLine
                    y={data.maxHumidity}
                    stroke="red"
                    strokeDasharray="5 5"
                  />
                )}

                {/* Lines for each sensor */}
                {sensors.filter(s => visibleSensors.has(s.id)).map((sensor, idx) => (
                  <Line
                    key={sensor.id}
                    type="monotone"
                    dataKey={`hum_${sensor.serialNumber}`}
                    stroke={COLORS[idx % COLORS.length]}
                    name={sensor.name ? `${sensor.name} (Umid)` : `${sensor.serialNumber} (Umid)`}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
};

export default ValidationCharts;
