-- Simple fix for add_word_to_vocab_list function

-- Drop the problematic function first
DROP FUNCTION IF EXISTS add_word_to_vocab_list(uuid, text, text, uuid, text);

-- Create a new, simpler version
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
  default_list_id uuid;
  new_item_id uuid;
BEGIN
  -- Get or create the default vocab list for this user
  SELECT id INTO default_list_id
  FROM user_vocab_lists
  WHERE user_id = user_uuid AND is_default = true
  LIMIT 1;
  
  -- If no default list exists, create one
  IF default_list_id IS NULL THEN
    INSERT INTO user_vocab_lists (user_id, name, description, is_default)
    VALUES (user_uuid, 'My Vocab List', 'Personal vocabulary collection', true)
    RETURNING id INTO default_list_id;
  END IF;
  
  -- Add the word to the vocab list
  INSERT INTO vocab_list_items (vocab_list_id, english, translation, source_flashcard_id, notes)
  VALUES (default_list_id, english_text, translation_text, source_flashcard_uuid, notes_text)
  ON CONFLICT (vocab_list_id, english, translation) DO NOTHING
  RETURNING id INTO new_item_id;
  
  RETURN new_item_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_word_to_vocab_list(uuid, text, text, uuid, text) TO authenticated; 