import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BotConsumerHealth {
  status: string;
  bot: {
    name: string;
    version: string;
    uptime: string;
  };
  user: {
    tier: string;
    credits: number;
    creditsUsed24h: number;
    rateLimit: string;
  };
  performance: {
    totalRequests24h: number;
    successfulRequests: number;
    failedRequests: number;
    errorRate: string;
    avgLatencyMs: number;
  };
  lastRun: string | null;
  timestamp: string;
}

export interface BotConsumerLog {
  id: string;
  endpoint: string;
  status: 'success' | 'error';
  statusCode: number;
  responseTimeMs: number;
  createdAt: string;
  apiKeyId: string | null;
}

export interface BotConsumerStats {
  total: number;
  success: number;
  errors: number;
  avgResponseTimeMs: number;
}

export const useBotConsumer = () => {
  const [health, setHealth] = useState<BotConsumerHealth | null>(null);
  const [logs, setLogs] = useState<BotConsumerLog[]>([]);
  const [stats, setStats] = useState<BotConsumerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  const fetchHealth = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const { data, error } = await supabase.functions.invoke('bot-consumer-health', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setHealth(data);
    } catch (err) {
      console.error('Error fetching bot health:', err);
      setError('Failed to fetch bot health');
    }
  }, [session?.access_token]);

  const fetchLogs = useCallback(async (limit = 50) => {
    if (!session?.access_token) return;

    try {
      const { data, error } = await supabase.functions.invoke('bot-consumer-logs', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { limit },
      });

      if (error) throw error;
      setLogs(data?.logs || []);
      setStats(data?.summary || null);
    } catch (err) {
      console.error('Error fetching bot logs:', err);
      setError('Failed to fetch bot logs');
    }
  }, [session?.access_token]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchHealth(), fetchLogs()]);
    setLoading(false);
  }, [fetchHealth, fetchLogs]);

  useEffect(() => {
    if (user && session) {
      refresh();
    } else {
      setLoading(false);
    }
  }, [user, session, refresh]);

  // Real-time updates for usage logs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('bot-consumer-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'usage_logs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const log = payload.new;
          if (log.endpoint?.includes('bot-consumer')) {
            setLogs(prev => [{
              id: log.id,
              endpoint: log.endpoint,
              status: log.status_code === 200 ? 'success' : 'error',
              statusCode: log.status_code,
              responseTimeMs: log.response_time_ms || 0,
              createdAt: log.created_at,
              apiKeyId: log.api_key_id,
            }, ...prev.slice(0, 49)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    health,
    logs,
    stats,
    loading,
    error,
    refresh,
  };
};
