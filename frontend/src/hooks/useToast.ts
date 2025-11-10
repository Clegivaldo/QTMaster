import { useState, useCallback } from 'react';
import { ToastType } from '../components/Toast/Toast';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    title?: string,
    duration?: number
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    
    const newToast: ToastMessage = {
      id,
      type,
      message,
      title,
      duration: duration !== undefined ? duration : (type === 'error' ? 5000 : 4000)
    };

    setToasts(prev => [...prev, newToast]);

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message: string, title?: string, duration?: number) => {
    return showToast(message, 'success', title, duration);
  }, [showToast]);

  const error = useCallback((message: string, title?: string, duration?: number) => {
    return showToast(message, 'error', title, duration);
  }, [showToast]);

  const info = useCallback((message: string, title?: string, duration?: number) => {
    return showToast(message, 'info', title, duration);
  }, [showToast]);

  const warning = useCallback((message: string, title?: string, duration?: number) => {
    return showToast(message, 'warning', title, duration);
  }, [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning
  };
};

export default useToast;
