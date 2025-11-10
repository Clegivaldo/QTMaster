import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, InfoIcon, XCircle, X } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number; // em ms, 0 = infinito
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  title,
  duration = 4000,
  onClose
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <InfoIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={`toast toast-${type} border rounded-lg shadow-lg p-4 flex gap-3 items-start ${getBackgroundColor()}`}
      role="alert"
    >
      {/* Ícone */}
      <div className={`flex-shrink-0 ${getIconColor()}`}>
        {getIcon()}
      </div>

      {/* Conteúdo */}
      <div className="flex-1">
        {title && <p className={`font-semibold ${getTextColor()} mb-1`}>{title}</p>}
        <p className={getTextColor()}>{message}</p>
      </div>

      {/* Botão fechar */}
      <button
        onClick={() => onClose(id)}
        className={`flex-shrink-0 ${getTextColor()} hover:opacity-70 transition-opacity`}
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Toast;
