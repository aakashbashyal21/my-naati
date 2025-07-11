/*
  # Fix advertisement analytics function overloading

  1. Changes
     - Drop both versions of the overloaded get_advertisement_analytics function
     - Create a single version that handles both text and timestamp parameters
     - Ensure proper type handling for date parameters

  2. Security
     - Maintain security definer setting
     - Keep super_admin role check
*/

-- Drop both versions of the overloaded function
DROP FUNCTION IF EXISTS get_advertisement_analytics(uuid, text, text);
DROP FUNCTION IF EXISTS get_advertisement_analytics(uuid, timestamp with time zone, timestamp with time zone);

-- Create a single version that handles both text and timestamp parameters
CREATE OR REPLACE FUNCTION get_advertisement_analytics(
  ad_id uuid DEFAULT NULL,
  start_date text DEFAULT NULL,
  end_date text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    ads_to_analyze uuid[];
    ad_record record;
    analytics_data json[] := '{}';
    start_timestamp timestamp with time zone;
    end_timestamp timestamp with time zone;
BEGIN
    -- Check if user has permission (super_admin only)
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    -- Convert text dates to timestamp if provided
    IF start_date IS NOT NULL THEN
        BEGIN
            start_timestamp := start_date::timestamp with time zone;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid start_date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)';
        END;
    END IF;

    IF end_date IS NOT NULL THEN
        BEGIN
            -- Add one day to end_date to make it inclusive
            end_timestamp := (end_date::timestamp with time zone) + INTERVAL '1 day';
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid end_date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)';
        END;
    END IF;

    -- Determine which advertisements to analyze
    IF ad_id IS NOT NULL THEN
        ads_to_analyze := ARRAY[ad_id];
    ELSE
        SELECT array_agg(id) INTO ads_to_analyze
        FROM advertisements
        WHERE is_active = true;
    END IF;

    -- If no ads found, return empty array
    IF ads_to_analyze IS NULL OR array_length(ads_to_analyze, 1) = 0 THEN
        RETURN '[]'::json;
    END IF;

    -- Process each advertisement
    FOR ad_record IN 
        SELECT id, title, placement, type, created_at
        FROM advertisements 
        WHERE id = ANY(ads_to_analyze)
        ORDER BY created_at DESC
    LOOP
        -- Calculate analytics for this ad
        WITH impression_data AS (
            SELECT 
                COUNT(*) as total_impressions,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT session_id) as unique_sessions,
                COALESCE(AVG(view_duration), 0) as avg_view_duration,
                COUNT(DISTINCT DATE(viewed_at)) as active_days
            FROM advertisement_impressions
            WHERE advertisement_id = ad_record.id
            AND (start_timestamp IS NULL OR viewed_at >= start_timestamp)
            AND (end_timestamp IS NULL OR viewed_at <= end_timestamp)
        ),
        click_data AS (
            SELECT 
                COUNT(*) as total_clicks,
                COUNT(DISTINCT user_id) as unique_clickers,
                COUNT(DISTINCT session_id) as unique_click_sessions
            FROM advertisement_clicks
            WHERE advertisement_id = ad_record.id
            AND (start_timestamp IS NULL OR clicked_at >= start_timestamp)
            AND (end_timestamp IS NULL OR clicked_at <= end_timestamp)
        ),
        device_breakdown AS (
            SELECT 
                COALESCE(device_type, 'unknown') as device,
                COUNT(*) as count
            FROM advertisement_impressions
            WHERE advertisement_id = ad_record.id
            AND (start_timestamp IS NULL OR viewed_at >= start_timestamp)
            AND (end_timestamp IS NULL OR viewed_at <= end_timestamp)
            GROUP BY device_type
        ),
        daily_impressions AS (
            SELECT 
                DATE(viewed_at) as date,
                COUNT(*) as impressions
            FROM advertisement_impressions
            WHERE advertisement_id = ad_record.id
            AND (start_timestamp IS NULL OR viewed_at >= start_timestamp)
            AND (end_timestamp IS NULL OR viewed_at <= end_timestamp)
            GROUP BY DATE(viewed_at)
            ORDER BY date
        ),
        daily_clicks AS (
            SELECT 
                DATE(clicked_at) as date,
                COUNT(*) as clicks
            FROM advertisement_clicks
            WHERE advertisement_id = ad_record.id
            AND (start_timestamp IS NULL OR clicked_at >= start_timestamp)
            AND (end_timestamp IS NULL OR clicked_at <= end_timestamp)
            GROUP BY DATE(clicked_at)
            ORDER BY date
        )
        SELECT json_build_object(
            'advertisement_id', ad_record.id,
            'advertisement_title', ad_record.title,
            'advertisement_placement', ad_record.placement,
            'advertisement_type', ad_record.type,
            'total_impressions', COALESCE(i.total_impressions, 0),
            'total_clicks', COALESCE(c.total_clicks, 0),
            'click_through_rate', CASE 
                WHEN COALESCE(i.total_impressions, 0) > 0 
                THEN ROUND((COALESCE(c.total_clicks, 0)::decimal / i.total_impressions::decimal) * 100, 2)
                ELSE 0 
            END,
            'unique_users', COALESCE(i.unique_users, 0),
            'unique_clickers', COALESCE(c.unique_clickers, 0),
            'avg_view_duration', ROUND(COALESCE(i.avg_view_duration, 0)::decimal, 0),
            'active_days', COALESCE(i.active_days, 0),
            'device_breakdown', COALESCE(
                (SELECT json_object_agg(device, count) FROM device_breakdown),
                '{}'::json
            ),
            'impressions_by_day', COALESCE(
                (SELECT json_object_agg(date, impressions) FROM daily_impressions),
                '{}'::json
            ),
            'clicks_by_day', COALESCE(
                (SELECT json_object_agg(date, clicks) FROM daily_clicks),
                '{}'::json
            )
        ) INTO result
        FROM impression_data i
        CROSS JOIN click_data c;

        -- Add to analytics array
        analytics_data := analytics_data || result;
    END LOOP;

    -- Return the analytics array
    RETURN array_to_json(analytics_data);
END;
$$;