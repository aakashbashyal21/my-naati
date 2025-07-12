-- Create Super Admin User - Run this in Supabase Dashboard SQL Editor

-- First, let's see what users already exist
SELECT 'Existing users in auth.users:' as info;
SELECT id, email, created_at FROM auth.users;

-- Create a new super admin user (if you want to create one)
-- You can run this in the Supabase Authentication panel instead

-- Check existing user profiles
SELECT 'Existing user profiles:' as info;
SELECT up.id, up.email, up.role, au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- Create a super admin profile for an existing user (replace with actual email)
-- INSERT INTO user_profiles (id, email, role)
-- SELECT 
--   au.id,
--   au.email,
--   'super_admin'::user_role
-- FROM auth.users au
-- WHERE au.email = 'your-email@example.com'  -- Replace with actual email
--   AND NOT EXISTS (
--     SELECT 1 FROM user_profiles up WHERE up.id = au.id
--   );

-- Show final status
SELECT 'Ready to create super admin!' as status; 