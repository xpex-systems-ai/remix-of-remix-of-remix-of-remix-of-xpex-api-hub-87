import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Brain,
  Server,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import type { AgentInfo, BrainDecision } from "@/hooks/useBrain";

interface AgentTopologyGraphProps {
  agents: AgentInfo[];
  decisions: BrainDecision[];
  onRefresh?: () => void;
}

interface RoutingEvent {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: Date;
  confidence: number;
  decisionType: string;
}

export function AgentTopologyGraph({ agents, decisions, onRefresh }: AgentTopologyGraphProps) {
  const [routingEvents, setRoutingEvents] = useState<RoutingEvent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track recent routing decisions for animation
  useEffect(() => {
    if (decisions.length > 0) {
      const recentDecisions = decisions.slice(0, 10).map((d) => ({
        id: d.id,
        agentId: d.agent_selected || "",
        agentName: d.agent_selected || "Unknown",
        timestamp: new Date(d.created_at),
        confidence: d.confidence_score,
        decisionType: d.decision_type,
      }));
      setRoutingEvents(recentDecisions);
    }
  }, [decisions]);

  const getAgentPosition = useCallback((index: number, total: number) => {
    const centerX = 50;
    const centerY = 50;
    const radius = 35;
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "border-green-500 bg-green-500/10";
      case "degraded":
        return "border-yellow-500 bg-yellow-500/10";
      case "maintenance":
        return "border-blue-500 bg-blue-500/10";
      default:
        return "border-red-500 bg-red-500/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      default:
        return <XCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const getLoadColor = (load: number) => {
    if (load > 80) return "text-red-500";
    if (load > 60) return "text-yellow-500";
    return "text-green-500";
  };

  const selectedAgentData = selectedAgent 
    ? agents.find((a) => a.id === selectedAgent) 
    : null;

  const recentRoutesToAgent = routingEvents.filter(
    (e) => selectedAgent && e.agentName === selectedAgentData?.name
  );

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Agent Topology
            </CardTitle>
            <CardDescription>
              Real-time agent connections and routing decisions
            </CardDescription>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Topology Visualization */}
          <div 
            ref={containerRef}
            className="lg:col-span-2 relative h-[400px] rounded-lg border bg-muted/20"
          >
            {/* Central Brain Node */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary/10 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                      <Brain className="h-10 w-10 text-primary" />
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {agents.filter((a) => a.status === "active").length}
                      </div>
                      {/* Pulse animation */}
                      <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">XPEX Brain</p>
                    <p className="text-xs text-muted-foreground">
                      Orchestrating {agents.length} agents
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {agents.map((agent, index) => {
                const pos = getAgentPosition(index, agents.length);
                const isRouting = routingEvents.some(
                  (e) => e.agentName === agent.name && 
                  Date.now() - e.timestamp.getTime() < 5000
                );
                return (
                  <g key={`line-${agent.id}`}>
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`${pos.x}%`}
                      y2={`${pos.y}%`}
                      stroke={agent.status === "active" ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                      strokeWidth={isRouting ? 3 : 1.5}
                      strokeOpacity={agent.status === "active" ? 0.4 : 0.2}
                      className={cn(isRouting && "animate-pulse")}
                    />
                    {isRouting && (
                      <circle
                        r="4"
                        fill="hsl(var(--primary))"
                        className="animate-pulse"
                      >
                        <animateMotion
                          dur="1s"
                          repeatCount="indefinite"
                          path={`M ${400 * 0.5} ${400 * 0.5} L ${400 * pos.x / 100} ${400 * pos.y / 100}`}
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Agent Nodes */}
            {agents.map((agent, index) => {
              const pos = getAgentPosition(index, agents.length);
              const loadPercentage = Math.round((agent.current_load / agent.max_load) * 100);
              const isSelected = selectedAgent === agent.id;
              const routeCount = routingEvents.filter((e) => e.agentName === agent.name).length;

              return (
                <TooltipProvider key={agent.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "absolute flex flex-col items-center justify-center rounded-lg border-2 p-2 cursor-pointer transition-all duration-200 hover:scale-110 hover:z-20",
                          getStatusColor(agent.status),
                          isSelected && "ring-2 ring-primary ring-offset-2 scale-110 z-20"
                        )}
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          transform: "translate(-50%, -50%)",
                          minWidth: "80px",
                        }}
                        onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                      >
                        <div className="flex items-center gap-1">
                          <Server className="h-4 w-4" />
                          {getStatusIcon(agent.status)}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[70px]">
                          {agent.name.replace("-agent", "")}
                        </span>
                        <div className="flex items-center gap-1 text-xs">
                          <span className={getLoadColor(loadPercentage)}>
                            {loadPercentage}%
                          </span>
                          {routeCount > 0 && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                              {routeCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px]">
                      <div className="space-y-1">
                        <p className="font-semibold">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.description}</p>
                        <div className="grid grid-cols-2 gap-x-2 text-xs pt-1 border-t">
                          <span>Performance:</span>
                          <span className="font-medium">{(agent.performance_score * 100).toFixed(0)}%</span>
                          <span>Latency:</span>
                          <span className="font-medium">{agent.avg_latency_ms}ms</span>
                          <span>Load:</span>
                          <span className={cn("font-medium", getLoadColor(loadPercentage))}>
                            {agent.current_load}/{agent.max_load}
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Active
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                Degraded
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Inactive
              </div>
            </div>
          </div>

          {/* Agent Details Panel */}
          <div className="space-y-4">
            {selectedAgentData ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{selectedAgentData.name}</CardTitle>
                    <Badge variant={selectedAgentData.status === "active" ? "default" : "secondary"}>
                      {selectedAgentData.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {selectedAgentData.description || "No description"}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Performance</span>
                      <span className="font-medium">
                        {(selectedAgentData.performance_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={selectedAgentData.performance_score * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Load</span>
                      <span className={cn(
                        "font-medium",
                        getLoadColor(Math.round((selectedAgentData.current_load / selectedAgentData.max_load) * 100))
                      )}>
                        {selectedAgentData.current_load}/{selectedAgentData.max_load}
                      </span>
                    </div>
                    <Progress 
                      value={(selectedAgentData.current_load / selectedAgentData.max_load) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="font-medium">{selectedAgentData.avg_latency_ms}ms</span>
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium">{(selectedAgentData.success_rate * 100).toFixed(1)}%</span>
                    <span className="text-muted-foreground">Cost/Call</span>
                    <span className="font-medium">${selectedAgentData.cost_per_call.toFixed(4)}</span>
                  </div>

                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Capabilities</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAgentData.capabilities.map((cap) => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Server className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click an agent node to view details
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recent Routing Events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Live Routing
                </CardTitle>
              </CardHeader>
              <CardContent>
                {routingEvents.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {routingEvents.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-center gap-2 text-xs p-2 rounded border transition-colors",
                          selectedAgent && selectedAgentData?.name === event.agentName
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        )}
                      >
                        <Brain className="h-3 w-3 text-primary shrink-0" />
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{event.agentName}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
                          {(event.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No routing events yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
