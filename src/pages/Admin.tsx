import { Helmet } from "react-helmet-async";
import { useState } from "react";
import {
  Users,
  Activity,
  DollarSign,
  Key,
  TrendingUp,
  AlertTriangle,
  Server,
  BarChart3,
  ShieldAlert,
  RefreshCw,
  Cpu,
  Brain,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAdminStats } from "@/hooks/useAdminStats";
import { Navigate } from "react-router-dom";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import RealtimeEventsDashboard from "@/components/admin/RealtimeEventsDashboard";
import ConversionAlerts from "@/components/admin/ConversionAlerts";
import { ConversionFunnel } from "@/components/admin/ConversionFunnel";
import { ConversionTrendCharts } from "@/components/admin/ConversionTrendCharts";
import { ExecutiveSummary } from "@/components/admin/ExecutiveSummary";
import { ConversionExport } from "@/components/admin/ConversionExport";
import { AdminSkeleton } from "@/components/admin/AdminSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { SystemConfiguration } from "@/components/admin/SystemConfiguration";
import { AuditLogsPanel } from "@/components/admin/AuditLogsPanel";
import { AgentConsumerDashboard } from "@/components/admin/AgentConsumerDashboard";
import BrainDashboard from "@/components/admin/BrainDashboard";

const Admin = () => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { stats, recentActivity, systemHealth, loading: statsLoading, refetch } = useAdminStats();
  const [activeTab, setActiveTab] = useState("overview");

  if (loading || adminLoading) {
    return <AdminSkeleton />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Server-side role check - redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4">
          <Card className="p-8 bg-card/50 backdrop-blur border-border/50 text-center">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar o painel de administração.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Ir para Dashboard
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const statsData = [
    { 
      label: "Total Users", 
      value: statsLoading ? "..." : stats.totalUsers.toLocaleString(), 
      change: stats.totalUsersChange > 0 ? `+${stats.totalUsersChange}%` : `${stats.totalUsersChange}%`, 
      icon: Users 
    },
    { 
      label: "API Calls Today", 
      value: statsLoading ? "..." : stats.apiCallsToday.toLocaleString(), 
      change: stats.apiCallsChange > 0 ? `+${stats.apiCallsChange}%` : `${stats.apiCallsChange}%`, 
      icon: Activity 
    },
    { 
      label: "Revenue (MTD)", 
      value: statsLoading ? "..." : `$${stats.revenueMTD.toLocaleString()}`, 
      change: "+0%", 
      icon: DollarSign 
    },
    { 
      label: "Active API Keys", 
      value: statsLoading ? "..." : stats.activeApiKeys.toLocaleString(), 
      change: "+0%", 
      icon: Key 
    },
  ];

  return (
    <ErrorBoundary
      fallbackTitle="Erro no Admin"
      fallbackDescription="Ocorreu um erro ao carregar o painel de administração. Por favor, recarregue a página."
    >
    <div className="min-h-screen bg-background animate-fade-in">
      <Helmet>
        <title>Admin Dashboard - XPEX Neural</title>
        <meta name="description" content="XPEX Neural Admin Dashboard - Monitor users, API usage, and system health." />
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-16 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage XPEX Neural platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refetch}
              disabled={statsLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge variant="outline" className="text-primary border-primary">
              Admin Access
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat) => (
            <Card key={stat.label} className="p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-xs font-medium ${
                  stat.change.startsWith('+') && stat.change !== '+0%' 
                    ? 'text-green-500' 
                    : stat.change.startsWith('-') 
                    ? 'text-red-500' 
                    : 'text-muted-foreground'
                }`}>{stat.change}</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-24 mb-1" />
              ) : (
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
              )}
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/50 border border-border/50 mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="brain">
              <Brain className="w-4 h-4 mr-1" />
              Brain Layer
            </TabsTrigger>
            <TabsTrigger value="agent-consumer">
              <Cpu className="w-4 h-4 mr-1" />
              Agent Consumer
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {statsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))
                  ) : recentActivity.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">No recent activity</p>
                  ) : (
                    recentActivity.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div>
                          <div className="text-sm font-medium">{item.action}</div>
                          <div className="text-xs text-muted-foreground">{item.user}</div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              item.type === "success"
                                ? "text-green-500 border-green-500/30"
                                : item.type === "warning"
                                ? "text-yellow-500 border-yellow-500/30"
                                : "text-muted-foreground"
                            }
                          >
                            {item.time}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* System Health */}
              <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  System Health
                </h3>
                <div className="space-y-4">
                  {statsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-2 h-2 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))
                  ) : (
                    systemHealth.map((item) => (
                      <div key={item.service} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.status === "operational" 
                                ? "bg-green-500" 
                                : item.status === "degraded" 
                                ? "bg-yellow-500" 
                                : "bg-red-500"
                            }`}
                          />
                          <span className="text-sm">{item.service}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{item.uptime}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
                <Button variant="outline" size="sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View Alerts
                </Button>
                <Button variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Revenue Details
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="brain">
            <BrainDashboard />
          </TabsContent>

          <TabsContent value="agent-consumer">
            <AgentConsumerDashboard />
          </TabsContent>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ConversionAlerts />
            <ConversionFunnel />
            <ConversionTrendCharts />
            <RealtimeEventsDashboard />
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="system">
            <SystemConfiguration />
          </TabsContent>
        </Tabs>
      </main>
    </div>
    </ErrorBoundary>
  );
};

export default Admin;
