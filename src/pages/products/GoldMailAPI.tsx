import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, Code, Zap, Shield, Globe, Clock, ArrowRight, Copy, 
  CheckCircle, ArrowLeft, Terminal, Lock, Activity
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Target Audience
const targetAudience = [
  { role: "Backend Engineers", useCase: "Direct API integration for user signup, form validation, and data pipelines" },
  { role: "DevOps Teams", useCase: "Automated email hygiene in CI/CD workflows and data processing" },
  { role: "AI/ML Engineers", useCase: "Training data validation and autonomous agent email intelligence" },
  { role: "Platform Teams", useCase: "Multi-tenant email validation for SaaS platforms" }
];

// Value Propositions
const valueProps = [
  { 
    title: "Production-Ready in Minutes", 
    description: "OpenAPI 3.0 spec, official SDKs for 4 languages, and comprehensive documentation. From zero to production in under 30 minutes.",
    metric: "<30 min"
  },
  { 
    title: "Sub-200ms Latency", 
    description: "Global edge network with 10+ locations ensures low-latency responses regardless of user geography.",
    metric: "200ms"
  },
  { 
    title: "Enterprise-Grade Reliability", 
    description: "99.9% uptime SLA with automatic failover, rate limiting, and comprehensive monitoring.",
    metric: "99.9%"
  }
];

const apiEndpoints = [
  {
    method: "POST",
    path: "/v1/validate",
    description: "Validate a single email address with full risk analysis",
    badge: "Core",
    latency: "~150ms"
  },
  {
    method: "POST",
    path: "/v1/validate/bulk",
    description: "Validate up to 10,000 emails in a single request",
    badge: "Bulk",
    latency: "async"
  },
  {
    method: "GET",
    path: "/v1/validate/status/:jobId",
    description: "Check bulk validation job status and retrieve results",
    badge: "Status",
    latency: "~50ms"
  },
  {
    method: "POST",
    path: "/v1/risk-score",
    description: "Get detailed risk analysis without full validation",
    badge: "Risk",
    latency: "~100ms"
  },
  {
    method: "GET",
    path: "/v1/credits",
    description: "Check current credit balance and usage",
    badge: "Account",
    latency: "~30ms"
  }
];

const codeExample = `// JavaScript SDK Example
import { GoldMail } from '@xpex/goldmail-js';

const goldmail = new GoldMail({
  apiKey: process.env.GOLDMAIL_API_KEY
});

// Validate single email with full analysis
const result = await goldmail.validate('user@example.com');

console.log(result);
// {
//   valid: true,
//   score: 97,
//   risk: 'low',
//   recommendation: 'accept',
//   details: {
//     format: true,
//     mx: true,
//     smtp: true,
//     disposable: false,
//     role: false,
//     free: true
//   },
//   latency: 142
// }`;

const features = [
  { icon: Zap, title: "Sub-200ms Response", description: "P95 latency under 200ms across all global edge locations" },
  { icon: Shield, title: "Enterprise Security", description: "SOC2 Type II compliant, encrypted in transit and at rest" },
  { icon: Globe, title: "Global Edge Network", description: "10+ edge locations for low-latency access worldwide" },
  { icon: Lock, title: "Granular API Keys", description: "Multiple keys with per-key rate limits and permissions" },
  { icon: Activity, title: "Real-time Monitoring", description: "Live metrics, usage logs, and alerting via dashboard" },
  { icon: Clock, title: "99.9% Uptime SLA", description: "Enterprise reliability with automatic failover and credits" }
];

const useCases = [
  { title: "User Signup", description: "Validate emails at registration to prevent fake accounts and reduce fraud" },
  { title: "Form Validation", description: "Real-time validation in contact forms, checkout flows, and lead capture" },
  { title: "Data Pipeline", description: "Bulk validation for CRM imports, data migrations, and list hygiene" },
  { title: "AI Agents", description: "Email intelligence for autonomous agents and AI-powered workflows" }
];

const GoldMailAPI = () => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Helmet>
        <title>GoldMail API - Email Validation API | XPEX Neural</title>
        <meta name="description" content="High-performance email validation and risk intelligence API. REST, WebSocket, GraphQL support with comprehensive SDKs." />
      </Helmet>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/products/goldmail-validation" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-slate-900" />
              </div>
              <span className="font-semibold text-lg">GoldMail API</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-400 hover:text-white">
                <Link to="/products/goldmail-validation">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Link>
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-medium" asChild>
                <Link to="/request-access">Get API Key</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 animate-fade-in">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Production Ready
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                GoldMail API
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              High-performance email validation and risk intelligence API. 
              <span className="text-slate-300"> Built for developers who need enterprise reliability without enterprise complexity.</span>
            </p>

            <div className="flex justify-center gap-3 flex-wrap pt-4">
              <Badge variant="outline" className="border-slate-600 text-slate-300">REST API</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">WebSocket</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">GraphQL</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">OpenAPI 3.0</Badge>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold gap-2" asChild>
                <Link to="/request-access">
                  Get API Key <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2" asChild>
                <Link to="/docs">
                  <Terminal className="w-4 h-4" /> Read Docs
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
                <div className="text-3xl font-bold text-blue-400 mb-2">{prop.metric}</div>
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
          <h2 className="text-2xl font-bold mb-8 text-center">Built for Technical Teams</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {targetAudience.map((audience, i) => (
              <Card key={i} className="p-4 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all">
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
                className="p-4 bg-slate-900/50 border-slate-800 flex items-center justify-between hover:border-blue-500/30 transition-all group animate-fade-in"
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
                  <Badge variant="outline" className="border-slate-700 text-slate-500">{endpoint.latency}</Badge>
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
                className="p-6 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all group animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <feature.icon className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold mb-2 text-slate-100">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Common Use Cases</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, i) => (
              <Card key={i} className="p-6 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all">
                <h3 className="font-semibold text-slate-100 mb-2">{useCase.title}</h3>
                <p className="text-sm text-slate-400">{useCase.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="p-10 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20 animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">Ready to integrate?</h2>
            <p className="text-slate-400 mb-6">Get your API key and start validating emails in under 5 minutes.</p>
            <div className="flex justify-center gap-4">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold" asChild>
                <Link to="/request-access">Request API Key</Link>
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
            <Link to="/products/goldmail-validation" className="hover:text-slate-300 transition-colors">Overview</Link>
            <Link to="/docs" className="hover:text-slate-300 transition-colors">Docs</Link>
            <Link to="/status" className="hover:text-slate-300 transition-colors">Status</Link>
          </div>
          <p className="text-sm text-slate-600">© 2025 XPEX Neural. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default GoldMailAPI;
