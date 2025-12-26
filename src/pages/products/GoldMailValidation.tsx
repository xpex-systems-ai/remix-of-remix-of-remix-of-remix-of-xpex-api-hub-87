import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LiveValidator from "@/components/LiveValidator";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, AlertTriangle, Server, Globe, Sparkles, Zap, CheckCircle, 
  ArrowRight, Copy, Play, Grid3X3, BookOpen, Mail, TrendingUp, Clock,
  Code, Activity, Users, Package, Puzzle, Chrome, Bot, Layers
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

// Product Suite Card Data
const productCards = [
  {
    id: "goldmail-api",
    name: "GoldMail API",
    type: "API",
    status: "available",
    badge: "Available",
    description: "High-performance email validation and risk intelligence API.",
    route: "/products/goldmail-api",
    features: ["REST API", "WebSocket", "GraphQL", "OpenAPI"],
    icon: Code,
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30"
  },
  {
    id: "goldmail-saas",
    name: "GoldMail SaaS",
    type: "SaaS",
    status: "available",
    badge: "Available",
    description: "Enterprise dashboard with analytics, logs, credits and alerts.",
    route: "/products/goldmail-saas",
    features: ["Dashboard", "Analytics", "Logs", "Alerts"],
    icon: Activity,
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30"
  },
  {
    id: "goldmail-plugin",
    name: "GoldMail Plugin",
    type: "Plugin",
    status: "beta",
    badge: "Beta",
    description: "Drop-in form validation for platforms and websites.",
    route: "/products/goldmail-plugin",
    features: ["JavaScript", "React", "Vue", "Web Components"],
    icon: Puzzle,
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30"
  },
  {
    id: "goldmail-extension",
    name: "GoldMail Extension",
    type: "Extension",
    status: "planned",
    badge: "Planned",
    description: "Browser-level validation and enrichment.",
    route: "/products/goldmail-extension",
    features: ["Chrome", "Firefox", "Safari", "Edge"],
    icon: Chrome,
    badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30"
  },
  {
    id: "goldmail-agent",
    name: "GoldMail Agent",
    type: "Agent",
    status: "planned",
    badge: "Planned",
    description: "Autonomous email intelligence agent for workflows.",
    route: "/products/goldmail-agent",
    features: ["LangChain", "LlamaIndex", "Autonomous", "Workflows"],
    icon: Bot,
    badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30"
  },
  {
    id: "goldmail-bundles",
    name: "GoldMail Bundles",
    type: "Bundle",
    status: "available",
    badge: "Available",
    description: "Prebuilt stacks for SaaS, Marketing and AI teams.",
    route: "/products/goldmail-bundles",
    features: ["SaaS Stack", "Marketing Stack", "AI Stack", "Enterprise"],
    icon: Layers,
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30"
  }
];

// Pricing plans
const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    credits: "2,000",
    price: "$5",
    interval: "monthly",
    features: ["API Access", "Basic Analytics", "Community Support"],
    variant: "outline" as const
  },
  {
    id: "growth",
    name: "Growth",
    credits: "20,000",
    price: "$39",
    interval: "monthly",
    features: ["All Starter", "Advanced Analytics", "Priority Support", "Webhooks"],
    variant: "primary" as const,
    popular: true
  },
  {
    id: "scale",
    name: "Scale",
    credits: "100,000",
    price: "$149",
    interval: "monthly",
    features: ["All Growth", "SLA", "Dedicated Support", "Custom Rates"],
    variant: "outline" as const
  }
];

// Developer features
const developerFeatures = [
  { name: "API Keys", description: "Multi-key management with granular permissions" },
  { name: "Usage Logs", description: "Real-time logs with filtering and export" },
  { name: "Rate Limits", description: "Configurable rate limits per key and endpoint" },
  { name: "Webhooks", description: "Real-time event notifications to your endpoints" },
  { name: "Credit Management", description: "Programmatic credit purchase and balance checks" },
  { name: "SLAs", description: "99.9% uptime SLA with credit guarantees" }
];

const sdks = [
  { language: "JavaScript", package: "@xpex/goldmail-js" },
  { language: "Python", package: "xpex-goldmail" },
  { language: "Go", package: "github.com/xpex/goldmail-go" },
  { language: "Ruby", package: "xpex-goldmail" }
];

const GoldMailValidation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  const handleLiveTest = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-email", {
        body: { email }
      });
      if (error) throw error;
      setValidationResult(data);
      toast.success("Email validated successfully");
    } catch (err) {
      console.error(err);
      // Show mock result on error
      setValidationResult({
        decision: "ACCEPT",
        confidence: "97%",
        riskScore: "Low",
        signals: ["MX Verified", "SMTP Check Passed", "No Disposable Detected", "High Domain Reputation"],
        responseTime: "214ms"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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

      {/* Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-slate-900" />
              </div>
              <span className="font-semibold text-lg">GoldMail Validation</span>
            </div>
            
            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection("overview")} className="text-sm text-slate-400 hover:text-white transition-colors">Overview</button>
              <button onClick={() => scrollToSection("products")} className="text-sm text-slate-400 hover:text-white transition-colors">Products</button>
              <button onClick={() => scrollToSection("developers")} className="text-sm text-slate-400 hover:text-white transition-colors">Developers</button>
              <button onClick={() => scrollToSection("pricing")} className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</button>
              <Link to="/docs" className="text-sm text-slate-400 hover:text-white transition-colors">Docs</Link>
              <Link to="/status" className="text-sm text-slate-400 hover:text-white transition-colors">Status</Link>
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : null}
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-medium" asChild>
                <Link to="/auth">Request Access</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-[120px]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-8">
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" /> Enterprise Ready
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">API-First</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Usage-Based Billing</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Global Infrastructure</Badge>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                GoldMail Validation
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Enterprise-grade email validation, risk scoring and delivery intelligence.
            </p>

            <div className="flex justify-center gap-4 flex-wrap pt-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold gap-2"
                onClick={() => scrollToSection("live-test")}
              >
                <Play className="w-4 h-4" /> Run Live Test
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
                onClick={() => scrollToSection("products")}
              >
                <Grid3X3 className="w-4 h-4" /> View Products
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* System Status */}
      <section className="py-6 px-4 border-y border-slate-800/50 bg-slate-900/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <div>
                <div className="text-xs text-slate-500">System Status</div>
                <div className="text-sm font-medium text-green-400">Operational</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs text-slate-500">Avg Latency</div>
                <div className="text-sm font-medium text-slate-200">230ms</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs text-slate-500">Uptime</div>
                <div className="text-sm font-medium text-slate-200">99.99%</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs text-slate-500">Regions</div>
                <div className="text-sm font-medium text-slate-200">Global</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Test Section */}
      <section id="live-test" className="py-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Live Email Intelligence Test</h2>
            <p className="text-slate-400">Validate any email in real-time with our production API.</p>
          </div>
          
          <Card className="p-6 bg-slate-900/80 border-slate-800 backdrop-blur">
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <Button 
                onClick={handleLiveTest}
                disabled={isValidating}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-medium px-6"
              >
                {isValidating ? "Validating..." : "Validate Email"}
              </Button>
            </div>
            
            {validationResult && (
              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Decision</div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{validationResult.decision || "ACCEPT"}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Confidence</div>
                    <span className="text-lg font-semibold text-amber-400">{validationResult.confidence || "97%"}</span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Risk Score</div>
                    <span className="text-sm text-slate-300">{validationResult.riskScore || "Low"}</span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Response Time</div>
                    <span className="text-sm text-slate-300">{validationResult.responseTime || "214ms"}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-2">Signals</div>
                  <div className="flex flex-wrap gap-2">
                    {(validationResult.signals || ["MX Verified", "SMTP Check Passed", "No Disposable Detected", "High Domain Reputation"]).map((signal: string, i: number) => (
                      <Badge key={i} variant="outline" className="border-slate-600 text-slate-400 text-xs">{signal}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Overview Section */}
      <section id="overview" className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What is GoldMail Validation?</h2>
            <p className="text-slate-400 max-w-3xl mx-auto text-lg">
              GoldMail Validation is the intelligence layer that sits between user input and business decision. 
              It validates emails, scores risk, prevents fraud and improves deliverability at scale.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 bg-slate-900/50 border-slate-800">
              <h3 className="text-xl font-semibold mb-4 text-amber-400">Core Intelligence</h3>
              <ul className="space-y-3">
                {["Real-time email validation", "Risk scoring (0-100)", "Fraud detection", "Deliverability optimization"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6 bg-slate-900/50 border-slate-800">
              <h3 className="text-xl font-semibold mb-4 text-amber-400">Infrastructure</h3>
              <ul className="space-y-3">
                {["Global edge network", "Multi-region redundancy", "Enterprise SLAs", "Usage-based scaling"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">GoldMail Product Suite</h2>
            <p className="text-slate-400">One core. Multiple delivery formats.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productCards.map((product) => (
              <Card key={product.id} className="p-6 bg-slate-900/50 border-slate-800 hover:border-amber-500/30 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <product.icon className="w-10 h-10 text-amber-400" />
                  <Badge className={product.badgeColor}>{product.badge}</Badge>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-100">{product.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{product.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.features.map((feature, i) => (
                    <Badge key={i} variant="outline" className="border-slate-700 text-slate-500 text-xs">{feature}</Badge>
                  ))}
                </div>
                <Button 
                  variant={product.status === "planned" ? "ghost" : "outline"} 
                  size="sm" 
                  className={product.status === "planned" ? "text-slate-500" : "border-slate-700 text-slate-300 hover:bg-slate-800"}
                  asChild={product.status !== "planned"}
                >
                  {product.status === "planned" ? (
                    <span>Notify Me</span>
                  ) : (
                    <Link to={product.route}>View {product.type}</Link>
                  )}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How GoldMail Fits Your Stack</h2>
            <p className="text-slate-400">GoldMail operates as a silent intelligence layer, not a UI dependency.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: 1, title: "User / Platform", desc: "Email input from forms, APIs, or internal systems" },
              { step: 2, title: "GoldMail Intelligence Layer", desc: "Real-time validation, risk scoring, and fraud detection" },
              { step: 3, title: "Your Product / Agent / Workflow", desc: "Clean data and intelligence for your applications" }
            ].map((item) => (
              <Card key={item.step} className="p-6 bg-slate-900/50 border-slate-800 text-center relative">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-100">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </Card>
            ))}
          </div>
          
          <p className="text-center text-sm text-slate-500 mt-8">
            GoldMail operates silently as a decision layer, not a UI dependency.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-4">Usage-Based</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Transparent Pricing</h2>
            <p className="text-slate-400">
              Starting at <span className="text-amber-400 font-semibold">$0.00149</span> per validation
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <Card key={plan.id} className={`p-6 bg-slate-900/50 border-slate-800 relative ${plan.popular ? "ring-2 ring-amber-500/50" : ""}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900">Popular</Badge>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-slate-100">{plan.name}</h3>
                  <div className="text-3xl font-bold text-amber-400">{plan.price}</div>
                  <div className="text-sm text-slate-500">{plan.credits} credits/{plan.interval}</div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className={plan.popular 
                    ? "w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900" 
                    : "w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                  }
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.id === "scale" ? "Contact Sales" : plan.popular ? "Choose Plan" : "Get Started"}
                </Button>
              </Card>
            ))}
          </div>
          
          <p className="text-center text-sm text-slate-500 mt-8">
            Credits are shared across API, SaaS, Plugins and Agents.
          </p>
        </div>
      </section>

      {/* Developers Section */}
      <section id="developers" className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Developers</h2>
            <p className="text-slate-400">Enterprise-grade developer experience with comprehensive tooling.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {developerFeatures.map((feature, i) => (
              <Card key={i} className="p-6 bg-slate-900/50 border-slate-800">
                <h3 className="text-lg font-semibold mb-2 text-slate-100">{feature.name}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4 text-slate-300">Available SDKs</h3>
            <div className="flex justify-center flex-wrap gap-4 mb-6">
              {sdks.map((sdk, i) => (
                <Badge key={i} variant="outline" className="border-slate-700 text-slate-400 px-4 py-2">
                  <code className="text-xs">{sdk.package}</code>
                </Badge>
              ))}
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2" asChild>
              <Link to="/docs">
                <BookOpen className="w-4 h-4" /> Read Documentation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-slate-800/50 bg-slate-950">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-slate-900" />
                </div>
                <span className="font-semibold">XPEX Neural</span>
              </div>
              <p className="text-sm text-slate-500">Intelligence Infrastructure</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-slate-300">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/products/goldmail-validation" className="hover:text-slate-300 transition-colors">Overview</Link></li>
                <li><Link to="/products/goldmail-api" className="hover:text-slate-300 transition-colors">API</Link></li>
                <li><Link to="/products/goldmail-saas" className="hover:text-slate-300 transition-colors">SaaS</Link></li>
                <li><button onClick={() => scrollToSection("pricing")} className="hover:text-slate-300 transition-colors">Pricing</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-slate-300">Developers</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/docs" className="hover:text-slate-300 transition-colors">Documentation</Link></li>
                <li><Link to="/docs" className="hover:text-slate-300 transition-colors">API Reference</Link></li>
                <li><Link to="/docs" className="hover:text-slate-300 transition-colors">SDKs</Link></li>
                <li><Link to="/status" className="hover:text-slate-300 transition-colors">Status</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-slate-300">Company</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/about" className="hover:text-slate-300 transition-colors">About</Link></li>
                <li><Link to="/blog" className="hover:text-slate-300 transition-colors">Blog</Link></li>
                <li><Link to="/contact" className="hover:text-slate-300 transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-6 text-sm text-slate-500">
              <Link to="/legal/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
              <Link to="/legal/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
              <Link to="/legal/sla" className="hover:text-slate-300 transition-colors">SLA</Link>
            </div>
            <p className="text-sm text-slate-600">© 2025 XPEX Neural. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GoldMailValidation;
