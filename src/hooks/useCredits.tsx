import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CreditBalance {
  credits: number;
  tier: string;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'deduction' | 'subscription' | 'referral' | 'refund' | 'adjustment';
  description: string | null;
  balance_after: number;
  created_at: string;
}

export const useCredits = () => {
  const [balance, setBalance] = useState<CreditBalance>({ credits: 0, tier: 'free' });
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setBalance({ credits: 0, tier: 'free' });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setBalance({
        credits: data?.credits ?? 0,
        tier: data?.subscription_tier ?? 'free'
      });
    } catch (error) {
      console.error('Error fetching credit balance:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions((data as CreditTransaction[]) ?? []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, [fetchBalance, fetchTransactions]);

  // Real-time subscription for credit updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('credits-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as { credits: number; subscription_tier: string };
            setBalance({
              credits: newData.credits ?? 0,
              tier: newData.subscription_tier ?? 'free'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    transactions,
    loading,
    refreshBalance,
    fetchTransactions
  };
};
