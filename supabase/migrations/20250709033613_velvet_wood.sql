/*
  # Fix user profile creation and demo users

  1. Functions
    - Create function to handle new user profile creation
    - Create function to safely create demo users

  2. Security
    - Ensure proper RLS policies are in place
    - Handle user profile creation securely

  3. Demo Data
    - Create demo user profiles that can be used for testing
*/

-- Create or replace the function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Create a function to create demo user profiles (for manual execution)
CREATE OR REPLACE FUNCTION public.create_demo_user_profile(
  user_id uuid,
  user_email text,
  user_role user_role DEFAULT 'user'::user_role
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (user_id, user_email, user_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role for demo user creation
GRANT EXECUTE ON FUNCTION public.create_demo_user_profile(uuid, text, user_role) TO service_role;

-- Ensure RLS policies are properly set up for user_profiles
-- (These should already exist, but let's make sure they're correct)

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles for admin checks" ON user_profiles;
DROP POLICY IF EXISTS "Service role can update user roles" ON user_profiles;

-- Recreate policies with proper permissions
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

CREATE POLICY "Authenticated users can read profiles for admin checks"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can update user roles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for inserting new profiles
CREATE POLICY "Service role can insert profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile when new user signs up via Supabase Auth';
COMMENT ON FUNCTION public.create_demo_user_profile(uuid, text, user_role) IS 'Helper function to create demo user profiles for testing';

-- Create a view for easier user management (optional)
CREATE OR REPLACE VIEW public.user_management AS
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

-- Grant select permission on the view
GRANT SELECT ON public.user_management TO authenticated;

-- Note: To create demo users, you'll need to:
-- 1. Sign up users through the Supabase Auth UI or API
-- 2. Or use the create_demo_user_profile function with actual user IDs from auth.users