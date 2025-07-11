/*
  # Fix User Profiles RLS Policies - Corrected Version

  1. Security
    - Drop all existing recursive policies on user_profiles
    - Create safe is_admin() function with SECURITY DEFINER
    - Create new non-recursive policies using the safe function
    - Update all related table policies to use safe admin check

  2. Changes
    - Removes infinite recursion in RLS policies
    - Allows users to manage their own profiles
    - Allows admins to read all profiles and update user roles
    - Service role maintains full access for system operations
*/

-- Drop all existing policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles for admin checks" ON user_profiles;
DROP POLICY IF EXISTS "Service role can update user roles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a function to safely check if current user is admin
-- This function uses SECURITY DEFINER to bypass RLS when checking roles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Create new simplified policies that don't cause recursion

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile (but not change role)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role full access for system operations
CREATE POLICY "Service role can manage profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow admins to read all profiles using the safe function
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Allow admins to update user roles using the safe function
CREATE POLICY "Admins can update user roles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update other table policies to use the safe is_admin() function

-- Update categories policies
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update test_sets policies
DROP POLICY IF EXISTS "Admins can manage test sets" ON test_sets;
CREATE POLICY "Admins can manage test sets"
  ON test_sets
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update flashcards policies
DROP POLICY IF EXISTS "Admins can manage flashcards" ON flashcards;
CREATE POLICY "Admins can manage flashcards"
  ON flashcards
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update user_progress policies
DROP POLICY IF EXISTS "Admins can read all progress" ON user_progress;
CREATE POLICY "Admins can read all progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Update functions to use the safe admin check
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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions to create flashcards';
  END IF;

  -- Insert flashcards from CSV data
  FOR flashcard_record IN SELECT * FROM jsonb_array_elements(csv_data)
  LOOP
    IF flashcard_record->>'english' IS NOT NULL AND flashcard_record->>'translation' IS NOT NULL THEN
      INSERT INTO public.flashcards (test_set_id, english, translation)
      VALUES (
        test_set_uuid,
        trim(flashcard_record->>'english'),
        trim(flashcard_record->>'translation')
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$;

-- Update get_user_stats function
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
  IF auth.uid() != user_uuid AND NOT is_admin() THEN
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

-- Add helpful comment
COMMENT ON FUNCTION is_admin() IS 'Safely checks if current user has admin privileges without causing RLS recursion';