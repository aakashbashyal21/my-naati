/*
  # Complete Flashcard Application Database Schema

  1. New Tables
    - `user_profiles` - User profile information with roles
    - `categories` - Learning categories (e.g., "Basic Vocabulary", "Advanced Grammar")
    - `test_sets` - Question/flashcard sets within categories
    - `flashcards` - Individual flashcard pairs (English/Translation)
    - `user_progress` - Track user learning progress

  2. Security
    - Enable RLS on all tables
    - Create appropriate policies for admin and user access
    - Set up triggers for automatic user profile creation

  3. Functions
    - Bulk flashcard insertion from CSV
    - User statistics calculation
    - Admin user management functions

  4. Demo Data
    - Create demo admin and user accounts
    - Sample categories and test sets
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE progress_status AS ENUM ('new', 'learning', 'known', 'needs_practice');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role user_role DEFAULT 'user'::user_role,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create test_sets table
CREATE TABLE IF NOT EXISTS test_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_set_id uuid NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
  english text NOT NULL,
  translation text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  status progress_status DEFAULT 'new'::progress_status,
  last_reviewed timestamptz,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, flashcard_id)
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update user roles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Service role can manage profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for categories
CREATE POLICY "Everyone can read categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create RLS policies for test_sets
CREATE POLICY "Everyone can read test sets"
  ON test_sets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test sets"
  ON test_sets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create RLS policies for flashcards
CREATE POLICY "Everyone can read flashcards"
  ON flashcards
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage flashcards"
  ON flashcards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create RLS policies for user_progress
CREATE POLICY "Users can read own progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own progress"
  ON user_progress
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    CASE 
      WHEN new.email = 'superadmin@flashcard.com' THEN 'super_admin'::user_role
      WHEN new.email = 'admin@admin.flashcard.com' THEN 'admin'::user_role
      ELSE 'user'::user_role
    END
  );
  RETURN new;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function for bulk flashcard insertion
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

-- Create function to get user statistics
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_test_sets_category ON test_sets(category_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_test_set ON flashcards(test_set_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_flashcard ON user_progress(user_id, flashcard_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create demo admin user (this will be created when they sign up)
-- The trigger will automatically assign admin role based on email

-- Insert sample categories and test sets
DO $$
DECLARE
  basic_category_id uuid;
  advanced_category_id uuid;
  greetings_test_id uuid;
  numbers_test_id uuid;
BEGIN
  -- Create sample categories
  INSERT INTO categories (name, description) VALUES
  ('Basic Vocabulary', 'Essential words for beginners')
  RETURNING id INTO basic_category_id;
  
  INSERT INTO categories (name, description) VALUES
  ('Advanced Topics', 'Complex vocabulary and phrases')
  RETURNING id INTO advanced_category_id;
  
  -- Create sample test sets
  INSERT INTO test_sets (category_id, name, description) VALUES
  (basic_category_id, 'Common Greetings', 'Basic greeting words and phrases')
  RETURNING id INTO greetings_test_id;
  
  INSERT INTO test_sets (category_id, name, description) VALUES
  (basic_category_id, 'Numbers 1-10', 'Basic numbers in Nepali')
  RETURNING id INTO numbers_test_id;
  
  -- Add sample flashcards for greetings
  INSERT INTO flashcards (test_set_id, english, translation) VALUES
  (greetings_test_id, 'Hello', 'Namaste'),
  (greetings_test_id, 'Goodbye', 'Alvida'),
  (greetings_test_id, 'Thank you', 'Dhanyabad'),
  (greetings_test_id, 'Please', 'Kripaya'),
  (greetings_test_id, 'Yes', 'Hajur'),
  (greetings_test_id, 'No', 'Hoina'),
  (greetings_test_id, 'Excuse me', 'Maaf garnuhos'),
  (greetings_test_id, 'Sorry', 'Maaf garnuhos');
  
  -- Add sample flashcards for numbers
  INSERT INTO flashcards (test_set_id, english, translation) VALUES
  (numbers_test_id, 'One', 'Ek'),
  (numbers_test_id, 'Two', 'Dui'),
  (numbers_test_id, 'Three', 'Teen'),
  (numbers_test_id, 'Four', 'Char'),
  (numbers_test_id, 'Five', 'Panch'),
  (numbers_test_id, 'Six', 'Chha'),
  (numbers_test_id, 'Seven', 'Saat'),
  (numbers_test_id, 'Eight', 'Aath'),
  (numbers_test_id, 'Nine', 'Nau'),
  (numbers_test_id, 'Ten', 'Das');
  
END $$;