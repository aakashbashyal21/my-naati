import { supabase } from './supabase';
import { VocabListItem } from '../types/flashcard';
import { Language, UserLanguage } from '../types/language';
import { AudioDialog, AudioChunk } from '../types/audio';

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  preferred_language_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  language_id: string;
  created_at: string;
  updated_at: string;
  language?: {
    name: string;
    code: string;
    flag_emoji?: string;
  };
  test_set_count?: number;
}

export interface TestSet {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  language_id: string;
  created_at: string;
  updated_at: string;
  category?: Category;
  language?: {
    name: string;
    code: string;
    flag_emoji?: string;
  };
  flashcard_count?: number;
}

export interface Flashcard {
  id: string;
  test_set_id: string;
  english: string;
  translation: string;
  language_id: string;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  status: 'new' | 'learning' | 'known' | 'needs_practice';
  last_reviewed: string | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_cards: number;
  known_cards: number;
  learning_cards: number;
  needs_practice_cards: number;
  new_cards: number;
}

export interface TestSetProgress {
  test_set_id: string;
  test_set_name: string;
  category_name: string;
  total_cards: number;
  known_cards: number;
  learning_cards: number;
  needs_practice_cards: number;
  new_cards: number;
  last_studied: string | null;
  completion_percentage: number;
}

export interface FlashcardProgress {
  flashcard_id: string;
  english: string;
  translation: string;
  status: 'new' | 'learning' | 'known' | 'needs_practice';
  last_reviewed: string | null;
  review_count: number;
}

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  total_study_days: number;
  total_points: number;
  level: number;
  experience_points: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
  badge_color: string;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  points_earned: number;
  achievement?: Achievement;
}

export interface DailyStats {
  id: string;
  user_id: string;
  date: string;
  cards_studied: number;
  cards_known: number;
  cards_needs_practice: number;
  study_time_minutes: number;
  sessions_completed: number;
  test_sets_practiced: string[];
  created_at: string;
}

export interface UserAnalytics {
  total_cards: number;
  known_cards: number;
  learning_cards: number;
  needs_practice_cards: number;
  current_streak: number;
  longest_streak: number;
  total_study_days: number;
  total_points: number;
  user_level: number;
  recent_achievements: any[];
  weekly_progress: any[];
  category_progress: any[];
}

export interface AdminAnalytics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  new_users_this_month: number;
  total_categories: number;
  total_test_sets: number;
  total_flashcards: number;
  total_study_sessions: number;
  total_cards_studied: number;
  total_study_hours: number;
  average_streak: number;
  top_categories: any[];
  user_growth_data: any[];
  engagement_metrics: any[];
  user_roles: any[];
  most_active_users: any[];
}

// User Profile Functions
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

export const updateUserRole = async (userId: string, role: 'user' | 'admin' | 'super_admin'): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  
  if (error) throw error;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Category Functions
export const getCategories = async (): Promise<Category[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      language:languages(name, code, flag_emoji)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createCategory = async (name: string, description: string, languageId?: string): Promise<Category> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // If no languageId provided, default to English
  let finalLanguageId = languageId;
  if (!finalLanguageId) {
    const { data: englishLang } = await supabase
      .from('languages')
      .select('id')
      .eq('code', 'en')
      .single();
    finalLanguageId = englishLang?.id;
  }
  
  if (!finalLanguageId) {
    throw new Error('No language specified and English language not found');
  }
  
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      description,
      created_by: user.id,
      language_id: finalLanguageId
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateCategory = async (id: string, name: string, description: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('categories')
    .update({ 
      name, 
      description, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteCategory = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Test Set Functions
export const getTestSets = async (categoryId?: string): Promise<TestSet[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  let query = supabase
    .from('test_sets')
    .select(`
      *,
      category:categories(*),
      flashcard_count:flashcards(count)
    `)
    .order('created_at', { ascending: false });
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    ...item,
    flashcard_count: item.flashcard_count?.[0]?.count || 0
  }));
};

export const createTestSet = async (
  categoryId: string, 
  name: string, 
  description: string,
  languageId?: string
): Promise<TestSet> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // If no languageId provided, get it from the category
  let finalLanguageId = languageId;
  if (!finalLanguageId) {
    const { data: category } = await supabase
      .from('categories')
      .select('language_id')
      .eq('id', categoryId)
      .single();
    finalLanguageId = category?.language_id;
  }
  
  if (!finalLanguageId) {
    throw new Error('No language specified and category language not found');
  }
  
  const { data, error } = await supabase
    .from('test_sets')
    .insert({
      category_id: categoryId,
      name,
      description,
      created_by: user.id,
      language_id: finalLanguageId
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTestSet = async (
  id: string, 
  name: string, 
  description: string
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('test_sets')
    .update({ 
      name, 
      description, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteTestSet = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('test_sets')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Flashcard Functions
export const getFlashcards = async (testSetId: string): Promise<Flashcard[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('test_set_id', testSetId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const bulkCreateFlashcards = async (
  testSetId: string, 
  flashcards: { english: string; translation: string }[],
  languageId?: string
): Promise<number> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  // If no languageId provided, get it from the test set
  let finalLanguageId = languageId;
  if (!finalLanguageId) {
    const { data: testSet } = await supabase
      .from('test_sets')
      .select('language_id')
      .eq('id', testSetId)
      .single();
    finalLanguageId = testSet?.language_id;
  }
  
  if (!finalLanguageId) {
    throw new Error('No language specified and test set language not found');
  }
  
  // Convert flashcards array to JSONB format expected by the function
  const csvData = flashcards.map(card => ({
    english: card.english,
    translation: card.translation,
    language_id: finalLanguageId
  }));
  
  const { data, error } = await supabase.rpc('bulk_insert_flashcards', {
    test_set_uuid: testSetId,
    csv_data: csvData
  });
  
  if (error) throw error;
  return data || 0;
};

export const deleteFlashcard = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// User Progress Functions
export const getUserStats = async (userId: string): Promise<UserStats> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_user_stats', {
    user_uuid: userId
  });
  
  if (error) throw error;
  
  const stats = data?.[0] || {
    total_cards: 0,
    known_cards: 0,
    learning_cards: 0,
    needs_practice_cards: 0,
    new_cards: 0
  };
  
  return {
    total_cards: Number(stats.total_cards),
    known_cards: Number(stats.known_cards),
    learning_cards: Number(stats.learning_cards),
    needs_practice_cards: Number(stats.needs_practice_cards),
    new_cards: Number(stats.new_cards)
  };
};

export const getUserStatsByLanguage = async (userId: string, languageId: string): Promise<UserStats> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_user_stats_by_language', {
    user_uuid: userId,
    language_uuid: languageId
  });
  
  if (error) throw error;
  
  const stats = data?.[0] || {
    total_cards: 0,
    known_cards: 0,
    learning_cards: 0,
    needs_practice_cards: 0,
    new_cards: 0
  };
  
  return {
    total_cards: Number(stats.total_cards),
    known_cards: Number(stats.known_cards),
    learning_cards: Number(stats.learning_cards),
    needs_practice_cards: Number(stats.needs_practice_cards),
    new_cards: Number(stats.new_cards)
  };
};

export const getUserStatsDetailed = async (userId: string): Promise<TestSetProgress[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_user_stats_detailed', {
    user_uuid: userId
  });
  
  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    test_set_id: item.test_set_id,
    test_set_name: item.test_set_name,
    category_name: item.category_name,
    total_cards: Number(item.total_cards),
    known_cards: Number(item.known_cards),
    learning_cards: Number(item.learning_cards),
    needs_practice_cards: Number(item.needs_practice_cards),
    new_cards: Number(item.new_cards),
    last_studied: item.last_studied,
    completion_percentage: Number(item.completion_percentage || 0)
  }));
};

export const getUserStatsDetailedByLanguage = async (userId: string, languageId: string): Promise<TestSetProgress[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_user_stats_detailed_by_language', {
    user_uuid: userId,
    language_uuid: languageId
  });
  
  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    test_set_id: item.test_set_id,
    test_set_name: item.test_set_name,
    category_name: item.category_name,
    total_cards: Number(item.total_cards),
    known_cards: Number(item.known_cards),
    learning_cards: Number(item.learning_cards),
    needs_practice_cards: Number(item.needs_practice_cards),
    new_cards: Number(item.new_cards),
    last_studied: item.last_studied,
    completion_percentage: Number(item.completion_percentage || 0)
  }));
};

export const initializeUserProgress = async (userId: string, testSetId: string): Promise<number> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('initialize_user_progress', {
    user_uuid: userId,
    test_set_uuid: testSetId
  });
  
  if (error) throw error;
  return data || 0;
};

export const getTestSetProgress = async (userId: string, testSetId: string): Promise<FlashcardProgress[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_test_set_progress', {
    user_uuid: userId,
    test_set_uuid: testSetId
  });
  
  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    flashcard_id: item.flashcard_id,
    english: item.english,
    translation: item.translation,
    status: item.status,
    last_reviewed: item.last_reviewed,
    review_count: Number(item.review_count || 0)
  }));
};

export const getResumePosition = async (userId: string, testSetId: string): Promise<{
  resumeIndex: number;
  totalCards: number;
  reason: string;
  isShuffled: boolean;
  isReversed: boolean;
}> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_resume_position', {
    user_uuid: userId,
    test_set_uuid: testSetId
  });
  
  if (error) throw error;
  
  const result = data?.[0] || { 
    resume_index: 0, 
    total_cards: 0, 
    reason: 'Starting from beginning',
    is_shuffled: false,
    is_reversed: false
  };
  return {
    resumeIndex: Number(result.resume_index),
    totalCards: Number(result.total_cards),
    reason: result.reason,
    isShuffled: Boolean(result.is_shuffled),
    isReversed: Boolean(result.is_reversed)
  };
};

export const updateSessionPosition = async (
  userId: string,
  testSetId: string,
  currentPosition: number,
  totalCards?: number,
  isShuffled?: boolean,
  isReversed?: boolean
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase.rpc('update_session_position', {
    user_uuid: userId,
    test_set_uuid: testSetId,
    current_position: currentPosition,
    total_cards: totalCards,
    is_shuffled: isShuffled,
    is_reversed: isReversed
  });
  
  if (error) throw error;
};

export const getCardsByPriority = async (userId: string, testSetId: string): Promise<{
  flashcard_id: string;
  english: string;
  translation: string;
  status: 'new' | 'learning' | 'known' | 'needs_practice';
  priority_order: number;
  original_order: number;
}[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_cards_by_priority', {
    user_uuid: userId,
    test_set_uuid: testSetId
  });
  
  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    flashcard_id: item.flashcard_id,
    english: item.english,
    translation: item.translation,
    status: item.status,
    priority_order: Number(item.priority_order),
    original_order: Number(item.original_order)
  }));
};

export const updateUserProgress = async (
  userId: string,
  flashcardId: string,
  status: 'new' | 'learning' | 'known' | 'needs_practice'
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase.rpc('update_user_progress_safe', {
    user_uuid: userId,
    flashcard_uuid: flashcardId,
    new_status: status
  });
  
  if (error) throw error;
};

export const getUserProgress = async (
  userId: string, 
  testSetId?: string
): Promise<UserProgress[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  let query = supabase
    .from('user_progress')
    .select(`
      *,
      flashcard:flashcards(*)
    `)
    .eq('user_id', userId);
  
  if (testSetId) {
    query = query.eq('flashcard.test_set_id', testSetId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
};

// Analytics Functions
export const getUserAnalytics = async (userId: string): Promise<UserAnalytics> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_user_analytics', {
    user_uuid: userId
  });
  
  if (error) throw error;
  
  // The function now returns JSON directly
  const result = data || {
    total_cards: 0,
    known_cards: 0,
    learning_cards: 0,
    needs_practice_cards: 0,
    current_streak: 0,
    longest_streak: 0,
    total_study_days: 0,
    total_points: 0,
    user_level: 1,
    recent_achievements: [],
    weekly_progress: [],
    category_progress: []
  };
  
  return {
    total_cards: Number(result.total_cards || 0),
    known_cards: Number(result.known_cards || 0),
    learning_cards: Number(result.learning_cards || 0),
    needs_practice_cards: Number(result.needs_practice_cards || 0),
    current_streak: Number(result.current_streak || 0),
    longest_streak: Number(result.longest_streak || 0),
    total_study_days: Number(result.total_study_days || 0),
    total_points: Number(result.total_points || 0),
    user_level: Number(result.user_level || 1),
    recent_achievements: result.recent_achievements || [],
    weekly_progress: result.weekly_progress || [],
    category_progress: result.category_progress || []
  };
};

export const getUserAnalyticsByLanguage = async (userId: string, languageId: string): Promise<UserAnalytics> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_user_analytics_by_language', {
    user_uuid: userId,
    language_uuid: languageId
  });
  
  if (error) throw error;
  
  // The function now returns JSON directly
  const result = data || {
    total_cards: 0,
    known_cards: 0,
    learning_cards: 0,
    needs_practice_cards: 0,
    current_streak: 0,
    longest_streak: 0,
    total_study_days: 0,
    total_points: 0,
    user_level: 1,
    recent_achievements: [],
    weekly_progress: [],
    category_progress: []
  };
  
  return {
    total_cards: Number(result.total_cards || 0),
    known_cards: Number(result.known_cards || 0),
    learning_cards: Number(result.learning_cards || 0),
    needs_practice_cards: Number(result.needs_practice_cards || 0),
    current_streak: Number(result.current_streak || 0),
    longest_streak: Number(result.longest_streak || 0),
    total_study_days: Number(result.total_study_days || 0),
    total_points: Number(result.total_points || 0),
    user_level: Number(result.user_level || 1),
    recent_achievements: result.recent_achievements || [],
    weekly_progress: result.weekly_progress || [],
    category_progress: result.category_progress || []
  };
};

export const getAdminAnalytics = async (): Promise<AdminAnalytics> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_admin_analytics');
  
  if (error) throw error;
  
  // The function now returns JSON directly
  const result = data || {
    total_users: 0,
    active_users_today: 0,
    active_users_week: 0,
    new_users_this_month: 0,
    total_categories: 0,
    total_test_sets: 0,
    total_flashcards: 0,
    total_study_sessions: 0,
    total_cards_studied: 0,
    total_study_hours: 0,
    average_streak: 0,
    top_categories: [],
    user_growth_data: [],
    engagement_metrics: [],
    user_roles: [],
    most_active_users: []
  };
  
  return {
    total_users: Number(result.total_users || 0),
    active_users_today: Number(result.active_users_today || 0),
    active_users_week: Number(result.active_users_week || 0),
    new_users_this_month: Number(result.new_users_this_month || 0),
    total_categories: Number(result.total_categories || 0),
    total_test_sets: Number(result.total_test_sets || 0),
    total_flashcards: Number(result.total_flashcards || 0),
    total_study_sessions: Number(result.total_study_sessions || 0),
    total_cards_studied: Number(result.total_cards_studied || 0),
    total_study_hours: Number(result.total_study_hours || 0),
    average_streak: Number(result.average_streak || 0),
    top_categories: result.top_categories || [],
    user_growth_data: result.user_growth_data || [],
    engagement_metrics: result.engagement_metrics || [],
    user_roles: result.user_roles || [],
    most_active_users: result.most_active_users || []
  };
};

// Gamification Functions
export const updateDailyStats = async (
  userId: string,
  cardsStudied: number = 0,
  cardsKnown: number = 0,
  cardsPractice: number = 0,
  studyMinutes: number = 0,
  testSetId?: string
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase.rpc('update_daily_stats', {
    user_uuid: userId,
    cards_studied_count: cardsStudied,
    cards_known_count: cardsKnown,
    cards_practice_count: cardsPractice,
    study_minutes: studyMinutes,
    test_set_id: testSetId || null
  });
  
  if (error) throw error;
};

export const checkAndAwardAchievements = async (userId: string): Promise<number> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('check_and_award_achievements', {
    user_uuid: userId
  });
  
  if (error) throw error;
  return data || 0;
};

export const getUserStreak = async (userId: string): Promise<UserStreak | null> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

export const getUserAchievements = async (userId: string): Promise<UserAchievement[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievement_definitions(*)
    `)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getAchievementDefinitions = async (): Promise<Achievement[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('is_active', true)
    .order('points', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

// Vocab List Functions
export const addWordToVocabList = async (
  userId: string,
  english: string,
  translation: string,
  sourceFlashcardId?: string,
  notes?: string
): Promise<string | null> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  console.log('Database: Adding word to vocab list:', {
    userId,
    english,
    translation,
    sourceFlashcardId,
    notes
  });
  
  const { data, error } = await supabase.rpc('add_word_to_vocab_list', {
    user_uuid: userId,
    english_text: english,
    translation_text: translation,
    source_flashcard_uuid: sourceFlashcardId || null,
    notes_text: notes || null
  });
  
  if (error) {
    console.error('Database error:', error);
    throw error;
  }
  
  console.log('Database: Word added successfully:', data);
  return data;
};

export const removeWordFromVocabList = async (
  userId: string,
  english: string,
  translation: string
): Promise<boolean> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('remove_word_from_vocab_list', {
    user_uuid: userId,
    english_text: english,
    translation_text: translation
  });
  
  if (error) throw error;
  return data;
};

export const getUserVocabList = async (userId: string): Promise<VocabListItem[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_user_vocab_list', {
    user_uuid: userId
  });
  
  if (error) throw error;
  return data || [];
};

export const getUserVocabListByLanguage = async (userId: string, languageId: string): Promise<VocabListItem[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('vocab_list_items')
    .select(`
      *,
      vocab_list:user_vocab_lists!inner(user_id)
    `)
    .eq('vocab_list.user_id', userId)
    .eq('language_id', languageId)
    .order('added_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const isWordInVocabList = async (
  userId: string,
  english: string,
  translation: string
): Promise<boolean> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('is_word_in_vocab_list', {
    user_uuid: userId,
    english_text: english,
    translation_text: translation
  });
  
  if (error) throw error;
  return data || false;
};

// Language Management Functions
export const getAllLanguages = async (): Promise<Language[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('languages')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const getActiveLanguages = async (): Promise<Language[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('languages')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const createLanguage = async (languageData: {
  code: string;
  name: string;
  native_name?: string;
  flag_emoji?: string;
  is_active?: boolean;
}): Promise<Language> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('languages')
    .insert({
      ...languageData,
      is_active: languageData.is_active ?? true
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateLanguage = async (
  id: string,
  languageData: {
    code?: string;
    name?: string;
    native_name?: string;
    flag_emoji?: string;
    is_active?: boolean;
  }
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('languages')
    .update({
      ...languageData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteLanguage = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('languages')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getUserLanguages = async (userId: string): Promise<UserLanguage[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .rpc('get_user_languages', { user_uuid: userId });
  
  if (error) throw error;
  return data || [];
};

export const setUserLanguageProficiency = async (
  userId: string,
  languageId: string,
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'native',
  isPrimary: boolean = false
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  // If setting as primary, unset other primary languages
  if (isPrimary) {
    await supabase
      .from('language_proficiencies')
      .update({ is_primary: false })
      .eq('user_id', userId);
  }
  
  const { error } = await supabase
    .from('language_proficiencies')
    .update({
      user_id: userId,
      language_id: languageId,
      proficiency_level: proficiencyLevel,
      is_primary: isPrimary
    })
    .eq('user_id', userId)
    .eq('language_id', languageId);
  
  if (error) throw error;
};

// Language-specific category and test set functions
export const getCategoriesByLanguage = async (languageId: string): Promise<Category[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .rpc('get_categories_by_language', { lang_id: languageId });
  
  if (error) throw error;
  return data || [];
};

export const getTestSetsByLanguage = async (languageId: string): Promise<TestSet[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .rpc('get_test_sets_by_language', { lang_id: languageId });
  
  if (error) throw error;
  return data || [];
};

// Preferred Language Functions
export const getUserPreferredLanguage = async (userId: string): Promise<string | null> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('preferred_language_id')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data?.preferred_language_id || null;
};

export const setUserPreferredLanguage = async (userId: string, languageId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .rpc('update_user_preferred_language', {
      user_id: userId,
      language_id: languageId
    });
  
  if (error) throw error;
};

// Audio Dialog Practice Feature
// --- Audio Dialogs ---
export const getAudioDialogs = async (): Promise<AudioDialog[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('audio_dialogs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createAudioDialog = async (dialog: Partial<AudioDialog>): Promise<AudioDialog> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('audio_dialogs')
    .insert([dialog])
    .single();
  if (error) throw error;
  return data;
};

export const updateAudioDialog = async (id: string, updates: Partial<AudioDialog>): Promise<AudioDialog> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('audio_dialogs')
    .update(updates)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const deleteAudioDialog = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('audio_dialogs')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- Audio Chunks ---
export const getAudioChunks = async (dialogId: string): Promise<AudioChunk[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('audio_chunks')
    .select('*')
    .eq('dialog_id', dialogId)
    .order('chunk_order', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createAudioChunk = async (chunk: Partial<AudioChunk>): Promise<AudioChunk> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('audio_chunks')
    .insert([chunk])
    .single();
  if (error) throw error;
  return data;
};

export const updateAudioChunk = async (id: string, updates: Partial<AudioChunk>): Promise<AudioChunk> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('audio_chunks')
    .update(updates)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const deleteAudioChunk = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('audio_chunks')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- Audio Upload ---
export const uploadAudioFile = async (file: File, dialogId: string, chunkOrder: number): Promise<string> => {
  if (!supabase) throw new Error('Supabase not configured');
  const filePath = `dialog-${dialogId}/chunk-${chunkOrder}-${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('audio-dialogs')
    .upload(filePath, file, { upsert: true });
  if (error) throw error;
  // Get public URL
  const { data: urlData } = supabase.storage.from('audio-dialogs').getPublicUrl(filePath);
  return urlData.publicUrl;
};