-- Fix all ambiguous column references in vocab list functions

-- Drop and recreate the add_word_to_vocab_list function with proper table aliases
DROP FUNCTION IF EXISTS add_word_to_vocab_list(uuid, text, text, uuid, text);

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

-- Drop and recreate the remove_word_from_vocab_list function with proper table aliases
DROP FUNCTION IF EXISTS remove_word_from_vocab_list(uuid, text, text);

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
  DELETE FROM vocab_list_items vli
  WHERE vli.vocab_list_id IN (
    SELECT uvl.id FROM user_vocab_lists uvl WHERE uvl.user_id = user_uuid
  )
  AND vli.english = english_text
  AND vli.translation = translation_text;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

-- Drop and recreate the get_user_vocab_list function with proper table aliases
DROP FUNCTION IF EXISTS get_user_vocab_list(uuid);

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

-- Drop and recreate the is_word_in_vocab_list function with proper table aliases
DROP FUNCTION IF EXISTS is_word_in_vocab_list(uuid, text, text);

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
GRANT EXECUTE ON FUNCTION add_word_to_vocab_list(uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_word_from_vocab_list(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_vocab_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_word_in_vocab_list(uuid, text, text) TO authenticated; 