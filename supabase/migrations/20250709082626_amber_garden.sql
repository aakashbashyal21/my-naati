/*
  # Redesign Analytics System

  1. User Analytics (Personal Progress)
    - Personal study statistics
    - Individual achievements and streaks
    - Personal progress tracking
    - Study habits and patterns

  2. Admin Analytics (Platform Overview)
    - Platform-wide user statistics
    - System usage metrics
    - Content performance
    - User engagement trends
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_analytics(uuid);
DROP FUNCTION IF EXISTS get_admin_analytics();

-- Create user analytics function (personal progress only)
CREATE OR REPLACE FUNCTION get_user_analytics(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Security check: users can only view their own analytics
    -- Admins can view any user's analytics
    IF user_uuid != auth.uid() THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        ) THEN
            RAISE EXCEPTION 'Access denied. You can only view your own analytics.';
        END IF;
    END IF;

    -- Build user analytics focused on personal progress
    SELECT json_build_object(
        -- Personal Progress Stats
        'total_cards', COALESCE((
            SELECT COUNT(*)
            FROM user_progress up
            WHERE up.user_id = user_uuid
        ), 0),
        'known_cards', COALESCE((
            SELECT COUNT(*)
            FROM user_progress up
            WHERE up.user_id = user_uuid AND up.status = 'known'
        ), 0),
        'learning_cards', COALESCE((
            SELECT COUNT(*)
            FROM user_progress up
            WHERE up.user_id = user_uuid AND up.status = 'learning'
        ), 0),
        'needs_practice_cards', COALESCE((
            SELECT COUNT(*)
            FROM user_progress up
            WHERE up.user_id = user_uuid AND up.status = 'needs_practice'
        ), 0),
        
        -- Personal Streak & Gamification
        'current_streak', COALESCE((
            SELECT us.current_streak
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 0),
        'longest_streak', COALESCE((
            SELECT us.longest_streak
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 0),
        'total_study_days', COALESCE((
            SELECT us.total_study_days
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 0),
        'user_level', COALESCE((
            SELECT us.level
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 1),
        'total_points', COALESCE((
            SELECT us.total_points
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 0),
        
        -- Personal Achievements (recent ones)
        'recent_achievements', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'title', ad.title,
                    'description', ad.description,
                    'icon', ad.icon,
                    'badge_color', ad.badge_color,
                    'points', ua.points_earned,
                    'earned_at', ua.earned_at
                )
                ORDER BY ua.earned_at DESC
            )
            FROM user_achievements ua
            JOIN achievement_definitions ad ON ua.achievement_id = ad.id
            WHERE ua.user_id = user_uuid
            ORDER BY ua.earned_at DESC
            LIMIT 5
        ), '[]'::json),
        
        -- Personal Study Pattern (last 7 days)
        'weekly_progress', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'date', ds.date,
                    'cards_studied', ds.cards_studied,
                    'study_time', ds.study_time_minutes
                )
                ORDER BY ds.date DESC
            )
            FROM daily_stats ds
            WHERE ds.user_id = user_uuid
            AND ds.date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY ds.date DESC
        ), '[]'::json),
        
        -- Personal Category Progress
        'category_progress', COALESCE((
            WITH user_category_stats AS (
                SELECT 
                    c.name as category_name,
                    COUNT(f.id) as total_cards,
                    COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards,
                    COUNT(CASE WHEN up.status = 'learning' THEN 1 END) as learning_cards,
                    COUNT(CASE WHEN up.status = 'needs_practice' THEN 1 END) as needs_practice_cards
                FROM categories c
                JOIN test_sets ts ON c.id = ts.category_id
                JOIN flashcards f ON ts.id = f.test_set_id
                LEFT JOIN user_progress up ON f.id = up.flashcard_id AND up.user_id = user_uuid
                GROUP BY c.id, c.name
                HAVING COUNT(f.id) > 0
            )
            SELECT json_agg(
                json_build_object(
                    'category_name', ucs.category_name,
                    'total_cards', ucs.total_cards,
                    'known_cards', ucs.known_cards,
                    'learning_cards', ucs.learning_cards,
                    'needs_practice_cards', ucs.needs_practice_cards,
                    'completion_percentage', 
                    CASE 
                        WHEN ucs.total_cards > 0 THEN ROUND((ucs.known_cards::float / ucs.total_cards::float) * 100, 1)
                        ELSE 0
                    END
                )
            )
            FROM user_category_stats ucs
        ), '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Create admin analytics function (platform-wide statistics - SUPER ADMIN ONLY)
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Security check: SUPER ADMIN ONLY
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    -- Build platform-wide analytics
    SELECT json_build_object(
        -- Platform User Statistics
        'total_users', (
            SELECT COUNT(*) FROM user_profiles
        ),
        'active_users_today', (
            SELECT COUNT(DISTINCT user_id) 
            FROM daily_stats 
            WHERE date = CURRENT_DATE
        ),
        'active_users_week', (
            SELECT COUNT(DISTINCT user_id) 
            FROM daily_stats 
            WHERE date >= CURRENT_DATE - INTERVAL '7 days'
        ),
        'new_users_this_month', (
            SELECT COUNT(*) 
            FROM user_profiles 
            WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ),
        
        -- Platform Content Statistics
        'total_categories', (
            SELECT COUNT(*) FROM categories
        ),
        'total_test_sets', (
            SELECT COUNT(*) FROM test_sets
        ),
        'total_flashcards', (
            SELECT COUNT(*) FROM flashcards
        ),
        
        -- Platform Usage Statistics
        'total_study_sessions', (
            SELECT SUM(sessions_completed) FROM daily_stats
        ),
        'total_cards_studied', (
            SELECT SUM(cards_studied) FROM daily_stats
        ),
        'total_study_hours', (
            SELECT ROUND(SUM(study_time_minutes) / 60.0, 1) FROM daily_stats
        ),
        'average_streak', (
            SELECT ROUND(AVG(current_streak), 1) FROM user_streaks
        ),
        
        -- Top Performing Categories (by completion rate)
        'top_categories', COALESCE((
            WITH category_performance AS (
                SELECT 
                    c.name as category_name,
                    COUNT(f.id) as total_flashcards,
                    COUNT(up.id) as total_progress_records,
                    COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_count,
                    ROUND(
                        (COUNT(CASE WHEN up.status = 'known' THEN 1 END)::float / 
                         NULLIF(COUNT(up.id), 0)::float) * 100, 1
                    ) as completion_rate
                FROM categories c
                JOIN test_sets ts ON c.id = ts.category_id
                JOIN flashcards f ON ts.id = f.test_set_id
                LEFT JOIN user_progress up ON f.id = up.flashcard_id
                GROUP BY c.id, c.name
                HAVING COUNT(f.id) > 0
                ORDER BY completion_rate DESC NULLS LAST
                LIMIT 10
            )
            SELECT json_agg(
                json_build_object(
                    'category_name', cp.category_name,
                    'total_flashcards', cp.total_flashcards,
                    'total_progress_records', cp.total_progress_records,
                    'completion_rate', COALESCE(cp.completion_rate, 0)
                )
            )
            FROM category_performance cp
        ), '[]'::json),
        
        -- User Growth Data (last 30 days)
        'user_growth_data', COALESCE((
            WITH daily_signups AS (
                SELECT 
                    DATE(created_at) as signup_date,
                    COUNT(*) as new_users
                FROM user_profiles
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY signup_date
            )
            SELECT json_agg(
                json_build_object(
                    'date', ds.signup_date,
                    'new_users', ds.new_users
                )
                ORDER BY ds.signup_date
            )
            FROM daily_signups ds
        ), '[]'::json),
        
        -- Platform Engagement Metrics (last 14 days)
        'engagement_metrics', COALESCE((
            WITH daily_engagement AS (
                SELECT 
                    ds.date,
                    COUNT(DISTINCT ds.user_id) as active_users,
                    SUM(ds.sessions_completed) as total_sessions,
                    SUM(ds.cards_studied) as total_cards_studied,
                    ROUND(AVG(ds.study_time_minutes), 1) as avg_study_time
                FROM daily_stats ds
                WHERE ds.date >= CURRENT_DATE - INTERVAL '14 days'
                GROUP BY ds.date
                ORDER BY ds.date
            )
            SELECT json_agg(
                json_build_object(
                    'date', de.date,
                    'active_users', de.active_users,
                    'total_sessions', de.total_sessions,
                    'total_cards_studied', de.total_cards_studied,
                    'avg_study_time', COALESCE(de.avg_study_time, 0)
                )
                ORDER BY de.date
            )
            FROM daily_engagement de
        ), '[]'::json),
        
        -- User Role Distribution
        'user_roles', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'role', up.role,
                    'count', role_counts.count
                )
            )
            FROM (
                SELECT 
                    role,
                    COUNT(*) as count
                FROM user_profiles
                GROUP BY role
            ) role_counts
            JOIN user_profiles up ON up.role = role_counts.role
            GROUP BY up.role, role_counts.count
        ), '[]'::json),
        
        -- Most Active Users (this month)
        'most_active_users', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'user_email', up.email,
                    'total_cards_studied', user_activity.total_cards,
                    'total_study_time', user_activity.total_time,
                    'current_streak', COALESCE(us.current_streak, 0)
                )
            )
            FROM (
                SELECT 
                    ds.user_id,
                    SUM(ds.cards_studied) as total_cards,
                    SUM(ds.study_time_minutes) as total_time
                FROM daily_stats ds
                WHERE ds.date >= DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY ds.user_id
                ORDER BY total_cards DESC
                LIMIT 10
            ) user_activity
            JOIN user_profiles up ON up.id = user_activity.user_id
            LEFT JOIN user_streaks us ON us.user_id = user_activity.user_id
        ), '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION get_user_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_analytics() TO authenticated;