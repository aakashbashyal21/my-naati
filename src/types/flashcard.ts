export interface FlashcardPair {
  id: string;
  english: string;
  translation: string;
  isKnown?: boolean;
  needsPractice?: boolean;
}

export interface AppState {
  flashcards: FlashcardPair[];
  currentIndex: number;
  isFlipped: boolean;
  isReversed: boolean;
  isShuffled: boolean;
  showPreview: boolean;
  csvData: string[][];
}

// Vocab List Types
export interface VocabListItem {
  id: string;
  english: string;
  translation: string;
  added_at: string;
  notes?: string;
  source_flashcard_id?: string;
}

export interface UserVocabList {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  totalCards: number;
  knownCards: number;
  practiceCards: number;
  completedCards: number;
}