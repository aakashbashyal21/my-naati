// Audio Dialog Practice Types

export interface AudioDialog {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  language_pair: string;
  created_at: string;
  updated_at: string;
}

export interface AudioChunk {
  id: string;
  dialog_id: string;
  chunk_order: number;
  speaker: 'en' | 'np';
  audio_url: string;
  duration_seconds?: number;
  created_at: string;
} 