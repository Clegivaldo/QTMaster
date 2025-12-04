import { logger } from '../utils/logger.js';

export interface ValidationIssue {
    type: 'error' | 'warning' | 'info';
    elementId?: string;
    elementType?: string;
    field?: string;
    message: string;
    suggestion?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    testedAt: Date;
    metadata: {
        elementCount: number;
        variableCount: number;
        chartCount: number;
        tableCount: number;
        dynamicTextCount: number;
    };
}

export interface TestResult extends ValidationResult {
    renderedHTML?: string;
    pdfBuffer?: Buffer;
    renderTime?: number;
}

interface EditorElement {
    id: string;
    type: string;
    content?: any;
    properties?: any;
    chartConfig?: any;
    tableConfig?: any;
}

interface TemplateData {
    client?: any;
    validation?: any;
    sensors?: any[];
    sensorData?: any[];
    report?: any;
    [key: string]: any;
}

export class TemplateValidationService {
    /**
     * Validate template structure and configuration
     */
    async validateTemplate(
        elements: EditorElement[],
        availableData?: TemplateData
    ): Promise<ValidationResult> {
        const startTime = Date.now();
        const issues: ValidationIssue[] = [];

        try {
            // Count elements
            const metadata = {
                elementCount: elements.length,
                variableCount: 0,
                chartCount: 0,
                tableCount: 0,
                dynamicTextCount: 0
            };

            // Validate each element
            for (const element of elements) {
                // Count element types
                if (element.type === 'chart') metadata.chartCount++;
                if (element.type === 'table') metadata.tableCount++;
                if (element.properties?.isDynamic) metadata.dynamicTextCount++;

                // Validate based on type
                switch (element.type) {
                    case 'text':
                    case 'heading':
                        issues.push(...this.validateTextElement(element, availableData));
                        break;
                    case 'chart':
                        issues.push(...this.validateChartElement(element, availableData));
                        break;
                    case 'table':
                        issues.push(...this.validateTableElement(element, availableData));
                        break;
                }
            }

            // Count variables
            metadata.variableCount = this.countVariables(elements);

            // Check for common issues
            issues.push(...this.validateGlobalIssues(elements));

            const isValid = !issues.some(i => i.type === 'error');

            logger.info('Template validation completed', {
                elementCount: metadata.elementCount,
                issueCount: issues.length,
                validationTime: Date.now() - startTime
            });

            return {
                isValid,
                issues: this.sortIssues(issues),
                testedAt: new Date(),
                metadata
            };
        } catch (error) {
            logger.error('Template validation failed', { error });
            return {
                isValid: false,
                issues: [{
                    type: 'error',
                    message: 'Validation failed due to internal error',
                    suggestion: 'Please contact support if this persists',
                    severity: 'critical'
                }],
                testedAt: new Date(),
                metadata: {
                    elementCount: 0,
                    variableCount: 0,
                    chartCount: 0,
                    tableCount: 0,
                    dynamicTextCount: 0
                }
            };
        }
    }

    /**
     * Validate text element with dynamic variables
     */
    private validateTextElement(
        element: EditorElement,
        availableData?: TemplateData
    ): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        if (!element.properties?.isDynamic) {
            return issues;
        }

        const content = element.content || '';
        const variablePattern = /\{\{([^}|]+)(?:\|([^}]+))?\}\}/g;
        let match;

        while ((match = variablePattern.exec(content)) !== null) {
            const [fullMatch, variablePath, formatter] = match as [string, string | undefined, string | undefined];
            const trimmedPath = (variablePath || '').trim();
            const trimmedFormatter = formatter?.trim();

            // Check if variable path is valid
            if (availableData && !this.isValidPath(trimmedPath, availableData)) {
                issues.push({
                    type: 'error',
                    elementId: element.id,
                    elementType: element.type,
                    field: 'content',
                    message: `Variable "${trimmedPath}" not found in available data`,
                    suggestion: `Check if the variable path is correct. Available paths depend on your data structure.`,
                    severity: 'high'
                });
            }

            // Validate formatter if present
            if (trimmedFormatter) {
                const validFormatters = [
                    'formatDate',
                    'formatDateTime',
                    'formatCurrency',
                    'formatTemperature',
                    'formatHumidity',
                    'uppercase'
                ];

                if (!validFormatters.includes(trimmedFormatter)) {
                    issues.push({
                        type: 'warning',
                        elementId: element.id,
                        elementType: element.type,
                        field: 'formatter',
                        message: `Unknown formatter "${trimmedFormatter}"`,
                        suggestion: `Valid formatters: ${validFormatters.join(', ')}`,
                        severity: 'medium'
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Validate chart element configuration
     */
    private validateChartElement(
        element: EditorElement,
        availableData?: TemplateData
    ): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const chartConfig = element.content || {};

        // Check chart type
        const validTypes = ['line', 'bar', 'pie', 'doughnut', 'radar', 'scatter', 'area'];
        if (!chartConfig.chartType || !validTypes.includes(chartConfig.chartType)) {
            issues.push({
                type: 'error',
                elementId: element.id,
                elementType: 'chart',
                field: 'chartType',
                message: 'Invalid or missing chart type',
                suggestion: `Valid types: ${validTypes.join(', ')}`,
                severity: 'high'
            });
        }

        // Check data source
        if (!chartConfig.dataSource) {
            issues.push({
                type: 'warning',
                elementId: element.id,
                elementType: 'chart',
                field: 'dataSource',
                message: 'No data source configured for chart',
                suggestion: 'Configure a data source to populate the chart',
                severity: 'medium'
            });
        } else if (availableData) {
            const dataSourceType = chartConfig.dataSource.type;
            if (dataSourceType === 'sensorData' && (!availableData.sensorData || availableData.sensorData.length === 0)) {
                issues.push({
                    type: 'warning',
                    elementId: element.id,
                    elementType: 'chart',
                    field: 'dataSource',
                    message: 'Chart data source references sensorData but no sensor data is available',
                    suggestion: 'Ensure sensor data is available when rendering',
                    severity: 'medium'
                });
            }
        }

        return issues;
    }

    /**
     * Validate table element configuration
     */
    private validateTableElement(
        element: EditorElement,
        availableData?: TemplateData
    ): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const tableConfig = element.content || {};

        // Check data source
        if (!tableConfig.dataSource) {
            issues.push({
                type: 'error',
                elementId: element.id,
                elementType: 'table',
                field: 'dataSource',
                message: 'No data source configured for table',
                suggestion: 'Configure a data source to populate the table',
                severity: 'high'
            });
        }

        // Check columns
        if (!tableConfig.columns || tableConfig.columns.length === 0) {
            issues.push({
                type: 'error',
                elementId: element.id,
                elementType: 'table',
                field: 'columns',
                message: 'Table has no columns defined',
                suggestion: 'Add at least one column to the table',
                severity: 'high'
            });
        } else {
            // Validate each column
            tableConfig.columns.forEach((col: any, index: number) => {
                if (!col.field) {
                    issues.push({
                        type: 'error',
                        elementId: element.id,
                        elementType: 'table',
                        field: `columns[${index}].field`,
                        message: `Column "${col.header || index}" has no field specified`,
                        suggestion: 'Specify the data field for this column',
                        severity: 'medium'
                    });
                }

                // Validate formatter if present
                if (col.formatter) {
                    const validFormatters = [
                        'formatDate',
                        'formatDateTime',
                        'formatTemperature',
                        'formatHumidity',
                        'formatCurrency',
                        'uppercase'
                    ];

                    if (!validFormatters.includes(col.formatter)) {
                        issues.push({
                            type: 'warning',
                            elementId: element.id,
                            elementType: 'table',
                            field: `columns[${index}].formatter`,
                            message: `Unknown formatter "${col.formatter}" in column "${col.header}"`,
                            suggestion: `Valid formatters: ${validFormatters.join(', ')}`,
                            severity: 'low'
                        });
                    }
                }
            });
        }

        return issues;
    }

    /**
     * Validate global issues (overlapping elements, performance concerns, etc.)
     */
    private validateGlobalIssues(elements: EditorElement[]): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        // Check for excessive element count
        if (elements.length > 200) {
            issues.push({
                type: 'warning',
                message: `Template has ${elements.length} elements, which may impact performance`,
                suggestion: 'Consider simplifying the template or splitting into multiple pages',
                severity: 'medium'
            });
        }

        // Check for too many charts (expensive to render)
        const chartCount = elements.filter(e => e.type === 'chart').length;
        if (chartCount > 10) {
            issues.push({
                type: 'warning',
                message: `Template has ${chartCount} charts, which may slow down PDF generation`,
                suggestion: 'Consider reducing the number of charts or using tables instead',
                severity: 'medium'
            });
        }

        return issues;
    }

    /**
     * Check if a path exists in the data object
     */
    private isValidPath(path: string, data: any): boolean {
        const parts = path.split('.');
        let current = data;

        for (const part of parts) {
            if (current === null || current === undefined || !(part in current)) {
                return false;
            }
            current = current[part];
        }

        return true;
    }

    /**
     * Count total variables in all elements
     */
    private countVariables(elements: EditorElement[]): number {
        let count = 0;
        const variablePattern = /\{\{([^}|]+)(?:\|([^}]+))?\}\}/g;

        for (const element of elements) {
            if (element.properties?.isDynamic && element.content) {
                const matches = element.content.match(variablePattern);
                if (matches) {
                    count += matches.length;
                }
            }
        }

        return count;
    }

    /**
     * Sort issues by severity and type
     */
    private sortIssues(issues: ValidationIssue[]): ValidationIssue[] {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const typeOrder = { error: 0, warning: 1, info: 2 };

        return issues.sort((a, b) => {
            // Sort by type first
            const typeCompare = typeOrder[a.type] - typeOrder[b.type];
            if (typeCompare !== 0) return typeCompare;

            // Then by severity
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }
}

export const templateValidationService = new TemplateValidationService();
