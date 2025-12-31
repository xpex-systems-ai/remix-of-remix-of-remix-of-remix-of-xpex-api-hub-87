import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Search, Star, Zap, Shield, Globe, Database, Link2, Mail, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

type ProductStatus = "live" | "coming-soon";

interface API {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  pricing: string;
  rating: number;
  calls: string;
  featured: boolean;
  features: string[];
  href: string;
  status: ProductStatus;
}

const apis: API[] = [
  {
    id: "gold-email-validator",
    name: "Gold Email Validator",
    description: "Professional email validation with AI risk scoring, MX verification, and disposable detection.",
    icon: Mail,
    category: "Validation",
    pricing: "From $0.009/call",
    rating: 4.9,
    calls: "2.5M+",
    featured: true,
    features: ["MX Check", "AI Risk Score", "Disposable Detection", "<50ms Latency"],
    href: "/products/goldmail-validation",
    status: "live",
  },
  {
    id: "breach-scan",
    name: "BreachScan",
    description: "Check if emails appear in known data breaches with severity scoring.",
    icon: Shield,
    category: "Security",
    pricing: "$0.01/call",
    rating: 0,
    calls: "—",
    featured: false,
    features: ["Breach Database", "Risk Assessment", "Exposure Details"],
    href: "/products/breach-scan",
    status: "coming-soon",
  },
  {
    id: "ip-insight",
    name: "IPInsight",
    description: "IP geolocation, VPN/proxy detection, and threat intelligence.",
    icon: Globe,
    category: "Security",
    pricing: "$0.008/call",
    rating: 0,
    calls: "—",
    featured: false,
    features: ["Geolocation", "VPN Detection", "Threat Score"],
    href: "/products/ip-insight",
    status: "coming-soon",
  },
  {
    id: "copy-voraz",
    name: "CopyVoraz",
    description: "AI-powered viral copy generation for marketing campaigns.",
    icon: Zap,
    category: "AI",
    pricing: "$0.03/call",
    rating: 0,
    calls: "—",
    featured: false,
    features: ["Viral Headlines", "Multiple Tones", "A/B Variants"],
    href: "/products/copy-voraz",
    status: "coming-soon",
  },
  {
    id: "extrair-produtos",
    name: "ExtrairProdutos",
    description: "Scrape product data from major marketplaces automatically.",
    icon: Database,
    category: "Data",
    pricing: "$0.005/call",
    rating: 0,
    calls: "—",
    featured: false,
    features: ["Multi-marketplace", "Price Tracking", "Structured Data"],
    href: "/products/extrair-produtos",
    status: "coming-soon",
  },
  {
    id: "link-magic",
    name: "LinkMagic",
    description: "URL health checking, redirect analysis, and broken link detection.",
    icon: Link2,
    category: "Utility",
    pricing: "$0.005/call",
    rating: 0,
    calls: "—",
    featured: false,
    features: ["Health Check", "Redirect Chain", "SSL Validation"],
    href: "/products/link-magic",
    status: "coming-soon",
  },
];

const categories = ["All", "Validation", "Security", "AI", "Data", "Utility"];

const StatusBadge = ({ status }: { status: ProductStatus }) => {
  if (status === "live") {
    return (
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
        Live
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground border-border">
      <Clock className="w-3 h-3 mr-1" />
      Coming Soon
    </Badge>
  );
};

const Marketplace = () => {
  const liveApis = apis.filter(a => a.status === "live");
  const comingSoonApis = apis.filter(a => a.status === "coming-soon");

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>API Marketplace - XPEX Neural | Discover Powerful APIs</title>
        <meta
          name="description"
          content="Explore our collection of production-ready APIs. Email validation, security, AI, and more. Agent-ready with MCP support."
        />
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-cyan-400 to-purple-500 bg-clip-text text-transparent">
            API Marketplace
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Production-ready APIs designed for the Agent Economy. Discover, integrate, and scale.
          </p>
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search APIs..." className="pl-10 bg-card/50 border-border/50" />
          </div>
        </section>

        {/* Categories */}
        <section className="container mx-auto px-4 mb-10">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={cat === "All" ? "default" : "outline"}
                size="sm"
                className="rounded-full"
              >
                {cat}
              </Button>
            ))}
          </div>
        </section>

        {/* Featured API - Only Live Products */}
        {liveApis.filter((a) => a.featured).map((api) => (
          <section key={api.id} className="container mx-auto px-4 mb-12">
            <Card className="p-8 bg-gradient-to-br from-primary/10 via-card/50 to-purple-500/10 border-primary/30">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="p-4 rounded-xl bg-primary/20 border border-primary/30">
                  <api.icon className="w-10 h-10 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{api.name}</h2>
                    <Badge className="bg-primary/20 text-primary border-primary/30">Featured</Badge>
                    <StatusBadge status={api.status} />
                  </div>
                  <p className="text-muted-foreground mb-4">{api.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {api.features.map((f) => (
                      <Badge key={f} variant="secondary" className="bg-secondary/50">
                        {f}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      {api.rating}
                    </span>
                    <span className="text-muted-foreground">{api.calls} calls</span>
                    <span className="text-primary font-semibold">{api.pricing}</span>
                  </div>
                </div>
                <Button asChild size="lg">
                  <Link to={api.href}>Get Started</Link>
                </Button>
              </div>
            </Card>
          </section>
        ))}

        {/* Live APIs Section */}
        <section className="container mx-auto px-4 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold">Available Now</h2>
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Core Platform</Badge>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveApis.filter((a) => !a.featured).map((api) => (
              <Link key={api.id} to={api.href}>
                <Card
                  className="p-6 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all group h-full"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <api.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{api.name}</h3>
                        <StatusBadge status={api.status} />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {api.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{api.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {api.rating}
                    </span>
                    <span className="text-primary font-medium">{api.pricing}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Coming Soon APIs Section */}
        <section className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-muted-foreground">Coming Soon</h2>
            <Badge variant="outline" className="text-muted-foreground border-border">
              <Clock className="w-3 h-3 mr-1" />
              Roadmap
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comingSoonApis.map((api) => (
              <Link key={api.id} to={api.href}>
                <Card
                  className="p-6 bg-card/30 backdrop-blur border-border/30 hover:border-border/50 transition-all group h-full opacity-70 hover:opacity-90"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                      <api.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-muted-foreground">{api.name}</h3>
                      </div>
                      <Badge variant="outline" className="text-xs text-muted-foreground border-border/50">
                        {api.category}
                      </Badge>
                    </div>
                    <StatusBadge status={api.status} />
                  </div>
                  <p className="text-muted-foreground/70 text-sm mb-4 line-clamp-2">{api.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground/50">Not yet rated</span>
                    <span className="text-muted-foreground font-medium">{api.pricing}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Marketplace;
