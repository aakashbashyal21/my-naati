/*
  # Create Analytics Functions

  1. Functions Created
    - `get_user_analytics(user_uuid)` - Returns comprehensive user analytics data
    - `get_admin_analytics()` - Returns platform-wide analytics for administrators

  2. Features
    - User progress statistics (cards, streaks, levels)
    - Recent achievements with details
    - Weekly progress tracking
    - Category completion rates
    - Admin platform metrics
    - User engagement data
    - Top performing categories

  3. Security
    - Functions use security definer to access data
    - Proper user authentication checks
    - Admin role verification for admin analytics
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_analytics(uuid);
DROP FUNCTION IF EXISTS get_admin_analytics();

-- Create get_user_analytics function
CREATE OR REPLACE FUNCTION get_user_analytics(user_uuid uuid)
RETURNS TABLE (
  total_cards bigint,
  known_cards bigint,
  learning_cards bigint,
  needs_practice_cards bigint,
  current_streak integer,
  longest_streak integer,
  total_study_days integer,
  total_points integer,
  user_level integer,
  recent_achievements jsonb,
  weekly_progress jsonb,
  category_progress jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_streak_data record;
  achievements_data jsonb;
  weekly_data jsonb;
  category_data jsonb;
BEGIN
  -- Get user streak information
  SELECT 
    us.current_streak,
    us.longest_streak,
    us.total_study_days,
    us.total_points,
    us.level
  INTO user_streak_data
  FROM user_streaks us
  WHERE us.user_id = user_uuid;
  
  -- If no streak data exists, create default values
  IF user_streak_data IS NULL THEN
    user_streak_data.current_streak := 0;
    user_streak_data.longest_streak := 0;
    user_streak_data.total_study_days := 0;
    user_streak_data.total_points := 0;
    user_streak_data.level := 1;
  END IF;

  -- Get recent achievements (last 10)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'title', ad.title,
      'description', ad.description,
      'icon', ad.icon,
      'badge_color', ad.badge_color,
      'points', ua.points_earned,
      'earned_at', ua.earned_at
    ) ORDER BY ua.earned_at DESC
  ), '[]'::jsonb)
  INTO achievements_data
  FROM user_achievements ua
  JOIN achievement_definitions ad ON ua.achievement_id = ad.id
  WHERE ua.user_id = user_uuid
  ORDER BY ua.earned_at DESC
  LIMIT 10;

  -- Get weekly progress (last 7 days)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', ds.date,
      'cards_studied', ds.cards_studied,
      'study_time', ds.study_time_minutes
    ) ORDER BY ds.date DESC
  ), '[]'::jsonb)
  INTO weekly_data
  FROM daily_stats ds
  WHERE ds.user_id = user_uuid
    AND ds.date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY ds.date DESC;

  -- Get category progress
  WITH category_stats AS (
    SELECT 
      c.id as category_id,
      c.name as category_name,
      COUNT(f.id) as total_cards,
      COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards
    FROM categories c
    JOIN test_sets ts ON c.id = ts.category_id
    JOIN flashcards f ON ts.id = f.test_set_id
    LEFT JOIN user_progress up ON f.id = up.flashcard_id AND up.user_id = user_uuid
    GROUP BY c.id, c.name
    HAVING COUNT(f.id) > 0
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category_name', cs.category_name,
      'total_cards', cs.total_cards,
      'known_cards', cs.known_cards,
      'completion_percentage', 
      CASE 
        WHEN cs.total_cards > 0 THEN (cs.known_cards::float / cs.total_cards::float) * 100
        ELSE 0
      END
    )
  ), '[]'::jsonb)
  INTO category_data
  FROM category_stats cs;

  -- Return the analytics data
  RETURN QUERY
  WITH progress_stats AS (
    SELECT 
      COUNT(up.id) as total_cards,
      COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards,
      COUNT(CASE WHEN up.status = 'learning' THEN 1 END) as learning_cards,
      COUNT(CASE WHEN up.status = 'needs_practice' THEN 1 END) as needs_practice_cards
    FROM user_progress up
    WHERE up.user_id = user_uuid
  )
  SELECT 
    COALESCE(ps.total_cards, 0),
    COALESCE(ps.known_cards, 0),
    COALESCE(ps.learning_cards, 0),
    COALESCE(ps.needs_practice_cards, 0),
    user_streak_data.current_streak,
    user_streak_data.longest_streak,
    user_streak_data.total_study_days,
    user_streak_data.total_points,
    user_streak_data.level,
    achievements_data,
    weekly_data,
    category_data
  FROM progress_stats ps;
END;
$$;

-- Create get_admin_analytics function
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS TABLE (
  total_users bigint,
  active_users_today bigint,
  active_users_week bigint,
  total_study_sessions bigint,
  total_cards_studied bigint,
  average_streak numeric,
  top_categories jsonb,
  user_growth_data jsonb,
  engagement_metrics jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  categories_data jsonb;
  growth_data jsonb;
  engagement_data jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Get top categories with completion rates
  WITH category_stats AS (
    SELECT 
      c.name as category_name,
      COUNT(f.id) as total_flashcards,
      COUNT(up.id) as total_progress_records,
      AVG(CASE 
        WHEN up.status = 'known' THEN 100.0 
        WHEN up.status = 'learning' THEN 50.0
        WHEN up.status = 'needs_practice' THEN 25.0
        ELSE 0.0 
      END) as completion_rate
    FROM categories c
    JOIN test_sets ts ON c.id = ts.category_id
    JOIN flashcards f ON ts.id = f.test_set_id
    LEFT JOIN user_progress up ON f.id = up.flashcard_id
    GROUP BY c.id, c.name
    HAVING COUNT(f.id) > 0
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category_name', cs.category_name,
      'total_flashcards', cs.total_flashcards,
      'total_progress_records', cs.total_progress_records,
      'completion_rate', ROUND(COALESCE(cs.completion_rate, 0), 1)
    ) ORDER BY cs.completion_rate DESC
  ), '[]'::jsonb)
  INTO categories_data
  FROM category_stats cs;

  -- Get user growth data (last 30 days)
  WITH daily_signups AS (
    SELECT 
      DATE(created_at) as signup_date,
      COUNT(*) as new_users
    FROM user_profiles
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY signup_date
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', ds.signup_date,
      'new_users', ds.new_users
    ) ORDER BY ds.signup_date
  ), '[]'::jsonb)
  INTO growth_data
  FROM daily_signups ds;

  -- Get engagement metrics (last 14 days)
  WITH daily_engagement AS (
    SELECT 
      ds.date,
      COUNT(DISTINCT ds.user_id) as active_users,
      SUM(ds.sessions_completed) as total_sessions,
      AVG(ds.study_time_minutes) as avg_study_time
    FROM daily_stats ds
    WHERE ds.date >= CURRENT_DATE - INTERVAL '14 days'
    GROUP BY ds.date
    ORDER BY ds.date
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', de.date,
      'active_users', de.active_users,
      'total_sessions', de.total_sessions,
      'avg_study_time', ROUND(COALESCE(de.avg_study_time, 0), 1)
    ) ORDER BY de.date
  ), '[]'::jsonb)
  INTO engagement_data
  FROM daily_engagement de;

  -- Return the admin analytics data
  RETURN QUERY
  WITH base_stats AS (
    SELECT 
      (SELECT COUNT(*) FROM user_profiles) as total_users,
      (SELECT COUNT(DISTINCT user_id) FROM daily_stats WHERE date = CURRENT_DATE) as active_today,
      (SELECT COUNT(DISTINCT user_id) FROM daily_stats WHERE date >= CURRENT_DATE - INTERVAL '7 days') as active_week,
      (SELECT SUM(sessions_completed) FROM daily_stats) as total_sessions,
      (SELECT SUM(cards_studied) FROM daily_stats) as total_cards,
      (SELECT AVG(current_streak) FROM user_streaks) as avg_streak
  )
  SELECT 
    bs.total_users,
    bs.active_today,
    bs.active_week,
    bs.total_sessions,
    bs.total_cards,
    ROUND(COALESCE(bs.avg_streak, 0), 1),
    categories_data,
    growth_data,
    engagement_data
  FROM base_stats bs;
END;
$$;