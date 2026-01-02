import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface AgentInfo {
  id: string;
  name: string;
  endpoint: string;
  performance_score: number;
  avg_latency_ms: number;
  cost_per_call: number;
  current_load: number;
  max_load: number;
  status: string;
}

interface OrchestrationRequest {
  task_type: string;
  payload: Record<string, unknown>;
  priority?: "low" | "medium" | "high" | "critical";
  user_context?: Record<string, unknown>;
}

interface OrchestrationDecision {
  selected_agent: string;
  confidence_score: number;
  routing_factors: Record<string, number>;
  fallback_agents: string[];
  estimated_latency_ms: number;
  risk_assessment: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key required", code: "MISSING_API_KEY" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key
    const { data: keyValidation, error: keyError } = await supabase.rpc(
      "validate_api_key_extended",
      { p_key: apiKey }
    );

    if (keyError || !keyValidation?.[0]?.valid) {
      return new Response(
        JSON.stringify({ error: "Invalid API key", code: "INVALID_API_KEY" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = keyValidation[0].user_id;

    // Parse request
    const body: OrchestrationRequest = await req.json();
    const { task_type, payload, priority = "medium", user_context = {} } = body;

    if (!task_type) {
      return new Response(
        JSON.stringify({ error: "task_type is required", code: "MISSING_TASK_TYPE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch available agents
    const { data: agents, error: agentsError } = await supabase
      .from("agent_registry")
      .select("*")
      .eq("status", "active");

    if (agentsError || !agents?.length) {
      return new Response(
        JSON.stringify({ error: "No agents available", code: "NO_AGENTS" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch brain config
    const { data: configData } = await supabase
      .from("brain_config")
      .select("config_key, config_value");

    const config: Record<string, unknown> = {};
    configData?.forEach((c) => {
      config[c.config_key] = c.config_value;
    });

    // Make orchestration decision
    const decision = makeOrchestrationDecision(
      agents as AgentInfo[],
      task_type,
      priority,
      config
    );

    const latencyMs = Date.now() - startTime;

    // Log decision to brain_decisions table
    await supabase.from("brain_decisions").insert({
      user_id: userId,
      decision_type: "agent_routing",
      inputs: { task_type, priority, user_context, payload_keys: Object.keys(payload) },
      decision: {
        selected_agent: decision.selected_agent,
        fallback_agents: decision.fallback_agents,
        routing_factors: decision.routing_factors,
      },
      confidence_score: decision.confidence_score,
      latency_ms: latencyMs,
      risk_assessment: decision.risk_assessment,
      agent_selected: decision.selected_agent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        decision: {
          agent: decision.selected_agent,
          endpoint: agents.find((a) => a.name === decision.selected_agent)?.endpoint,
          confidence: decision.confidence_score,
          estimated_latency_ms: decision.estimated_latency_ms,
          fallbacks: decision.fallback_agents,
        },
        risk: decision.risk_assessment,
        meta: {
          decision_latency_ms: latencyMs,
          routing_factors: decision.routing_factors,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Brain orchestration error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        code: "ORCHESTRATION_ERROR",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function makeOrchestrationDecision(
  agents: AgentInfo[],
  taskType: string,
  priority: string,
  config: Record<string, unknown>
): OrchestrationDecision {
  // Weight factors based on priority
  const weights = getWeightsForPriority(priority);

  // Score each agent
  const scoredAgents = agents.map((agent) => {
    const loadRatio = agent.current_load / agent.max_load;
    const availabilityScore = 1 - loadRatio;
    const performanceScore = agent.performance_score;
    const latencyScore = 1 - Math.min(agent.avg_latency_ms / 1000, 1);
    const costScore = 1 - Math.min(agent.cost_per_call / 10, 1);

    const totalScore =
      weights.performance * performanceScore +
      weights.availability * availabilityScore +
      weights.latency * latencyScore +
      weights.cost * costScore;

    return {
      ...agent,
      score: totalScore,
      factors: {
        performance: performanceScore,
        availability: availabilityScore,
        latency: latencyScore,
        cost: costScore,
      },
    };
  });

  // Sort by score
  scoredAgents.sort((a, b) => b.score - a.score);

  const selected = scoredAgents[0];
  const fallbacks = scoredAgents.slice(1, 4).map((a) => a.name);

  // Risk assessment
  const riskFactors: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";

  if (selected.factors.availability < 0.3) {
    riskFactors.push("high_agent_load");
    riskLevel = "medium";
  }
  if (selected.factors.performance < 0.9) {
    riskFactors.push("degraded_performance");
    riskLevel = riskLevel === "medium" ? "high" : "medium";
  }
  if (fallbacks.length < 2) {
    riskFactors.push("limited_fallbacks");
  }

  return {
    selected_agent: selected.name,
    confidence_score: Math.min(selected.score, 0.9999),
    routing_factors: selected.factors,
    fallback_agents: fallbacks,
    estimated_latency_ms: selected.avg_latency_ms,
    risk_assessment: {
      level: riskLevel,
      factors: riskFactors,
    },
  };
}

function getWeightsForPriority(priority: string): Record<string, number> {
  switch (priority) {
    case "critical":
      return { performance: 0.5, availability: 0.3, latency: 0.15, cost: 0.05 };
    case "high":
      return { performance: 0.4, availability: 0.3, latency: 0.2, cost: 0.1 };
    case "medium":
      return { performance: 0.3, availability: 0.25, latency: 0.25, cost: 0.2 };
    case "low":
      return { performance: 0.2, availability: 0.2, latency: 0.2, cost: 0.4 };
    default:
      return { performance: 0.3, availability: 0.25, latency: 0.25, cost: 0.2 };
  }
}
