// Analytics tracking utility - XPEX Enterprise Schema v1
// Integrated with Google Analytics 4 and Mixpanel

// Event categories for organization
type EventCategory = 
  | 'navigation' 
  | 'engagement' 
  | 'conversion' 
  | 'onboarding' 
  | 'auth' 
  | 'product' 
  | 'api' 
  | 'billing';

// Core event types from xpex_enterprise_v1 schema
type EventName =
  // Navigation
  | 'page_view'
  // Engagement
  | 'cta_click'
  | 'scroll_depth'
  | 'time_on_page'
  | 'external_link_click'
  | 'navigation_click'
  | 'feature_interaction'
  | 'search_performed'
  // Conversion
  | 'form_submitted'
  | 'form_started'
  // Onboarding
  | 'signup_started'
  | 'signup_completed'
  // Auth
  | 'login_completed'
  // Product
  | 'marketplace_view'
  | 'product_page_view'
  // API
  | 'api_playground_used'
  | 'api_key_generated'
  | 'api_key_deleted'
  | 'email_validated'
  | 'request_replayed'
  | 'live_demo_interaction'
  // Billing
  | 'checkout_started'
  | 'checkout_initiated' // Legacy alias
  | 'purchase_completed'
  | 'credits_purchased'
  | 'plan_selected'
  | 'demo_started'
  | 'error_occurred';

// Event parameter interfaces for type safety
interface PageViewParams {
  page_path: string;
  page_title?: string;
}

interface CTAClickParams {
  cta_id: string;
  cta_label: string;
  page_context: string;
}

interface FormSubmittedParams {
  form_id: string;
  form_type: string;
  page_context: string;
  success?: boolean;
  error_message?: string;
}

interface SignupParams {
  method: string;
  page_context?: string;
}

interface MarketplaceViewParams {
  section: string;
}

interface ProductPageViewParams {
  product_name: string;
}

interface APIPlaygroundParams {
  endpoint: string;
  method: string;
}

interface APIKeyParams {
  key_type?: string;
  key_name?: string;
}

interface CheckoutParams {
  plan_name: string;
  billing_type: 'subscription' | 'one_time';
  value?: number;
  currency?: string;
}

interface PurchaseParams {
  plan_name: string;
  value: number;
  currency: string;
  transaction_id?: string;
}

interface EventProperties {
  [key: string]: string | number | boolean | undefined | Record<string, any>[] | Record<string, any>;
}

// GA4 Measurement ID - configured in index.html
export const GA4_MEASUREMENT_ID = 'G-Q9S5Y4561Z';

// Recommended conversions for GA4
// These should be marked as conversions in GA4 Admin > Events > Mark as conversion
export const RECOMMENDED_CONVERSIONS: EventName[] = [
  'signup_completed',
  'api_key_generated',
  'checkout_started',
  'purchase_completed'
];

// GA4 Conversion Events mapping to GA4 recommended event names
export const GA4_CONVERSION_MAPPING: Record<string, string> = {
  'signup_completed': 'sign_up',
  'api_key_generated': 'generate_lead',
  'checkout_started': 'begin_checkout',
  'purchase_completed': 'purchase'
};

// Initialize GA4 with enhanced configuration
export const initializeGA4 = () => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('[GA4] gtag not available');
    return false;
  }

  // Configure GA4 with enhanced settings
  window.gtag('config', GA4_MEASUREMENT_ID, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure',
    anonymize_ip: true,
    allow_google_signals: true,
    allow_ad_personalization_signals: false,
  });

  console.log(`[GA4] Initialized with ID: ${GA4_MEASUREMENT_ID}`);
  return true;
};

// Configure GA4 conversions programmatically
// Note: Conversions must also be marked in GA4 Admin panel
export const configureGA4Conversions = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    console.log('[GA4] Recommended Conversions to configure in GA4 Admin:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    RECOMMENDED_CONVERSIONS.forEach((eventName) => {
      const ga4EventName = GA4_CONVERSION_MAPPING[eventName] || eventName;
      console.log(`  ✓ ${eventName} → GA4: ${ga4EventName}`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[GA4] To mark as conversions:');
    console.log('  1. Go to GA4 Admin → Events');
    console.log('  2. Find each event above');
    console.log('  3. Toggle "Mark as conversion"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return true;
  }
  return false;
};

// Track conversion event with enhanced data
export const trackGA4Conversion = (
  eventName: EventName, 
  value?: number, 
  currency = 'BRL',
  additionalParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    const ga4EventName = GA4_CONVERSION_MAPPING[eventName] || eventName;
    
    window.gtag('event', ga4EventName, {
      event_category: 'conversion',
      event_label: eventName,
      value: value,
      currency: currency,
      ...additionalParams
    });
    
    console.log(`[GA4] Conversion tracked: ${eventName} (${ga4EventName})`, { value, currency });
  }
};

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    mixpanel?: {
      init: (token: string, config?: object) => void;
      track: (event: string, properties?: object) => void;
      track_pageview: (properties?: object) => void;
      identify: (id: string) => void;
      reset: () => void;
      people: {
        set: (properties: object) => void;
        set_once: (properties: object) => void;
        increment: (property: string, value?: number) => void;
      };
      register: (properties: object) => void;
      time_event: (eventName: string) => void;
    };
  }
}

class Analytics {
  private isEnabled: boolean = true;

  track(eventName: EventName, properties?: EventProperties) {
    if (!this.isEnabled) return;

    const event = {
      name: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      },
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event.name, event.properties);
    }

    // Send to Google Analytics 4
    this.sendToGA4(eventName, properties);

    // Send to Mixpanel
    this.sendToMixpanel(eventName, properties);

    // Store in localStorage for debugging
    this.storeLocally(event);
  }

  private sendToGA4(eventName: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && window.gtag) {
      // Map custom events to GA4 recommended events where applicable
      const ga4EventMap: Record<string, string> = {
        'checkout_started': 'begin_checkout',
        'checkout_initiated': 'begin_checkout',
        'plan_selected': 'select_item',
        'purchase_completed': 'purchase',
        'credits_purchased': 'purchase',
        'signup_started': 'sign_up',
        'signup_completed': 'sign_up',
        'login_completed': 'login',
      };

      const ga4EventName = ga4EventMap[eventName] || eventName;
      
      // Get category for the event
      const categoryMap: Record<string, EventCategory> = {
        'page_view': 'navigation',
        'cta_click': 'engagement',
        'scroll_depth': 'engagement',
        'time_on_page': 'engagement',
        'external_link_click': 'engagement',
        'navigation_click': 'engagement',
        'feature_interaction': 'engagement',
        'search_performed': 'engagement',
        'form_submitted': 'conversion',
        'form_started': 'conversion',
        'signup_started': 'onboarding',
        'signup_completed': 'onboarding',
        'login_completed': 'auth',
        'marketplace_view': 'product',
        'product_page_view': 'product',
        'api_playground_used': 'api',
        'api_key_generated': 'api',
        'api_key_deleted': 'api',
        'email_validated': 'api',
        'checkout_started': 'billing',
        'checkout_initiated': 'billing',
        'purchase_completed': 'billing',
        'credits_purchased': 'billing',
        'plan_selected': 'billing',
      };
      
      window.gtag('event', ga4EventName, {
        event_category: categoryMap[eventName] || 'general',
        event_label: eventName,
        ...properties,
      });
    }
  }

  private sendToMixpanel(eventName: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && window.mixpanel) {
      const mixpanelEventMap: Record<string, string> = {
        'page_view': 'Page Viewed',
        'cta_click': 'CTA Clicked',
        'scroll_depth': 'Scroll Depth Reached',
        'time_on_page': 'Time on Page',
        'external_link_click': 'External Link Clicked',
        'navigation_click': 'Navigation Clicked',
        'feature_interaction': 'Feature Interaction',
        'search_performed': 'Search Performed',
        'form_submitted': 'Form Submitted',
        'form_started': 'Form Started',
        'signup_started': 'Signup Started',
        'signup_completed': 'Signup Completed',
        'login_completed': 'Login Completed',
        'marketplace_view': 'Marketplace Viewed',
        'product_page_view': 'Product Page Viewed',
        'api_playground_used': 'API Playground Used',
        'api_key_generated': 'API Key Generated',
        'api_key_deleted': 'API Key Deleted',
        'email_validated': 'Email Validated',
        'request_replayed': 'Request Replayed',
        'live_demo_interaction': 'Live Demo Interaction',
        'checkout_started': 'Checkout Started',
        'checkout_initiated': 'Checkout Started',
        'purchase_completed': 'Purchase Completed',
        'credits_purchased': 'Credits Purchased',
        'plan_selected': 'Plan Selected',
        'demo_started': 'Demo Started',
        'error_occurred': 'Error Occurred',
      };

      const mixpanelEventName = mixpanelEventMap[eventName] || eventName;
      
      window.mixpanel.track(mixpanelEventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private storeLocally(event: { name: string; properties: EventProperties }) {
    if (typeof window !== 'undefined') {
      try {
        const events = JSON.parse(localStorage.getItem('xpex_analytics') || '[]');
        events.push(event);
        if (events.length > 100) events.shift();
        localStorage.setItem('xpex_analytics', JSON.stringify(events));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  // ============== Navigation Events ==============
  
  trackPageView(pagePath: string, pageTitle?: string) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle,
      });
    }
    this.track('page_view', { page_path: pagePath, page_title: pageTitle });
  }

  // ============== Engagement Events ==============
  
  trackCTAClick(ctaId: string, ctaLabel: string, pageContext?: string) {
    this.track('cta_click', { 
      cta_id: ctaId, 
      cta_label: ctaLabel, 
      page_context: pageContext || window.location.pathname 
    });
  }

  trackScrollDepth(depth: number, pagePath: string) {
    this.track('scroll_depth', { 
      depth_percentage: depth, 
      page_path: pagePath 
    });
  }

  trackTimeOnPage(seconds: number, pagePath: string) {
    this.track('time_on_page', { 
      time_seconds: seconds, 
      page_path: pagePath 
    });
  }

  trackExternalLinkClick(url: string, linkText?: string, location?: string) {
    this.track('external_link_click', { 
      url, 
      link_text: linkText, 
      location 
    });
  }

  trackNavigationClick(linkName: string, destination: string, location?: string) {
    this.track('navigation_click', { 
      link_name: linkName, 
      destination, 
      location 
    });
  }

  trackFeatureInteraction(featureName: string, action: string, details?: Record<string, any>) {
    this.track('feature_interaction', { 
      feature_name: featureName, 
      action,
      ...details 
    });
  }

  trackSearch(query: string, resultsCount?: number, location?: string) {
    this.track('search_performed', { 
      search_query: query, 
      results_count: resultsCount, 
      location 
    });
  }

  // ============== Conversion Events ==============
  
  trackFormStarted(formId: string, formType: string, pageContext?: string) {
    this.track('form_started', { 
      form_id: formId, 
      form_type: formType, 
      page_context: pageContext || window.location.pathname 
    });
  }

  trackFormSubmitted(formId: string, formType: string, pageContext?: string, success = true, errorMessage?: string) {
    this.track('form_submitted', { 
      form_id: formId, 
      form_type: formType, 
      page_context: pageContext || window.location.pathname,
      success, 
      error_message: errorMessage 
    });
  }

  // ============== Onboarding Events ==============
  
  trackSignupStarted(method: string, pageContext?: string) {
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.time_event('Signup Completed');
    }
    this.track('signup_started', { 
      method, 
      page_context: pageContext || window.location.pathname 
    });
  }

  trackSignupCompleted(userId: string, email: string, method: string) {
    this.track('signup_completed', { method, user_id: userId });
    this.identifyUser(userId, email, { signup_method: method });
    
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.track('Signup Completed', { method, user_id: userId });
    }
  }

  // ============== Auth Events ==============
  
  trackLoginCompleted(method: string) {
    this.track('login_completed', { method });
  }

  // ============== Product Events ==============
  
  trackMarketplaceView(section: string) {
    this.track('marketplace_view', { section });
  }

  trackProductPageView(productName: string) {
    this.track('product_page_view', { product_name: productName });
  }

  // ============== API Events ==============
  
  trackAPIPlaygroundUsed(endpoint: string, method: string) {
    this.track('api_playground_used', { endpoint, method });
  }

  trackAPIKeyGenerated(keyType: string, keyName?: string) {
    this.track('api_key_generated', { key_type: keyType, key_name: keyName });
  }

  trackAPIKeyDeleted(keyName: string) {
    this.track('api_key_deleted', { key_name: keyName });
  }

  trackEmailValidated(isValid: boolean, riskScore?: number) {
    this.track('email_validated', { is_valid: isValid, risk_score: riskScore });
  }

  // ============== Billing Events ==============
  
  trackCheckoutStarted(planName: string, billingType: 'subscription' | 'one_time', value?: number, currency = 'USD') {
    this.track('checkout_started', { 
      plan_name: planName, 
      billing_type: billingType,
      value,
      currency
    });
    
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.time_event('Purchase Completed');
    }
  }

  // Legacy method alias
  trackCheckoutInitiated(tier: string, price?: number, priceId?: string) {
    this.trackCheckoutStarted(tier, 'subscription', price);
  }

  trackPurchaseCompleted(planName: string, value: number, currency = 'USD', transactionId?: string) {
    this.track('purchase_completed', { 
      plan_name: planName, 
      value,
      currency,
      transaction_id: transactionId
    });
    
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.people.increment('total_purchases');
      window.mixpanel.people.increment('total_spent', value);
      window.mixpanel.people.set({
        last_purchase_date: new Date().toISOString(),
        last_purchase_plan: planName,
      });
    }
  }

  trackCreditsPackage(packageName: string, credits: number, price: number) {
    this.track('credits_purchased', { 
      package_name: packageName, 
      credits,
      value: price,
      currency: 'USD'
    });
  }

  trackPlanSelected(tier: string, price?: number) {
    this.track('plan_selected', { 
      tier,
      value: price,
      currency: 'USD'
    });
  }

  trackDemoStarted(apiName: string) {
    this.track('demo_started', { api_name: apiName });
  }

  // ============== Error Tracking ==============
  
  trackError(errorType: string, errorMessage: string, location?: string) {
    this.track('error_occurred', { 
      error_type: errorType, 
      error_message: errorMessage, 
      location 
    });
  }

  // ============== User Identification ==============
  
  identifyUser(userId: string, email?: string, properties?: Record<string, any>) {
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.identify(userId);
      
      window.mixpanel.people.set({
        $email: email,
        $last_login: new Date().toISOString(),
        ...properties,
      });

      window.mixpanel.people.set_once({
        $created: new Date().toISOString(),
        first_seen: new Date().toISOString(),
        signup_source: document.referrer || 'direct',
        initial_utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        initial_utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        initial_utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
      });

      window.mixpanel.register({
        user_id: userId,
        user_email: email,
      });

      console.log('[Analytics] User identified:', userId);
    }

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('set', 'user_id', userId);
      window.gtag('set', 'user_properties', {
        email: email,
        ...properties,
      });
    }
  }

  // Enhanced user profile update with detailed properties
  updateUserProfile(properties: {
    full_name?: string;
    subscription_tier?: string;
    credits?: number;
    referral_code?: string;
    api_keys_count?: number;
    total_validations?: number;
    avatar_url?: string;
  }) {
    if (typeof window !== 'undefined' && window.mixpanel) {
      const profileData: Record<string, any> = {
        $last_seen: new Date().toISOString(),
      };

      if (properties.full_name) profileData.$name = properties.full_name;
      if (properties.subscription_tier) profileData.subscription_tier = properties.subscription_tier;
      if (properties.credits !== undefined) profileData.credits_balance = properties.credits;
      if (properties.referral_code) profileData.referral_code = properties.referral_code;
      if (properties.api_keys_count !== undefined) profileData.api_keys_count = properties.api_keys_count;
      if (properties.total_validations !== undefined) profileData.total_validations = properties.total_validations;
      if (properties.avatar_url) profileData.$avatar = properties.avatar_url;

      window.mixpanel.people.set(profileData);
      console.log('[Analytics] User profile updated:', profileData);
    }
  }

  // Track user tier/segment changes
  updateUserSegment(segment: 'free' | 'starter' | 'pro' | 'enterprise', previousSegment?: string) {
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.people.set({
        user_segment: segment,
        segment_updated_at: new Date().toISOString(),
      });

      if (previousSegment && previousSegment !== segment) {
        window.mixpanel.track('Segment Changed', {
          from_segment: previousSegment,
          to_segment: segment,
          timestamp: new Date().toISOString(),
        });
      }

      window.mixpanel.register({ user_segment: segment });
    }
  }

  // Track user engagement score
  updateEngagementScore(score: number, factors: {
    logins_last_30_days?: number;
    api_calls_last_30_days?: number;
    features_used?: string[];
  }) {
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.people.set({
        engagement_score: score,
        engagement_updated_at: new Date().toISOString(),
        ...factors,
      });
    }
  }

  // Track lifecycle stage
  updateLifecycleStage(stage: 'new' | 'activated' | 'engaged' | 'power_user' | 'at_risk' | 'churned') {
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.people.set({
        lifecycle_stage: stage,
        lifecycle_updated_at: new Date().toISOString(),
      });
      window.mixpanel.register({ lifecycle_stage: stage });
    }
  }

  // Increment user activity counters
  incrementUserActivity(activity: 'api_calls' | 'validations' | 'logins' | 'page_views', count = 1) {
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.people.increment(`total_${activity}`, count);
      window.mixpanel.people.set({
        [`last_${activity}_at`]: new Date().toISOString(),
      });
    }
  }

  // Set user preferences
  setUserPreferences(preferences: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    timezone?: string;
    email_notifications?: boolean;
    push_notifications?: boolean;
  }) {
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.people.set({
        preferences_theme: preferences.theme,
        preferences_language: preferences.language,
        preferences_timezone: preferences.timezone,
        preferences_email_notifications: preferences.email_notifications,
        preferences_push_notifications: preferences.push_notifications,
      });
    }
  }

  resetUser() {
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.reset();
      console.log('[Analytics] User identity reset');
    }
  }

  // ============== Legacy Compatibility Methods ==============
  
  startCheckoutFunnel(tier: string, priceId?: string) {
    this.trackCheckoutStarted(tier, 'subscription');
  }

  completeCheckout(tier: string, price: number, transactionId?: string) {
    this.trackPurchaseCompleted(tier, price, 'USD', transactionId);
  }

  completePurchase(packageName: string, credits: number, price: number, transactionId?: string) {
    this.trackCreditsPackage(packageName, credits, price);
  }

  completeSignup(userId: string, email: string, method?: string) {
    this.trackSignupCompleted(userId, email, method || 'email');
  }

  // Get recommended conversions for GA4 setup
  static getRecommendedConversions(): EventName[] {
    return RECOMMENDED_CONVERSIONS;
  }
}

export const analytics = new Analytics();
