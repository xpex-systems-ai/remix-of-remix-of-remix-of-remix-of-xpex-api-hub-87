import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  endpoint: string;
  status: "active" | "inactive" | "degraded" | "maintenance";
  capabilities: string[];
  performance_score: number;
  avg_latency_ms: number;
  cost_per_call: number;
  success_rate: number;
  current_load: number;
  max_load: number;
  created_at: string;
  updated_at: string;
}

export interface BrainDecision {
  id: string;
  user_id: string;
  decision_type: string;
  inputs: Record<string, unknown>;
  decision: Record<string, unknown>;
  confidence_score: number;
  execution_result: Record<string, unknown> | null;
  latency_ms: number;
  risk_assessment: Record<string, unknown> | null;
  agent_selected: string | null;
  created_at: string;
}

export interface BrainHealth {
  status: "healthy" | "degraded" | "critical";
  layer: string;
  version: string;
  uptime_check: string;
  agents: {
    total: number;
    active: number;
    degraded: number;
    inactive: number;
    details: Array<{
      name: string;
      status: string;
      performance_score: number;
      avg_latency_ms: number;
      load_percentage: number;
    }>;
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

export interface BrainStats {
  totalDecisions: number;
  avgConfidence: number;
  avgLatency: number;
  agentDistribution: Record<string, number>;
}

export function useBrain() {
  const { user, session } = useAuth();
  const [health, setHealth] = useState<BrainHealth | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [decisions, setDecisions] = useState<BrainDecision[]>([]);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("brain-health");
      if (error) throw error;
      setHealth(data as BrainHealth);
    } catch (err) {
      console.error("Failed to fetch brain health:", err);
      setError("Failed to fetch brain health");
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("agent_registry")
        .select("*")
        .order("name");

      if (error) throw error;
      
      // Type assertion since the table is newly created
      setAgents((data || []) as unknown as AgentInfo[]);
    } catch (err) {
      console.error("Failed to fetch agents:", err);
      setError("Failed to fetch agents");
    }
  }, [user]);

  const fetchDecisions = useCallback(async (limit = 50) => {
    if (!user || !session) return;

    try {
      const { data, error } = await supabase.functions.invoke("brain-decision-log", {
        body: { limit },
      });

      if (error) throw error;

      setDecisions(data.decisions || []);
      setStats({
        totalDecisions: data.stats.total,
        avgConfidence: data.stats.avg_confidence,
        avgLatency: data.stats.avg_latency_ms,
        agentDistribution: data.stats.agents_selected,
      });
    } catch (err) {
      console.error("Failed to fetch decisions:", err);
    }
  }, [user, session]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchHealth(), fetchAgents(), fetchDecisions()]);
    setLoading(false);
  }, [fetchHealth, fetchAgents, fetchDecisions]);

  useEffect(() => {
    if (user && session) {
      refresh();
    }
  }, [user, session, refresh]);

  // Subscribe to real-time updates on agent_registry
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("agent_registry_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_registry",
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAgents]);

  // Subscribe to real-time updates on brain_decisions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("brain_decisions_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "brain_decisions",
        },
        () => {
          fetchDecisions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDecisions]);

  return {
    health,
    agents,
    decisions,
    stats,
    loading,
    error,
    refresh,
    fetchDecisions,
  };
}
