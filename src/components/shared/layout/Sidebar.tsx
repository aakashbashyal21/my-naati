import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  User, 
  LogOut, 
  Settings, 
  BarChart3,
  Crown,
  Megaphone,
  Trophy,
  Menu,
  X,
  List
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface SidebarProps {
  user: SupabaseUser;
  onSignOut: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  onSignOut, 
  isMobileMenuOpen,
  onMobileMenuToggle
}) => {
  const location = useLocation();
  // Check if user has admin privileges
  const [userRole, setUserRole] = useState<string>('user');
  
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
  
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
    { id: 'practice', label: 'Practice', icon: BookOpen, path: '/dashboard/practice' },
    { id: 'vocab-list', label: 'My Vocab List', icon: List, path: '/dashboard/vocab-list' },
    { id: 'achievements', label: 'Achievements', icon: Trophy, path: '/dashboard/achievements' },
  ];

  const adminItems = [
    { id: 'admin', label: 'Admin Panel', icon: Crown, path: '/dashboard/admin' },
    { id: 'ads', label: 'Advertisements', icon: Megaphone, path: '/dashboard/ads' },
    { id: 'ad-analytics', label: 'Ad Analytics', icon: BarChart3, path: '/dashboard/ad-analytics' },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-600" />
        ) : (
          <Menu className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onMobileMenuToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">NaatiNuggets</h1>
            <p className="text-sm text-gray-600">NAATI CCL Prep</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => {
                  // Close mobile menu when item is selected
                  if (window.innerWidth < 1024) {
                    onMobileMenuToggle();
                  }
                }}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-8">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Administration
            </div>
            <div className="space-y-2 mt-2">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => {
                      // Close mobile menu when item is selected
                      if (window.innerWidth < 1024) {
                        onMobileMenuToggle();
                      }
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors
                      ${isActive 
                        ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.email}
            </p>
            <p className="text-xs text-gray-500">
              {userRole === 'super_admin' ? 'Super Admin' : 
               userRole === 'admin' ? 'Administrator' : 'Student'}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Link
            to="/dashboard/settings"
            onClick={() => {
              if (window.innerWidth < 1024) {
                onMobileMenuToggle();
              }
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </Link>
          
          <button
            onClick={onSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default Sidebar;