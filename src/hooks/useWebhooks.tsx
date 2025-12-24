import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { withRetry } from '@/lib/retry';
import { offlineStorage } from '@/lib/offlineStorage';

// Auto-backup helper
const triggerAutoBackup = async (userId: string) => {
  try {
    await supabase.functions.invoke('backup-configurations', {
      body: { backup_type: 'webhooks' }
    });
    console.log('Auto-backup triggered for webhooks');
  } catch (error) {
    console.error('Auto-backup failed:', error);
  }
};

export interface Webhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status_code: number | null;
  response: string | null;
  success: boolean;
  attempts: number;
  created_at: string;
}

export const WEBHOOK_EVENTS = [
  { value: 'usage.threshold', label: 'Limite de uso atingido (80%)' },
  { value: 'usage.limit_reached', label: 'Limite de uso esgotado' },
  { value: 'credits.low', label: 'Créditos baixos (< 100)' },
  { value: 'credits.depleted', label: 'Créditos esgotados' },
  { value: 'api_key.created', label: 'API Key criada' },
  { value: 'api_key.deleted', label: 'API Key deletada' },
  { value: 'subscription.changed', label: 'Assinatura alterada' },
  { value: 'auto_recharge', label: 'Auto-recharge (sucesso ou falha)' },
  { value: 'auto_recharge.success', label: 'Auto-recharge bem-sucedido' },
  { value: 'auto_recharge.failed', label: 'Auto-recharge falhou' }
];

const CACHE_KEY_WEBHOOKS = 'webhooks';
const CACHE_KEY_WEBHOOK_LOGS = 'webhook_logs';

export const useWebhooks = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { user } = useAuth();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = offlineStorage.onConnectionChange((online) => {
      if (mountedRef.current) {
        setIsOffline(!online);
        if (online) {
          fetchWebhooks();
        }
      }
    });
    return unsubscribe;
  }, []);

  const fetchWebhooks = async () => {
    if (!user) {
      setWebhooks([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    // Try to load from cache first
    const cachedWebhooks = offlineStorage.getCache<Webhook[]>(CACHE_KEY_WEBHOOKS);
    const cachedLogs = offlineStorage.getCache<WebhookLog[]>(CACHE_KEY_WEBHOOK_LOGS);
    
    if (cachedWebhooks && !navigator.onLine) {
      setWebhooks(cachedWebhooks);
      setLogs(cachedLogs || []);
      setIsOffline(true);
      setLoading(false);
      return;
    }

    try {
      const data = await withRetry(
        async () => {
          const { data, error } = await supabase
            .from('webhooks')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (error, attempt) => {
            if (mountedRef.current) {
              setIsRetrying(true);
              console.log(`Retry attempt ${attempt} for webhooks fetch`);
            }
          },
        }
      );

      if (mountedRef.current) {
        setWebhooks((data || []) as Webhook[]);
        setIsRetrying(false);
        offlineStorage.setCache(CACHE_KEY_WEBHOOKS, data || []);

        // Fetch recent logs for all webhooks
        if (data && data.length > 0) {
          const webhookIds = data.map(w => w.id);
          const { data: logsData } = await supabase
            .from('webhook_logs')
            .select('*')
            .in('webhook_id', webhookIds)
            .order('created_at', { ascending: false })
            .limit(50);

          setLogs((logsData || []) as WebhookLog[]);
          offlineStorage.setCache(CACHE_KEY_WEBHOOK_LOGS, logsData || []);
        }
      }
    } catch (error) {
      console.error('Error in fetchWebhooks:', error);
      if (mountedRef.current) {
        setIsRetrying(false);
        if (cachedWebhooks) {
          setWebhooks(cachedWebhooks);
          setLogs(cachedLogs || []);
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const createWebhook = async (name: string, url: string, events: string[]) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      const data = await withRetry(
        async () => {
          const { data, error } = await supabase
            .from('webhooks')
            .insert({
              user_id: user.id,
              name,
              url,
              events
            })
            .select()
            .single();

          if (error) throw error;
          return data;
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
        }
      );

      toast.success('Webhook criado com sucesso!');
      await fetchWebhooks();
      triggerAutoBackup(user.id);
      return data as Webhook;
    } catch (error) {
      console.error('Error in createWebhook:', error);
      toast.error('Erro ao criar webhook');
      return null;
    }
  };

  const updateWebhook = async (id: string, updates: Partial<Pick<Webhook, 'name' | 'url' | 'events' | 'active'>>) => {
    try {
      await withRetry(
        async () => {
          const { error } = await supabase
            .from('webhooks')
            .update(updates)
            .eq('id', id);

          if (error) throw error;
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
        }
      );

      toast.success('Webhook atualizado!');
      await fetchWebhooks();
      if (user) triggerAutoBackup(user.id);
      return true;
    } catch (error) {
      console.error('Error in updateWebhook:', error);
      toast.error('Erro ao atualizar webhook');
      return false;
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await withRetry(
        async () => {
          const { error } = await supabase
            .from('webhooks')
            .delete()
            .eq('id', id);

          if (error) throw error;
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
        }
      );

      toast.success('Webhook deletado!');
      await fetchWebhooks();
      if (user) triggerAutoBackup(user.id);
      return true;
    } catch (error) {
      console.error('Error in deleteWebhook:', error);
      toast.error('Erro ao deletar webhook');
      return false;
    }
  };

  const testWebhook = async (id: string) => {
    try {
      await withRetry(
        async () => {
          const { error } = await supabase.functions.invoke('send-webhook', {
            body: {
              webhook_id: id,
              event_type: 'test',
              payload: {
                message: 'Este é um teste de webhook',
                timestamp: new Date().toISOString()
              }
            }
          });

          if (error) throw error;
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
        }
      );

      toast.success('Webhook de teste enviado!');
      await fetchWebhooks();
      return true;
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Erro ao testar webhook');
      return false;
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [user]);

  return {
    webhooks,
    logs,
    loading,
    isRetrying,
    isOffline,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    refetch: fetchWebhooks
  };
};
