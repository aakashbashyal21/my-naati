import React, { useState } from 'react';
import { User, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User as SupabaseUser } from '@supabase/supabase-js';
import LanguageSelector from '../ui/LanguageSelector';
import { useAuth } from '../../../hooks/useAuth';

interface HeaderProps {
  user: SupabaseUser;
  onSignOut: () => void;
  selectedLanguageId?: string | undefined;
  onLanguageChange: (languageId: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onSignOut,
  selectedLanguageId,
  onLanguageChange
}) => {
  const [userRole, setUserRole] = useState<string>('user');
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  React.useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { getUserProfile } = await import('../../../lib/database');
        const profile = await getUserProfile(user.id);
        setUserRole(profile?.role || 'user');
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    
    checkUserRole();
  }, [user.id]);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - could add breadcrumbs or page title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </div>

        {/* Right side - Language selector and user menu */}
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <LanguageSelector
            selectedLanguageId={selectedLanguageId}
            onLanguageChange={onLanguageChange}
          />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {userRole === 'super_admin' ? 'Super Admin' : 
                   userRole === 'admin' ? 'Administrator' : 'Student'}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <Link
                    to="/dashboard/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm">Settings</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 