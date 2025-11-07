import React from 'react';
import { Loader2, Download, Save, Upload, FileText, Image, Code } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  title: string;
  message: string;
  progress?: number; // 0-100
  operation?: 'save' | 'load' | 'export' | 'upload' | 'general';
  format?: 'pdf' | 'png' | 'html' | 'json';
  onCancel?: () => void;
  showProgress?: boolean;
  estimatedTime?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  title,
  message,
  progress,
  operation = 'general',
  format,
  onCancel,
  showProgress = false,
  estimatedTime
}) => {
  if (!isVisible) return null;

  const getOperationIcon = () => {
    switch (operation) {
      case 'save':
        return <Save className="h-8 w-8 text-blue-500" />;
      case 'load':
        return <Upload className="h-8 w-8 text-green-500" />;
      case 'export':
        if (format === 'pdf') return <FileText className="h-8 w-8 text-red-500" />;
        if (format === 'png') return <Image className="h-8 w-8 text-blue-500" />;
        if (format === 'html') return <Code className="h-8 w-8 text-green-500" />;
        if (format === 'json') return <Code className="h-8 w-8 text-purple-500" />;
        return <Download className="h-8 w-8 text-blue-500" />;
      case 'upload':
        return <Upload className="h-8 w-8 text-green-500" />;
      default:
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
    }
  };

  const getProgressColor = () => {
    switch (operation) {
      case 'save':
        return 'bg-blue-600';
      case 'load':
        return 'bg-green-600';
      case 'export':
        if (format === 'pdf') return 'bg-red-600';
        if (format === 'png') return 'bg-blue-600';
        if (format === 'html') return 'bg-green-600';
        if (format === 'json') return 'bg-purple-600';
        return 'bg-blue-600';
      case 'upload':
        return 'bg-green-600';
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          {/* Ícone da operação */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {getOperationIcon()}
              {operation === 'general' && (
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              )}
            </div>
          </div>

          {/* Título */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h3>

          {/* Mensagem */}
          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {/* Barra de progresso */}
          {showProgress && progress !== undefined && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progresso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {estimatedTime && (
                <p className="text-xs text-gray-500 mt-2">
                  Tempo estimado: {estimatedTime}
                </p>
              )}
            </div>
          )}

          {/* Spinner animado para operações sem progresso específico */}
          {!showProgress && (
            <div className="mb-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          )}

          {/* Botão de cancelar (se disponível) */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
          )}

          {/* Mensagens específicas por operação */}
          <div className="mt-4 text-xs text-gray-500">
            {operation === 'save' && (
              <p>Salvando template no servidor...</p>
            )}
            {operation === 'load' && (
              <p>Carregando template do servidor...</p>
            )}
            {operation === 'export' && format && (
              <p>Gerando arquivo {format.toUpperCase()}...</p>
            )}
            {operation === 'upload' && (
              <p>Enviando arquivo para o servidor...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;

// Hook para gerenciar loading overlay
export const useLoadingOverlay = () => {
  const [loadingState, setLoadingState] = React.useState<{
    isVisible: boolean;
    title: string;
    message: string;
    progress?: number;
    operation?: 'save' | 'load' | 'export' | 'upload' | 'general';
    format?: 'pdf' | 'png' | 'html' | 'json';
    onCancel?: () => void;
    showProgress?: boolean;
    estimatedTime?: string;
  }>({
    isVisible: false,
    title: '',
    message: ''
  });

  const showLoading = React.useCallback((options: {
    title: string;
    message: string;
    progress?: number;
    operation?: 'save' | 'load' | 'export' | 'upload' | 'general';
    format?: 'pdf' | 'png' | 'html' | 'json';
    onCancel?: () => void;
    showProgress?: boolean;
    estimatedTime?: string;
  }) => {
    setLoadingState({
      isVisible: true,
      ...options
    });
  }, []);

  const updateProgress = React.useCallback((progress: number, estimatedTime?: string) => {
    setLoadingState(prev => ({
      ...prev,
      progress,
      estimatedTime,
      showProgress: true
    }));
  }, []);

  const hideLoading = React.useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  // Funções de conveniência
  const showSaveLoading = React.useCallback((templateName: string, onCancel?: () => void) => {
    showLoading({
      title: 'Salvando Template',
      message: `Salvando "${templateName}" no servidor...`,
      operation: 'save',
      onCancel
    });
  }, [showLoading]);

  const showLoadLoading = React.useCallback((templateName: string) => {
    showLoading({
      title: 'Carregando Template',
      message: `Carregando "${templateName}" do servidor...`,
      operation: 'load'
    });
  }, [showLoading]);

  const showExportLoading = React.useCallback((
    format: 'pdf' | 'png' | 'html' | 'json',
    templateName: string,
    onCancel?: () => void
  ) => {
    showLoading({
      title: 'Exportando Template',
      message: `Gerando arquivo ${format.toUpperCase()} de "${templateName}"...`,
      operation: 'export',
      format,
      onCancel,
      showProgress: true,
      progress: 0
    });
  }, [showLoading]);

  const showUploadLoading = React.useCallback((fileName: string, onCancel?: () => void) => {
    showLoading({
      title: 'Enviando Arquivo',
      message: `Fazendo upload de "${fileName}"...`,
      operation: 'upload',
      onCancel,
      showProgress: true,
      progress: 0
    });
  }, [showLoading]);

  return {
    loadingState,
    showLoading,
    updateProgress,
    hideLoading,
    showSaveLoading,
    showLoadLoading,
    showExportLoading,
    showUploadLoading,
    LoadingOverlay: () => <LoadingOverlay {...loadingState} />
  };
};