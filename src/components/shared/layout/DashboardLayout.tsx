import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from './Sidebar';
import ConsentManager from '../../advertisements/ConsentManager';

const DashboardLayout: React.FC = () => {
  const { user, signOut } = useAuth();
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
        <main className="flex-1 overflow-y-auto lg:ml-0">
          <div className="lg:hidden h-16"></div> {/* Spacer for mobile menu button */}
          <Outlet />
        </main>
      </div>
      <ConsentManager />
    </>
  );
};

export default DashboardLayout; 