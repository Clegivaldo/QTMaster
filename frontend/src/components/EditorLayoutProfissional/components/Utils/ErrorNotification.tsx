import React from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { EditorError, EditorErrorType } from '../../../../hooks/useErrorHandler';

interface ErrorNotificationProps {
  errors: EditorError[];
  onDismiss: (errorId: string) => void;
  getErrorTitle: (type: EditorErrorType) => string;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ 
  errors, 
  onDismiss, 
  getErrorTitle 
}) => {
  if (errors.length === 0) return null;
  
  const getErrorIcon = (error: EditorError) => {
    if (!error.recoverable) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    
    switch (error.type) {
      case EditorErrorType.TEMPLATE_NOT_FOUND:
      case EditorErrorType.NETWORK_ERROR:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getErrorStyles = (error: EditorError) => {
    if (!error.recoverable) {
      return {
        container: 'bg-red-50 border-red-200',
        title: 'text-red-800',
        message: 'text-red-700',
        border: 'border-l-red-500'
      };
    }
    
    switch (error.type) {
      case EditorErrorType.TEMPLATE_NOT_FOUND:
      case EditorErrorType.NETWORK_ERROR:
        return {
          container: 'bg-yellow-50 border-yellow-200',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          border: 'border-l-yellow-500'
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200',
          title: 'text-blue-800',
          message: 'text-blue-700',
          border: 'border-l-blue-500'
        };
    }
  };
  
  return (
    // Posicionar abaixo do header principal para não sobrepor controles do editor
    <div className="fixed right-4 z-50 space-y-2 max-w-md" style={{ top: '64px' }}>
      {errors.map(error => {
        const styles = getErrorStyles(error);
        
        return (
          <div
            key={error.id}
            className={`
              p-4 rounded-lg shadow-lg border-l-4 border
              ${styles.container} ${styles.border}
              animate-in slide-in-from-right-full duration-300
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {getErrorIcon(error)}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm ${styles.title}`}>
                    {getErrorTitle(error.type)}
                  </h4>
                  <p className={`mt-1 text-sm ${styles.message}`}>
                    {error.message}
                  </p>
                  {error.details && (
                    <details className="mt-2">
                      <summary className={`text-xs cursor-pointer ${styles.message} opacity-75`}>
                        Detalhes técnicos
                      </summary>
                      <pre className={`mt-1 text-xs ${styles.message} opacity-75 whitespace-pre-wrap`}>
                        {typeof error.details === 'string' 
                          ? error.details 
                          : JSON.stringify(error.details, null, 2)
                        }
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDismiss(error.id)}
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                title="Fechar notificação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ErrorNotification;