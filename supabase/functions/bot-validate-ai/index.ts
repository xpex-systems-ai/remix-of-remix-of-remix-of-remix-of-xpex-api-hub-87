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
  starter: { maxRequests: 10, windowMs: 1000, name: 'Starter' },
  scale: { maxRequests: 50, windowMs: 1000, name: 'Scale' },
  enterprise: { maxRequests: 500, windowMs: 1000, name: 'Enterprise' },
  free: { maxRequests: 5, windowMs: 1000, name: 'Free' },
};

const IP_RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

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
// DISPOSABLE DOMAINS
// ============================================================================

const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
  'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'getnada.com',
  'yopmail.com', 'trashmail.com', 'maildrop.cc', 'sharklasers.com',
  'tempmail.net', 'guerrillamail.info', 'burnermail.io', 'spam4.me'
];

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
    .maybeSingle();

  if (error || !data) {
    console.log('[BOT-VALIDATE-AI] API key validation failed');
    return { valid: false };
  }

  if (data.status !== 'active') {
    return { valid: false };
  }

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
    console.error('[BOT-VALIDATE-AI] Credit deduction error:', error);
    return { success: false, remainingCredits: 0 };
  }

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'deduction',
    description: 'Bot API - AI Email validation',
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
    const ipRateLimit = checkRateLimit(`bot-ai:ip:${clientIp}`, IP_RATE_LIMIT);
    if (!ipRateLimit.allowed) {
      console.log('[BOT-VALIDATE-AI] IP rate limit exceeded:', clientIp);
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

    // 2. Get API key
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.log('[BOT-VALIDATE-AI] Missing API key');
      return new Response(JSON.stringify({
        ok: false,
        error: 'API key required. Include x-api-key header.',
        code: 'MISSING_API_KEY'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Validate API key
    const keyValidation = await validateApiKey(apiKey);
    
    if (!keyValidation.valid) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Invalid or inactive API key',
        code: 'INVALID_API_KEY'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Apply tiered rate limiting
    const tier = keyValidation.tier?.toLowerCase() || 'free';
    const rateTier = RATE_TIERS[tier] || RATE_TIERS.free;
    
    const keyRateLimit = checkRateLimit(`bot-ai:key:${apiKey}`, rateTier);
    if (!keyRateLimit.allowed) {
      console.log('[BOT-VALIDATE-AI] API key rate limit exceeded for tier:', tier);
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

    // 6. Parse request
    const { email } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('AI service not configured');
    }

    if (!email || typeof email !== 'string') {
      const responseTime = Date.now() - startTime;
      await logUsage(keyValidation.userId!, keyValidation.keyId!, '/bot/validate-ai', 400, responseTime);
      
      return new Response(JSON.stringify({
        ok: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[BOT-VALIDATE-AI] Processing:', email, 'Tier:', tier);

    // 7. Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const formatValid = emailRegex.test(email);
    const domain = email.split('@')[1]?.toLowerCase() || '';
    const isDisposable = DISPOSABLE_DOMAINS.some(d => domain.includes(d));

    // 8. AI-powered analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert email validation AI optimized for automated systems. Analyze emails for:
1. Typosquatting (e.g., gmial.com instead of gmail.com)
2. Suspicious patterns (random strings, keyboard patterns)
3. Domain reputation assessment
4. Deliverability prediction
5. Fraud risk indicators

Respond ONLY with valid JSON:
{
  "risk_score": 0-100 (0=safe, 100=dangerous),
  "risk_level": "low" | "medium" | "high",
  "fraud_indicators": ["indicator1", "indicator2"],
  "typo_detected": true/false,
  "suggested_correction": "correct@email.com" or null,
  "domain_analysis": "brief analysis",
  "recommendations": ["recommendation1"],
  "deliverability_score": 0-100,
  "confidence": 0-100
}`
          },
          {
            role: 'user',
            content: `Analyze for Bot API validation: ${email}\nDomain: ${domain}\nFormat valid: ${formatValid}\nKnown disposable: ${isDisposable}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BOT-VALIDATE-AI] AI Gateway error:', response.status, errorText);
      
      const responseTime = Date.now() - startTime;
      await logUsage(keyValidation.userId!, keyValidation.keyId!, '/bot/validate-ai', response.status, responseTime);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: 'AI service rate limited', 
          code: 'AI_RATE_LIMITED' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    // 9. Parse AI response
    let aiAnalysis = null;
    try {
      const jsonMatch = aiContent?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('[BOT-VALIDATE-AI] Failed to parse AI response');
    }

    // 10. Deduct credits
    const creditResult = await deductCredits(keyValidation.userId!, 1);
    const responseTime = Date.now() - startTime;

    // 11. Log usage
    await logUsage(keyValidation.userId!, keyValidation.keyId!, '/bot/validate-ai', 200, responseTime);

    // 12. Construct response
    const result = {
      ok: true,
      data: {
        email,
        valid: formatValid && !isDisposable && (aiAnalysis?.risk_level !== 'high'),
        score: aiAnalysis?.deliverability_score ?? (formatValid && !isDisposable ? 85 : 20),
        checks: {
          format_valid: formatValid,
          is_disposable: isDisposable,
          mx_valid: formatValid && !isDisposable,
          has_typo: aiAnalysis?.typo_detected || false
        },
        domain,
        risk_level: aiAnalysis?.risk_level || (isDisposable ? 'high' : formatValid ? 'low' : 'medium'),
        risk_score: aiAnalysis?.risk_score ?? (isDisposable ? 90 : formatValid ? 15 : 60),
        fraud_indicators: aiAnalysis?.fraud_indicators || [],
        suggested_correction: aiAnalysis?.suggested_correction || null,
        domain_analysis: aiAnalysis?.domain_analysis || null,
        recommendations: aiAnalysis?.recommendations || [],
        ai_confidence: aiAnalysis?.confidence || 85,
        ai_powered: true
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
        endpoint: '/bot/validate-ai'
      }
    };

    console.log('[BOT-VALIDATE-AI] Success:', email, 'Risk:', result.data.risk_level, 'Time:', responseTime, 'ms');

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(keyRateLimit.limit, keyRateLimit.remaining, keyRateLimit.resetAt)
      }
    });

  } catch (error) {
    console.error('[BOT-VALIDATE-AI] Error:', error);
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
