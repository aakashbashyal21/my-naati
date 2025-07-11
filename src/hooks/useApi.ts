import { useState, useCallback } from 'react';
import { useToast } from '../components/shared/ui/Toast';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  showToast?: boolean;
  toastType?: 'success' | 'error' | 'info' | 'warning';
  successMessage?: string;
  errorMessage?: string;
}

export const useApi = <T>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });
  
  const { showToast } = useToast();
  const {
    showToast: showToastOption = true,
    toastType = 'error',
    successMessage,
    errorMessage
  } = options;

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall(...args);
      setState({ data: result, loading: false, error: null });
      
      if (showToastOption && successMessage) {
        showToast(successMessage, 'success');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      
      if (showToastOption) {
        showToast(errorMessage || 'An error occurred', toastType);
      }
      
      throw error;
    }
  }, [apiCall, showToast, showToastOption, successMessage, toastType]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
};

// Specialized hooks for common operations
export const useCreateApi = <T, CreateData>(
  createFunction: (data: CreateData) => Promise<T>,
  options?: UseApiOptions
) => {
  return useApi(createFunction, {
    successMessage: 'Created successfully',
    ...options
  });
};

export const useUpdateApi = <T, UpdateData>(
  updateFunction: (id: string, data: UpdateData) => Promise<T>,
  options?: UseApiOptions
) => {
  return useApi(updateFunction, {
    successMessage: 'Updated successfully',
    ...options
  });
};

export const useDeleteApi = (
  deleteFunction: (id: string) => Promise<void>,
  options?: UseApiOptions
) => {
  return useApi(deleteFunction, {
    successMessage: 'Deleted successfully',
    ...options
  });
}; 