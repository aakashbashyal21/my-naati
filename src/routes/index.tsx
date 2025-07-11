import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LandingPageWrapper from '../components/landing/LandingPageWrapper';
import AuthFormWrapper from '../components/auth/AuthFormWrapper';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import LoadingSpinner from '../components/shared/ui/LoadingSpinner';
import SupabaseConnectionCheck from '../components/SupabaseConnectionCheck';
import { supabase } from '../lib/supabase';

// Route Components
import Dashboard from '../components/features/admin/EnhancedDashboard';
import Analytics from '../components/features/admin/Analytics';
import Categories from '../components/features/practice/Categories';
import VocabListViewer from '../components/features/vocabulary/VocabListViewer';
import Gamification from '../components/features/admin/Gamification';
import Settings from '../components/features/admin/Settings';
import AdminPanel from '../components/features/admin/AdminPanel';
import AdManagement from '../components/advertisements/AdManagement';
import AdAnalyticsDashboard from '../components/advertisements/AdAnalyticsDashboard';

// Middleware Components
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import RateLimitProvider from './RateLimitProvider';
import LoggingProvider from './LoggingProvider';

// Error Boundaries
import ErrorBoundary from '../components/shared/ui/ErrorBoundary';
import NotFound from '../components/shared/ui/NotFound';

// App Root Component with Providers
const AppRoot: React.FC = () => {
  const { user, loading } = useAuth();

  // Check if Supabase is configured
  if (!supabase) {
    return <SupabaseConnectionCheck />;
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <LoggingProvider>
        <RateLimitProvider>
          <RouterProvider router={createRouter(user)} />
        </RateLimitProvider>
      </LoggingProvider>
    </ErrorBoundary>
  );
};

// Router Configuration
const createRouter = (user: any) => {
  return createBrowserRouter([
    {
      path: '/',
      element: user ? <Navigate to="/dashboard" replace /> : <LandingPageWrapper />,
      errorElement: <NotFound />
    },
    {
      path: '/auth',
      element: user ? <Navigate to="/dashboard" replace /> : <AuthFormWrapper />,
      errorElement: <NotFound />
    },
    {
      path: '/dashboard',
      element: (
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: <Dashboard />
        },
        {
          path: 'analytics',
          element: <Analytics userRole="user" />
        },
        {
          path: 'practice',
          element: <Categories />
        },
        {
          path: 'vocab-list',
          element: <VocabListViewer onBack={() => {}} />
        },
        {
          path: 'achievements',
          element: <Gamification />
        },
        {
          path: 'settings',
          element: <Settings />
        },
        {
          path: 'admin',
          element: (
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          )
        },
        {
          path: 'ads',
          element: (
            <AdminRoute>
              <AdManagement />
            </AdminRoute>
          )
        },
        {
          path: 'ad-analytics',
          element: (
            <AdminRoute>
              <AdAnalyticsDashboard />
            </AdminRoute>
          )
        }
      ]
    },
    {
      path: '*',
      element: <NotFound />
    }
  ]);
};

export default AppRoot; 