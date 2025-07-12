import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';
import ConsentManager from '../../advertisements/ConsentManager';
import { LanguageProvider, useLanguage } from '../../../contexts/LanguageContext';

const DashboardContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const { selectedLanguageId, setSelectedLanguageId } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (!user) {
    return null; // This should be handled by ProtectedRoute
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 relative">
        <Sidebar 
          user={user}
          onSignOut={signOut}
          currentView={location.pathname.split('/').pop() || 'dashboard'}
          onViewChange={() => {}} // This will be handled by React Router
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={handleMobileMenuToggle}
        />
        <div className="flex-1 flex flex-col lg:ml-0">
          <Header
            user={user}
            onSignOut={signOut}
            selectedLanguageId={selectedLanguageId}
            onLanguageChange={setSelectedLanguageId}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="lg:hidden h-16"></div> {/* Spacer for mobile menu button */}
            <Outlet />
          </main>
        </div>
      </div>
      <ConsentManager />
    </>
  );
};

const DashboardLayout: React.FC = () => {
  return (
    <LanguageProvider>
      <DashboardContent />
    </LanguageProvider>
  );
};

export default DashboardLayout; 