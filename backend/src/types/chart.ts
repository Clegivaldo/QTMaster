export interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
}

export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

export interface ChartOptions {
    responsive?: boolean;
    plugins?: {
        legend?: {
            position?: 'top' | 'left' | 'bottom' | 'right';
            display?: boolean;
        };
        title?: {
            display?: boolean;
            text?: string;
        };
    };
    scales?: {
        y?: {
            beginAtZero?: boolean;
        };
    };
}

export interface ChartConfig {
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    data: ChartData;
    options?: ChartOptions;
    width?: number;
    height?: number;
}
