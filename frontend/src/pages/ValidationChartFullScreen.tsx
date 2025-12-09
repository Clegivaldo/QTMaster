import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea
} from 'recharts';
import { parseToDate, formatDisplayTime } from '@/utils/parseDate';

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

const ValidationChartFullScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') || 'temperature'; // 'temperature' or 'humidity'

    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<ValidationData | null>(null);
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
    const [alignmentBucketSec] = useState<number>(60);

    const cycleColor = (type: string) => {
        switch (type) {
            case 'CHEIO': return '#10b98133';
            case 'VAZIO': return '#f59e0b33';
            case 'FALTA_ENERGIA': return '#ef444433';
            case 'PORTA_ABERTA': return '#f9731633';
            default: return '#3b82f633';
        }
    };

    useEffect(() => {
        if (id) fetchValidation();
    }, [id]);

    const fetchValidation = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/validations/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao buscar dados');

            const result = await response.json();
            const validationData = result.data.validation;
            setData(validationData);

            if (validationData.sensorData && validationData.sensorData.length > 0) {
                // 1. Sensores Visíveis
                const allSensorIds = [...new Set(validationData.sensorData.map((d: SensorReading) => d.sensor.id))] as string[];
                const hiddenSet = new Set(validationData.hiddenSensorIds || []);
                const initialVisible = new Set(allSensorIds.filter(id => !hiddenSet.has(id)));
                setVisibleSensors(initialVisible);

                // 2. Defaults
                const timestamps = validationData.sensorData.map((d: SensorReading) => parseToDate(d.timestamp).getTime());
                const minDate = new Date(Math.min(...timestamps));
                const maxDate = new Date(Math.max(...timestamps));

                let initialDateRange = {
                    start: minDate.toISOString().slice(0, 16),
                    end: maxDate.toISOString().slice(0, 16)
                };

                const temps = validationData.sensorData.map((d: SensorReading) => d.temperature);
                const tempMinInfo = temps.length > 0 ? Math.floor(Math.min(...temps) - 2) : 0;
                const tempMaxInfo = temps.length > 0 ? Math.ceil(Math.max(...temps) + 2) : 30;

                const humidities = validationData.sensorData
                    .map((d: SensorReading) => d.humidity)
                    .filter((h: number | null) => h !== null) as number[];

                let initialYAxis = {
                    tempMin: tempMinInfo,
                    tempMax: tempMaxInfo,
                    tempTick: 5,
                    humMin: humidities.length > 0 ? Math.floor(Math.min(...humidities) - 5) : 0,
                    humMax: humidities.length > 0 ? Math.ceil(Math.max(...humidities) + 5) : 100,
                    humTick: 10
                };

                // 3. Saved Configuration
                if (validationData.chartConfig) {
                    if (validationData.chartConfig.yAxisConfig) {
                        initialYAxis = { ...initialYAxis, ...validationData.chartConfig.yAxisConfig };
                    }
                    if (validationData.chartConfig.dateRange) {
                        initialDateRange = validationData.chartConfig.dateRange;
                    }
                }

                setYAxisConfig(initialYAxis);
                setDateRange(initialDateRange);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getChartData = () => {
        if (!data || !data.sensorData) return [];

        let filtered = data.sensorData;
        if (dateRange) {
            const startTime = parseToDate(dateRange.start).getTime();
            const endTime = parseToDate(dateRange.end).getTime();
            filtered = filtered.filter(d => {
                const time = parseToDate(d.timestamp).getTime();
                return time >= startTime && time <= endTime;
            });
        }

        filtered = filtered.filter(d => visibleSensors.has(d.sensor.id));

        const bucketMs = Math.max(1, alignmentBucketSec) * 1000;
        const grouped = filtered.reduce((acc: any, reading) => {
            const ts = parseToDate(reading.timestamp).getTime();
            const bucketTs = Math.round(ts / bucketMs) * bucketMs;
            const key = String(bucketTs);
            if (!acc[key]) {
                acc[key] = {
                    timestampNum: bucketTs,
                    displayTime: formatDisplayTime(bucketTs)
                };
            }
            const sensorKey = reading.sensor.serialNumber;
            acc[key][`temp_${sensorKey}`] = reading.temperature;
            if (reading.humidity !== null) {
                acc[key][`hum_${sensorKey}`] = reading.humidity;
            }
            return acc;
        }, {} as Record<string, any>);

        return Object.values(grouped).sort((a: any, b: any) => a.timestampNum - b.timestampNum);
    };

    const getSensorInfo = () => {
        if (!data || !data.sensorData) return [];
        const sensorMap = new Map();
        data.sensorData.forEach(reading => {
            if (!sensorMap.has(reading.sensor.id) && visibleSensors.has(reading.sensor.id)) {
                sensorMap.set(reading.sensor.id, {
                    id: reading.sensor.id,
                    serialNumber: reading.sensor.serialNumber
                });
            }
        });
        return Array.from(sensorMap.values());
    };

    const getCycleBands = () => {
        if (!data?.cycles || data.cycles.length === 0) return [];
        return data.cycles.map(c => ({
            x1: formatDisplayTime(c.startAt),
            x2: formatDisplayTime(c.endAt),
            type: c.cycleType
        }));
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
    if (!data) return <div className="text-center p-8">Dados não encontrados</div>;

    const chartData = getChartData();
    const sensors = getSensorInfo();
    const isTemp = type === 'temperature';
    const yMin = isTemp ? yAxisConfig.tempMin : yAxisConfig.humMin;
    const yMax = isTemp ? yAxisConfig.tempMax : yAxisConfig.humMax;
    const yTick = isTemp ? yAxisConfig.tempTick : yAxisConfig.humTick;

    return (
        <div className="h-screen w-screen p-4 bg-white flex flex-col">
            <h2 className="text-xl font-bold text-center mb-2">
                {data.client.name} - Validação #{data.validationNumber} - {isTemp ? 'Temperatura' : 'Umidade'}
            </h2>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
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
                            domain={[yMin, yMax]}
                            ticks={(function () {
                                const ticks: number[] = [];
                                for (let v = yMin; v <= yMax + 1e-9; v += yTick) {
                                    ticks.push(parseFloat(v.toFixed(6)));
                                }
                                return ticks;
                            })()}
                            label={{ value: isTemp ? 'Temp (°C)' : 'Umid (%RH)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend verticalAlign="top" />

                        {/* Ciclos */}
                        {getCycleBands().map((c, idx) => (
                            <ReferenceArea key={`band-${idx}`} x1={c.x1} x2={c.x2} y1={yMin} y2={yMax} fill={cycleColor(c.type)} strokeOpacity={0} />
                        ))}

                        {/* Linhas de Limite */}
                        {isTemp ? (
                            <>
                                <ReferenceLine y={data.minTemperature} stroke="red" strokeDasharray="5 5" label="Min" />
                                <ReferenceLine y={data.maxTemperature} stroke="red" strokeDasharray="5 5" label="Max" />
                            </>
                        ) : (
                            <>
                                {data.minHumidity !== null && <ReferenceLine y={data.minHumidity} stroke="blue" strokeDasharray="5 5" label="Min" />}
                                {data.maxHumidity !== null && <ReferenceLine y={data.maxHumidity} stroke="blue" strokeDasharray="5 5" label="Max" />}
                            </>
                        )}

                        {/* Linhas de Dados */}
                        {sensors.map((sensor, index) => (
                            <Line
                                key={sensor.id}
                                type="monotone"
                                dataKey={`${isTemp ? 'temp' : 'hum'}_${sensor.serialNumber}`}
                                name={sensor.serialNumber}
                                stroke={COLORS[index % COLORS.length]}
                                dot={false}
                                strokeWidth={2}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ValidationChartFullScreen;
