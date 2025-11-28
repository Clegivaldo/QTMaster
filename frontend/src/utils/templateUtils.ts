/**
 * Template utilities for dynamic text rendering
 * Supports variable syntax: {{path.to.value}}
 */

export interface TemplateVariable {
    name: string;
    path: string;
    position: { start: number; end: number };
}

export interface ValidationData {
    id: string;
    startDate: Date | string;
    endDate: Date | string;
    temperatureStats?: {
        avg: number;
        min: number;
        max: number;
    };
    humidityStats?: {
        avg: number;
        min: number;
        max: number;
    };
}

export interface TemplateData {
    client?: {
        name: string;
        document?: string;
        email?: string;
        phone?: string;
    };
    validation?: ValidationData;
    sensors?: Array<{
        serialNumber: string;
        name?: string;
        model: string;
    }>;
    report?: {
        generatedAt: Date | string;
        generatedBy?: string;
    };
}

/**
 * Parse template variables from text
 * Extracts all {{variable}} placeholders
 */
export function parseTemplateVariables(text: string): TemplateVariable[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: TemplateVariable[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        variables.push({
            name: match[1].trim(),
            path: match[1].trim(),
            position: {
                start: match.index,
                end: match.index + match[0].length,
            },
        });
    }

    return variables;
}

/**
 * Get value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
        return current?.[key];
    }, obj);
}

/**
 * Format value based on type
 */
function formatValue(value: any): string {
    if (value === null || value === undefined) {
        return '';
    }

    if (value instanceof Date) {
        return value.toLocaleDateString('pt-BR');
    }

    if (typeof value === 'number') {
        // Check if it's a decimal number (temperature, humidity, etc.)
        if (!Number.isInteger(value)) {
            return value.toFixed(2);
        }
        return value.toString();
    }

    if (typeof value === 'boolean') {
        return value ? 'Sim' : 'Não';
    }

    if (Array.isArray(value)) {
        return value.length.toString();
    }

    return String(value);
}

/**
 * Render template by replacing variables with actual data
 */
export function renderTemplate(text: string, data: TemplateData): string {
    if (!text) return '';

    const variables = parseTemplateVariables(text);
    let result = text;

    // Replace variables in reverse order to maintain correct positions
    for (let i = variables.length - 1; i >= 0; i--) {
        const variable = variables[i];
        const value = getNestedValue(data, variable.path);
        const formattedValue = formatValue(value);

        result =
            result.substring(0, variable.position.start) +
            formattedValue +
            result.substring(variable.position.end);
    }

    return result;
}

/**
 * Get list of available template variables
 */
export function getAvailableVariables(): Array<{
    category: string;
    label: string;
    variables: Array<{ path: string; description: string; example: string }>;
}> {
    return [
        {
            category: 'client',
            label: 'Cliente',
            variables: [
                { path: 'client.name', description: 'Nome do cliente', example: 'Empresa XYZ' },
                { path: 'client.document', description: 'CNPJ/CPF', example: '12.345.678/0001-90' },
                { path: 'client.email', description: 'E-mail', example: 'contato@empresa.com' },
                { path: 'client.phone', description: 'Telefone', example: '(11) 98765-4321' },
            ],
        },
        {
            category: 'validation',
            label: 'Validação',
            variables: [
                { path: 'validation.id', description: 'ID da Validação', example: 'VAL-2024-001' },
                { path: 'validation.startDate', description: 'Data de Início', example: '01/01/2024' },
                { path: 'validation.endDate', description: 'Data de Fim', example: '31/01/2024' },
                {
                    path: 'validation.temperatureStats.avg',
                    description: 'Temperatura Média',
                    example: '22.5',
                },
                {
                    path: 'validation.temperatureStats.min',
                    description: 'Temperatura Mínima',
                    example: '18.0',
                },
                {
                    path: 'validation.temperatureStats.max',
                    description: 'Temperatura Máxima',
                    example: '27.0',
                },
                {
                    path: 'validation.humidityStats.avg',
                    description: 'Umidade Média',
                    example: '65.5',
                },
                {
                    path: 'validation.humidityStats.min',
                    description: 'Umidade Mínima',
                    example: '50.0',
                },
                {
                    path: 'validation.humidityStats.max',
                    description: 'Umidade Máxima',
                    example: '80.0',
                },
            ],
        },
        {
            category: 'sensors',
            label: 'Sensores',
            variables: [
                { path: 'sensors.length', description: 'Quantidade de Sensores', example: '3' },
            ],
        },
        {
            category: 'report',
            label: 'Relatório',
            variables: [
                {
                    path: 'report.generatedAt',
                    description: 'Data de Geração',
                    example: '28/11/2024',
                },
                {
                    path: 'report.generatedBy',
                    description: 'Gerado por',
                    example: 'João Silva',
                },
            ],
        },
    ];
}

/**
 * Validate if a variable path is valid
 */
export function validateVariable(variable: string): boolean {
    const allVariables = getAvailableVariables();
    const validPaths = allVariables.flatMap((cat) =>
        cat.variables.map((v) => v.path)
    );

    return validPaths.includes(variable);
}

/**
 * Check if text contains any template variables
 */
export function hasTemplateVariables(text: string): boolean {
    return /\{\{[^}]+\}\}/.test(text);
}
