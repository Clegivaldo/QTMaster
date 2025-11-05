import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    return addNotification({
      type: 'success',
      title: title || 'Sucesso',
      message,
    });
  }, [addNotification]);

  const showError = useCallback((message: string, title?: string) => {
    return addNotification({
      type: 'error',
      title: title || 'Erro',
      message,
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string, title?: string) => {
    return addNotification({
      type: 'warning',
      title: title || 'Aviso',
      message,
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string, title?: string) => {
    return addNotification({
      type: 'info',
      title: title || 'Informação',
      message,
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};