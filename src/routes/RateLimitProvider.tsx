import React, { createContext, useContext, useRef, useCallback } from 'react';

interface RateLimitContextType {
  checkRateLimit: (key: string, limit: number, windowMs: number) => boolean;
  clearRateLimit: (key: string) => void;
}

const RateLimitContext = createContext<RateLimitContextType | null>(null);

interface RateLimitProviderProps {
  children: React.ReactNode;
}

const RateLimitProvider: React.FC<RateLimitProviderProps> = ({ children }) => {
  const requests = useRef<Map<string, number[]>>(new Map());

  const checkRateLimit = useCallback((key: string, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this key
    const existingRequests = requests.current.get(key) || [];
    
    // Filter out requests outside the current window
    const validRequests = existingRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit is exceeded
    if (validRequests.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    // Add current request
    validRequests.push(now);
    requests.current.set(key, validRequests);
    
    return true; // Request allowed
  }, []);

  const clearRateLimit = useCallback((key: string) => {
    requests.current.delete(key);
  }, []);

  const value: RateLimitContextType = {
    checkRateLimit,
    clearRateLimit
  };

  return (
    <RateLimitContext.Provider value={value}>
      {children}
    </RateLimitContext.Provider>
  );
};

export const useRateLimit = () => {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within a RateLimitProvider');
  }
  return context;
};

export default RateLimitProvider; 