import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Shuffle, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  ArrowLeft,
  BookOpen,
  Loader2
} from 'lucide-react';
import { FlashcardPair } from '../types/flashcard';
import { addWordToVocabList, isWordInVocabList } from '../lib/database';
import { useAuth } from '../hooks/useAuth';

interface FlashcardViewerProps {
  flashcards: FlashcardPair[];
  onUpdateProgress: (cardId: string, status: 'known' | 'practice' | 'reset') => void;
  onBack: () => void;
}

const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ 
  flashcards, 
  onUpdateProgress, 
  onBack 
}) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<FlashcardPair[]>(flashcards);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isInVocabList, setIsInVocabList] = useState(false);
  const [addingToVocabList, setAddingToVocabList] = useState(false);

  // Load saved position and state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('flashcard-viewer-state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.currentIndex !== undefined && state.currentIndex < flashcards.length) {
          setCurrentIndex(state.currentIndex);
        }
        if (state.isReversed !== undefined) {
          setIsReversed(state.isReversed);
        }
        if (state.isShuffled !== undefined) {
          setIsShuffled(state.isShuffled);
        }
        if (state.shuffledCards && state.shuffledCards.length === flashcards.length) {
          setShuffledCards(state.shuffledCards);
        }
      } catch (error) {
        console.error('Error loading flashcard viewer state:', error);
      }
    }
  }, [flashcards]);

  // Save current state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      currentIndex,
      isReversed,
      isShuffled,
      shuffledCards
    };
    localStorage.setItem('flashcard-viewer-state', JSON.stringify(state));
  }, [currentIndex, isReversed, isShuffled, shuffledCards]);

  const currentCard = shuffledCards[currentIndex];

  const shuffleCards = useCallback(() => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(true);
  }, [flashcards]);

  const resetOrder = useCallback(() => {
    setShuffledCards(flashcards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
  }, [flashcards]);

  const nextCard = useCallback(() => {
    console.log('nextCard called:', { currentIndex, totalCards: shuffledCards.length });
    if (currentIndex < shuffledCards.length - 1) {
      console.log('Advancing to next card, new index:', currentIndex + 1);
      setIsFlipped(false);
      setCurrentIndex(currentIndex + 1);
    } else {
      console.log('Already at last card');
    }
  }, [currentIndex, shuffledCards.length]);

  const prevCard = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (isFlipped) {
        nextCard();
      } else {
        setIsFlipped(true);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevCard();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      setIsReversed(!isReversed);
    }
  }, [isFlipped, nextCard, prevCard, isReversed]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const handleCardStatus = (status: 'known' | 'practice' | 'reset') => {
    onUpdateProgress(currentCard.id, status);
    
    // Auto-advance to next card after marking status
    if (status === 'known' || status === 'practice') {
      // First flip the card back, then advance
      setIsFlipped(false);
      setTimeout(() => {
        nextCard();
      }, 500); // Wait for flip animation to complete
    }
  };

  const checkVocabListStatus = async () => {
    if (!user || !currentCard) return;
    
    try {
      const inList = await isWordInVocabList(user.id, currentCard.english, currentCard.translation);
      setIsInVocabList(inList);
    } catch (error) {
      console.error('Error checking vocab list status:', error);
    }
  };

  const handleAddToVocabList = async () => {
    if (!user || !currentCard) return;
    
    console.log('Adding to vocab list:', {
      userId: user.id,
      english: currentCard.english,
      translation: currentCard.translation,
      cardId: currentCard.id
    });
    
    try {
      setAddingToVocabList(true);
      const result = await addWordToVocabList(user.id, currentCard.english, currentCard.translation, currentCard.id);
      console.log('Vocab list add result:', result);
      setIsInVocabList(true);
      
      // Auto-advance to next card after adding to vocab list
      setTimeout(() => {
        console.log('Advancing to next card...');
        setIsFlipped(false);
        setTimeout(() => {
          nextCard();
        }, 300);
      }, 500);
    } catch (error) {
      console.error('Error adding to vocab list:', error);
    } finally {
      setAddingToVocabList(false);
    }
  };

  // Check vocab list status when card changes
  useEffect(() => {
    checkVocabListStatus();
  }, [currentCard, user]);

  const getProgress = () => {
    const known = flashcards.filter(card => card.isKnown).length;
    const practice = flashcards.filter(card => card.needsPractice).length;
    const total = flashcards.length;
    
    return { known, practice, total };
  };

  const progress = getProgress();

  const getFrontText = () => {
    return isReversed ? currentCard.translation : currentCard.english;
  };

  const getBackText = () => {
    return isReversed ? currentCard.english : currentCard.translation;
  };

  const getLanguageLabel = () => {
    return isReversed ? 'Translation → English' : 'English → Translation';
  };

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Upload</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <BarChart3 className="h-4 w-4" />
            <span>Known: {progress.known}</span>
            <span>Practice: {progress.practice}</span>
            <span>Total: {progress.total}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsReversed(!isReversed)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${isReversed 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
          >
            <RotateCcw className="h-4 w-4" />
            <span>{getLanguageLabel()}</span>
          </button>
          
          <button
            onClick={isShuffled ? resetOrder : shuffleCards}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${isShuffled 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
          >
            <Shuffle className="h-4 w-4" />
            <span>{isShuffled ? 'Reset Order' : 'Shuffle'}</span>
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          {currentIndex + 1} of {shuffledCards.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / shuffledCards.length) * 100}%` }}
          />
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
              <div className="text-2xl md:text-3xl font-medium text-gray-900 mb-4">
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
              <div className="text-2xl md:text-3xl font-medium text-blue-900 mb-4">
                {getBackText()}
              </div>
              <div className="text-sm text-blue-600">
                Press space or → to continue
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Status Buttons */}
      {isFlipped && (
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => handleCardStatus('practice')}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
              ${currentCard.needsPractice 
                ? 'bg-yellow-600 text-white' 
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }
            `}
          >
            <AlertCircle className="h-4 w-4" />
            <span>Need Practice</span>
          </button>
          
          <button
            onClick={() => handleCardStatus('known')}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
              ${currentCard.isKnown 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
              }
            `}
          >
            <CheckCircle className="h-4 w-4" />
            <span>I Know This</span>
          </button>

          <button
            onClick={handleAddToVocabList}
            disabled={isInVocabList || addingToVocabList}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
              ${isInVocabList
                ? 'bg-gray-600 text-white cursor-not-allowed' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }
            `}
          >
            {addingToVocabList ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isInVocabList ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            <span>{isInVocabList ? 'In My List' : 'Add to My List'}</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevCard}
          disabled={currentIndex === 0}
          className={`
            flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
            ${currentIndex === 0 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>
        
        <div className="text-sm text-gray-600">
          Use ← → keys to navigate, Space to flip
        </div>
        
        <button
          onClick={nextCard}
          disabled={currentIndex === shuffledCards.length - 1}
          className={`
            flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
            ${currentIndex === shuffledCards.length - 1 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-8 text-xs text-gray-500 text-center">
        <div className="flex justify-center space-x-6">
          <span>Space/→: Flip or Next</span>
          <span>←: Previous</span>
          <span>R: Reverse Mode</span>
        </div>
      </div>
    </div>
  );
};

export default FlashcardViewer;