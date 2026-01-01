import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's auto-recharge settings
    const { data: settings } = await supabase
      .from('auto_recharge_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!settings || !settings.enabled) {
      return new Response(
        JSON.stringify({ 
          message: 'Auto-recharge is not enabled for this account',
          enabled: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current credit balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if credits are below threshold
    if (profile.credits >= settings.threshold_credits) {
      return new Response(
        JSON.stringify({
          message: 'Credits are above threshold, no recharge needed',
          currentCredits: profile.credits,
          threshold: settings.threshold_credits,
          recharged: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment method is configured
    if (!settings.stripe_payment_method_id) {
      return new Response(
        JSON.stringify({ 
          error: 'No payment method configured for auto-recharge',
          currentCredits: profile.credits,
          threshold: settings.threshold_credits
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger recharge via auto-recharge function
    const { data: rechargeResult, error: rechargeError } = await supabase.functions.invoke('auto-recharge', {
      body: { user_id: user.id }
    });

    if (rechargeError) {
      console.error('Auto-recharge error:', rechargeError);
      return new Response(
        JSON.stringify({ error: 'Failed to process auto-recharge' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the auto-recharge event
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      endpoint: '/bot-consumer/auto-recharge',
      status_code: 200,
      response_time_ms: 0
    });

    console.log(`[BOT-CONSUMER] Auto-recharge triggered for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto-recharge triggered successfully',
        previousCredits: profile.credits,
        rechargeAmount: settings.recharge_amount,
        package: settings.recharge_package,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BOT-CONSUMER-AUTO-RECHARGE] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
