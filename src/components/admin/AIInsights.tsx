import { useState } from "react";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Loader2, RefreshCw, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withRetry } from "@/lib/retry";

interface InsightsData {
  insights: string[];
  anomalies: { type: string; description: string; severity: string }[];
  predictions: string[];
  recommendations: string[];
}

const usageData = [
  { name: "Jan", calls: 4000, revenue: 240 },
  { name: "Fev", calls: 3000, revenue: 180 },
  { name: "Mar", calls: 5000, revenue: 300 },
  { name: "Abr", calls: 8000, revenue: 480 },
  { name: "Mai", calls: 6000, revenue: 360 },
  { name: "Jun", calls: 9500, revenue: 570 },
  { name: "Jul", calls: 12000, revenue: 720 },
];

export const AIInsights = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
    
    try {
      const data = await withRetry(
        async () => {
          const { data, error } = await supabase.functions.invoke('ai-insights', {
            body: { usageData }
          });
          if (error) throw error;
          return data;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          onRetry: (err, attempt, delay) => {
            console.log(`[AI Insights] Retry attempt ${attempt} after ${Math.round(delay)}ms:`, err);
            setIsRetrying(true);
            setRetryCount(attempt);
          }
        }
      );

      setInsights(data);
      setIsRetrying(false);
      toast.success('Insights gerados com IA!');
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsRetrying(false);
      toast.error('Erro ao gerar insights');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'text-destructive border-destructive/30 bg-destructive/10';
      case 'medium': return 'text-neon-orange border-neon-orange/30 bg-neon-orange/10';
      default: return 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10';
    }
  };

  return (
    <div className="glass-card p-6 rounded-xl border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-foreground">
              AI Insights
            </h3>
            <p className="text-xs text-muted-foreground">Análise inteligente de uso</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isLoading ? 'Analisando...' : 'Gerar Insights'}
        </Button>
      </div>

      {!insights && !isLoading && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Clique para gerar insights com IA</p>
          <p className="text-sm mt-2">Análise de padrões, anomalias e recomendações</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-8">
          <WifiOff className="w-10 h-10 mx-auto mb-4 text-destructive/60" />
          <p className="text-destructive mb-2">Erro ao carregar insights</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button variant="outline" size="sm" onClick={fetchInsights}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {isRetrying ? `Reconectando... (tentativa ${retryCount})` : 'Analisando dados com IA...'}
          </p>
        </div>
      )}

      {insights && !isLoading && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Insights */}
          {insights.insights?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-neon-green" />
                <span className="text-sm font-medium text-foreground">Insights Principais</span>
              </div>
              <div className="space-y-2">
                {insights.insights.map((insight, i) => (
                  <div key={i} className="p-3 rounded-lg bg-neon-green/5 border border-neon-green/20 text-sm text-foreground/90">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anomalies */}
          {insights.anomalies?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-neon-orange" />
                <span className="text-sm font-medium text-foreground">Anomalias Detectadas</span>
              </div>
              <div className="space-y-2">
                {insights.anomalies.map((anomaly, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${getSeverityColor(anomaly.severity)}`}>
                    <span className="font-medium">{anomaly.type}:</span> {anomaly.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictions */}
          {insights.predictions?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Previsões</span>
              </div>
              <div className="space-y-2">
                {insights.predictions.map((pred, i) => (
                  <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground/90">
                    {pred}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-neon-cyan" />
                <span className="text-sm font-medium text-foreground">Recomendações</span>
              </div>
              <div className="space-y-2">
                {insights.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 text-sm text-foreground/90">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
