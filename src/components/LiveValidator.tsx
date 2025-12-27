import { useState } from "react";
import { Mail, CheckCircle, XCircle, AlertTriangle, Loader2, Zap, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ValidationResult {
  valid: boolean;
  email: string;
  riskScore: number;
  riskLevel: string;
  checks: {
    format: boolean;
    domain: boolean;
    disposable: boolean;
    typosquatting: boolean;
  };
  latency: number;
  domain: string;
  recommendation: string;
  confidence: number;
}

const LiveValidator = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const validateEmail = async () => {
    if (!email) return;
    
    if (!user) {
      toast.error("Please login to test the API");
      navigate("/auth");
      return;
    }

    setLoading(true);
    setResult(null);
    const startTime = Date.now();

    try {
      // Fetch user's active API key
      const { data: apiKeys, error: keysError } = await supabase
        .from("api_keys")
        .select("key")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);

      if (keysError || !apiKeys?.length) {
        toast.error("No active API key found. Create one in Dashboard → API Keys");
        navigate("/dashboard");
        return;
      }

      const apiKey = apiKeys[0].key;

      // Call the real validate-email-ai edge function
      const { data, error } = await supabase.functions.invoke("validate-email-ai", {
        body: { email },
        headers: { "X-API-Key": apiKey }
      });

      const latency = Date.now() - startTime;

      if (error) {
        if (error.message.includes("402") || error.message.includes("Insufficient credits")) {
          toast.error("Insufficient credits. Please purchase more in the Dashboard.");
          navigate("/credits");
          return;
        }
        throw error;
      }

      if (!data.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          toast.error("Insufficient credits. Please purchase more in the Dashboard.");
          navigate("/credits");
          return;
        }
        throw new Error(data.error || "Validation failed");
      }

      // Map the API response to our display format
      const apiResult = data.data || data;
      const analysis = apiResult.analysis || {};
      
      setResult({
        valid: apiResult.isValid,
        email: apiResult.email,
        riskScore: 100 - (apiResult.riskScore || 0),
        riskLevel: apiResult.riskLevel || "unknown",
        checks: {
          format: analysis.formatValid !== false,
          domain: analysis.domainType !== "unknown",
          disposable: analysis.domainType !== "disposable",
          typosquatting: analysis.typosquattingRisk === "none" || !analysis.typosquattingRisk,
        },
        latency,
        domain: apiResult.email?.split("@")[1] || "unknown",
        recommendation: apiResult.recommendation || "No recommendation",
        confidence: apiResult.confidence || 0,
      });

    } catch (err: any) {
      console.error("Validation error:", err);
      toast.error(err.message || "Failed to validate email");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  // Show login CTA for unauthenticated users
  if (!user) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="font-bold">GoldMail Validator</h3>
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              Live API
            </Badge>
          </div>
          <Link to="/gold-email-validator">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              Ver mais <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Test Our API</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Login to test real email validation powered by AI
            </p>
          </div>
          <Button asChild>
            <Link to="/auth">
              <LogIn className="w-4 h-4 mr-2" />
              Login to Test the API
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-bold">GoldMail Validator</h3>
          <Badge variant="outline" className="text-xs text-primary border-primary/30">
            Live API
          </Badge>
        </div>
        <Link to="/gold-email-validator">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            Ver mais <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          type="email"
          placeholder="Digite um email para validar..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && validateEmail()}
          className="bg-background/50"
        />
        <Button onClick={validateEmail} disabled={loading || !email}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        </Button>
      </div>

      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Status Header */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/30">
            <div className="flex items-center gap-3">
              {result.valid ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <div className="font-medium">{result.email}</div>
                <div className="text-xs text-muted-foreground">
                  {result.valid ? "Email válido" : "Email inválido ou arriscado"} • {result.riskLevel}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getRiskColor(result.riskScore)}`}>
                {result.riskScore}%
              </div>
              <div className="text-xs text-muted-foreground">Score IA</div>
            </div>
          </div>

          {/* Checks Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "format", label: "Formato" },
              { key: "domain", label: "Domínio" },
              { key: "disposable", label: "Descartável" },
              { key: "typosquatting", label: "Typosquatting" },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center gap-2 p-2 rounded bg-background/30 text-sm"
              >
                {result.checks[key as keyof typeof result.checks] ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded bg-background/30">
              <span className="text-muted-foreground">Domínio: </span>
              <span className="text-primary font-mono">{result.domain}</span>
            </div>
            <div className="p-2 rounded bg-background/30">
              <span className="text-muted-foreground">Latência: </span>
              <span className="text-primary font-mono">{result.latency}ms</span>
            </div>
          </div>

          {/* Recommendation */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <span className="text-muted-foreground">Recomendação: </span>
            <span className="text-foreground">{result.recommendation}</span>
          </div>

          {/* Confidence */}
          <div className="text-xs text-center text-muted-foreground">
            Confiança: {(result.confidence * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="text-center text-sm text-muted-foreground py-4">
          Digite um email para ver validação em tempo real via API
        </div>
      )}
    </Card>
  );
};

export default LiveValidator;
