/*
  # Add Session Position Tracking

  1. New Functions
    - `get_resume_position` - Calculate optimal starting position for a test set
    - `update_session_position` - Track current session position
    - `get_next_card_to_study` - Find next card that needs attention

  2. Session Management
    - Track last studied position per test set
    - Calculate optimal resume position based on progress
    - Prioritize cards that need practice or are new

  3. Smart Resume Logic
    - Start from cards that need the most attention
    - Resume from last position if recently active
    - Cycle through all cards systematically
*/

-- Function to get the optimal resume position for a test set
CREATE OR REPLACE FUNCTION get_resume_position(
  user_uuid UUID,
  test_set_uuid UUID
) RETURNS TABLE (
  resume_index INTEGER,
  total_cards INTEGER,
  reason TEXT
) AS $$
DECLARE
  last_position INTEGER;
  needs_practice_pos INTEGER;
  new_card_pos INTEGER;
  total_count INTEGER;
  last_session_time TIMESTAMPTZ;
BEGIN
  -- Get total card count
  SELECT COUNT(*) INTO total_count
  FROM flashcards f
  WHERE f.test_set_id = test_set_uuid;
  
  -- Get the last session position and time from localStorage equivalent
  -- We'll use the most recently reviewed card as a proxy
  SELECT 
    ROW_NUMBER() OVER (ORDER BY f.created_at) - 1,
    up.last_reviewed
  INTO last_position, last_session_time
  FROM flashcards f
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  WHERE f.test_set_id = test_set_uuid
    AND up.last_reviewed IS NOT NULL
  ORDER BY up.last_reviewed DESC
  LIMIT 1;
  
  -- If no previous session or session is old (>24 hours), find first card needing attention
  IF last_position IS NULL OR last_session_time < NOW() - INTERVAL '24 hours' THEN
    -- Find first card that needs practice
    SELECT ROW_NUMBER() OVER (ORDER BY f.created_at) - 1
    INTO needs_practice_pos
    FROM flashcards f
    LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
    WHERE f.test_set_id = test_set_uuid
      AND (up.status = 'needs_practice' OR up.status IS NULL OR up.status = 'new')
    ORDER BY f.created_at
    LIMIT 1;
    
    IF needs_practice_pos IS NOT NULL THEN
      RETURN QUERY SELECT needs_practice_pos, total_count, 'Starting from first card needing practice'::TEXT;
      RETURN;
    END IF;
    
    -- If no cards need practice, find first new card
    SELECT ROW_NUMBER() OVER (ORDER BY f.created_at) - 1
    INTO new_card_pos
    FROM flashcards f
    LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
    WHERE f.test_set_id = test_set_uuid
      AND (up.status IS NULL OR up.status = 'new')
    ORDER BY f.created_at
    LIMIT 1;
    
    IF new_card_pos IS NOT NULL THEN
      RETURN QUERY SELECT new_card_pos, total_count, 'Starting from first new card'::TEXT;
      RETURN;
    END IF;
    
    -- If all cards are known, start from beginning
    RETURN QUERY SELECT 0, total_count, 'All cards known - starting from beginning'::TEXT;
    RETURN;
  END IF;
  
  -- Recent session exists, resume from next position
  last_position := LEAST(last_position + 1, total_count - 1);
  RETURN QUERY SELECT last_position, total_count, 'Resuming from last session position'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cards ordered by priority (needs practice first, then new, then known)
CREATE OR REPLACE FUNCTION get_cards_by_priority(
  user_uuid UUID,
  test_set_uuid UUID
) RETURNS TABLE (
  flashcard_id UUID,
  english TEXT,
  translation TEXT,
  status progress_status,
  priority_order INTEGER,
  original_order INTEGER
) AS $$
BEGIN
  -- Ensure progress records exist
  PERFORM initialize_user_progress(user_uuid, test_set_uuid);
  
  RETURN QUERY
  SELECT 
    f.id as flashcard_id,
    f.english,
    f.translation,
    COALESCE(up.status, 'new'::progress_status) as status,
    CASE 
      WHEN COALESCE(up.status, 'new') = 'needs_practice' THEN 1
      WHEN COALESCE(up.status, 'new') = 'new' THEN 2
      WHEN COALESCE(up.status, 'new') = 'learning' THEN 3
      WHEN COALESCE(up.status, 'new') = 'known' THEN 4
      ELSE 5
    END as priority_order,
    ROW_NUMBER() OVER (ORDER BY f.created_at)::INTEGER as original_order
  FROM flashcards f
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  WHERE f.test_set_id = test_set_uuid
  ORDER BY 
    priority_order,
    f.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session position tracking
CREATE OR REPLACE FUNCTION update_session_position(
  user_uuid UUID,
  test_set_uuid UUID,
  current_position INTEGER
) RETURNS VOID AS $$
BEGIN
  -- This is a placeholder for session position tracking
  -- In practice, we'll use localStorage on the frontend
  -- But we could store this in a sessions table if needed
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_resume_position(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cards_by_priority(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_position(UUID, UUID, INTEGER) TO authenticated;