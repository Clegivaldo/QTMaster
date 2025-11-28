import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { useTemplateEngine } from '../../hooks/useTemplateEngine';
import { TemplateVariable, RenderContext } from '../../types/editor';
import { Eye, Download, RefreshCw, Settings, FileText, AlertCircle } from 'lucide-react';
import { formatBRShort } from '@/utils/parseDate';

interface TemplatePreviewProps {
  template: string;
  variables: TemplateVariable[];
  onRefresh?: () => void;
  onDownload?: () => void;
  className?: string;
}

interface PreviewError {
  type: 'error' | 'warning';
  message: string;
  variable?: string;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  variables,
  onRefresh,
  onDownload,
  className = '',
}) => {
  const { renderTemplate, validateVariables } = useTemplateEngine();
  const [preview, setPreview] = useState<string>('');
  const [errors, setErrors] = useState<PreviewError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sampleData, setSampleData] = useState<RenderContext>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Dados de exemplo para preview
  const generateSampleData = (): RenderContext => {
    return {
      client: {
        name: 'Empresa ABC Ltda',
        email: 'contato@empresa.com',
        phone: '(11) 1234-5678',
        address: 'Rua Exemplo, 123 - Centro, São Paulo - SP',
        cnpj: '12.345.678/0001-90',
        street: 'Rua Exemplo',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
      },
      validation: {
        name: 'Validação Câmara 001',
        description: 'Validação de temperatura e umidade para armazenamento de medicamentos',
        startDate: '2024-01-01',
        endDate: '2024-01-03',
        duration: '72 horas',
        minTemperature: 20.0,
        maxTemperature: 25.0,
        minHumidity: 50.0,
        maxHumidity: 70.0,
        isApproved: true,
        createdAt: '2024-01-01T10:00:00Z',
      },
      statistics: {
        temperature: {
          average: 22.5,
          min: 20.1,
          max: 24.8,
          standardDeviation: 1.2,
        },
        humidity: {
          average: 62.1,
          min: 45.2,
          max: 78.9,
          standardDeviation: 8.5,
        },
        readingsCount: 1440,
      },
      sensorData: [
        {
          timestamp: '2024-01-01T10:00:00Z',
          temperature: 22.3,
          humidity: 65.2,
          sensorId: 'S001',
          location: 'Posição A1',
        },
        {
          timestamp: '2024-01-01T10:30:00Z',
          temperature: 22.8,
          humidity: 63.1,
          sensorId: 'S001',
          location: 'Posição A1',
        },
        {
          timestamp: '2024-01-01T11:00:00Z',
          temperature: 21.9,
          humidity: 67.3,
          sensorId: 'S001',
          location: 'Posição A1',
        },
      ],
      sensors: [
        {
          id: 'S001',
          name: 'Sensor de Temperatura 001',
          location: 'Posição A1',
          type: 'Temperatura/Umidade',
          calibrationDate: '2023-12-01',
        },
        {
          id: 'S002',
          name: 'Sensor de Temperatura 002',
          location: 'Posição B2',
          type: 'Temperatura/Umidade',
          calibrationDate: '2023-11-15',
        },
      ],
      currentDate: formatBRShort(new Date()),
      currentTime: new Date().toLocaleTimeString('pt-BR'),
      user: {
        name: 'João Silva',
        email: 'joao@empresa.com',
      },
    };
  };

  useEffect(() => {
    setSampleData(generateSampleData());
  }, []);

  useEffect(() => {
    if (!template) {
      setPreview('');
      setErrors([]);
      return;
    }

    try {
      const validation = validateVariables(template);
      const allErrors: PreviewError[] = [
        ...validation.errors.map(e => ({ ...e, type: 'error' as const })),
        ...validation.warnings.map(w => ({ ...w, type: 'warning' as const })),
      ];

      setErrors(allErrors);

      if (validation.errors.length === 0) {
        const rendered = renderTemplate(template, sampleData);
        setPreview(rendered);
      } else {
        setPreview('');
      }
    } catch (error) {
      setErrors([{
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao renderizar template',
      }]);
      setPreview('');
    }
  }, [template, sampleData, renderTemplate, validateVariables]);

  const handleRefresh = () => {
    setIsLoading(true);
    setSampleData(generateSampleData());
    setTimeout(() => setIsLoading(false), 500);
    onRefresh?.();
  };

  const handleDownload = () => {
    if (preview) {
      const blob = new Blob([preview], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-preview.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onDownload?.();
    }
  };

  const getErrorIcon = (type: 'error' | 'warning') => {
    return type === 'error' ? 
      <AlertCircle className="w-4 h-4 text-red-500" /> : 
      <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Pré-visualização</h3>
          <Badge variant="outline" className="text-xs">
            {variables.length} variáveis
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!preview || errors.length > 0}
            className="flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Baixar</span>
          </Button>
        </div>
      </div>

      {/* Erros e Avisos */}
      {errors.length > 0 && (
        <div className="mb-4 space-y-2">
          {errors.map((error, index) => (
            <Alert
              key={index}
              variant={error.type === 'error' ? 'destructive' : 'warning'}
              className="flex items-start space-x-2 py-2"
            >
              {getErrorIcon(error.type)}
              <div className="flex-1">
                <p className="text-sm">{error.message}</p>
                {error.variable && (
                  <p className="text-xs text-gray-500 mt-1">
                    Variável: <code className="bg-gray-100 px-1 rounded">{error.variable}</code>
                  </p>
                )}
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Preview */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Visualização do Template</span>
          </div>
          <Badge variant={errors.length === 0 ? 'success' : 'destructive'} className="text-xs">
            {errors.length === 0 ? 'Válido' : `${errors.length} erro(s)`}
          </Badge>
        </div>
        
        <div className="relative min-h-[400px] bg-white">
          {preview ? (
            <iframe
              ref={iframeRef}
              srcDoc={preview}
              className="w-full h-full min-h-[400px] border-0"
              sandbox="allow-same-origin"
              title="Template Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-[400px] text-gray-500">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Template inválido ou não renderizado</p>
                {errors.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Corrija os erros acima para visualizar
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações do Template */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Variáveis disponíveis: {variables.length}</span>
        </div>
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Tamanho do template: {template.length} caracteres</span>
        </div>
      </div>
    </Card>
  );
};
