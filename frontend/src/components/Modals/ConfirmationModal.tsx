import React from 'react';
import { AlertCircle } from 'lucide-react';
import ResponsiveModal from '../ResponsiveModal';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isDangerous?: boolean; // Se true, muda cor para vermelho
  icon?: 'warning' | 'info' | 'success' | 'error';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  isDangerous = false,
  icon = 'info'
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const getIconColor = () => {
    if (isDangerous) return 'text-red-600';
    if (icon === 'warning') return 'text-yellow-600';
    if (icon === 'success') return 'text-green-600';
    if (icon === 'error') return 'text-red-600';
    return 'text-blue-600';
  };

  const getButtonColor = () => {
    if (isDangerous) return 'bg-red-600 hover:bg-red-700';
    return 'bg-blue-600 hover:bg-blue-700';
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <div className="p-6 space-y-6">
        {/* Ícone e Mensagem */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className={`h-6 w-6 ${getIconColor()}`} />
          </div>
          <div className="flex-1">
            <p className="text-gray-700">{message}</p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isProcessing || isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || isLoading}
            className={`px-4 py-2 ${getButtonColor()} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {(isProcessing || isLoading) && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default ConfirmationModal;
