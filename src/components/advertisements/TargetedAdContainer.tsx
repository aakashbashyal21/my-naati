import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { 
  Advertisement, 
  recordAdvertisementImpression, 
  recordAdvertisementClick,
  generateSessionId
} from '../../lib/advertisements';
import { 
  getTargetedAdvertisements,
  trackPageVisit,
  initializeSessionTracking
} from '../../lib/adTargeting';
import { 
  AdComplianceManager,
  ViewabilityTracker,
  addAdDisclosure
} from '../../lib/adCompliance';
import { useAuth } from '../../hooks/useAuth';

interface TargetedAdContainerProps {
  placement: Advertisement['placement'];
  className?: string;
  maxAds?: number;
  fallbackContent?: React.ReactNode;
}

const TargetedAdContainer: React.FC<TargetedAdContainerProps> = ({ 
  placement, 
  className = '', 
  maxAds = 1,
  fallbackContent
}) => {
  const { user } = useAuth();
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId] = useState(() => generateSessionId());
  const [closedAds, setClosedAds] = useState<Set<string>>(new Set());
  const [viewabilityTracker] = useState(() => new ViewabilityTracker());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize session tracking and page visit tracking
    initializeSessionTracking();
    trackPageVisit(window.location.pathname);

    const loadTargetedAds = async () => {
      try {
        setLoading(true);
        
        // Get compliance manager
        const compliance = AdComplianceManager.getInstance();
        
        // Get targeted advertisements
        const ads = await getTargetedAdvertisements(placement, user?.id, maxAds);
        
        // Filter ads based on consent
        const compliantAds = ads.filter(ad => compliance.canShowAd(ad));
        
        setAdvertisements(compliantAds);
        
        // Record impressions for loaded ads
        compliantAds.forEach(async (ad) => {
          try {
            await recordAdvertisementImpression(ad.id, {
              userId: user?.id,
              sessionId,
              userAgent: navigator.userAgent,
              pageUrl: window.location.href,
              placementPosition: placement,
              deviceType: getDeviceType()
            });
          } catch (error) {
            console.error('Error recording impression:', error);
          }
        });
      } catch (error) {
        console.error('Error loading targeted advertisements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTargetedAds();

    // Set up viewability tracking
    const handleAdViewable = (event: CustomEvent) => {
      console.log('Ad viewable:', event.detail);
      // Could send additional analytics here
    };

    document.addEventListener('adViewable', handleAdViewable as EventListener);

    return () => {
      document.removeEventListener('adViewable', handleAdViewable as EventListener);
      viewabilityTracker.disconnect();
    };
  }, [placement, user?.id, maxAds, sessionId, viewabilityTracker]);

  const handleAdClick = async (ad: Advertisement) => {
    try {
      await recordAdvertisementClick(ad.id, {
        userId: user?.id,
        sessionId,
        referrerUrl: window.location.href,
        deviceType: getDeviceType()
      });
      
      if (ad.click_url) {
        window.open(ad.click_url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error recording click:', error);
    }
  };

  const handleCloseAd = (adId: string) => {
    setClosedAds(prev => new Set([...prev, adId]));
  };

  const getDeviceType = (): string => {
    if (typeof window === 'undefined') return 'desktop';
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    
    if (isMobile && !isTablet) return 'mobile';
    if (isTablet) return 'tablet';
    return 'desktop';
  };

  if (loading) {
    return (
      <div className={`advertisement-loading ${className}`}>
        <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>
      </div>
    );
  }

  const visibleAds = advertisements.filter(ad => !closedAds.has(ad.id));

  if (visibleAds.length === 0) {
    return fallbackContent ? (
      <div className={`advertisement-fallback ${className}`}>
        {fallbackContent}
      </div>
    ) : null;
  }

  return (
    <div ref={containerRef} className={`targeted-advertisement-container ${className}`}>
      {visibleAds.map((ad) => (
        <ResponsiveAdComponent
          key={ad.id}
          advertisement={ad}
          onClose={() => handleCloseAd(ad.id)}
          onClick={() => handleAdClick(ad)}
          viewabilityTracker={viewabilityTracker}
        />
      ))}
    </div>
  );
};

interface ResponsiveAdComponentProps {
  advertisement: Advertisement;
  onClose: () => void;
  onClick: () => void;
  viewabilityTracker: ViewabilityTracker;
}

const ResponsiveAdComponent: React.FC<ResponsiveAdComponentProps> = ({ 
  advertisement, 
  onClose, 
  onClick,
  viewabilityTracker
}) => {
  const [timeLeft, setTimeLeft] = useState(advertisement.display_duration);
  const [isVisible, setIsVisible] = useState(true);
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up auto-close timer
    if (advertisement.display_duration > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsVisible(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [advertisement.display_duration]);

  useEffect(() => {
    // Set up viewability tracking
    const adElement = adRef.current;
    if (adElement) {
      adElement.dataset.adId = advertisement.id;
      viewabilityTracker.observe(adElement);
      
      // Add compliance disclosures
      addAdDisclosure(adElement, advertisement);

      return () => {
        viewabilityTracker.unobserve(adElement);
      };
    }
  }, [advertisement.id, viewabilityTracker]);

  if (!isVisible) {
    return null;
  }

  const getResponsiveStyles = () => {
    const baseStyles: React.CSSProperties = {
      width: '100%',
      maxWidth: advertisement.width,
      height: 'auto',
      aspectRatio: `${advertisement.width} / ${advertisement.height}`,
    };

    // Responsive adjustments based on placement
    switch (advertisement.placement) {
      case 'header':
      case 'footer':
        return {
          ...baseStyles,
          width: '100%',
          maxHeight: '120px',
        };
      case 'sidebar_left':
      case 'sidebar_right':
        return {
          ...baseStyles,
          width: '100%',
          maxWidth: '300px',
        };
      case 'modal':
      case 'popover':
        return {
          ...baseStyles,
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          maxWidth: '90vw',
          maxHeight: '90vh',
        };
      default:
        return baseStyles;
    }
  };

  const containerClasses = `
    responsive-advertisement relative rounded-lg overflow-hidden border border-gray-200
    ${advertisement.type === 'popover' ? 'shadow-2xl bg-white' : 'shadow-sm'}
    ${advertisement.click_url ? 'cursor-pointer hover:shadow-md transition-all duration-200' : ''}
    ${advertisement.placement === 'between_sessions' ? 'animate-fade-in' : ''}
  `;

  return (
    <>
      {/* Backdrop for modal/popover ads */}
      {(advertisement.type === 'popover' || advertisement.placement === 'modal') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-999" />
      )}
      
      <div 
        ref={adRef}
        className={containerClasses}
        style={getResponsiveStyles()}
        onClick={advertisement.click_url ? onClick : undefined}
        role={advertisement.click_url ? 'button' : 'img'}
        aria-label={`Advertisement: ${advertisement.title}`}
      >
        {/* Close button */}
        {(advertisement.type === 'popover' || advertisement.display_duration > 0 || 
          advertisement.placement === 'modal' || advertisement.placement === 'between_sessions') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-2 right-2 z-10 w-8 h-8 bg-gray-900 bg-opacity-70 text-white rounded-full flex items-center justify-center hover:bg-opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close advertisement"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Timer display */}
        {advertisement.display_duration > 0 && timeLeft > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-gray-900 bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {timeLeft}s
          </div>
        )}

        {/* Ad content */}
        <div className="w-full h-full relative">
          {advertisement.image_url ? (
            <img
              src={advertisement.image_url}
              alt={advertisement.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Fallback to HTML content if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : advertisement.content_html ? (
            <div 
              className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50"
              dangerouslySetInnerHTML={{ __html: advertisement.content_html }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">
                  {advertisement.title}
                </h3>
                {advertisement.click_url && (
                  <div className="flex items-center justify-center space-x-1 text-blue-600 text-xs md:text-sm">
                    <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
                    <span>Learn More</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Click overlay for better UX */}
          {advertisement.click_url && (
            <div className="absolute inset-0 bg-transparent hover:bg-blue-500 hover:bg-opacity-10 transition-all" />
          )}
        </div>

        {/* Compliance disclosures */}
        <div className="absolute bottom-1 right-1 bg-gray-700 text-white text-xs px-1 py-0.5 rounded opacity-80">
          Ad
        </div>
        
        {advertisement.click_url && (
          <div className="absolute bottom-1 left-1 text-xs text-gray-600 opacity-70">
            Sponsored
          </div>
        )}
      </div>
    </>
  );
};

export default TargetedAdContainer;