import React, { useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import EnhancedDashboard from './EnhancedDashboard';
import Categories from './Categories';
import Analytics from './Analytics';
import Gamification from './Gamification';
import Settings from './Settings';
import AdminPanel from './AdminPanel';
import AdManagement from '../advertisements/AdManagement';
import AdAnalyticsDashboard from '../advertisements/AdAnalyticsDashboard';
import VocabListViewer from '../VocabListViewer';

interface UserDashboardProps {
  user: SupabaseUser;
  onSignOut: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onSignOut }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'super_admin'>('user');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  React.useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { getUserProfile } = await import('../../lib/database');
        const profile = await getUserProfile(user.id);
        setUserRole(profile?.role || 'user');
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    
    checkUserRole();
  }, [user.id]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <EnhancedDashboard />;
      case 'analytics':
        return <Analytics userRole={userRole} />;
      case 'categories':
        return <Categories />;
      case 'practice':
        return <Categories />;
      case 'achievements':
        return <Gamification />;
      case 'vocab-list':
        return <VocabListViewer onBack={() => setCurrentView('dashboard')} />;
      case 'admin':
        return <AdminPanel />;
      case 'ads':
        return <AdManagement />;
      case 'ad-analytics':
        return <AdAnalyticsDashboard />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <Sidebar 
        user={user}
        onSignOut={onSignOut}
        currentView={currentView}
        onViewChange={setCurrentView}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={handleMobileMenuToggle}
      />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="lg:hidden h-16"></div> {/* Spacer for mobile menu button */}
        {renderContent()}
      </main>
    </div>
  );
};

export default UserDashboard;