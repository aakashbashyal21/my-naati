import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  BookOpen, 
  Clock, 
  CheckCircle,
  Play,
  BarChart3,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { 
  getCategories, 
  getTestSets, 
  getFlashcards, 
  getUserStatsDetailed,
  initializeUserProgress,
  Category, 
  TestSet, 
  Flashcard,
  TestSetProgress
} from '../../../lib/database';
import PracticeSession from '../../practice/PracticeSession';
import { useAuth } from '../../../hooks/useAuth';
import TargetedAdContainer from '../../advertisements/TargetedAdContainer';

const Categories: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [testSetsByCategory, setTestSetsByCategory] = useState<Record<string, TestSet[]>>({});
  const [progressByTestSet, setProgressByTestSet] = useState<Record<string, TestSetProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practiceSession, setPracticeSession] = useState<{
    testSetId: string;
    testSetName: string;
    flashcards: Flashcard[];
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load categories, test sets, and user progress
        const [categoriesData, testSetsData, progressData] = await Promise.all([
          getCategories(),
          getTestSets(),
          getUserStatsDetailed(user.id)
        ]);
        
        setCategories(categoriesData);
        
        // Group test sets by category
        const grouped = testSetsData.reduce((acc, testSet) => {
          if (!acc[testSet.category_id]) {
            acc[testSet.category_id] = [];
          }
          acc[testSet.category_id].push(testSet);
          return acc;
        }, {} as Record<string, TestSet[]>);
        
        setTestSetsByCategory(grouped);
        
        // Group progress by test set
        const progressGrouped = progressData.reduce((acc, progress) => {
          acc[progress.test_set_id] = progress;
          return acc;
        }, {} as Record<string, TestSetProgress>);
        
        setProgressByTestSet(progressGrouped);
      } catch (err) {
        console.error('Error loading categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const startPractice = async (testSet: TestSet) => {
    if (!user) return;
    
    try {
      setError(null);
      
      // Initialize progress for this test set if needed
      await initializeUserProgress(user.id, testSet.id);
      
      const flashcards = await getFlashcards(testSet.id);
      
      if (flashcards.length === 0) {
        setError('This test set has no flashcards yet. Please ask an admin to add some content.');
        return;
      }
      
      setPracticeSession({
        testSetId: testSet.id,
        testSetName: testSet.name,
        flashcards
      });
    } catch (err) {
      console.error('Error loading flashcards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flashcards');
    }
  };

  const exitPractice = async () => {
    setPracticeSession(null);
    
    // Reload progress data when exiting practice
    if (user) {
      try {
        const progressData = await getUserStatsDetailed(user.id);
        const progressGrouped = progressData.reduce((acc, progress) => {
          acc[progress.test_set_id] = progress;
          return acc;
        }, {} as Record<string, TestSetProgress>);
        setProgressByTestSet(progressGrouped);
      } catch (err) {
        console.error('Error reloading progress:', err);
      }
    }
  };

  // Show practice session if active
  if (practiceSession) {
    return (
      <PracticeSession
        testSetId={practiceSession.testSetId}
        testSetName={practiceSession.testSetName}
        flashcards={practiceSession.flashcards}
        onBack={exitPractice}
      />
    );
  }

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'text-green-600 bg-green-100';
    if (progress >= 50) return 'text-blue-600 bg-blue-100';
    if (progress > 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getProgressBarColor = (progress: number) => {
    if (progress === 100) return 'bg-green-600';
    if (progress >= 50) return 'bg-blue-600';
    if (progress > 0) return 'bg-yellow-600';
    return 'bg-gray-400';
  };

  const getTestSetProgress = (testSetId: string) => {
    return progressByTestSet[testSetId] || {
      completion_percentage: 0,
      last_studied: null,
      known_cards: 0,
      total_cards: 0
    };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading categories...</span>
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

  if (categories.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Categories</h1>
          <p className="text-gray-600">Browse and practice different vocabulary categories</p>
        </div>
        
        <div className="text-center py-12">
          <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories available</h3>
          <p className="text-gray-600 mb-4">
            Categories and test sets need to be created by an administrator.
          </p>
          <p className="text-sm text-gray-500">
            Contact your administrator to add learning content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header Advertisement */}
      <TargetedAdContainer 
        placement="header" 
        className="mb-6 flex justify-center" 
        fallbackContent={
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4 text-center">
            <p className="text-gray-600">Study smarter with NaatiNuggets</p>
          </div>
        }
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Categories</h1>
        <p className="text-gray-600">Browse and practice different vocabulary categories</p>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar Advertisement */}
        <div className="w-64 flex-shrink-0">
          <TargetedAdContainer placement="sidebar_left" />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 space-y-8">
        {categories.map((category) => {
          const testSets = testSetsByCategory[category.id] || [];
          const totalCards = testSets.reduce((sum, set) => sum + (set.flashcard_count || 0), 0);
          
          return (
            <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Category Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
                    <p className="text-gray-600">{category.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{testSets.length} test sets</p>
                    <p className="text-sm text-gray-500">{totalCards} total cards</p>
                  </div>
                </div>
              </div>

              {/* Test Sets */}
              <div className="p-6">
                {testSets.length > 0 ? (
                  <div className="grid gap-4">
                    {testSets.map((testSet) => {
                      const progressData = getTestSetProgress(testSet.id);
                      const progress = progressData.completion_percentage;
                      const lastStudied = progressData.last_studied 
                        ? new Date(progressData.last_studied).toLocaleDateString()
                        : 'Never';
                      
                      return (
                        <div key={testSet.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getProgressColor(progress)}`}>
                              {progress === 100 ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : progress > 0 ? (
                                <TrendingUp className="h-5 w-5" />
                              ) : (
                                <BookOpen className="h-5 w-5" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{testSet.name}</h3>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-sm text-gray-600">{testSet.flashcard_count} cards</span>
                                {progressData.known_cards > 0 && (
                                  <span className="text-sm text-green-600">
                                    {progressData.known_cards} known
                                  </span>
                                )}
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{lastStudied}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {/* Progress Bar */}
                            <div className="flex items-center space-x-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(progress)}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700 w-10">{Math.round(progress)}%</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-2">
                              <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <BarChart3 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => startPractice(testSet)}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Play className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {progress > 0 ? 'Continue' : 'Start'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No test sets in this category yet</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
        
        {/* Right Sidebar Advertisement */}
        <div className="w-64 flex-shrink-0">
          <TargetedAdContainer placement="sidebar_right" />
        </div>
      </div>
      
      {/* Footer Advertisement */}
      <TargetedAdContainer placement="footer" className="mt-8 flex justify-center" />
    </div>
  );
};

export default Categories;