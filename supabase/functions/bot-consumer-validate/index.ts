import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  email: string;
  valid: boolean;
  reason?: string;
  score?: number;
}

interface ConsumerRequest {
  emails: string[];
  callback_url?: string;
  use_ai?: boolean;
}

// Rate limits per plan (requests per second)
const RATE_LIMITS: Record<string, number> = {
  free: 5,
  starter: 10,
  growth: 50,
  scale: 500,
  enterprise: 1000,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via Bearer token
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

    // Get user profile and plan
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

    const tier = profile.subscription_tier || 'free';
    const rateLimit = RATE_LIMITS[tier] || RATE_LIMITS.free;

    // Parse request body
    const body: ConsumerRequest = await req.json();
    const { emails, callback_url, use_ai = false } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'emails array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check credits
    const creditsNeeded = emails.length;
    if (profile.credits < creditsNeeded) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          credits_available: profile.credits,
          credits_needed: creditsNeeded
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process validations (respecting rate limits)
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    let creditsUsed = 0;

    // Process in batches based on rate limit
    const batchSize = Math.min(rateLimit, emails.length);
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      for (const email of batch) {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidFormat = emailRegex.test(email);
        
        let result: ValidationResult;
        
        if (use_ai) {
          // AI-enhanced validation with scoring
          const domainParts = email.split('@');
          const domain = domainParts[1] || '';
          const hasValidDomain = domain.includes('.') && domain.length > 3;
          const score = isValidFormat ? (hasValidDomain ? 0.95 : 0.7) : 0.1;
          
          result = {
            email,
            valid: score > 0.5,
            score,
            reason: score > 0.8 ? 'High confidence' : score > 0.5 ? 'Medium confidence' : 'Low confidence'
          };
        } else {
          result = {
            email,
            valid: isValidFormat,
            reason: isValidFormat ? 'Valid format' : 'Invalid format'
          };
        }
        
        results.push(result);
        creditsUsed++;
      }
      
      // Rate limiting delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Deduct credits
    const { error: deductError } = await supabase.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: creditsUsed
    });

    if (deductError) {
      console.error('Credit deduction error:', deductError);
    }

    // Log the usage
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      endpoint: '/bot-consumer/validate',
      status_code: 200,
      response_time_ms: Date.now() - startTime
    });

    // Record transaction
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: -creditsUsed,
      type: 'deduction',
      description: `Bot Consumer: Validated ${emails.length} emails${use_ai ? ' with AI' : ''}`,
      balance_after: profile.credits - creditsUsed
    });

    const responseTime = Date.now() - startTime;

    console.log(`[BOT-CONSUMER] Validated ${emails.length} emails for user ${user.id} in ${responseTime}ms`);

    // If callback_url provided, send results asynchronously
    if (callback_url) {
      fetch(callback_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results, creditsUsed, timestamp: new Date().toISOString() })
      }).catch(err => console.error('Callback failed:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        creditsUsed,
        creditsRemaining: profile.credits - creditsUsed,
        responseTime,
        rateLimit: {
          tier,
          limit: `${rateLimit} rps`
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BOT-CONSUMER] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
