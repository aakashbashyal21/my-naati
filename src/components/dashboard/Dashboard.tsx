import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Award,
  BarChart3,
  Calendar,
  Loader2,
  Play
} from 'lucide-react';
import { 
  getUserStats, 
  getUserStatsDetailed, 
  getTestSets, 
  UserStats, 
  TestSet,
  TestSetProgress
} from '../../lib/database';
import { useAuth } from '../../hooks/useAuth';
import TargetedAdContainer from '../advertisements/TargetedAdContainer';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<TestSetProgress[]>([]);
  const [recentTestSets, setRecentTestSets] = useState<TestSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load user stats, detailed stats, and recent test sets in parallel
        const [userStats, detailedUserStats, testSets] = await Promise.all([
          getUserStats(user.id),
          getUserStatsDetailed(user.id),
          getTestSets()
        ]);
        
        setStats(userStats);
        setDetailedStats(detailedUserStats);
        setRecentTestSets(testSets.slice(0, 3)); // Show only 3 most recent
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const calculateStreak = () => {
    // TODO: Implement actual streak calculation based on last_reviewed dates
    const recentActivity = detailedStats.filter(stat => 
      stat.last_studied && 
      new Date(stat.last_studied) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    return recentActivity.length;
  };
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No data available</p>
        </div>
      </div>
    );
  }

  const streakDays = calculateStreak();

  return (
    <div className="p-8">
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
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your learning progress and achievements</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cards</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_cards}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Known Cards</p>
              <p className="text-2xl font-bold text-green-600">{stats.known_cards}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Need Practice</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.needs_practice_cards}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Streak Days</p>
              <p className="text-2xl font-bold text-purple-600">{streakDays}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar Advertisement */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <TargetedAdContainer placement="sidebar_left" />
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Progress Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Your Progress</h2>
          </div>
          
          {detailedStats.length > 0 ? (
            <div className="space-y-4">
              {detailedStats.slice(0, 4).map((stat) => (
                <div key={stat.test_set_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{stat.test_set_name}</h3>
                    <p className="text-sm text-gray-600">
                      {stat.category_name} • {stat.known_cards}/{stat.total_cards} known
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {Math.round(stat.completion_percentage)}%
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stat.completion_percentage}%` }}
                      />
                    </div>
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

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Calendar className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          
          <div className="space-y-4">
            {detailedStats.length > 0 && (
              <button className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
                <div className="flex items-center space-x-3">
                  <Play className="h-5 w-5 text-blue-600" />
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
              <button className="w-full p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-left transition-colors">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h3 className="font-medium text-yellow-900">Practice Weak Cards</h3>
                    <p className="text-sm text-yellow-700">
                      {stats.needs_practice_cards} cards need practice
                    </p>
                  </div>
                </div>
              </button>
            )}
            
            <button className="w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="font-medium text-purple-900">Browse Categories</h3>
                  <p className="text-sm text-purple-700">Explore available vocabulary sets</p>
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

export default Dashboard;