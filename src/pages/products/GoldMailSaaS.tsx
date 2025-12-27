import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, LayoutDashboard, BarChart3, Bell, FileText, Users, Settings,
  ArrowRight, CheckCircle, ArrowLeft, LineChart, CreditCard, Shield
} from "lucide-react";

const dashboardFeatures = [
  { 
    icon: BarChart3, 
    title: "Real-time Analytics", 
    description: "Live validation metrics, success rates, and trends visualization with customizable date ranges." 
  },
  { 
    icon: FileText, 
    title: "Validation Logs", 
    description: "Comprehensive logs with filtering, search, and export capabilities for compliance and debugging." 
  },
  { 
    icon: CreditCard, 
    title: "Credit Management", 
    description: "Purchase credits, set up auto-recharge, and track usage across all products." 
  },
  { 
    icon: Bell, 
    title: "Smart Alerts", 
    description: "Configurable notifications for low credits, usage spikes, and system events." 
  },
  { 
    icon: Users, 
    title: "Team Management", 
    description: "Invite team members, assign roles, and manage permissions across your organization." 
  },
  { 
    icon: Settings, 
    title: "API Key Console", 
    description: "Create, rotate, and manage multiple API keys with granular access controls." 
  }
];

const screenshotAreas = [
  { title: "Overview Dashboard", description: "At-a-glance metrics and health status" },
  { title: "Validation Analytics", description: "Deep-dive into validation patterns" },
  { title: "Bulk Validation", description: "Upload and process email lists" },
  { title: "Billing Center", description: "Invoices, credits, and subscriptions" }
];

const GoldMailSaaS = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Helmet>
        <title>GoldMail SaaS - Enterprise Dashboard | XPEX Neural</title>
        <meta name="description" content="Enterprise dashboard for GoldMail with analytics, logs, credit management, and team collaboration features." />
      </Helmet>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/products/goldmail-validation" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-slate-900" />
              </div>
              <span className="font-semibold text-lg">GoldMail SaaS</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-400 hover:text-white">
                <Link to="/products/goldmail-validation">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Link>
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-medium" asChild>
                <Link to="/dashboard">Open Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 animate-fade-in">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Your Dashboard is Ready
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                GoldMail Dashboard
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              The GoldMail Dashboard is your command center for email validation.
              <span className="text-slate-300"> API + Dashboard together form the complete GoldMail SaaS platform—no separate products, just one integrated solution.</span>
            </p>

            <div className="flex justify-center gap-3 flex-wrap pt-4">
              <Badge variant="outline" className="border-slate-600 text-slate-300">API Access</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Bulk Validation</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Usage Analytics</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">Credit Management</Badge>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold gap-2" asChild>
                <Link to="/auth">
                  Start Free <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="w-4 h-4" /> Open Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-12 px-4 bg-slate-900/30 border-y border-slate-800/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            {[
              { role: "Marketing Teams", desc: "Clean email lists before campaigns" },
              { role: "Operations", desc: "Bulk validation and data hygiene" },
              { role: "Growth Teams", desc: "Lead quality scoring" },
              { role: "Compliance", desc: "Audit logs and reporting" }
            ].map((item, i) => (
              <div key={i}>
                <h3 className="font-semibold text-purple-400 mb-1">{item.role}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Areas */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Dashboard Modules</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {screenshotAreas.map((area, i) => (
              <Card 
                key={i} 
                className="p-6 bg-slate-900/50 border-slate-800 hover:border-purple-500/30 transition-all text-center group animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-full h-24 bg-slate-800/50 rounded-lg mb-4 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                  <LineChart className="w-8 h-8 text-slate-600 group-hover:text-purple-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-slate-100 mb-1">{area.title}</h3>
                <p className="text-xs text-slate-500">{area.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Platform Features</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardFeatures.map((feature, i) => (
              <Card 
                key={i} 
                className="p-6 bg-slate-900/50 border-slate-800 hover:border-purple-500/30 transition-all group animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <feature.icon className="w-8 h-8 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold mb-2 text-slate-100">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 bg-slate-900/50 border-slate-800 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-10 h-10 text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-3 text-slate-100">Enterprise-Grade Security</h3>
                <p className="text-slate-400 mb-4">
                  SOC2 Type II compliant with end-to-end encryption, role-based access control, 
                  and comprehensive audit logging. Your data is protected by industry-leading security practices.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="outline" className="border-slate-700 text-slate-400">SOC2 Compliant</Badge>
                  <Badge variant="outline" className="border-slate-700 text-slate-400">GDPR Ready</Badge>
                  <Badge variant="outline" className="border-slate-700 text-slate-400">SSO Support</Badge>
                  <Badge variant="outline" className="border-slate-700 text-slate-400">MFA Enabled</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="p-10 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20 animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-slate-400 mb-6">Create your free account and start validating emails today.</p>
            <div className="flex justify-center gap-4">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold" asChild>
                <Link to="/auth">Create Free Account</Link>
              </Button>
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-300" asChild>
                <Link to="/request-access">Request Enterprise Demo</Link>
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
            <Link to="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
          </div>
          <p className="text-sm text-slate-600">© 2025 XPEX Neural. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default GoldMailSaaS;
