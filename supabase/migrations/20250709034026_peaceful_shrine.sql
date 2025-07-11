/*
  # Create Admin User for FlashCard App

  1. New Functions
    - `create_auth_user_with_profile` - Creates both auth user and profile
    - `ensure_demo_users` - Creates demo users if they don't exist

  2. Demo Users Created
    - Super Admin: superadmin@flashcard.com / password123
    - Admin: admin@admin.flashcard.com / password123  
    - Regular User: user@example.com / password123

  3. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Only service role can execute these functions
    - Proper error handling for existing users
*/

-- Function to create auth user with profile (bypasses normal auth flow)
CREATE OR REPLACE FUNCTION create_auth_user_with_profile(
  user_email text,
  user_password text,
  user_role user_role DEFAULT 'user'::user_role
)
RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
  encrypted_pw text;
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Create basic encrypted password (this is a simplified approach)
  -- In production, Supabase handles this more securely
  encrypted_pw := crypt(user_password, gen_salt('bf'));
  
  -- Insert into auth.users table
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    email_change_token_new,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    encrypted_pw,
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    ''
  ) ON CONFLICT (email) DO NOTHING;
  
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (new_user_id, user_email, user_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN new_user_id;
EXCEPTION
  WHEN OTHERS THEN
    -- If auth table insert fails, still try to create profile with existing user
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF new_user_id IS NOT NULL THEN
      INSERT INTO public.user_profiles (id, email, role)
      VALUES (new_user_id, user_email, user_role)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        updated_at = now();
    END IF;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure demo users exist
CREATE OR REPLACE FUNCTION ensure_demo_users()
RETURNS void AS $$
DECLARE
  admin_id uuid;
  super_admin_id uuid;
  user_id uuid;
BEGIN
  -- Create super admin
  SELECT create_auth_user_with_profile(
    'superadmin@flashcard.com',
    'password123',
    'super_admin'::user_role
  ) INTO super_admin_id;
  
  -- Create admin
  SELECT create_auth_user_with_profile(
    'admin@admin.flashcard.com', 
    'password123',
    'admin'::user_role
  ) INTO admin_id;
  
  -- Create regular user
  SELECT create_auth_user_with_profile(
    'user@example.com',
    'password123', 
    'user'::user_role
  ) INTO user_id;
  
  RAISE NOTICE 'Demo users created/updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION create_auth_user_with_profile(text, text, user_role) TO service_role;
GRANT EXECUTE ON FUNCTION ensure_demo_users() TO service_role;

-- Execute the function to create demo users
SELECT ensure_demo_users();

-- Create some sample categories and test sets for the admin to work with
DO $$
DECLARE
  admin_user_id uuid;
  category_id uuid;
  test_set_id uuid;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_user_id FROM user_profiles WHERE email = 'admin@admin.flashcard.com' LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Create a sample category
    INSERT INTO categories (name, description, created_by)
    VALUES ('Basic Vocabulary', 'Essential words for beginners', admin_user_id)
    RETURNING id INTO category_id;
    
    -- Create a sample test set
    INSERT INTO test_sets (category_id, name, description, created_by)
    VALUES (category_id, 'Common Greetings', 'Basic greeting words and phrases', admin_user_id)
    RETURNING id INTO test_set_id;
    
    -- Add some sample flashcards
    INSERT INTO flashcards (test_set_id, english, translation) VALUES
    (test_set_id, 'Hello', 'Namaste'),
    (test_set_id, 'Goodbye', 'Alvida'),
    (test_set_id, 'Thank you', 'Dhanyabad'),
    (test_set_id, 'Please', 'Kripaya'),
    (test_set_id, 'Yes', 'Hajur'),
    (test_set_id, 'No', 'Hoina');
    
    RAISE NOTICE 'Sample content created successfully';
  END IF;
END $$;

-- Add helpful functions for CSV bulk upload
CREATE OR REPLACE FUNCTION bulk_insert_flashcards(
  test_set_uuid uuid,
  csv_data jsonb
)
RETURNS integer AS $$
DECLARE
  row_data jsonb;
  inserted_count integer := 0;
BEGIN
  -- Loop through each row in the CSV data
  FOR row_data IN SELECT * FROM jsonb_array_elements(csv_data)
  LOOP
    -- Insert flashcard if both english and translation exist
    IF row_data->>'english' IS NOT NULL AND row_data->>'translation' IS NOT NULL THEN
      INSERT INTO flashcards (test_set_id, english, translation)
      VALUES (
        test_set_uuid,
        trim(row_data->>'english'),
        trim(row_data->>'translation')
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for bulk insert
GRANT EXECUTE ON FUNCTION bulk_insert_flashcards(uuid, jsonb) TO authenticated;

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid uuid)
RETURNS TABLE(
  total_cards bigint,
  known_cards bigint,
  learning_cards bigint,
  needs_practice_cards bigint,
  new_cards bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(f.id) as total_cards,
    COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards,
    COUNT(CASE WHEN up.status = 'learning' THEN 1 END) as learning_cards,
    COUNT(CASE WHEN up.status = 'needs_practice' THEN 1 END) as needs_practice_cards,
    COUNT(CASE WHEN up.status = 'new' OR up.status IS NULL THEN 1 END) as new_cards
  FROM flashcards f
  LEFT JOIN user_progress up ON f.id = up.flashcard_id AND up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for user stats
GRANT EXECUTE ON FUNCTION get_user_stats(uuid) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_auth_user_with_profile(text, text, user_role) IS 'Creates both auth user and user profile for demo purposes';
COMMENT ON FUNCTION ensure_demo_users() IS 'Creates demo users: superadmin@flashcard.com, admin@admin.flashcard.com, user@example.com';
COMMENT ON FUNCTION bulk_insert_flashcards(uuid, jsonb) IS 'Bulk insert flashcards from CSV data into a test set';
COMMENT ON FUNCTION get_user_stats(uuid) IS 'Get learning statistics for a specific user';