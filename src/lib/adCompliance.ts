import { Advertisement } from './advertisements';

export interface ConsentData {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: Date;
  version: string;
}

export interface PrivacySettings {
  gdprApplies: boolean;
  ccpaApplies: boolean;
  coppaApplies: boolean;
  userLocation?: string;
  consentString?: string;
}

// GDPR/CCPA Compliance Manager
export class AdComplianceManager {
  private static instance: AdComplianceManager;
  private consentData: ConsentData | null = null;
  private privacySettings: PrivacySettings;

  private constructor() {
    this.privacySettings = this.detectPrivacyRequirements();
    this.loadConsentData();
  }

  static getInstance(): AdComplianceManager {
    if (!AdComplianceManager.instance) {
      AdComplianceManager.instance = new AdComplianceManager();
    }
    return AdComplianceManager.instance;
  }

  // Detect applicable privacy regulations
  private detectPrivacyRequirements(): PrivacySettings {
    const userLocation = this.getUserLocation();
    
    return {
      gdprApplies: this.isGDPRApplicable(userLocation),
      ccpaApplies: this.isCCPAApplicable(userLocation),
      coppaApplies: false, // Assume adult users unless specified
      userLocation
    };
  }

  private getUserLocation(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'unknown';
    }
  }

  private isGDPRApplicable(location: string): boolean {
    const euTimezones = [
      'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Rome',
      'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna',
      'Europe/Prague', 'Europe/Warsaw', 'Europe/Stockholm', 'Europe/Helsinki'
    ];
    return euTimezones.some(tz => location.includes(tz));
  }

  private isCCPAApplicable(location: string): boolean {
    return location.includes('America/Los_Angeles') || 
           location.includes('America/San_Francisco');
  }

  // Load consent data from storage
  private loadConsentData(): void {
    try {
      const stored = localStorage.getItem('adConsent');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.consentData = {
          ...parsed,
          timestamp: new Date(parsed.timestamp)
        };
      }
    } catch (error) {
      console.warn('Could not load consent data:', error);
    }
  }

  // Save consent data
  public saveConsent(consent: Omit<ConsentData, 'timestamp' | 'version'>): void {
    this.consentData = {
      ...consent,
      timestamp: new Date(),
      version: '1.0'
    };

    try {
      localStorage.setItem('adConsent', JSON.stringify(this.consentData));
    } catch (error) {
      console.error('Could not save consent data:', error);
    }
  }

  // Check if user has given consent for marketing
  public hasMarketingConsent(): boolean {
    if (!this.privacySettings.gdprApplies && !this.privacySettings.ccpaApplies) {
      return true; // No privacy regulation applies
    }

    return this.consentData?.marketing === true;
  }

  // Check if user has given consent for analytics
  public hasAnalyticsConsent(): boolean {
    if (!this.privacySettings.gdprApplies && !this.privacySettings.ccpaApplies) {
      return true; // No privacy regulation applies
    }

    return this.consentData?.analytics === true;
  }

  // Check if consent is required
  public isConsentRequired(): boolean {
    return this.privacySettings.gdprApplies || this.privacySettings.ccpaApplies;
  }

  // Get privacy settings
  public getPrivacySettings(): PrivacySettings {
    return this.privacySettings;
  }

  // Check if ad can be shown based on consent
  public canShowAd(ad: Advertisement): boolean {
    if (!this.isConsentRequired()) {
      return true;
    }

    // If consent is required but not given, only show non-personalized ads
    if (!this.hasMarketingConsent()) {
      // Check if ad uses targeting (personalized)
      const hasTargeting = ad.target_audience && 
        Object.keys(ad.target_audience).length > 0;
      
      return !hasTargeting;
    }

    return true;
  }

  // Generate consent banner HTML
  public generateConsentBanner(): string {
    if (!this.isConsentRequired() || this.consentData) {
      return '';
    }

    return `
      <div id="consent-banner" class="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
        <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div class="flex-1">
            <h3 class="font-semibold mb-2">Cookie Consent</h3>
            <p class="text-sm text-gray-300">
              We use cookies to personalize content and ads, provide social media features, and analyze our traffic.
              ${this.privacySettings.gdprApplies ? 'You have the right to control how your data is used.' : ''}
            </p>
          </div>
          <div class="flex space-x-3">
            <button id="consent-essential" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Essential Only
            </button>
            <button id="consent-all" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Accept All
            </button>
            <button id="consent-customize" class="px-4 py-2 border border-gray-400 text-white rounded hover:bg-gray-800">
              Customize
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Ad disclosure utilities
export const addAdDisclosure = (adElement: HTMLElement, ad: Advertisement): void => {
  // Add "Ad" label
  const disclosure = document.createElement('div');
  disclosure.className = 'absolute top-1 right-1 bg-gray-600 text-white text-xs px-1 py-0.5 rounded opacity-70';
  disclosure.textContent = 'Ad';
  adElement.appendChild(disclosure);

  // Add sponsored content notice if required
  if (ad.click_url) {
    const sponsoredNotice = document.createElement('div');
    sponsoredNotice.className = 'text-xs text-gray-500 mt-1';
    sponsoredNotice.textContent = 'Sponsored content';
    adElement.appendChild(sponsoredNotice);
  }
};

// Viewability tracking
export class ViewabilityTracker {
  private observer: IntersectionObserver;
  private viewabilityThreshold = 0.5; // 50% visible
  private minimumViewTime = 1000; // 1 second

  constructor() {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
        rootMargin: '0px'
      }
    );
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      const adElement = entry.target as HTMLElement;
      const adId = adElement.dataset.adId;
      
      if (!adId) return;

      if (entry.intersectionRatio >= this.viewabilityThreshold) {
        this.startViewabilityTimer(adId, adElement);
      } else {
        this.stopViewabilityTimer(adId);
      }
    });
  }

  private viewabilityTimers: Map<string, NodeJS.Timeout> = new Map();

  private startViewabilityTimer(adId: string, element: HTMLElement): void {
    if (this.viewabilityTimers.has(adId)) return;

    const timer = setTimeout(() => {
      this.recordViewableImpression(adId, element);
      this.viewabilityTimers.delete(adId);
    }, this.minimumViewTime);

    this.viewabilityTimers.set(adId, timer);
  }

  private stopViewabilityTimer(adId: string): void {
    const timer = this.viewabilityTimers.get(adId);
    if (timer) {
      clearTimeout(timer);
      this.viewabilityTimers.delete(adId);
    }
  }

  private recordViewableImpression(adId: string, element: HTMLElement): void {
    // Record that this ad was actually viewable
    const event = new CustomEvent('adViewable', {
      detail: {
        adId,
        viewabilityMetrics: {
          viewportPercentage: this.getViewportPercentage(element),
          viewDuration: this.minimumViewTime,
          isVisible: true,
          scrollDepth: this.getScrollDepth()
        }
      }
    });
    
    document.dispatchEvent(event);
  }

  private getViewportPercentage(element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const visibleWidth = Math.min(rect.right, viewport.width) - Math.max(rect.left, 0);
    const visibleHeight = Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0);
    const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);
    const totalArea = rect.width * rect.height;

    return totalArea > 0 ? (visibleArea / totalArea) * 100 : 0;
  }

  private getScrollDepth(): number {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    return documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
  }

  public observe(element: HTMLElement): void {
    this.observer.observe(element);
  }

  public unobserve(element: HTMLElement): void {
    this.observer.unobserve(element);
    const adId = element.dataset.adId;
    if (adId) {
      this.stopViewabilityTimer(adId);
    }
  }

  public disconnect(): void {
    this.observer.disconnect();
    this.viewabilityTimers.forEach(timer => clearTimeout(timer));
    this.viewabilityTimers.clear();
  }
}

// Initialize compliance on app start
export const initializeAdCompliance = (): void => {
  const compliance = AdComplianceManager.getInstance();
  
  // Show consent banner if needed
  if (compliance.isConsentRequired() && !compliance.hasMarketingConsent()) {
    const banner = compliance.generateConsentBanner();
    if (banner) {
      document.body.insertAdjacentHTML('beforeend', banner);
      
      // Add event listeners for consent buttons
      document.getElementById('consent-essential')?.addEventListener('click', () => {
        compliance.saveConsent({
          analytics: false,
          marketing: false,
          functional: true
        });
        document.getElementById('consent-banner')?.remove();
      });

      document.getElementById('consent-all')?.addEventListener('click', () => {
        compliance.saveConsent({
          analytics: true,
          marketing: true,
          functional: true
        });
        document.getElementById('consent-banner')?.remove();
      });

      document.getElementById('consent-customize')?.addEventListener('click', () => {
        // Show detailed consent modal
        showConsentModal(compliance);
      });
    }
  }
};

const showConsentModal = (compliance: AdComplianceManager): void => {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h2 class="text-xl font-bold mb-4">Privacy Preferences</h2>
      <div class="space-y-4">
        <label class="flex items-center space-x-3">
          <input type="checkbox" id="functional-consent" checked disabled class="rounded">
          <div>
            <div class="font-medium">Functional Cookies</div>
            <div class="text-sm text-gray-600">Required for basic site functionality</div>
          </div>
        </label>
        <label class="flex items-center space-x-3">
          <input type="checkbox" id="analytics-consent" class="rounded">
          <div>
            <div class="font-medium">Analytics Cookies</div>
            <div class="text-sm text-gray-600">Help us understand how you use our site</div>
          </div>
        </label>
        <label class="flex items-center space-x-3">
          <input type="checkbox" id="marketing-consent" class="rounded">
          <div>
            <div class="font-medium">Marketing Cookies</div>
            <div class="text-sm text-gray-600">Used to show you relevant advertisements</div>
          </div>
        </label>
      </div>
      <div class="flex justify-end space-x-3 mt-6">
        <button id="save-preferences" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Save Preferences
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('save-preferences')?.addEventListener('click', () => {
    const analytics = (document.getElementById('analytics-consent') as HTMLInputElement).checked;
    const marketing = (document.getElementById('marketing-consent') as HTMLInputElement).checked;

    compliance.saveConsent({
      analytics,
      marketing,
      functional: true
    });

    modal.remove();
    document.getElementById('consent-banner')?.remove();
  });
};