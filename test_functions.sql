-- Test script to check if language functions exist
-- Run this in Supabase SQL editor

-- Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%language%';

-- Test get_categories_by_language function
SELECT * FROM get_categories_by_language(
  (SELECT id FROM languages WHERE code = 'en' LIMIT 1)
);

-- Test get_test_sets_by_language function  
SELECT * FROM get_test_sets_by_language(
  (SELECT id FROM languages WHERE code = 'en' LIMIT 1)
);

-- Check if languages exist
SELECT * FROM languages WHERE is_active = true; 