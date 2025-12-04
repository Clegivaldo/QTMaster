interface TemplateData {
    client: {
        name: string;
        document?: string;
        email?: string;
        phone?: string;
        address?: string;
        cnpj?: string;
    };
    validation: {
        id: string;
        name?: string;
        startDate: Date;
        endDate: Date;
        temperatureStats: {
            min: number;
            max: number;
            avg: number;
        };
        humidityStats?: {
            min: number;
            max: number;
            avg: number;
        };
    };
    sensors: Array<{
        id: string;
        name?: string;
        serialNumber: string;
        model: string;
    }>;
    sensorData: Array<{
        timestamp: Date;
        temperature: number;
        humidity?: number;
        sensorId: string;
    }>;
    report: {
        generatedAt: Date;
        generatedBy: string;
    };
}

export class SampleDataGenerator {
    /**
     * Generate complete sample validation data
     */
    generateValidationData(): TemplateData {
        const now = new Date();
        const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

        return {
            client: {
                name: 'Empresa Exemplo LTDA',
                document: '12.345.678/0001-90',
                email: 'contato@exemplo.com.br',
                phone: '+55 11 98765-4321',
                address: 'Rua Exemplo, 123 - São Paulo, SP',
                cnpj: '12.345.678/0001-90'
            },
            validation: {
                id: 'VAL-2024-001',
                name: 'Validação de Temperatura - Câmara Fria',
                startDate: startDate,
                endDate: now,
                temperatureStats: {
                    min: 2.1,
                    max: 8.3,
                    avg: 5.2
                },
                humidityStats: {
                    min: 45.2,
                    max: 65.8,
                    avg: 55.5
                }
            },
            sensors: [
                {
                    id: 'sensor-001',
                    name: 'Sensor Principal',
                    serialNumber: 'SN-2024-001',
                    model: 'TempTrack Pro'
                },
                {
                    id: 'sensor-002',
                    name: 'Sensor Backup',
                    serialNumber: 'SN-2024-002',
                    model: 'TempTrack Pro'
                }
            ],
            sensorData: this.generateSensorData(168, ['sensor-001', 'sensor-002']), // 7 days of hourly readings
            report: {
                generatedAt: now,
                generatedBy: 'Sistema QT-Master'
            }
        };
    }

    /**
     * Generate sensor data readings
     */
    generateSensorData(
        count: number,
        sensorIds: string[] = ['sensor-001']
    ): Array<{
        timestamp: Date;
        temperature: number;
        humidity?: number;
        sensorId: string;
    }> {
        const readings: any[] = [];
        const now = new Date();
        const baseTemp = 5.0; // Base temperature
        const baseHumidity = 55.0; // Base humidity

        for (let i = 0; i < count; i++) {
            for (const sensorId of sensorIds) {
                // Create variation around base values
                const tempVariation = (Math.random() - 0.5) * 3; // ±1.5°C variation
                const humidityVariation = (Math.random() - 0.5) * 10; // ±5% variation

                // Add some trend over time
                const trend = Math.sin(i / 24) * 1.5; // Daily cycle

                readings.push({
                    timestamp: new Date(now.getTime() - (count - i) * 60 * 60 * 1000), // Hourly intervals
                    temperature: Number((baseTemp + tempVariation + trend).toFixed(1)),
                    humidity: Number((baseHumidity + humidityVariation).toFixed(1)),
                    sensorId
                });
            }
        }

        return readings;
    }

    /**
     * Generate custom data based on schema
     */
    generateCustomData(schema: any): any {
        // Simple implementation - can be expanded
        const data: any = {};

        for (const [key, type] of Object.entries(schema)) {
            switch (type) {
                case 'string':
                    data[key] = `Sample ${key}`;
                    break;
                case 'number':
                    data[key] = Math.random() * 100;
                    break;
                case 'date':
                    data[key] = new Date();
                    break;
                case 'boolean':
                    data[key] = Math.random() > 0.5;
                    break;
                case 'array':
                    data[key] = [this.generateCustomData({ item: 'string' })];
                    break;
                default:
                    data[key] = null;
            }
        }

        return data;
    }

    /**
     * Get minimal sample data for quick testing
     */
    getMinimalData(): Partial<TemplateData> {
        return {
            client: {
                name: 'Empresa Teste',
                email: 'teste@exemplo.com'
            },
            validation: {
                id: 'VAL-TEST',
                startDate: new Date(),
                endDate: new Date(),
                temperatureStats: {
                    min: 2.0,
                    max: 8.0,
                    avg: 5.0
                }
            },
            sensorData: this.generateSensorData(24, ['sensor-001']), // 24 hours
            report: {
                generatedAt: new Date(),
                generatedBy: 'Test User'
            }
        };
    }
}

export const sampleDataGenerator = new SampleDataGenerator();
