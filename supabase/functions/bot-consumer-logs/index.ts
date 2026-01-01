import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogsQuery {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
  status?: 'success' | 'error' | 'all';
}

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

    // Parse query parameters
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const status = url.searchParams.get('status') || 'all';

    // Build query
    let query = supabase
      .from('usage_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .or('endpoint.ilike.%bot-consumer%,endpoint.ilike.%bot-validate%')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (status === 'success') {
      query = query.eq('status_code', 200);
    } else if (status === 'error') {
      query = query.gte('status_code', 400);
    }

    const { data: logs, count, error: logsError } = await query;

    if (logsError) {
      console.error('Logs query error:', logsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch logs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enrich logs with additional info
    const enrichedLogs = (logs || []).map(log => ({
      id: log.id,
      endpoint: log.endpoint,
      status: log.status_code === 200 ? 'success' : 'error',
      statusCode: log.status_code,
      responseTimeMs: log.response_time_ms,
      createdAt: log.created_at,
      apiKeyId: log.api_key_id,
    }));

    // Calculate summary stats
    const successCount = enrichedLogs.filter(l => l.status === 'success').length;
    const errorCount = enrichedLogs.filter(l => l.status === 'error').length;
    const avgResponseTime = enrichedLogs.length > 0
      ? Math.round(enrichedLogs.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / enrichedLogs.length)
      : 0;

    return new Response(
      JSON.stringify({
        logs: enrichedLogs,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit,
        },
        summary: {
          total: enrichedLogs.length,
          success: successCount,
          errors: errorCount,
          avgResponseTimeMs: avgResponseTime,
        },
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BOT-CONSUMER-LOGS] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
