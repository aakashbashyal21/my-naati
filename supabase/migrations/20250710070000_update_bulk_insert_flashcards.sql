-- Update bulk_insert_flashcards function to handle language_id
-- Migration: 20250710070000_update_bulk_insert_flashcards.sql

-- Drop the existing function
DROP FUNCTION IF EXISTS bulk_insert_flashcards(uuid, jsonb);

-- Create the updated function with language support
CREATE OR REPLACE FUNCTION bulk_insert_flashcards(
  test_set_uuid uuid,
  csv_data jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  card_record jsonb;
  inserted_count integer := 0;
  language_id uuid;
BEGIN
  -- Get the language_id from the test set
  SELECT ts.language_id INTO language_id
  FROM test_sets ts
  WHERE ts.id = test_set_uuid;
  
  IF language_id IS NULL THEN
    RAISE EXCEPTION 'Test set not found or has no language_id';
  END IF;

  -- Loop through each flashcard in the CSV data
  FOR card_record IN SELECT * FROM jsonb_array_elements(csv_data)
  LOOP
    INSERT INTO flashcards (
      test_set_id,
      english,
      translation,
      language_id
    ) VALUES (
      test_set_uuid,
      card_record->>'english',
      card_record->>'translation',
      COALESCE((card_record->>'language_id')::uuid, language_id)
    );
    
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION bulk_insert_flashcards(uuid, jsonb) TO authenticated; 