/*
  # Fix get_admin_analytics function

  1. Changes
     - Fix the syntax error with LIMIT clause
     - Properly structure subqueries to avoid nested aggregates
     - Use CTEs for better organization and readability
     - Fix type casting issues with numeric values
     - Ensure all aggregations are done in the correct order

  2. Security
     - Maintain security definer setting
     - Keep super_admin role check
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_admin_analytics();

-- Create a completely restructured version of the function
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    top_categories_json json;
    engagement_metrics_json json;
    user_growth_json json;
BEGIN
    -- Check if user has super_admin role
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    -- Get top categories using a CTE
    WITH category_stats AS (
        SELECT 
            c.id,
            c.name as category_name,
            COUNT(DISTINCT ts.id) as test_set_count,
            COUNT(DISTINCT f.id) as flashcard_count,
            COUNT(DISTINCT up.id) as progress_records,
            CASE 
                WHEN COUNT(DISTINCT f.id) > 0 THEN
                    ROUND((COUNT(DISTINCT CASE WHEN up.status = 'known' THEN up.id ELSE NULL END)::numeric / 
                          NULLIF(COUNT(DISTINCT f.id), 0)::numeric) * 100, 1)
                ELSE 0
            END as completion_rate
        FROM categories c
        LEFT JOIN test_sets ts ON c.id = ts.category_id
        LEFT JOIN flashcards f ON ts.id = f.test_set_id
        LEFT JOIN user_progress up ON f.id = up.flashcard_id
        GROUP BY c.id, c.name
    )
    SELECT json_agg(
        json_build_object(
            'category_name', cs.category_name,
            'test_sets', cs.test_set_count,
            'total_flashcards', cs.flashcard_count,
            'total_progress_records', cs.progress_records,
            'completion_rate', cs.completion_rate
        )
    )
    INTO top_categories_json
    FROM (
        SELECT * FROM category_stats
        ORDER BY test_set_count DESC, flashcard_count DESC
        LIMIT 5
    ) cs;

    -- Get engagement metrics using a CTE
    WITH daily_engagement AS (
        SELECT 
            date,
            COUNT(DISTINCT user_id) as active_users,
            SUM(sessions_completed) as total_sessions,
            SUM(cards_studied) as cards_studied,
            CASE 
                WHEN COUNT(DISTINCT user_id) > 0 THEN
                    ROUND((SUM(study_time_minutes)::numeric / COUNT(DISTINCT user_id)), 1)
                ELSE 0
            END as avg_study_time
        FROM daily_stats
        WHERE date >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY date
        ORDER BY date DESC
    )
    SELECT json_agg(
        json_build_object(
            'date', date,
            'active_users', active_users,
            'total_sessions', total_sessions,
            'cards_studied', cards_studied,
            'avg_study_time', avg_study_time
        )
    )
    INTO engagement_metrics_json
    FROM daily_engagement;

    -- Get user growth data using a CTE
    WITH user_growth AS (
        SELECT 
            DATE_TRUNC('day', created_at)::date as signup_date,
            COUNT(*) as new_users
        FROM user_profiles
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)::date
        ORDER BY signup_date
    )
    SELECT json_agg(
        json_build_object(
            'date', signup_date,
            'new_users', new_users
        )
    )
    INTO user_growth_json
    FROM user_growth;

    -- Build the final result JSON
    SELECT json_build_object(
        -- User statistics
        'total_users', (SELECT COUNT(*) FROM user_profiles),
        'active_users_today', (SELECT COUNT(DISTINCT user_id) FROM daily_stats WHERE date = CURRENT_DATE),
        'active_users_week', (SELECT COUNT(DISTINCT user_id) FROM daily_stats WHERE date >= CURRENT_DATE - INTERVAL '7 days'),
        'new_users_this_month', (SELECT COUNT(*) FROM user_profiles WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
        
        -- Content statistics
        'total_categories', (SELECT COUNT(*) FROM categories),
        'total_test_sets', (SELECT COUNT(*) FROM test_sets),
        'total_flashcards', (SELECT COUNT(*) FROM flashcards),
        
        -- Usage statistics
        'total_study_sessions', (SELECT COALESCE(SUM(sessions_completed), 0) FROM daily_stats),
        'total_cards_studied', (SELECT COALESCE(SUM(cards_studied), 0) FROM daily_stats),
        'total_study_hours', (SELECT ROUND(COALESCE(SUM(study_time_minutes), 0)::numeric / 60, 1) FROM daily_stats),
        'average_streak', (SELECT ROUND(COALESCE(AVG(current_streak), 0)::numeric, 1) FROM user_streaks),
        
        -- Aggregated data
        'top_categories', COALESCE(top_categories_json, '[]'::json),
        'engagement_metrics', COALESCE(engagement_metrics_json, '[]'::json),
        'user_growth_data', COALESCE(user_growth_json, '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_analytics() TO authenticated;