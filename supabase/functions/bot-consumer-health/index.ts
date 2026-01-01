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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, subscription_tier')
      .eq('user_id', user.id)
      .single();

    // Get usage stats for the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: usageLogs, error: logsError } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo)
      .ilike('endpoint', '%bot-consumer%');

    const logs = usageLogs || [];
    
    // Calculate stats
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(l => l.status_code === 200).length;
    const failedRequests = logs.filter(l => l.status_code >= 400).length;
    const avgLatency = logs.length > 0 
      ? Math.round(logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length)
      : 0;

    // Get last run
    const lastLog = logs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    // Calculate uptime (simplified - based on successful vs failed requests)
    const uptime = totalRequests > 0 
      ? Math.round((successfulRequests / totalRequests) * 100 * 100) / 100
      : 100;

    // Get credit usage in last 24h
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'deduction')
      .gte('created_at', oneDayAgo);

    const creditsUsed24h = transactions 
      ? Math.abs(transactions.reduce((sum, t) => sum + t.amount, 0))
      : 0;

    const tier = profile?.subscription_tier || 'free';
    const rateLimits: Record<string, number> = {
      free: 5,
      starter: 10,
      growth: 50,
      scale: 500,
      enterprise: 1000,
    };

    return new Response(
      JSON.stringify({
        status: 'operational',
        bot: {
          name: 'BotConsumidorInterno',
          version: '1.0.0',
          uptime: `${uptime}%`,
        },
        user: {
          tier,
          credits: profile?.credits || 0,
          creditsUsed24h,
          rateLimit: `${rateLimits[tier] || 5} rps`,
        },
        performance: {
          totalRequests24h: totalRequests,
          successfulRequests,
          failedRequests,
          errorRate: totalRequests > 0 ? `${((failedRequests / totalRequests) * 100).toFixed(2)}%` : '0%',
          avgLatencyMs: avgLatency,
        },
        lastRun: lastLog?.created_at || null,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BOT-CONSUMER-HEALTH] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
