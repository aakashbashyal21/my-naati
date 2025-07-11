/*
  # Advertisement Management System

  1. New Tables
    - `advertisements`
      - `id` (uuid, primary key)
      - `title` (text)
      - `type` (enum: banner, block, popover)
      - `placement` (enum: header, footer, sidebar_left, sidebar_right, content, modal)
      - `content_html` (text)
      - `image_url` (text)
      - `click_url` (text)
      - `width` (integer)
      - `height` (integer)
      - `is_active` (boolean)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `target_audience` (jsonb)
      - `device_compatibility` (text[])
      - `display_duration` (integer, seconds)
      - `priority` (integer)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `advertisement_impressions`
      - `id` (uuid, primary key)
      - `advertisement_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key, nullable)
      - `session_id` (text)
      - `ip_address` (inet)
      - `user_agent` (text)
      - `page_url` (text)
      - `placement_position` (text)
      - `viewed_at` (timestamptz)
      - `view_duration` (integer, milliseconds)
    
    - `advertisement_clicks`
      - `id` (uuid, primary key)
      - `advertisement_id` (uuid, foreign key)
      - `impression_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key, nullable)
      - `clicked_at` (timestamptz)
      - `referrer_url` (text)

  2. Enums
    - `advertisement_type` (banner, block, popover)
    - `advertisement_placement` (header, footer, sidebar_left, sidebar_right, content, modal, between_sessions)

  3. Security
    - Enable RLS on all tables
    - Super admin can manage all advertisements
    - Public can view active advertisements
    - Track impressions and clicks for analytics
*/

-- Create enums
CREATE TYPE advertisement_type AS ENUM ('banner', 'block', 'popover');
CREATE TYPE advertisement_placement AS ENUM (
  'header', 
  'footer', 
  'sidebar_left', 
  'sidebar_right', 
  'content', 
  'modal', 
  'between_sessions',
  'after_practice',
  'category_list'
);

-- Create advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type advertisement_type NOT NULL,
  placement advertisement_placement NOT NULL,
  content_html text,
  image_url text,
  click_url text,
  width integer DEFAULT 300,
  height integer DEFAULT 250,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  target_audience jsonb DEFAULT '{}',
  device_compatibility text[] DEFAULT ARRAY['desktop', 'mobile', 'tablet'],
  display_duration integer DEFAULT 0, -- 0 means no auto-close
  priority integer DEFAULT 1,
  max_impressions_per_user integer DEFAULT 0, -- 0 means unlimited
  max_impressions_per_day integer DEFAULT 0, -- 0 means unlimited
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create advertisement impressions table
CREATE TABLE IF NOT EXISTS advertisement_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  ip_address inet,
  user_agent text,
  page_url text,
  placement_position text,
  device_type text,
  viewed_at timestamptz DEFAULT now(),
  view_duration integer DEFAULT 0 -- in milliseconds
);

-- Create advertisement clicks table
CREATE TABLE IF NOT EXISTS advertisement_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  impression_id uuid REFERENCES advertisement_impressions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  clicked_at timestamptz DEFAULT now(),
  referrer_url text,
  device_type text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisements_placement ON advertisements(placement, is_active);
CREATE INDEX IF NOT EXISTS idx_advertisements_priority ON advertisements(priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impressions_ad_id ON advertisement_impressions(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_impressions_user_id ON advertisement_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_impressions_viewed_at ON advertisement_impressions(viewed_at);
CREATE INDEX IF NOT EXISTS idx_clicks_ad_id ON advertisement_clicks(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON advertisement_clicks(clicked_at);

-- Enable RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advertisements
CREATE POLICY "Super admins can manage all advertisements"
  ON advertisements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Everyone can view active advertisements"
  ON advertisements
  FOR SELECT
  TO authenticated, anon
  USING (
    is_active = true 
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  );

-- RLS Policies for impressions
CREATE POLICY "Anyone can insert impressions"
  ON advertisement_impressions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Super admins can view all impressions"
  ON advertisement_impressions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- RLS Policies for clicks
CREATE POLICY "Anyone can insert clicks"
  ON advertisement_clicks
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Super admins can view all clicks"
  ON advertisement_clicks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Function to get active advertisements for a placement
CREATE OR REPLACE FUNCTION get_active_advertisements(
  placement_type advertisement_placement,
  device_type text DEFAULT 'desktop',
  user_uuid uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  type advertisement_type,
  placement advertisement_placement,
  content_html text,
  image_url text,
  click_url text,
  width integer,
  height integer,
  display_duration integer,
  priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.type,
    a.placement,
    a.content_html,
    a.image_url,
    a.click_url,
    a.width,
    a.height,
    a.display_duration,
    a.priority
  FROM advertisements a
  WHERE a.is_active = true
    AND a.placement = placement_type
    AND (a.start_date IS NULL OR a.start_date <= now())
    AND (a.end_date IS NULL OR a.end_date >= now())
    AND device_type = ANY(a.device_compatibility)
    -- Check daily impression limits
    AND (
      a.max_impressions_per_day = 0 
      OR (
        SELECT COUNT(*) 
        FROM advertisement_impressions ai 
        WHERE ai.advertisement_id = a.id 
        AND ai.viewed_at >= CURRENT_DATE
      ) < a.max_impressions_per_day
    )
    -- Check per-user impression limits
    AND (
      user_uuid IS NULL 
      OR a.max_impressions_per_user = 0 
      OR (
        SELECT COUNT(*) 
        FROM advertisement_impressions ai 
        WHERE ai.advertisement_id = a.id 
        AND ai.user_id = user_uuid
      ) < a.max_impressions_per_user
    )
  ORDER BY a.priority DESC, a.created_at DESC;
END;
$$;

-- Function to record advertisement impression
CREATE OR REPLACE FUNCTION record_advertisement_impression(
  ad_id uuid,
  user_uuid uuid DEFAULT NULL,
  session_id text DEFAULT NULL,
  ip_addr inet DEFAULT NULL,
  user_agent_string text DEFAULT NULL,
  page_url text DEFAULT NULL,
  placement_pos text DEFAULT NULL,
  device_type text DEFAULT 'desktop'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  impression_id uuid;
BEGIN
  INSERT INTO advertisement_impressions (
    advertisement_id,
    user_id,
    session_id,
    ip_address,
    user_agent,
    page_url,
    placement_position,
    device_type
  ) VALUES (
    ad_id,
    user_uuid,
    COALESCE(session_id, gen_random_uuid()::text),
    ip_addr,
    user_agent_string,
    page_url,
    placement_pos,
    device_type
  )
  RETURNING id INTO impression_id;
  
  RETURN impression_id;
END;
$$;

-- Function to record advertisement click
CREATE OR REPLACE FUNCTION record_advertisement_click(
  ad_id uuid,
  impression_uuid uuid DEFAULT NULL,
  user_uuid uuid DEFAULT NULL,
  session_id text DEFAULT NULL,
  referrer_url text DEFAULT NULL,
  device_type text DEFAULT 'desktop'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  click_id uuid;
BEGIN
  INSERT INTO advertisement_clicks (
    advertisement_id,
    impression_id,
    user_id,
    session_id,
    referrer_url,
    device_type
  ) VALUES (
    ad_id,
    impression_uuid,
    user_uuid,
    COALESCE(session_id, gen_random_uuid()::text),
    referrer_url,
    device_type
  )
  RETURNING id INTO click_id;
  
  RETURN click_id;
END;
$$;

-- Function to get advertisement analytics
CREATE OR REPLACE FUNCTION get_advertisement_analytics(
  ad_id uuid DEFAULT NULL,
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  advertisement_id uuid,
  advertisement_title text,
  total_impressions bigint,
  total_clicks bigint,
  click_through_rate numeric,
  unique_users bigint,
  avg_view_duration numeric,
  impressions_by_day jsonb,
  clicks_by_day jsonb,
  device_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  RETURN QUERY
  WITH ad_stats AS (
    SELECT 
      a.id as advertisement_id,
      a.title as advertisement_title,
      COUNT(DISTINCT ai.id) as total_impressions,
      COUNT(DISTINCT ac.id) as total_clicks,
      COUNT(DISTINCT ai.user_id) as unique_users,
      AVG(ai.view_duration) as avg_view_duration
    FROM advertisements a
    LEFT JOIN advertisement_impressions ai ON a.id = ai.advertisement_id
    LEFT JOIN advertisement_clicks ac ON a.id = ac.advertisement_id
    WHERE (ad_id IS NULL OR a.id = ad_id)
      AND (start_date IS NULL OR ai.viewed_at >= start_date)
      AND (end_date IS NULL OR ai.viewed_at <= end_date)
    GROUP BY a.id, a.title
  ),
  daily_impressions AS (
    SELECT 
      ai.advertisement_id,
      jsonb_object_agg(
        DATE(ai.viewed_at)::text,
        COUNT(*)
      ) as impressions_by_day
    FROM advertisement_impressions ai
    WHERE (ad_id IS NULL OR ai.advertisement_id = ad_id)
      AND (start_date IS NULL OR ai.viewed_at >= start_date)
      AND (end_date IS NULL OR ai.viewed_at <= end_date)
    GROUP BY ai.advertisement_id
  ),
  daily_clicks AS (
    SELECT 
      ac.advertisement_id,
      jsonb_object_agg(
        DATE(ac.clicked_at)::text,
        COUNT(*)
      ) as clicks_by_day
    FROM advertisement_clicks ac
    WHERE (ad_id IS NULL OR ac.advertisement_id = ad_id)
      AND (start_date IS NULL OR ac.clicked_at >= start_date)
      AND (end_date IS NULL OR ac.clicked_at <= end_date)
    GROUP BY ac.advertisement_id
  ),
  device_stats AS (
    SELECT 
      ai.advertisement_id,
      jsonb_object_agg(
        ai.device_type,
        COUNT(*)
      ) as device_breakdown
    FROM advertisement_impressions ai
    WHERE (ad_id IS NULL OR ai.advertisement_id = ad_id)
      AND (start_date IS NULL OR ai.viewed_at >= start_date)
      AND (end_date IS NULL OR ai.viewed_at <= end_date)
    GROUP BY ai.advertisement_id
  )
  SELECT 
    ads.advertisement_id,
    ads.advertisement_title,
    ads.total_impressions,
    ads.total_clicks,
    CASE 
      WHEN ads.total_impressions > 0 
      THEN ROUND((ads.total_clicks::numeric / ads.total_impressions::numeric) * 100, 2)
      ELSE 0
    END as click_through_rate,
    ads.unique_users,
    ROUND(ads.avg_view_duration, 2) as avg_view_duration,
    COALESCE(di.impressions_by_day, '{}'::jsonb),
    COALESCE(dc.clicks_by_day, '{}'::jsonb),
    COALESCE(ds.device_breakdown, '{}'::jsonb)
  FROM ad_stats ads
  LEFT JOIN daily_impressions di ON ads.advertisement_id = di.advertisement_id
  LEFT JOIN daily_clicks dc ON ads.advertisement_id = dc.advertisement_id
  LEFT JOIN device_stats ds ON ads.advertisement_id = ds.advertisement_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_advertisements(advertisement_placement, text, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_advertisement_impression(uuid, uuid, text, inet, text, text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_advertisement_click(uuid, uuid, uuid, text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_advertisement_analytics(uuid, timestamptz, timestamptz) TO authenticated;