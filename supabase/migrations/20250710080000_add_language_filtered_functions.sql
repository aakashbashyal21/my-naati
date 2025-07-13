-- Add language-filtered versions of user stats functions
-- This allows filtering analytics and progress by the user's selected language

-- Language-filtered version of get_user_stats_detailed
CREATE OR REPLACE FUNCTION get_user_stats_detailed_by_language(
  user_uuid UUID,
  language_uuid UUID
)
RETURNS TABLE (
  total_cards BIGINT,
  known_cards BIGINT,
  learning_cards BIGINT,
  needs_practice_cards BIGINT,
  new_cards BIGINT,
  test_set_id UUID,
  test_set_name TEXT,
  category_name TEXT,
  last_studied TIMESTAMPTZ,
  completion_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(f.id) as total_cards,
    COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards,
    COUNT(CASE WHEN up.status = 'learning' THEN 1 END) as learning_cards,
    COUNT(CASE WHEN up.status = 'needs_practice' THEN 1 END) as needs_practice_cards,
    COUNT(CASE WHEN up.status = 'new' OR up.status IS NULL THEN 1 END) as new_cards,
    ts.id as test_set_id,
    ts.name as test_set_name,
    c.name as category_name,
    MAX(up.last_reviewed) as last_studied,
    ROUND(
      (COUNT(CASE WHEN up.status = 'known' THEN 1 END) * 100.0 / NULLIF(COUNT(f.id), 0)), 
      1
    ) as completion_percentage
  FROM test_sets ts
  JOIN categories c ON c.id = ts.category_id
  JOIN flashcards f ON f.test_set_id = ts.id
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  WHERE ts.language_id = language_uuid
  GROUP BY ts.id, ts.name, c.name
  ORDER BY MAX(up.last_reviewed) DESC NULLS LAST, ts.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Language-filtered version of get_user_stats
CREATE OR REPLACE FUNCTION get_user_stats_by_language(
  user_uuid UUID,
  language_uuid UUID
)
RETURNS TABLE (
  total_cards BIGINT,
  known_cards BIGINT,
  learning_cards BIGINT,
  needs_practice_cards BIGINT,
  new_cards BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(f.id) as total_cards,
    COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards,
    COUNT(CASE WHEN up.status = 'learning' THEN 1 END) as learning_cards,
    COUNT(CASE WHEN up.status = 'needs_practice' THEN 1 END) as needs_practice_cards,
    COUNT(CASE WHEN up.status = 'new' OR up.status IS NULL THEN 1 END) as new_cards
  FROM flashcards f
  JOIN test_sets ts ON ts.id = f.test_set_id
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  WHERE ts.language_id = language_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Language-filtered version of get_user_analytics
CREATE OR REPLACE FUNCTION get_user_analytics_by_language(
  user_uuid UUID,
  language_uuid UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH language_stats AS (
    SELECT 
      COUNT(f.id) as total_cards,
      COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards,
      COUNT(CASE WHEN up.status = 'learning' THEN 1 END) as learning_cards,
      COUNT(CASE WHEN up.status = 'needs_practice' THEN 1 END) as needs_practice_cards,
      COUNT(CASE WHEN up.status = 'new' OR up.status IS NULL THEN 1 END) as new_cards
    FROM flashcards f
    JOIN test_sets ts ON ts.id = f.test_set_id
    LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
    WHERE ts.language_id = language_uuid
  ),
  streak_data AS (
    SELECT 
      us.current_streak,
      us.longest_streak,
      us.total_study_days,
      us.total_points,
      us.level as user_level,
      us.experience_points
    FROM user_streaks us
    WHERE us.user_id = user_uuid
  ),
  recent_achievements AS (
    SELECT 
      json_agg(
        json_build_object(
          'id', ua.id,
          'name', a.name,
          'title', a.title,
          'description', a.description,
          'icon', a.icon,
          'points_earned', ua.points_earned,
          'earned_at', ua.earned_at
        )
      ) as achievements
    FROM user_achievements ua
    JOIN achievement_definitions a ON a.id = ua.achievement_id
    WHERE ua.user_id = user_uuid
    AND ua.earned_at >= NOW() - INTERVAL '30 days'
  ),
  weekly_progress AS (
    SELECT 
      json_agg(
        json_build_object(
          'date', ds.date,
          'cards_studied', ds.cards_studied,
          'cards_known', ds.cards_known,
          'study_time_minutes', ds.study_time_minutes,
          'sessions_completed', ds.sessions_completed
        )
      ) as progress
    FROM daily_stats ds
    WHERE ds.user_id = user_uuid
    AND ds.date >= NOW() - INTERVAL '7 days'
  ),
  category_progress AS (
    SELECT 
      json_agg(
        json_build_object(
          'category_name', c.name,
          'total_cards', COUNT(f.id),
          'known_cards', COUNT(CASE WHEN up.status = 'known' THEN 1 END),
          'completion_percentage', ROUND(
            (COUNT(CASE WHEN up.status = 'known' THEN 1 END) * 100.0 / NULLIF(COUNT(f.id), 0)), 
            1
          )
        )
      ) as categories
    FROM categories c
    JOIN test_sets ts ON ts.category_id = c.id
    JOIN flashcards f ON f.test_set_id = ts.id
    LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
    WHERE c.language_id = language_uuid
    GROUP BY c.id, c.name
  )
  SELECT 
    json_build_object(
      'total_cards', COALESCE(ls.total_cards, 0),
      'known_cards', COALESCE(ls.known_cards, 0),
      'learning_cards', COALESCE(ls.learning_cards, 0),
      'needs_practice_cards', COALESCE(ls.needs_practice_cards, 0),
      'current_streak', COALESCE(sd.current_streak, 0),
      'longest_streak', COALESCE(sd.longest_streak, 0),
      'total_study_days', COALESCE(sd.total_study_days, 0),
      'total_points', COALESCE(sd.total_points, 0),
      'user_level', COALESCE(sd.user_level, 1),
      'recent_achievements', COALESCE(ra.achievements, '[]'::json),
      'weekly_progress', COALESCE(wp.progress, '[]'::json),
      'category_progress', COALESCE(cp.categories, '[]'::json)
    ) INTO result
  FROM language_stats ls
  CROSS JOIN streak_data sd
  CROSS JOIN recent_achievements ra
  CROSS JOIN weekly_progress wp
  CROSS JOIN category_progress cp;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_user_stats_detailed_by_language(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats_by_language(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_analytics_by_language(UUID, UUID) TO authenticated; 