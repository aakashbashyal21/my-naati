import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Shuffle, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  Save,
  Trophy,
  BookOpen,
  Trash2,
  Loader2,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  Bookmark,
  Calendar,
  Star,
  Target,
  Zap,
  Sparkles,
  Plus,
  Minus,
  Heart,
  Clock,
  Award
} from 'lucide-react';
import { 
  getUserVocabListByLanguage,
  removeWordFromVocabList
} from '../../../lib/database';
import { VocabListItem } from '../../../types/flashcard';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import TargetedAdContainer from '../../advertisements/TargetedAdContainer';

interface VocabListViewerProps {
  onBack: () => void;
}

const VocabListViewer: React.FC<VocabListViewerProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { selectedLanguageId, isLoading: languageLoading } = useLanguage();
  const [vocabItems, setVocabItems] = useState<VocabListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [shuffledItems, setShuffledItems] = useState<VocabListItem[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'english' | 'translation'>('date');
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    loadVocabList();
  }, [user, selectedLanguageId, languageLoading]);

  const loadVocabList = async () => {
    if (!user || !selectedLanguageId || languageLoading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const items = await getUserVocabListByLanguage(user.id, selectedLanguageId);
      setVocabItems(items);
      setShuffledItems(items);
    } catch (err) {
      console.error('Error loading vocab list:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vocab list');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const filteredAndSortedItems = useMemo(() => {
    let filtered = vocabItems.filter(item => {
      const matchesSearch = item.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'english':
          return a.english.localeCompare(b.english);
        case 'translation':
          return a.translation.localeCompare(b.translation);
        case 'date':
        default:
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      }
    });

    return filtered;
  }, [vocabItems, searchTerm, sortBy]);

  const shuffleItems = () => {
    const shuffled = [...vocabItems].sort(() => Math.random() - 0.5);
    setShuffledItems(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(true);
  };

  const resetOrder = () => {
    setShuffledItems(vocabItems);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
  };

  const nextItem = () => {
    if (currentIndex < shuffledItems.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevItem = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (isFlipped) {
        nextItem();
      } else {
        setIsFlipped(true);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevItem();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      setIsReversed(!isReversed);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, isReversed]);

  const removeItem = async (item: VocabListItem) => {
    if (!user) return;
    
    try {
      setRemovingItem(item.id);
      await removeWordFromVocabList(user.id, item.english, item.translation);
      
      // Remove from local state
      const updatedItems = vocabItems.filter(i => i.id !== item.id);
      setVocabItems(updatedItems);
      setShuffledItems(updatedItems);
      
      // Adjust current index if needed
      if (currentIndex >= updatedItems.length && updatedItems.length > 0) {
        setCurrentIndex(updatedItems.length - 1);
      }
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item from vocab list');
    } finally {
      setRemovingItem(null);
    }
  };

  const getFrontText = () => {
    if (!shuffledItems[currentIndex]) return '';
    return isReversed ? shuffledItems[currentIndex].translation : shuffledItems[currentIndex].english;
  };

  const getBackText = () => {
    if (!shuffledItems[currentIndex]) return '';
    return isReversed ? shuffledItems[currentIndex].english : shuffledItems[currentIndex].translation;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center space-x-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Loading Your Vocabulary</h3>
            <p className="text-gray-600">Fetching your personal word collection...</p>
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
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (vocabItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-gray-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Your Vocabulary List is Empty</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Start building your personal vocabulary collection by adding words while studying flashcards.
            </p>
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How to add words:</h3>
              <ul className="text-left space-y-2 text-gray-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Study flashcards in practice mode</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Click "Add to My List" on any card</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Return here to review your collection</span>
                </li>
              </ul>
            </div>
            <button
              onClick={onBack}
              className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium"
            >
              Start Studying
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = shuffledItems[currentIndex];

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
              <p className="font-medium">Master your personal vocabulary collection</p>
            </div>
          </div>
        }
      />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">My Vocabulary List</h1>
              <p className="text-gray-600">Your personal collection of words to master</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Words</p>
                  <p className="text-xl font-bold text-gray-900">{vocabItems.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ready to Practice</p>
                  <p className="text-xl font-bold text-green-600">{filteredAndSortedItems.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Latest Addition</p>
                  <p className="text-sm font-bold text-purple-600">
                    {vocabItems.length > 0 && vocabItems[0] ? getTimeAgo(vocabItems[0].added_at) : 'None'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">With Notes</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {vocabItems.filter(item => item.notes).length}
                  </p>
                </div>
              </div>
            </div>
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
                  placeholder="Search words or translations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="date">Sort by Date</option>
                  <option value="english">Sort by English</option>
                  <option value="translation">Sort by Translation</option>
                </select>
                <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-purple-100 text-purple-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-purple-100 text-purple-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              
              {/* Practice Mode Toggle */}
              <button
                onClick={() => setPracticeMode(!practiceMode)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  practiceMode 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <Play className="h-4 w-4" />
                <span>{practiceMode ? 'Exit Practice' : 'Practice Mode'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Practice Mode */}
        {practiceMode && currentItem && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Practice Your Vocabulary</h2>
              <p className="text-gray-600">
                {currentIndex + 1} of {shuffledItems.length} words
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / shuffledItems.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>Progress</span>
                <span>{Math.round(((currentIndex + 1) / shuffledItems.length) * 100)}%</span>
              </div>
            </div>

            {/* Flashcard */}
            <div className="relative mb-8">
              <div
                className="relative w-full h-80 cursor-pointer transition-all duration-500"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* Front */}
                <div
                  className={`
                    absolute inset-0 w-full h-full bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border-2 border-gray-200
                    flex items-center justify-center p-8 text-center
                    transition-all duration-500 transform
                    ${isFlipped ? 'opacity-0 scale-95 rotate-y-180' : 'opacity-100 scale-100 rotate-y-0'}
                  `}
                >
                  <div>
                    <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                      {getFrontText()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Click to reveal {isReversed ? 'English' : 'translation'}
                    </div>
                  </div>
                </div>

                {/* Back */}
                <div
                  className={`
                    absolute inset-0 w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl border-2 border-purple-200
                    flex items-center justify-center p-8 text-center
                    transition-all duration-500 transform
                    ${isFlipped ? 'opacity-100 scale-100 rotate-y-0' : 'opacity-0 scale-95 rotate-y-180'}
                  `}
                >
                  <div>
                    <div className="text-4xl md:text-5xl font-bold text-purple-900 mb-4">
                      {getBackText()}
                    </div>
                    {currentItem.notes && (
                      <div className="mt-6 p-4 bg-purple-100 rounded-xl">
                        <div className="text-sm text-purple-800 font-medium mb-2">Notes:</div>
                        <div className="text-purple-700">{currentItem.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-center space-x-4 mb-8">
              <button
                onClick={prevItem}
                disabled={currentIndex === 0}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Previous</span>
              </button>
              
              <button
                onClick={() => setIsReversed(!isReversed)}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors bg-purple-200 text-purple-700 hover:bg-purple-300"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Reverse</span>
              </button>
              
              <button
                onClick={isShuffled ? resetOrder : shuffleItems}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors bg-orange-200 text-orange-700 hover:bg-orange-300"
              >
                <Shuffle className="h-5 w-5" />
                <span>{isShuffled ? 'Reset Order' : 'Shuffle'}</span>
              </button>
              
              <button
                onClick={nextItem}
                disabled={currentIndex === shuffledItems.length - 1}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <span>Next</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="text-xs text-gray-500 text-center">
              <div className="flex justify-center space-x-6">
                <span>Space/→: Flip or Next</span>
                <span>←: Previous</span>
                <span>R: Reverse Mode</span>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {!practiceMode && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Vocabulary Collection</h2>
              <div className="flex space-x-2">
                <button
                  onClick={shuffleItems}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-purple-200 text-purple-700 hover:bg-purple-300"
                >
                  <Shuffle className="h-4 w-4" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>

            {/* No Results */}
            {filteredAndSortedItems.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No matching words found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search terms to find what you're looking for.
                </p>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Vocabulary Items */}
            {filteredAndSortedItems.length > 0 && (
              <div className={`grid gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {filteredAndSortedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`
                      bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:scale-105
                      ${viewMode === 'list' ? 'flex items-center justify-between' : ''}
                    `}
                  >
                    {viewMode === 'grid' ? (
                      // Grid View
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm text-gray-500">#{index + 1}</span>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{getTimeAgo(item.added_at)}</span>
                              </div>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{item.english}</h3>
                            <p className="text-purple-600 font-medium">{item.translation}</p>
                          </div>
                          <button
                            onClick={() => removeItem(item)}
                            disabled={removingItem === item.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {removingItem === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        
                        {/* Notes */}
                        {item.notes && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="text-xs text-purple-700 font-medium mb-1">Notes:</div>
                            <div className="text-sm text-purple-800">{item.notes}</div>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                              <Bookmark className="h-4 w-4" />
                            </button>
                          </div>
                          <button className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                            Practice
                          </button>
                        </div>
                      </div>
                    ) : (
                      // List View
                      <>
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="text-sm text-gray-500 w-8">{index + 1}</div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div>
                                <div className="font-bold text-gray-900 text-lg">{item.english}</div>
                                <div className="text-purple-600 font-medium">{item.translation}</div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">{getTimeAgo(item.added_at)}</span>
                              </div>
                            </div>
                            {item.notes && (
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Notes:</span> {item.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeItem(item)}
                            disabled={removingItem === item.id}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {removingItem === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span>Remove</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Advertisement */}
      <TargetedAdContainer placement="footer" className="py-8 flex justify-center" />
    </div>
  );
};

export default VocabListViewer; 