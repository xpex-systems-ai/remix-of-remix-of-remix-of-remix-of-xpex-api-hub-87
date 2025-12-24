import { Link } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, BarChart3, Key, Users, DollarSign, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/admin/StatsCard";
import { RealtimeUsageChart } from "@/components/admin/RealtimeUsageChart";
import { APIKeysTable } from "@/components/admin/APIKeysTable";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { AIInsights } from "@/components/admin/AIInsights";
import { SubscriptionCard } from "@/components/admin/SubscriptionCard";
import { RateLimitingCard } from "@/components/admin/RateLimitingCard";
import { LiveMetricsPanel } from "@/components/admin/LiveMetricsPanel";
import { LatencyGraph } from "@/components/admin/LatencyGraph";
import { EndpointBreakdown } from "@/components/admin/EndpointBreakdown";
import { ReferralCard } from "@/components/admin/ReferralCard";
import { ReferralLeaderboard } from "@/components/admin/ReferralLeaderboard";
import { ReferralEvolutionChart } from "@/components/admin/ReferralEvolutionChart";
import { WebhooksManager } from "@/components/admin/WebhooksManager";
import { AchievementsPanel } from "@/components/admin/AchievementsPanel";
import { PushNotificationSettings } from "@/components/admin/PushNotificationSettings";
import { ExportReports } from "@/components/admin/ExportReports";
import { APIPlayground } from "@/components/admin/APIPlayground";
import { BillingCenter } from "@/components/admin/BillingCenter";
import { CreditsWidget } from "@/components/admin/CreditsWidget";
import { CreditTransactionHistory } from "@/components/admin/CreditTransactionHistory";
import { CreditAlertSettings } from "@/components/admin/CreditAlertSettings";
import { AutoRechargeSettings } from "@/components/admin/AutoRechargeSettings";
import { BulkEmailValidator } from "@/components/admin/BulkEmailValidator";
import { AuditLogsPanel } from "@/components/admin/AuditLogsPanel";
import { RateLimitMonitor } from "@/components/admin/RateLimitMonitor";
import { NotificationPreferences } from "@/components/admin/NotificationPreferences";
import { ConfigurationBackups } from "@/components/admin/ConfigurationBackups";
import { RealtimeMetricsDashboard } from "@/components/admin/RealtimeMetricsDashboard";
import { EmailTemplatesManager } from "@/components/admin/EmailTemplatesManager";
import { DashboardSkeleton } from "@/components/admin/DashboardSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useAuth } from "@/hooks/useAuth";
import { useAPIKeys } from "@/hooks/useAPIKeys";
import { useUsageLogs } from "@/hooks/useUsageLogs";
import { useSubscription } from "@/hooks/useSubscription";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { keys, loading: keysLoading } = useAPIKeys();
  const { stats, loading: statsLoading } = useUsageLogs();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  const isLoading = authLoading || keysLoading || statsLoading || subscriptionLoading;

  const activeKeys = keys.filter(k => k.status === 'active').length;
  const totalCalls = stats?.totalCalls || keys.reduce((acc, k) => acc + k.calls_count, 0);

  const handleSignOut = async () => {
    await signOut();
  };

  const tierLabels = {
    free: 'Free tier',
    pro: '+12.5% este mês',
    enterprise: '+45.2% este mês'
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <ErrorBoundary 
      fallbackTitle="Erro no Dashboard" 
      fallbackDescription="Ocorreu um erro ao carregar o dashboard. Por favor, recarregue a página."
    >
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-display font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-mono hidden sm:block">
              {user?.email}
            </span>
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <NotificationCenter />
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-red-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid with staggered animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <PageTransition delay={0}>
            <StatsCard
              title="Total de Chamadas"
              value={totalCalls.toLocaleString()}
              change={tierLabels[subscription.tier]}
              changeType={subscription.tier === 'free' ? 'neutral' : 'positive'}
              icon={BarChart3}
            />
          </PageTransition>
          <PageTransition delay={50}>
            <StatsCard
              title="API Keys Ativas"
              value={activeKeys.toString()}
              change={`${keys.length} total`}
              changeType="neutral"
              icon={Key}
            />
          </PageTransition>
          <PageTransition delay={100}>
            <StatsCard
              title="Créditos Mensais"
              value={subscription.monthlyCredits === -1 ? '∞' : subscription.monthlyCredits.toLocaleString()}
              change={subscription.tier.toUpperCase()}
              changeType={subscription.tier === 'free' ? 'neutral' : 'positive'}
              icon={Users}
            />
          </PageTransition>
          <PageTransition delay={150}>
            <StatsCard
              title="Plano Atual"
              value={subscription.tier === 'free' ? '$0' : subscription.tier === 'pro' ? '$29' : '$199'}
              change={subscription.tier === 'free' ? 'Free' : 'Ativo'}
              changeType={subscription.tier === 'free' ? 'neutral' : 'positive'}
              icon={DollarSign}
            />
          </PageTransition>
        </div>

        {/* Live Metrics Panel */}
        <PageTransition delay={200}>
          <div className="mb-8">
            <LiveMetricsPanel />
          </div>
        </PageTransition>

        {/* Charts and Subscription */}
        <PageTransition delay={250}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <RealtimeUsageChart />
            </div>
            <div className="space-y-6">
              <CreditsWidget />
              <SubscriptionCard />
              <RateLimitingCard />
            </div>
          </div>
        </PageTransition>

        {/* Latency and Endpoint Breakdown */}
        <PageTransition delay={300}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <LatencyGraph />
            <EndpointBreakdown />
          </div>
        </PageTransition>

        {/* AI Insights and Activity */}
        <PageTransition delay={350}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <AIInsights />
            </div>
            <RecentActivity />
          </div>
        </PageTransition>

        {/* Referral Section */}
        <PageTransition delay={400}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ReferralCard />
            <ReferralEvolutionChart />
          </div>
        </PageTransition>

        {/* Leaderboard and Webhooks */}
        <PageTransition delay={450}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ReferralLeaderboard />
            <WebhooksManager />
          </div>
        </PageTransition>

        {/* Achievements, Notifications and Export */}
        <PageTransition delay={500}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <AchievementsPanel />
            <PushNotificationSettings />
            <ExportReports />
          </div>
        </PageTransition>

        {/* Realtime Metrics Dashboard */}
        <PageTransition delay={550}>
          <div className="mb-8">
            <RealtimeMetricsDashboard />
          </div>
        </PageTransition>

        {/* Email Templates Manager */}
        <PageTransition delay={600}>
          <div className="mb-8">
            <EmailTemplatesManager />
          </div>
        </PageTransition>

        {/* Notification Preferences and Backups */}
        <PageTransition delay={650}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <NotificationPreferences />
            <ConfigurationBackups />
          </div>
        </PageTransition>

        {/* API Playground */}
        <PageTransition delay={700}>
          <div className="mb-8">
            <APIPlayground />
          </div>
        </PageTransition>

        {/* Billing Center */}
        <PageTransition delay={750}>
          <div className="mb-8">
            <BillingCenter />
          </div>
        </PageTransition>

        {/* Credit Transaction History */}
        <PageTransition delay={775}>
          <div className="mb-8">
            <CreditTransactionHistory />
          </div>
        </PageTransition>

        {/* Credit Alert & Auto-Recharge Settings */}
        <PageTransition delay={790}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <CreditAlertSettings />
            <AutoRechargeSettings />
          </div>
        </PageTransition>

        {/* Bulk Email Validator */}
        <PageTransition delay={795}>
          <div className="mb-8">
            <BulkEmailValidator />
          </div>
        </PageTransition>

        {/* Audit Logs */}
        <PageTransition delay={800}>
          <div className="mb-8">
            <AuditLogsPanel />
          </div>
        </PageTransition>

        {/* Rate Limits Monitor */}
        <PageTransition delay={850}>
          <div className="mb-8">
            <RateLimitMonitor />
          </div>
        </PageTransition>

        {/* API Keys Table */}
        <PageTransition delay={900}>
          <APIKeysTable />
        </PageTransition>
      </main>
    </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
