export interface Language {
  id: string;
  code: string; // e.g., 'ne', 'es', 'hi'
  name: string; // e.g., 'Nepali', 'Spanish', 'Hindi'
  native_name?: string; // e.g., 'नेपाली', 'Español', 'हिन्दी'
  flag_emoji?: string; // e.g., '🇳🇵', '🇪🇸', '🇮🇳'
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LanguageProficiency {
  id: string;
  user_id: string;
  language_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'native';
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLanguage {
  language_id: string;
  language_code: string;
  language_name: string;
  native_name?: string;
  flag_emoji?: string;
  proficiency_level?: string;
  is_primary?: boolean;
}

export interface LanguageWithStats extends Language {
  category_count: number;
  test_set_count: number;
  flashcard_count: number;
  user_count: number;
}

export interface LanguageFormData {
  code: string;
  name: string;
  native_name?: string;
  flag_emoji?: string;
  is_active: boolean;
} 