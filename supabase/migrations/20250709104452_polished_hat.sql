/*
  # Fix round function type casting in get_admin_analytics

  1. Changes
    - Update get_admin_analytics function to properly cast real values to double precision before using round()
    - This resolves the "function round(double precision, integer) does not exist" error

  2. Security
    - Maintains existing security context and permissions
*/

CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM user_profiles),
        'total_categories', (SELECT COUNT(*) FROM categories),
        'total_test_sets', (SELECT COUNT(*) FROM test_sets),
        'total_flashcards', (SELECT COUNT(*) FROM flashcards),
        'active_sessions', (SELECT COUNT(*) FROM user_sessions WHERE last_active > NOW() - INTERVAL '1 hour'),
        'user_growth', (
            SELECT json_build_object(
                'this_month', (SELECT COUNT(*) FROM user_profiles WHERE created_at >= date_trunc('month', NOW())),
                'last_month', (SELECT COUNT(*) FROM user_profiles WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month') AND created_at < date_trunc('month', NOW())),
                'growth_rate', CASE 
                    WHEN (SELECT COUNT(*) FROM user_profiles WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month') AND created_at < date_trunc('month', NOW())) = 0 THEN 0
                    ELSE round(((SELECT COUNT(*) FROM user_profiles WHERE created_at >= date_trunc('month', NOW()))::double precision / NULLIF((SELECT COUNT(*) FROM user_profiles WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month') AND created_at < date_trunc('month', NOW())), 0)::double precision - 1) * 100, 2)
                END
            )
        ),
        'engagement_stats', (
            SELECT json_build_object(
                'average_session_length', COALESCE(round(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60)::double precision, 2), 0),
                'total_study_sessions', (SELECT COUNT(*) FROM user_sessions),
                'cards_studied_today', (SELECT COALESCE(SUM(cards_studied), 0) FROM daily_stats WHERE date = CURRENT_DATE)
            )
            FROM user_sessions
        ),
        'streak_stats', (
            SELECT json_build_object(
                'average_streak', COALESCE(round(AVG(current_streak)::double precision, 1), 0),
                'longest_streak', COALESCE(MAX(longest_streak), 0),
                'users_with_streaks', (SELECT COUNT(*) FROM user_streaks WHERE current_streak > 0)
            )
            FROM user_streaks
        ),
        'progress_distribution', (
            SELECT json_build_object(
                'new', (SELECT COUNT(*) FROM user_progress WHERE status = 'new'),
                'learning', (SELECT COUNT(*) FROM user_progress WHERE status = 'learning'),
                'known', (SELECT COUNT(*) FROM user_progress WHERE status = 'known'),
                'needs_practice', (SELECT COUNT(*) FROM user_progress WHERE status = 'needs_practice')
            )
        ),
        'top_categories', (
            SELECT json_agg(
                json_build_object(
                    'name', c.name,
                    'test_sets', COUNT(ts.id),
                    'total_cards', COALESCE(SUM(card_counts.card_count), 0)
                )
            )
            FROM categories c
            LEFT JOIN test_sets ts ON c.id = ts.category_id
            LEFT JOIN (
                SELECT test_set_id, COUNT(*) as card_count
                FROM flashcards
                GROUP BY test_set_id
            ) card_counts ON ts.id = card_counts.test_set_id
            GROUP BY c.id, c.name
            ORDER BY COUNT(ts.id) DESC
            LIMIT 5
        ),
        'recent_activity', (
            SELECT json_agg(
                json_build_object(
                    'date', date,
                    'users_active', users_active,
                    'cards_studied', cards_studied,
                    'sessions_completed', sessions_completed
                )
            )
            FROM (
                SELECT 
                    date,
                    COUNT(DISTINCT user_id) as users_active,
                    SUM(cards_studied) as cards_studied,
                    SUM(sessions_completed) as sessions_completed
                FROM daily_stats
                WHERE date >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY date
                ORDER BY date DESC
            ) recent_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$;