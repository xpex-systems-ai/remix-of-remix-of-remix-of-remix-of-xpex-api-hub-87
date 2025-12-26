import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, Package, Rocket, Megaphone, Bot, Building2, 
  ArrowRight, CheckCircle, ArrowLeft, Sparkles
} from "lucide-react";

const bundles = [
  {
    id: "saas-stack",
    name: "SaaS Stack",
    icon: Rocket,
    description: "Perfect for SaaS platforms needing email validation during user signup and onboarding.",
    includes: [
      "GoldMail API (Real-time validation)",
      "Webhook integrations",
      "User signup protection",
      "Risk scoring for trial abuse prevention",
      "Bulk validation for imports"
    ],
    useCase: "User registration, trial signups, account verification",
    color: "from-blue-500 to-cyan-500",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  },
  {
    id: "marketing-stack",
    name: "Marketing Stack",
    icon: Megaphone,
    description: "Optimized for marketing teams to clean lists and improve email deliverability.",
    includes: [
      "Bulk validation (up to 1M emails)",
      "List hygiene scoring",
      "Bounce prediction",
      "Disposable email detection",
      "CSV/Excel import/export"
    ],
    useCase: "Email campaigns, lead generation, list cleaning",
    color: "from-pink-500 to-rose-500",
    badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/30"
  },
  {
    id: "ai-stack",
    name: "AI Stack",
    icon: Bot,
    description: "Built for AI agents and automation workflows requiring email intelligence.",
    includes: [
      "GoldMail Agent (LangChain compatible)",
      "Streaming validation responses",
      "Function calling support",
      "Context-aware risk scoring",
      "Workflow automation triggers"
    ],
    useCase: "AI agents, chatbots, automated workflows",
    color: "from-purple-500 to-violet-500",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Building2,
    description: "Full-featured enterprise solution with dedicated support and custom integrations.",
    includes: [
      "All products included",
      "Custom SLA (99.99% uptime)",
      "Dedicated account manager",
      "SSO/SAML integration",
      "Custom rate limits",
      "On-premise option available"
    ],
    useCase: "Large organizations, compliance-heavy industries",
    color: "from-amber-500 to-yellow-500",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30"
  }
];

const GoldMailBundles = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Helmet>
        <title>GoldMail Bundles - Prebuilt Stacks | XPEX Neural</title>
        <meta name="description" content="Prebuilt GoldMail stacks for SaaS, Marketing, AI teams, and Enterprise. Get the right combination of products for your use case." />
      </Helmet>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/products/goldmail-validation" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-slate-900" />
              </div>
              <span className="font-semibold text-lg">GoldMail Bundles</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-400 hover:text-white">
                <Link to="/products/goldmail-validation">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Link>
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-medium" asChild>
                <Link to="/request-access">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 animate-fade-in">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Available Now
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                GoldMail Bundles
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Prebuilt stacks for SaaS, Marketing, and AI teams. Get exactly what you need, ready to deploy.
            </p>

            <div className="flex justify-center gap-3 flex-wrap pt-4">
              <Badge variant="outline" className="border-slate-600 text-slate-300">SaaS Stack</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Marketing Stack</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">AI Stack</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Enterprise</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Bundles Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-6">
            {bundles.map((bundle, i) => (
              <Card 
                key={bundle.id} 
                className="p-6 bg-slate-900/50 border-slate-800 hover:border-amber-500/30 transition-all group animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bundle.color} p-0.5`}>
                    <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center">
                      <bundle.icon className="w-6 h-6 text-slate-100" />
                    </div>
                  </div>
                  <Badge className={bundle.badgeColor}>Bundle</Badge>
                </div>

                <h3 className="text-xl font-bold mb-2 text-slate-100">{bundle.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{bundle.description}</p>

                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Includes:</div>
                  <ul className="space-y-2">
                    {bundle.includes.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Best for:</div>
                  <p className="text-sm text-slate-300">{bundle.useCase}</p>
                </div>

                <Button 
                  className={`w-full bg-gradient-to-r ${bundle.color} text-white font-medium gap-2 hover:opacity-90`}
                  asChild
                >
                  <Link to="/request-access">
                    Get {bundle.name} <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Note */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="p-8 bg-slate-900/50 border-slate-800 animate-fade-in">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-3 text-slate-100">Not sure which bundle?</h3>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              Our team can help you choose the right bundle for your specific use case. 
              All bundles share the same credit pool, so you can upgrade anytime.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold" asChild>
                <Link to="/request-access">Talk to Sales</Link>
              </Button>
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-300" asChild>
                <Link to="/pricing">View Pricing</Link>
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
            <Link to="/products/goldmail-api" className="hover:text-slate-300 transition-colors">API</Link>
            <Link to="/products/goldmail-saas" className="hover:text-slate-300 transition-colors">SaaS</Link>
          </div>
          <p className="text-sm text-slate-600">© 2025 XPEX Neural. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default GoldMailBundles;
