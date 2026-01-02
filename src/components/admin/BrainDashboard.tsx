import { useState } from "react";
import { useBrain } from "@/hooks/useBrain";
import { useCredits } from "@/hooks/useCredits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Activity,
  Zap,
  Server,
  RefreshCw,
  Clock,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";

export default function BrainDashboard() {
  const { health, agents, decisions, stats, loading, error, refresh } = useBrain();
  const { balance } = useCredits();
  const credits = balance?.credits ?? 0;
  const [activeTab, setActiveTab] = useState("overview");

  if (loading) {
    return <BrainDashboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Brain Layer Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            XPEX Brain Layer
          </h2>
          <p className="text-muted-foreground">
            Strategic orchestration and intelligent decision making
          </p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Brain Status"
          value={health?.status || "Unknown"}
          icon={Brain}
          status={health?.status || "critical"}
          subtitle={`v${health?.version || "2.0.0"}`}
        />
        <StatusCard
          title="Active Agents"
          value={`${health?.agents.active || 0}/${health?.agents.total || 0}`}
          icon={Server}
          status={health?.agents.active === health?.agents.total ? "healthy" : "degraded"}
          subtitle={`${health?.agents.degraded || 0} degraded`}
        />
        <StatusCard
          title="Decisions (24h)"
          value={health?.decisions.last_24h?.toString() || "0"}
          icon={Zap}
          status="healthy"
          subtitle={`${health?.decisions.avg_latency_ms || 0}ms avg latency`}
        />
        <StatusCard
          title="Credits"
          value={credits?.toString() || "0"}
          icon={TrendingUp}
          status={credits && credits > 100 ? "healthy" : credits && credits > 10 ? "degraded" : "critical"}
          subtitle="Available balance"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="decisions">Decision Log</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Agent Status Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Agent Fleet Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health?.agents.details.map((agent) => (
                  <AgentStatusRow key={agent.name} agent={agent} />
                ))}
              </CardContent>
            </Card>

            {/* Configuration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Config Loaded</span>
                  <Badge variant={health?.config.loaded ? "default" : "destructive"}>
                    {health?.config.loaded ? "Active" : "Failed"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Active Policies:</span>
                  <div className="flex flex-wrap gap-2">
                    {health?.config.keys.map((key) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium">{health?.decisions.success_rate || 0}%</span>
                  </div>
                  <Progress value={health?.decisions.success_rate || 0} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Decisions Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Decisions
              </CardTitle>
              <CardDescription>Latest orchestration decisions made by the Brain</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {decisions.length > 0 ? (
                  <div className="space-y-2">
                    {decisions.slice(0, 5).map((decision) => (
                      <DecisionRow key={decision.id} decision={decision} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No decisions recorded yet
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Decision Audit Log</CardTitle>
              <CardDescription>
                Complete audit trail of all orchestration decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {decisions.length > 0 ? (
                  <div className="space-y-3">
                    {decisions.map((decision) => (
                      <DecisionDetailRow key={decision.id} decision={decision} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No decisions recorded yet
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Decision Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.avgLatency || 0}ms</div>
                <p className="text-xs text-muted-foreground">Target: &lt;100ms P95</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((stats?.avgConfidence || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Target: &gt;99.5%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalDecisions || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>

          {stats?.agentDistribution && Object.keys(stats.agentDistribution).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Agent Selection Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.agentDistribution).map(([agent, count]) => {
                    const percentage = Math.round((count / (stats?.totalDecisions || 1)) * 100);
                    return (
                      <div key={agent} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{agent}</span>
                          <span className="text-muted-foreground">{count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusCard({
  title,
  value,
  icon: Icon,
  status,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  status: "healthy" | "degraded" | "critical" | string;
  subtitle: string;
}) {
  const statusColors = {
    healthy: "text-green-500",
    degraded: "text-yellow-500",
    critical: "text-red-500",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${statusColors[status as keyof typeof statusColors] || "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold capitalize">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function AgentStatusRow({ agent }: { agent: { name: string; status: string; load_percentage: number; performance_score: number } }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {getStatusIcon(agent.status)}
        <span className="text-sm font-medium">{agent.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-xs text-muted-foreground">
          Load: {agent.load_percentage}%
        </div>
        <Badge variant={agent.status === "active" ? "default" : "secondary"}>
          {(agent.performance_score * 100).toFixed(0)}%
        </Badge>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: { id: string; name: string; description: string | null; status: string; capabilities: string[]; performance_score: number; avg_latency_ms: number; current_load: number; max_load: number } }) {
  const loadPercentage = Math.round((agent.current_load / agent.max_load) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{agent.name}</CardTitle>
          <Badge variant={agent.status === "active" ? "default" : "secondary"}>
            {agent.status}
          </Badge>
        </div>
        <CardDescription>{agent.description || "No description"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.map((cap) => (
            <Badge key={cap} variant="outline" className="text-xs">
              {cap}
            </Badge>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Performance</span>
            <span className="font-medium">{(agent.performance_score * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Latency</span>
            <span className="font-medium">{agent.avg_latency_ms}ms</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Load</span>
              <span className="font-medium">{loadPercentage}%</span>
            </div>
            <Progress value={loadPercentage} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionRow({ decision }: { decision: { id: string; decision_type: string; agent_selected: string | null; confidence_score: number; latency_ms: number; created_at: string } }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{decision.decision_type}</span>
        <span className="text-xs text-muted-foreground">→ {decision.agent_selected || "N/A"}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{(decision.confidence_score * 100).toFixed(0)}%</span>
        <span>{decision.latency_ms}ms</span>
        <span>{format(new Date(decision.created_at), "HH:mm:ss")}</span>
      </div>
    </div>
  );
}

function DecisionDetailRow({ decision }: { decision: { id: string; decision_type: string; inputs: Record<string, unknown>; decision: Record<string, unknown>; agent_selected: string | null; confidence_score: number; latency_ms: number; risk_assessment: Record<string, unknown> | null; created_at: string } }) {
  const risk = decision.risk_assessment as { level?: string } | null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{decision.decision_type}</Badge>
            <span className="text-sm text-muted-foreground">
              {format(new Date(decision.created_at), "PPp")}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Agent: </span>
            <span className="font-medium">{decision.agent_selected || "N/A"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={risk?.level === "low" ? "default" : risk?.level === "medium" ? "secondary" : "destructive"}>
            {risk?.level || "unknown"} risk
          </Badge>
          <Badge variant="outline">
            {(decision.confidence_score * 100).toFixed(1)}%
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {decision.latency_ms}ms
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function BrainDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
