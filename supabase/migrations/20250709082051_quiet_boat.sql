/*
  # Fix SQL GROUP BY error in get_user_analytics function

  1. Database Functions
    - Update `get_user_analytics` function to properly handle GROUP BY clause
    - Fix aggregation of user achievements data
    - Ensure all selected columns are properly grouped or aggregated

  2. Changes Made
    - Properly aggregate recent_achievements using JSON_AGG
    - Include earned_at in the aggregation instead of direct selection
    - Maintain all existing functionality while fixing SQL compliance
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_analytics(uuid);

-- Recreate the function with proper GROUP BY handling
CREATE OR REPLACE FUNCTION get_user_analytics(user_uuid uuid)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_flashcards_studied', COALESCE(
      (SELECT COUNT(DISTINCT up.flashcard_id) 
       FROM user_progress up 
       WHERE up.user_id = user_uuid AND up.status != 'new'), 0
    ),
    'cards_known', COALESCE(
      (SELECT COUNT(*) 
       FROM user_progress up 
       WHERE up.user_id = user_uuid AND up.status = 'known'), 0
    ),
    'cards_learning', COALESCE(
      (SELECT COUNT(*) 
       FROM user_progress up 
       WHERE up.user_id = user_uuid AND up.status = 'learning'), 0
    ),
    'cards_needs_practice', COALESCE(
      (SELECT COUNT(*) 
       FROM user_progress up 
       WHERE up.user_id = user_uuid AND up.status = 'needs_practice'), 0
    ),
    'current_streak', COALESCE(
      (SELECT us.current_streak 
       FROM user_streaks us 
       WHERE us.user_id = user_uuid), 0
    ),
    'longest_streak', COALESCE(
      (SELECT us.longest_streak 
       FROM user_streaks us 
       WHERE us.user_id = user_uuid), 0
    ),
    'total_study_days', COALESCE(
      (SELECT us.total_study_days 
       FROM user_streaks us 
       WHERE us.user_id = user_uuid), 0
    ),
    'level', COALESCE(
      (SELECT us.level 
       FROM user_streaks us 
       WHERE us.user_id = user_uuid), 1
    ),
    'experience_points', COALESCE(
      (SELECT us.experience_points 
       FROM user_streaks us 
       WHERE us.user_id = user_uuid), 0
    ),
    'total_points', COALESCE(
      (SELECT us.total_points 
       FROM user_streaks us 
       WHERE us.user_id = user_uuid), 0
    ),
    'recent_achievements', COALESCE(
      (SELECT JSON_AGG(
         json_build_object(
           'id', ua.id,
           'achievement_id', ua.achievement_id,
           'earned_at', ua.earned_at,
           'points_earned', ua.points_earned,
           'title', ad.title,
           'description', ad.description,
           'icon', ad.icon,
           'badge_color', ad.badge_color
         ) ORDER BY ua.earned_at DESC
       )
       FROM user_achievements ua
       JOIN achievement_definitions ad ON ua.achievement_id = ad.id
       WHERE ua.user_id = user_uuid
       ORDER BY ua.earned_at DESC
       LIMIT 5), '[]'::json
    ),
    'weekly_progress', COALESCE(
      (SELECT JSON_AGG(
         json_build_object(
           'date', ds.date,
           'cards_studied', ds.cards_studied,
           'study_time_minutes', ds.study_time_minutes
         ) ORDER BY ds.date DESC
       )
       FROM daily_stats ds
       WHERE ds.user_id = user_uuid 
         AND ds.date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY ds.date DESC), '[]'::json
    ),
    'category_progress', COALESCE(
      (SELECT JSON_AGG(
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
       GROUP BY ups.category_name), '[]'::json
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_analytics(uuid) TO authenticated;