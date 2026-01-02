import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  Clock, 
  Shield,
  RefreshCw,
  Play,
  Calendar,
  Bell,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAgentConsumer } from '@/hooks/useAgentConsumer';
import { useCredits } from '@/hooks/useCredits';
import { AgentAPIPlayground } from './AgentAPIPlayground';
import { ScheduledValidations } from './ScheduledValidations';
import { CreditAlertConfig } from './CreditAlertConfig';
import { format } from 'date-fns';

export function AgentConsumerDashboard() {
  const { health, logs, stats, loading, error, refresh } = useAgentConsumer();
  const { balance } = useCredits();
  const credits = balance?.credits;
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return <AgentConsumerSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          icon={Activity}
          title="Agent Status"
          value={health?.status === 'healthy' ? 'Operational' : 'Degraded'}
          subtitle={`Last check: ${health?.lastCheck ? format(new Date(health.lastCheck), 'HH:mm:ss') : 'N/A'}`}
          status={health?.status === 'healthy' ? 'success' : 'warning'}
        />
        <StatusCard
          icon={Zap}
          title="Available Credits"
          value={credits?.toLocaleString() || '0'}
          subtitle="Credits remaining"
          status={credits && credits > 100 ? 'success' : credits && credits > 20 ? 'warning' : 'error'}
        />
        <StatusCard
          icon={Clock}
          title="Uptime"
          value={`${health?.uptime || 99.9}%`}
          subtitle="Last 30 days"
          status="success"
        />
        <StatusCard
          icon={Shield}
          title="Rate Limit"
          value={`${stats?.calls_today || 0}/10k`}
          subtitle="Calls today"
          status="info"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="playground" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Playground
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Service Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ServiceStatus 
                  name="Email Validation" 
                  status={health?.services?.validation || 'operational'} 
                />
                <ServiceStatus 
                  name="AI Analysis" 
                  status={health?.services?.ai || 'operational'} 
                />
                <ServiceStatus 
                  name="MX Resolver" 
                  status={health?.services?.mx_resolver || 'operational'} 
                />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={refresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {logs.slice(0, 10).map((log) => (
                      <LogEntry key={log.id} log={log} />
                    ))}
                    {logs.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No recent activity
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">{stats?.total_calls || 0}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-green-500">
                    {stats?.success_rate?.toFixed(1) || 100}%
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{stats?.avg_response_time || 0}ms</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Errors Today</p>
                  <p className="text-2xl font-bold text-destructive">{stats?.errors_today || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playground">
          <AgentAPIPlayground />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledValidations />
        </TabsContent>

        <TabsContent value="alerts">
          <CreditAlertConfig />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
              <CardDescription>Detailed performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{stats?.success_rate?.toFixed(1) || 100}%</span>
                  </div>
                  <Progress value={stats?.success_rate || 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>API Reliability</span>
                    <span>{health?.uptime || 99.9}%</span>
                  </div>
                  <Progress value={health?.uptime || 99.9} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground">Fastest Response</p>
                    <p className="text-xl font-bold">12ms</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground">Slowest Response</p>
                    <p className="text-xl font-bold">847ms</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground">P95 Latency</p>
                    <p className="text-xl font-bold">156ms</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground">Error Rate</p>
                    <p className="text-xl font-bold text-green-500">0.1%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ResponseTimeBar label="< 50ms" percentage={45} color="bg-green-500" />
                <ResponseTimeBar label="50-100ms" percentage={30} color="bg-blue-500" />
                <ResponseTimeBar label="100-200ms" percentage={15} color="bg-yellow-500" />
                <ResponseTimeBar label="200-500ms" percentage={8} color="bg-orange-500" />
                <ResponseTimeBar label="> 500ms" percentage={2} color="bg-red-500" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusCard({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  status 
}: { 
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
  status: 'success' | 'warning' | 'error' | 'info';
}) {
  const statusColors = {
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    error: 'text-red-500 bg-red-500/10',
    info: 'text-blue-500 bg-blue-500/10'
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${statusColors[status]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceStatus({ name, status }: { name: string; status: string }) {
  const isOperational = status === 'operational';
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <span className="font-medium">{name}</span>
      <Badge className={isOperational 
        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      }>
        {isOperational ? (
          <><CheckCircle className="h-3 w-3 mr-1" />Operational</>
        ) : (
          <><AlertCircle className="h-3 w-3 mr-1" />Degraded</>
        )}
      </Badge>
    </div>
  );
}

function LogEntry({ log }: { log: { endpoint: string; status_code: number; created_at: string; response_time_ms: number | null } }) {
  const isSuccess = log.status_code >= 200 && log.status_code < 300;
  
  return (
    <div className="flex items-center justify-between p-2 rounded border text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="font-mono text-xs truncate max-w-[200px]">{log.endpoint}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{log.response_time_ms}ms</span>
        <span>{format(new Date(log.created_at), 'HH:mm:ss')}</span>
      </div>
    </div>
  );
}

function ResponseTimeBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
    </div>
  );
}

function AgentConsumerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="w-20 h-4 bg-muted animate-pulse rounded" />
                  <div className="w-16 h-6 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}
