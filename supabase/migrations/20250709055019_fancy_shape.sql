/*
  # Fix Resume Position Functionality

  1. New Tables
    - `user_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `test_set_id` (uuid, foreign key to test_sets)
      - `current_position` (integer, current card index)
      - `total_cards` (integer, total cards in set)
      - `is_shuffled` (boolean, shuffle mode state)
      - `is_reversed` (boolean, reverse mode state)
      - `last_active` (timestamptz, last activity time)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_sessions` table
    - Add policy for users to manage own sessions

  3. Functions
    - Drop and recreate `get_resume_position` with new return type
    - Add `update_session_position` for tracking current position
    - Add `cleanup_old_sessions` for maintenance

  4. Indexes
    - Performance indexes for user_sessions queries
*/

-- Create user_sessions table to track current position
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  test_set_id uuid NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
  current_position integer NOT NULL DEFAULT 0,
  total_cards integer NOT NULL DEFAULT 0,
  is_shuffled boolean DEFAULT false,
  is_reversed boolean DEFAULT false,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, test_set_id)
);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Users can manage own sessions"
  ON user_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_test_set ON user_sessions(user_id, test_set_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active);

-- Function to update session position
CREATE OR REPLACE FUNCTION update_session_position(
  user_uuid UUID,
  test_set_uuid UUID,
  current_position INTEGER,
  total_cards INTEGER DEFAULT NULL,
  is_shuffled BOOLEAN DEFAULT NULL,
  is_reversed BOOLEAN DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  card_count INTEGER;
BEGIN
  -- Get total cards if not provided
  IF total_cards IS NULL THEN
    SELECT COUNT(*) INTO card_count
    FROM flashcards f
    WHERE f.test_set_id = test_set_uuid;
  ELSE
    card_count := total_cards;
  END IF;
  
  -- Upsert session data
  INSERT INTO user_sessions (
    user_id,
    test_set_id,
    current_position,
    total_cards,
    is_shuffled,
    is_reversed,
    last_active,
    updated_at
  )
  VALUES (
    user_uuid,
    test_set_uuid,
    current_position,
    card_count,
    COALESCE(is_shuffled, false),
    COALESCE(is_reversed, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, test_set_id)
  DO UPDATE SET
    current_position = EXCLUDED.current_position,
    total_cards = EXCLUDED.total_cards,
    is_shuffled = COALESCE(EXCLUDED.is_shuffled, user_sessions.is_shuffled),
    is_reversed = COALESCE(EXCLUDED.is_reversed, user_sessions.is_reversed),
    last_active = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function if it exists (to avoid return type conflict)
DROP FUNCTION IF EXISTS get_resume_position(UUID, UUID);

-- Enhanced function to get the optimal resume position
CREATE OR REPLACE FUNCTION get_resume_position(
  user_uuid UUID,
  test_set_uuid UUID
) RETURNS TABLE (
  resume_index INTEGER,
  total_cards INTEGER,
  reason TEXT,
  is_shuffled BOOLEAN,
  is_reversed BOOLEAN
) AS $$
DECLARE
  session_pos INTEGER;
  session_time TIMESTAMPTZ;
  session_shuffled BOOLEAN;
  session_reversed BOOLEAN;
  needs_practice_pos INTEGER;
  new_card_pos INTEGER;
  learning_card_pos INTEGER;
  total_count INTEGER;
  recent_threshold TIMESTAMPTZ := NOW() - INTERVAL '2 hours';
BEGIN
  -- Get total card count
  SELECT COUNT(*) INTO total_count
  FROM flashcards f
  WHERE f.test_set_id = test_set_uuid;
  
  -- Check for recent session data
  SELECT 
    us.current_position,
    us.last_active,
    us.is_shuffled,
    us.is_reversed
  INTO session_pos, session_time, session_shuffled, session_reversed
  FROM user_sessions us
  WHERE us.user_id = user_uuid 
    AND us.test_set_id = test_set_uuid
    AND us.last_active > recent_threshold;
  
  -- If recent session exists, resume from that position
  IF session_pos IS NOT NULL AND session_time > recent_threshold THEN
    -- Make sure position is valid
    session_pos := LEAST(session_pos, total_count - 1);
    session_pos := GREATEST(session_pos, 0);
    
    RETURN QUERY SELECT 
      session_pos, 
      total_count, 
      'Resuming from your last position in this session'::TEXT,
      COALESCE(session_shuffled, false),
      COALESCE(session_reversed, false);
    RETURN;
  END IF;
  
  -- No recent session, find optimal starting position based on progress
  
  -- First priority: Find first card that needs practice
  SELECT ROW_NUMBER() OVER (ORDER BY f.created_at) - 1
  INTO needs_practice_pos
  FROM flashcards f
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  WHERE f.test_set_id = test_set_uuid
    AND up.status = 'needs_practice'
  ORDER BY f.created_at
  LIMIT 1;
  
  IF needs_practice_pos IS NOT NULL THEN
    RETURN QUERY SELECT 
      needs_practice_pos, 
      total_count, 
      'Starting from first card needing practice'::TEXT,
      COALESCE(session_shuffled, false),
      COALESCE(session_reversed, false);
    RETURN;
  END IF;
  
  -- Second priority: Find first new/unstudied card
  SELECT ROW_NUMBER() OVER (ORDER BY f.created_at) - 1
  INTO new_card_pos
  FROM flashcards f
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  WHERE f.test_set_id = test_set_uuid
    AND (up.status IS NULL OR up.status = 'new')
  ORDER BY f.created_at
  LIMIT 1;
  
  IF new_card_pos IS NOT NULL THEN
    RETURN QUERY SELECT 
      new_card_pos, 
      total_count, 
      'Starting from first new card'::TEXT,
      COALESCE(session_shuffled, false),
      COALESCE(session_reversed, false);
    RETURN;
  END IF;
  
  -- Third priority: Find first learning card
  SELECT ROW_NUMBER() OVER (ORDER BY f.created_at) - 1
  INTO learning_card_pos
  FROM flashcards f
  LEFT JOIN user_progress up ON up.flashcard_id = f.id AND up.user_id = user_uuid
  WHERE f.test_set_id = test_set_uuid
    AND up.status = 'learning'
  ORDER BY f.created_at
  LIMIT 1;
  
  IF learning_card_pos IS NOT NULL THEN
    RETURN QUERY SELECT 
      learning_card_pos, 
      total_count, 
      'Starting from first learning card'::TEXT,
      COALESCE(session_shuffled, false),
      COALESCE(session_reversed, false);
    RETURN;
  END IF;
  
  -- If all cards are known, start from beginning
  RETURN QUERY SELECT 
    0, 
    total_count, 
    'All cards known - starting from beginning'::TEXT,
    COALESCE(session_shuffled, false),
    COALESCE(session_reversed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old sessions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_sessions() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE last_active < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON user_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_position(UUID, UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_resume_position(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sessions() TO authenticated;