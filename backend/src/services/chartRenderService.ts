import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { createCanvas } from 'canvas';
import { ChartConfig } from '../types/chart.js';

// Register Chart.js components
Chart.register(...registerables);

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
