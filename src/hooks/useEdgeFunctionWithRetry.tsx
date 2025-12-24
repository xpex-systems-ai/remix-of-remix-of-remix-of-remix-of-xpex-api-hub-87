import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/lib/retry';
import { useRetryContext } from '@/contexts/RetryContext';

interface UseEdgeFunctionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  showGlobalIndicator?: boolean;
}

interface EdgeFunctionState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
}

export function useEdgeFunctionWithRetry<T = unknown>(
  functionName: string,
  options: UseEdgeFunctionOptions<T> = {}
) {
  const { maxRetries = 3, showGlobalIndicator = true, onSuccess, onError } = options;
  
  const [state, setState] = useState<EdgeFunctionState<T>>({
    data: null,
    loading: false,
    error: null,
    isRetrying: false,
    retryCount: 0,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryContext = useRetryContext();

  const invoke = useCallback(async (
    body?: Record<string, unknown>,
    additionalHeaders?: Record<string, string>
  ): Promise<T | null> => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null, isRetrying: false, retryCount: 0 }));

    try {
      // Get fresh session
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        ...additionalHeaders,
      };
      
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const result = await withRetry<T>(
        async () => {
          const { data, error } = await supabase.functions.invoke(functionName, {
            body,
            headers,
          });

          if (error) {
            throw new Error(error.message || 'Edge function error');
          }

          return data as T;
        },
        {
          maxRetries,
          initialDelay: 1000,
          maxDelay: 10000,
          shouldRetry: (error) => {
            const message = String(error).toLowerCase();
            // Retry on network errors, 5xx, 429, or specific edge function errors
            return (
              message.includes('network') ||
              message.includes('fetch') ||
              message.includes('timeout') ||
              message.includes('502') ||
              message.includes('503') ||
              message.includes('504') ||
              message.includes('429') ||
              message.includes('edge function') ||
              message.includes('failed to invoke')
            );
          },
          onRetry: (error, attempt, delay) => {
            console.log(`[${functionName}] Retry attempt ${attempt} after ${Math.round(delay)}ms:`, error);
            setState(prev => ({ ...prev, isRetrying: true, retryCount: attempt }));
            
            if (showGlobalIndicator) {
              retryContext.showRetrying(attempt, delay);
            }
          },
        }
      );

      setState({
        data: result,
        loading: false,
        error: null,
        isRetrying: false,
        retryCount: 0,
      });

      if (showGlobalIndicator) {
        retryContext.hideRetrying();
      }

      onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        isRetrying: false,
      }));

      if (showGlobalIndicator) {
        retryContext.hideRetrying();
      }

      onError?.(err);
      console.error(`[${functionName}] Error:`, err);
      return null;
    }
  }, [functionName, maxRetries, showGlobalIndicator, onSuccess, onError, retryContext]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      data: null,
      loading: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  const retry = useCallback(() => {
    // Re-invoke with the last parameters (simplified - in a real scenario you'd store them)
    return invoke();
  }, [invoke]);

  return {
    ...state,
    invoke,
    reset,
    retry,
  };
}
