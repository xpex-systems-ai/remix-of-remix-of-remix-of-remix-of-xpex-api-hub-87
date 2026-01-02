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

interface ExecuteRequest {
  task_type: string;
  payload: Record<string, unknown>;
  priority?: "low" | "medium" | "high" | "critical";
  user_context?: Record<string, unknown>;
  execute?: boolean;
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
    const body: ExecuteRequest = await req.json();
    const { task_type, payload, priority = "medium", user_context = {}, execute = true } = body;

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

    const selectedAgent = agents.find((a) => a.name === decision.selected_agent);
    
    if (!selectedAgent) {
      return new Response(
        JSON.stringify({ error: "Selected agent not found", code: "AGENT_NOT_FOUND" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let executionResult = null;
    let executionError = null;
    let executionLatency = 0;

    // Execute the task if requested
    if (execute) {
      const execStartTime = Date.now();
      
      try {
        // Update agent load before execution
        await supabase
          .from("agent_registry")
          .update({ current_load: selectedAgent.current_load + 1 })
          .eq("id", selectedAgent.id);

        // Execute the agent endpoint
        const agentResponse = await executeAgent(
          selectedAgent.endpoint,
          payload,
          userId,
          apiKey
        );

        executionLatency = Date.now() - execStartTime;
        executionResult = agentResponse;

        // Update agent metrics
        await updateAgentMetrics(supabase, selectedAgent.id, executionLatency, true);
      } catch (err) {
        executionLatency = Date.now() - execStartTime;
        executionError = err instanceof Error ? err.message : "Execution failed";

        // Update agent metrics for failure
        await updateAgentMetrics(supabase, selectedAgent.id, executionLatency, false);

        console.error("Agent execution error:", err);
      } finally {
        // Decrease agent load
        await supabase
          .from("agent_registry")
          .update({ 
            current_load: Math.max(0, selectedAgent.current_load) 
          })
          .eq("id", selectedAgent.id);
      }
    }

    const totalLatency = Date.now() - startTime;

    // Log the complete decision with execution result
    await supabase.from("brain_decisions").insert({
      user_id: userId,
      decision_type: execute ? "agent_execution" : "agent_routing",
      inputs: { task_type, priority, user_context, payload_keys: Object.keys(payload) },
      decision: {
        selected_agent: decision.selected_agent,
        fallback_agents: decision.fallback_agents,
        routing_factors: decision.routing_factors,
      },
      confidence_score: decision.confidence_score,
      latency_ms: totalLatency,
      risk_assessment: decision.risk_assessment,
      agent_selected: decision.selected_agent,
      execution_result: execute ? {
        success: !executionError,
        latency_ms: executionLatency,
        error: executionError,
        result_preview: executionResult ? "completed" : null,
      } : null,
    });

    const response: Record<string, unknown> = {
      success: !executionError,
      decision: {
        agent: decision.selected_agent,
        endpoint: selectedAgent.endpoint,
        confidence: decision.confidence_score,
        fallbacks: decision.fallback_agents,
      },
      risk: decision.risk_assessment,
      meta: {
        decision_latency_ms: totalLatency - executionLatency,
        total_latency_ms: totalLatency,
      },
    };

    if (execute) {
      response.execution = {
        success: !executionError,
        latency_ms: executionLatency,
        result: executionResult,
        error: executionError,
      };
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: executionError ? 500 : 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Brain execute error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        code: "EXECUTE_ERROR",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeAgent(
  endpoint: string,
  payload: Record<string, unknown>,
  userId: string,
  apiKey: string
): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  
  // Check if it's an internal edge function
  if (endpoint.startsWith("/")) {
    const url = `${supabaseUrl}/functions/v1${endpoint}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ ...payload, _brain_user_id: userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent returned ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  // External endpoint
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Agent returned ${response.status}: ${errorText}`);
  }

  return await response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateAgentMetrics(
  supabase: any,
  agentId: string,
  latencyMs: number,
  success: boolean
): Promise<void> {
  try {
    const { data: agent } = await supabase
      .from("agent_registry")
      .select("avg_latency_ms, success_rate, performance_score")
      .eq("id", agentId)
      .single();

    if (!agent) return;

    const agentData = agent as { avg_latency_ms: number; success_rate: number; performance_score: number };

    // Calculate new rolling averages (simplified exponential moving average)
    const alpha = 0.1;
    const newAvgLatency = agentData.avg_latency_ms * (1 - alpha) + latencyMs * alpha;
    const successValue = success ? 1 : 0;
    const newSuccessRate = (agentData.success_rate || 0.99) * (1 - alpha) + successValue * alpha;
    
    // Performance score combines latency and success rate
    const latencyScore = 1 - Math.min(newAvgLatency / 1000, 1);
    const newPerformanceScore = (latencyScore * 0.4 + newSuccessRate * 0.6);

    await supabase
      .from("agent_registry")
      .update({
        avg_latency_ms: Math.round(newAvgLatency),
        success_rate: Math.round(newSuccessRate * 10000) / 10000,
        performance_score: Math.round(newPerformanceScore * 10000) / 10000,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);
  } catch (err) {
    console.error("Failed to update agent metrics:", err);
  }
}

function makeOrchestrationDecision(
  agents: AgentInfo[],
  taskType: string,
  priority: string,
  config: Record<string, unknown>
): OrchestrationDecision {
  const weights = getWeightsForPriority(priority);

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

  scoredAgents.sort((a, b) => b.score - a.score);

  const selected = scoredAgents[0];
  const fallbacks = scoredAgents.slice(1, 4).map((a) => a.name);

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
