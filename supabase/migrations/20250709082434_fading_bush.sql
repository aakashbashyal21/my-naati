/*
  # Fix get_user_analytics function

  1. Database Functions
    - Drop existing get_user_analytics function if it exists
    - Create corrected get_user_analytics function with proper GROUP BY clause
    - Function returns user analytics data including achievements, streaks, and progress stats

  2. Security
    - Function uses SECURITY DEFINER to access all required tables
    - Includes proper authentication checks

  3. Changes
    - Fixed GROUP BY clause to include ua.earned_at or use aggregate functions
    - Ensured all selected columns are properly grouped or aggregated
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_analytics(uuid);

-- Create the corrected get_user_analytics function
CREATE OR REPLACE FUNCTION get_user_analytics(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Check if user exists and is authenticated
    IF user_uuid IS NULL OR user_uuid != auth.uid() THEN
        -- Allow admins to view any user's analytics
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        ) THEN
            RAISE EXCEPTION 'Unauthorized access';
        END IF;
    END IF;

    SELECT json_build_object(
        'user_id', user_uuid,
        'total_achievements', COALESCE(achievements.total_count, 0),
        'total_points', COALESCE(achievements.total_points, 0),
        'recent_achievements', COALESCE(achievements.recent_list, '[]'::json),
        'current_streak', COALESCE(streaks.current_streak, 0),
        'longest_streak', COALESCE(streaks.longest_streak, 0),
        'total_study_days', COALESCE(streaks.total_study_days, 0),
        'level', COALESCE(streaks.level, 1),
        'experience_points', COALESCE(streaks.experience_points, 0),
        'cards_studied_today', COALESCE(daily.cards_studied, 0),
        'study_time_today', COALESCE(daily.study_time_minutes, 0),
        'weekly_progress', COALESCE(weekly.progress_data, '[]'::json),
        'progress_by_status', COALESCE(progress.status_counts, '[]'::json)
    ) INTO result
    FROM (SELECT user_uuid as id) u
    LEFT JOIN (
        SELECT 
            ua.user_id,
            COUNT(*) as total_count,
            SUM(ua.points_earned) as total_points,
            json_agg(
                json_build_object(
                    'title', ad.title,
                    'description', ad.description,
                    'icon', ad.icon,
                    'points', ua.points_earned,
                    'earned_at', ua.earned_at
                ) ORDER BY ua.earned_at DESC
            ) FILTER (WHERE ua.earned_at >= NOW() - INTERVAL '7 days') as recent_list
        FROM user_achievements ua
        JOIN achievement_definitions ad ON ua.achievement_id = ad.id
        WHERE ua.user_id = user_uuid
        GROUP BY ua.user_id
    ) achievements ON achievements.user_id = user_uuid
    LEFT JOIN (
        SELECT 
            user_id,
            current_streak,
            longest_streak,
            total_study_days,
            level,
            experience_points
        FROM user_streaks
        WHERE user_id = user_uuid
    ) streaks ON streaks.user_id = user_uuid
    LEFT JOIN (
        SELECT 
            user_id,
            cards_studied,
            study_time_minutes
        FROM daily_stats
        WHERE user_id = user_uuid AND date = CURRENT_DATE
    ) daily ON daily.user_id = user_uuid
    LEFT JOIN (
        SELECT 
            user_id,
            json_agg(
                json_build_object(
                    'date', date,
                    'cards_studied', cards_studied,
                    'study_time', study_time_minutes
                ) ORDER BY date DESC
            ) as progress_data
        FROM daily_stats
        WHERE user_id = user_uuid 
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY user_id
    ) weekly ON weekly.user_id = user_uuid
    LEFT JOIN (
        SELECT 
            up.user_id,
            json_agg(
                json_build_object(
                    'status', up.status,
                    'count', status_counts.count
                )
            ) as status_counts
        FROM (
            SELECT 
                user_id,
                status,
                COUNT(*) as count
            FROM user_progress
            WHERE user_id = user_uuid
            GROUP BY user_id, status
        ) status_counts
        JOIN user_progress up ON up.user_id = status_counts.user_id
        WHERE up.user_id = user_uuid
        GROUP BY up.user_id
    ) progress ON progress.user_id = user_uuid;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_analytics(uuid) TO authenticated;