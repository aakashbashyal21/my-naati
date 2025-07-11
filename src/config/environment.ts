// Environment configuration with validation
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_APP_VERSION: string;
  VITE_APP_NAME: string;
}

// Validate required environment variables
const validateEnvironment = (): EnvironmentConfig => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    NODE_ENV: (import.meta.env.NODE_ENV || 'development') as EnvironmentConfig['NODE_ENV'],
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL!,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY!,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'NaatiNuggets'
  };
};

// Export validated environment config
export const env = validateEnvironment();

// Environment-specific configurations
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Feature flags
export const FEATURE_FLAGS = {
  ANALYTICS: isProduction || import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  DEBUG_MODE: isDevelopment,
  ADVERTISEMENTS: import.meta.env.VITE_ENABLE_ADS !== 'false',
  VOCAB_LIST: import.meta.env.VITE_ENABLE_VOCAB_LIST !== 'false',
  GAMIFICATION: import.meta.env.VITE_ENABLE_GAMIFICATION !== 'false'
} as const;

// API configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  BASE_URL: isDevelopment ? 'http://localhost:3000' : env.VITE_SUPABASE_URL
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_REQUIREMENTS: {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false
  }
} as const; 