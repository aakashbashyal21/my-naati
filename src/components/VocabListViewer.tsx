import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { 
  getUserVocabList,
  removeWordFromVocabList
} from '../lib/database';
import { VocabListItem } from '../types/flashcard';
import { useAuth } from '../hooks/useAuth';

interface VocabListViewerProps {
  onBack: () => void;
}

const VocabListViewer: React.FC<VocabListViewerProps> = ({ onBack }) => {
  const { user } = useAuth();
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

  useEffect(() => {
    loadVocabList();
  }, [user]);

  const loadVocabList = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const items = await getUserVocabList(user.id);
      setVocabItems(items);
      setShuffledItems(items);
    } catch (err) {
      console.error('Error loading vocab list:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vocab list');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-700">Loading your vocab list...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-800">Error Loading Vocab List</h2>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (vocabItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Vocab List is Empty</h2>
          <p className="text-gray-600 mb-6">
            Start adding words to your personal vocabulary list while studying flashcards.
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back to Study
          </button>
        </div>
      </div>
    );
  }

  const currentItem = shuffledItems[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 lg:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{vocabItems.length}</div>
              <div className="text-sm text-gray-600">Words in List</div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setPracticeMode(!practiceMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  practiceMode 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {practiceMode ? 'Exit Practice' : 'Practice Mode'}
              </button>
            </div>
          </div>
        </div>

        {/* Practice Mode */}
        {practiceMode && currentItem && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Your Vocab List</h2>
              <p className="text-gray-600">
                {currentIndex + 1} of {shuffledItems.length} words
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / shuffledItems.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Progress</span>
                <span>{Math.round(((currentIndex + 1) / shuffledItems.length) * 100)}%</span>
              </div>
            </div>

            {/* Flashcard */}
            <div className="relative mb-8">
              <div
                className={`
                  relative w-full h-80 cursor-pointer transition-all duration-500
                `}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* Front */}
                <div
                  className={`
                    absolute inset-0 w-full h-full bg-white rounded-xl shadow-lg border-2 border-gray-200
                    flex items-center justify-center p-8 text-center
                    transition-all duration-500 transform
                    ${isFlipped ? 'opacity-0 scale-95 rotate-y-180' : 'opacity-100 scale-100 rotate-y-0'}
                  `}
                >
                  <div>
                    <div className="text-3xl md:text-4xl font-medium text-gray-900 mb-4">
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
                    absolute inset-0 w-full h-full bg-blue-50 rounded-xl shadow-lg border-2 border-blue-200
                    flex items-center justify-center p-8 text-center
                    transition-all duration-500 transform
                    ${isFlipped ? 'opacity-100 scale-100 rotate-y-0' : 'opacity-0 scale-95 rotate-y-180'}
                  `}
                >
                  <div>
                    <div className="text-3xl md:text-4xl font-medium text-blue-900 mb-4">
                      {getBackText()}
                    </div>
                    <div className="text-sm text-blue-600">
                      {currentItem.notes && (
                        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                          <div className="text-xs text-blue-800 font-medium mb-1">Notes:</div>
                          <div className="text-sm text-blue-700">{currentItem.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-center space-x-4 mb-8">
              <button
                onClick={prevItem}
                disabled={currentIndex === 0}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              
              <button
                onClick={() => setIsReversed(!isReversed)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-purple-200 text-purple-700 hover:bg-purple-300"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reverse</span>
              </button>
              
              <button
                onClick={isShuffled ? resetOrder : shuffleItems}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-orange-200 text-orange-700 hover:bg-orange-300"
              >
                <Shuffle className="h-4 w-4" />
                <span>{isShuffled ? 'Reset Order' : 'Shuffle'}</span>
              </button>
              
              <button
                onClick={nextItem}
                disabled={currentIndex === shuffledItems.length - 1}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
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
              <h2 className="text-2xl font-bold text-gray-900">Your Vocabulary List</h2>
              <div className="flex space-x-2">
                <button
                  onClick={shuffleItems}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-blue-200 text-blue-700 hover:bg-blue-300"
                >
                  <Shuffle className="h-4 w-4" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {shuffledItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-500 w-8">{index + 1}</div>
                      <div>
                        <div className="font-medium text-gray-900">{item.english}</div>
                        <div className="text-gray-600">{item.translation}</div>
                        {item.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            <span className="font-medium">Notes:</span> {item.notes}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Added {new Date(item.added_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabListViewer; 