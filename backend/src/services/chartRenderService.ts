import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { createCanvas } from 'canvas';
import { ChartConfig } from '../types/chart.js';

import annotationPlugin from 'chartjs-plugin-annotation';

// Register Chart.js components
Chart.register(...registerables, annotationPlugin);

export class ChartRenderService {
    /**
     * Renders a chart to a PNG buffer
     * @param config Chart configuration
     * @returns Buffer containing the PNG image
     */
    public async renderChart(config: ChartConfig): Promise<Buffer> {
        const width = config.width || 800;
        const height = config.height || 400;

        // Create a virtual canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Chart.js configuration
        const chartConfig: ChartConfiguration = {
            type: config.type,
            data: config.data,
            options: {
                ...config.options,
                responsive: false,
                animation: false,
                devicePixelRatio: 2, // High resolution
            },
            plugins: [{
                id: 'background-colour',
                beforeDraw: (chart) => {
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                    ctx.restore();
                }
            }]
        };

        // If caller requested legend drawn as lines (more readable for sensors), add a small plugin
        // and disable the default legend to avoid duplicate information.
        const legendAsLines = !!(config.options && config.options.customLegendAsLines);
        if (legendAsLines) {
            // Disable default legend
            if (!chartConfig.options) chartConfig.options = {} as any;
            if (!chartConfig.options.plugins) chartConfig.options.plugins = {} as any;
            chartConfig.options.plugins.legend = { display: false } as any;

            // Add plugin that draws a simple line legend on top-right corner
            const lineLegendPlugin = {
                id: 'line-legend-plugin',
                afterDraw: (chart: any) => {
                    try {
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.font = '12px Arial';
                        ctx.fillStyle = '#222';
                        const padding = 8;
                        let x = chart.width - 10;
                        let y = padding;

                        // compute starting x by measuring widest label
                        const labels = (chart.data && chart.data.datasets) ? chart.data.datasets.map((d: any) => String(d.label || '')) : [];
                        const maxLabelWidth = Math.max(...labels.map((l: string) => ctx.measureText(l).width), 0);
                        x = chart.width - (120 + maxLabelWidth);

                        (chart.data.datasets || []).forEach((ds: any, idx: number) => {
                            const lineW = (ds.borderWidth && typeof ds.borderWidth === 'number') ? ds.borderWidth : (config.options?.legend?.lineWidth || 3);
                            const stroke = ds.borderColor || ds.backgroundColor || '#000';

                            ctx.beginPath();
                            ctx.lineWidth = lineW;
                            ctx.strokeStyle = stroke;
                            ctx.moveTo(x + 10, y + 6);
                            ctx.lineTo(x + 40, y + 6);
                            ctx.stroke();

                            ctx.fillStyle = '#222';
                            ctx.fillText(String(ds.label || ''), x + 48, y + 10);

                            y += 18;
                        });
                        ctx.restore();
                    } catch (err) {
                        // swallow any drawing errors to avoid breaking chart render
                    }
                }
            };

            (chartConfig.plugins as any[]).push(lineLegendPlugin);
        }

        // Render the chart
        // @ts-ignore - Chart.js types with node-canvas can be tricky
        const chart = new Chart(ctx as any, chartConfig);

        // Convert to buffer
        const buffer = canvas.toBuffer('image/png');

        // Destroy chart instance to free memory
        chart.destroy();

        return buffer;
    }

    /**
     * Generates a base64 string of the rendered chart
     * @param config Chart configuration
     * @returns Base64 string of the PNG image
     */
    public async renderChartToBase64(config: ChartConfig): Promise<string> {
        const buffer = await this.renderChart(config);
        return `data:image/png;base64,${buffer.toString('base64')}`;
    }
}

export const chartRenderService = new ChartRenderService();
