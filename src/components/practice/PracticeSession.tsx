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
  Play,
  Pause,
  SkipForward,
  Save,
  Trophy,
  BookOpen,
  Loader2
} from 'lucide-react';
import { 
  Flashcard, 
  updateUserProgress, 
  updateDailyStats,
  checkAndAwardAchievements,
  getTestSetProgress,
  getResumePosition,
  updateSessionPosition,
  FlashcardProgress,
  addWordToVocabList,
  isWordInVocabList
} from '../../lib/database';
import { useAuth } from '../../hooks/useAuth';
import TargetedAdContainer from '../advertisements/TargetedAdContainer';

interface PracticeSessionProps {
  testSetId: string;
  testSetName: string;
  flashcards: Flashcard[];
  onBack: () => void;
}

const PracticeSession: React.FC<PracticeSessionProps> = ({ 
  testSetId,
  testSetName,
  flashcards, 
  onBack 
}) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(flashcards);
  const [isShuffled, setIsShuffled] = useState(false);
  const [progress, setProgress] = useState<Record<string, FlashcardProgress>>({});
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    known: 0,
    needsPractice: 0
  });
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [resumeInfo, setResumeInfo] = useState<{
    resumeIndex: number;
    reason: string;
    isShuffled: boolean;
    isReversed: boolean;
  } | null>(null);
  const [showResumeMessage, setShowResumeMessage] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [newAchievements, setNewAchievements] = useState<number>(0);
  const [showBetweenSessionAd, setShowBetweenSessionAd] = useState(false);
  const [isInVocabList, setIsInVocabList] = useState(false);
  const [addingToVocabList, setAddingToVocabList] = useState(false);

  // Load progress data and saved session state
  useEffect(() => {
    const loadProgressData = async () => {
      if (!user) return;
      
      try {
        // Load actual progress from database and resume position
        const [progressData, resumeData] = await Promise.all([
          getTestSetProgress(user.id, testSetId),
          getResumePosition(user.id, testSetId)
        ]);
        
        const progressMap = progressData.reduce((acc, item) => {
          acc[item.flashcard_id] = item;
          return acc;
        }, {} as Record<string, FlashcardProgress>);
        
        setProgress(progressMap);
        setResumeInfo({
          resumeIndex: resumeData.resumeIndex,
          reason: resumeData.reason,
          isShuffled: resumeData.isShuffled,
          isReversed: resumeData.isReversed
        });
        
        // Calculate session stats based on current progress
        const stats = {
          studied: progressData.filter(p => p.status !== 'new').length,
          known: progressData.filter(p => p.status === 'known').length,
          needsPractice: progressData.filter(p => p.status === 'needs_practice').length
        };
        setSessionStats(stats);
        
        // Check for saved session state vs optimal resume position
        // Use the resume data from database
        setCurrentIndex(resumeData.resumeIndex);
        setIsReversed(resumeData.isReversed);
        setIsShuffled(resumeData.isShuffled);
        
        // Show resume message if not starting from beginning
        if (resumeData.resumeIndex > 0) {
          setShowResumeMessage(true);
          setTimeout(() => setShowResumeMessage(false), 5000);
        }
        
        // Set session start time
        setSessionStartTime(new Date());
      } catch (error) {
        console.error('Error loading progress data:', error);
      }
    };
    
    loadProgressData();
  }, [user, testSetId, flashcards]);

  // Auto-save session state to database
  useEffect(() => {
    const saveSessionState = async () => {
      if (!user) return;
      
      try {
        await updateSessionPosition(
          user.id,
          testSetId,
          currentIndex,
          flashcards.length,
          isShuffled,
          isReversed
        );
      } catch (error) {
        console.error('Error saving session state:', error);
      }
    };
    
    // Debounce the save operation
    const timeoutId = setTimeout(saveSessionState, 1000);
    return () => clearTimeout(timeoutId);
  }, [currentIndex, isReversed, isShuffled, testSetId, user, flashcards.length]);

  // Auto-save progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSaved(new Date());
    }, 30000); // Update last saved timestamp every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const currentCard = shuffledCards[currentIndex];

  // Check vocab list status when card changes
  useEffect(() => {
    const checkVocabListStatus = async () => {
      if (!user || !currentCard) return;
      
      try {
        const inList = await isWordInVocabList(user.id, currentCard.english, currentCard.translation);
        setIsInVocabList(inList);
      } catch (error) {
        console.error('Error checking vocab list status:', error);
      }
    };

    checkVocabListStatus();
  }, [currentCard, user]);

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

  const handleCardStatus = async (status: 'known' | 'needs_practice' | 'learning') => {
    if (!user || !currentCard) return;
    
    try {
      setAutoSaving(true);
      
      // Update progress in database
      await updateUserProgress(user.id, currentCard.id, status);
      
      // Update daily stats
      const studyMinutes = Math.round((new Date().getTime() - sessionStartTime.getTime()) / (1000 * 60));
      await updateDailyStats(
        user.id,
        1, // cards studied
        status === 'known' ? 1 : 0, // cards known
        status === 'needs_practice' ? 1 : 0, // cards needing practice
        Math.max(1, studyMinutes), // study time in minutes
        testSetId
      );
      
      // Check for new achievements
      const achievementsEarned = await checkAndAwardAchievements(user.id);
      if (achievementsEarned > 0) {
        setNewAchievements(prev => prev + achievementsEarned);
        // Show achievement notification
        setTimeout(() => setNewAchievements(0), 5000);
      }
      
      // Update local progress state
      setProgress(prev => ({
        ...prev,
        [currentCard.id]: {
          ...prev[currentCard.id],
          flashcard_id: currentCard.id,
          english: currentCard.english,
          translation: currentCard.translation,
          status,
          last_reviewed: new Date().toISOString(),
          review_count: (prev[currentCard.id]?.review_count || 0) + 1
        }
      }));
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        studied: prev.studied + (progress[currentCard.id]?.status === 'new' ? 1 : 0),
        known: status === 'known' ? prev.known + 1 : prev.known,
        needsPractice: status === 'needs_practice' ? prev.needsPractice + 1 : prev.needsPractice
      }));
      
      setLastSaved(new Date());
      
      // Auto-advance to next card after marking status
      setTimeout(() => {
        setIsFlipped(false);
        setTimeout(() => {
          // Show ad between sessions occasionally (every 10 cards)
          if ((currentIndex + 1) % 10 === 0) {
            setShowBetweenSessionAd(true);
            setTimeout(() => setShowBetweenSessionAd(false), 5000);
          }
          nextCard();
        }, 300);
      }, 500);
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setAutoSaving(false);
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

  const getProgressStats = () => {
    const known = Object.values(progress).filter(p => p.status === 'known').length;
    const needsPractice = Object.values(progress).filter(p => p.status === 'needs_practice').length;
    const learning = Object.values(progress).filter(p => p.status === 'learning').length;
    const total = flashcards.length;
    
    return { known, needsPractice, learning, total };
  };

  const stats = getProgressStats();

  const getFrontText = () => {
    return isReversed ? currentCard.translation : currentCard.english;
  };

  const getBackText = () => {
    return isReversed ? currentCard.english : currentCard.translation;
  };

  const getLanguageLabel = () => {
    return isReversed ? 'Translation → English' : 'English → Translation';
  };

  const getCurrentCardStatus = () => {
    return progress[currentCard?.id]?.status || 'new';
  };
  if (!currentCard) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Between Sessions Advertisement Modal */}
      {showBetweenSessionAd && (
        <TargetedAdContainer 
          placement="between_sessions"
          className="fixed inset-0 z-50 flex items-center justify-center"
          fallbackContent={
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
                <h3 className="text-lg font-semibold mb-2">Great Progress!</h3>
                <p className="text-gray-600">Keep up the excellent work with your NAATI preparation!</p>
                <button 
                  onClick={() => setShowBetweenSessionAd(false)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          }
        />
      )}
      
      <div className="max-w-4xl mx-auto">
        {/* Header Advertisement */}
        <TargetedAdContainer 
          placement="header" 
          className="mb-6 flex justify-center" 
          fallbackContent={
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 text-center">
              <p className="text-gray-600">🎯 Stay focused! You're making great progress on your NAATI journey.</p>
            </div>
          }
        />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Categories</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">{testSetName}</h1>
            <p className="text-sm text-gray-600">Practice Session</p>
            {showResumeMessage && resumeInfo && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-medium">
                  📍 {resumeInfo.reason}
                </p>
              </div>
            )}
            {autoSaving && (
              <div className="flex items-center justify-center space-x-1 text-xs text-blue-600 mt-1">
                <Save className="h-3 w-3 animate-pulse" />
                <span>Saving...</span>
              </div>
            )}
            {lastSaved && !autoSaving && (
              <p className="text-xs text-gray-500 mt-1">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            {newAchievements > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 font-medium flex items-center space-x-1">
                  <Trophy className="h-3 w-3" />
                  <span>🎉 {newAchievements} new achievement{newAchievements > 1 ? 's' : ''} earned!</span>
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <BarChart3 className="h-4 w-4" />
              <span>Known: {stats.known}</span>
              <span>Practice: {stats.needsPractice}</span>
              <span>Total: {stats.total}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {resumeInfo && resumeInfo.resumeIndex > 0 && (
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <SkipForward className="h-4 w-4 rotate-180" />
                <span>Start from Beginning</span>
              </button>
            )}
            
            <button
              onClick={() => setIsReversed(!isReversed)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isReversed 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
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
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
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
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / shuffledCards.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Progress</span>
            <span>{Math.round(((currentIndex + 1) / shuffledCards.length) * 100)}%</span>
          </div>
        </div>

        {/* Current Card Status */}
        <div className="mb-4 text-center">
          <span className={`
            inline-flex px-3 py-1 text-xs font-semibold rounded-full
            ${getCurrentCardStatus() === 'known' ? 'bg-green-100 text-green-800' :
              getCurrentCardStatus() === 'learning' ? 'bg-blue-100 text-blue-800' :
              getCurrentCardStatus() === 'needs_practice' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'}
          `}>
            {getCurrentCardStatus() === 'new' ? 'New Card' : 
             getCurrentCardStatus() === 'learning' ? 'Learning' :
             getCurrentCardStatus() === 'known' ? 'Known' :
             'Needs Practice'}
          </span>
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
                  How well do you know this word?
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Status Buttons */}
        {isFlipped && (
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => handleCardStatus('needs_practice')}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
                ${getCurrentCardStatus() === 'needs_practice'
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }
              `}
            >
              <AlertCircle className="h-4 w-4" />
              <span>Need Practice</span>
            </button>
            
            <button
              onClick={() => handleCardStatus('learning')}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
                ${getCurrentCardStatus() === 'learning'
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }
              `}
            >
              <Play className="h-4 w-4" />
              <span>Learning</span>
            </button>
            
            <button
              onClick={() => handleCardStatus('known')}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
                ${getCurrentCardStatus() === 'known'
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
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
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

        {/* Session Stats */}
        <div className="mt-8 bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Progress</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sessionStats.studied}</div>
              <div className="text-sm text-gray-600">Cards Studied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{sessionStats.known}</div>
              <div className="text-sm text-gray-600">Marked as Known</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{sessionStats.needsPractice}</div>
              <div className="text-sm text-gray-600">Need Practice</div>
            </div>
          </div>
        </div>

        {/* After Practice Advertisement */}
        {currentIndex === shuffledCards.length - 1 && (
          <TargetedAdContainer 
            placement="after_practice" 
            className="mt-8 flex justify-center"
            fallbackContent={
              <div className="bg-gradient-to-r from-green-100 to-teal-100 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🎉 Great Job!</h3>
                <p className="text-gray-600">You've completed this practice session. Keep up the excellent work!</p>
              </div>
            }
          />
        )}

        {/* Keyboard Shortcuts */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          <div className="flex justify-center space-x-6">
            <span>Space/→: Flip or Next</span>
            <span>←: Previous</span>
            <span>R: Reverse Mode</span>
          </div>
        </div>
        
        {/* Footer Advertisement */}
        <TargetedAdContainer placement="footer" className="mt-8 flex justify-center" />
      </div>
    </div>
  );
};

export default PracticeSession;