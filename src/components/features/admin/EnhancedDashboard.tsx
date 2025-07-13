import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Award,
  BarChart3,
  Calendar,
  Loader2,
  Play,
  Download,
  Filter,
  RefreshCw,
  Users,
  Target,
  Zap,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  getUserStatsByLanguage, 
  getUserStatsDetailedByLanguage, 
  getTestSetsByLanguage, 
  UserStats, 
  TestSet,
  TestSetProgress,
  getUserAnalyticsByLanguage,
  UserAnalytics
} from '../../../lib/database';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import TargetedAdContainer from '../../advertisements/TargetedAdContainer';

interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuth();
  const { selectedLanguageId, isLoading: languageLoading } = useLanguage();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<TestSetProgress[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [recentTestSets, setRecentTestSets] = useState<TestSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user || !selectedLanguageId || languageLoading) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load comprehensive dashboard data for the selected language
        const [userStats, detailedUserStats, testSets, userAnalytics] = await Promise.all([
          getUserStatsByLanguage(user.id, selectedLanguageId),
          getUserStatsDetailedByLanguage(user.id, selectedLanguageId),
          getTestSetsByLanguage(selectedLanguageId),
          getUserAnalyticsByLanguage(user.id, selectedLanguageId)
        ]);
        
        setStats(userStats);
        setDetailedStats(detailedUserStats);
        setRecentTestSets(testSets.slice(0, 5));
        setAnalytics(userAnalytics);
        
        // Generate smart notifications
        generateNotifications(userStats, detailedUserStats, userAnalytics);
        
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, selectedLanguageId, languageLoading, filterPeriod]);

  const generateNotifications = (
    stats: UserStats, 
    detailed: TestSetProgress[], 
    analytics: UserAnalytics
  ) => {
    const newNotifications: NotificationItem[] = [];

    // Streak notifications
    if (analytics.current_streak >= 7) {
      newNotifications.push({
        id: 'streak-milestone',
        type: 'success',
        title: 'Streak Milestone!',
        message: `Amazing! You've maintained a ${analytics.current_streak}-day study streak.`,
        timestamp: new Date(),
        read: false
      });
    } else if (analytics.current_streak === 0) {
      newNotifications.push({
        id: 'streak-broken',
        type: 'warning',
        title: 'Streak Opportunity',
        message: 'Start a new study streak today! Consistency is key to NAATI success.',
        timestamp: new Date(),
        read: false
      });
    }

    // Progress notifications
    const highProgressSets = detailed.filter(set => set.completion_percentage >= 80);
    if (highProgressSets.length > 0) {
      newNotifications.push({
        id: 'near-completion',
        type: 'info',
        title: 'Almost There!',
        message: `You're close to completing ${highProgressSets.length} test set${highProgressSets.length > 1 ? 's' : ''}.`,
        timestamp: new Date(),
        read: false
      });
    }

    // Cards needing practice
    if (stats.needs_practice_cards > 10) {
      newNotifications.push({
        id: 'practice-needed',
        type: 'warning',
        title: 'Practice Reminder',
        message: `${stats.needs_practice_cards} cards need practice. Review them to strengthen your knowledge.`,
        timestamp: new Date(),
        read: false
      });
    }

    setNotifications(newNotifications);
  };

  const exportData = async (format: 'csv' | 'json' | 'pdf') => {
    if (!stats || !detailedStats) return;

    const data = {
      summary: stats,
      detailed: detailedStats,
      analytics: analytics,
      exportDate: new Date().toISOString()
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `naati-progress-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const csvContent = [
        ['Test Set', 'Category', 'Total Cards', 'Known', 'Learning', 'Needs Practice', 'Completion %'],
        ...detailedStats.map(set => [
          set.test_set_name,
          set.category_name,
          set.total_cards,
          set.known_cards,
          set.learning_cards,
          set.needs_practice_cards,
          `${set.completion_percentage}%`
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `naati-progress-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getPerformanceInsights = () => {
    if (!analytics || !detailedStats) return [];

    const insights = [];

    // Study consistency insight
    if (analytics.current_streak > 0) {
      insights.push({
        type: 'positive',
        title: 'Great Consistency!',
        message: `Your ${analytics.current_streak}-day streak shows excellent study habits.`
      });
    }

    // Progress insight
    const avgCompletion = detailedStats.reduce((sum, set) => sum + set.completion_percentage, 0) / detailedStats.length;
    if (avgCompletion > 70) {
      insights.push({
        type: 'positive',
        title: 'Strong Progress',
        message: `You're averaging ${avgCompletion.toFixed(1)}% completion across test sets.`
      });
    } else if (avgCompletion < 30) {
      insights.push({
        type: 'suggestion',
        title: 'Focus Opportunity',
        message: 'Consider focusing on fewer test sets to build momentum.'
      });
    }

    // Level insight
    if (analytics.user_level >= 5) {
      insights.push({
        type: 'achievement',
        title: 'Level Master!',
        message: `You've reached level ${analytics.user_level}. You're well on your way to NAATI success!`
      });
    }

    return insights;
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No data available</p>
        </div>
      </div>
    );
  }

  const insights = getPerformanceInsights();

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header Advertisement */}
      <TargetedAdContainer 
        placement="header" 
        className="mb-6 flex justify-center" 
        fallbackContent={
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4 text-center">
            <p className="text-gray-600">Welcome back! Continue your NAATI preparation journey.</p>
          </div>
        }
      />

      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Enhanced Dashboard</h1>
          <p className="text-gray-600">Track your learning progress and optimize your NAATI preparation</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div key={notification.id} className="p-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">{notification.title}</h4>
                            <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                            <p className="text-gray-400 text-xs mt-2">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filter */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>

          {/* Export */}
          <div className="relative group">
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-12 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => exportData('csv')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportData('json')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
              >
                Export JSON
              </button>
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar Advertisement */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <TargetedAdContainer placement="sidebar_left" />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Performance Insights */}
          {insights.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Insights</h2>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    insight.type === 'positive' ? 'bg-green-50 border-green-500' :
                    insight.type === 'achievement' ? 'bg-purple-50 border-purple-500' :
                    'bg-blue-50 border-blue-500'
                  }`}>
                    <h3 className={`font-medium ${
                      insight.type === 'positive' ? 'text-green-900' :
                      insight.type === 'achievement' ? 'text-purple-900' :
                      'text-blue-900'
                    }`}>
                      {insight.title}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      insight.type === 'positive' ? 'text-green-700' :
                      insight.type === 'achievement' ? 'text-purple-700' :
                      'text-blue-700'
                    }`}>
                      {insight.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cards</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_cards}</p>
                  <p className="text-xs text-gray-500 mt-1">Available to study</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Known Cards</p>
                  <p className="text-2xl font-bold text-green-600">{stats.known_cards}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.total_cards > 0 ? Math.round((stats.known_cards / stats.total_cards) * 100) : 0}% mastered
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Need Practice</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.needs_practice_cards}</p>
                  <p className="text-xs text-gray-500 mt-1">Requires review</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Level</p>
                  <p className="text-2xl font-bold text-purple-600">{analytics?.user_level || 1}</p>
                  <p className="text-xs text-gray-500 mt-1">{analytics?.total_points || 0} XP</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Overview and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Progress Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Progress Overview</h2>
                </div>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All
                </button>
              </div>
              
              {detailedStats.length > 0 ? (
                <div className="space-y-4">
                  {detailedStats.slice(0, 4).map((stat) => (
                    <div key={stat.test_set_id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 truncate">{stat.test_set_name}</h3>
                        <span className="text-sm font-medium text-gray-600">
                          {Math.round(stat.completion_percentage)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {stat.category_name} • {stat.known_cards}/{stat.total_cards} known
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stat.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No progress data yet</p>
                  <p className="text-sm">Start practicing to see your progress here</p>
                </div>
              )}
            </div>

            {/* Enhanced Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Zap className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              </div>
              
              <div className="space-y-4">
                {detailedStats.length > 0 && (
                  <button className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors group">
                    <div className="flex items-center space-x-3">
                      <Play className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <h3 className="font-medium text-blue-900">Continue Learning</h3>
                        <p className="text-sm text-blue-700">
                          Resume {detailedStats[0]?.test_set_name}
                        </p>
                      </div>
                    </div>
                  </button>
                )}
                
                {stats.needs_practice_cards > 0 && (
                  <button className="w-full p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-left transition-colors group">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-yellow-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <h3 className="font-medium text-yellow-900">Practice Weak Cards</h3>
                        <p className="text-sm text-yellow-700">
                          {stats.needs_practice_cards} cards need practice
                        </p>
                      </div>
                    </div>
                  </button>
                )}
                
                <button className="w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors group">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-medium text-purple-900">Browse Categories</h3>
                      <p className="text-sm text-purple-700">Explore available vocabulary sets</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors group">
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-medium text-green-900">Set Study Goal</h3>
                      <p className="text-sm text-green-700">Plan your daily study target</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar Advertisement */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <TargetedAdContainer placement="sidebar_right" />
        </div>
      </div>
      
      {/* Footer Advertisement */}
      <TargetedAdContainer placement="footer" className="mt-8 flex justify-center" />
    </div>
  );
};

export default EnhancedDashboard;