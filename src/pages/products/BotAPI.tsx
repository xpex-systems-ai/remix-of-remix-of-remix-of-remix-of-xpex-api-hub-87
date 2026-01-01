import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, Code, Zap, Shield, Globe, Clock, ArrowRight, Copy, 
  CheckCircle, ArrowLeft, Terminal, Lock, Activity, Cpu, Workflow
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

// Target Audience
const targetAudience = [
  { role: "AI Agents", useCase: "Autonomous agents requiring email validation and intelligence services" },
  { role: "Automation Bots", useCase: "RPA systems and workflow automation with API consumption" },
  { role: "Enterprise Systems", useCase: "Backend services and microservices needing email validation" },
  { role: "Data Pipelines", useCase: "ETL workflows and data processing with bulk validation needs" }
];

// Value Propositions
const valueProps = [
  { 
    title: "Bot-First Design", 
    description: "No UI dependency. Pure API consumption with predictable JSON responses and consistent schema.",
    metric: "0% UI"
  },
  { 
    title: "High Throughput", 
    description: "Designed for thousands to millions of requests per day with horizontal scaling.",
    metric: "1M+/day"
  },
  { 
    title: "Usage-Based Billing", 
    description: "Pay only for what your bot consumes. Credits deducted per request with auto-recharge.",
    metric: "Pay-as-go"
  }
];

const apiEndpoints = [
  {
    method: "POST",
    path: "/v1/validate-email",
    description: "Standard email validation with full domain analysis",
    badge: "Core",
    credits: 1
  },
  {
    method: "POST",
    path: "/v1/validate-email-ai",
    description: "AI-enhanced validation with behavioral inference",
    badge: "AI",
    credits: 1
  },
  {
    method: "POST",
    path: "/v1/bulk-validate-email",
    description: "Bulk validation for up to 10,000 emails per job",
    badge: "Bulk",
    credits: "dynamic"
  },
  {
    method: "GET",
    path: "/v1/health",
    description: "Health check endpoint for monitoring",
    badge: "Status",
    credits: 0
  }
];

const codeExample = `// Bot Integration Example
const API_KEY = process.env.BOT_API_KEY;
const BASE_URL = 'https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1';

async function validateEmail(email) {
  const response = await fetch(\`\${BASE_URL}/validate-email\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ email })
  });
  
  return response.json();
}

// Usage in your bot
const result = await validateEmail('user@example.com');
// {
//   email: "user@example.com",
//   is_valid: true,
//   domain: "example.com",
//   mx_records: true,
//   disposable: false,
//   role_account: false
// }`;

const features = [
  { icon: Bot, title: "Bot-First Design", description: "No UI dependency. Pure API consumption with predictable responses" },
  { icon: Zap, title: "High Throughput", description: "Handle millions of requests per day with horizontal scaling" },
  { icon: Lock, title: "API Key Auth", description: "Secure access via API keys with rate limiting and monitoring" },
  { icon: Activity, title: "Real-time Monitoring", description: "Live metrics, usage logs, and alerting via dashboard" },
  { icon: Workflow, title: "Webhook Support", description: "Async callbacks for bulk operations and event notifications" },
  { icon: Clock, title: "99.9% Uptime SLA", description: "Enterprise reliability with automatic failover and credits" }
];

const pricingPackages = [
  { name: "Bot Starter", credits: "10,000", price: 29, description: "For small bots and early automation" },
  { name: "Bot Scale", credits: "100,000", price: 199, description: "For production bots and SaaS backends" },
  { name: "Bot Infinite", credits: "Custom", price: "Enterprise", description: "Unlimited usage with SLA and priority routing" }
];

const BotAPI = () => {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const copyCode = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateAPIKey = () => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Helmet>
        <title>Bot API - Infrastructure API for Automated Systems | XPEX Neural</title>
        <meta name="description" content="High-performance API designed exclusively for bots, agents, and automated systems. Built for scale, stability, and pay-per-use monetization." />
      </Helmet>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg">Bot API</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-400 hover:text-white">
                <Link to="/marketplace">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Link>
              </Button>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium"
                onClick={handleGenerateAPIKey}
              >
                Generate API Key
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 animate-fade-in">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Live
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-500 bg-clip-text text-transparent">
                Bot API
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Infrastructure API for Automated Systems & Bots.
              <span className="text-slate-300"> Built for scale, stability, and pay-per-use monetization.</span>
            </p>

            <div className="flex justify-center gap-3 flex-wrap pt-4">
              <Badge variant="outline" className="border-slate-600 text-slate-300">REST API</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Credit-Based</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Auto-Recharge</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Webhooks</Badge>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold gap-2"
                onClick={handleGenerateAPIKey}
              >
                Generate API Key <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2" asChild>
                <Link to="/docs">
                  <Terminal className="w-4 h-4" /> View Documentation
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-12 px-4 bg-slate-900/30 border-y border-slate-800/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-6">
            {valueProps.map((prop, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-violet-400 mb-2">{prop.metric}</div>
                <h3 className="font-semibold text-slate-100 mb-1">{prop.title}</h3>
                <p className="text-sm text-slate-500">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Built for Autonomous Systems</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {targetAudience.map((audience, i) => (
              <Card key={i} className="p-4 bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-all">
                <h3 className="font-semibold text-slate-100 mb-2">{audience.role}</h3>
                <p className="text-xs text-slate-400">{audience.useCase}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 text-center">API Endpoints</h2>
          
          <div className="space-y-3">
            {apiEndpoints.map((endpoint, i) => (
              <Card 
                key={i} 
                className="p-4 bg-slate-900/50 border-slate-800 flex items-center justify-between hover:border-violet-500/30 transition-all group animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <Badge className={endpoint.method === "POST" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}>
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm text-slate-300 font-mono">{endpoint.path}</code>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 hidden sm:block">{endpoint.description}</span>
                  <Badge variant="outline" className="border-slate-700 text-slate-500">
                    {endpoint.credits === 0 ? 'Free' : `${endpoint.credits} credit${endpoint.credits === 1 ? '' : 's'}`}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Quick Start</h2>
          
          <Card className="bg-slate-900 border-slate-800 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <Button variant="ghost" size="sm" onClick={copyCode} className="gap-2 text-slate-400 hover:text-white">
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <pre className="p-6 overflow-x-auto">
              <code className="text-sm text-slate-300 font-mono whitespace-pre">{codeExample}</code>
            </pre>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">API Features</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card 
                key={i} 
                className="p-6 bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-all group animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <feature.icon className="w-8 h-8 text-violet-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold mb-2 text-slate-100">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Pricing Packages</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {pricingPackages.map((pkg, i) => (
              <Card 
                key={i} 
                className={`p-6 bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-all ${i === 1 ? 'ring-2 ring-violet-500/50' : ''}`}
              >
                {i === 1 && (
                  <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 mb-4">Most Popular</Badge>
                )}
                <h3 className="font-bold text-xl text-slate-100 mb-2">{pkg.name}</h3>
                <div className="text-3xl font-bold text-violet-400 mb-2">
                  {typeof pkg.price === 'number' ? `$${pkg.price}` : pkg.price}
                </div>
                <p className="text-sm text-slate-500 mb-4">{pkg.credits} credits</p>
                <p className="text-sm text-slate-400">{pkg.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="p-10 bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20 animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">Ready to integrate?</h2>
            <p className="text-slate-400 mb-6">Get your API key and start validating emails in under 5 minutes.</p>
            <div className="flex justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold"
                onClick={handleGenerateAPIKey}
              >
                Generate API Key
              </Button>
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-300" asChild>
                <Link to="/docs">Read Documentation</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800/50">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-6 text-sm text-slate-500">
            <Link to="/marketplace" className="hover:text-slate-300 transition-colors">Marketplace</Link>
            <Link to="/docs" className="hover:text-slate-300 transition-colors">Docs</Link>
            <Link to="/status" className="hover:text-slate-300 transition-colors">Status</Link>
          </div>
          <p className="text-sm text-slate-600">© 2025 XPEX Neural. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default BotAPI;
