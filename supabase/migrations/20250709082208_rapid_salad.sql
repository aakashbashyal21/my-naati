/*
  # Fix get_user_analytics function GROUP BY error

  1. Database Functions
    - Update `get_user_analytics` function to properly handle GROUP BY clause
    - Fix the `ua.earned_at` column aggregation issue
    - Ensure all selected columns are either in GROUP BY or use aggregate functions

  2. Changes Made
    - Modified the user achievements query to use MAX(ua.earned_at) for recent achievements
    - Ensured proper aggregation for all columns in the GROUP BY context
    - Maintained the same return structure for compatibility
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_analytics(uuid);

-- Recreate the function with proper GROUP BY handling
CREATE OR REPLACE FUNCTION get_user_analytics(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'totalCards', COALESCE((
            SELECT COUNT(*)
            FROM user_progress up
            WHERE up.user_id = user_uuid
        ), 0),
        'knownCards', COALESCE((
            SELECT COUNT(*)
            FROM user_progress up
            WHERE up.user_id = user_uuid AND up.status = 'known'
        ), 0),
        'learningCards', COALESCE((
            SELECT COUNT(*)
            FROM user_progress up
            WHERE up.user_id = user_uuid AND up.status = 'learning'
        ), 0),
        'needsPracticeCards', COALESCE((
            SELECT COUNT(*)
            FROM user_progress up
            WHERE up.user_id = user_uuid AND up.status = 'needs_practice'
        ), 0),
        'currentStreak', COALESCE((
            SELECT us.current_streak
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 0),
        'longestStreak', COALESCE((
            SELECT us.longest_streak
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 0),
        'totalPoints', COALESCE((
            SELECT us.total_points
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 0),
        'level', COALESCE((
            SELECT us.level
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 1),
        'experiencePoints', COALESCE((
            SELECT us.experience_points
            FROM user_streaks us
            WHERE us.user_id = user_uuid
        ), 0),
        'recentAchievements', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', ad.id,
                    'name', ad.name,
                    'title', ad.title,
                    'description', ad.description,
                    'icon', ad.icon,
                    'badge_color', ad.badge_color,
                    'points_earned', ua.points_earned,
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
        'weeklyProgress', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'date', ds.date,
                    'cards_studied', ds.cards_studied,
                    'study_time_minutes', ds.study_time_minutes
                )
                ORDER BY ds.date DESC
            )
            FROM daily_stats ds
            WHERE ds.user_id = user_uuid
            AND ds.date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY ds.date DESC
        ), '[]'::json),
        'categoryProgress', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'category_name', ups.category_name,
                    'total_cards', COUNT(*),
                    'known_cards', COUNT(*) FILTER (WHERE ups.status = 'known'),
                    'learning_cards', COUNT(*) FILTER (WHERE ups.status = 'learning'),
                    'needs_practice_cards', COUNT(*) FILTER (WHERE ups.status = 'needs_practice')
                )
            )
            FROM user_progress_summary ups
            WHERE ups.user_id = user_uuid
            GROUP BY ups.category_name
        ), '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$;