/*
  # Fix LIMIT syntax error in get_admin_analytics function

  1. Changes
     - Fix the syntax error with LIMIT clause in the get_admin_analytics function
     - Properly structure subqueries to avoid LIMIT being used in an invalid context
     - Ensure all aggregations are done in the correct order
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_admin_analytics();

-- Recreate the function with proper subquery structure
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    avg_streak numeric;
    total_study_hours numeric;
    active_users_today bigint;
    active_users_week bigint;
    new_users_this_month bigint;
    total_study_sessions bigint;
    top_categories_data json;
BEGIN
    -- Calculate values separately to avoid nested aggregates
    SELECT COALESCE(round(AVG(current_streak)::numeric, 1), 0) INTO avg_streak FROM user_streaks;
    
    SELECT COALESCE(round(SUM(study_time_minutes)::numeric / 60, 1), 0) 
    INTO total_study_hours 
    FROM daily_stats;
    
    SELECT COUNT(DISTINCT user_id) INTO active_users_today 
    FROM daily_stats 
    WHERE date = CURRENT_DATE;
    
    SELECT COUNT(DISTINCT user_id) INTO active_users_week 
    FROM daily_stats 
    WHERE date >= CURRENT_DATE - INTERVAL '7 days';
    
    SELECT COUNT(*) INTO new_users_this_month 
    FROM user_profiles 
    WHERE created_at >= date_trunc('month', NOW());
    
    SELECT COUNT(*) INTO total_study_sessions 
    FROM user_sessions;
    
    -- Get top categories data with proper subquery structure
    WITH category_stats AS (
        SELECT 
            c.id,
            c.name as category_name,
            COUNT(DISTINCT ts.id) as test_set_count,
            COUNT(DISTINCT f.id) as total_flashcards,
            COUNT(DISTINCT up.id) as total_progress_records,
            CASE 
                WHEN COUNT(DISTINCT f.id) > 0 THEN
                    round((COUNT(DISTINCT CASE WHEN up.status = 'known' THEN up.id ELSE NULL END)::numeric / 
                    COUNT(DISTINCT f.id)::numeric) * 100, 1)
                ELSE 0
            END as completion_rate
        FROM categories c
        LEFT JOIN test_sets ts ON c.id = ts.category_id
        LEFT JOIN flashcards f ON ts.id = f.test_set_id
        LEFT JOIN user_progress up ON f.id = up.flashcard_id
        GROUP BY c.id, c.name
    ),
    top_five_categories AS (
        SELECT 
            category_name,
            test_set_count,
            total_flashcards,
            total_progress_records,
            completion_rate
        FROM category_stats
        ORDER BY test_set_count DESC, total_flashcards DESC
        LIMIT 5
    )
    SELECT json_agg(
        json_build_object(
            'category_name', category_name,
            'test_set_count', test_set_count,
            'total_flashcards', total_flashcards,
            'total_progress_records', total_progress_records,
            'completion_rate', completion_rate
        )
    )
    INTO top_categories_data
    FROM top_five_categories;
    
    -- Build the result JSON
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM user_profiles),
        'active_users_today', active_users_today,
        'active_users_week', active_users_week,
        'new_users_this_month', new_users_this_month,
        'total_categories', (SELECT COUNT(*) FROM categories),
        'total_test_sets', (SELECT COUNT(*) FROM test_sets),
        'total_flashcards', (SELECT COUNT(*) FROM flashcards),
        'total_study_sessions', total_study_sessions,
        'total_cards_studied', (SELECT COALESCE(SUM(cards_studied), 0) FROM daily_stats),
        'total_study_hours', total_study_hours,
        'average_streak', avg_streak,
        'top_categories', COALESCE(top_categories_data, '[]'::json),
        'engagement_metrics', (
            WITH daily_engagement AS (
                SELECT 
                    date,
                    COUNT(DISTINCT user_id) as active_users,
                    SUM(sessions_completed) as total_sessions,
                    CASE 
                        WHEN COUNT(DISTINCT user_id) > 0 THEN
                            round((SUM(study_time_minutes)::numeric / COUNT(DISTINCT user_id)), 1)
                        ELSE 0
                    END as avg_study_time
                FROM daily_stats
                WHERE date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY date
                ORDER BY date DESC
            )
            SELECT json_agg(
                json_build_object(
                    'date', date,
                    'active_users', active_users,
                    'total_sessions', total_sessions,
                    'avg_study_time', avg_study_time
                )
            )
            FROM daily_engagement
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_analytics() TO authenticated;