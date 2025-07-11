-- Fix ambiguous column reference in vocab list functions

-- Fix the remove_word_from_vocab_list function
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION remove_word_from_vocab_list(uuid, text, text) TO authenticated; 