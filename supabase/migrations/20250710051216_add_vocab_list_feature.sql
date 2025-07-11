/*
  # Add Vocab List Feature

  1. New Tables
    - `user_vocab_lists` - Store user's personal vocab lists
    - `vocab_list_items` - Store words in each vocab list

  2. Functions
    - Add word to vocab list
    - Remove word from vocab list
    - Get user's vocab list
    - Create vocab list if doesn't exist

  3. Security
    - Enable RLS on all new tables
    - Users can only access their own vocab lists
*/

-- Create user vocab lists table
CREATE TABLE IF NOT EXISTS user_vocab_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Vocab List',
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create vocab list items table
CREATE TABLE IF NOT EXISTS vocab_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vocab_list_id uuid NOT NULL REFERENCES user_vocab_lists(id) ON DELETE CASCADE,
  english text NOT NULL,
  translation text NOT NULL,
  source_flashcard_id uuid REFERENCES flashcards(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(vocab_list_id, english, translation)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_vocab_lists_user_id ON user_vocab_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_list_items_list_id ON vocab_list_items(vocab_list_id);
CREATE INDEX IF NOT EXISTS idx_vocab_list_items_english ON vocab_list_items(english);

-- Enable RLS
ALTER TABLE user_vocab_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_vocab_lists
CREATE POLICY "Users can view their own vocab lists"
  ON user_vocab_lists
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own vocab lists"
  ON user_vocab_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own vocab lists"
  ON user_vocab_lists
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own vocab lists"
  ON user_vocab_lists
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for vocab_list_items
CREATE POLICY "Users can view items in their vocab lists"
  ON vocab_list_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_vocab_lists 
      WHERE id = vocab_list_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items in their vocab lists"
  ON vocab_list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_vocab_lists 
      WHERE id = vocab_list_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their vocab lists"
  ON vocab_list_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_vocab_lists 
      WHERE id = vocab_list_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_vocab_lists 
      WHERE id = vocab_list_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in their vocab lists"
  ON vocab_list_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_vocab_lists 
      WHERE id = vocab_list_id 
      AND user_id = auth.uid()
    )
  );

-- Function to get or create user's default vocab list
CREATE OR REPLACE FUNCTION get_or_create_default_vocab_list(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vocab_list_id uuid;
BEGIN
  -- Check if user has a default vocab list
  SELECT id INTO vocab_list_id
  FROM user_vocab_lists
  WHERE user_id = user_uuid AND is_default = true
  LIMIT 1;
  
  -- If no default list exists, create one
  IF vocab_list_id IS NULL THEN
    INSERT INTO user_vocab_lists (user_id, name, description, is_default)
    VALUES (user_uuid, 'My Vocab List', 'Personal vocabulary collection', true)
    RETURNING id INTO vocab_list_id;
  END IF;
  
  RETURN vocab_list_id;
END;
$$;

-- Function to add word to user's vocab list
CREATE OR REPLACE FUNCTION add_word_to_vocab_list(
  user_uuid uuid,
  english_text text,
  translation_text text,
  source_flashcard_uuid uuid DEFAULT NULL,
  notes_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vocab_list_id uuid;
  item_id uuid;
BEGIN
  -- Get or create default vocab list
  vocab_list_id := get_or_create_default_vocab_list(user_uuid);
  
  -- Add word to vocab list (ignore if already exists due to UNIQUE constraint)
  INSERT INTO vocab_list_items (vocab_list_id, english, translation, source_flashcard_id, notes)
  VALUES (vocab_list_id, english_text, translation_text, source_flashcard_uuid, notes_text)
  ON CONFLICT (vocab_list_id, english, translation) DO NOTHING
  RETURNING id INTO item_id;
  
  RETURN item_id;
END;
$$;

-- Function to remove word from user's vocab list
CREATE OR REPLACE FUNCTION remove_word_from_vocab_list(
  user_uuid uuid,
  english_text text,
  translation_text text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM vocab_list_items
  WHERE vocab_list_id IN (
    SELECT id FROM user_vocab_lists WHERE user_id = user_uuid
  )
  AND english = english_text
  AND translation = translation_text;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

-- Function to get user's vocab list
CREATE OR REPLACE FUNCTION get_user_vocab_list(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  english text,
  translation text,
  added_at timestamptz,
  notes text,
  source_flashcard_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vli.id,
    vli.english,
    vli.translation,
    vli.added_at,
    vli.notes,
    vli.source_flashcard_id
  FROM vocab_list_items vli
  JOIN user_vocab_lists uvl ON vli.vocab_list_id = uvl.id
  WHERE uvl.user_id = user_uuid
  ORDER BY vli.added_at DESC;
END;
$$;

-- Function to check if word is in user's vocab list
CREATE OR REPLACE FUNCTION is_word_in_vocab_list(
  user_uuid uuid,
  english_text text,
  translation_text text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exists_count integer;
BEGIN
  SELECT COUNT(*) INTO exists_count
  FROM vocab_list_items vli
  JOIN user_vocab_lists uvl ON vli.vocab_list_id = uvl.id
  WHERE uvl.user_id = user_uuid
    AND vli.english = english_text
    AND vli.translation = translation_text;
  
  RETURN exists_count > 0;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_default_vocab_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_word_to_vocab_list(uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_word_from_vocab_list(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_vocab_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_word_in_vocab_list(uuid, text, text) TO authenticated;
