import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditAlertConfig {
  thresholds: number[];
  email_enabled: boolean;
  in_app_enabled: boolean;
}

const DEFAULT_THRESHOLDS = [1000, 500, 100, 50, 10];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { user_id, current_credits, previous_credits } = body;

    if (!user_id || current_credits === undefined) {
      return new Response(
        JSON.stringify({ error: 'user_id and current_credits are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BOT-CREDIT-ALERT-EMAIL] Checking alerts for user ${user_id}, credits: ${current_credits}`);

    // Get user's alert settings
    const { data: alertSettings } = await supabase
      .from('alert_thresholds')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Get user's notification preferences
    const { data: notifPrefs } = await supabase
      .from('notification_preferences')
      .select('email_enabled, in_app_enabled, usage_alerts')
      .eq('user_id', user_id)
      .single();

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user_id)
      .single();

    if (!profile?.email) {
      console.log(`[BOT-CREDIT-ALERT-EMAIL] No email found for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: 'No email configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if alerts are enabled
    const emailEnabled = notifPrefs?.email_enabled !== false && notifPrefs?.usage_alerts !== false;
    const inAppEnabled = notifPrefs?.in_app_enabled !== false && notifPrefs?.usage_alerts !== false;

    // Determine which thresholds have been crossed
    const thresholds = DEFAULT_THRESHOLDS;
    const crossedThresholds = thresholds.filter(threshold => 
      (previous_credits === undefined || previous_credits > threshold) && current_credits <= threshold
    );

    if (crossedThresholds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No threshold crossed', alerts_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lowestThreshold = Math.min(...crossedThresholds);
    console.log(`[BOT-CREDIT-ALERT-EMAIL] Crossed threshold ${lowestThreshold} for user ${user_id}`);

    // Check if we've already sent an alert for this threshold recently (within 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAlerts } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user_id)
      .eq('type', 'warning')
      .ilike('title', '%Credit%')
      .gte('created_at', oneDayAgo);

    if (recentAlerts && recentAlerts.length > 0) {
      console.log(`[BOT-CREDIT-ALERT-EMAIL] Alert already sent recently for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: 'Alert already sent recently', alerts_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const alertsSent: string[] = [];

    // Create in-app notification
    if (inAppEnabled) {
      const severity = lowestThreshold <= 10 ? 'critical' : lowestThreshold <= 100 ? 'warning' : 'info';
      
      await supabase.from('notifications').insert({
        user_id,
        type: severity === 'critical' ? 'error' : 'warning',
        title: severity === 'critical' ? 'Critical: Credits Almost Depleted!' : 'Low Credit Balance Warning',
        message: `Your credit balance has dropped to ${current_credits} credits. ${
          lowestThreshold <= 10 
            ? 'Your API access will be blocked when credits reach zero.'
            : 'Consider adding more credits to avoid service interruption.'
        }`,
        action_url: '/credits',
      });
      alertsSent.push('in_app');
    }

    // Send email alert
    if (emailEnabled && resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const severity = lowestThreshold <= 10 ? 'critical' : lowestThreshold <= 100 ? 'warning' : 'info';
      const userName = profile.full_name || 'User';

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credit Alert - XPEX Neural</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="font-size: 28px; margin: 0; background: linear-gradient(90deg, #00d4ff, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
        XPEX Neural
      </h1>
    </div>

    <!-- Alert Card -->
    <div style="background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; padding: 32px; border: 1px solid ${severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#00d4ff'}40;">
      
      <!-- Alert Icon & Title -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%; background: ${severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#00d4ff'}20; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 32px;">${severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
        </div>
        <h2 style="font-size: 24px; margin: 0; color: ${severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#00d4ff'};">
          ${severity === 'critical' ? 'Critical: Credits Almost Depleted!' : 'Low Credit Balance Warning'}
        </h2>
      </div>

      <!-- Message -->
      <p style="font-size: 16px; line-height: 1.6; color: #a0aec0; margin-bottom: 24px; text-align: center;">
        Hi ${userName},<br><br>
        Your XPEX Neural credit balance has dropped to <strong style="color: #ffffff;">${current_credits} credits</strong>.
        ${severity === 'critical' 
          ? '<br><br><strong style="color: #ef4444;">Your API access will be blocked when credits reach zero.</strong>'
          : '<br><br>Consider adding more credits to avoid service interruption.'}
      </p>

      <!-- Credit Display -->
      <div style="background: #0a0a1a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; font-weight: bold; color: ${severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#00d4ff'};">
          ${current_credits}
        </div>
        <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
          Credits Remaining
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="https://xpexneural.com/credits" 
           style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #00d4ff, #a855f7); color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Add Credits Now
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #2a2a3e;">
      <p style="font-size: 12px; color: #6b7280; margin: 0;">
        You're receiving this because you have credit alerts enabled.<br>
        <a href="https://xpexneural.com/dashboard?tab=settings" style="color: #00d4ff; text-decoration: none;">Manage notification preferences</a>
      </p>
      <p style="font-size: 12px; color: #4a5568; margin: 16px 0 0;">
        © ${new Date().getFullYear()} XPEX Neural. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

      try {
        await resend.emails.send({
          from: 'XPEX Neural <alerts@xpexneural.com>',
          to: profile.email,
          subject: severity === 'critical' 
            ? `🚨 Critical: Only ${current_credits} credits remaining!`
            : `⚠️ Low Credit Alert: ${current_credits} credits remaining`,
          html: emailHtml,
        });
        alertsSent.push('email');
        console.log(`[BOT-CREDIT-ALERT-EMAIL] Email sent to ${profile.email}`);
      } catch (emailError) {
        console.error('[BOT-CREDIT-ALERT-EMAIL] Email send error:', emailError);
      }
    }

    // Trigger webhook notification
    await supabase.functions.invoke('bot-credit-webhook', {
      body: {
        user_id,
        event_type: lowestThreshold <= 10 ? 'credits.depleted' : 'credits.low',
        data: {
          current_credits,
          threshold: lowestThreshold,
          timestamp: new Date().toISOString(),
        }
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        threshold_crossed: lowestThreshold,
        alerts_sent: alertsSent,
        current_credits,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BOT-CREDIT-ALERT-EMAIL] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
