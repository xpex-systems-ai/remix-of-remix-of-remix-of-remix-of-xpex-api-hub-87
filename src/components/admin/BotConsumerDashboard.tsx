import { useState } from 'react';
import { 
  Bot, 
  Activity, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  TrendingUp,
  Server,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useBotConsumer, BotConsumerLog } from '@/hooks/useBotConsumer';
import { useCredits } from '@/hooks/useCredits';
import { formatDistanceToNow } from 'date-fns';
import { BotAPIPlayground } from './BotAPIPlayground';
import { ScheduledValidations } from './ScheduledValidations';
import { CreditAlertConfig } from './CreditAlertConfig';

export const BotConsumerDashboard = () => {
  const { health, logs, stats, loading, error, refresh } = useBotConsumer();
  const { balance, loading: creditsLoading } = useCredits();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return <BotConsumerSkeleton />;
  }

  if (error) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={refresh} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const uptimePercent = health?.bot?.uptime 
    ? parseFloat(health.bot.uptime.replace('%', '')) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Bot Consumer Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Monitor your internal bot's health, usage, and performance
            </p>
          </div>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Bot Status"
          value={health?.status || 'Unknown'}
          icon={Server}
          status={health?.status === 'operational' ? 'success' : 'warning'}
        />
        <StatusCard
          title="Credits Available"
          value={creditsLoading ? '...' : balance.credits.toLocaleString()}
          icon={CreditCard}
          status={balance.credits < 100 ? 'warning' : 'success'}
          subtitle={`${health?.user?.creditsUsed24h || 0} used today`}
        />
        <StatusCard
          title="Uptime"
          value={health?.bot?.uptime || '100%'}
          icon={TrendingUp}
          status={uptimePercent >= 99 ? 'success' : uptimePercent >= 95 ? 'warning' : 'error'}
        />
        <StatusCard
          title="Rate Limit"
          value={health?.user?.rateLimit || '5 rps'}
          icon={Zap}
          status="info"
          subtitle={`Tier: ${health?.user?.tier || 'free'}`}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="playground">API Playground</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Performance Summary */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Performance (24h)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Requests</span>
                  <span className="font-mono font-medium">
                    {health?.performance?.totalRequests24h || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="font-mono font-medium text-green-500">
                    {health?.performance?.totalRequests24h 
                      ? ((health.performance.successfulRequests / health.performance.totalRequests24h) * 100).toFixed(1)
                      : 100}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Latency</span>
                  <span className="font-mono font-medium">
                    {health?.performance?.avgLatencyMs || 0}ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Error Rate</span>
                  <span className={`font-mono font-medium ${
                    parseFloat(health?.performance?.errorRate || '0') > 5 
                      ? 'text-destructive' 
                      : 'text-green-500'
                  }`}>
                    {health?.performance?.errorRate || '0%'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[180px]">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No recent activity
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {logs.slice(0, 5).map((log) => (
                        <LogEntry key={log.id} log={log} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Bot Info */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Bot Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{health?.bot?.name || 'BotConsumidorInterno'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="font-medium">{health?.bot?.version || '1.0.0'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Run</p>
                  <p className="font-medium">
                    {health?.lastRun 
                      ? formatDistanceToNow(new Date(health.lastRun), { addSuffix: true })
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tier</p>
                  <Badge variant="outline" className="capitalize">
                    {health?.user?.tier || 'free'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Execution Logs</CardTitle>
              <CardDescription>View all bot consumer execution logs</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No logs available
                  </p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <LogEntry key={log.id} log={log} expanded />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playground" className="mt-4">
          <BotAPIPlayground />
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          <ScheduledValidations />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <CreditAlertConfig />
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Stats Summary */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Statistics Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-sm font-medium">
                      {stats?.total 
                        ? ((stats.success / stats.total) * 100).toFixed(1)
                        : 100}%
                    </span>
                  </div>
                  <Progress 
                    value={stats?.total ? (stats.success / stats.total) * 100 : 100} 
                    className="h-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-green-500">{stats?.success || 0}</p>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <XCircle className="w-5 h-5 text-destructive mb-2" />
                    <p className="text-2xl font-bold text-destructive">{stats?.errors || 0}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-5xl font-bold text-primary">
                    {stats?.avgResponseTimeMs || health?.performance?.avgLatencyMs || 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Average Response Time (ms)
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <p className="text-lg font-medium text-green-500">&lt;100ms</p>
                    <p className="text-xs text-muted-foreground">Fast</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-yellow-500">100-500ms</p>
                    <p className="text-xs text-muted-foreground">Normal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-destructive">&gt;500ms</p>
                    <p className="text-xs text-muted-foreground">Slow</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface StatusCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
}

const StatusCard = ({ title, value, icon: Icon, status, subtitle }: StatusCardProps) => {
  const statusColors = {
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    error: 'text-destructive bg-destructive/10',
    info: 'text-primary bg-primary/10',
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className={`p-1.5 rounded-md ${statusColors[status]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};

interface LogEntryProps {
  log: BotConsumerLog;
  expanded?: boolean;
}

const LogEntry = ({ log, expanded = false }: LogEntryProps) => {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-2">
        {log.status === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-destructive" />
        )}
        <div>
          <p className="text-sm font-medium">{log.endpoint}</p>
          {expanded && (
            <p className="text-xs text-muted-foreground">
              Status: {log.statusCode} • {log.responseTimeMs}ms
            </p>
          )}
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
};

const BotConsumerSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-48 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-[400px] rounded-xl" />
  </div>
);

export default BotConsumerDashboard;
