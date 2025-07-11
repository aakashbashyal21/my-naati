import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (process.env.NODE_ENV === 'development') {
  console.log('Supabase configured:', !!supabaseUrl);
}
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase Key exists:', !!supabaseAnonKey);
}

// Check if environment variables are properly configured
const isValidUrl = (url: string) => {
  if (!url) return false;
  if (url === 'your_supabase_url_here') return false;
  
  try {
    const urlObj = new URL(url);
    // Check if it's a valid Supabase URL format
    return urlObj.hostname.includes('supabase.co') || 
           urlObj.hostname.includes('localhost') ||
           urlObj.hostname.includes('127.0.0.1');
  } catch {
    return false;
  }
};

const isValidKey = (key: string) => {
  if (!key) return false;
  if (key === 'your_supabase_anon_key_here') return false;
  // Supabase anon keys typically start with 'eyJ' (JWT format)
  return key.length > 20;
};

const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  isValidUrl(supabaseUrl) &&
  isValidKey(supabaseAnonKey);

if (process.env.NODE_ENV === 'development') {
  console.log('Supabase configured:', isSupabaseConfigured);
}

if (!isSupabaseConfigured) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('Supabase configuration check failed:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlValid: isValidUrl(supabaseUrl || ''),
      keyValid: isValidKey(supabaseAnonKey || ''),
      url: supabaseUrl
    });
  }
}

// Only create the client if Supabase is properly configured
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Auth helper functions with proper error handling
export const signUp = async (email: string, password: string) => {
  if (!supabase) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please connect to Supabase first.' } 
    };
  }
  
  try {
    // First check if auth service is healthy
    const healthCheck = await checkAuthServiceHealth();
    if (!healthCheck.healthy) {
      return {
        data: null,
        error: { 
          message: healthCheck.error,
          details: healthCheck.details,
          isBackendIssue: true
        }
      };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      const handledError = handleAuthError(error, 'signUp');
      return { 
        data, 
        error: { 
          message: handledError.message,
          isBackendIssue: handledError.isBackendIssue,
          originalError: error
        } 
      };
    }
    
    // If signup successful and user exists, try to create user profile
    if (data.user && !error) {
      try {
        // Check if user profile already exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();
        
        // Only create profile if it doesn't exist
        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              role: 'user'
            });
          
          if (profileError) {
            console.warn('Failed to create user profile:', profileError);
            // Don't fail the signup if profile creation fails
          }
        }
      } catch (profileError) {
        console.warn('Error handling user profile:', profileError);
        // Don't fail the signup if profile handling fails
      }
    }
    
    return { data, error };
  } catch (err) {
    console.error('Unexpected error during signUp:', err);
    return { 
      data: null, 
      error: { 
        message: 'An unexpected error occurred during signup. Please try again.',
        isBackendIssue: true,
        originalError: err
      } 
    };
  }
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please connect to Supabase first.' } 
    };
  }
  
  try {
    // First check if auth service is healthy
    const healthCheck = await checkAuthServiceHealth();
    if (!healthCheck.healthy) {
      return {
        data: null,
        error: { 
          message: healthCheck.error,
          details: healthCheck.details,
          isBackendIssue: true
        }
      };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      const handledError = handleAuthError(error, 'signIn');
      return { 
        data, 
        error: { 
          message: handledError.message,
          isBackendIssue: handledError.isBackendIssue,
          originalError: error
        } 
      };
    }
    
    // If signin successful, ensure user profile exists
    if (data.user && !error) {
      try {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();
        
        // Create profile if it doesn't exist
        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              role: 'user'
            });
          
          if (profileError) {
            console.warn('Failed to create user profile on signin:', profileError);
          }
        }
      } catch (profileError) {
        console.warn('Error checking/creating user profile on signin:', profileError);
      }
    }
    
    return { data, error };
  } catch (err) {
    console.error('Unexpected error during signIn:', err);
    return { 
      data: null, 
      error: { 
        message: 'An unexpected error occurred during signin. Please try again.',
        isBackendIssue: true,
        originalError: err
      } 
    };
  }
};

export const resetPassword = async (email: string) => {
  if (!supabase) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please connect to Supabase first.' } 
    };
  }
  
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('Supabase resetPassword error:', error);
      return { data, error: { message: error.message } };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error during resetPassword:', err);
    return { 
      data: null, 
      error: { message: 'An unexpected error occurred while sending reset email.' } 
    };
  }
};

export const signOut = async () => {
  if (!supabase) {
    return { error: { message: 'Supabase is not configured. Please connect to Supabase first.' } };
  }
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase signOut error:', error);
    }
    return { error };
  } catch (err) {
    console.error('Unexpected error during signOut:', err);
    return { error: { message: 'An unexpected error occurred during signout.' } };
  }
};

export const getCurrentUser = async () => {
  if (!supabase) {
    return { 
      user: null, 
      error: { message: 'Supabase is not configured. Please connect to Supabase first.' } 
    };
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // Handle "Auth session missing!" as expected state (no user logged in)
      if (error.message === 'Auth session missing!') {
        return { user: null, error: null };
      }
      console.error('Supabase getCurrentUser error:', error);
    }
    return { user, error };
  } catch (err) {
    console.error('Unexpected error getting current user:', err);
    return { 
      user: null, 
      error: { message: 'An unexpected error occurred while checking authentication.' } 
    };
  }
};

// Helper function to check database connectivity
export const checkDatabaseConnection = async () => {
  if (!supabase) {
    return { connected: false, error: 'Supabase not configured' };
  }
  
  try {
    // Try a simple query to test database connectivity
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return { connected: false, error: error.message };
    }
    
    return { connected: true, error: null };
  } catch (err) {
    console.error('Database connection test error:', err);
    return { connected: false, error: 'Failed to connect to database' };
  }
};

// Helper function to check auth service health
export const checkAuthServiceHealth = async () => {
  if (!supabase) {
    return { healthy: false, error: 'Supabase not configured' };
  }
  
  try {
    // Try to get the current session without throwing errors
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('Database error')) {
      return { 
        healthy: false, 
        error: 'Auth service database error - check Supabase project health',
        details: error.message
      };
    }
    
    return { healthy: true, error: null };
  } catch (err) {
    console.error('Auth service health check error:', err);
    return { 
      healthy: false, 
      error: 'Auth service unavailable',
      details: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};

// Enhanced error handler for auth operations
const handleAuthError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  
  // Check for specific database schema errors
  if (error.message?.includes('Database error querying schema')) {
    return {
      message: 'Your Supabase project has a database schema connectivity issue. The authentication service cannot access required database tables. Please check your Supabase project dashboard immediately.',
      isBackendIssue: true
    };
  }
  
  // Check for unexpected_failure errors (500 status)
  if (error.message?.includes('unexpected_failure') || error.code === 'unexpected_failure') {
    return {
      message: 'Supabase internal server error (500). Your project may have database connectivity issues or corrupted authentication tables. Check your Supabase dashboard logs immediately.',
      isBackendIssue: true
    };
  }
  
  // Check for provider-related errors
  if (error.message?.includes('providers') || error.message?.includes('identities')) {
    return {
      message: 'Authentication provider configuration issue detected. Please check your Supabase Auth settings in the dashboard.',
      isBackendIssue: true
    };
  }
  
  // Handle other common auth errors
  if (error.message?.includes('Invalid login credentials')) {
    return {
      message: 'Invalid email or password. Please check your credentials and try again.',
      isBackendIssue: false
    };
  }
  
  if (error.message?.includes('User already registered')) {
    return {
      message: 'An account with this email already exists. Try signing in instead.',
      isBackendIssue: false
    };
  }
  
  if (error.message?.includes('Password should be at least')) {
    return {
      message: 'Password must be at least 6 characters long.',
      isBackendIssue: false
    };
  }
  
  // Default error handling
  return {
    message: error.message || 'An unexpected error occurred. Please try again.',
    isBackendIssue: error.message?.includes('Database error') || 
                   error.message?.includes('unexpected_failure') ||
                   error.message?.includes('querying schema') ||
                   (error.status >= 500 && error.status < 600)
  };
};