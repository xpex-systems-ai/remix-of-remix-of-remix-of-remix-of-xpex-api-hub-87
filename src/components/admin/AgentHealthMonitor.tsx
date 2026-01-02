import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Activity,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AgentInfo } from "@/hooks/useBrain";

interface AgentHealthMonitorProps {
  agents: AgentInfo[];
  onAgentUpdate?: () => void;
}

interface FailoverEvent {
  id: string;
  fromAgent: string;
  toAgent: string;
  reason: string;
  timestamp: Date;
  automatic: boolean;
}

interface HealthThresholds {
  performanceThreshold: number;
  loadThreshold: number;
  latencyThreshold: number;
  autoFailoverEnabled: boolean;
}

const DEFAULT_THRESHOLDS: HealthThresholds = {
  performanceThreshold: 0.7,
  loadThreshold: 90,
  latencyThreshold: 500,
  autoFailoverEnabled: true,
};

export function AgentHealthMonitor({ agents, onAgentUpdate }: AgentHealthMonitorProps) {
  const [thresholds, setThresholds] = useState<HealthThresholds>(DEFAULT_THRESHOLDS);
  const [failoverEvents, setFailoverEvents] = useState<FailoverEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Identify agents that need attention
  const getAgentHealth = useCallback((agent: AgentInfo) => {
    const loadPercentage = (agent.current_load / agent.max_load) * 100;
    const issues: string[] = [];
    
    if (agent.performance_score < thresholds.performanceThreshold) {
      issues.push(`Low performance: ${(agent.performance_score * 100).toFixed(0)}%`);
    }
    if (loadPercentage > thresholds.loadThreshold) {
      issues.push(`High load: ${loadPercentage.toFixed(0)}%`);
    }
    if (agent.avg_latency_ms > thresholds.latencyThreshold) {
      issues.push(`High latency: ${agent.avg_latency_ms}ms`);
    }
    
    return {
      healthy: issues.length === 0 && agent.status === "active",
      issues,
      severity: issues.length >= 2 ? "critical" : issues.length === 1 ? "warning" : "healthy",
    };
  }, [thresholds]);

  const unhealthyAgents = agents.filter((a) => !getAgentHealth(a).healthy);
  const criticalAgents = agents.filter((a) => getAgentHealth(a).severity === "critical");

  // Automatic failover logic
  const performFailover = useCallback(async (fromAgent: AgentInfo, reason: string) => {
    // Find best alternative agent
    const alternatives = agents
      .filter((a) => a.id !== fromAgent.id && a.status === "active")
      .sort((a, b) => {
        const scoreA = a.performance_score * 0.4 + (1 - a.current_load / a.max_load) * 0.3 + (1 - a.avg_latency_ms / 1000) * 0.3;
        const scoreB = b.performance_score * 0.4 + (1 - b.current_load / b.max_load) * 0.3 + (1 - b.avg_latency_ms / 1000) * 0.3;
        return scoreB - scoreA;
      });

    if (alternatives.length === 0) {
      toast.error(`No healthy agents available for failover from ${fromAgent.name}`);
      return;
    }

    const toAgent = alternatives[0];

    try {
      // Update the unhealthy agent status to degraded
      const { error } = await supabase
        .from("agent_registry")
        .update({ status: "degraded" })
        .eq("id", fromAgent.id);

      if (error) throw error;

      // Record failover event
      const event: FailoverEvent = {
        id: crypto.randomUUID(),
        fromAgent: fromAgent.name,
        toAgent: toAgent.name,
        reason,
        timestamp: new Date(),
        automatic: true,
      };

      setFailoverEvents((prev) => [event, ...prev].slice(0, 20));
      toast.success(`Failover: ${fromAgent.name} → ${toAgent.name}`, {
        description: reason,
      });

      onAgentUpdate?.();
    } catch (err) {
      console.error("Failover failed:", err);
      toast.error("Failover failed", {
        description: "Could not update agent status",
      });
    }
  }, [agents, onAgentUpdate]);

  // Health check interval
  useEffect(() => {
    if (!isMonitoring || !thresholds.autoFailoverEnabled) return;

    const checkHealth = () => {
      setLastCheck(new Date());
      
      for (const agent of agents) {
        const health = getAgentHealth(agent);
        
        if (health.severity === "critical" && agent.status === "active") {
          const reason = health.issues.join(", ");
          performFailover(agent, reason);
        }
      }
    };

    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [agents, isMonitoring, thresholds.autoFailoverEnabled, getAgentHealth, performFailover]);

  const handleRecoverAgent = async (agent: AgentInfo) => {
    try {
      const { error } = await supabase
        .from("agent_registry")
        .update({ status: "active" })
        .eq("id", agent.id);

      if (error) throw error;

      toast.success(`${agent.name} recovered`, {
        description: "Agent is now active",
      });

      onAgentUpdate?.();
    } catch (err) {
      console.error("Recovery failed:", err);
      toast.error("Recovery failed");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Health Monitoring
            </CardTitle>
            <CardDescription>
              Automatic failover and agent health tracking
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                id="monitoring"
                checked={isMonitoring}
                onCheckedChange={setIsMonitoring}
              />
              <Label htmlFor="monitoring" className="text-xs">
                Active
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-500/5 border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-lg font-bold">{agents.length - unhealthyAgents.length}</div>
              <div className="text-xs text-muted-foreground">Healthy</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <div className="text-lg font-bold">{unhealthyAgents.length - criticalAgents.length}</div>
              <div className="text-xs text-muted-foreground">Warning</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-red-500/5 border-red-500/20">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-lg font-bold">{criticalAgents.length}</div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="bg-muted/20">
            <CardContent className="pt-4 space-y-4">
              <h4 className="text-sm font-medium">Failover Thresholds</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="perf-threshold" className="text-xs">
                    Min Performance Score
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="perf-threshold"
                      type="number"
                      min={0}
                      max={100}
                      value={thresholds.performanceThreshold * 100}
                      onChange={(e) =>
                        setThresholds((prev) => ({
                          ...prev,
                          performanceThreshold: Number(e.target.value) / 100,
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="load-threshold" className="text-xs">
                    Max Load
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="load-threshold"
                      type="number"
                      min={0}
                      max={100}
                      value={thresholds.loadThreshold}
                      onChange={(e) =>
                        setThresholds((prev) => ({
                          ...prev,
                          loadThreshold: Number(e.target.value),
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="latency-threshold" className="text-xs">
                    Max Latency
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="latency-threshold"
                      type="number"
                      min={0}
                      value={thresholds.latencyThreshold}
                      onChange={(e) =>
                        setThresholds((prev) => ({
                          ...prev,
                          latencyThreshold: Number(e.target.value),
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">ms</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch
                    id="auto-failover"
                    checked={thresholds.autoFailoverEnabled}
                    onCheckedChange={(checked) =>
                      setThresholds((prev) => ({
                        ...prev,
                        autoFailoverEnabled: checked,
                      }))
                    }
                  />
                  <Label htmlFor="auto-failover" className="text-xs">
                    Auto Failover
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unhealthy Agents Alert */}
        {unhealthyAgents.length > 0 && (
          <Alert variant={criticalAgents.length > 0 ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Agents Require Attention</AlertTitle>
            <AlertDescription className="space-y-2">
              {unhealthyAgents.map((agent) => {
                const health = getAgentHealth(agent);
                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <span className="font-medium">{agent.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {health.issues.join(" • ")}
                      </p>
                    </div>
                    {agent.status === "degraded" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecoverAgent(agent)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Recover
                      </Button>
                    )}
                  </div>
                );
              })}
            </AlertDescription>
          </Alert>
        )}

        {/* Agent Health Grid */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Agent Health Status
          </h4>
          <div className="grid gap-2">
            {agents.map((agent) => {
              const health = getAgentHealth(agent);
              const loadPercentage = (agent.current_load / agent.max_load) * 100;

              return (
                <div
                  key={agent.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    health.severity === "critical" && "border-red-500/50 bg-red-500/5",
                    health.severity === "warning" && "border-yellow-500/50 bg-yellow-500/5",
                    health.severity === "healthy" && "border-green-500/20 bg-green-500/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {health.severity === "healthy" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {health.severity === "warning" && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    {health.severity === "critical" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <span className="font-medium text-sm">{agent.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Perf: {(agent.performance_score * 100).toFixed(0)}%</span>
                        <span>•</span>
                        <span>Load: {loadPercentage.toFixed(0)}%</span>
                        <span>•</span>
                        <span>{agent.avg_latency_ms}ms</span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      agent.status === "active"
                        ? "default"
                        : agent.status === "degraded"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {agent.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Failover History */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Failover History
          </h4>
          {failoverEvents.length > 0 ? (
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {failoverEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 p-2 rounded border text-sm"
                  >
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="destructive" className="text-xs">
                        {event.fromAgent}
                      </Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge variant="default" className="text-xs">
                        {event.toAgent}
                      </Badge>
                    </div>
                    {event.automatic && (
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        Auto
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No failover events recorded
            </p>
          )}
        </div>

        {/* Last Check Info */}
        {lastCheck && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3 w-3" />
            Last check: {lastCheck.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
