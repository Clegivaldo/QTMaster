import { useState, useCallback } from 'react';

export enum EditorErrorType {
  TEMPLATE_LOAD_FAILED = 'TEMPLATE_LOAD_FAILED',
  TEMPLATE_SAVE_FAILED = 'TEMPLATE_SAVE_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  PREVIEW_FAILED = 'PREVIEW_FAILED',
  BACKGROUND_UPLOAD_FAILED = 'BACKGROUND_UPLOAD_FAILED',
  INVALID_ELEMENT_DATA = 'INVALID_ELEMENT_DATA',
  CANVAS_RENDER_ERROR = 'CANVAS_RENDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

export interface EditorError {
  type: EditorErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: Date;
  id: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const getErrorTitle = (type: EditorErrorType): string => {
  switch (type) {
    case EditorErrorType.TEMPLATE_LOAD_FAILED:
      return 'Erro ao Carregar Template';
    case EditorErrorType.TEMPLATE_SAVE_FAILED:
      return 'Erro ao Salvar Template';
    case EditorErrorType.EXPORT_FAILED:
      return 'Erro na Exportação';
    case EditorErrorType.TEMPLATE_NOT_FOUND:
      return 'Template Não Encontrado';
    case EditorErrorType.PREVIEW_FAILED:
      return 'Erro no Preview';
    case EditorErrorType.BACKGROUND_UPLOAD_FAILED:
      return 'Erro no Upload';
    case EditorErrorType.NETWORK_ERROR:
      return 'Erro de Conexão';
    case EditorErrorType.VALIDATION_ERROR:
      return 'Dados Inválidos';
    case EditorErrorType.PERMISSION_DENIED:
      return 'Acesso Negado';
    default:
      return 'Erro';
  }
};

export const useErrorHandler = () => {
  const [errors, setErrors] = useState<EditorError[]>([]);
  
  const handleError = useCallback((error: Partial<EditorError> & { type: EditorErrorType; message: string }) => {
    const errorWithId: EditorError = {
      ...error,
      id: generateId(),
      timestamp: new Date(),
      recoverable: error.recoverable ?? true
    };
    
    setErrors(prev => [...prev, errorWithId]);
    
    // Log para monitoramento
    console.error('Editor Error:', errorWithId);
    
    return errorWithId.id;
  }, []);
  
  const dismissError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);
  
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);
  
  const getErrorsByType = useCallback((type: EditorErrorType) => {
    return errors.filter(error => error.type === type);
  }, [errors]);
  
  return { 
    errors, 
    handleError, 
    dismissError, 
    clearAllErrors,
    getErrorsByType,
    hasErrors: errors.length > 0,
    getErrorTitle
  };
};