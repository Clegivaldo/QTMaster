import { useAppState } from './useAppState';

export const useNotifications = () => {
  const { addNotification, removeNotification, clearNotifications, notifications } = useAppState();

  const showSuccess = (title: string, message?: string, duration?: number) => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration,
    });
  };

  const showError = (title: string, message?: string, duration?: number) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: duration || 0, // Errors don't auto-dismiss by default
    });
  };

  const showWarning = (title: string, message?: string, duration?: number) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration,
    });
  };

  const showInfo = (title: string, message?: string, duration?: number) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration,
    });
  };

  const dismiss = (id: string) => {
    removeNotification(id);
  };

  const dismissAll = () => {
    clearNotifications();
  };

  return {
    notifications,
    addNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismiss,
    dismissAll,
  };
};