import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Star, 
  Flame, 
  Crown, 
  Award,
  Target,
  Zap,
  BookOpen,
  CheckCircle,
  Lock,
  Loader2,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react';
import { 
  getUserStreak, 
  getUserAchievements, 
  getAchievementDefinitions,
  UserStreak, 
  UserAchievement, 
  Achievement 
} from '../../../lib/database';
import { useAuth } from '../../../hooks/useAuth';
import TargetedAdContainer from '../../advertisements/TargetedAdContainer';

const Gamification: React.FC = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGamificationData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const [streakData, achievementsData, allAchievementsData] = await Promise.all([
          getUserStreak(user.id),
          getUserAchievements(user.id),
          getAchievementDefinitions()
        ]);
        
        setStreak(streakData);
        setUserAchievements(achievementsData);
        setAllAchievements(allAchievementsData);
      } catch (err) {
        console.error('Error loading gamification data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load gamification data');
      } finally {
        setLoading(false);
      }
    };

    loadGamificationData();
  }, [user]);

  const getIconForAchievement = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'play': Activity,
      'flame': Flame,
      'zap': Zap,
      'crown': Crown,
      'book-open': BookOpen,
      'brain': Target,
      'award': Award,
      'check-circle': CheckCircle,
      'star': Star
    };
    return iconMap[iconName] || Trophy;
  };

  const getBadgeColorClass = (color: string, earned: boolean = false) => {
    if (!earned) {
      return 'bg-gray-100 text-gray-400 border-gray-200';
    }
    
    const colorMap: Record<string, string> = {
      'blue': 'bg-blue-100 text-blue-800 border-blue-200',
      'green': 'bg-green-100 text-green-800 border-green-200',
      'purple': 'bg-purple-100 text-purple-800 border-purple-200',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'orange': 'bg-orange-100 text-orange-800 border-orange-200',
      'gold': 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-900 border-yellow-300',
      'red': 'bg-red-100 text-red-800 border-red-200'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProgressToNextLevel = () => {
    if (!streak) return { current: 0, needed: 100, percentage: 0 };
    
    const currentLevelXP = (streak.level - 1) * 100;
    const nextLevelXP = streak.level * 100;
    const currentXP = streak.experience_points;
    const progressXP = currentXP - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    const percentage = (progressXP / neededXP) * 100;
    
    return {
      current: progressXP,
      needed: neededXP,
      percentage: Math.min(percentage, 100)
    };
  };

  const isAchievementEarned = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getAchievementsByCategory = () => {
    const categories = ['milestone', 'streak', 'progress', 'mastery'];
    return categories.map(category => ({
      name: category,
      title: category.charAt(0).toUpperCase() + category.slice(1),
      achievements: allAchievements.filter(a => a.category === category)
    }));
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading achievements...</span>
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

  const levelProgress = getProgressToNextLevel();

  return (
    <div className="p-8">
      {/* Header Advertisement */}
      <TargetedAdContainer 
        placement="header" 
        className="mb-6 flex justify-center" 
        fallbackContent={
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-4 text-center">
            <p className="text-gray-600">🏆 Keep earning achievements and level up your NAATI skills!</p>
          </div>
        }
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Achievements & Progress</h1>
        <p className="text-gray-600">Track your learning milestones and earn rewards</p>
      </div>

      {/* Level and Streak Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Level Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8" />
              <div>
                <h3 className="text-lg font-semibold">Level {streak?.level || 1}</h3>
                <p className="text-purple-200 text-sm">NAATI Learner</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{streak?.total_points || 0}</div>
              <div className="text-purple-200 text-sm">Total XP</div>
            </div>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to Level {(streak?.level || 1) + 1}</span>
              <span>{levelProgress.current}/{levelProgress.needed} XP</span>
            </div>
            <div className="w-full bg-purple-400/30 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${levelProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Flame className="h-8 w-8" />
              <div>
                <h3 className="text-lg font-semibold">Study Streak</h3>
                <p className="text-orange-200 text-sm">Keep it burning!</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{streak?.current_streak || 0}</div>
              <div className="text-orange-200 text-sm">days</div>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span>Longest: {streak?.longest_streak || 0} days</span>
            <span>Total: {streak?.total_study_days || 0} days</span>
          </div>
        </div>

        {/* Achievements Summary */}
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8" />
              <div>
                <h3 className="text-lg font-semibold">Achievements</h3>
                <p className="text-yellow-200 text-sm">Badges earned</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{userAchievements.length}</div>
              <div className="text-yellow-200 text-sm">of {allAchievements.length}</div>
            </div>
          </div>
          <div className="w-full bg-yellow-400/30 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(userAchievements.length / Math.max(allAchievements.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar Advertisement */}
       
        
        {/* Main Content */}
        <div className="flex-1">
      {/* Recent Achievements */}
      {userAchievements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Star className="h-6 w-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Achievements</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userAchievements.slice(0, 6).map((userAchievement) => {
              const achievement = userAchievement.achievement;
              if (!achievement) return null;
              
              const IconComponent = getIconForAchievement(achievement.icon);
              return (
                <div key={userAchievement.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${getBadgeColorClass(achievement.badge_color, true)}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-yellow-600 font-medium">+{userAchievement.points_earned} XP</span>
                      <span className="text-xs text-gray-500">
                        {new Date(userAchievement.earned_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Achievements by Category */}
      <div className="space-y-8">
        {getAchievementsByCategory().map((category) => (
          <div key={category.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Award className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">{category.title} Achievements</h2>
              <span className="text-sm text-gray-500">
                ({category.achievements.filter(a => isAchievementEarned(a.id)).length}/{category.achievements.length})
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {category.achievements.map((achievement) => {
                const earned = isAchievementEarned(achievement.id);
                const IconComponent = getIconForAchievement(achievement.icon);
                
                return (
                  <div 
                    key={achievement.id} 
                    className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                      earned 
                        ? 'bg-white border-gray-200 shadow-sm' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {!earned && (
                      <div className="absolute top-2 right-2">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center border-2 ${getBadgeColorClass(achievement.badge_color, earned)}`}>
                        <IconComponent className="h-8 w-8" />
                      </div>
                      
                      <div>
                        <h4 className={`font-semibold ${earned ? 'text-gray-900' : 'text-gray-500'}`}>
                          {achievement.title}
                        </h4>
                        <p className={`text-sm ${earned ? 'text-gray-600' : 'text-gray-400'}`}>
                          {achievement.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-medium ${earned ? 'text-yellow-600' : 'text-gray-400'}`}>
                          {achievement.points} XP
                        </span>
                        <span className={`text-xs ${earned ? 'text-gray-500' : 'text-gray-400'}`}>
                          {achievement.requirement_value} {achievement.requirement_type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {earned && (
                        <div className="w-full pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Earned!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Motivational Footer */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
        <Trophy className="h-12 w-12 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2">Keep Going, NAATI Champion!</h3>
        <p className="text-blue-100 mb-4">
          Every flashcard you master brings you closer to NAATI CCL success. 
          Stay consistent and watch your achievements grow!
        </p>
        <div className="flex justify-center space-x-8 text-sm">
          <div className="flex items-center space-x-2">
            <Flame className="h-4 w-4" />
            <span>Study daily to maintain your streak</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4" />
            <span>Earn XP by mastering flashcards</span>
          </div>
          <div className="flex items-center space-x-2">
            <Crown className="h-4 w-4" />
            <span>Level up and unlock new achievements</span>
          </div>
        </div>
      </div>
        </div>
        
        {/* Right Sidebar Advertisement */}
        
      </div>
      
      {/* Footer Advertisement */}
      <TargetedAdContainer placement="footer" className="mt-8 flex justify-center" />
    </div>
  );
};

export default Gamification;