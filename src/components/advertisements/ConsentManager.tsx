import React, { useState, useEffect } from 'react';
import { Shield, Settings, Check, X, Info, ExternalLink } from 'lucide-react';
import { AdComplianceManager, ConsentData } from '../../lib/adCompliance';

interface ConsentManagerProps {
  onConsentChange?: (consent: ConsentData) => void;
}

const ConsentManager: React.FC<ConsentManagerProps> = ({ onConsentChange }) => {
  const [compliance] = useState(() => AdComplianceManager.getInstance());
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [consent, setConsent] = useState<ConsentData | null>(null);

  useEffect(() => {
    const privacySettings = compliance.getPrivacySettings();
    
    // Show banner if consent is required and not given
    if (compliance.isConsentRequired() && !compliance.hasMarketingConsent()) {
      setShowBanner(true);
    }

    // Load existing consent
    try {
      const stored = localStorage.getItem('adConsent');
      if (stored) {
        const parsed = JSON.parse(stored);
        setConsent({
          ...parsed,
          timestamp: new Date(parsed.timestamp)
        });
      }
    } catch (error) {
      console.warn('Could not load consent data:', error);
    }
  }, [compliance]);

  const handleConsentSave = (consentData: Omit<ConsentData, 'timestamp' | 'version'>) => {
    compliance.saveConsent(consentData);
    
    const newConsent: ConsentData = {
      ...consentData,
      timestamp: new Date(),
      version: '1.0'
    };
    
    setConsent(newConsent);
    setShowBanner(false);
    setShowModal(false);
    
    if (onConsentChange) {
      onConsentChange(newConsent);
    }
  };

  const handleAcceptAll = () => {
    handleConsentSave({
      analytics: true,
      marketing: true,
      functional: true
    });
  };

  const handleEssentialOnly = () => {
    handleConsentSave({
      analytics: false,
      marketing: false,
      functional: true
    });
  };

  const privacySettings = compliance.getPrivacySettings();

  if (!showBanner && !showModal) {
    return null;
  }

  return (
    <>
      {/* Consent Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 shadow-2xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold text-lg">Privacy & Cookie Consent</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  We use cookies and similar technologies to personalize content and advertisements, 
                  provide social media features, and analyze our traffic. We also share information 
                  about your use of our site with our analytics and advertising partners.
                  {privacySettings.gdprApplies && (
                    <span className="block mt-1 font-medium text-blue-300">
                      🇪🇺 GDPR applies to you. You have the right to control how your data is used.
                    </span>
                  )}
                  {privacySettings.ccpaApplies && (
                    <span className="block mt-1 font-medium text-blue-300">
                      🇺🇸 CCPA applies to you. You have the right to opt-out of data sales.
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handleEssentialOnly}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 border border-gray-500 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Customize
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Consent Modal */}
      {showModal && (
        <ConsentModal
          onSave={handleConsentSave}
          onClose={() => setShowModal(false)}
          privacySettings={privacySettings}
          currentConsent={consent}
        />
      )}
    </>
  );
};

interface ConsentModalProps {
  onSave: (consent: Omit<ConsentData, 'timestamp' | 'version'>) => void;
  onClose: () => void;
  privacySettings: any;
  currentConsent: ConsentData | null;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ 
  onSave, 
  onClose, 
  privacySettings,
  currentConsent 
}) => {
  const [preferences, setPreferences] = useState({
    functional: true, // Always required
    analytics: currentConsent?.analytics ?? false,
    marketing: currentConsent?.marketing ?? false
  });

  const handleSave = () => {
    onSave(preferences);
  };

  const cookieCategories = [
    {
      id: 'functional',
      title: 'Functional Cookies',
      description: 'These cookies are essential for the website to function properly. They enable basic features like page navigation, access to secure areas, and remember your preferences.',
      required: true,
      examples: ['Session management', 'Authentication', 'Security', 'User preferences'],
      icon: <Settings className="h-5 w-5" />
    },
    {
      id: 'analytics',
      title: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.',
      required: false,
      examples: ['Page views', 'Time spent on site', 'Click tracking', 'Performance metrics'],
      icon: <Info className="h-5 w-5" />
    },
    {
      id: 'marketing',
      title: 'Marketing Cookies',
      description: 'These cookies are used to deliver advertisements that are relevant to you and your interests. They may also be used to limit the number of times you see an advertisement.',
      required: false,
      examples: ['Targeted advertising', 'Cross-site tracking', 'Social media integration', 'Remarketing'],
      icon: <ExternalLink className="h-5 w-5" />
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">Privacy Preferences</h2>
                <p className="text-blue-100 text-sm">Customize your cookie and privacy settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Privacy Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Your Privacy Rights</h3>
            <div className="text-sm text-blue-800 space-y-1">
              {privacySettings.gdprApplies && (
                <p>🇪🇺 <strong>GDPR:</strong> You have the right to access, rectify, erase, and port your data.</p>
              )}
              {privacySettings.ccpaApplies && (
                <p>🇺🇸 <strong>CCPA:</strong> You have the right to know what data we collect and opt-out of sales.</p>
              )}
              <p>You can change these preferences at any time in your account settings.</p>
            </div>
          </div>

          {/* Cookie Categories */}
          <div className="space-y-6">
            {cookieCategories.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      category.required ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {category.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{category.title}</h4>
                      {category.required && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences[category.id as keyof typeof preferences]}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        [category.id]: e.target.checked
                      }))}
                      disabled={category.required}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer transition-colors ${
                      category.required 
                        ? 'bg-green-600' 
                        : preferences[category.id as keyof typeof preferences]
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                  </label>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{category.description}</p>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Examples:</p>
                  <div className="flex flex-wrap gap-1">
                    {category.examples.map((example, index) => (
                      <span key={index} className="text-xs bg-white text-gray-600 px-2 py-1 rounded border">
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Data Processing Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Data Processing</h4>
            <p className="text-sm text-gray-600">
              By accepting these cookies, you consent to the processing of your personal data 
              for the purposes described above. Data may be processed by our trusted partners 
              and service providers. For more information, please read our{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Last updated: {currentConsent?.timestamp.toLocaleDateString() || 'Never'}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Check className="h-4 w-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentManager;