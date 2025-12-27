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
  Code, Activity, Users, Package, Puzzle, Chrome, Bot, Layers, Bell
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// Custom hook for scroll-triggered animations
const useScrollAnimation = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

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

// Product Suite Card Data - Ecosystem Products
const productCards = [
  {
    id: "goldmail-api",
    name: "GoldMail API",
    type: "API",
    status: "live",
    badge: "Live",
    description: "Production-ready REST API with sub-200ms latency. Direct integration for developers and systems.",
    route: "/products/goldmail-api",
    features: ["REST API", "WebSocket", "GraphQL", "OpenAPI 3.0"],
    icon: Code,
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
    cta: "View API Docs",
    targetAudience: "Developers, Engineering Teams"
  },
  {
    id: "goldmail-saas",
    name: "GoldMail SaaS",
    type: "SaaS",
    status: "live",
    badge: "Live",
    description: "Full-featured dashboard for teams. Analytics, bulk validation, credit management, and team collaboration.",
    route: "/products/goldmail-saas",
    features: ["Dashboard", "Analytics", "Bulk Validation", "Team Management"],
    icon: Activity,
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
    cta: "Open SaaS",
    targetAudience: "Operations, Marketing Teams"
  },
  {
    id: "goldmail-plugin",
    name: "GoldMail Plugin",
    type: "Plugin",
    status: "beta",
    badge: "Beta",
    description: "Drop-in validation widget for forms and websites. Zero-config, instant protection.",
    route: "/products/goldmail-plugin",
    features: ["JavaScript SDK", "React", "Vue", "Web Components"],
    icon: Puzzle,
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    cta: "Install Plugin",
    targetAudience: "Frontend Developers, No-Code Teams"
  },
  {
    id: "goldmail-extension",
    name: "GoldMail Extension",
    type: "Extension",
    status: "planned",
    badge: "Q2 2025",
    description: "Browser extension for real-time validation while browsing. Validate emails anywhere on the web.",
    route: "/products/goldmail-extension",
    features: ["Chrome", "Firefox", "Safari", "Edge"],
    icon: Chrome,
    badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    cta: "Notify Me",
    targetAudience: "Sales, Support Teams"
  },
  {
    id: "goldmail-agent",
    name: "GoldMail Agent",
    type: "Agent",
    status: "planned",
    badge: "Q3 2025",
    description: "Autonomous email intelligence for AI workflows. LangChain and LlamaIndex compatible.",
    route: "/products/goldmail-agent",
    features: ["LangChain", "LlamaIndex", "Function Calling", "Streaming"],
    icon: Bot,
    badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    cta: "Notify Me",
    targetAudience: "AI Engineers, Automation Teams"
  },
  {
    id: "goldmail-bundles",
    name: "GoldMail Bundles",
    type: "Bundle",
    status: "live",
    badge: "Live",
    description: "Prebuilt product stacks optimized for SaaS, Marketing, AI, and Enterprise use cases.",
    route: "/products/goldmail-bundles",
    features: ["SaaS Stack", "Marketing Stack", "AI Stack", "Enterprise"],
    icon: Layers,
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
    cta: "View Bundles",
    targetAudience: "Product Teams, Enterprises"
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
    
    if (!user) {
      toast.error("Please sign in to test the API");
      navigate("/auth");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    
    try {
      // Fetch user's first active API key
      const { data: apiKeys, error: keysError } = await supabase
        .from("api_keys")
        .select("key")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);
      
      if (keysError || !apiKeys?.length) {
        toast.error("No active API key found. Please create one in Dashboard → API Keys");
        navigate("/dashboard");
        return;
      }

      const apiKey = apiKeys[0].key;
      
      const { data, error } = await supabase.functions.invoke("validate-email-ai", {
        body: { email },
        headers: { "X-API-Key": apiKey }
      });
      
      if (error) {
        console.error("Validation error:", error);
        toast.error(error.message || "Validation failed");
        return;
      }
      
      if (data?.ok === false) {
        toast.error(data.error || "Validation failed");
        setValidationResult({ error: data.error, code: data.code });
        return;
      }
      
      setValidationResult(data);
      toast.success(`Email validated in ${data?.data?.response_time_ms || 0}ms`);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Failed to connect to validation service");
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

      {/* Hero Section - Platform Hub Positioning */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-8">
            <div className="flex justify-center gap-2 flex-wrap animate-fade-in" style={{ animationDelay: "100ms" }}>
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:scale-105 transition-transform cursor-default">
                <Layers className="w-3 h-3 mr-1" /> Platform
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 hover:scale-105 transition-transform cursor-default">
                <CheckCircle className="w-3 h-3 mr-1" /> Enterprise Ready
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300 hover:scale-105 transition-transform cursor-default">6 Products</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300 hover:scale-105 transition-transform cursor-default">Global Infrastructure</Badge>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fade-in" style={{ animationDelay: "200ms" }}>
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Email Intelligence
              </span>
              <br />
              <span className="text-slate-100 text-4xl md:text-5xl">Platform</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-400 max-w-4xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "300ms" }}>
              The unified infrastructure layer for email validation, risk intelligence, and deliverability. 
              <span className="text-slate-300"> One platform. Six products. Infinite scale.</span>
            </p>

            <div className="flex justify-center gap-4 flex-wrap pt-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold gap-2 hover:scale-105 transition-transform"
                onClick={() => scrollToSection("products")}
              >
                <Grid3X3 className="w-4 h-4" /> Explore Ecosystem
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2 hover:scale-105 transition-transform"
                onClick={() => scrollToSection("live-test")}
              >
                <Play className="w-4 h-4" /> Try Live Demo
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
                {validationResult.error ? (
                  <div className="text-center py-4">
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 mb-2">{validationResult.code || "ERROR"}</Badge>
                    <p className="text-slate-400 text-sm">{validationResult.error}</p>
                    {validationResult.code === "MISSING_API_KEY" && (
                      <p className="text-xs text-slate-500 mt-2">Sign in and generate an API key in your dashboard to test.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Decision</div>
                        <Badge className={validationResult.data?.valid ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                          {validationResult.data?.valid ? "ACCEPT" : "REJECT"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Score</div>
                        <span className="text-lg font-semibold text-amber-400">{validationResult.data?.score || 0}/100</span>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Risk Level</div>
                        <Badge className={
                          validationResult.data?.risk_level === "low" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                          validationResult.data?.risk_level === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                          "bg-red-500/20 text-red-400 border-red-500/30"
                        }>
                          {validationResult.data?.risk_level?.toUpperCase() || "UNKNOWN"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Response Time</div>
                        <span className="text-sm text-slate-300">{validationResult.data?.response_time_ms || 0}ms</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-xs text-slate-500 mb-2">Checks</div>
                      <div className="flex flex-wrap gap-2">
                        {validationResult.data?.format_valid && <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">Format Valid</Badge>}
                        {validationResult.data?.mx_found && <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">MX Found</Badge>}
                        {!validationResult.data?.disposable && <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">Not Disposable</Badge>}
                        {validationResult.data?.disposable && <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">Disposable</Badge>}
                        {validationResult.data?.ai_powered && <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">AI Powered</Badge>}
                      </div>
                    </div>
                    {validationResult.data?.domain_analysis && (
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 mb-1">AI Analysis</div>
                        <p className="text-sm text-slate-300">{validationResult.data.domain_analysis}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
                      <span>Credits used: {validationResult.credits_used || 1}</span>
                      <span>Remaining: {validationResult.remaining_credits?.toLocaleString() || 0}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Overview Section - Platform Positioning */}
      <section id="overview" className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="bg-slate-800 text-slate-300 border-slate-700 mb-4">Platform Overview</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Email Intelligence Infrastructure</h2>
            <p className="text-slate-400 max-w-4xl mx-auto text-lg">
              GoldMail is not a single product—it's a complete platform ecosystem. 
              The core validation engine powers six specialized products, each designed for specific teams and use cases.
              <span className="text-slate-300 block mt-2">Choose the interface that fits your workflow. Share credits across all products.</span>
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-slate-900/50 border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-100">Core Engine</h3>
              <p className="text-sm text-slate-400 mb-4">Real-time validation, risk scoring, fraud detection, and deliverability intelligence.</p>
              <ul className="space-y-2">
                {["Sub-200ms latency", "99.99% uptime SLA", "Global edge network"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6 bg-slate-900/50 border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-100">Developer-First</h3>
              <p className="text-sm text-slate-400 mb-4">REST API, SDKs, webhooks, and comprehensive documentation for seamless integration.</p>
              <ul className="space-y-2">
                {["OpenAPI 3.0 spec", "4 official SDKs", "Real-time webhooks"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6 bg-slate-900/50 border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-100">Team-Ready</h3>
              <p className="text-sm text-slate-400 mb-4">Dashboard, analytics, bulk validation, and collaboration features for entire organizations.</p>
              <ul className="space-y-2">
                {["Role-based access", "Shared credit pool", "Audit logging"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Products Section - Ecosystem */}
      <section id="products" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-4">Ecosystem</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">GoldMail Product Ecosystem</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Six specialized products built on one core engine. Each product is enterprise-ready with its own interface, 
              documentation, and support—all sharing a unified credit system.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productCards.map((product, index) => (
              <Card 
                key={product.id} 
                className={`p-6 bg-slate-900/50 border-slate-800 hover:border-amber-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/5 animate-fade-in ${product.status === "live" ? "ring-1 ring-green-500/20" : ""}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <product.icon className="w-10 h-10 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                  <Badge className={`${product.badgeColor} group-hover:scale-105 transition-transform`}>{product.badge}</Badge>
                </div>
                <div className="mb-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">{product.type}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-100 group-hover:text-amber-400 transition-colors">{product.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{product.description}</p>
                <div className="text-xs text-slate-500 mb-3">
                  <span className="text-slate-400">Target:</span> {product.targetAudience}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.features.map((feature, i) => (
                    <Badge key={i} variant="outline" className="border-slate-700 text-slate-500 text-xs hover:border-slate-600 transition-colors">{feature}</Badge>
                  ))}
                </div>
                <Button 
                  variant={product.status === "planned" ? "ghost" : "outline"} 
                  size="sm" 
                  className={`w-full ${product.status === "planned" ? "text-slate-500" : "border-slate-700 text-slate-300 hover:bg-slate-800"} transition-all duration-300`}
                  asChild={product.status !== "planned"}
                >
                  {product.status === "planned" ? (
                    <span className="flex items-center justify-center gap-2"><Bell className="w-3 h-3" /> {product.cta}</span>
                  ) : (
                    <Link to={product.route} className="flex items-center justify-center gap-2">{product.cta} <ArrowRight className="w-3 h-3" /></Link>
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
          
          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connection lines for desktop */}
            <div className="hidden md:block absolute top-1/2 left-1/3 w-1/3 h-0.5 bg-gradient-to-r from-amber-500/50 to-amber-500/50 -translate-y-1/2" />
            <div className="hidden md:block absolute top-1/2 right-1/3 w-1/3 h-0.5 bg-gradient-to-r from-amber-500/50 to-amber-500/50 -translate-y-1/2" />
            
            {[
              { step: 1, title: "User / Platform", desc: "Email input from forms, APIs, or internal systems" },
              { step: 2, title: "GoldMail Intelligence Layer", desc: "Real-time validation, risk scoring, and fraud detection" },
              { step: 3, title: "Your Product / Agent / Workflow", desc: "Clean data and intelligence for your applications" }
            ].map((item, index) => (
              <Card 
                key={item.step} 
                className="p-6 bg-slate-900/50 border-slate-800 text-center relative hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-100">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </Card>
            ))}
          </div>
          
          <p className="text-center text-sm text-slate-500 mt-8 animate-fade-in" style={{ animationDelay: "500ms" }}>
            GoldMail operates silently as a decision layer, not a UI dependency.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-4 animate-fade-in">Usage-Based</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Transparent Pricing</h2>
            <p className="text-slate-400">
              Starting at <span className="text-amber-400 font-semibold">$0.00149</span> per validation
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={plan.id} 
                className={`p-6 bg-slate-900/50 border-slate-800 relative transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-fade-in ${plan.popular ? "ring-2 ring-amber-500/50 hover:ring-amber-500/80" : "hover:border-slate-700"}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 animate-pulse">Popular</Badge>
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
                  className={`${plan.popular 
                    ? "w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900" 
                    : "w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                  } hover:scale-[1.02] transition-transform`}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link to={plan.id === "scale" ? "/request-access" : "/auth"}>
                    {plan.id === "scale" ? "Contact Sales" : plan.popular ? "Choose Plan" : "Get Started"}
                  </Link>
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
              <Card 
                key={i} 
                className="p-6 bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-300 group hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <h3 className="text-lg font-semibold mb-2 text-slate-100 group-hover:text-amber-400 transition-colors">{feature.name}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4 text-slate-300">Available SDKs</h3>
            <div className="flex justify-center flex-wrap gap-4 mb-6">
              {sdks.map((sdk, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="border-slate-700 text-slate-400 px-4 py-2 hover:border-amber-500/50 hover:text-slate-300 transition-all cursor-default animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <code className="text-xs">{sdk.package}</code>
                </Badge>
              ))}
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2 hover:scale-105 transition-transform" asChild>
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
