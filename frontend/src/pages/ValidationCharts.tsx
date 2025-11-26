import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Settings, Calendar } from 'lucide-react';
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
} from 'recharts';
import PageHeader from '@/components/Layout/PageHeader';

interface SensorReading {
  timestamp: string;
  temperature: number;
  humidity: number | null;
  sensor: {
    id: string;
    serialNumber: string;
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
  sensorData: SensorReading[];
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
  const [yAxisConfig, setYAxisConfig] = useState({
    tempMin: 0,
    tempMax: 30,
    tempTick: 5,
    humMin: 0,
    humMax: 100,
    humTick: 10
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (id) {
      fetchValidation();
    }
  }, [id]);

  const fetchValidation = async () => {
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
      setData(validationData);

      // Inicializar sensores visíveis
      if (validationData.sensorData && validationData.sensorData.length > 0) {
        const sensorIds = [...new Set(validationData.sensorData.map((d: SensorReading) => d.sensor.id))];
        setVisibleSensors(new Set(sensorIds));
        
        // Calcular range de datas
        const timestamps = validationData.sensorData.map((d: SensorReading) => new Date(d.timestamp).getTime());
        const minDate = new Date(Math.min(...timestamps));
        const maxDate = new Date(Math.max(...timestamps));
        setDateRange({
          start: minDate.toISOString().slice(0, 16),
          end: maxDate.toISOString().slice(0, 16)
        });
        
        // Auto-ajustar eixo Y baseado nos dados
        const temps = validationData.sensorData.map((d: SensorReading) => d.temperature);
        const tempMin = Math.floor(Math.min(...temps) - 2);
        const tempMax = Math.ceil(Math.max(...temps) + 2);
        
        const humidities = validationData.sensorData
          .map((d: SensorReading) => d.humidity)
          .filter((h: number | null) => h !== null) as number[];
        
        setYAxisConfig(prev => ({
          ...prev,
          tempMin,
          tempMax,
          humMin: humidities.length > 0 ? Math.floor(Math.min(...humidities) - 5) : 0,
          humMax: humidities.length > 0 ? Math.ceil(Math.max(...humidities) + 5) : 100
        }));
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
      const startTime = new Date(dateRange.start).getTime();
      const endTime = new Date(dateRange.end).getTime();
      filtered = filtered.filter(d => {
        const time = new Date(d.timestamp).getTime();
        return time >= startTime && time <= endTime;
      });
    }

    // Filtrar por sensores visíveis
    filtered = filtered.filter(d => visibleSensors.has(d.sensor.id));

    // Agrupar por timestamp
    const grouped = filtered.reduce((acc: any, reading) => {
      const timestamp = new Date(reading.timestamp).toISOString();
      if (!acc[timestamp]) {
        acc[timestamp] = {
          timestamp,
          displayTime: new Date(reading.timestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      }
      
      const sensorKey = reading.sensor.serialNumber;
      acc[timestamp][`temp_${sensorKey}`] = reading.temperature;
      if (reading.humidity !== null) {
        acc[timestamp][`hum_${sensorKey}`] = reading.humidity;
      }
      
      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const getSensorInfo = () => {
    if (!data || !data.sensorData) return [];
    
    const sensorMap = new Map();
    data.sensorData.forEach(reading => {
      if (!sensorMap.has(reading.sensor.id)) {
        sensorMap.set(reading.sensor.id, {
          id: reading.sensor.id,
          serialNumber: reading.sensor.serialNumber
        });
      }
    });
    
    return Array.from(sensorMap.values());
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
      >
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
      </PageHeader>

      <div className="space-y-6">
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <h3 className="text-lg font-semibold mb-4">Configurações do Gráfico</h3>
            
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
            <h3 className="text-lg font-semibold mb-4">Gráfico de Temperatura</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="displayTime" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  domain={[yAxisConfig.tempMin, yAxisConfig.tempMax]}
                  ticks={Array.from(
                    { length: Math.floor((yAxisConfig.tempMax - yAxisConfig.tempMin) / yAxisConfig.tempTick) + 1 },
                    (_, i) => yAxisConfig.tempMin + i * yAxisConfig.tempTick
                  )}
                  label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                
                {/* Reference Lines */}
                <ReferenceLine 
                  y={data.minTemperature} 
                  stroke="red" 
                  strokeDasharray="5 5" 
                  label={{ value: `Min: ${data.minTemperature}°C`, position: 'right' }}
                />
                <ReferenceLine 
                  y={data.maxTemperature} 
                  stroke="red" 
                  strokeDasharray="5 5" 
                  label={{ value: `Max: ${data.maxTemperature}°C`, position: 'right' }}
                />
                
                {/* Lines for each sensor */}
                {sensors.filter(s => visibleSensors.has(s.id)).map((sensor, idx) => (
                  <Line
                    key={sensor.id}
                    type="monotone"
                    dataKey={`temp_${sensor.serialNumber}`}
                    stroke={COLORS[idx % COLORS.length]}
                    name={`${sensor.serialNumber} (Temp)`}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Humidity Chart */}
        {showHumidity && hasHumidity && data.minHumidity !== null && data.maxHumidity !== null && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Gráfico de Umidade</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="displayTime" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  domain={[yAxisConfig.humMin, yAxisConfig.humMax]}
                  ticks={Array.from(
                    { length: Math.floor((yAxisConfig.humMax - yAxisConfig.humMin) / yAxisConfig.humTick) + 1 },
                    (_, i) => yAxisConfig.humMin + i * yAxisConfig.humTick
                  )}
                  label={{ value: 'Umidade (%RH)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                
                {/* Reference Lines */}
                <ReferenceLine 
                  y={data.minHumidity} 
                  stroke="red" 
                  strokeDasharray="5 5" 
                  label={{ value: `Min: ${data.minHumidity}%`, position: 'right' }}
                />
                <ReferenceLine 
                  y={data.maxHumidity} 
                  stroke="red" 
                  strokeDasharray="5 5" 
                  label={{ value: `Max: ${data.maxHumidity}%`, position: 'right' }}
                />
                
                {/* Lines for each sensor */}
                {sensors.filter(s => visibleSensors.has(s.id)).map((sensor, idx) => (
                  <Line
                    key={sensor.id}
                    type="monotone"
                    dataKey={`hum_${sensor.serialNumber}`}
                    stroke={COLORS[idx % COLORS.length]}
                    name={`${sensor.serialNumber} (Umid)`}
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
