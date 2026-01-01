import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  user_id: string;
  data: Record<string, unknown>;
  timestamp: string;
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

    // Prepare webhook payload
    const payload: WebhookPayload = {
      event: event_type,
      user_id,
      data: {
        ...data,
        source: 'bot-consumer',
      },
      timestamp: new Date().toISOString(),
    };

    // Send webhooks
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const startTime = Date.now();
        
        try {
          // Create HMAC signature
          const encoder = new TextEncoder();
          const secretKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(webhook.secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          
          const payloadString = JSON.stringify(payload);
          const signature = await crypto.subtle.sign(
            'HMAC',
            secretKey,
            encoder.encode(payloadString)
          );
          
          const signatureHex = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signatureHex,
              'X-Webhook-Event': event_type,
            },
            body: payloadString,
          });

          const responseTime = Date.now() - startTime;

          // Log webhook delivery
          await supabase.from('webhook_logs').insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            status_code: response.status,
            success: response.ok,
            response: response.ok ? 'Delivered' : await response.text(),
          });

          return {
            webhook_id: webhook.id,
            success: response.ok,
            status_code: response.status,
            response_time: responseTime,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Log failed delivery
          await supabase.from('webhook_logs').insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            success: false,
            response: errorMessage,
          });

          return {
            webhook_id: webhook.id,
            success: false,
            error: errorMessage,
          };
        }
      })
    );

    const successful = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;

    console.log(`[BOT-CREDIT-WEBHOOK] Sent ${successful}/${results.length} webhooks for ${event_type}`);

    // Also create in-app notification
    await supabase.from('notifications').insert({
      user_id,
      type: event_type.includes('low') ? 'warning' : 'info',
      title: getNotificationTitle(event_type),
      message: getNotificationMessage(event_type, data),
      action_url: '/dashboard?tab=credits',
    });

    return new Response(
      JSON.stringify({
        success: true,
        webhooks_sent: successful,
        webhooks_failed: failed,
        event: event_type,
        timestamp: payload.timestamp,
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
