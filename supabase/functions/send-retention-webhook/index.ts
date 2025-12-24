import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RETENTION-WEBHOOK] ${step}${detailsStr}`);
};

// Event types for retention webhooks
type RetentionEventType = 
  | 'retention.milestone.day_1'
  | 'retention.milestone.day_3'
  | 'retention.milestone.day_7'
  | 'retention.milestone.day_14'
  | 'retention.milestone.day_30'
  | 'retention.milestone.day_60'
  | 'retention.milestone.day_90'
  | 'retention.milestone.day_180'
  | 'retention.milestone.day_365'
  | 'churn.risk.low'
  | 'churn.risk.medium'
  | 'churn.risk.high'
  | 'churn.risk.critical'
  | 'user.reactivated'
  | 'user.resurrected'
  | 'activation.account_created'
  | 'activation.profile_completed'
  | 'activation.first_api_key'
  | 'activation.first_validation'
  | 'activation.first_purchase'
  | 'segment.transition';

interface RetentionWebhookPayload {
  event_type: RetentionEventType;
  user_id: string;
  data: {
    // Milestone data
    milestone_days?: number;
    milestone_type?: string;
    
    // Churn risk data
    risk_score?: number;
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
    risk_factors?: string[];
    days_inactive?: number;
    
    // Reactivation data
    days_since_last_visit?: number;
    is_reactivation?: boolean;
    is_resurrection?: boolean;
    
    // Activation data
    activation_step?: string;
    activation_progress?: number;
    
    // Segment transition data
    from_segment?: string;
    to_segment?: string;
    transition_reason?: string;
    
    // User context
    cohort_week?: string;
    cohort_month?: string;
    subscription_tier?: string;
    total_validations?: number;
    credits_balance?: number;
    email?: string;
    full_name?: string;
  };
}

// Generate HMAC-SHA256 signature
async function generateSignature(
  secret: string,
  timestamp: string,
  body: string
): Promise<string> {
  const encoder = new TextEncoder();
  const signedPayload = `${timestamp}.${body}`;
  const keyData = encoder.encode(secret);
  const message = encoder.encode(signedPayload);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate webhook delivery ID
function generateDeliveryId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.getRandomValues(new Uint8Array(8));
  const randomHex = Array.from(randomPart).map(b => b.toString(16).padStart(2, '0')).join('');
  return `rtw_${timestamp}${randomHex}`;
}

// Map event type to webhook event categories
function getWebhookEventCategory(eventType: RetentionEventType): string[] {
  if (eventType.startsWith('retention.milestone')) {
    return ['retention_milestone', 'retention_events'];
  }
  if (eventType.startsWith('churn.risk')) {
    return ['churn_risk', 'retention_events'];
  }
  if (eventType.startsWith('user.')) {
    return ['user_activity', 'retention_events'];
  }
  if (eventType.startsWith('activation.')) {
    return ['activation_events', 'retention_events'];
  }
  if (eventType.startsWith('segment.')) {
    return ['segment_events', 'retention_events'];
  }
  return ['retention_events'];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Processing retention webhook request");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const payload: RetentionWebhookPayload = await req.json();
    const { event_type, user_id, data } = payload;

    logStep("Received retention event", { event_type, user_id });

    // Get user profile data for enrichment
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Enrich data with profile information
    const enrichedData = {
      ...data,
      email: profile?.email,
      full_name: profile?.full_name,
      subscription_tier: profile?.subscription_tier || 'free',
      credits_balance: profile?.credits || 0,
      cohort_month: profile?.created_at ? new Date(profile.created_at).toISOString().substring(0, 7) : undefined,
    };

    // Find all webhooks subscribed to this event type
    const eventCategories = getWebhookEventCategory(event_type);
    
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from('webhooks')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true);

    if (webhooksError) {
      throw webhooksError;
    }

    logStep("Found user webhooks", { count: webhooks?.length || 0 });

    // Filter webhooks that are subscribed to retention events
    const matchingWebhooks = (webhooks || []).filter(webhook => {
      const webhookEvents = webhook.events || [];
      return eventCategories.some(category => 
        webhookEvents.includes(category) || 
        webhookEvents.includes(event_type) ||
        webhookEvents.includes('all')
      );
    });

    logStep("Matching webhooks for event", { 
      event_type, 
      matchingCount: matchingWebhooks.length 
    });

    const results = [];

    // Send webhook to each matching endpoint
    for (const webhook of matchingWebhooks) {
      const deliveryId = generateDeliveryId();
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const webhookPayload = {
        id: deliveryId,
        event: event_type,
        timestamp: new Date().toISOString(),
        api_version: '2024-01-01',
        data: enrichedData
      };

      const bodyString = JSON.stringify(webhookPayload);
      const signature = await generateSignature(webhook.secret, timestamp, bodyString);
      const signatureHeader = `t=${timestamp},v1=${signature}`;

      try {
        logStep("Sending webhook", { 
          webhook_id: webhook.id, 
          url: webhook.url,
          event_type 
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'XPEX-Retention-Webhook/1.0',
            'X-Webhook-Id': deliveryId,
            'X-Webhook-Signature': signatureHeader,
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Event': event_type,
          },
          body: bodyString,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text().catch(() => '');
        const success = response.ok;

        // Log the delivery
        await supabaseClient
          .from('webhook_logs')
          .insert({
            webhook_id: webhook.id,
            event_type,
            payload: webhookPayload,
            status_code: response.status,
            response: responseText.substring(0, 1000),
            success,
            attempts: 1
          });

        logStep("Webhook sent", { 
          webhook_id: webhook.id, 
          success, 
          status: response.status 
        });

        results.push({
          webhook_id: webhook.id,
          delivery_id: deliveryId,
          success,
          status: response.status
        });

      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        
        logStep("Webhook failed", { 
          webhook_id: webhook.id, 
          error: errorMessage 
        });

        // Log failed delivery
        await supabaseClient
          .from('webhook_logs')
          .insert({
            webhook_id: webhook.id,
            event_type,
            payload: { id: deliveryId, event: event_type, data: enrichedData },
            status_code: null,
            response: errorMessage,
            success: false,
            attempts: 1
          });

        results.push({
          webhook_id: webhook.id,
          delivery_id: deliveryId,
          success: false,
          error: errorMessage
        });
      }
    }

    // Also create an in-app notification for important events
    if (event_type.startsWith('churn.risk.high') || event_type.startsWith('churn.risk.critical')) {
      await supabaseClient
        .from('notifications')
        .insert({
          user_id,
          title: '⚠️ Churn Risk Detected',
          message: `A user in your account shows ${data.risk_level} churn risk (${data.days_inactive} days inactive).`,
          type: 'churn_alert',
          action_url: '/dashboard',
          read: false
        });
    }

    // Create notification for milestone achievements
    if (event_type.startsWith('retention.milestone')) {
      const milestoneLabel = data.milestone_days === 365 ? '1 year' : 
                            data.milestone_days === 180 ? '6 months' :
                            data.milestone_days === 90 ? '3 months' :
                            `${data.milestone_days} days`;
      
      await supabaseClient
        .from('notifications')
        .insert({
          user_id,
          title: '🎉 Retention Milestone',
          message: `Congratulations! You've been active for ${milestoneLabel}.`,
          type: 'milestone',
          action_url: '/dashboard',
          read: false
        });
    }

    logStep("Retention webhook processing complete", { 
      event_type,
      webhooks_sent: results.length,
      successful: results.filter(r => r.success).length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_type,
        webhooks_triggered: results.length,
        results 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error processing retention webhook", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
