import { supabase } from './supabase';
import { Advertisement } from './advertisements';

export interface UserDemographics {
  age?: number;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  interests?: string[];
  language?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browserLanguage?: string;
}

export interface BrowsingBehavior {
  visitedPages: string[];
  studyCategories: string[];
  sessionDuration: number;
  practiceFrequency: number;
  lastActiveTime: Date;
  preferredStudyTime?: string;
}

export interface AdTargetingCriteria {
  demographics?: {
    ageRange?: { min: number; max: number };
    locations?: string[];
    interests?: string[];
    languages?: string[];
  };
  behavior?: {
    studyCategories?: string[];
    minSessionDuration?: number;
    activityLevel?: 'low' | 'medium' | 'high';
  };
  schedule?: {
    timeOfDay?: { start: string; end: string };
    daysOfWeek?: number[];
    timezone?: string;
  };
  device?: {
    types?: string[];
    screenSizes?: string[];
  };
}

export interface AdFrequencyCap {
  maxImpressionsPerUser: number;
  maxImpressionsPerDay: number;
  maxImpressionsPerHour?: number;
  cooldownPeriod?: number; // minutes
}

export interface AdViewabilityMetrics {
  viewportPercentage: number;
  viewDuration: number;
  isVisible: boolean;
  scrollDepth: number;
}

// Get user demographics from various sources
export const getUserDemographics = async (userId?: string): Promise<UserDemographics> => {
  const demographics: UserDemographics = {
    deviceType: getDeviceType(),
    browserLanguage: navigator.language,
  };

  // Get timezone
  try {
    demographics.location = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  } catch (error) {
    console.warn('Could not detect timezone:', error);
  }

  // Get user preferences from database if logged in
  if (userId && supabase) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile?.preferences) {
        demographics.language = profile.preferences.language;
        demographics.interests = profile.preferences.interests;
      }
    } catch (error) {
      console.warn('Could not fetch user preferences:', error);
    }
  }

  return demographics;
};

// Get user browsing behavior
export const getUserBehavior = async (userId?: string): Promise<BrowsingBehavior> => {
  const behavior: BrowsingBehavior = {
    visitedPages: getVisitedPages(),
    studyCategories: [],
    sessionDuration: getSessionDuration(),
    practiceFrequency: 0,
    lastActiveTime: new Date(),
  };

  if (userId && supabase) {
    try {
      // Get study categories from user progress
      const { data: progress } = await supabase
        .from('user_progress_summary')
        .select('category_name')
        .eq('user_id', userId);

      if (progress) {
        behavior.studyCategories = [...new Set(progress.map(p => p.category_name))];
      }

      // Get practice frequency from daily stats
      const { data: stats } = await supabase
        .from('daily_stats')
        .select('sessions_completed')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });

      if (stats) {
        behavior.practiceFrequency = stats.reduce((sum, s) => sum + s.sessions_completed, 0);
      }
    } catch (error) {
      console.warn('Could not fetch user behavior:', error);
    }
  }

  return behavior;
};

// Check if advertisement matches targeting criteria
export const matchesTargetingCriteria = (
  ad: Advertisement,
  demographics: UserDemographics,
  behavior: BrowsingBehavior
): boolean => {
  const criteria = ad.target_audience as AdTargetingCriteria;
  
  if (!criteria) return true; // No targeting criteria means show to everyone

  // Check demographic targeting
  if (criteria.demographics) {
    // Age targeting
    if (criteria.demographics.ageRange && demographics.age) {
      const { min, max } = criteria.demographics.ageRange;
      if (demographics.age < min || demographics.age > max) {
        return false;
      }
    }

    // Location targeting
    if (criteria.demographics.locations && demographics.location) {
      const userLocation = `${demographics.location.country || ''}-${demographics.location.region || ''}`.toLowerCase();
      const targetLocations = criteria.demographics.locations.map(l => l.toLowerCase());
      if (!targetLocations.some(loc => userLocation.includes(loc))) {
        return false;
      }
    }

    // Interest targeting
    if (criteria.demographics.interests && demographics.interests) {
      const hasMatchingInterest = criteria.demographics.interests.some(interest =>
        demographics.interests!.includes(interest)
      );
      if (!hasMatchingInterest) {
        return false;
      }
    }

    // Language targeting
    if (criteria.demographics.languages) {
      const userLang = demographics.language || demographics.browserLanguage || 'en';
      if (!criteria.demographics.languages.includes(userLang)) {
        return false;
      }
    }
  }

  // Check behavioral targeting
  if (criteria.behavior) {
    // Study category targeting
    if (criteria.behavior.studyCategories) {
      const hasMatchingCategory = criteria.behavior.studyCategories.some(category =>
        behavior.studyCategories.includes(category)
      );
      if (!hasMatchingCategory) {
        return false;
      }
    }

    // Session duration targeting
    if (criteria.behavior.minSessionDuration) {
      if (behavior.sessionDuration < criteria.behavior.minSessionDuration) {
        return false;
      }
    }

    // Activity level targeting
    if (criteria.behavior.activityLevel) {
      const activityLevel = getActivityLevel(behavior.practiceFrequency);
      if (activityLevel !== criteria.behavior.activityLevel) {
        return false;
      }
    }
  }

  // Check schedule targeting
  if (criteria.schedule) {
    const now = new Date();
    
    // Time of day targeting
    if (criteria.schedule.timeOfDay) {
      const currentTime = now.toTimeString().slice(0, 5);
      const { start, end } = criteria.schedule.timeOfDay;
      if (currentTime < start || currentTime > end) {
        return false;
      }
    }

    // Day of week targeting
    if (criteria.schedule.daysOfWeek) {
      const currentDay = now.getDay();
      if (!criteria.schedule.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }
  }

  // Check device targeting
  if (criteria.device) {
    if (criteria.device.types && demographics.deviceType) {
      if (!criteria.device.types.includes(demographics.deviceType)) {
        return false;
      }
    }
  }

  return true;
};

// Check frequency caps
export const checkFrequencyCaps = async (
  adId: string,
  userId?: string
): Promise<boolean> => {
  if (!supabase) return true;

  try {
    const { data: ad } = await supabase
      .from('advertisements')
      .select('max_impressions_per_user, max_impressions_per_day')
      .eq('id', adId)
      .single();

    if (!ad) return false;

    // Check per-user impression limit
    if (ad.max_impressions_per_user > 0 && userId) {
      const { count: userImpressions } = await supabase
        .from('advertisement_impressions')
        .select('*', { count: 'exact' })
        .eq('advertisement_id', adId)
        .eq('user_id', userId);

      if (userImpressions && userImpressions >= ad.max_impressions_per_user) {
        return false;
      }
    }

    // Check daily impression limit
    if (ad.max_impressions_per_day > 0) {
      const today = new Date().toISOString().split('T')[0];
      const { count: dailyImpressions } = await supabase
        .from('advertisement_impressions')
        .select('*', { count: 'exact' })
        .eq('advertisement_id', adId)
        .gte('viewed_at', `${today}T00:00:00.000Z`)
        .lt('viewed_at', `${today}T23:59:59.999Z`);

      if (dailyImpressions && dailyImpressions >= ad.max_impressions_per_day) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking frequency caps:', error);
    return false;
  }
};

// Get targeted advertisements
export const getTargetedAdvertisements = async (
  placement: Advertisement['placement'],
  userId?: string,
  maxAds: number = 3
): Promise<Advertisement[]> => {
  try {
    // Get user demographics and behavior
    const [demographics, behavior] = await Promise.all([
      getUserDemographics(userId),
      getUserBehavior(userId)
    ]);

    // Get all active ads for this placement
    const { data: ads, error } = await supabase
      ?.from('advertisements')
      .select('*')
      .eq('placement', placement)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .contains('device_compatibility', [demographics.deviceType])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !ads) {
      console.error('Error fetching ads:', error);
      return [];
    }

    // Filter ads based on targeting criteria and frequency caps
    const targetedAds: Advertisement[] = [];
    
    for (const ad of ads) {
      if (targetedAds.length >= maxAds) break;

      // Check targeting criteria
      if (!matchesTargetingCriteria(ad, demographics, behavior)) {
        continue;
      }

      // Check frequency caps
      if (!(await checkFrequencyCaps(ad.id, userId))) {
        continue;
      }

      targetedAds.push(ad);
    }

    return targetedAds;
  } catch (error) {
    console.error('Error getting targeted advertisements:', error);
    return [];
  }
};

// Utility functions
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  
  if (isMobile && !isTablet) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
};

const getVisitedPages = (): string[] => {
  try {
    const visited = localStorage.getItem('visitedPages');
    return visited ? JSON.parse(visited) : [];
  } catch {
    return [];
  }
};

const getSessionDuration = (): number => {
  try {
    const sessionStart = sessionStorage.getItem('sessionStart');
    if (sessionStart) {
      return Date.now() - parseInt(sessionStart);
    }
  } catch {
    // Fallback
  }
  return 0;
};

const getActivityLevel = (practiceFrequency: number): 'low' | 'medium' | 'high' => {
  if (practiceFrequency >= 10) return 'high';
  if (practiceFrequency >= 5) return 'medium';
  return 'low';
};

// Track page visit for behavioral targeting
export const trackPageVisit = (page: string) => {
  try {
    const visited = getVisitedPages();
    const updated = [...new Set([...visited, page])].slice(-50); // Keep last 50 pages
    localStorage.setItem('visitedPages', JSON.stringify(updated));
  } catch (error) {
    console.warn('Could not track page visit:', error);
  }
};

// Initialize session tracking
export const initializeSessionTracking = () => {
  try {
    if (!sessionStorage.getItem('sessionStart')) {
      sessionStorage.setItem('sessionStart', Date.now().toString());
    }
  } catch (error) {
    console.warn('Could not initialize session tracking:', error);
  }
};