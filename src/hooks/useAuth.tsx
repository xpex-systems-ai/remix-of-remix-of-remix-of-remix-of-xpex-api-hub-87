import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { analytics } from '@/lib/analytics';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Track user return based on last visit
  const trackUserReturnIfApplicable = () => {
    const lastVisit = localStorage.getItem('xpex_last_visit');
    if (lastVisit) {
      const daysSinceLastVisit = Math.floor(
        (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastVisit > 0) {
        analytics.trackUserReturn(daysSinceLastVisit);
      }
    }
    localStorage.setItem('xpex_last_visit', new Date().toISOString());
  };

  // Fetch and sync user profile with analytics + cohort tracking
  const syncUserProfile = async (userId: string, email?: string, isNewSignup = false) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profile) {
        const signupDate = new Date(profile.created_at);
        
        // Assign cohort for new users or update days since signup
        if (isNewSignup) {
          analytics.assignCohort(signupDate);
          analytics.trackActivationEvent('account_created');
          
          // Check if profile is completed
          if (profile.full_name) {
            analytics.trackActivationEvent('profile_completed');
          }
        } else {
          // Update days since signup for existing users
          analytics.updateDaysSinceSignup(signupDate);
        }
        
        // Track retention event (daily active)
        analytics.trackRetentionEvent('daily_active', {
          subscription_tier: profile.subscription_tier || 'free',
        });

        // Update Mixpanel with detailed profile data
        analytics.updateUserProfile({
          full_name: profile.full_name || undefined,
          subscription_tier: profile.subscription_tier || 'free',
          credits: profile.credits,
          referral_code: profile.referral_code || undefined,
          avatar_url: profile.avatar_url || undefined,
        });

        // Update segment based on subscription tier
        const segment = (profile.subscription_tier as 'free' | 'starter' | 'pro' | 'enterprise') || 'free';
        analytics.updateUserSegment(segment);

        // Increment login counter
        analytics.incrementUserActivity('logins');
        
        // Track user return
        trackUserReturnIfApplicable();
      }

      // Fetch API keys count and track activation
      const { count: apiKeysCount } = await supabase
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (apiKeysCount !== null) {
        analytics.updateUserProfile({ api_keys_count: apiKeysCount });
        
        // Track first API key activation event
        if (apiKeysCount >= 1) {
          analytics.trackActivationEvent('first_api_key');
        }
      }

      // Fetch total validations count
      const { count: validationsCount } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .ilike('endpoint', '%validate-email%');

      if (validationsCount !== null) {
        analytics.updateUserProfile({ total_validations: validationsCount });
        
        // Track first validation activation event
        if (validationsCount >= 1) {
          analytics.trackActivationEvent('first_validation');
        }
        
        // Determine lifecycle stage based on activity
        let stage: 'new' | 'activated' | 'engaged' | 'power_user' = 'new';
        if (validationsCount >= 1000) stage = 'power_user';
        else if (validationsCount >= 100) stage = 'engaged';
        else if (validationsCount >= 1) stage = 'activated';
        
        analytics.updateLifecycleStage(stage);
        
        // Track churn risk if user has been inactive
        const lastVisit = localStorage.getItem('xpex_last_visit');
        if (lastVisit) {
          const daysSinceLastVisit = Math.floor(
            (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastVisit > 14) {
            const riskScore = Math.min(100, daysSinceLastVisit * 3);
            analytics.trackChurnRiskSignal('inactivity', riskScore, {
              days_inactive: daysSinceLastVisit,
            });
          }
        }
      }

      // Check for first purchase activation
      const { count: purchaseCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (purchaseCount !== null && purchaseCount >= 1) {
        analytics.trackActivationEvent('first_purchase');
      }
    } catch (error) {
      console.error('[Analytics] Failed to sync user profile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Identify user in Mixpanel on auth state change
        if (session?.user) {
          setTimeout(() => {
            analytics.identifyUser(
              session.user.id,
              session.user.email,
              {
                provider: session.user.app_metadata?.provider,
                full_name: session.user.user_metadata?.full_name,
              }
            );
            
            // Check if this is a new signup or returning user
            const isNewSignup = event === 'SIGNED_IN' && 
              session.user.created_at && 
              (Date.now() - new Date(session.user.created_at).getTime()) < 60000; // Within last minute
            
            // Sync full profile data with analytics + cohort tracking
            syncUserProfile(session.user.id, session.user.email, isNewSignup);
            
            if (event === 'SIGNED_IN') {
              analytics.trackLoginCompleted(session.user.app_metadata?.provider || 'email');
              analytics.trackFunnelStage('Onboarding', 'Login Completed', 3, {
                method: session.user.app_metadata?.provider || 'email',
              });
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          analytics.resetUser();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Identify existing user
      if (session?.user) {
        analytics.identifyUser(
          session.user.id,
          session.user.email,
          {
            provider: session.user.app_metadata?.provider,
            full_name: session.user.user_metadata?.full_name,
          }
        );
        
        // Sync full profile data with analytics (not new signup)
        syncUserProfile(session.user.id, session.user.email, false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Track signup started and funnel stage
    analytics.trackSignupStarted('email');
    analytics.trackFunnelStage('Onboarding', 'Signup Started', 1, { method: 'email' });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    // Track signup completion if successful
    if (!error && data.user) {
      analytics.completeSignup(data.user.id, email, 'email');
      analytics.trackFunnelStage('Onboarding', 'Signup Completed', 2, { method: 'email' });
      
      // Assign cohort immediately on signup
      analytics.assignCohort(new Date());
      analytics.trackActivationEvent('account_created');
      
      if (fullName) {
        analytics.trackActivationEvent('profile_completed');
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
