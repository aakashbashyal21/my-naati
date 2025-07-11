/*
  # Add description column to advertisements table

  1. Changes
    - Add `description` column to `advertisements` table
    - Column is optional (nullable) to maintain compatibility with existing data

  2. Security
    - No changes to existing RLS policies
*/

ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS description TEXT;