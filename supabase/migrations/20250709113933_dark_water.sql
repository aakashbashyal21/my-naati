/*
  # Fix get_advertisement_summary function return types

  1. Function Updates
    - Drop and recreate `get_advertisement_summary` function with correct return types
    - Cast numeric aggregations to bigint to match expected return type
    - Ensure all return columns match their declared types

  2. Changes Made
    - Fix return type mismatch for total_impressions (numeric -> bigint)
    - Fix return type mismatch for total_clicks (numeric -> bigint) 
    - Fix return type mismatch for unique_users_reached (numeric -> bigint)
    - Keep overall_ctr as numeric since it represents a percentage

  3. Notes
    - This resolves the "structure of query does not match function result type" error
    - Function now properly casts aggregated values to match declared return types
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_advertisement_summary();

-- Create the corrected function with proper return types
CREATE OR REPLACE FUNCTION get_advertisement_summary()
RETURNS TABLE (
  total_impressions bigint,
  total_clicks bigint,
  overall_ctr numeric,
  unique_users_reached bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN ai.viewed_at >= CURRENT_DATE - INTERVAL '30 days' 
        THEN 1 
        ELSE 0 
      END
    ), 0)::bigint as total_impressions,
    
    COALESCE(SUM(
      CASE 
        WHEN ac.clicked_at >= CURRENT_DATE - INTERVAL '30 days' 
        THEN 1 
        ELSE 0 
      END
    ), 0)::bigint as total_clicks,
    
    CASE 
      WHEN COALESCE(SUM(
        CASE 
          WHEN ai.viewed_at >= CURRENT_DATE - INTERVAL '30 days' 
          THEN 1 
          ELSE 0 
        END
      ), 0) > 0 
      THEN (
        COALESCE(SUM(
          CASE 
            WHEN ac.clicked_at >= CURRENT_DATE - INTERVAL '30 days' 
            THEN 1 
            ELSE 0 
          END
        ), 0)::numeric / 
        COALESCE(SUM(
          CASE 
            WHEN ai.viewed_at >= CURRENT_DATE - INTERVAL '30 days' 
            THEN 1 
            ELSE 0 
          END
        ), 1)::numeric
      ) * 100
      ELSE 0::numeric
    END as overall_ctr,
    
    COALESCE(COUNT(DISTINCT 
      CASE 
        WHEN ai.viewed_at >= CURRENT_DATE - INTERVAL '30 days' AND ai.user_id IS NOT NULL
        THEN ai.user_id 
        ELSE NULL 
      END
    ), 0)::bigint as unique_users_reached
    
  FROM advertisement_impressions ai
  LEFT JOIN advertisement_clicks ac ON ai.advertisement_id = ac.advertisement_id
  INNER JOIN advertisements a ON ai.advertisement_id = a.id
  WHERE a.is_active = true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_advertisement_summary() TO authenticated;