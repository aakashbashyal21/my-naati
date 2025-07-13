import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderOpen, 
  BookOpen, 
  Clock, 
  CheckCircle,
  Play,
  BarChart3,
  Loader2,
  TrendingUp,
  Search,
  Filter,
  Star,
  Target,
  Zap,
  Calendar,
  Award,
  Eye,
  Bookmark,
  Grid3X3,
  List,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  getCategoriesByLanguage, 
  getTestSetsByLanguage, 
  getFlashcards, 
  getUserStatsDetailedByLanguage,
  initializeUserProgress,
  Category, 
  TestSet, 
  Flashcard,
  TestSetProgress
} from '../../../lib/database';
import PracticeSession from '../../practice/PracticeSession';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import TargetedAdContainer from '../../advertisements/TargetedAdContainer';

const Categories: React.FC = () => {
  const { user } = useAuth();
  const { selectedLanguageId, isLoading: languageLoading } = useLanguage();
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
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'in-progress' | 'completed' | 'not-started'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'cards' | 'recent'>('progress');

  useEffect(() => {
    console.log('Categories useEffect:', { user: !!user, selectedLanguageId, languageLoading });
    
    const loadData = async () => {
      if (!user || !selectedLanguageId || languageLoading) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load categories, test sets, and user progress for the selected language
        const [categoriesData, testSetsData, progressData] = await Promise.all([
          getCategoriesByLanguage(selectedLanguageId!),
          getTestSetsByLanguage(selectedLanguageId!),
          getUserStatsDetailedByLanguage(user.id, selectedLanguageId!)
        ]);
        
        setCategories(categoriesData);
        
        // Group test sets by category
        const grouped = testSetsData.reduce((acc: Record<string, TestSet[]>, testSet: TestSet) => {
          const categoryId = testSet.category_id;
          if (categoryId) {
            if (!acc[categoryId]) {
              acc[categoryId] = [];
            }
            acc[categoryId].push(testSet);
          }
          return acc;
        }, {} as Record<string, TestSet[]>);
        
        setTestSetsByCategory(grouped);
        
        // Group progress by test set
        const progressGrouped = progressData.reduce((acc: Record<string, TestSetProgress>, progress: TestSetProgress) => {
          acc[progress.test_set_id] = progress;
          return acc;
        }, {} as Record<string, TestSetProgress>);
        
        setProgressByTestSet(progressGrouped);
        
        // Start with all categories collapsed
        setExpandedCategories(new Set());
      } catch (err) {
        console.error('Error loading categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, selectedLanguageId, languageLoading]);

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
    if (user && selectedLanguageId) {
      try {
        const progressData = await getUserStatsDetailedByLanguage(user.id, selectedLanguageId);
        const progressGrouped = progressData.reduce((acc: Record<string, TestSetProgress>, progress: TestSetProgress) => {
          acc[progress.test_set_id] = progress;
          return acc;
        }, {} as Record<string, TestSetProgress>);
        setProgressByTestSet(progressGrouped);
      } catch (err) {
        console.error('Error reloading progress:', err);
      }
    }
  };

  const getTestSetProgress = (testSetId: string) => {
    return progressByTestSet[testSetId] || {
      completion_percentage: 0,
      last_studied: null,
      known_cards: 0,
      total_cards: 0
    };
  };

  // Filter and sort logic
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories.filter(category => {
      const testSets = testSetsByCategory[category.id] || [];
      const hasMatchingTestSets = testSets.some(testSet => {
        const progress = getTestSetProgress(testSet.id);
        const matchesSearch = testSet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             category.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = selectedFilter === 'all' ||
          (selectedFilter === 'in-progress' && progress.completion_percentage > 0 && progress.completion_percentage < 100) ||
          (selectedFilter === 'completed' && progress.completion_percentage === 100) ||
          (selectedFilter === 'not-started' && progress.completion_percentage === 0);
        
        return matchesSearch && matchesFilter;
      });
      
      return hasMatchingTestSets;
    });

    // Sort categories by overall progress
    filtered.sort((a, b) => {
      const aTestSets = testSetsByCategory[a.id] || [];
      const bTestSets = testSetsByCategory[b.id] || [];
      
      const aAvgProgress = aTestSets.length > 0 
        ? aTestSets.reduce((sum, ts) => sum + getTestSetProgress(ts.id).completion_percentage, 0) / aTestSets.length
        : 0;
      const bAvgProgress = bTestSets.length > 0
        ? bTestSets.reduce((sum, ts) => sum + getTestSetProgress(ts.id).completion_percentage, 0) / bTestSets.length
        : 0;
      
      return bAvgProgress - aAvgProgress;
    });

    return filtered;
  }, [categories, testSetsByCategory, searchTerm, selectedFilter, progressByTestSet]);

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'text-green-600 bg-green-100 border-green-200';
    if (progress >= 75) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (progress >= 50) return 'text-purple-600 bg-purple-100 border-purple-200';
    if (progress > 0) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-gray-600 bg-gray-100 border-gray-200';
  };

  const getProgressBarColor = (progress: number) => {
    if (progress === 100) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (progress >= 75) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (progress >= 50) return 'bg-gradient-to-r from-purple-500 to-purple-600';
    if (progress > 0) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gray-300';
  };

  const getDifficultyBadge = (progress: number) => {
    if (progress === 100) return { label: 'Mastered', color: 'bg-green-100 text-green-800' };
    if (progress >= 75) return { label: 'Advanced', color: 'bg-blue-100 text-blue-800' };
    if (progress >= 50) return { label: 'Intermediate', color: 'bg-purple-100 text-purple-800' };
    if (progress > 0) return { label: 'Beginner', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'New', color: 'bg-gray-100 text-gray-800' };
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

  if (languageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center space-x-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Loading Practice Dashboard</h3>
            <p className="text-gray-600">Preparing your learning experience...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center space-x-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Loading Categories</h3>
            <p className="text-gray-600">Fetching your learning content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedLanguageId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Language</h3>
          <p className="text-gray-600 mb-4">
            {languageLoading 
              ? 'Loading language preferences...' 
              : 'Please select a language from the dropdown in the header to view practice categories.'
            }
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">
              Choose your target language to start practicing vocabulary
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="h-12 w-12 text-gray-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">No Categories Available</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              No categories have been created for this language yet. Contact your administrator to add learning content.
            </p>
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What you can do:</h3>
              <ul className="text-left space-y-2 text-gray-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Try selecting a different language</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Contact your administrator</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Check back later for new content</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Advertisement */}
      <TargetedAdContainer 
        placement="header" 
        className="py-4 flex justify-center" 
        fallbackContent={
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 text-center text-white shadow-lg">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <p className="font-medium">Study smarter with NaatiNuggets</p>
            </div>
          </div>
        }
      />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Practice Dashboard</h1>
              <p className="text-gray-600">Master vocabulary through interactive practice sessions</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {(() => {
              const totalTestSets = Object.values(testSetsByCategory).flat().length;
              const completedTestSets = Object.values(progressByTestSet).filter(p => p.completion_percentage === 100).length;
              const inProgressTestSets = Object.values(progressByTestSet).filter(p => p.completion_percentage > 0 && p.completion_percentage < 100).length;
              const totalCards = Object.values(testSetsByCategory).flat().reduce((sum, ts) => sum + (ts.flashcard_count || 0), 0);
              
              return (
                <>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Sets</p>
                        <p className="text-xl font-bold text-gray-900">{totalTestSets}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-xl font-bold text-green-600">{completedTestSets}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">In Progress</p>
                        <p className="text-xl font-bold text-yellow-600">{inProgressTestSets}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Target className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Cards</p>
                        <p className="text-xl font-bold text-purple-600">{totalCards}</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search categories or test sets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value as any)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Test Sets</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="not-started">Not Started</option>
                </select>
                <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="space-y-6">
          {filteredAndSortedCategories.map((category) => {
            const testSets = testSetsByCategory[category.id] || [];
            const totalCards = testSets.reduce((sum, set) => sum + (set.flashcard_count || 0), 0);
            const avgProgress = testSets.length > 0 
              ? testSets.reduce((sum, ts) => sum + getTestSetProgress(ts.id).completion_percentage, 0) / testSets.length
              : 0;
            const isExpanded = expandedCategories.has(category.id);
            
            return (
              <div key={category.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Category Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategoryExpansion(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <FolderOpen className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                        <p className="text-gray-600">{category.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-500">{testSets.length} test sets</span>
                          <span className="text-sm text-gray-500">{totalCards} total cards</span>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-gray-500">{Math.round(avgProgress)}% avg progress</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Overall Progress */}
                      <div className="text-right">
                        <div className="w-32 bg-gray-200 rounded-full h-3 mb-2">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(avgProgress)}`}
                            style={{ width: `${avgProgress}%` }}
                          />
                        </div>
                        <p className="text-sm font-medium text-gray-700">{Math.round(avgProgress)}% complete</p>
                      </div>
                      
                      {/* Expand/Collapse */}
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Sets (Collapsible) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6">
                    {testSets.length > 0 ? (
                      <div className={`grid gap-4 ${
                        viewMode === 'grid' 
                          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                          : 'grid-cols-1'
                      }`}>
                        {testSets.map((testSet) => {
                          const progressData = getTestSetProgress(testSet.id);
                          const progress = progressData.completion_percentage;
                          const lastStudied = progressData.last_studied 
                            ? new Date(progressData.last_studied).toLocaleDateString()
                            : 'Never';
                          const difficultyBadge = getDifficultyBadge(progress);
                          
                          return (
                            <div key={testSet.id} className={`
                              bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:scale-105
                              ${viewMode === 'list' ? 'flex items-center justify-between' : ''}
                            `}>
                              {viewMode === 'grid' ? (
                                // Grid View
                                <div className="space-y-4">
                                  {/* Header */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h3 className="font-bold text-gray-900 text-lg mb-1">{testSet.name}</h3>
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyBadge.color}`}>
                                          {difficultyBadge.label}
                                        </span>
                                        <span className="text-sm text-gray-600">{testSet.flashcard_count} cards</span>
                                      </div>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getProgressColor(progress)}`}>
                                      {progress === 100 ? (
                                        <CheckCircle className="h-6 w-6" />
                                      ) : progress > 0 ? (
                                        <TrendingUp className="h-6 w-6" />
                                      ) : (
                                        <BookOpen className="h-6 w-6" />
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Progress */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Progress</span>
                                      <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(progress)}`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Stats */}
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-600">{lastStudied}</span>
                                    </div>
                                    {progressData.known_cards > 0 && (
                                      <div className="flex items-center space-x-1">
                                        <Award className="h-4 w-4 text-green-500" />
                                        <span className="text-green-600">{progressData.known_cards} known</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Action Button */}
                                  <button 
                                    onClick={() => startPractice(testSet)}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium flex items-center justify-center space-x-2"
                                  >
                                    <Play className="h-4 w-4" />
                                    <span>{progress > 0 ? 'Continue' : 'Start'}</span>
                                  </button>
                                </div>
                              ) : (
                                // List View
                                <>
                                  <div className="flex items-center space-x-4 flex-1">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getProgressColor(progress)}`}>
                                      {progress === 100 ? (
                                        <CheckCircle className="h-6 w-6" />
                                      ) : progress > 0 ? (
                                        <TrendingUp className="h-6 w-6" />
                                      ) : (
                                        <BookOpen className="h-6 w-6" />
                                      )}
                                    </div>
                                    
                                    <div className="flex-1">
                                      <h3 className="font-bold text-gray-900 text-lg">{testSet.name}</h3>
                                      <div className="flex items-center space-x-4 mt-1">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyBadge.color}`}>
                                          {difficultyBadge.label}
                                        </span>
                                        <span className="text-sm text-gray-600">{testSet.flashcard_count} cards</span>
                                        {progressData.known_cards > 0 && (
                                          <span className="text-sm text-green-600">
                                            {progressData.known_cards} known
                                          </span>
                                        )}
                                        <div className="flex items-center space-x-1">
                                          <Clock className="h-4 w-4 text-gray-400" />
                                          <span className="text-sm text-gray-600">{lastStudied}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-6">
                                    {/* Progress Bar */}
                                    <div className="flex items-center space-x-3">
                                      <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(progress)}`}
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-bold text-gray-700 w-12">{Math.round(progress)}%</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-2">
                                      <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                        <BarChart3 className="h-4 w-4" />
                                      </button>
                                      <button 
                                        onClick={() => startPractice(testSet)}
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium flex items-center space-x-2"
                                      >
                                        <Play className="h-4 w-4" />
                                        <span>{progress > 0 ? 'Continue' : 'Start'}</span>
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No test sets available</h3>
                        <p className="text-gray-600">This category doesn't have any test sets yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* No Results */}
        {filteredAndSortedCategories.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matching test sets found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedFilter('all');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
      
      {/* Footer Advertisement */}
      <TargetedAdContainer placement="footer" className="py-8 flex justify-center" />
    </div>
  );
};

export default Categories;