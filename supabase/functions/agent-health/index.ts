import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const startTime = Date.now();

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latency_ms: number;
  message?: string;
}

interface AgentHealthResponse {
  ok: boolean;
  status: 'operational' | 'degraded' | 'outage';
  timestamp: string;
  version: string;
  uptime_seconds: number;
  services: ServiceStatus[];
  endpoints: {
    path: string;
    method: string;
    status: 'available' | 'unavailable';
    cost: number;
  }[];
  rate_limits: {
    tier: string;
    requests_per_second: number;
  }[];
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return {
        name: 'database',
        status: 'outage',
        latency_ms: latency,
        message: error.message,
      };
    }
    
    return {
      name: 'database',
      status: latency > 1000 ? 'degraded' : 'operational',
      latency_ms: latency,
      message: latency > 1000 ? 'High latency' : 'Connected',
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'outage',
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

async function checkAIService(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableKey) {
      return {
        name: 'ai_service',
        status: 'outage',
        latency_ms: 0,
        message: 'AI service not configured',
      };
    }
    
    const latency = Date.now() - start;
    
    return {
      name: 'ai_service',
      status: 'operational',
      latency_ms: latency,
      message: 'AI service configured',
    };
  } catch (error) {
    return {
      name: 'ai_service',
      status: 'outage',
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Check failed',
    };
  }
}

async function checkMXResolver(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    const response = await fetch('https://cloudflare-dns.com/dns-query?name=gmail.com&type=MX', {
      headers: { 'Accept': 'application/dns-json' }
    });
    
    const latency = Date.now() - start;
    
    if (!response.ok) {
      return {
        name: 'mx_resolver',
        status: 'outage',
        latency_ms: latency,
        message: 'Cloudflare DNS not responding',
      };
    }
    
    return {
      name: 'mx_resolver',
      status: latency > 500 ? 'degraded' : 'operational',
      latency_ms: latency,
      message: 'MX resolution operational',
    };
  } catch (error) {
    return {
      name: 'mx_resolver',
      status: 'outage',
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'DNS check failed',
    };
  }
}

function checkRuntime(): ServiceStatus {
  const start = Date.now();
  
  return {
    name: 'runtime',
    status: 'operational',
    latency_ms: Date.now() - start,
    message: 'Edge runtime operational',
  };
}

serve(async (req) => {
  console.log('[AGENT-HEALTH] Health check requested');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const [database, aiService, mxResolver] = await Promise.all([
      checkDatabase(),
      checkAIService(),
      checkMXResolver(),
    ]);

    const runtime = checkRuntime();
    const services = [database, aiService, mxResolver, runtime];
    
    let overallStatus: 'operational' | 'degraded' | 'outage' = 'operational';
    if (services.some(s => s.status === 'outage')) {
      overallStatus = 'outage';
    } else if (services.some(s => s.status === 'degraded')) {
      overallStatus = 'degraded';
    }

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    const response: AgentHealthResponse = {
      ok: overallStatus !== 'outage',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime_seconds: uptimeSeconds,
      services,
      endpoints: [
        { path: '/agent/validate', method: 'POST', status: 'available', cost: 1 },
        { path: '/agent/validate-ai', method: 'POST', status: 'available', cost: 1 },
        { path: '/agent/health', method: 'GET', status: 'available', cost: 0 },
      ],
      rate_limits: [
        { tier: 'Free', requests_per_second: 5 },
        { tier: 'Starter', requests_per_second: 10 },
        { tier: 'Growth', requests_per_second: 50 },
        { tier: 'Enterprise', requests_per_second: 500 },
      ],
    };

    console.log('[AGENT-HEALTH] Check completed:', overallStatus);

    const httpStatus = overallStatus === 'outage' ? 503 : 200;

    return new Response(JSON.stringify(response, null, 2), {
      status: httpStatus,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Agent-API-Version': '1.0.0',
      },
    });
  } catch (error) {
    console.error('[AGENT-HEALTH] Check failed:', error);
    
    return new Response(JSON.stringify({
      ok: false,
      status: 'outage',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: error instanceof Error ? error.message : 'Health check failed',
      services: [],
      endpoints: [],
      rate_limits: [],
    }), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
