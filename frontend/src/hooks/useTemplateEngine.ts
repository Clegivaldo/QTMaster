import { useState, useCallback, useMemo } from 'react';
import { TemplateVariable, RenderContext, TemplateEngine } from '../types/editor';

// Motor de template simples para substituição de variáveis
class SimpleTemplateEngine implements TemplateEngine {
  private variables: Map<string, TemplateVariable> = new Map();

  constructor() {
    // Registrar variáveis padrão
    this.registerDefaultVariables();
  }

  private registerDefaultVariables() {
    const defaultVariables: TemplateVariable[] = [
      // Variáveis de Cliente
      { name: 'client.name', type: 'string', description: 'Nome do cliente', required: true },
      { name: 'client.email', type: 'string', description: 'Email do cliente' },
      { name: 'client.phone', type: 'string', description: 'Telefone do cliente' },
      { name: 'client.address', type: 'string', description: 'Endereço completo do cliente' },
      { name: 'client.cnpj', type: 'string', description: 'CNPJ do cliente' },
      { name: 'client.street', type: 'string', description: 'Rua do cliente' },
      { name: 'client.neighborhood', type: 'string', description: 'Bairro do cliente' },
      { name: 'client.city', type: 'string', description: 'Cidade do cliente' },
      { name: 'client.state', type: 'string', description: 'Estado do cliente' },

      // Variáveis de Validação
      { name: 'validation.name', type: 'string', description: 'Nome da validação', required: true },
      { name: 'validation.description', type: 'string', description: 'Descrição da validação' },
      { name: 'validation.startDate', type: 'date', description: 'Data de início da validação' },
      { name: 'validation.endDate', type: 'date', description: 'Data de término da validação' },
      { name: 'validation.duration', type: 'string', description: 'Duração da validação' },
      { name: 'validation.minTemperature', type: 'number', description: 'Temperatura mínima' },
      { name: 'validation.maxTemperature', type: 'number', description: 'Temperatura máxima' },
      { name: 'validation.minHumidity', type: 'number', description: 'Umidade mínima' },
      { name: 'validation.maxHumidity', type: 'number', description: 'Umidade máxima' },
      { name: 'validation.isApproved', type: 'boolean', description: 'Status de aprovação' },
      { name: 'validation.createdAt', type: 'datetime', description: 'Data de criação' },

      // Variáveis de Estatísticas
      { name: 'statistics.temperature.average', type: 'number', description: 'Temperatura média' },
      { name: 'statistics.temperature.min', type: 'number', description: 'Temperatura mínima' },
      { name: 'statistics.temperature.max', type: 'number', description: 'Temperatura máxima' },
      { name: 'statistics.temperature.standardDeviation', type: 'number', description: 'Desvio padrão da temperatura' },
      { name: 'statistics.humidity.average', type: 'number', description: 'Umidade média' },
      { name: 'statistics.humidity.min', type: 'number', description: 'Umidade mínima' },
      { name: 'statistics.humidity.max', type: 'number', description: 'Umidade máxima' },
      { name: 'statistics.humidity.standardDeviation', type: 'number', description: 'Desvio padrão da umidade' },
      { name: 'statistics.readingsCount', type: 'number', description: 'Total de leituras' },

      // Variáveis de Dados do Sensor
      { name: 'sensorData', type: 'array', description: 'Array com dados dos sensores' },
      { name: 'sensors', type: 'array', description: 'Array com informações dos sensores' },

      // Variáveis de Data e Hora
      { name: 'currentDate', type: 'date', description: 'Data atual' },
      { name: 'currentTime', type: 'time', description: 'Hora atual' },
      { name: 'currentDateTime', type: 'datetime', description: 'Data e hora atual' },

      // Variáveis de Usuário
      { name: 'user.name', type: 'string', description: 'Nome do usuário' },
      { name: 'user.email', type: 'string', description: 'Email do usuário' },
    ];

    defaultVariables.forEach(variable => {
      this.variables.set(variable.name, variable);
    });
  }

  registerVariable(variable: TemplateVariable): void {
    this.variables.set(variable.name, variable);
  }

  unregisterVariable(name: string): void {
    this.variables.delete(name);
  }

  getVariable(name: string): TemplateVariable | undefined {
    return this.variables.get(name);
  }

  getAllVariables(): TemplateVariable[] {
    return Array.from(this.variables.values());
  }

  extractVariables(template: string): string[] {
    const regex = /\{\{(\s*[\w\d._-]+\s*)\}\}/g;
    const matches = template.match(regex) || [];
    return matches.map(match => match.replace(/\{\{\s*|\s*\}\}/g, '').trim());
  }

  render(template: string, context: RenderContext): string {
    const extractedVariables = this.extractVariables(template);
    let result = template;

    extractedVariables.forEach(variableName => {
      const value = this.resolveVariable(variableName, context);
      const placeholder = `{{${variableName}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    });

    return result;
  }

  private resolveVariable(path: string, context: RenderContext): any {
    const parts = path.split('.');
    let current = context;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part as keyof typeof current];
      } else {
        return '';
      }
    }

    return current;
  }

  validate(template: string, context: RenderContext): { isValid: boolean; errors: string[]; warnings: string[] } {
    const extractedVariables = this.extractVariables(template);
    const errors: string[] = [];
    const warnings: string[] = [];

    extractedVariables.forEach(variableName => {
      const variable = this.getVariable(variableName);
      if (!variable) {
        warnings.push(`Variável desconhecida: ${variableName}`);
        return;
      }

      if (variable.required) {
        const value = this.resolveVariable(variableName, context);
        if (value === undefined || value === null || value === '') {
          errors.push(`Variável obrigatória não preenchida: ${variableName}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const useTemplateEngine = () => {
  const [engine] = useState(() => new SimpleTemplateEngine());
  const [variables, setVariables] = useState<TemplateVariable[]>([]);

  const renderTemplate = useCallback((template: string, context: RenderContext): string => {
    try {
      return engine.render(template, context);
    } catch (error) {
      console.error('Erro ao renderizar template:', error);
      return `<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">
        <strong>Erro ao renderizar template:</strong><br>
        ${error instanceof Error ? error.message : 'Erro desconhecido'}
      </div>`;
    }
  }, [engine]);

  const validateVariables = useCallback((template: string) => {
    const extractedVariables = engine.extractVariables(template);
    const errors: Array<{ message: string; variable?: string }> = [];
    const warnings: Array<{ message: string; variable?: string }> = [];

    extractedVariables.forEach(variableName => {
      const variable = engine.getVariable(variableName);
      if (!variable) {
        warnings.push({
          message: `Variável desconhecida: ${variableName}`,
          variable: variableName,
        });
        return;
      }

      if (variable.required) {
        errors.push({
          message: `Variável obrigatória não preenchida: ${variableName}`,
          variable: variableName,
        });
      }
    });

    return { errors, warnings };
  }, [engine]);

  const extractVariables = useCallback((template: string): TemplateVariable[] => {
    const extractedNames = engine.extractVariables(template);
    return extractedNames.map(name => {
      const variable = engine.getVariable(name);
      return variable || {
        name,
        type: 'unknown',
        description: 'Variável não registrada',
      };
    });
  }, [engine]);

  const registerVariable = useCallback((variable: TemplateVariable) => {
    engine.registerVariable(variable);
    setVariables(engine.getAllVariables());
  }, [engine]);

  const unregisterVariable = useCallback((name: string) => {
    engine.unregisterVariable(name);
    setVariables(engine.getAllVariables());
  }, [engine]);

  const getAllVariables = useCallback(() => {
    return engine.getAllVariables();
  }, [engine]);

  const getVariable = useCallback((name: string) => {
    return engine.getVariable(name);
  }, [engine]);

  return {
    renderTemplate,
    validateVariables,
    extractVariables,
    registerVariable,
    unregisterVariable,
    getAllVariables,
    getVariable,
    variables,
  };
};
