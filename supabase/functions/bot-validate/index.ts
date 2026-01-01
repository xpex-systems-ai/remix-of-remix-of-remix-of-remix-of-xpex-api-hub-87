import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================================================
// BOT API - TIERED RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateTier {
  maxRequests: number;
  windowMs: number;
  name: string;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Tiered rate limits based on subscription plan
const RATE_TIERS: Record<string, RateTier> = {
  starter: { maxRequests: 10, windowMs: 1000, name: 'Starter' },      // 10 rps
  scale: { maxRequests: 50, windowMs: 1000, name: 'Scale' },          // 50 rps
  enterprise: { maxRequests: 500, windowMs: 1000, name: 'Enterprise' }, // 500 rps (custom)
  free: { maxRequests: 5, windowMs: 1000, name: 'Free' },             // 5 rps
};

// IP-based rate limit for abuse protection
const IP_RATE_LIMIT = { maxRequests: 100, windowMs: 60 * 1000 }; // 100 per minute

function checkRateLimit(identifier: string, config: { maxRequests: number; windowMs: number }): { 
  allowed: boolean; 
  remaining: number; 
  resetAt: number;
  limit: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (entry && now >= entry.resetAt) {
    rateLimitStore.delete(identifier);
  }

  const currentEntry = rateLimitStore.get(identifier);

  if (!currentEntry) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt, limit: config.maxRequests };
  }

  if (currentEntry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: currentEntry.resetAt, limit: config.maxRequests };
  }

  currentEntry.count++;
  return { 
    allowed: true, 
    remaining: config.maxRequests - currentEntry.count, 
    resetAt: currentEntry.resetAt,
    limit: config.maxRequests 
  };
}

function getRateLimitHeaders(limit: number, remaining: number, resetAt: number) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
    'X-Bot-API-Version': '1.0.0',
  };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

const disposableDomains = [
  'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
  'temp-mail.org', '10minutemail.com', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'sharklasers.com', 'spam4.me', 'burnermail.io', 'tempinbox.com'
];

const domainTypos: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahho.com': 'yahoo.com',
};

function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function checkDisposable(domain: string): boolean {
  return disposableDomains.includes(domain.toLowerCase());
}

function checkTypo(domain: string): string | null {
  return domainTypos[domain.toLowerCase()] || null;
}

function calculateScore(checks: {
  formatValid: boolean;
  isDisposable: boolean;
  hasTypo: boolean;
  mxValid: boolean;
}): number {
  let score = 0;
  if (checks.formatValid) score += 30;
  if (!checks.isDisposable) score += 25;
  if (!checks.hasTypo) score += 20;
  if (checks.mxValid) score += 25;
  return score;
}

// ============================================================================
// API KEY & CREDITS
// ============================================================================

async function validateApiKey(apiKey: string): Promise<{ 
  valid: boolean; 
  userId?: string; 
  keyId?: string; 
  credits?: number;
  tier?: string;
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, status')
    .eq('key', apiKey)
    .single();

  if (error || !data) {
    console.log('[BOT-VALIDATE] API key validation failed:', error?.message || 'Key not found');
    return { valid: false };
  }

  if (data.status !== 'active') {
    console.log('[BOT-VALIDATE] API key is not active');
    return { valid: false };
  }

  // Get user profile with credits and tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits, subscription_tier')
    .eq('user_id', data.user_id)
    .single();

  return { 
    valid: true, 
    userId: data.user_id, 
    keyId: data.id, 
    credits: profile?.credits ?? 0,
    tier: profile?.subscription_tier ?? 'free'
  };
}

async function deductCredits(userId: string, amount: number = 1): Promise<{ success: boolean; remainingCredits: number }> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  const { data: newCredits, error } = await supabase.rpc('deduct_credits', { 
    p_user_id: userId, 
    p_amount: amount 
  });

  if (error || newCredits < 0) {
    console.error('[BOT-VALIDATE] Credit deduction error:', error);
    return { success: false, remainingCredits: 0 };
  }

  // Log transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'deduction',
    description: 'Bot API - Email validation',
    balance_after: newCredits
  });

  return { success: true, remainingCredits: newCredits };
}

async function logUsage(userId: string, apiKeyId: string, endpoint: string, statusCode: number, responseTimeMs: number) {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  await supabase.from('usage_logs').insert({
    user_id: userId,
    api_key_id: apiKeyId,
    endpoint,
    status_code: statusCode,
    response_time_ms: responseTimeMs
  });

  await supabase.rpc('increment_api_key_calls', { key_id: apiKeyId });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);

  try {
    // 1. IP-based abuse protection
    const ipRateLimit = checkRateLimit(`bot:ip:${clientIp}`, IP_RATE_LIMIT);
    if (!ipRateLimit.allowed) {
      console.log('[BOT-VALIDATE] IP rate limit exceeded:', clientIp);
      return new Response(JSON.stringify({
        ok: false,
        error: 'Too many requests from this IP',
        code: 'IP_RATE_LIMIT_EXCEEDED',
        retry_after_seconds: Math.ceil((ipRateLimit.resetAt - Date.now()) / 1000)
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(ipRateLimit.limit, 0, ipRateLimit.resetAt)
        }
      });
    }

    // 2. Get API key from header
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.log('[BOT-VALIDATE] Missing API key');
      return new Response(JSON.stringify({
        ok: false,
        error: 'API key required. Include x-api-key header.',
        code: 'MISSING_API_KEY'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Validate API key and get user tier
    const keyValidation = await validateApiKey(apiKey);
    
    if (!keyValidation.valid) {
      console.log('[BOT-VALIDATE] Invalid API key');
      return new Response(JSON.stringify({
        ok: false,
        error: 'Invalid or inactive API key',
        code: 'INVALID_API_KEY'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Apply tiered rate limiting based on subscription
    const tier = keyValidation.tier?.toLowerCase() || 'free';
    const rateTier = RATE_TIERS[tier] || RATE_TIERS.free;
    
    const keyRateLimit = checkRateLimit(`bot:key:${apiKey}`, rateTier);
    if (!keyRateLimit.allowed) {
      console.log('[BOT-VALIDATE] API key rate limit exceeded for tier:', tier);
      return new Response(JSON.stringify({
        ok: false,
        error: `Rate limit exceeded for ${rateTier.name} tier (${rateTier.maxRequests} req/s)`,
        code: 'RATE_LIMIT_EXCEEDED',
        tier: rateTier.name,
        retry_after_seconds: Math.ceil((keyRateLimit.resetAt - Date.now()) / 1000)
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(keyRateLimit.limit, 0, keyRateLimit.resetAt)
        }
      });
    }

    // 5. Check credits
    if ((keyValidation.credits ?? 0) < 1) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        credits_required: 1,
        credits_available: keyValidation.credits ?? 0
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6. Parse request body
    const { email } = await req.json();
    
    if (!email) {
      const responseTime = Date.now() - startTime;
      await logUsage(keyValidation.userId!, keyValidation.keyId!, '/bot/validate', 400, responseTime);
      
      return new Response(JSON.stringify({
        ok: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[BOT-VALIDATE] Processing:', email, 'Tier:', tier);

    // 7. Perform validation
    const formatValid = validateEmailFormat(email);
    const domain = email.split('@')[1] || '';
    const isDisposable = checkDisposable(domain);
    const typoSuggestion = checkTypo(domain);
    
    const commonDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'protonmail.com'];
    const mxValid = commonDomains.includes(domain.toLowerCase()) || !isDisposable;

    const score = calculateScore({
      formatValid,
      isDisposable,
      hasTypo: !!typoSuggestion,
      mxValid
    });

    // 8. Deduct credits
    const creditResult = await deductCredits(keyValidation.userId!, 1);

    const responseTime = Date.now() - startTime;

    const result = {
      ok: true,
      data: {
        email,
        valid: formatValid && !isDisposable && score >= 50,
        score,
        checks: {
          format_valid: formatValid,
          is_disposable: isDisposable,
          mx_valid: mxValid,
          has_typo: !!typoSuggestion
        },
        suggestion: typoSuggestion ? email.replace(domain, typoSuggestion) : null,
        risk_level: score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high'
      },
      meta: {
        credits_used: 1,
        remaining_credits: creditResult.remainingCredits,
        response_time_ms: responseTime,
        tier: rateTier.name,
        rate_limit: {
          limit: keyRateLimit.limit,
          remaining: keyRateLimit.remaining,
          reset_at: new Date(keyRateLimit.resetAt).toISOString()
        },
        api_version: '1.0.0',
        endpoint: '/bot/validate'
      }
    };

    // 9. Log successful usage
    await logUsage(keyValidation.userId!, keyValidation.keyId!, '/bot/validate', 200, responseTime);

    console.log('[BOT-VALIDATE] Success:', email, 'Score:', score, 'Time:', responseTime, 'ms');

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(keyRateLimit.limit, keyRateLimit.remaining, keyRateLimit.resetAt)
      }
    });

  } catch (error) {
    console.error('[BOT-VALIDATE] Error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: (error as Error).message,
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
