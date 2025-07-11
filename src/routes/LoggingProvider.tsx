import React, { createContext, useContext, useCallback } from 'react';

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  userId?: string;
  route?: string;
}

interface LoggingContextType {
  log: (level: LogEntry['level'], message: string, data?: any) => void;
  getLogs: () => LogEntry[];
  clearLogs: () => void;
}

const LoggingContext = createContext<LoggingContextType | null>(null);

interface LoggingProviderProps {
  children: React.ReactNode;
  maxLogs?: number;
}

const LoggingProvider: React.FC<LoggingProviderProps> = ({ 
  children, 
  maxLogs = 1000 
}) => {
  const logs = React.useRef<LogEntry[]>([]);

  const log = useCallback((level: LogEntry['level'], message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      route: window.location.pathname
    };

    // Add to logs array
    logs.current.push(entry);

    // Keep only the most recent logs
    if (logs.current.length > maxLogs) {
      logs.current = logs.current.slice(-maxLogs);
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 
                           level === 'debug' ? 'debug' : 'log';
      
      console[consoleMethod](`[${entry.timestamp.toISOString()}] ${level.toUpperCase()}: ${message}`, data || '');
    }

    // In production, you might want to send logs to a service
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      // Send error logs to monitoring service
      // Example: Sentry, LogRocket, etc.
    }
  }, [maxLogs]);

  const getLogs = useCallback(() => {
    return [...logs.current];
  }, []);

  const clearLogs = useCallback(() => {
    logs.current = [];
  }, []);

  const value: LoggingContextType = {
    log,
    getLogs,
    clearLogs
  };

  return (
    <LoggingContext.Provider value={value}>
      {children}
    </LoggingContext.Provider>
  );
};

export const useLogging = () => {
  const context = useContext(LoggingContext);
  if (!context) {
    throw new Error('useLogging must be used within a LoggingProvider');
  }
  return context;
};

export default LoggingProvider; 