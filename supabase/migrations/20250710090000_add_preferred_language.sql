-- Add preferred_language field to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN preferred_language_id uuid REFERENCES languages(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_language ON user_profiles(preferred_language_id);

-- Add function to update user's preferred language
CREATE OR REPLACE FUNCTION update_user_preferred_language(
  user_id uuid,
  language_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles 
  SET preferred_language_id = language_id,
      updated_at = now()
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_preferred_language TO authenticated;

-- Add RLS policy for the function
CREATE POLICY "Users can update own preferred language"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id); 