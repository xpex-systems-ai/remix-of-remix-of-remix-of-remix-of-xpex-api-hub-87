import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LiveValidator from "@/components/LiveValidator";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, AlertTriangle, Server, Globe, Zap, CheckCircle, ArrowRight, 
  Copy, Code, Mail, Clock, Play, Grid3X3, Activity, Gauge, 
  Globe2, Key, FileText, Bell, CreditCard, Award, ChevronRight,
  Box, Puzzle, Chrome, Bot, Package, BookOpen, ExternalLink
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// Custom hook for animated counters
const useCountUp = (end: number, duration: number = 2000, start: number = 0) => {
  const [count, setCount] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasStarted) {
        setHasStarted(true);
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
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
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [hasStarted, end, duration, start]);

  return { count, ref };
};

interface ValidationStats {
  total_validations: number;
  avg_latency_ms: number;
  success_rate: number;
}

const GoldMailValidation = () => {
  const [activeTab, setActiveTab] = useState<"curl" | "javascript" | "python">("curl");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ValidationStats>({
    total_validations: 12500000,
    avg_latency_ms: 230,
    success_rate: 99.99
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_validation_stats');
        if (!error && data) {
          const statsData = data as unknown as ValidationStats;
          setStats({
            total_validations: Math.max(statsData.total_validations || 0, 12500000),
            avg_latency_ms: statsData.avg_latency_ms || 230,
            success_rate: statsData.success_rate || 99.99
          });
        }
      } catch (err) {
        console.log('Using default stats');
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const codeExamples = {
    curl: `curl -X POST https://api.xpexneural.com/v1/validate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com"}'`,
    javascript: `const response = await fetch('https://api.xpexneural.com/v1/validate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'user@example.com' })
});

const result = await response.json();
console.log(result);`,
    python: `import requests

response = requests.post(
    'https://api.xpexneural.com/v1/validate',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
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

  const products = [
    {
      id: "goldmail-api",
      name: "GoldMail API",
      type: "API",
      status: "available",
      badge: "Available",
      description: "High-performance email validation and risk intelligence API.",
      icon: Code,
      features: ["REST API", "WebSocket", "GraphQL", "OpenAPI"],
    },
    {
      id: "goldmail-saas",
      name: "GoldMail SaaS",
      type: "SaaS",
      status: "available",
      badge: "Available",
      description: "Enterprise dashboard with analytics, logs, credits and alerts.",
      icon: Box,
      features: ["Dashboard", "Analytics", "Logs", "Alerts"],
    },
    {
      id: "goldmail-plugin",
      name: "GoldMail Plugin",
      type: "Plugin",
      status: "beta",
      badge: "Beta",
      description: "Drop-in form validation for platforms and websites.",
      icon: Puzzle,
      features: ["JavaScript", "React", "Vue", "Web Components"],
    },
    {
      id: "goldmail-extension",
      name: "GoldMail Extension",
      type: "Extension",
      status: "planned",
      badge: "Planned",
      description: "Browser-level validation and enrichment.",
      icon: Chrome,
      features: ["Chrome", "Firefox", "Safari", "Edge"],
    },
    {
      id: "goldmail-agent",
      name: "GoldMail Agent",
      type: "Agent",
      status: "planned",
      badge: "Planned",
      description: "Autonomous email intelligence agent for workflows.",
      icon: Bot,
      features: ["LangChain", "LlamaIndex", "Autonomous", "Workflows"],
    },
    {
      id: "goldmail-bundles",
      name: "GoldMail Bundles",
      type: "Bundle",
      status: "available",
      badge: "Available",
      description: "Prebuilt stacks for SaaS, Marketing and AI teams.",
      icon: Package,
      features: ["SaaS Stack", "Marketing Stack", "AI Stack", "Enterprise"],
    },
  ];

  const plans = [
    {
      id: "starter",
      name: "Starter",
      credits: "2,000",
      price: "$5",
      features: ["API Access", "Basic Analytics", "Community Support"],
      variant: "outline" as const,
    },
    {
      id: "growth",
      name: "Growth",
      credits: "20,000",
      price: "$39",
      features: ["All Starter", "Advanced Analytics", "Priority Support", "Webhooks"],
      variant: "default" as const,
      popular: true,
    },
    {
      id: "scale",
      name: "Scale",
      credits: "100,000",
      price: "$149",
      features: ["All Growth", "SLA", "Dedicated Support", "Custom Rates"],
      variant: "outline" as const,
    },
  ];

  const developerFeatures = [
    { name: "API Keys", description: "Multi-key management with granular permissions", icon: Key },
    { name: "Usage Logs", description: "Real-time logs with filtering and export", icon: FileText },
    { name: "Rate Limits", description: "Configurable rate limits per key and endpoint", icon: Gauge },
    { name: "Webhooks", description: "Real-time event notifications to your endpoints", icon: Bell },
    { name: "Credit Management", description: "Programmatic credit purchase and balance checks", icon: CreditCard },
    { name: "SLAs", description: "99.9% uptime SLA with credit guarantees", icon: Award },
  ];

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "available": return "default";
      case "beta": return "secondary";
      case "planned": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>GoldMail Validation - Enterprise Email Intelligence | XPEX Neural</title>
        <meta name="description" content="Enterprise-grade email validation, risk scoring and deliverability intelligence. API, SaaS, plugins and agents." />
        <meta name="keywords" content="email validation, email intelligence, risk scoring, fraud detection, API, enterprise" />
        <link rel="canonical" href="https://xpexneural.com/products/goldmail-validation" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "GoldMail Validation",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": { "@type": "Offer", "price": "0.00149", "priceCurrency": "USD" }
          })}
        </script>
      </Helmet>

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">GoldMail Validation</span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8">
            {[
              { label: "Overview", anchor: "overview" },
              { label: "Products", anchor: "products" },
              { label: "Developers", anchor: "developers" },
              { label: "Pricing", anchor: "pricing" },
            ].map((item) => (
              <button
                key={item.anchor}
                onClick={() => scrollToSection(item.anchor)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ))}
            <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link to="/status" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Status
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : null}
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link to={user ? "/dashboard" : "/auth"}>
                {user ? "Dashboard" : "Request Access"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-8">
            {/* Badges */}
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge className="bg-success/10 text-success border-success/30">
                <CheckCircle className="w-3 h-3 mr-1" /> Enterprise Ready
              </Badge>
              <Badge variant="outline" className="border-border">
                API-First
              </Badge>
              <Badge variant="outline" className="border-border">
                Usage-Based Billing
              </Badge>
              <Badge variant="outline" className="border-border">
                Global Infrastructure
              </Badge>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  GoldMail Validation
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Enterprise-grade email validation, risk scoring and delivery intelligence.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex justify-center gap-4 flex-wrap pt-4">
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                onClick={() => scrollToSection('live-test')}
              >
                <Play className="w-4 h-4" /> Run Live Test
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="gap-2"
                onClick={() => scrollToSection('products')}
              >
                <Grid3X3 className="w-4 h-4" /> View Products
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* System Status Bar */}
      <section className="py-6 px-4 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "System Status", value: "Operational", status: "success", icon: Activity },
              { label: "Avg Latency", value: `${stats.avg_latency_ms}ms`, status: "success", icon: Clock },
              { label: "Uptime", value: `${stats.success_rate}%`, status: "success", icon: Gauge },
              { label: "Regions", value: "Global", status: "info", icon: Globe2 },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  metric.status === "success" ? "bg-success/10" : "bg-info/10"
                }`}>
                  <metric.icon className={`w-5 h-5 ${
                    metric.status === "success" ? "text-success" : "text-info"
                  }`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="font-semibold">{metric.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Test Section */}
      <section id="live-test" className="py-24 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Live Email Intelligence Test</h2>
            <p className="text-muted-foreground">
              Validate any email in real-time with our production API.
            </p>
          </div>
          <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
            <LiveValidator />
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Real-time validation preview. Full features require API key.
          </p>
        </div>
      </section>

      {/* Overview Section */}
      <section id="overview" className="py-24 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What is GoldMail Validation?</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              GoldMail Validation is the intelligence layer that sits between user input and business decision. 
              It validates emails, scores risk, prevents fraud and improves deliverability at scale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-card/50 backdrop-blur border-border/50">
              <h3 className="text-xl font-semibold mb-6">Core Intelligence</h3>
              <ul className="space-y-4">
                {["Real-time email validation", "Risk scoring (0-100)", "Fraud detection", "Deliverability optimization"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-8 bg-card/50 backdrop-blur border-border/50">
              <h3 className="text-xl font-semibold mb-6">Infrastructure</h3>
              <ul className="space-y-4">
                {["Global edge network", "Multi-region redundancy", "Enterprise SLAs", "Usage-based scaling"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">GoldMail Product Suite</h2>
            <p className="text-lg text-muted-foreground">One core. Multiple delivery formats.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="p-6 bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <product.icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant={statusBadgeVariant(product.status)}>{product.badge}</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.features.map((feature) => (
                    <span key={feature} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                      {feature}
                    </span>
                  ))}
                </div>
                <Button 
                  variant={product.status === "available" ? "outline" : "ghost"} 
                  size="sm" 
                  className="w-full gap-2"
                  disabled={product.status === "planned"}
                >
                  {product.status === "available" ? "View" : product.status === "beta" ? "Join Beta" : "Notify Me"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-24 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How GoldMail Fits Your Stack</h2>
            <p className="text-lg text-muted-foreground">
              GoldMail operates as a silent intelligence layer, not a UI dependency.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: 1, title: "User / Platform", description: "Email input from forms, APIs, or internal systems" },
              { step: 2, title: "GoldMail Intelligence", description: "Real-time validation, risk scoring, and fraud detection" },
              { step: 3, title: "Your Product", description: "Clean data and intelligence for your applications" },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <Card className="p-6 bg-card/50 backdrop-blur border-border/50 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </Card>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            GoldMail operates silently as a decision layer, not a UI dependency.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="mb-4">Usage-Based</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">
              Starting at <span className="text-primary font-semibold">$0.00149</span> per validation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`p-8 bg-card/50 backdrop-blur border-border/50 relative ${
                  plan.popular ? 'border-primary/50 ring-1 ring-primary/20' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-primary mb-1">{plan.price}</div>
                  <p className="text-sm text-muted-foreground">{plan.credits} credits / month</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  variant={plan.variant} 
                  className="w-full"
                  asChild
                >
                  <Link to="/credits">
                    {plan.id === "scale" ? "Contact Sales" : "Get Started"}
                  </Link>
                </Button>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Credits are shared across API, SaaS, Plugins and Agents. Overage rate: $0.00149/validation.
          </p>
        </div>
      </section>

      {/* Developers Section */}
      <section id="developers" className="py-24 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Developers</h2>
            <p className="text-lg text-muted-foreground">
              Enterprise-grade developer experience with comprehensive tooling.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {developerFeatures.map((feature) => (
              <Card key={feature.name} className="p-6 bg-card/50 backdrop-blur border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.name}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>

          {/* Code Examples */}
          <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
            <div className="flex border-b border-border/50">
              {(["curl", "javascript", "python"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab 
                      ? "bg-primary/10 text-primary border-b-2 border-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
              <button 
                onClick={copyCode} 
                className="ml-auto px-6 py-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            <pre className="p-6 overflow-x-auto text-sm font-mono">
              <code className="text-primary">{codeExamples[activeTab]}</code>
            </pre>
          </Card>

          <div className="text-center mt-8">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/docs">
                <BookOpen className="w-4 h-4" /> Read Documentation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-border/50 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">XPEX Neural</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Intelligence Infrastructure
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                {["Overview", "API", "SaaS", "Pricing"].map((link) => (
                  <li key={link}>
                    <button 
                      onClick={() => scrollToSection(link.toLowerCase())}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developer Links */}
            <div>
              <h4 className="font-semibold mb-4">Developers</h4>
              <ul className="space-y-2">
                {[
                  { label: "Documentation", to: "/docs" },
                  { label: "API Reference", to: "/docs" },
                  { label: "Status", to: "/status" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                {[
                  { label: "About", to: "/about" },
                  { label: "Blog", to: "/blog" },
                  { label: "Contact", to: "/contact" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Legal */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              © 2025 XPEX Neural. All rights reserved.
            </p>
            <div className="flex gap-6">
              {[
                { label: "Privacy", to: "/legal/privacy" },
                { label: "Terms", to: "/legal/terms" },
                { label: "SLA", to: "/legal/sla" },
              ].map((link) => (
                <Link 
                  key={link.label}
                  to={link.to} 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GoldMailValidation;
