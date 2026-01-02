import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentHealth {
  name: string;
  status: string;
  performance_score: number;
  avg_latency_ms: number;
  current_load: number;
  max_load: number;
  load_percentage: number;
}

interface BrainHealth {
  status: "healthy" | "degraded" | "critical";
  layer: "XPEX_BRAIN";
  version: string;
  uptime_check: string;
  agents: {
    total: number;
    active: number;
    degraded: number;
    inactive: number;
    details: AgentHealth[];
  };
  decisions: {
    last_24h: number;
    avg_latency_ms: number;
    success_rate: number;
  };
  config: {
    loaded: boolean;
    keys: string[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch agents status
    const { data: agents, error: agentsError } = await supabase
      .from("agent_registry")
      .select("name, status, performance_score, avg_latency_ms, current_load, max_load");

    if (agentsError) {
      throw new Error(`Failed to fetch agents: ${agentsError.message}`);
    }

    const agentDetails: AgentHealth[] = (agents || []).map((agent) => ({
      name: agent.name,
      status: agent.status,
      performance_score: agent.performance_score,
      avg_latency_ms: agent.avg_latency_ms,
      current_load: agent.current_load,
      max_load: agent.max_load,
      load_percentage: Math.round((agent.current_load / agent.max_load) * 100),
    }));

    const activeAgents = agentDetails.filter((a) => a.status === "active").length;
    const degradedAgents = agentDetails.filter((a) => a.status === "degraded").length;
    const inactiveAgents = agentDetails.filter(
      (a) => a.status === "inactive" || a.status === "maintenance"
    ).length;

    // Fetch decision stats for last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: decisions, error: decisionsError } = await supabase
      .from("brain_decisions")
      .select("latency_ms, confidence_score")
      .gte("created_at", twentyFourHoursAgo);

    let decisionStats = {
      last_24h: 0,
      avg_latency_ms: 0,
      success_rate: 0,
    };

    if (!decisionsError && decisions?.length) {
      const totalLatency = decisions.reduce((sum, d) => sum + (d.latency_ms || 0), 0);
      const successfulDecisions = decisions.filter((d) => d.confidence_score > 0.5).length;

      decisionStats = {
        last_24h: decisions.length,
        avg_latency_ms: Math.round(totalLatency / decisions.length),
        success_rate: Math.round((successfulDecisions / decisions.length) * 100),
      };
    }

    // Fetch config
    const { data: configData, error: configError } = await supabase
      .from("brain_config")
      .select("config_key");

    const configKeys = configData?.map((c) => c.config_key) || [];

    // Determine overall health status
    let overallStatus: "healthy" | "degraded" | "critical" = "healthy";

    if (activeAgents === 0) {
      overallStatus = "critical";
    } else if (degradedAgents > 0 || activeAgents < agentDetails.length * 0.5) {
      overallStatus = "degraded";
    }

    const health: BrainHealth = {
      status: overallStatus,
      layer: "XPEX_BRAIN",
      version: "2.0.0",
      uptime_check: new Date().toISOString(),
      agents: {
        total: agentDetails.length,
        active: activeAgents,
        degraded: degradedAgents,
        inactive: inactiveAgents,
        details: agentDetails,
      },
      decisions: decisionStats,
      config: {
        loaded: !configError && configKeys.length > 0,
        keys: configKeys,
      },
    };

    return new Response(JSON.stringify(health), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Brain health check error:", error);
    return new Response(
      JSON.stringify({
        status: "critical",
        layer: "XPEX_BRAIN",
        error: error instanceof Error ? error.message : "Health check failed",
        uptime_check: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
