import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  supabase, 
  signUp as supabaseSignUp, 
  signIn as supabaseSignIn, 
  signOut as supabaseSignOut, 
  resetPassword as supabaseResetPassword,
  getCurrentUser 
} from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { user, error } = await getCurrentUser();
      if (error) {
        setError(error.message);
      } else {
        setUser(user);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes only if supabase is configured
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
          setError(null);
        }
      );

      return () => subscription.unsubscribe();
    } else {
      // If supabase is not configured, just set loading to false
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseSignUp(email, password);
      
      if (error) {
        // Use the enhanced error message from supabase.ts
        if (error.isBackendIssue) {
          setError(`🚨 BACKEND ISSUE: ${error.message}`);
        } else {
          setError(error.message);
        }
      }
      
      setLoading(false);
      return { data, error };
    } catch (err) {
      console.error('Unexpected error in signUp:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
      return { data: null, error: { message: 'Unexpected error occurred' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseSignIn(email, password);
      
      if (error) {
        // Use the enhanced error message from supabase.ts
        if (error.isBackendIssue) {
          setError(`🚨 BACKEND ISSUE: ${error.message}`);
        } else {
          setError(error.message);
        }
      }
      
      setLoading(false);
      return { data, error };
    } catch (err) {
      console.error('Unexpected error in signIn:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
      return { data: null, error: { message: 'Unexpected error occurred' } };
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseResetPassword(email);
      
      if (error) {
        setError(error.message);
      }
      
      setLoading(false);
      return { data, error };
    } catch (err) {
      console.error('Unexpected error in resetPassword:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
      return { data: null, error: { message: 'Unexpected error occurred' } };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabaseSignOut();
      if (error) {
        setError(error.message);
      }
      setLoading(false);
      return { error };
    } catch (err) {
      console.error('Unexpected error in signOut:', err);
      setError('An unexpected error occurred during signout.');
      setLoading(false);
      return { error: { message: 'Unexpected error occurred' } };
    }
  };

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    resetPassword,
    signOut,
  };
};