import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Calendar,
  Clock,
  Target,
  Zap,
  BookOpen,
  Users,
  Activity,
  Loader2,
  Star,
  Trophy,
  Flame,
  Crown,
  Shield,
  Database,
  Globe,
  UserCheck
} from 'lucide-react';
import { 
  getUserAnalyticsByLanguage, 
  getAdminAnalytics,
  UserAnalytics, 
  AdminAnalytics 
} from '../../../lib/database';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import TargetedAdContainer from '../../advertisements/TargetedAdContainer';

interface AnalyticsProps {
  userRole: 'user' | 'admin' | 'super_admin';
}

const Analytics: React.FC<AnalyticsProps> = ({ userRole }) => {
  const { user } = useAuth();
  const { selectedLanguageId, isLoading: languageLoading } = useLanguage();
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load admin analytics for super admins (independent of language)
        if (userRole === 'super_admin') {
          const adminAnalyticsData = await getAdminAnalytics();
          setAdminAnalytics(adminAnalyticsData);
        }
        
        // Load user analytics only for non-super-admin users and if language is selected
        if (userRole !== 'super_admin' && selectedLanguageId && !languageLoading) {
          const userAnalyticsData = await getUserAnalyticsByLanguage(user.id, selectedLanguageId);
          setUserAnalytics(userAnalyticsData);
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user, userRole]);

  // Load user analytics when language changes (only for non-super-admin users)
  useEffect(() => {
    if (user && userRole !== 'super_admin' && selectedLanguageId && !languageLoading) {
      const loadUserAnalytics = async () => {
        try {
          const userAnalyticsData = await getUserAnalyticsByLanguage(user.id, selectedLanguageId);
          setUserAnalytics(userAnalyticsData);
        } catch (err) {
          console.error('Error loading user analytics:', err);
        }
      };
      loadUserAnalytics();
    }
  }, [user, userRole, selectedLanguageId, languageLoading]);

  const getIconForAchievement = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'play': Activity,
      'flame': Flame,
      'zap': Zap,
      'crown': Crown,
      'book-open': BookOpen,
      'brain': Target,
      'award': Award,
      'check-circle': Target,
      'star': Star
    };
    return iconMap[iconName] || Trophy;
  };

  const getBadgeColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'blue': 'bg-blue-100 text-blue-800 border-blue-200',
      'green': 'bg-green-100 text-green-800 border-green-200',
      'purple': 'bg-purple-100 text-purple-800 border-purple-200',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'orange': 'bg-orange-100 text-orange-800 border-orange-200',
      'gold': 'bg-yellow-100 text-yellow-900 border-yellow-300',
      'red': 'bg-red-100 text-red-800 border-red-200'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading analytics...</span>
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

  return (
    <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-8">
      {/* Header Advertisement */}
      <TargetedAdContainer 
        placement="header" 
        className="mb-6 flex justify-center" 
        fallbackContent={
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-4 text-center">
            <p className="text-gray-600">📊 Track your progress and optimize your NAATI study plan!</p>
          </div>
        }
      />
      
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          {userRole === 'super_admin' ? (
            <Shield className="h-8 w-8 text-purple-600" />
          ) : (
            <BarChart3 className="h-8 w-8 text-blue-600" />
          )}
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'super_admin' ? 'Platform Analytics' : 'Your Progress Analytics'}
          </h1>
        </div>
        <p className="text-gray-600">
          {userRole === 'super_admin' 
            ? 'Monitor platform performance, user engagement, and system health across the entire platform' 
            : 'Track your personal learning progress and achievements'
          }
        </p>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar Advertisement */}
        
        {/* Main Content */}
        <div className="flex-1">
      {/* Personal Analytics Section (Only for non-super-admin users) */}
      {userAnalytics && userRole !== 'super_admin' && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Personal Progress</h2>
          
          {/* Personal Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Streak</p>
                  <p className="text-3xl font-bold text-orange-600">{userAnalytics.current_streak}</p>
                  <p className="text-xs text-gray-500">days</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Flame className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Level</p>
                  <p className="text-3xl font-bold text-purple-600">{userAnalytics.user_level}</p>
                  <p className="text-xs text-gray-500">{userAnalytics.total_points} XP</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Crown className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cards Mastered</p>
                  <p className="text-3xl font-bold text-green-600">{userAnalytics.known_cards}</p>
                  <p className="text-xs text-gray-500">of {userAnalytics.total_cards}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Study Days</p>
                  <p className="text-3xl font-bold text-blue-600">{userAnalytics.total_study_days}</p>
                  <p className="text-xs text-gray-500">total</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Charts and Achievements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Weekly Progress */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Weekly Progress</h3>
              </div>
              
              {userAnalytics.weekly_progress.length > 0 ? (
                <div className="space-y-4">
                  {userAnalytics.weekly_progress.map((day: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{day.cards_studied} cards</span>
                        <span className="text-sm text-gray-600">{day.study_time}min</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No study activity this week</p>
                </div>
              )}
            </div>

            {/* Recent Achievements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Award className="h-6 w-6 text-yellow-600" />
                <h3 className="text-xl font-semibold text-gray-900">Recent Achievements</h3>
              </div>
              
              {userAnalytics.recent_achievements.length > 0 ? (
                <div className="space-y-4">
                  {userAnalytics.recent_achievements.map((achievement: any, index: number) => {
                    const IconComponent = getIconForAchievement(achievement.icon);
                    return (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBadgeColorClass(achievement.badge_color)}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                          <p className="text-sm text-gray-600">{achievement.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-yellow-600">+{achievement.points} XP</div>
                          <div className="text-xs text-gray-500">
                            {new Date(achievement.earned_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent achievements</p>
                  <p className="text-sm">Keep studying to earn badges!</p>
                </div>
              )}
            </div>
          </div>

          {/* Category Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Target className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900">Category Progress</h3>
            </div>
            
            {userAnalytics.category_progress.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userAnalytics.category_progress.map((category: any, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{category.category_name}</h4>
                      <span className="text-sm font-medium text-gray-600">
                        {Math.round(category.completion_percentage)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${category.completion_percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {category.known_cards} of {category.total_cards} cards mastered
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No category progress yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Platform Analytics Section (Super Admin Only) */}
      {adminAnalytics && userRole === 'super_admin' && (
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <Database className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Platform Overview</h2>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
              SUPER ADMIN ONLY
            </span>
          </div>
          
          {/* Platform Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-600">{adminAnalytics.total_users}</p>
                  <p className="text-xs text-gray-500">registered</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Today</p>
                  <p className="text-2xl font-bold text-green-600">{adminAnalytics.active_users_today}</p>
                  <p className="text-xs text-gray-500">users</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Study Sessions</p>
                  <p className="text-2xl font-bold text-orange-600">{adminAnalytics.total_study_sessions}</p>
                  <p className="text-xs text-gray-500">total</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Platform Content</p>
                  <p className="text-2xl font-bold text-purple-600">{adminAnalytics.total_flashcards || 0}</p>
                  <p className="text-xs text-gray-500">flashcards</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Globe className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Platform Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center space-x-3 mb-4">
                <Users className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">User Growth</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700">This Week:</span>
                  <span className="font-semibold text-blue-900">{adminAnalytics.active_users_week}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">This Month:</span>
                  <span className="font-semibold text-blue-900">{adminAnalytics.new_users_this_month || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center space-x-3 mb-4">
                <BarChart3 className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">Content Stats</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-700">Categories:</span>
                  <span className="font-semibold text-green-900">{adminAnalytics.total_categories || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Test Sets:</span>
                  <span className="font-semibold text-green-900">{adminAnalytics.total_test_sets || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center space-x-3 mb-4">
                <Flame className="h-6 w-6 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-900">Engagement</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-yellow-700">Avg Streak:</span>
                  <span className="font-semibold text-yellow-900">{Math.round(adminAnalytics.average_streak)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-700">Study Hours:</span>
                  <span className="font-semibold text-yellow-900">{adminAnalytics.total_study_hours || 0}h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Categories */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Category Performance</h3>
              </div>
              
              {adminAnalytics.top_categories.length > 0 ? (
                <div className="space-y-4">
                  {adminAnalytics.top_categories.slice(0, 5).map((category: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{category.category_name}</span>
                          <span className="text-sm text-gray-600">{category.completion_rate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${category.completion_rate}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {category.total_flashcards} cards • {category.total_progress_records} progress records
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No category data available</p>
                </div>
              )}
            </div>

            {/* Platform Engagement */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">Platform Engagement</h3>
              </div>
              
              {adminAnalytics.engagement_metrics.length > 0 ? (
                <div className="space-y-4">
                  {adminAnalytics.engagement_metrics.slice(-7).map((day: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{day.active_users} users</span>
                        <span className="text-sm text-gray-600">{day.total_sessions} sessions</span>
                        <span className="text-sm text-gray-600">{Math.round(day.avg_study_time || 0)}min avg</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No engagement data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Super Admin Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* User Role Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900">User Role Distribution</h3>
              </div>
              
              {adminAnalytics.user_roles && adminAnalytics.user_roles.length > 0 ? (
                <div className="space-y-4">
                  {adminAnalytics.user_roles.map((role: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          role.role === 'super_admin' ? 'bg-purple-600' :
                          role.role === 'admin' ? 'bg-blue-600' :
                          'bg-gray-600'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {role.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{role.count}</div>
                        <div className="text-xs text-gray-500">
                          {Math.round((role.count / adminAnalytics.total_users) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No user role data available</p>
                </div>
              )}
            </div>

            {/* Most Active Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Star className="h-6 w-6 text-yellow-600" />
                <h3 className="text-xl font-semibold text-gray-900">Most Active Users</h3>
              </div>
              
              {adminAnalytics.most_active_users && adminAnalytics.most_active_users.length > 0 ? (
                <div className="space-y-4">
                  {adminAnalytics.most_active_users.slice(0, 5).map((user: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">
                            {user.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.email || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {user.role?.replace('_', ' ') || 'user'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{user.total_points || 0} XP</div>
                        <div className="text-xs text-gray-500">{user.current_streak || 0} day streak</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No active user data available</p>
                </div>
              )}
            </div>
          </div>

          {/* System Health & Performance Metrics */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Database className="h-6 w-6 text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-900">System Health & Performance</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Study Hours</p>
                    <p className="text-2xl font-bold text-blue-600">{adminAnalytics.total_study_hours || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cards Studied</p>
                    <p className="text-2xl font-bold text-green-600">{adminAnalytics.total_cards_studied || 0}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg User Streak</p>
                    <p className="text-2xl font-bold text-orange-600">{Math.round(adminAnalytics.average_streak || 0)}</p>
                  </div>
                  <Flame className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Content Ratio</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {adminAnalytics.total_flashcards && adminAnalytics.total_users 
                        ? Math.round(adminAnalytics.total_flashcards / adminAnalytics.total_users) 
                        : 0}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Platform Growth & Trends */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
              <h3 className="text-xl font-semibold text-gray-900">Platform Growth & Trends</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {adminAnalytics.new_users_this_month || 0}
                </div>
                <div className="text-sm font-medium text-blue-800">New Users This Month</div>
                <div className="text-xs text-blue-600 mt-1">
                  {adminAnalytics.total_users > 0 
                    ? `${Math.round((adminAnalytics.new_users_this_month / adminAnalytics.total_users) * 100)}% growth`
                    : '0% growth'
                  }
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {adminAnalytics.active_users_week || 0}
                </div>
                <div className="text-sm font-medium text-green-800">Active Users This Week</div>
                <div className="text-xs text-green-600 mt-1">
                  {adminAnalytics.total_users > 0 
                    ? `${Math.round((adminAnalytics.active_users_week / adminAnalytics.total_users) * 100)}% engagement`
                    : '0% engagement'
                  }
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {adminAnalytics.total_study_sessions || 0}
                </div>
                <div className="text-sm font-medium text-purple-800">Total Study Sessions</div>
                <div className="text-xs text-purple-600 mt-1">
                  {adminAnalytics.total_users > 0 
                    ? `${Math.round(adminAnalytics.total_study_sessions / adminAnalytics.total_users)} per user`
                    : '0 per user'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Key Insights for Super Admins */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="h-6 w-6 text-purple-600" />
              <h3 className="text-xl font-semibold text-gray-900">Key Platform Insights</h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                SUPER ADMIN
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-sm font-medium text-gray-600 mb-1">User Retention</div>
                <div className="text-lg font-bold text-purple-600">
                  {adminAnalytics.total_users > 0 
                    ? `${Math.round((adminAnalytics.active_users_week / adminAnalytics.total_users) * 100)}%`
                    : '0%'
                  }
                </div>
                <div className="text-xs text-gray-500">Weekly active rate</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-sm font-medium text-gray-600 mb-1">Content Utilization</div>
                <div className="text-lg font-bold text-purple-600">
                  {adminAnalytics.total_flashcards > 0 
                    ? `${Math.round((adminAnalytics.total_cards_studied / adminAnalytics.total_flashcards) * 100)}%`
                    : '0%'
                  }
                </div>
                <div className="text-xs text-gray-500">Cards studied vs available</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-sm font-medium text-gray-600 mb-1">Study Efficiency</div>
                <div className="text-lg font-bold text-purple-600">
                  {adminAnalytics.total_study_hours > 0 
                    ? `${Math.round(adminAnalytics.total_cards_studied / adminAnalytics.total_study_hours)}`
                    : '0'
                  }
                </div>
                <div className="text-xs text-gray-500">Cards per study hour</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-sm font-medium text-gray-600 mb-1">Platform Health</div>
                <div className="text-lg font-bold text-purple-600">
                  {adminAnalytics.total_users > 0 && adminAnalytics.total_flashcards > 0 
                    ? 'Good'
                    : 'Setup Required'
                  }
                </div>
                <div className="text-xs text-gray-500">Content to user ratio</div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
        
        {/* Right Sidebar Advertisement */}
        
      </div>
      
      {/* Footer Advertisement */}
      <TargetedAdContainer placement="footer" className="mt-8 flex justify-center" />
      
      {/* Access Level Indicator */}
      <div className="mt-12 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {userRole === 'super_admin' ? (
              <Shield className="h-5 w-5 text-purple-600" />
            ) : userRole === 'admin' ? (
              <Crown className="h-5 w-5 text-blue-600" />
            ) : (
              <Users className="h-5 w-5 text-gray-600" />
            )}
            <span className="text-sm font-medium text-gray-700">
              Access Level: {userRole === 'super_admin' ? 'Super Administrator' : 
                           userRole === 'admin' ? 'Administrator' : 'User'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {userRole === 'super_admin' 
              ? 'Full platform analytics & system monitoring' 
              : userRole === 'admin'
              ? 'Limited admin analytics access'
              : 'Personal analytics only'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default Analytics;