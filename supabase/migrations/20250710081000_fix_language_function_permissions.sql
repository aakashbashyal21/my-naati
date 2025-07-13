-- Fix missing permissions for language functions
-- This migration adds the missing GRANT statements for the language management functions

-- Grant permissions for language management functions
GRANT EXECUTE ON FUNCTION get_user_languages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories_by_language(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_test_sets_by_language(UUID) TO authenticated;

-- Grant permissions for the language-filtered analytics functions
GRANT EXECUTE ON FUNCTION get_user_stats_detailed_by_language(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats_by_language(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_analytics_by_language(UUID, UUID) TO authenticated; 