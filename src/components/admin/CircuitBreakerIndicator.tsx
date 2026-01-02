import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Activity,
  Zap,
  Clock,
  TrendingDown,
  RefreshCw
} from "lucide-react";
import { AgentInfo } from "@/hooks/useBrain";
import { cn } from "@/lib/utils";

type CircuitState = "closed" | "half-open" | "open";

interface CircuitBreakerState {
  agentId: string;
  agentName: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailure: Date | null;
  recoveryProgress: number;
  metrics: {
    successRate: number;
    avgLatency: number;
    performanceScore: number;
  };
}

interface CircuitBreakerIndicatorProps {
  agents: AgentInfo[];
}

function calculateCircuitState(agent: AgentInfo): CircuitBreakerState {
  // Determine circuit state based on agent metrics
  let state: CircuitState = "closed";
  let failureCount = 0;
  let recoveryProgress = 100;

  const successRate = agent.success_rate ?? 100;
  const performanceScore = agent.performance_score ?? 1;

  // Circuit opens when success rate drops below 80% or status is not active
  if (agent.status === "inactive" || successRate < 50) {
    state = "open";
    failureCount = Math.round((100 - successRate) / 10);
    recoveryProgress = 0;
  } else if (agent.status === "degraded" || successRate < 80 || performanceScore < 0.7) {
    state = "half-open";
    failureCount = Math.round((100 - successRate) / 20);
    recoveryProgress = Math.round(successRate - 50) * 2; // 50-100% maps to 0-100%
  } else {
    state = "closed";
    failureCount = 0;
    recoveryProgress = 100;
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    state,
    failureCount,
    successCount: Math.round(successRate / 10),
    lastFailure: state !== "closed" ? new Date() : null,
    recoveryProgress,
    metrics: {
      successRate,
      avgLatency: agent.avg_latency_ms ?? 0,
      performanceScore: performanceScore * 100,
    },
  };
}

function CircuitIcon({ state }: { state: CircuitState }) {
  switch (state) {
    case "closed":
      return <ShieldCheck className="h-5 w-5 text-green-500" />;
    case "half-open":
      return <ShieldAlert className="h-5 w-5 text-yellow-500 animate-pulse" />;
    case "open":
      return <ShieldX className="h-5 w-5 text-red-500" />;
  }
}

function CircuitBadge({ state }: { state: CircuitState }) {
  const variants = {
    closed: "bg-green-500/10 text-green-500 border-green-500/20",
    "half-open": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    open: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const labels = {
    closed: "Closed",
    "half-open": "Half-Open",
    open: "Open",
  };

  return (
    <Badge variant="outline" className={cn("font-mono text-xs", variants[state])}>
      {labels[state]}
    </Badge>
  );
}

function CircuitCard({ circuit }: { circuit: CircuitBreakerState }) {
  const stateColors = {
    closed: "border-green-500/30",
    "half-open": "border-yellow-500/30",
    open: "border-red-500/30",
  };

  return (
    <Card className={cn("relative overflow-hidden", stateColors[circuit.state])}>
      {/* Animated background for non-closed states */}
      {circuit.state !== "closed" && (
        <div 
          className={cn(
            "absolute inset-0 opacity-5",
            circuit.state === "open" ? "bg-red-500" : "bg-yellow-500"
          )}
        />
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircuitIcon state={circuit.state} />
            <CardTitle className="text-base">{circuit.agentName}</CardTitle>
          </div>
          <CircuitBadge state={circuit.state} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-md bg-muted/50">
                  <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{circuit.metrics.successRate.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Success</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Success rate over recent requests</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-md bg-muted/50">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{circuit.metrics.avgLatency}ms</div>
                  <div className="text-xs text-muted-foreground">Latency</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Average response latency</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-md bg-muted/50">
                  <Zap className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{circuit.metrics.performanceScore.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Overall performance score</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Recovery Progress (for non-closed states) */}
        {circuit.state !== "closed" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                Recovery Progress
              </span>
              <span className="font-medium">{circuit.recoveryProgress}%</span>
            </div>
            <Progress 
              value={circuit.recoveryProgress} 
              className={cn(
                "h-1.5",
                circuit.state === "open" ? "[&>div]:bg-red-500" : "[&>div]:bg-yellow-500"
              )}
            />
          </div>
        )}

        {/* Failure info */}
        {circuit.failureCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <span>{circuit.failureCount} consecutive failures detected</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CircuitBreakerIndicator({ agents }: CircuitBreakerIndicatorProps) {
  const [circuits, setCircuits] = useState<CircuitBreakerState[]>([]);

  useEffect(() => {
    const circuitStates = agents.map(calculateCircuitState);
    setCircuits(circuitStates);
  }, [agents]);

  const openCount = circuits.filter((c) => c.state === "open").length;
  const halfOpenCount = circuits.filter((c) => c.state === "half-open").length;
  const closedCount = circuits.filter((c) => c.state === "closed").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Circuit Breaker Status
            </CardTitle>
            <CardDescription>
              Real-time circuit state for each agent based on failure history
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {closedCount} Closed
            </Badge>
            {halfOpenCount > 0 && (
              <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                {halfOpenCount} Half-Open
              </Badge>
            )}
            {openCount > 0 && (
              <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-500 border-red-500/20">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {openCount} Open
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {circuits.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {circuits.map((circuit) => (
              <CircuitCard key={circuit.agentId} circuit={circuit} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No agents registered yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
