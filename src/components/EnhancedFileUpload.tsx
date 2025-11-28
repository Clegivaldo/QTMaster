import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Loader2, Download, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

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

interface EnhancedFileUploadProps {
  suitcaseId?: string;
  onProcessingComplete?: (status: ProcessingStatus) => void;
  onError?: (error: string) => void;
}

export const EnhancedFileUpload: React.FC<EnhancedFileUploadProps> = ({
  suitcaseId,
  onProcessingComplete,
  onError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pollJobStatus = useCallback(async (jobId: string) => {
    setIsPolling(true);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/files/processing-status/${jobId}/progress`);
        const { progress, status } = response.data;
        
        setProcessingStatus(prev => prev ? { ...prev, progress, status } : null);
        
        if (status === 'completed' || status === 'error') {
          // Get final detailed results
          const detailedResponse = await axios.get(`${API_BASE_URL}/files/processing-status/${jobId}`);
          const finalStatus = detailedResponse.data;
          
          setProcessingStatus(finalStatus);
          setIsPolling(false);
          setIsLoading(false);
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          
          onProcessingComplete?.(finalStatus);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        setIsPolling(false);
        setIsLoading(false);
        
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        
        onError?.('Erro ao verificar status do processamento');
      }
    }, 1000); // Poll every second
  }, [onProcessingComplete, onError]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (suitcaseId) {
      formData.append('suitcaseId', suitcaseId);
    }

    try {
      setIsLoading(true);
      setUploadProgress(0);
      
      const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      const { jobId, status } = response.data;
      
      // Initialize processing status
      setProcessingStatus({
        jobId,
        status: 'processing',
        progress: 0,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [],
        validationResults: [],
        fileName: file.name,
      });

      // Start polling for status updates
      pollJobStatus(jobId);
      
    } catch (error) {
      console.error('Upload error:', error);
      setIsLoading(false);
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || 'Erro ao fazer upload do arquivo';
        onError?.(errorMessage);
      } else {
        onError?.('Erro desconhecido ao fazer upload');
      }
    }
  }, [suitcaseId, pollJobStatus, onError]);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExtension)) {
      onError?.('Tipo de arquivo não suportado. Use CSV ou Excel.');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB
      onError?.('Arquivo muito grande. Tamanho máximo: 50MB.');
      return;
    }

    // Clear previous status
    setProcessingStatus(null);
    
    // Upload file
    await uploadFile(file);
  }, [uploadFile, onError]);

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

  const retryUpload = useCallback(() => {
    setProcessingStatus(null);
    setIsLoading(false);
    setUploadProgress(0);
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading && uploadProgress > 0 && uploadProgress < 100 ? (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-blue-500 animate-pulse" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                Fazendo Upload...
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{uploadProgress}%</p>
            </div>
          </div>
        ) : isLoading && processingStatus ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                Processando Arquivo...
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingStatus.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                {processingStatus.progress}% - Processando dados...
              </p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Importar Arquivo de Dados
            </h3>
            <p className="text-gray-600 mb-4">
              Arraste e solte seu arquivo CSV ou Excel aqui, ou clique para selecionar
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
              id="enhanced-file-upload"
              disabled={isLoading}
            />
            <label
              htmlFor="enhanced-file-upload"
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Selecionar Arquivo
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Formatos suportados: CSV, Excel (.xlsx, .xls). Tamanho máximo: 50MB
            </p>
          </>
        )}
      </div>

      {/* Processing Status */}
      {processingStatus && (
        <EnhancedProcessingStatusDisplay 
          status={processingStatus} 
          isPolling={isPolling}
          onRetry={retryUpload}
        />
      )}
    </div>
  );
};

interface EnhancedProcessingStatusDisplayProps {
  status: ProcessingStatus;
  isPolling: boolean;
  onRetry: () => void;
}

const EnhancedProcessingStatusDisplay: React.FC<EnhancedProcessingStatusDisplayProps> = ({ 
  status, 
  isPolling, 
  onRetry 
}) => {
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

  const downloadErrorReport = () => {
    const errorReport = {
      fileName: status.fileName,
      processedAt: status.completedAt,
      summary: {
        totalRows: status.totalRows,
        validRows: status.validRows,
        invalidRows: status.invalidRows,
        processingTime: status.processingTime,
      },
      errors: status.errors,
      validationResults: status.validationResults,
    };

    const blob = new Blob([JSON.stringify(errorReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${status.jobId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              Job ID: {status.jobId} {status.fileName && `- ${status.fileName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${getStatusColor()}-100 text-${getStatusColor()}-800`}>
            {status.status === 'processing' ? 'Processando' : 
             status.status === 'completed' ? 'Concluído' : 'Erro'}
          </span>
          {status.status === 'error' && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Tentar Novamente
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(status.status === 'processing' || isPolling) && (
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Success Rate */}
      {status.totalRows > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Taxa de Sucesso</span>
            <span className="text-lg font-bold text-gray-900">
              {Math.round((status.validRows / status.totalRows) * 100)}%
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(status.validRows / status.totalRows) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {status.status === 'completed' && (
        <div className="flex flex-wrap gap-3">
          {status.errors.length > 0 && (
            <button
              onClick={downloadErrorReport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Relatório de Erros
            </button>
          )}
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Importar Novo Arquivo
          </button>
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
          <span>Concluído em: {formatCompletedAt(status.completedAt)}</span>
          {status.processingTime && (
            <span>Tempo total: {Math.round(status.processingTime / 1000)} segundos</span>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUpload;

// Local helper to format a timestamp as dd/MM/yy HH:mm (treat input as naive — strip timezone suffix)
const formatCompletedAt = (input?: string) => {
  if (!input) return '';
  const s = String(input).trim().replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '');
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};