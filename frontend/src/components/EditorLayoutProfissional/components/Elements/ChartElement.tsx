import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartElement as ChartElementType } from '../../../../types/editor';

interface ChartElementProps {
    element: ChartElementType;
    isSelected: boolean;
    zoom: number;
}

const ChartElement: React.FC<ChartElementProps> = ({
    element,
    isSelected,
    zoom: _zoom
}) => {
    // Build chart data from element content if available
    // Expecting element.content.chartData to follow the shape used elsewhere in the app:
    // [{ sensorId, serialNumber, data: [{ timestamp, temperature, humidity, ... }, ...] }, ...]
    const COLORS = element.properties?.colors && element.properties.colors.length > 0
        ? element.properties.colors
        : ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const xKey = element.properties?.xAxis || 'timestamp';
    const yField = Array.isArray(element.properties?.yAxis) ? element.properties?.yAxis[0] : element.properties?.yAxis;

    let transformedData: any[] = [];
    let seriesKeys: string[] = [];

    try {
        const chartData = (element.content && (element.content as any).chartData) || null;

        if (Array.isArray(chartData) && chartData.length > 0 && yField) {
            // chartData: ChartSensorData[]
            // Create a map keyed by x (timestamp/cycle) and collect series values
            const map = new Map<string, any>();
            chartData.forEach((sensor: any, sensorIndex: number) => {
                const seriesName = sensor.serialNumber || sensor.sensorId || `series-${sensorIndex}`;
                if (!seriesKeys.includes(seriesName)) seriesKeys.push(seriesName);

                (sensor.data || []).forEach((pt: any) => {
                    const key = String(pt[xKey] ?? pt.timestamp ?? sensorIndex);
                    if (!map.has(key)) map.set(key, { name: key });
                    const entry = map.get(key);
                    entry[seriesName] = pt[yField];
                    // Also keep an x label if possible (timestamp as human-readable)
                    if (!entry.name || entry.name === key) {
                        entry.name = (pt[xKey] && String(pt[xKey])) || (pt.timestamp && String(pt.timestamp)) || key;
                    }
                    map.set(key, entry);
                });
            });

            transformedData = Array.from(map.values()).sort((a: any, b: any) => {
                // try to sort by ISO timestamp if possible
                const ta = a.name;
                const tb = b.name;
                const da = Date.parse(ta);
                const db = Date.parse(tb);
                if (!isNaN(da) && !isNaN(db)) return da - db;
                return ('' + a.name).localeCompare(b.name);
            });
        }
    } catch (err) {
        // fallback to empty transformedData
        transformedData = [];
        seriesKeys = [];
    }

    const LegendLineRenderer = (props: any) => {
        const { payload } = props || {};
        if (!payload || !Array.isArray(payload)) return null;
        return (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 8 }}>
                {payload.map((entry: any, idx: number) => (
                    <div key={(entry && entry.value) || idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <svg width="36" height="14" viewBox="0 0 36 14" aria-hidden>
                            <line x1="0" y1="7" x2="36" y2="7" stroke={entry.color} strokeWidth={3} strokeLinecap="round" />
                        </svg>
                        <span style={{ color: '#333' }}>{entry && entry.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderChart = () => {
        const chartType = element.properties?.chartType || 'bar';

        // If we have transformed data and seriesKeys, render multi-series chart
        if (transformedData.length > 0 && seriesKeys.length > 0 && yField) {
            switch (chartType) {
                case 'line':
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={transformedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend content={LegendLineRenderer} />
                                {seriesKeys.map((key, i) => (
                                    <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} dot={false} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    );
                case 'pie':
                    // For pie, show first series aggregated
                    const pieData = seriesKeys.map((key, i) => ({ name: key, value: transformedData.reduce((s, r) => s + (Number(r[key] || 0)), 0) }));
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend content={LegendLineRenderer} />
                            </PieChart>
                        </ResponsiveContainer>
                    );
                case 'bar':
                default:
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={transformedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend content={LegendLineRenderer} />
                                {seriesKeys.map((key, i) => (
                                    <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    );
            }
        }

        // Fallback placeholder if no data is available
        const placeholder = [
            { name: 'Jan', value: 400 },
            { name: 'Feb', value: 300 },
            { name: 'Mar', value: 600 }
        ];

        switch (chartType) {
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={placeholder}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend content={LegendLineRenderer} />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={placeholder} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">
                                {placeholder.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend content={LegendLineRenderer} />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'bar':
            default:
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={placeholder}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                );
        }
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-white">
            {renderChart()}
            {/* Overlay to prevent interaction with chart when selecting element */}
            <div className="absolute inset-0 z-10" />
        </div>
    );
};

export default ChartElement;
