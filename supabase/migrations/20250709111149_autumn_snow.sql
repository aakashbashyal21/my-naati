/*
  # Fix Advertisement Summary Function

  1. Database Functions
    - Fix the `get_advertisement_summary` function to resolve GROUP BY clause error
    - Ensure all non-aggregated columns are properly grouped or use aggregate functions

  2. Changes Made
    - Updated the SQL query to properly aggregate impression and click counts
    - Fixed GROUP BY clause to include all necessary columns
    - Ensured all selected columns are either aggregated or grouped
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_advertisement_summary();

-- Recreate the function with proper aggregation
CREATE OR REPLACE FUNCTION get_advertisement_summary()
RETURNS TABLE (
  total_impressions BIGINT,
  total_clicks BIGINT,
  overall_ctr NUMERIC,
  unique_users_reached BIGINT,
  active_advertisements BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(imp_counts.impression_count), 0) as total_impressions,
    COALESCE(SUM(click_counts.click_count), 0) as total_clicks,
    CASE 
      WHEN COALESCE(SUM(imp_counts.impression_count), 0) > 0 
      THEN ROUND((COALESCE(SUM(click_counts.click_count), 0)::NUMERIC / SUM(imp_counts.impression_count)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as overall_ctr,
    COALESCE(COUNT(DISTINCT imp_counts.user_id), 0) as unique_users_reached,
    (SELECT COUNT(*) FROM advertisements WHERE is_active = true 
     AND (start_date IS NULL OR start_date <= NOW()) 
     AND (end_date IS NULL OR end_date >= NOW()))::BIGINT as active_advertisements
  FROM (
    SELECT 
      advertisement_id,
      user_id,
      COUNT(*) as impression_count
    FROM advertisement_impressions 
    GROUP BY advertisement_id, user_id
  ) imp_counts
  FULL OUTER JOIN (
    SELECT 
      advertisement_id,
      COUNT(*) as click_count
    FROM advertisement_clicks 
    GROUP BY advertisement_id
  ) click_counts ON imp_counts.advertisement_id = click_counts.advertisement_id;
END;
$$;