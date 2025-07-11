export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

export interface TestSet {
  id: string;
  category_id: string;
  name: string;
  description: string;
  csv_data: string[][];
  created_at: string;
  total_cards: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  test_set_id: string;
  current_index: number;
  known_cards: string[];
  practice_cards: string[];
  completed_at: string | null;
  last_accessed: string;
}