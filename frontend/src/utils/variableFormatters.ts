import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FormatterFunction = (value: any, ...args: any[]) => string;

export const formatters: Record<string, FormatterFunction> = {
    /**
     * Format date using date-fns format string
     * Usage: {{date | date : dd/MM/yyyy}}
     */
    date: (value: any, formatStr: string = 'dd/MM/yyyy HH:mm') => {
        if (!value) return '';
        try {
            const date = typeof value === 'string' ? new Date(value) : value;
            if (isNaN(date.getTime())) return String(value);
            return format(date, formatStr, { locale: ptBR });
        } catch (e) {
            return String(value);
        }
    },

    /**
     * Format number with specified decimals
     * Usage: {{value | number : 2}}
     */
    number: (value: any, decimals: number = 2) => {
        if (value === null || value === undefined) return '';
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: Number(decimals),
            maximumFractionDigits: Number(decimals)
        }).format(num);
    },

    /**
     * Format currency
     * Usage: {{value | currency : BRL}}
     */
    currency: (value: any, currencyCode: string = 'BRL') => {
        if (value === null || value === undefined) return '';
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currencyCode
        }).format(num);
    },

    /**
     * Format percentage
     * Usage: {{value | percent : 2}}
     */
    percent: (value: any, decimals: number = 2) => {
        if (value === null || value === undefined) return '';
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return new Intl.NumberFormat('pt-BR', {
            style: 'percent',
            minimumFractionDigits: Number(decimals),
            maximumFractionDigits: Number(decimals)
        }).format(num / 100);
    },

    /**
     * Convert to uppercase
     * Usage: {{text | uppercase}}
     */
    uppercase: (value: any) => {
        if (!value) return '';
        return String(value).toUpperCase();
    },

    /**
     * Convert to lowercase
     * Usage: {{text | lowercase}}
     */
    lowercase: (value: any) => {
        if (!value) return '';
        return String(value).toLowerCase();
    }
};

/**
 * Parse and format a value string with pipes
 * Example: "value | date : dd/MM/yyyy"
 */
export function formatValue(value: any, expression: string): string {
    const parts = expression.split('|').map(p => p.trim());

    // First part is the value (already resolved before calling this, usually)
    // But here we assume 'value' is the resolved data, and 'expression' contains the formatters
    // Actually, the expression usually includes the variable name too, e.g. "myVar | date"
    // But this function receives the resolved value and the pipe part.

    // Let's assume this function is called with the resolved value and the formatter string
    // e.g. formatValue(new Date(), "date : dd/MM/yyyy | uppercase")

    if (!expression) return String(value);

    const pipeParts = expression.split('|').map(p => p.trim());

    // If the first part was the variable name, it should have been handled by the caller to resolve 'value'.
    // We process the formatters (all parts)

    let result = value;

    for (const part of pipeParts) {
        if (!part) continue;

        const [formatterName, ...argsStr] = part.split(':').map(p => p.trim());
        const formatter = formatters[formatterName];

        if (formatter) {
            // Parse args (simple string or number parsing)
            const args = argsStr.map(arg => {
                const num = Number(arg);
                return isNaN(num) ? arg : num;
            });

            result = formatter(result, ...args);
        }
    }

    return String(result);
}

/**
 * Process a text containing {{variable | format}} expressions
 */
export function processDynamicText(text: string, data: any): string {
    const variablePattern = /\{\{([^}]+)\}\}/g;

    return text.replace(variablePattern, (match, content) => {
        const parts = content.split('|');
        const variablePath = parts[0].trim();
        const formattersStr = parts.slice(1).join('|');

        const value = resolveDataPath(variablePath, data);

        if (value === undefined || value === null) {
            return '';
        }

        if (formattersStr) {
            return formatValue(value, formattersStr);
        }

        return String(value);
    });
}

function resolveDataPath(path: string, data: any): any {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}
