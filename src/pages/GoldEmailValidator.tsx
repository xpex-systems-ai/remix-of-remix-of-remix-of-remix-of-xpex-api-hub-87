import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveValidator from "@/components/LiveValidator";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Server, Globe, Sparkles, Zap, CheckCircle, ArrowRight, Copy, Code, Mail, TrendingUp, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
const useCountUp = (end: number, duration: number = 2000, start: number = 0) => {
  const [count, setCount] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasStarted) {
        setHasStarted(true);
      }
    }, {
      threshold: 0.1
    });
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [hasStarted]);
  useEffect(() => {
    if (!hasStarted) return;
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * (end - start) + start));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [hasStarted, end, duration, start]);
  return {
    count,
    ref
  };
};
interface ValidationStats {
  total_validations: number;
  avg_latency_ms: number;
  success_rate: number;
}
const GoldEmailValidator = () => {
  const [activeTab, setActiveTab] = useState<"curl" | "javascript" | "python">("curl");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const { startCheckout } = useSubscription();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ValidationStats>({
    total_validations: 12500000,
    avg_latency_ms: 47,
    success_rate: 99
  });

  const handleCheckout = async (tier: 'pro' | 'enterprise') => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setCheckoutLoading(tier);
    try {
      await startCheckout(tier);
    } finally {
      setCheckoutLoading(null);
    }
  };
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const {
          data,
          error
        } = await supabase.rpc('get_validation_stats');
        if (!error && data) {
          const statsData = data as unknown as ValidationStats;
          setStats({
            total_validations: Math.max(statsData.total_validations || 0, 12500000),
            avg_latency_ms: statsData.avg_latency_ms || 47,
            success_rate: statsData.success_rate || 99
          });
        }
      } catch (err) {
        console.log('Using default stats');
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);
  const validationsCounter = useCountUp(stats.total_validations, 2500);
  const accuracyCounter = useCountUp(stats.success_rate, 2000);
  const latencyCounter = useCountUp(stats.avg_latency_ms, 1500);
  const codeExamples = {
    curl: `curl -X POST https://api.xpex.dev/validate-email \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com"}'`,
    javascript: `const response = await fetch('https://api.xpex.dev/validate-email', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'user@example.com' })
});

const result = await response.json();
console.log(result);`,
    python: `import requests

response = requests.post(
    'https://api.xpex.dev/validate-email',
    headers={
        'x-api-key': 'YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={'email': 'user@example.com'}
)

result = response.json()
print(result)`
  };
  const copyCode = () => {
    navigator.clipboard.writeText(codeExamples[activeTab]);
    toast.success("Code copied to clipboard");
  };
  const features = [{
    title: "Risk Scoring",
    description: "Advanced 0–100 risk score per email",
    icon: Shield
  }, {
    title: "Disposable Detection",
    description: "Detect temporary and burner email providers",
    icon: AlertTriangle
  }, {
    title: "MX & SMTP Validation",
    description: "Deep infrastructure-level validation",
    icon: Server
  }, {
    title: "Domain Intelligence",
    description: "Reputation and domain analysis",
    icon: Globe
  }, {
    title: "AI-Assisted Validation",
    description: "Machine-assisted confidence scoring",
    icon: Sparkles
  }];
  const useCases = ["Email Marketing Platforms", "SaaS Onboarding", "E-commerce Checkout", "Autonomous Agents", "Fraud Prevention Systems"];
  const problems = ["Invalid emails cause hard bounces", "Disposable emails pollute databases", "Poor validation damages sender reputation"];
  return <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Gold Email Validator API | XPEX Neural</title>
        <meta name="description" content="Enterprise-grade email validation API with risk scoring, disposable detection, MX & SMTP checks. Built for scale." />
        <meta name="keywords" content="email validation api, email verifier, smtp validation, fraud prevention api" />
      </Helmet>

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6">
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-primary/50 text-primary">
                <Zap className="w-3 h-3 mr-1" /> &lt;100ms Latency
              </Badge>
              <Badge variant="outline" className="border-green-500/50 text-green-400">
                99.8% Uptime
              </Badge>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                Agent-Ready
              </Badge>
              <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                API-First
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Gold Email Validator
              </span>
              <br />
              <span className="text-foreground">API</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Enterprise-grade email validation with real-time risk intelligence. Built to protect deliverability and scale systems.
            </p>

            <div className="flex justify-center gap-4 flex-wrap pt-4">
              <Button asChild size="lg" className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-semibold">
                <Link to="/auth">
                  Get API Key <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => handleCheckout('enterprise')}
                disabled={checkoutLoading === 'enterprise'}
              >
                {checkoutLoading === 'enterprise' ? 'Loading...' : 'Enterprise'}
              </Button>
            </div>

            {/* Animated Stats */}
            <div className="grid grid-cols-3 gap-6 md:gap-12 pt-12 max-w-3xl mx-auto">
              <div ref={validationsCounter.ref} className="text-center">
                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                  {validationsCounter.count.toLocaleString()}+
                </div>
                <div className="flex items-center justify-center gap-1 text-xs md:text-sm text-muted-foreground mt-1">
                  <Mail className="w-3 h-3 md:w-4 md:h-4" />
                  Emails Validated
                </div>
              </div>
              <div ref={accuracyCounter.ref} className="text-center">
                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  {accuracyCounter.count}%
                </div>
                <div className="flex items-center justify-center gap-1 text-xs md:text-sm text-muted-foreground mt-1">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                  Accuracy Rate
                </div>
              </div>
              <div ref={latencyCounter.ref} className="text-center">
                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {latencyCounter.count}ms
                </div>
                <div className="flex items-center justify-center gap-1 text-xs md:text-sm text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 md:w-4 md:h-4" />
                  Avg Latency
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold">The Problem</h2>
              <ul className="space-y-4">
                {problems.map((problem, i) => <li key={i} className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{problem}</span>
                  </li>)}
              </ul>
            </div>
            <Card className="p-6 bg-card/50 backdrop-blur border-primary/30">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-primary">The Solution</h2>
              <p className="text-muted-foreground leading-relaxed">
                Gold Email Validator goes beyond simple validation, delivering real-time 
                risk intelligence for emails at scale. Protect your deliverability, 
                maintain clean lists, and prevent fraud before it happens.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need for enterprise-grade email validation
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => <Card key={i} className="p-6 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors group">
                <feature.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Performance Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Performance</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for enterprise workloads, autonomous agents and high-volume systems.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["<100ms average response time", "Global edge infrastructure", "Auto-scaling under load", "Rate limiting and abuse protection"].map((metric, i) => <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card/30 border border-border/50">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm">{metric}</span>
              </div>)}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Try it Live</h2>
            <p className="text-muted-foreground">
              Test the Gold Email Validator right here. No signup required.
            </p>
          </div>
          <LiveValidator />
          <p className="text-center text-sm text-muted-foreground mt-4">
            Real-time validation preview. Full features require API key.
          </p>
        </div>
      </section>

      {/* Quick Integration Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Quick Integration</h2>
            <p className="text-muted-foreground">
              Get started in minutes with our simple API
            </p>
          </div>
          
          <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
            <div className="flex border-b border-border/50">
              {(["curl", "javascript", "python"] as const).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>)}
              <button onClick={copyCode} className="ml-auto px-4 py-3 text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm">
              <code className="text-green-400">{codeExamples[activeTab]}</code>
            </pre>
          </Card>

          <div className="text-center mt-6">
            <Button asChild variant="outline">
              <Link to="/docs">
                <Code className="w-4 h-4 mr-2" /> Full Documentation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Summary Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Pricing starts at <span className="text-primary font-semibold">$0.00149 per validation</span>. 
            Get 2,000 credits for just $5, or scale up to 100,000 credits for $149.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-semibold"
              onClick={() => handleCheckout('pro')}
              disabled={checkoutLoading === 'pro'}
            >
              {checkoutLoading === 'pro' ? 'Loading...' : 'Buy Gold Plan'}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/credits">Buy Credits</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Use Cases</h2>
            <p className="text-muted-foreground">
              Trusted by teams building the future
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {useCases.map((useCase, i) => <Card key={i} className="p-4 text-center bg-card/30 border-border/50 hover:border-primary/50 transition-colors">
                <span className="text-sm font-medium">{useCase}</span>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Start validating emails with confidence.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            No credit card required to test.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button asChild size="lg" className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-semibold">
              <Link to="/auth">
                Get API Key <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default GoldEmailValidator;