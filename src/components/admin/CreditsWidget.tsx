import { useState } from "react";
import { Coins, TrendingUp, TrendingDown, RefreshCw, ShoppingCart, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCredits } from "@/hooks/useCredits";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tierLimits: Record<string, number> = {
  free: 100,
  pro: 20000,
  enterprise: 999999
};

export function CreditsWidget() {
  const { balance, loading, refreshBalance } = useCredits();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const maxCredits = tierLimits[balance.tier] || 100;
  const usagePercent = balance.tier === 'enterprise' 
    ? 100 
    : Math.min((balance.credits / maxCredits) * 100, 100);
  
  const isLowCredits = balance.credits < 50 && balance.tier !== 'enterprise';
  const isCritical = balance.credits < 10 && balance.tier !== 'enterprise';

  return (
    <Card className="card-cyber">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              isCritical ? "bg-destructive/20" : isLowCredits ? "bg-yellow-500/20" : "bg-primary/20"
            )}>
              <Coins className={cn(
                "h-5 w-5",
                isCritical ? "text-destructive" : isLowCredits ? "text-yellow-500" : "text-primary"
              )} />
            </div>
            <div>
              <CardTitle className="text-lg">Créditos</CardTitle>
              <CardDescription className="text-xs">
                Saldo em tempo real
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="flex items-end justify-between">
          <div>
            <p className={cn(
              "text-3xl font-bold tabular-nums",
              isCritical ? "text-destructive" : isLowCredits ? "text-yellow-500" : "text-foreground"
            )}>
              {loading ? "---" : balance.credits.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">créditos disponíveis</p>
          </div>
          <Badge 
            variant={balance.tier === 'enterprise' ? 'default' : balance.tier === 'pro' ? 'secondary' : 'outline'}
            className="uppercase text-xs"
          >
            {balance.tier}
          </Badge>
        </div>

        {/* Usage Progress */}
        {balance.tier !== 'enterprise' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Uso do plano</span>
              <span className={cn(
                "font-medium",
                isCritical ? "text-destructive" : isLowCredits ? "text-yellow-500" : "text-foreground"
              )}>
                {balance.credits.toLocaleString()} / {maxCredits.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={usagePercent} 
              className={cn(
                "h-2",
                isCritical && "[&>div]:bg-destructive",
                isLowCredits && !isCritical && "[&>div]:bg-yellow-500"
              )}
            />
          </div>
        )}

        {/* Low Credits Warning */}
        {isLowCredits && (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-xs",
            isCritical ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
          )}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {isCritical 
                ? "Créditos quase esgotados! Compre mais para continuar usando a API." 
                : "Créditos baixos. Considere comprar mais."
              }
            </span>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3" />
              <span>Custo/validação</span>
            </div>
            <p className="font-semibold text-sm">1 crédito</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span>Validações restantes</span>
            </div>
            <p className="font-semibold text-sm">
              {balance.tier === 'enterprise' ? '∞' : balance.credits.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Buy Credits Button */}
        <Button 
          variant="neon" 
          className="w-full"
          onClick={() => navigate('/credits')}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Comprar Créditos
        </Button>
      </CardContent>
    </Card>
  );
}
