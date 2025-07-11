import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { 
  Advertisement, 
  getActiveAdvertisements, 
  recordAdvertisementImpression, 
  recordAdvertisementClick,
  getDeviceType,
  generateSessionId
} from '../../lib/advertisements';
import { useAuth } from '../../hooks/useAuth';

interface AdContainerProps {
  placement: Advertisement['placement'];
  className?: string;
  maxAds?: number;
}

const AdContainer: React.FC<AdContainerProps> = ({ 
  placement, 
  className = '', 
  maxAds = 1 
}) => {
  const { user } = useAuth();
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId] = useState(() => generateSessionId());
  const [deviceType] = useState(() => getDeviceType());
  const [closedAds, setClosedAds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadAdvertisements = async () => {
      try {
        setLoading(true);
        const ads = await getActiveAdvertisements(placement, deviceType, user?.id);
        setAdvertisements(ads.slice(0, maxAds));
        
        // Record impressions for loaded ads
        ads.slice(0, maxAds).forEach(async (ad) => {
          try {
            await recordAdvertisementImpression(ad.id, {
              userId: user?.id,
              sessionId,
              userAgent: navigator.userAgent,
              pageUrl: window.location.href,
              placementPosition: placement,
              deviceType
            });
          } catch (error) {
            console.error('Error recording impression:', error);
          }
        });
      } catch (error) {
        console.error('Error loading advertisements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdvertisements();
  }, [placement, deviceType, user?.id, maxAds, sessionId]);

  const handleAdClick = async (ad: Advertisement) => {
    try {
      await recordAdvertisementClick(ad.id, {
        userId: user?.id,
        sessionId,
        referrerUrl: window.location.href,
        deviceType
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

  if (loading || advertisements.length === 0) {
    return null;
  }

  const visibleAds = advertisements.filter(ad => !closedAds.has(ad.id));

  if (visibleAds.length === 0) {
    return null;
  }

  return (
    <div className={`advertisement-container ${className}`}>
      {visibleAds.map((ad) => (
        <AdComponent
          key={ad.id}
          advertisement={ad}
          onClose={() => handleCloseAd(ad.id)}
          onClick={() => handleAdClick(ad)}
        />
      ))}
    </div>
  );
};

interface AdComponentProps {
  advertisement: Advertisement;
  onClose: () => void;
  onClick: () => void;
}

const AdComponent: React.FC<AdComponentProps> = ({ advertisement, onClose, onClick }) => {
  const [timeLeft, setTimeLeft] = useState(advertisement.display_duration);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
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

  if (!isVisible) {
    return null;
  }

  const getAdStyles = () => {
    const baseStyles = {
      width: advertisement.width,
      height: advertisement.height,
    };

    switch (advertisement.type) {
      case 'banner':
        return {
          ...baseStyles,
          display: 'block',
          margin: '0 auto',
        };
      case 'block':
        return {
          ...baseStyles,
          display: 'block',
        };
      case 'popover':
        return {
          ...baseStyles,
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        };
      default:
        return baseStyles;
    }
  };

  const containerClasses = `
    advertisement-item relative border border-gray-200 rounded-lg overflow-hidden
    ${advertisement.type === 'popover' ? 'shadow-2xl' : 'shadow-sm'}
    ${advertisement.click_url ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
  `;

  return (
    <>
      {advertisement.type === 'popover' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-999" />
      )}
      
      <div 
        className={containerClasses}
        style={getAdStyles()}
        onClick={advertisement.click_url ? onClick : undefined}
      >
        {/* Close button for popover ads or ads with duration */}
        {(advertisement.type === 'popover' || advertisement.display_duration > 0) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-2 right-2 z-10 w-6 h-6 bg-gray-800 bg-opacity-70 text-white rounded-full flex items-center justify-center hover:bg-opacity-90 transition-all"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Timer display for timed ads */}
        {advertisement.display_duration > 0 && timeLeft > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded">
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
            />
          ) : advertisement.content_html ? (
            <div 
              className="w-full h-full flex items-center justify-center p-4"
              dangerouslySetInnerHTML={{ __html: advertisement.content_html }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 bg-gray-100">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">{advertisement.title}</h3>
                {advertisement.click_url && (
                  <div className="flex items-center justify-center space-x-1 text-blue-600 text-sm">
                    <ExternalLink className="h-3 w-3" />
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

        {/* Ad label for transparency */}
        <div className="absolute bottom-0 right-0 bg-gray-600 text-white text-xs px-1 py-0.5 opacity-70">
          Ad
        </div>
      </div>
    </>
  );
};

export default AdContainer;