import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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

export interface RealtimeUpdate {
  type: "agent" | "decision";
  event: "INSERT" | "UPDATE" | "DELETE";
  timestamp: Date;
}

export function useBrain() {
  const { user, session } = useAuth();
  const [health, setHealth] = useState<BrainHealth | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [decisions, setDecisions] = useState<BrainDecision[]>([]);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const [isLive, setIsLive] = useState(false);
  const toastShownRef = useRef(false);

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

  // Subscribe to real-time updates on agent_registry and brain_decisions
  useEffect(() => {
    if (!user) return;

    const agentChannel = supabase
      .channel("agent_registry_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_registry",
        },
        (payload) => {
          const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          console.log("[Brain] Agent update:", eventType, payload);
          
          setLastUpdate({
            type: "agent",
            event: eventType,
            timestamp: new Date(),
          });
          
          fetchAgents();
          
          if (eventType === "UPDATE") {
            const newRecord = payload.new as AgentInfo;
            if (newRecord.status === "degraded") {
              toast.warning(`Agent ${newRecord.name} is degraded`, {
                description: `Performance: ${(newRecord.performance_score * 100).toFixed(0)}%`,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLive(true);
          if (!toastShownRef.current) {
            toast.success("Real-time updates connected", {
              description: "Agent status will update automatically",
              duration: 2000,
            });
            toastShownRef.current = true;
          }
        }
      });

    const decisionChannel = supabase
      .channel("brain_decisions_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "brain_decisions",
        },
        (payload) => {
          console.log("[Brain] New decision:", payload);
          
          setLastUpdate({
            type: "decision",
            event: "INSERT",
            timestamp: new Date(),
          });
          
          fetchDecisions();
          
          const newDecision = payload.new as BrainDecision;
          toast.info(`New decision: ${newDecision.decision_type}`, {
            description: `Agent: ${newDecision.agent_selected || "N/A"} | Confidence: ${((newDecision.confidence_score || 0) * 100).toFixed(0)}%`,
            duration: 3000,
          });
        }
      )
      .subscribe();

    return () => {
      setIsLive(false);
      supabase.removeChannel(agentChannel);
      supabase.removeChannel(decisionChannel);
    };
  }, [user, fetchAgents, fetchDecisions]);

  return {
    health,
    agents,
    decisions,
    stats,
    loading,
    error,
    refresh,
    fetchDecisions,
    lastUpdate,
    isLive,
  };
}
