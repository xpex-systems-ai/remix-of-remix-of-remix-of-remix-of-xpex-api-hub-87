import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DecisionLogQuery {
  limit?: number;
  offset?: number;
  decision_type?: string;
  start_date?: string;
  end_date?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const query: DecisionLogQuery = {
      limit: parseInt(url.searchParams.get("limit") || "50"),
      offset: parseInt(url.searchParams.get("offset") || "0"),
      decision_type: url.searchParams.get("decision_type") || undefined,
      start_date: url.searchParams.get("start_date") || undefined,
      end_date: url.searchParams.get("end_date") || undefined,
    };

    // Build query
    let dbQuery = supabase
      .from("brain_decisions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(query.offset!, query.offset! + query.limit! - 1);

    if (query.decision_type) {
      dbQuery = dbQuery.eq("decision_type", query.decision_type);
    }

    if (query.start_date) {
      dbQuery = dbQuery.gte("created_at", query.start_date);
    }

    if (query.end_date) {
      dbQuery = dbQuery.lte("created_at", query.end_date);
    }

    const { data: decisions, error: decisionsError, count } = await dbQuery;

    if (decisionsError) {
      throw new Error(`Failed to fetch decisions: ${decisionsError.message}`);
    }

    // Calculate aggregate stats
    const stats = {
      total: count || 0,
      avg_confidence: 0,
      avg_latency_ms: 0,
      decision_types: {} as Record<string, number>,
      agents_selected: {} as Record<string, number>,
    };

    if (decisions?.length) {
      const totalConfidence = decisions.reduce((sum, d) => sum + (d.confidence_score || 0), 0);
      const totalLatency = decisions.reduce((sum, d) => sum + (d.latency_ms || 0), 0);

      stats.avg_confidence = Math.round((totalConfidence / decisions.length) * 1000) / 1000;
      stats.avg_latency_ms = Math.round(totalLatency / decisions.length);

      decisions.forEach((d) => {
        if (d.decision_type) {
          stats.decision_types[d.decision_type] = (stats.decision_types[d.decision_type] || 0) + 1;
        }
        if (d.agent_selected) {
          stats.agents_selected[d.agent_selected] =
            (stats.agents_selected[d.agent_selected] || 0) + 1;
        }
      });
    }

    return new Response(
      JSON.stringify({
        decisions: decisions || [],
        stats,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total: count || 0,
          has_more: (query.offset! + (decisions?.length || 0)) < (count || 0),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Decision log error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to fetch decision logs",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
