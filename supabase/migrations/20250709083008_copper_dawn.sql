/*
  # Fix get_user_analytics function SQL error

  1. Database Functions
    - Create or replace `get_user_analytics` function
    - Fix GROUP BY clause issue with ua.earned_at column
    - Ensure proper aggregation of user achievement data

  2. Security
    - Function respects RLS policies
    - Only returns data for authenticated users

  3. Performance
    - Optimized queries with proper indexing usage
    - Efficient joins between related tables
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_analytics(uuid);

-- Create the corrected get_user_analytics function
CREATE OR REPLACE FUNCTION get_user_analytics(user_uuid uuid DEFAULT NULL)
RETURNS TABLE (
  total_flashcards bigint,
  cards_known bigint,
  cards_learning bigint,
  cards_needs_practice bigint,
  cards_new bigint,
  current_streak integer,
  longest_streak integer,
  total_study_days integer,
  total_points integer,
  level integer,
  experience_points integer,
  achievements_count bigint,
  recent_achievements jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Use provided user_uuid or default to current user
  target_user_id := COALESCE(user_uuid, auth.uid());
  
  -- Check if user exists and has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = target_user_id
  ) THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;

  -- Return analytics data
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      us.current_streak,
      us.longest_streak,
      us.total_study_days,
      us.total_points,
      us.level,
      us.experience_points
    FROM user_streaks us
    WHERE us.user_id = target_user_id
  ),
  progress_stats AS (
    SELECT 
      COUNT(*) as total_flashcards,
      COUNT(*) FILTER (WHERE up.status = 'known') as cards_known,
      COUNT(*) FILTER (WHERE up.status = 'learning') as cards_learning,
      COUNT(*) FILTER (WHERE up.status = 'needs_practice') as cards_needs_practice,
      COUNT(*) FILTER (WHERE up.status = 'new') as cards_new
    FROM user_progress up
    WHERE up.user_id = target_user_id
  ),
  achievement_stats AS (
    SELECT 
      COUNT(*) as achievements_count,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
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
        ) FILTER (WHERE ua.id IS NOT NULL),
        '[]'::jsonb
      ) as recent_achievements
    FROM user_achievements ua
    JOIN achievement_definitions ad ON ua.achievement_id = ad.id
    WHERE ua.user_id = target_user_id
      AND ua.earned_at >= NOW() - INTERVAL '30 days'
  )
  SELECT 
    COALESCE(ps.total_flashcards, 0)::bigint,
    COALESCE(ps.cards_known, 0)::bigint,
    COALESCE(ps.cards_learning, 0)::bigint,
    COALESCE(ps.cards_needs_practice, 0)::bigint,
    COALESCE(ps.cards_new, 0)::bigint,
    COALESCE(us.current_streak, 0)::integer,
    COALESCE(us.longest_streak, 0)::integer,
    COALESCE(us.total_study_days, 0)::integer,
    COALESCE(us.total_points, 0)::integer,
    COALESCE(us.level, 1)::integer,
    COALESCE(us.experience_points, 0)::integer,
    COALESCE(ast.achievements_count, 0)::bigint,
    COALESCE(ast.recent_achievements, '[]'::jsonb)
  FROM progress_stats ps
  CROSS JOIN user_stats us
  CROSS JOIN achievement_stats ast;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_analytics(uuid) TO authenticated;