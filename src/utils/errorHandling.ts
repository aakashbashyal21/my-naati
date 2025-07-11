import { ERROR_MESSAGES } from '../config/constants';

// Custom error types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(
      message,
      'VALIDATION_ERROR',
      field ? `${field}: ${message}` : ERROR_MESSAGES.VALIDATION_ERROR,
      400
    );
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message?: string) {
    super(
      message || 'Authentication failed',
      'AUTH_ERROR',
      ERROR_MESSAGES.AUTH_ERROR,
      401
    );
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends AppError {
  constructor(message?: string) {
    super(
      message || 'Insufficient permissions',
      'PERMISSION_ERROR',
      ERROR_MESSAGES.PERMISSION_ERROR,
      403
    );
    this.name = 'PermissionError';
  }
}

export class NetworkError extends AppError {
  constructor(message?: string) {
    super(
      message || 'Network request failed',
      'NETWORK_ERROR',
      ERROR_MESSAGES.NETWORK_ERROR,
      0
    );
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends AppError {
  constructor(message?: string) {
    super(
      message || 'Rate limit exceeded',
      'RATE_LIMIT_ERROR',
      ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      429
    );
    this.name = 'RateLimitError';
  }
}

// Error handling utilities
export const handleApiError = (error: unknown): AppError => {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }
  
  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError();
  }
  
  // Handle Supabase errors
  if (error && typeof error === 'object' && 'message' in error) {
    const errorObj = error as any;
    
    // Supabase auth errors
    if (errorObj.message?.includes('Invalid login credentials')) {
      return new AuthenticationError('Invalid email or password');
    }
    
    if (errorObj.message?.includes('User already registered')) {
      return new ValidationError('An account with this email already exists');
    }
    
    if (errorObj.message?.includes('Password should be at least')) {
      return new ValidationError('Password must be at least 6 characters long');
    }
    
    // Supabase permission errors
    if (errorObj.message?.includes('new row violates row-level security policy')) {
      return new PermissionError('You do not have permission to perform this action');
    }
    
    // Supabase network errors
    if (errorObj.message?.includes('fetch')) {
      return new NetworkError();
    }
    
    // Generic Supabase error
    return new AppError(
      errorObj.message || 'An error occurred',
      'SUPABASE_ERROR',
      ERROR_MESSAGES.SERVER_ERROR,
      errorObj.status || 500
    );
  }
  
  // Handle unknown errors
  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      ERROR_MESSAGES.SERVER_ERROR
    );
  }
  
  // Handle non-Error objects
  return new AppError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    ERROR_MESSAGES.SERVER_ERROR
  );
};

// Error logging utility
export const logError = (error: AppError, context?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('AppError:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context,
      stack: error.stack
    });
  } else {
    // In production, you would send this to a logging service
    // Example: Sentry.captureException(error, { extra: context });
    console.error('Error:', error.message, context);
  }
};

// Error recovery utilities
export const isRecoverableError = (error: AppError): boolean => {
  const recoverableCodes = [
    'NETWORK_ERROR',
    'RATE_LIMIT_ERROR',
    'VALIDATION_ERROR'
  ];
  
  return recoverableCodes.includes(error.code);
};

export const getRetryDelay = (error: AppError, attempt: number): number => {
  if (error instanceof RateLimitError) {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
  }
  
  if (error instanceof NetworkError) {
    return Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
  }
  
  return 1000; // Default 1 second delay
};

// Error boundary utilities
export const getErrorBoundaryFallback = (error: AppError) => {
  switch (error.code) {
    case 'AUTH_ERROR':
      return {
        title: 'Authentication Required',
        message: 'Please log in to continue.',
        action: 'Sign In'
      };
    
    case 'PERMISSION_ERROR':
      return {
        title: 'Access Denied',
        message: 'You do not have permission to view this page.',
        action: 'Go Back'
      };
    
    case 'NETWORK_ERROR':
      return {
        title: 'Connection Error',
        message: 'Please check your internet connection and try again.',
        action: 'Retry'
      };
    
    default:
      return {
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again.',
        action: 'Retry'
      };
  }
}; 