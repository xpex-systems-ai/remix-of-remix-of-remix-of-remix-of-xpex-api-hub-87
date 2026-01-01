import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
};

interface WebhookPayload {
  event: string;
  user_id: string;
  data: Record<string, unknown>;
  timestamp: string;
  delivery_id: string;
}

interface RetryResult {
  webhook_id: string;
  success: boolean;
  status_code?: number;
  attempts: number;
  error?: string;
  response_time?: number;
}

// Calculate delay with exponential backoff and jitter
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
  const jitter = cappedDelay * RETRY_CONFIG.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, cappedDelay + jitter);
}

// Generate unique delivery ID for idempotency
function generateDeliveryId(): string {
  return `del_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate HMAC signature
async function generateSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    secretKey,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Check if status code is retryable
function isRetryableStatus(statusCode: number): boolean {
  // Retry on 5xx errors, 429 (rate limit), 408 (timeout)
  return statusCode >= 500 || statusCode === 429 || statusCode === 408;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// Send webhook with retry logic
async function sendWebhookWithRetry(
  webhook: { id: string; url: string; secret: string },
  payload: WebhookPayload,
  eventType: string,
  supabase: SupabaseClient
): Promise<RetryResult> {
  const payloadString = JSON.stringify(payload);
  let lastError: string | undefined;
  let lastStatusCode: number | undefined;
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1);
        console.log(`[RETRY] Attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts} for webhook ${webhook.id} after ${Math.round(delay)}ms delay`);
        await sleep(delay);
      }
      
      const signature = await generateSignature(webhook.secret, payloadString);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventType,
          'X-Webhook-Delivery-Id': payload.delivery_id,
          'X-Webhook-Attempt': String(attempt + 1),
        },
        body: payloadString,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      lastStatusCode = response.status;
      
      if (response.ok) {
        // Success - log and return
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          status_code: response.status,
          success: true,
          response: 'Delivered successfully',
          attempts: attempt + 1,
        });
        
        console.log(`[SUCCESS] Webhook ${webhook.id} delivered on attempt ${attempt + 1}`);
        
        return {
          webhook_id: webhook.id,
          success: true,
          status_code: response.status,
          attempts: attempt + 1,
          response_time: responseTime,
        };
      }
      
      // Check if we should retry
      if (!isRetryableStatus(response.status)) {
        // Non-retryable error
        lastError = await response.text();
        console.log(`[FAILED] Webhook ${webhook.id} returned non-retryable status ${response.status}`);
        break;
      }
      
      lastError = await response.text();
      console.log(`[RETRY-NEEDED] Webhook ${webhook.id} returned ${response.status}, will retry`);
      
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = 'Request timed out after 30 seconds';
      } else {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }
      
      console.log(`[ERROR] Webhook ${webhook.id} attempt ${attempt + 1} failed: ${lastError}`);
      
      // Network errors are retryable
      if (attempt === RETRY_CONFIG.maxAttempts - 1) {
        break;
      }
    }
  }
  
  // All retries exhausted or non-retryable error
  const responseTime = Date.now() - startTime;
  
  await supabase.from('webhook_logs').insert({
    webhook_id: webhook.id,
    event_type: eventType,
    payload,
    status_code: lastStatusCode || null,
    success: false,
    response: `Failed after ${RETRY_CONFIG.maxAttempts} attempts: ${lastError}`,
    attempts: RETRY_CONFIG.maxAttempts,
  });
  
  console.log(`[EXHAUSTED] Webhook ${webhook.id} failed after ${RETRY_CONFIG.maxAttempts} attempts`);
  
  return {
    webhook_id: webhook.id,
    success: false,
    status_code: lastStatusCode,
    attempts: RETRY_CONFIG.maxAttempts,
    error: lastError,
    response_time: responseTime,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { user_id, event_type, data } = body;

    if (!user_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'user_id and event_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BOT-CREDIT-WEBHOOK] Processing ${event_type} for user ${user_id}`);

    // Get user's webhooks that are subscribed to credit events
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true)
      .contains('events', [event_type]);

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch webhooks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`[BOT-CREDIT-WEBHOOK] No webhooks configured for ${event_type}`);
      return new Response(
        JSON.stringify({ message: 'No webhooks configured for this event', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook payload with delivery ID for idempotency
    const deliveryId = generateDeliveryId();
    const payload: WebhookPayload = {
      event: event_type,
      user_id,
      data: {
        ...data,
        source: 'bot-consumer',
      },
      timestamp: new Date().toISOString(),
      delivery_id: deliveryId,
    };

    // Send webhooks with retry logic
    const results = await Promise.all(
      webhooks.map((webhook) => 
        sendWebhookWithRetry(
          { id: webhook.id, url: webhook.url, secret: webhook.secret },
          payload,
          event_type,
          supabase
        )
      )
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);

    console.log(`[BOT-CREDIT-WEBHOOK] Delivered ${successful}/${results.length} webhooks (${totalAttempts} total attempts)`);

    // Also create in-app notification
    await supabase.from('notifications').insert({
      user_id,
      type: event_type.includes('low') || event_type.includes('depleted') ? 'warning' : 'info',
      title: getNotificationTitle(event_type),
      message: getNotificationMessage(event_type, data),
      action_url: '/dashboard?tab=credits',
    });

    return new Response(
      JSON.stringify({
        success: true,
        webhooks_sent: successful,
        webhooks_failed: failed,
        total_attempts: totalAttempts,
        delivery_id: deliveryId,
        event: event_type,
        timestamp: payload.timestamp,
        retry_config: {
          max_attempts: RETRY_CONFIG.maxAttempts,
          backoff: 'exponential',
        },
        details: results.map(r => ({
          webhook_id: r.webhook_id,
          success: r.success,
          attempts: r.attempts,
          status_code: r.status_code,
          error: r.error,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BOT-CREDIT-WEBHOOK] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getNotificationTitle(eventType: string): string {
  const titles: Record<string, string> = {
    'credits.low': 'Low Credit Balance',
    'credits.depleted': 'Credits Depleted',
    'credits.auto_recharge': 'Auto-Recharge Triggered',
    'credits.auto_recharge_failed': 'Auto-Recharge Failed',
    'credits.purchased': 'Credits Purchased',
  };
  return titles[eventType] || 'Credit Update';
}

function getNotificationMessage(eventType: string, data: Record<string, unknown>): string {
  switch (eventType) {
    case 'credits.low':
      return `Your credit balance is low (${data.current_credits} credits remaining). Consider adding more credits to avoid service interruption.`;
    case 'credits.depleted':
      return 'Your credit balance has reached zero. API requests will be blocked until credits are added.';
    case 'credits.auto_recharge':
      return `Auto-recharge triggered: ${data.credits_added} credits added to your account.`;
    case 'credits.auto_recharge_failed':
      return `Auto-recharge failed: ${data.error}. Please check your payment method.`;
    case 'credits.purchased':
      return `Successfully purchased ${data.credits_added} credits.`;
    default:
      return 'Your credit balance has been updated.';
  }
}
