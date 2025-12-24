import { CreditCard, Crown, Zap, Building2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { DashboardSectionWrapper } from "@/components/DashboardSectionWrapper";

export const SubscriptionCard = () => {
  const { subscription, loading, isRetrying, retryCount, checkSubscription, startCheckout, openCustomerPortal, error } = useSubscription();

  const tierConfig = {
    free: {
      icon: Zap,
      color: "text-muted-foreground",
      bgColor: "bg-secondary/50",
      label: "Free Tier"
    },
    pro: {
      icon: Crown,
      color: "text-primary",
      bgColor: "bg-primary/20",
      label: "Pro Plan"
    },
    enterprise: {
      icon: Building2,
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/20",
      label: "Enterprise"
    }
  };

  const config = tierConfig[subscription.tier];
  const Icon = config.icon;

  return (
    <DashboardSectionWrapper
      loading={loading}
      error={error}
      isRetrying={isRetrying}
      retryCount={retryCount}
      onRetry={checkSubscription}
      title="Erro ao carregar assinatura"
      minHeight="min-h-[220px]"
    >
      <div className="glass-card p-6 rounded-xl border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Assinatura
          </h3>
          <div className="flex items-center gap-2">
            {isRetrying && (
              <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
            )}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-border/30">
            <span className="text-muted-foreground text-sm">Créditos Mensais</span>
            <span className="font-mono text-foreground">
              {subscription.monthlyCredits === -1 ? '∞' : subscription.monthlyCredits.toLocaleString()}
            </span>
          </div>

          {subscription.subscriptionEnd && (
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-muted-foreground text-sm">Renova em</span>
              <span className="font-mono text-foreground">
                {new Date(subscription.subscriptionEnd).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {subscription.tier === 'free' ? (
              <>
                <Button 
                  variant="cyber" 
                  className="flex-1"
                  onClick={() => startCheckout('pro')}
                  disabled={loading || isRetrying}
                >
                  Upgrade para Pro
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => startCheckout('enterprise')}
                  disabled={loading || isRetrying}
                >
                  Enterprise
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={openCustomerPortal}
                disabled={loading || isRetrying}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Gerenciar Assinatura
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardSectionWrapper>
  );
};
