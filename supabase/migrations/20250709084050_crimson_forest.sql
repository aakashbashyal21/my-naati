/*
  # Fix ambiguous column reference in get_advertisement_analytics function

  1. Function Updates
    - Update `get_advertisement_analytics` function to properly qualify column references
    - Add table aliases to disambiguate `start_date` and `end_date` columns
    - Ensure all column references are properly qualified

  2. Changes Made
    - Added table alias `a` for advertisements table
    - Qualified all column references with proper table aliases
    - Fixed ambiguous `start_date` and `end_date` references
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_advertisement_analytics(date, date);

-- Recreate the function with properly qualified column references
CREATE OR REPLACE FUNCTION get_advertisement_analytics(
  start_date_param date DEFAULT NULL,
  end_date_param date DEFAULT NULL
)
RETURNS TABLE (
  advertisement_id uuid,
  title text,
  type advertisement_type,
  placement advertisement_placement,
  total_impressions bigint,
  total_clicks bigint,
  click_through_rate numeric,
  unique_users bigint,
  avg_view_duration numeric,
  revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as advertisement_id,
    a.title,
    a.type,
    a.placement,
    COALESCE(impression_stats.total_impressions, 0) as total_impressions,
    COALESCE(click_stats.total_clicks, 0) as total_clicks,
    CASE 
      WHEN COALESCE(impression_stats.total_impressions, 0) > 0 
      THEN ROUND((COALESCE(click_stats.total_clicks, 0)::numeric / impression_stats.total_impressions::numeric) * 100, 2)
      ELSE 0
    END as click_through_rate,
    COALESCE(impression_stats.unique_users, 0) as unique_users,
    COALESCE(impression_stats.avg_view_duration, 0) as avg_view_duration,
    0::numeric as revenue
  FROM advertisements a
  LEFT JOIN (
    SELECT 
      ai.advertisement_id,
      COUNT(*) as total_impressions,
      COUNT(DISTINCT ai.user_id) as unique_users,
      AVG(ai.view_duration) as avg_view_duration
    FROM advertisement_impressions ai
    WHERE (start_date_param IS NULL OR ai.viewed_at::date >= start_date_param)
      AND (end_date_param IS NULL OR ai.viewed_at::date <= end_date_param)
    GROUP BY ai.advertisement_id
  ) impression_stats ON a.id = impression_stats.advertisement_id
  LEFT JOIN (
    SELECT 
      ac.advertisement_id,
      COUNT(*) as total_clicks
    FROM advertisement_clicks ac
    WHERE (start_date_param IS NULL OR ac.clicked_at::date >= start_date_param)
      AND (end_date_param IS NULL OR ac.clicked_at::date <= end_date_param)
    GROUP BY ac.advertisement_id
  ) click_stats ON a.id = click_stats.advertisement_id
  WHERE a.is_active = true
    AND (start_date_param IS NULL OR a.start_date::date <= COALESCE(end_date_param, CURRENT_DATE))
    AND (end_date_param IS NULL OR a.end_date IS NULL OR a.end_date::date >= COALESCE(start_date_param, '1900-01-01'::date))
  ORDER BY total_impressions DESC, total_clicks DESC;
END;
$$;