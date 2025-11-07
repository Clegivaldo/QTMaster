import React from 'react';
import { 
  X, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Loader2,
  Download,
  Save,
  Upload
} from 'lucide-react';
import { EditorError, EditorErrorType } from '../../../../hooks/useErrorHandler';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message: string;
  details?: any;
  duration?: number; // em ms, 0 = não remove automaticamente
  action?: {
    label: string;
    onClick: () => void;
  };
  progress?: number; // 0-100 para operações com progresso
  timestamp: Date;
}

interface NotificationSystemProps {
  notifications: Notification[];
  errors: EditorError[];
  onDismissNotification: (notificationId: string) => void;
  onDismissError: (errorId: string) => void;
  getErrorTitle: (type: EditorErrorType) => string;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  errors,
  onDismissNotification,
  onDismissError,
  getErrorTitle
}) => {
  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationStyles = (notification: Notification) => {
    switch (notification.type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200',
          title: 'text-green-800',
          message: 'text-green-700',
          border: 'border-l-green-500'
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          title: 'text-red-800',
          message: 'text-red-700',
          border: 'border-l-red-500'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          border: 'border-l-yellow-500'
        };
      case 'info':
      case 'loading':
        return {
          container: 'bg-blue-50 border-blue-200',
          title: 'text-blue-800',
          message: 'text-blue-700',
          border: 'border-l-blue-500'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          title: 'text-gray-800',
          message: 'text-gray-700',
          border: 'border-l-gray-500'
        };
    }
  };

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
  


  // Combinar notificações e erros
  const allNotifications: Notification[] = [
    ...notifications,
    ...errors.map(error => ({
      id: error.id,
      type: 'error' as const,
      title: getErrorTitle(error.type),
      message: error.message,
      details: error.details,
      duration: 0, // Erros não removem automaticamente
      timestamp: error.timestamp
    }))
  ];

  if (allNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {allNotifications.map(notification => {
        const styles = getNotificationStyles(notification);
        const isError = errors.find(e => e.id === notification.id);
        
        return (
          <div
            key={notification.id}
            className={`
              p-4 rounded-lg shadow-lg border-l-4 border
              ${styles.container} ${styles.border}
              animate-in slide-in-from-right-full duration-300
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {isError ? getErrorIcon(isError) : getNotificationIcon(notification)}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm ${styles.title}`}>
                    {notification.title}
                  </h4>
                  <p className={`mt-1 text-sm ${styles.message}`}>
                    {notification.message}
                  </p>
                  
                  {/* Barra de progresso para operações com progresso */}
                  {notification.progress !== undefined && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${notification.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round(notification.progress)}% concluído
                      </p>
                    </div>
                  )}
                  
                  {/* Ação personalizada */}
                  {notification.action && (
                    <button
                      onClick={notification.action.onClick}
                      className={`mt-2 text-sm font-medium underline ${styles.title} hover:no-underline`}
                    >
                      {notification.action.label}
                    </button>
                  )}
                  
                  {/* Detalhes técnicos */}
                  {notification.details && (
                    <details className="mt-2">
                      <summary className={`text-xs cursor-pointer ${styles.message} opacity-75`}>
                        Detalhes técnicos
                      </summary>
                      <pre className={`mt-1 text-xs ${styles.message} opacity-75 whitespace-pre-wrap`}>
                        {typeof notification.details === 'string' 
                          ? notification.details 
                          : JSON.stringify(notification.details, null, 2)
                        }
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              
              {/* Botão de fechar (não mostrar para loading) */}
              {notification.type !== 'loading' && (
                <button
                  onClick={() => {
                    if (isError) {
                      onDismissError(notification.id);
                    } else {
                      onDismissNotification(notification.id);
                    }
                  }}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Fechar notificação"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationSystem;

// Hook para gerenciar notificações
export const useNotifications = () => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const addNotification = React.useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? (notification.type === 'loading' ? 0 : 5000)
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remover após duração especificada
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const dismissNotification = React.useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const updateNotification = React.useCallback((notificationId: string, updates: Partial<Notification>) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, ...updates } : n
    ));
  }, []);

  const clearAllNotifications = React.useCallback(() => {
    setNotifications([]);
  }, []);

  // Funções de conveniência
  const showSuccess = React.useCallback((title: string, message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = React.useCallback((title: string, message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Erros não removem automaticamente
      ...options
    });
  }, [addNotification]);

  const showWarning = React.useCallback((title: string, message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showInfo = React.useCallback((title: string, message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showLoading = React.useCallback((title: string, message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'loading',
      title,
      message,
      duration: 0, // Loading não remove automaticamente
      ...options
    });
  }, [addNotification]);

  // Funções específicas para operações do editor
  const showSaveSuccess = React.useCallback((templateName: string) => {
    return showSuccess(
      'Template Salvo',
      `"${templateName}" foi salvo com sucesso`,
      {
        action: {
          label: 'Ver templates',
          onClick: () => {}
        }
      }
    );
  }, [showSuccess]);

  const showExportSuccess = React.useCallback((filename: string, format: string) => {
    return showSuccess(
      'Exportação Concluída',
      `Arquivo "${filename}" foi exportado como ${format.toUpperCase()}`,
      {
        action: {
          label: 'Baixar novamente',
          onClick: () => {}
        }
      }
    );
  }, [showSuccess]);

  const showExportProgress = React.useCallback((format: string, progress: number = 0) => {
    return showLoading(
      'Exportando Template',
      `Gerando arquivo ${format.toUpperCase()}...`,
      { progress }
    );
  }, [showLoading]);

  return {
    notifications,
    addNotification,
    dismissNotification,
    updateNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showSaveSuccess,
    showExportSuccess,
    showExportProgress
  };
};

// Ícones para diferentes tipos de operação
export const OperationIcons = {
  Save: Save,
  Export: Download,
  Upload: Upload,
  Loading: Loader2
};