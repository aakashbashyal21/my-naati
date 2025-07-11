/*
  # Enhanced Progress Tracking System

  1. Database Functions
    - Enhanced user stats calculation
    - Progress tracking with session management
    - Automatic progress initialization

  2. Triggers
    - Auto-create progress records when users start test sets
    - Update timestamps on progress changes

  3. Views
    - Comprehensive progress views for better querying
*/

-- Function to initialize user progress for a test set
CREATE OR REPLACE FUNCTION initialize_user_progress(
  user_uuid UUID,
  test_set_uuid UUID
) RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  -- Insert progress records for all flashcards in the test set that don't have progress yet
  INSERT INTO user_progress (user_id, flashcard_id, status, created_at, updated_at)
  SELECT 
    user_uuid,
    f.id,
    'new'::progress_status,
    NOW(),
    NOW()
  FROM flashcards f
  WHERE f.test_set_id = test_set_uuid
    AND NOT EXISTS (
      SELECT 1 FROM user_progress up 
      WHERE up.user_id = user_uuid AND up.flashcard_id = f.id
    );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to get user stats with test set breakdown
CREATE OR REPLACE FUNCTION get_user_stats_detailed(user_uuid UUID)
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
  GROUP BY ts.id, ts.name, c.name
  ORDER BY MAX(up.last_reviewed) DESC NULLS LAST, ts.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get overall user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
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
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user progress with automatic review count increment
CREATE OR REPLACE FUNCTION update_user_progress_safe(
  user_uuid UUID,
  flashcard_uuid UUID,
  new_status progress_status
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_progress (
    user_id, 
    flashcard_id, 
    status, 
    last_reviewed, 
    review_count,
    created_at,
    updated_at
  )
  VALUES (
    user_uuid,
    flashcard_uuid,
    new_status,
    NOW(),
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, flashcard_id)
  DO UPDATE SET
    status = new_status,
    last_reviewed = NOW(),
    review_count = user_progress.review_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get test set progress for a user
CREATE OR REPLACE FUNCTION get_test_set_progress(
  user_uuid UUID,
  test_set_uuid UUID
) RETURNS TABLE (
  flashcard_id UUID,
  english TEXT,
  translation TEXT,
  status progress_status,
  last_reviewed TIMESTAMPTZ,
  review_count INTEGER
) AS $$
BEGIN
  -- First ensure all flashcards have progress records
  PERFORM initialize_user_progress(user_uuid, test_set_uuid);
  
  -- Return the progress data
  RETURN QUERY
  SELECT 
    f.id as flashcard_id,
    f.english,
    f.translation,
    COALESCE(up.status, 'new'::progress_status) as status,
    up.last_reviewed,
    COALESCE(up.review_count, 0) as review_count
  FROM flashcards f
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  WHERE f.test_set_id = test_set_uuid
  ORDER BY f.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for easy progress querying
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT 
  up.user_id,
  up.flashcard_id,
  f.test_set_id,
  ts.name as test_set_name,
  ts.category_id,
  c.name as category_name,
  f.english,
  f.translation,
  up.status,
  up.last_reviewed,
  up.review_count,
  up.created_at,
  up.updated_at
FROM user_progress up
JOIN flashcards f ON f.id = up.flashcard_id
JOIN test_sets ts ON ts.id = f.test_set_id
JOIN categories c ON c.id = ts.category_id;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION initialize_user_progress(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats_detailed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_progress_safe(UUID, UUID, progress_status) TO authenticated;
GRANT EXECUTE ON FUNCTION get_test_set_progress(UUID, UUID) TO authenticated;
GRANT SELECT ON user_progress_summary TO authenticated;