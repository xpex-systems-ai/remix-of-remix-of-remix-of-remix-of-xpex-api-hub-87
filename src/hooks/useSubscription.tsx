import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { withRetry } from '@/lib/retry';

export interface SubscriptionStatus {
  subscribed: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  subscriptionEnd: string | null;
  monthlyCredits: number;
}

export interface SubscriptionError extends Error {
  isRetryable: boolean;
}

// Stripe price IDs
export const STRIPE_PRICES = {
  pro: 'price_1SdiUmHDcsx7lyooOieP0TLb',
  enterprise: 'price_1SdigPHDcsx7lyoo9ciVaLVQ'
} as const;

const DEFAULT_SUBSCRIPTION: SubscriptionStatus = {
  subscribed: false,
  tier: 'free',
  subscriptionEnd: null,
  monthlyCredits: 100
};

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionStatus>(DEFAULT_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const { user, session } = useAuth();
  const mountedRef = useRef(true);

  const checkSubscription = useCallback(async () => {
    setError(null);
    
    // Get fresh session to ensure token is not expired
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    
    if (!freshSession?.access_token) {
      setSubscription(DEFAULT_SUBSCRIPTION);
      setLoading(false);
      return;
    }

    try {
      const data = await withRetry(
        async () => {
          const { data, error } = await supabase.functions.invoke('check-subscription', {
            headers: {
              Authorization: `Bearer ${freshSession.access_token}`
            }
          });

          if (error) throw error;
          return data;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          onRetry: (error, attempt, delay) => {
            if (mountedRef.current) {
              setIsRetrying(true);
              setRetryCount(attempt);
              console.log(`Retry attempt ${attempt} for subscription check after ${Math.round(delay)}ms`);
            }
          },
        }
      );

      if (mountedRef.current) {
        setSubscription({
          subscribed: data.subscribed,
          tier: data.tier || 'free',
          subscriptionEnd: data.subscription_end,
          monthlyCredits: data.monthly_credits || 100
        });
        setIsRetrying(false);
        setRetryCount(0);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      if (mountedRef.current) {
        setIsRetrying(false);
        setRetryCount(0);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    // Only check subscription if user is authenticated
    if (user) {
      checkSubscription();
    } else {
      setSubscription({
        subscribed: false,
        tier: 'free',
        subscriptionEnd: null,
        monthlyCredits: 100
      });
      setLoading(false);
    }
  }, [user, checkSubscription]);

  // Refresh every minute only when user is authenticated
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startCheckout = async (tier: 'pro' | 'enterprise') => {
    // Get fresh session to ensure token is not expired
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    
    if (!freshSession?.access_token) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${freshSession.access_token}`
        },
        body: {
          priceId: STRIPE_PRICES[tier],
          mode: 'subscription'
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      toast.error('Failed to start checkout');
    }
  };

  const openCustomerPortal = async () => {
    // Get fresh session to ensure token is not expired
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    
    if (!freshSession?.access_token) {
      toast.error('Please sign in first');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${freshSession.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
    }
  };

  return {
    subscription,
    loading,
    isRetrying,
    retryCount,
    error,
    checkSubscription,
    startCheckout,
    openCustomerPortal
  };
};
