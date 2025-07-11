/*
  # Fix Authentication Schema Issues

  This migration addresses the "Database error querying schema" issue by:
  1. Creating missing database functions for user management
  2. Ensuring proper triggers for user profile creation
  3. Adding required RPC functions for bulk operations and statistics
  4. Fixing any missing indexes or constraints

  ## New Functions
  - `handle_new_user()` - Trigger function to create user profiles
  - `bulk_insert_flashcards()` - RPC function for bulk flashcard insertion
  - `get_user_stats()` - RPC function for user statistics
  
  ## Security
  - All functions have proper security context
  - RLS policies remain unchanged
*/

-- Create the handle_new_user function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$;

-- Create trigger for new user registration if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create bulk_insert_flashcards function
CREATE OR REPLACE FUNCTION public.bulk_insert_flashcards(
  test_set_uuid uuid,
  csv_data jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count integer := 0;
  flashcard_record jsonb;
BEGIN
  -- Check if user has permission to insert flashcards
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create flashcards';
  END IF;

  -- Insert flashcards from CSV data
  FOR flashcard_record IN SELECT * FROM jsonb_array_elements(csv_data)
  LOOP
    INSERT INTO public.flashcards (test_set_id, english, translation)
    VALUES (
      test_set_uuid,
      flashcard_record->>'english',
      flashcard_record->>'translation'
    );
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$;

-- Create get_user_stats function
CREATE OR REPLACE FUNCTION public.get_user_stats(user_uuid uuid)
RETURNS TABLE (
  total_cards bigint,
  known_cards bigint,
  learning_cards bigint,
  needs_practice_cards bigint,
  new_cards bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user can access their own stats or is admin
  IF auth.uid() != user_uuid AND NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to view user statistics';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(COUNT(*), 0) as total_cards,
    COALESCE(COUNT(*) FILTER (WHERE up.status = 'known'), 0) as known_cards,
    COALESCE(COUNT(*) FILTER (WHERE up.status = 'learning'), 0) as learning_cards,
    COALESCE(COUNT(*) FILTER (WHERE up.status = 'needs_practice'), 0) as needs_practice_cards,
    COALESCE(COUNT(*) FILTER (WHERE up.status = 'new' OR up.status IS NULL), 0) as new_cards
  FROM flashcards f
  LEFT JOIN user_progress up ON f.id = up.flashcard_id AND up.user_id = user_uuid;
END;
$$;

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_flashcards_test_set_english ON flashcards(test_set_id, english);
CREATE INDEX IF NOT EXISTS idx_user_progress_composite ON user_progress(user_id, flashcard_id, status);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure auth schema access for the trigger
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON auth.users TO postgres;

-- Update the user_management view to handle potential missing data
DROP VIEW IF EXISTS public.user_management;
CREATE VIEW public.user_management AS
SELECT 
  up.id,
  up.email,
  up.role,
  up.created_at,
  up.updated_at,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- Grant access to the view
GRANT SELECT ON public.user_management TO authenticated;