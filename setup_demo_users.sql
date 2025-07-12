-- Setup Demo Users - Run this in Supabase Dashboard SQL Editor

-- First, let's see what users exist
SELECT 'Existing users in auth.users:' as info;
SELECT id, email, created_at FROM auth.users;

-- Create user profiles for the demo users
INSERT INTO user_profiles (id, email, role)
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email = 'superadmin@flashcard.com' THEN 'super_admin'::user_role
    WHEN au.email = 'admin@flashcard.com' THEN 'admin'::user_role
    ELSE 'user'::user_role
  END
FROM auth.users au
WHERE au.email IN ('superadmin@flashcard.com', 'admin@flashcard.com')
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = au.id
  );

-- Show the created profiles
SELECT 'User profiles created:' as info;
SELECT up.id, up.email, up.role, au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- Show final status
SELECT 'Demo users are ready! You can now log in with:' as status;
SELECT 'superadmin@flashcard.com' as email, 'super_admin' as role
UNION ALL
SELECT 'admin@flashcard.com' as email, 'admin' as role; 