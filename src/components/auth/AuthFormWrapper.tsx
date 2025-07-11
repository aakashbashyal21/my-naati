import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AuthForm from './AuthForm';

const AuthFormWrapper: React.FC = () => {
  const { signUp, signIn, loading, error } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthSubmit = async (email: string, password: string) => {
    if (authMode === 'signup') {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
    
    // Redirect to intended page or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  };

  return (
    <AuthForm
      mode={authMode}
      onSubmit={handleAuthSubmit}
      onModeChange={setAuthMode}
      loading={loading}
      error={error}
    />
  );
};

export default AuthFormWrapper; 