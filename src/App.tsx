import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/auth/AuthForm';
import LandingPage from './components/landing/LandingPage';
import UserDashboard from './components/dashboard/UserDashboard';
import SupabaseConnectionCheck from './components/SupabaseConnectionCheck';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { initializeAdCompliance } from './lib/adCompliance';
import ConsentManager from './components/advertisements/ConsentManager';

// Legacy components - will be integrated into dashboard in Phase 2
// import FileUploader from './components/FileUploader';
// import CSVPreview from './components/CSVPreview';
// import FlashcardViewer from './components/FlashcardViewer';

function App() {
  const { user, loading, error, signUp, signIn, signOut } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showAuth, setShowAuth] = useState(false);
  
  // Initialize ad compliance on app start
  React.useEffect(() => {
    initializeAdCompliance();
  }, []);

  // Check if Supabase is configured
  if (!supabase) {
    return <SupabaseConnectionCheck />;
  }

  const handleAuthSubmit = async (email: string, password: string) => {
    if (authMode === 'signup') {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  // Show authentication form if user is not logged in
  if (!user) {
    // Show landing page first, then auth form when user clicks get started
    if (!showAuth) {
      return <LandingPage onGetStarted={() => setShowAuth(true)} />;
    }
    
    return (
      <AuthForm
        mode={authMode}
        onSubmit={handleAuthSubmit}
        onModeChange={setAuthMode}
        loading={loading}
        error={error}
      />
    );
  }

  // Show user dashboard if logged in
  return (
    <>
      <UserDashboard user={user} onSignOut={signOut} />
      <ConsentManager />
    </>
  );
}

export default App;