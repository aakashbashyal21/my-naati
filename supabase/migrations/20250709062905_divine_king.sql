/*
  # Analytics Dashboard and Gamification System

  1. New Tables
    - `user_streaks` - Track daily study streaks and gamification data
    - `user_achievements` - Store earned badges and achievements
    - `achievement_definitions` - Define available achievements and badges
    - `daily_stats` - Track daily study statistics for analytics
    - `admin_analytics` - Store aggregated analytics for super admin dashboard

  2. Functions
    - Analytics functions for user and admin dashboards
    - Streak calculation and maintenance functions
    - Achievement checking and awarding functions
    - Gamification scoring functions

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for users and admins
*/

-- Create achievement definitions table
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL, -- 'streak', 'progress', 'mastery', 'milestone'
  requirement_type text NOT NULL, -- 'streak_days', 'cards_known', 'sessions_completed', 'test_sets_completed'
  requirement_value integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  badge_color text NOT NULL DEFAULT 'blue',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  points_earned integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Create user streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_study_date date,
  total_study_days integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  experience_points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily stats table for detailed analytics
CREATE TABLE IF NOT EXISTS daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  cards_studied integer NOT NULL DEFAULT 0,
  cards_known integer NOT NULL DEFAULT 0,
  cards_needs_practice integer NOT NULL DEFAULT 0,
  study_time_minutes integer NOT NULL DEFAULT 0,
  sessions_completed integer NOT NULL DEFAULT 0,
  test_sets_practiced text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can read achievement definitions"
  ON achievement_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage achievement definitions"
  ON achievement_definitions FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can read own streaks"
  ON user_streaks FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage own streaks"
  ON user_streaks FOR ALL TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own daily stats"
  ON daily_stats FOR ALL TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all achievements"
  ON user_achievements FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can read all streaks"
  ON user_streaks FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can read all daily stats"
  ON daily_stats FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

-- Insert default achievement definitions
INSERT INTO achievement_definitions (name, title, description, icon, category, requirement_type, requirement_value, points, badge_color) VALUES
('first_study', 'First Steps', 'Complete your first study session', 'play', 'milestone', 'sessions_completed', 1, 10, 'blue'),
('streak_3', 'Getting Started', 'Study for 3 days in a row', 'flame', 'streak', 'streak_days', 3, 25, 'orange'),
('streak_7', 'Week Warrior', 'Study for 7 days in a row', 'zap', 'streak', 'streak_days', 7, 50, 'yellow'),
('streak_30', 'Monthly Master', 'Study for 30 days in a row', 'crown', 'streak', 'streak_days', 30, 200, 'gold'),
('cards_50', 'Vocabulary Builder', 'Master 50 flashcards', 'book-open', 'progress', 'cards_known', 50, 75, 'green'),
('cards_100', 'Word Wizard', 'Master 100 flashcards', 'brain', 'progress', 'cards_known', 100, 150, 'purple'),
('cards_500', 'NAATI Ready', 'Master 500 flashcards', 'award', 'mastery', 'cards_known', 500, 500, 'gold'),
('test_set_complete', 'Set Completed', 'Complete your first test set', 'check-circle', 'milestone', 'test_sets_completed', 1, 100, 'green'),
('perfect_week', 'Perfect Week', 'Study every day for a week', 'star', 'streak', 'streak_days', 7, 100, 'gold');

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID) RETURNS VOID AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  current_streak_val INTEGER := 0;
  longest_streak_val INTEGER := 0;
  last_study DATE;
  total_days INTEGER := 0;
BEGIN
  -- Get current streak data
  SELECT current_streak, longest_streak, last_study_date, total_study_days
  INTO current_streak_val, longest_streak_val, last_study, total_days
  FROM user_streaks 
  WHERE user_id = user_uuid;
  
  -- If no streak record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_study_date, total_study_days)
    VALUES (user_uuid, 1, 1, today_date, 1);
    RETURN;
  END IF;
  
  -- If already studied today, don't update
  IF last_study = today_date THEN
    RETURN;
  END IF;
  
  -- Update streak based on last study date
  IF last_study = yesterday_date THEN
    -- Continue streak
    current_streak_val := current_streak_val + 1;
  ELSIF last_study < yesterday_date THEN
    -- Streak broken, start new
    current_streak_val := 1;
  ELSE
    -- First study or same day
    current_streak_val := 1;
  END IF;
  
  -- Update longest streak if current is higher
  longest_streak_val := GREATEST(longest_streak_val, current_streak_val);
  
  -- Update total study days
  total_days := total_days + 1;
  
  -- Update the record
  UPDATE user_streaks SET
    current_streak = current_streak_val,
    longest_streak = longest_streak_val,
    last_study_date = today_date,
    total_study_days = total_days,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily stats
CREATE OR REPLACE FUNCTION update_daily_stats(
  user_uuid UUID,
  cards_studied_count INTEGER DEFAULT 0,
  cards_known_count INTEGER DEFAULT 0,
  cards_practice_count INTEGER DEFAULT 0,
  study_minutes INTEGER DEFAULT 0,
  test_set_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  current_test_sets TEXT[];
BEGIN
  -- Get current test sets for today
  SELECT test_sets_practiced INTO current_test_sets
  FROM daily_stats 
  WHERE user_id = user_uuid AND date = today_date;
  
  -- Add test set to array if provided and not already included
  IF test_set_id IS NOT NULL THEN
    IF current_test_sets IS NULL THEN
      current_test_sets := ARRAY[test_set_id::TEXT];
    ELSIF NOT (test_set_id::TEXT = ANY(current_test_sets)) THEN
      current_test_sets := array_append(current_test_sets, test_set_id::TEXT);
    END IF;
  END IF;
  
  -- Upsert daily stats
  INSERT INTO daily_stats (
    user_id, date, cards_studied, cards_known, cards_needs_practice, 
    study_time_minutes, sessions_completed, test_sets_practiced
  )
  VALUES (
    user_uuid, today_date, cards_studied_count, cards_known_count, 
    cards_practice_count, study_minutes, 1, current_test_sets
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    cards_studied = daily_stats.cards_studied + cards_studied_count,
    cards_known = daily_stats.cards_known + cards_known_count,
    cards_needs_practice = daily_stats.cards_needs_practice + cards_practice_count,
    study_time_minutes = daily_stats.study_time_minutes + study_minutes,
    sessions_completed = daily_stats.sessions_completed + 1,
    test_sets_practiced = EXCLUDED.test_sets_practiced;
    
  -- Update user streak
  PERFORM update_user_streak(user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(user_uuid UUID) RETURNS INTEGER AS $$
DECLARE
  achievement_record RECORD;
  user_stats RECORD;
  streak_data RECORD;
  awarded_count INTEGER := 0;
BEGIN
  -- Get user statistics
  SELECT 
    COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards,
    COUNT(DISTINCT f.test_set_id) as completed_test_sets
  INTO user_stats
  FROM flashcards f
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid;
  
  -- Get streak data
  SELECT current_streak, total_study_days
  INTO streak_data
  FROM user_streaks 
  WHERE user_id = user_uuid;
  
  -- Check each achievement
  FOR achievement_record IN 
    SELECT * FROM achievement_definitions WHERE is_active = true
  LOOP
    -- Skip if already earned
    IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = user_uuid AND achievement_id = achievement_record.id) THEN
      CONTINUE;
    END IF;
    
    -- Check if achievement requirements are met
    CASE achievement_record.requirement_type
      WHEN 'cards_known' THEN
        IF user_stats.known_cards >= achievement_record.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id, points_earned)
          VALUES (user_uuid, achievement_record.id, achievement_record.points);
          awarded_count := awarded_count + 1;
        END IF;
      WHEN 'streak_days' THEN
        IF streak_data.current_streak >= achievement_record.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id, points_earned)
          VALUES (user_uuid, achievement_record.id, achievement_record.points);
          awarded_count := awarded_count + 1;
        END IF;
      WHEN 'sessions_completed' THEN
        IF streak_data.total_study_days >= achievement_record.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id, points_earned)
          VALUES (user_uuid, achievement_record.id, achievement_record.points);
          awarded_count := awarded_count + 1;
        END IF;
      WHEN 'test_sets_completed' THEN
        IF user_stats.completed_test_sets >= achievement_record.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id, points_earned)
          VALUES (user_uuid, achievement_record.id, achievement_record.points);
          awarded_count := awarded_count + 1;
        END IF;
    END CASE;
  END LOOP;
  
  -- Update total points in user_streaks
  UPDATE user_streaks SET
    total_points = (
      SELECT COALESCE(SUM(points_earned), 0) 
      FROM user_achievements 
      WHERE user_id = user_uuid
    ),
    experience_points = (
      SELECT COALESCE(SUM(points_earned), 0) 
      FROM user_achievements 
      WHERE user_id = user_uuid
    ),
    level = GREATEST(1, (
      SELECT COALESCE(SUM(points_earned), 0) / 100 + 1
      FROM user_achievements 
      WHERE user_id = user_uuid
    ))
  WHERE user_id = user_uuid;
  
  RETURN awarded_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analytics dashboard data
CREATE OR REPLACE FUNCTION get_user_analytics(user_uuid UUID)
RETURNS TABLE (
  total_cards BIGINT,
  known_cards BIGINT,
  learning_cards BIGINT,
  needs_practice_cards BIGINT,
  current_streak INTEGER,
  longest_streak INTEGER,
  total_study_days INTEGER,
  total_points INTEGER,
  user_level INTEGER,
  recent_achievements JSON,
  weekly_progress JSON,
  category_progress JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH user_progress_stats AS (
    SELECT 
      COUNT(f.id) as total_cards,
      COUNT(CASE WHEN up.status = 'known' THEN 1 END) as known_cards,
      COUNT(CASE WHEN up.status = 'learning' THEN 1 END) as learning_cards,
      COUNT(CASE WHEN up.status = 'needs_practice' THEN 1 END) as needs_practice_cards
    FROM flashcards f
    LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  ),
  streak_stats AS (
    SELECT 
      COALESCE(current_streak, 0) as current_streak,
      COALESCE(longest_streak, 0) as longest_streak,
      COALESCE(total_study_days, 0) as total_study_days,
      COALESCE(total_points, 0) as total_points,
      COALESCE(level, 1) as user_level
    FROM user_streaks 
    WHERE user_id = user_uuid
  ),
  recent_achievements_data AS (
    SELECT json_agg(
      json_build_object(
        'title', ad.title,
        'description', ad.description,
        'icon', ad.icon,
        'points', ua.points_earned,
        'earned_at', ua.earned_at,
        'badge_color', ad.badge_color
      ) ORDER BY ua.earned_at DESC
    ) as achievements
    FROM user_achievements ua
    JOIN achievement_definitions ad ON ad.id = ua.achievement_id
    WHERE ua.user_id = user_uuid
    AND ua.earned_at > NOW() - INTERVAL '30 days'
    LIMIT 5
  ),
  weekly_progress_data AS (
    SELECT json_agg(
      json_build_object(
        'date', ds.date,
        'cards_studied', ds.cards_studied,
        'study_time', ds.study_time_minutes
      ) ORDER BY ds.date
    ) as weekly_data
    FROM daily_stats ds
    WHERE ds.user_id = user_uuid
    AND ds.date >= CURRENT_DATE - INTERVAL '7 days'
  ),
  category_progress_data AS (
    SELECT json_agg(
      json_build_object(
        'category_name', c.name,
        'total_cards', COUNT(f.id),
        'known_cards', COUNT(CASE WHEN up.status = 'known' THEN 1 END),
        'completion_percentage', ROUND(
          COUNT(CASE WHEN up.status = 'known' THEN 1 END) * 100.0 / NULLIF(COUNT(f.id), 0), 1
        )
      )
    ) as category_data
    FROM categories c
    JOIN test_sets ts ON ts.category_id = c.id
    JOIN flashcards f ON f.test_set_id = ts.id
    LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
    GROUP BY c.id, c.name
  )
  SELECT 
    ups.total_cards,
    ups.known_cards,
    ups.learning_cards,
    ups.needs_practice_cards,
    ss.current_streak,
    ss.longest_streak,
    ss.total_study_days,
    ss.total_points,
    ss.user_level,
    COALESCE(rad.achievements, '[]'::json) as recent_achievements,
    COALESCE(wpd.weekly_data, '[]'::json) as weekly_progress,
    COALESCE(cpd.category_data, '[]'::json) as category_progress
  FROM user_progress_stats ups
  CROSS JOIN streak_stats ss
  CROSS JOIN recent_achievements_data rad
  CROSS JOIN weekly_progress_data wpd
  CROSS JOIN category_progress_data cpd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin analytics dashboard data
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS TABLE (
  total_users BIGINT,
  active_users_today BIGINT,
  active_users_week BIGINT,
  total_study_sessions BIGINT,
  total_cards_studied BIGINT,
  average_streak NUMERIC,
  top_categories JSON,
  user_growth_data JSON,
  engagement_metrics JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN us.last_study_date = CURRENT_DATE THEN 1 END) as active_today,
      COUNT(CASE WHEN us.last_study_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_week,
      AVG(COALESCE(us.current_streak, 0)) as avg_streak
    FROM user_profiles up
    LEFT JOIN user_streaks us ON us.user_id = up.id
  ),
  session_stats AS (
    SELECT 
      SUM(sessions_completed) as total_sessions,
      SUM(cards_studied) as total_cards
    FROM daily_stats
  ),
  top_categories_data AS (
    SELECT json_agg(
      json_build_object(
        'category_name', c.name,
        'total_flashcards', COUNT(f.id),
        'total_progress_records', COUNT(up.id),
        'completion_rate', ROUND(
          COUNT(CASE WHEN up.status = 'known' THEN 1 END) * 100.0 / NULLIF(COUNT(up.id), 0), 1
        )
      ) ORDER BY COUNT(up.id) DESC
    ) as categories
    FROM categories c
    JOIN test_sets ts ON ts.category_id = c.id
    JOIN flashcards f ON f.test_set_id = ts.id
    LEFT JOIN user_progress up ON up.flashcard_id = f.id
    GROUP BY c.id, c.name
    LIMIT 10
  ),
  growth_data AS (
    SELECT json_agg(
      json_build_object(
        'date', date_trunc('day', created_at)::date,
        'new_users', COUNT(*)
      ) ORDER BY date_trunc('day', created_at)::date
    ) as growth
    FROM user_profiles
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)::date
  ),
  engagement_data AS (
    SELECT json_agg(
      json_build_object(
        'date', ds.date,
        'active_users', COUNT(DISTINCT ds.user_id),
        'total_sessions', SUM(ds.sessions_completed),
        'avg_study_time', AVG(ds.study_time_minutes)
      ) ORDER BY ds.date
    ) as engagement
    FROM daily_stats ds
    WHERE ds.date >= CURRENT_DATE - INTERVAL '14 days'
    GROUP BY ds.date
  )
  SELECT 
    us.total_users,
    us.active_today,
    us.active_week,
    COALESCE(ss.total_sessions, 0),
    COALESCE(ss.total_cards, 0),
    COALESCE(us.avg_streak, 0),
    COALESCE(tcd.categories, '[]'::json) as top_categories,
    COALESCE(gd.growth, '[]'::json) as user_growth_data,
    COALESCE(ed.engagement, '[]'::json) as engagement_metrics
  FROM user_stats us
  CROSS JOIN session_stats ss
  CROSS JOIN top_categories_data tcd
  CROSS JOIN growth_data gd
  CROSS JOIN engagement_data ed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON achievement_definitions TO authenticated;
GRANT ALL ON user_achievements TO authenticated;
GRANT ALL ON user_streaks TO authenticated;
GRANT ALL ON daily_stats TO authenticated;

GRANT EXECUTE ON FUNCTION update_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_stats(UUID, INTEGER, INTEGER, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_award_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_analytics() TO authenticated;