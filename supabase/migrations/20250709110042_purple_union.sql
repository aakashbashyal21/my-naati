/*
  # Advertisement Analytics Functions

  1. New Functions
    - `get_advertisement_analytics` - Returns comprehensive analytics for advertisements
    - `get_advertisement_summary` - Returns summary metrics for all advertisements
  
  2. Features
    - Handles cases with no data gracefully
    - Calculates click-through rates safely
    - Groups data by time periods
    - Provides device and placement breakdowns
  
  3. Security
    - Functions are security definer and check user permissions
    - Only super_admin users can access detailed analytics
*/

-- Function to get comprehensive advertisement analytics
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
BEGIN
    -- Check if user has permission (super_admin only)
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
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
            AND (start_date IS NULL OR viewed_at >= start_date::timestamp)
            AND (end_date IS NULL OR viewed_at <= (end_date::timestamp + INTERVAL '1 day'))
        ),
        click_data AS (
            SELECT 
                COUNT(*) as total_clicks,
                COUNT(DISTINCT user_id) as unique_clickers,
                COUNT(DISTINCT session_id) as unique_click_sessions
            FROM advertisement_clicks
            WHERE advertisement_id = ad_record.id
            AND (start_date IS NULL OR clicked_at >= start_date::timestamp)
            AND (end_date IS NULL OR clicked_at <= (end_date::timestamp + INTERVAL '1 day'))
        ),
        device_breakdown AS (
            SELECT 
                COALESCE(device_type, 'unknown') as device,
                COUNT(*) as count
            FROM advertisement_impressions
            WHERE advertisement_id = ad_record.id
            AND (start_date IS NULL OR viewed_at >= start_date::timestamp)
            AND (end_date IS NULL OR viewed_at <= (end_date::timestamp + INTERVAL '1 day'))
            GROUP BY device_type
        ),
        daily_impressions AS (
            SELECT 
                DATE(viewed_at) as date,
                COUNT(*) as impressions
            FROM advertisement_impressions
            WHERE advertisement_id = ad_record.id
            AND (start_date IS NULL OR viewed_at >= start_date::timestamp)
            AND (end_date IS NULL OR viewed_at <= (end_date::timestamp + INTERVAL '1 day'))
            GROUP BY DATE(viewed_at)
            ORDER BY date
        ),
        daily_clicks AS (
            SELECT 
                DATE(clicked_at) as date,
                COUNT(*) as clicks
            FROM advertisement_clicks
            WHERE advertisement_id = ad_record.id
            AND (start_date IS NULL OR clicked_at >= start_date::timestamp)
            AND (end_date IS NULL OR clicked_at <= (end_date::timestamp + INTERVAL '1 day'))
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

-- Function to get advertisement summary metrics
CREATE OR REPLACE FUNCTION get_advertisement_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Check if user has permission (super_admin only)
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    SELECT json_build_object(
        'total_advertisements', (SELECT COUNT(*) FROM advertisements),
        'active_advertisements', (SELECT COUNT(*) FROM advertisements WHERE is_active = true),
        'total_impressions', (SELECT COUNT(*) FROM advertisement_impressions),
        'total_clicks', (SELECT COUNT(*) FROM advertisement_clicks),
        'overall_ctr', CASE 
            WHEN (SELECT COUNT(*) FROM advertisement_impressions) > 0 
            THEN ROUND(
                ((SELECT COUNT(*) FROM advertisement_clicks)::decimal / 
                 (SELECT COUNT(*) FROM advertisement_impressions)::decimal) * 100, 
                2
            )
            ELSE 0 
        END,
        'unique_users_reached', (
            SELECT COUNT(DISTINCT user_id) 
            FROM advertisement_impressions 
            WHERE user_id IS NOT NULL
        ),
        'top_performing_ads', (
            SELECT json_agg(
                json_build_object(
                    'id', a.id,
                    'title', a.title,
                    'impressions', COALESCE(imp.count, 0),
                    'clicks', COALESCE(cl.count, 0),
                    'ctr', CASE 
                        WHEN COALESCE(imp.count, 0) > 0 
                        THEN ROUND((COALESCE(cl.count, 0)::decimal / imp.count::decimal) * 100, 2)
                        ELSE 0 
                    END
                )
            )
            FROM advertisements a
            LEFT JOIN (
                SELECT advertisement_id, COUNT(*) as count
                FROM advertisement_impressions
                GROUP BY advertisement_id
            ) imp ON a.id = imp.advertisement_id
            LEFT JOIN (
                SELECT advertisement_id, COUNT(*) as count
                FROM advertisement_clicks
                GROUP BY advertisement_id
            ) cl ON a.id = cl.advertisement_id
            WHERE a.is_active = true
            ORDER BY COALESCE(imp.count, 0) DESC
            LIMIT 5
        ),
        'placement_performance', (
            SELECT json_object_agg(
                placement,
                json_build_object(
                    'impressions', impressions,
                    'clicks', clicks,
                    'ctr', CASE 
                        WHEN impressions > 0 
                        THEN ROUND((clicks::decimal / impressions::decimal) * 100, 2)
                        ELSE 0 
                    END
                )
            )
            FROM (
                SELECT 
                    a.placement,
                    COUNT(DISTINCT ai.id) as impressions,
                    COUNT(DISTINCT ac.id) as clicks
                FROM advertisements a
                LEFT JOIN advertisement_impressions ai ON a.id = ai.advertisement_id
                LEFT JOIN advertisement_clicks ac ON a.id = ac.advertisement_id
                WHERE a.is_active = true
                GROUP BY a.placement
            ) placement_stats
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Create some sample advertisement data if none exists
DO $$
BEGIN
    -- Only create sample data if no advertisements exist
    IF NOT EXISTS (SELECT 1 FROM advertisements LIMIT 1) THEN
        -- Insert sample advertisements
        INSERT INTO advertisements (
            title, 
            description,
            type, 
            placement, 
            content_html, 
            width, 
            height, 
            is_active,
            start_date,
            end_date,
            priority,
            device_compatibility
        ) VALUES 
        (
            'NAATI Preparation Course', 
            'Professional NAATI CCL preparation course',
            'banner', 
            'header', 
            '<div class="text-center p-4 bg-blue-600 text-white"><h3>Master NAATI CCL</h3><p>Professional preparation course - 90% pass rate!</p></div>', 
            728, 
            90, 
            true,
            NOW() - INTERVAL '7 days',
            NOW() + INTERVAL '30 days',
            1,
            ARRAY['desktop', 'mobile', 'tablet']
        ),
        (
            'Study Materials', 
            'Comprehensive NAATI study materials',
            'block', 
            'sidebar_right', 
            '<div class="p-4 border border-gray-200 rounded"><h4>Study Materials</h4><p>Get comprehensive NAATI study guides</p></div>', 
            300, 
            250, 
            true,
            NOW() - INTERVAL '5 days',
            NOW() + INTERVAL '60 days',
            2,
            ARRAY['desktop', 'tablet']
        ),
        (
            'Practice Tests', 
            'Mock NAATI CCL practice tests',
            'banner', 
            'footer', 
            '<div class="text-center p-3 bg-green-600 text-white"><h4>Practice Tests Available</h4><p>Take mock NAATI CCL exams</p></div>', 
            728, 
            60, 
            true,
            NOW() - INTERVAL '3 days',
            NOW() + INTERVAL '45 days',
            3,
            ARRAY['desktop', 'mobile']
        );

        -- Insert some sample impression data
        INSERT INTO advertisement_impressions (
            advertisement_id,
            session_id,
            user_agent,
            page_url,
            placement_position,
            device_type,
            viewed_at,
            view_duration
        )
        SELECT 
            a.id,
            'session_' || generate_random_uuid()::text,
            'Mozilla/5.0 (compatible; Sample/1.0)',
            'https://example.com/dashboard',
            a.placement,
            (ARRAY['desktop', 'mobile', 'tablet'])[floor(random() * 3 + 1)],
            NOW() - (random() * INTERVAL '7 days'),
            floor(random() * 5000 + 1000)::integer
        FROM advertisements a
        CROSS JOIN generate_series(1, 50 + floor(random() * 100)::integer);

        -- Insert some sample click data (roughly 2-5% CTR)
        INSERT INTO advertisement_clicks (
            advertisement_id,
            session_id,
            clicked_at,
            device_type
        )
        SELECT 
            ai.advertisement_id,
            ai.session_id,
            ai.viewed_at + (random() * INTERVAL '30 seconds'),
            ai.device_type
        FROM advertisement_impressions ai
        WHERE random() < 0.03 -- 3% click rate
        LIMIT 20;

    END IF;
END $$;