import React from 'react';
import { AlertCircle, Database, ExternalLink, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { checkDatabaseConnection, checkAuthServiceHealth } from '../lib/supabase';

const SupabaseConnectionCheck: React.FC = () => {
  const [dbStatus, setDbStatus] = React.useState<{ connected: boolean; error: string | null } | null>(null);
  const [authStatus, setAuthStatus] = React.useState<{ healthy: boolean; error: string | null; details?: string } | null>(null);
  const [checking, setChecking] = React.useState(false);
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const hasUrl = !!supabaseUrl;
  const hasKey = !!supabaseAnonKey;
  
  const isValidUrl = (url: string) => {
    if (!url || url === 'your_supabase_url_here') return false;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('supabase.co') || 
             urlObj.hostname.includes('localhost') ||
             urlObj.hostname.includes('127.0.0.1');
    } catch {
      return false;
    }
  };
  
  const isValidKey = (key: string) => {
    if (!key || key === 'your_supabase_anon_key_here') return false;
    return key.length > 20;
  };
  
  const urlValid = isValidUrl(supabaseUrl || '');
  const keyValid = isValidKey(supabaseAnonKey || '');
  const isConfigured = hasUrl && hasKey && urlValid && keyValid;

  const getUrlStatus = () => {
    if (!hasUrl) return { status: '✗ Missing', color: 'text-red-600' };
    if (supabaseUrl === 'your_supabase_url_here') return { status: '✗ Placeholder', color: 'text-red-600' };
    if (!urlValid) return { status: '✗ Invalid Format', color: 'text-red-600' };
    return { status: '✓ Valid', color: 'text-green-600' };
  };

  const getKeyStatus = () => {
    if (!hasKey) return { status: '✗ Missing', color: 'text-red-600' };
    if (supabaseAnonKey === 'your_supabase_anon_key_here') return { status: '✗ Placeholder', color: 'text-red-600' };
    if (!keyValid) return { status: '✗ Invalid Format', color: 'text-red-600' };
    return { status: '✓ Valid', color: 'text-green-600' };
  };

  const urlStatus = getUrlStatus();
  const keyStatus = getKeyStatus();

  const handleRefresh = () => {
    window.location.reload();
  };

  const testDatabaseConnection = async () => {
    if (!isConfigured) return;
    
    setChecking(true);
    
    // Test both database and auth service
    const [dbResult, authResult] = await Promise.all([
      checkDatabaseConnection(),
      checkAuthServiceHealth()
    ]);
    
    setDbStatus(dbResult);
    setAuthStatus(authResult);
    setChecking(false);
  };

  React.useEffect(() => {
    if (isConfigured) {
      testDatabaseConnection();
    }
  }, [isConfigured]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Database className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">NaatiNuggets</h1>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {isConfigured ? 'Supabase Connected' : 'Supabase Connection Required'}
            </h2>
            <p className="text-gray-600">
              {isConfigured 
                ? 'Your Supabase connection is active'
                : 'Please connect to Supabase to enable authentication and data storage'
              }
            </p>
          </div>

          {/* Connection Status */}
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
            isConfigured 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            {isConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                isConfigured ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {isConfigured ? 'Supabase Connected' : 'Supabase Not Connected'}
              </p>
              <p className={`text-sm ${
                isConfigured ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {isConfigured 
                  ? 'Authentication and data storage are ready'
                  : 'Click the "Connect to Supabase" button in the top right corner to get started'
                }
              </p>
            </div>
          </div>

          {/* Database Connection Status */}
          {isConfigured && (
            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
              dbStatus?.connected 
                ? 'bg-green-50 border border-green-200' 
                : dbStatus?.connected === false
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              {checking ? (
                <RefreshCw className="h-5 w-5 text-gray-600 animate-spin flex-shrink-0" />
              ) : dbStatus?.connected ? (
                <Wifi className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : dbStatus?.connected === false ? (
                <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0" />
              ) : (
                <Database className="h-5 w-5 text-gray-600 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  dbStatus?.connected 
                    ? 'text-green-800' 
                    : dbStatus?.connected === false
                    ? 'text-red-800'
                    : 'text-gray-800'
                }`}>
                  {checking 
                    ? 'Testing Database Connection...'
                    : dbStatus?.connected 
                    ? 'Database Connected' 
                    : dbStatus?.connected === false
                    ? 'Database Connection Failed'
                    : 'Database Status Unknown'
                  }
                </p>
                <p className={`text-sm ${
                  dbStatus?.connected 
                    ? 'text-green-700' 
                    : dbStatus?.connected === false
                    ? 'text-red-700'
                    : 'text-gray-700'
                }`}>
                  {checking 
                    ? 'Checking database schema and connectivity...'
                    : dbStatus?.connected 
                    ? 'Database schema is accessible and ready'
                    : dbStatus?.error
                    ? `Error: ${dbStatus.error}`
                    : 'Click "Test Connection" to check database status'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Auth Service Status */}
          {isConfigured && (
            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
              authStatus?.healthy 
                ? 'bg-green-50 border border-green-200' 
                : authStatus?.healthy === false
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              {checking ? (
                <RefreshCw className="h-5 w-5 text-gray-600 animate-spin flex-shrink-0" />
              ) : authStatus?.healthy ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : authStatus?.healthy === false ? (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              ) : (
                <Database className="h-5 w-5 text-gray-600 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  authStatus?.healthy 
                    ? 'text-green-800' 
                    : authStatus?.healthy === false
                    ? 'text-red-800'
                    : 'text-gray-800'
                }`}>
                  {checking 
                    ? 'Testing Auth Service...'
                    : authStatus?.healthy 
                    ? 'Auth Service Healthy' 
                    : authStatus?.healthy === false
                    ? 'Auth Service Issues Detected'
                    : 'Auth Service Status Unknown'
                  }
                </p>
                <p className={`text-sm ${
                  authStatus?.healthy 
                    ? 'text-green-700' 
                    : authStatus?.healthy === false
                    ? 'text-red-700'
                    : 'text-gray-700'
                }`}>
                  {checking 
                    ? 'Checking authentication service health...'
                    : authStatus?.healthy 
                    ? 'Authentication service is working properly'
                    : authStatus?.error
                    ? `Error: ${authStatus.error}`
                    : 'Click "Test Connection" to check auth service status'
                  }
                </p>
                {authStatus?.details && (
                  <p className="text-xs text-red-600 mt-1">
                    Details: {authStatus.details}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Connection Status:</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Supabase URL:</span>
                <span className={urlStatus.color}>
                  {urlStatus.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Key:</span>
                <span className={keyStatus.color}>
                  {keyStatus.status}
                </span>
              </div>
              {isConfigured && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Database:</span>
                  <span className={
                    dbStatus?.connected 
                      ? 'text-green-600' 
                      : dbStatus?.connected === false
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }>
                    {checking 
                      ? '⏳ Testing...'
                      : dbStatus?.connected 
                      ? '✓ Connected' 
                      : dbStatus?.connected === false
                      ? '✗ Failed'
                      : '? Unknown'
                    }
                  </span>
                </div>
              )}
              {isConfigured && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Auth Service:</span>
                  <span className={
                    authStatus?.healthy 
                      ? 'text-green-600' 
                      : authStatus?.healthy === false
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }>
                    {checking 
                      ? '⏳ Testing...'
                      : authStatus?.healthy 
                      ? '✓ Healthy' 
                      : authStatus?.healthy === false
                      ? '✗ Issues'
                      : '? Unknown'
                    }
                  </span>
                </div>
              )}
            </div>
            {supabaseUrl && supabaseUrl !== 'your_supabase_url_here' && (
              <div className="mt-2 text-xs text-gray-500 break-all">
                URL: {supabaseUrl}
              </div>
            )}
          </div>

          {!isConfigured && (
            <>
              {/* Instructions */}
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Setup Instructions:</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Look for the "Connect to Supabase" button in the top right</li>
                    <li>Click it to open the Supabase setup dialog</li>
                    <li>Enter your Supabase project URL and API key</li>
                    <li>Click "Save" to connect your project</li>
                    <li>Refresh this page to see the updated status</li>
                  </ol>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Don't have a Supabase account?</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Create a free account at Supabase to get started
                  </p>
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Visit Supabase.com</span>
                  </a>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="text-center mb-4">
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Status</span>
                </button>
              </div>
            </>
          )}

          {isConfigured && (
            <div className="text-center mb-4">
              <button
                onClick={testDatabaseConnection}
                disabled={checking}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="h-4 w-4" />
                <span>{checking ? 'Testing...' : 'Test Connections'}</span>
              </button>
            </div>
          )}

          {!isConfigured && (
            <>
              {/* Refresh Button */}
              <div className="text-center mb-4">
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Status</span>
                </button>
              </div>
            </>
          )}

          {/* Error Help */}
          {(dbStatus?.connected === false || authStatus?.healthy === false) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">🚨 Critical Backend Issues Detected:</h3>
              <div className="text-sm text-red-800 space-y-2">
                <p><strong>Your Supabase project has serious backend problems that require immediate attention.</strong></p>
                <p>Common symptoms include "Database error querying schema" and "unexpected_failure" errors:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li><strong>URGENT:</strong> Check Supabase Dashboard → Logs → Auth logs for schema errors</li>
                  <li><strong>Database Health:</strong> Verify Database section shows no connectivity issues</li>
                  <li><strong>Auth Tables:</strong> Ensure auth.users, auth.identities tables exist and aren't corrupted</li>
                  <li><strong>Migrations:</strong> Verify all database migrations applied without errors</li>
                  <li><strong>Resources:</strong> Check if project has hit resource limits or quotas</li>
                  <li><strong>Restart:</strong> Try restarting Supabase project services from dashboard</li>
                  <li><strong>Support:</strong> Contact Supabase support if issues persist after restart</li>
                </ol>
                {authStatus?.healthy === false && (
                  <div className="mt-3 p-3 bg-red-100 rounded border-l-4 border-red-500">
                    <p className="font-medium">🔥 Critical Auth Service Failure:</p>
                    <p>Your Supabase authentication service cannot access the database schema. This is a serious backend issue requiring immediate investigation of your project's database connectivity and auth table integrity.</p>
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800 text-xs">
                        <strong>Status Discrepancy:</strong> Your project may show "green" status while having internal database problems. Focus on the Logs section for actual error details.
                      </p>
                    </div>
                    <div className="mt-2">
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-red-700 hover:text-red-800 text-sm font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open Supabase Dashboard</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Demo Note */}
          <div className="text-center text-xs text-gray-500">
            <p>This app requires Supabase for user authentication and data storage</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseConnectionCheck;