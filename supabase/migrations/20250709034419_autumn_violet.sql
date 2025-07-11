/*
  # Ensure Admin User Exists

  This migration ensures that an admin user exists in the database for immediate login.
  
  1. Creates admin user in auth.users table
  2. Creates corresponding user_profile with admin role
  3. Provides immediate login capability
*/

-- Function to safely create admin user
CREATE OR REPLACE FUNCTION ensure_admin_user_exists()
RETURNS void AS $$
DECLARE
  admin_user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO existing_user_id 
  FROM auth.users 
  WHERE email = 'admin@admin.flashcard.com' 
  LIMIT 1;
  
  -- If user doesn't exist, create them
  IF existing_user_id IS NULL THEN
    -- Generate new user ID
    admin_user_id := gen_random_uuid();
    
    -- Insert into auth.users (simplified for demo purposes)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@admin.flashcard.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
    
    RAISE NOTICE 'Created new admin user with ID: %', admin_user_id;
  ELSE
    admin_user_id := existing_user_id;
    RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
  END IF;
  
  -- Ensure user profile exists with admin role
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (admin_user_id, 'admin@admin.flashcard.com', 'admin'::user_role)
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin'::user_role,
    updated_at = now();
    
  RAISE NOTICE 'Admin user profile created/updated successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating admin user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to ensure admin exists
SELECT ensure_admin_user_exists();

-- Also ensure super admin exists
CREATE OR REPLACE FUNCTION ensure_super_admin_exists()
RETURNS void AS $$
DECLARE
  super_admin_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if super admin user already exists
  SELECT id INTO existing_user_id 
  FROM auth.users 
  WHERE email = 'superadmin@flashcard.com' 
  LIMIT 1;
  
  -- If user doesn't exist, create them
  IF existing_user_id IS NULL THEN
    -- Generate new user ID
    super_admin_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      super_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'superadmin@flashcard.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
    
    RAISE NOTICE 'Created new super admin user with ID: %', super_admin_id;
  ELSE
    super_admin_id := existing_user_id;
    RAISE NOTICE 'Super admin user already exists with ID: %', super_admin_id;
  END IF;
  
  -- Ensure user profile exists with super_admin role
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (super_admin_id, 'superadmin@flashcard.com', 'super_admin'::user_role)
  ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin'::user_role,
    updated_at = now();
    
  RAISE NOTICE 'Super admin user profile created/updated successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating super admin user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to ensure super admin exists
SELECT ensure_super_admin_exists();

-- Create a basic category and test set for immediate use
DO $$
DECLARE
  admin_id uuid;
  category_id uuid;
  test_set_id uuid;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    -- Create sample category if it doesn't exist
    INSERT INTO categories (name, description, created_by)
    VALUES ('Getting Started', 'Sample category for testing', admin_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO category_id;
    
    -- If category already existed, get its ID
    IF category_id IS NULL THEN
      SELECT id INTO category_id FROM categories WHERE name = 'Getting Started' LIMIT 1;
    END IF;
    
    -- Create sample test set if it doesn't exist
    IF category_id IS NOT NULL THEN
      INSERT INTO test_sets (category_id, name, description, created_by)
      VALUES (category_id, 'Sample Words', 'Basic vocabulary for testing', admin_id)
      ON CONFLICT DO NOTHING
      RETURNING id INTO test_set_id;
      
      -- Add sample flashcards if test set was created
      IF test_set_id IS NOT NULL THEN
        INSERT INTO flashcards (test_set_id, english, translation) VALUES
        (test_set_id, 'Hello', 'Namaste'),
        (test_set_id, 'Thank you', 'Dhanyabad'),
        (test_set_id, 'Goodbye', 'Alvida')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    
    RAISE NOTICE 'Sample content created successfully';
  END IF;
END $$;

-- Clean up functions (optional)
DROP FUNCTION IF EXISTS ensure_admin_user_exists();
DROP FUNCTION IF EXISTS ensure_super_admin_exists();