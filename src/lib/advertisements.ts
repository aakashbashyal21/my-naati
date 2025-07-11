import { supabase } from './supabase';

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  type: 'banner' | 'block' | 'popover';
  placement: 'header' | 'footer' | 'sidebar_left' | 'sidebar_right' | 'content' | 'modal' | 'between_sessions' | 'after_practice' | 'category_list';
  content_html?: string;
  image_url?: string;
  click_url?: string;
  width: number;
  height: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  target_audience: any;
  device_compatibility: string[];
  display_duration: number;
  priority: number;
  max_impressions_per_user: number;
  max_impressions_per_day: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvertisementAnalytics {
  advertisement_id: string;
  advertisement_title: string;
  total_impressions: number;
  total_clicks: number;
  click_through_rate: number;
  unique_users: number;
  avg_view_duration: number;
  impressions_by_day: Record<string, number>;
  clicks_by_day: Record<string, number>;
  device_breakdown: Record<string, number>;
}

// Get active advertisements for a specific placement
export const getActiveAdvertisements = async (
  placement: Advertisement['placement'],
  deviceType: string = 'desktop',
  userId?: string
): Promise<Advertisement[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_active_advertisements', {
    placement_type: placement,
    device_type: deviceType,
    user_uuid: userId || null
  });
  
  if (error) throw error;
  return data || [];
};

// Record advertisement impression
export const recordAdvertisementImpression = async (
  adId: string,
  options: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    pageUrl?: string;
    placementPosition?: string;
    deviceType?: string;
  } = {}
): Promise<string> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('record_advertisement_impression', {
    ad_id: adId,
    user_uuid: options.userId || null,
    session_id: options.sessionId || null,
    ip_addr: options.ipAddress || null,
    user_agent_string: options.userAgent || null,
    page_url: options.pageUrl || null,
    placement_pos: options.placementPosition || null,
    device_type: options.deviceType || 'desktop'
  });
  
  if (error) throw error;
  return data;
};

// Record advertisement click
export const recordAdvertisementClick = async (
  adId: string,
  options: {
    impressionId?: string;
    userId?: string;
    sessionId?: string;
    referrerUrl?: string;
    deviceType?: string;
  } = {}
): Promise<string> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('record_advertisement_click', {
    ad_id: adId,
    impression_uuid: options.impressionId || null,
    user_uuid: options.userId || null,
    session_id: options.sessionId || null,
    referrer_url: options.referrerUrl || null,
    device_type: options.deviceType || 'desktop'
  });
  
  if (error) throw error;
  return data;
};

// Get all advertisements (admin only)
export const getAllAdvertisements = async (): Promise<Advertisement[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('advertisements')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Create advertisement (super admin only)
export const createAdvertisement = async (advertisement: Omit<Advertisement, 'id' | 'created_at' | 'updated_at'>): Promise<Advertisement> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { data, error } = await supabase
    .from('advertisements')
    .insert({
      ...advertisement,
      created_by: user.id
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Update advertisement (super admin only)
export const updateAdvertisement = async (id: string, updates: Partial<Advertisement>): Promise<Advertisement> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('advertisements')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Delete advertisement (super admin only)
export const deleteAdvertisement = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('advertisements')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Get advertisement analytics (super admin only)
export const getAdvertisementAnalytics = async (
  adId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<AdvertisementAnalytics[]> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  try {
    // Convert dates to ISO strings to ensure timestamp with time zone compatibility
    const startDateParam = startDate ? startDate.toISOString() : null;
    const endDateParam = endDate ? endDate.toISOString() : null;
    
    // Use the database function for better performance and accuracy
    const { data, error } = await supabase.rpc('get_advertisement_analytics', {
      ad_id: adId || null,
      start_date: startDateParam,
      end_date: endDateParam
    });
    
    if (error) throw error;
    
    // The function returns JSON, so we need to parse it if it's a string
    const analyticsData = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Ensure we always return an array
    return Array.isArray(analyticsData) ? analyticsData : [];
  } catch (error) {
    console.error('Error in getAdvertisementAnalytics:', error);
    
    // If there's still a function overloading issue, try calling without dates
    if (error instanceof Error && error.message.includes('Could not choose the best candidate function')) {
      console.warn('Function overloading detected, attempting fallback without date parameters');
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_advertisement_analytics', {
          ad_id: adId || null,
          start_date: null,
          end_date: null
        });
        
        if (fallbackError) throw fallbackError;
        
        const analyticsData = typeof fallbackData === 'string' ? JSON.parse(fallbackData) : fallbackData;
        return Array.isArray(analyticsData) ? analyticsData : [];
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
        // Return empty array instead of throwing to prevent app crash
        return [];
      }
    }
    
    // For other errors, return empty array to prevent app crash
    console.error('Advertisement analytics error:', error);
    return [];
  }
};

// Get advertisement summary metrics
export const getAdvertisementSummary = async (): Promise<any> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  try {
    const { data, error } = await supabase.rpc('get_advertisement_summary');
    
    if (error) throw error;
    
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('Error in getAdvertisementSummary:', error);
    // Return empty object instead of throwing to prevent app crash
    return {};
  }
};

// Utility function to detect device type
export const getDeviceType = (): string => {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  
  if (isMobile && !isTablet) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
};

// Utility function to generate session ID
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};