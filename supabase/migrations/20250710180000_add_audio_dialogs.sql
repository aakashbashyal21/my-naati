-- Audio Dialog Practice Feature

-- Table: audio_dialogs
CREATE TABLE IF NOT EXISTS audio_dialogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  language_pair text NOT NULL, -- e.g. 'en-np'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: audio_chunks
CREATE TABLE IF NOT EXISTS audio_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dialog_id uuid NOT NULL REFERENCES audio_dialogs(id) ON DELETE CASCADE,
  chunk_order integer NOT NULL,
  speaker text NOT NULL CHECK (speaker IN ('en', 'np')),
  audio_url text NOT NULL,
  duration_seconds integer,
  created_at timestamptz DEFAULT now()
);

-- Index for fast chunk ordering
CREATE INDEX IF NOT EXISTS idx_audio_chunks_dialog_order ON audio_chunks(dialog_id, chunk_order); 