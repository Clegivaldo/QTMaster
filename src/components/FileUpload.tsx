import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface ProcessingError {
  row: number;
  message: string;
  data?: any;
}

export interface ValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

export interface ProcessingStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ProcessingError[];
  validationResults: ValidationResult[];
  processingTime?: number;
  completedAt?: string;
  fileName?: string;
}

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onProcessingComplete?: (status: ProcessingStatus) => void;
  accept?: string;
  maxSize?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onProcessingComplete,
  accept = '.csv,.xlsx,.xls',
  maxSize = 50 * 1024 * 1024, // 50MB
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!accept.split(',').some(ext => file.name.toLowerCase().endsWith(ext.trim()))) {
      return 'Tipo de arquivo não suportado. Por favor, use CSV ou Excel.';
    }
    if (file.size > maxSize) {
      return 'Arquivo muito grande. Tamanho máximo: 50MB.';
    }
    return null;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    onFileSelect(file);
    
    // Simulate processing for demo
    setIsLoading(true);
    setProcessingStatus({
      jobId: 'demo-job-123',
      status: 'processing',
      progress: 0,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [],
      validationResults: [],
    });

    // Simulate progressive processing
    const simulateProgress = async () => {
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProcessingStatus(prev => prev ? {
          ...prev,
          progress: i,
          totalRows: i === 100 ? 5 : Math.floor(i / 20),
          validRows: i === 100 ? 2 : Math.floor(i / 50),
          invalidRows: i === 100 ? 3 : Math.floor(i / 33),
        } : null);
      }

      // Final status with errors
      const finalStatus: ProcessingStatus = {
        jobId: 'demo-job-123',
        status: 'completed',
        progress: 100,
        totalRows: 5,
        validRows: 2,
        invalidRows: 3,
        errors: [
          {
            row: 2,
            message: 'Valor de temperatura inválido: invalid_temp',
            data: { Sensor_ID: 'S002', Temperatura: 'invalid_temp', Umidade: '55.1', Data_Hora: '2024-01-15 10:15:00', Localizacao: 'Sala B' }
          },
          {
            row: 3,
            message: 'Valor de umidade inválido: invalid_humidity',
            data: { Sensor_ID: 'S003', Temperatura: '22.8', Umidade: 'invalid_humidity', Data_Hora: '2024-01-15 10:30:00', Localizacao: 'Sala C' }
          },
          {
            row: 4,
            message: 'Formato de data inválido: invalid_date',
            data: { Sensor_ID: 'S004', Temperatura: '26.1', Umidade: '58.9', Data_Hora: 'invalid_date', Localizacao: 'Sala D' }
          }
        ],
        validationResults: [
          { rowNumber: 1, isValid: true, errors: [] },
          { rowNumber: 2, isValid: false, errors: [{ field: 'Temperatura', message: 'Valor de temperatura inválido' }] },
          { rowNumber: 3, isValid: false, errors: [{ field: 'Umidade', message: 'Valor de umidade inválido' }] },
          { rowNumber: 4, isValid: false, errors: [{ field: 'Data_Hora', message: 'Formato de data inválido' }] },
          { rowNumber: 5, isValid: true, errors: [] }
        ],
        processingTime: 2500,
        completedAt: new Date().toISOString(),
      };

      setProcessingStatus(finalStatus);
      setIsLoading(false);
      onProcessingComplete?.(finalStatus);
    };

    simulateProgress();
  }, [onFileSelect, onProcessingComplete, accept, maxSize]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Importar Arquivo de Dados
        </h3>
        <p className="text-gray-600 mb-4">
          Arraste e solte seu arquivo CSV ou Excel aqui, ou clique para selecionar
        </p>
        <input
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          id="file-upload"
          disabled={isLoading}
        />
        <label
          htmlFor="file-upload"
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Processando...
            </>
          ) : (
            'Selecionar Arquivo'
          )}
        </label>
        <p className="text-xs text-gray-500 mt-2">
          Formatos suportados: CSV, Excel (.xlsx, .xls). Tamanho máximo: 50MB
        </p>
      </div>

      {/* Processing Status */}
      {processingStatus && (
        <ProcessingStatusDisplay status={processingStatus} />
      )}
    </div>
  );
};

interface ProcessingStatusDisplayProps {
  status: ProcessingStatus;
}

const ProcessingStatusDisplay: React.FC<ProcessingStatusDisplayProps> = ({ status }) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'processing':
        return <Loader2 className="animate-spin h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'processing':
        return 'blue';
      case 'completed':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h4 className="text-lg font-medium text-gray-900">
              Status do Processamento
            </h4>
            <p className="text-sm text-gray-500">
              Job ID: {status.jobId}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium bg-${getStatusColor()}-100 text-${getStatusColor()}-800`}>
          {status.status === 'processing' ? 'Processando' : 
           status.status === 'completed' ? 'Concluído' : 'Erro'}
        </div>
      </div>

      {/* Progress Bar */}
      {status.status === 'processing' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progresso</span>
            <span>{status.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Statistics */}
      {status.totalRows > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{status.totalRows}</div>
            <div className="text-sm text-gray-600">Total de Linhas</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{status.validRows}</div>
            <div className="text-sm text-gray-600">Válidas</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{status.invalidRows}</div>
            <div className="text-sm text-gray-600">Inválidas</div>
          </div>
          {status.processingTime && (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(status.processingTime / 1000)}s
              </div>
              <div className="text-sm text-gray-600">Tempo</div>
            </div>
          )}
        </div>
      )}

      {/* Error Details */}
      {status.errors.length > 0 && (
        <div className="space-y-4">
          <h5 className="text-md font-medium text-gray-900 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            Detalhes dos Erros ({status.errors.length})
          </h5>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {status.errors.map((error, index) => (
              <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-red-800">
                        Linha {error.row}
                      </p>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      {error.message}
                    </p>
                    {error.data && (
                      <div className="mt-2">
                        <p className="text-xs text-red-600 font-medium mb-1">Dados da linha:</p>
                        <div className="bg-red-100 rounded p-2 text-xs font-mono text-red-800 overflow-x-auto">
                          {JSON.stringify(error.data, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Results Table */}
      {status.validationResults.length > 0 && (
        <div className="space-y-4">
          <h5 className="text-md font-medium text-gray-900">
            Resultado da Validação por Linha
          </h5>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Linha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erros
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {status.validationResults.map((result, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.rowNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.isValid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.isValid ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Válida
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inválida
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.errors.length > 0 ? (
                        <ul className="space-y-1">
                          {result.errors.map((error, errorIndex) => (
                            <li key={errorIndex} className="text-sm text-red-600">
                              <strong>{error.field}:</strong> {error.message}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-green-600">Nenhum erro</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completion Info */}
      {status.status === 'completed' && status.completedAt && (
        <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
          <span>Concluído em: {new Date(status.completedAt).toLocaleString('pt-BR')}</span>
          {status.processingTime && (
            <span>Tempo total: {Math.round(status.processingTime / 1000)} segundos</span>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;