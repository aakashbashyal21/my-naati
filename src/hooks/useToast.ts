import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    context.showToast(message, type, duration);
  };

  const hideToast = (id: string) => {
    context.hideToast(id);
  };

  return {
    showToast,
    hideToast,
    toasts: context.toasts
  };
}; 