import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bell, Bot, CheckCircle2, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const GoldMailAgent = () => {
  return (
    <>
      <Helmet>
        <title>GoldMail Agent | XPEX Neural</title>
        <meta name="description" content="GoldMail Agent - Autonomous email intelligence for AI agents, automations, and decision systems." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            {/* Back Navigation */}
            <Link 
              to="/products/goldmail-validation" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to GoldMail Platform
            </Link>

            {/* Hero Section */}
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge variant="outline" className="mb-6 border-amber-500/50 text-amber-400">
                <Bot className="w-3 h-3 mr-1" />
                Planned • Q2 2025
              </Badge>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="text-gradient">GoldMail Agent</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Autonomous email intelligence for AI agents, automations, and decision systems.
              </p>

              <Card className="bg-card/50 border-border/50 max-w-xl mx-auto">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Bell className="w-6 h-6 text-primary" />
                    <span className="text-lg font-medium">Get Notified on Launch</span>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    Be the first to know when GoldMail Agent becomes available. Join the waitlist for early access.
                  </p>

                  <Link to="/request-access">
                    <Button variant="neon" size="lg" className="w-full">
                      <Bell className="w-4 h-4 mr-2" />
                      Notify Me
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Planned Features */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-center">Planned Capabilities</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  "MCP (Model Context Protocol) compatible tool",
                  "LangChain & LlamaIndex integrations",
                  "Autonomous list cleaning workflows",
                  "AI-driven email discovery and enrichment",
                  "Multi-agent orchestration support",
                  "Decision-ready confidence scoring"
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-card/30 rounded-lg border border-border/30">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Link */}
            <div className="max-w-4xl mx-auto mt-16 text-center">
              <p className="text-muted-foreground mb-4">
                Explore the full GoldMail ecosystem
              </p>
              <Link to="/products/goldmail-validation">
                <Button variant="outline">
                  <Zap className="w-4 h-4 mr-2" />
                  View GoldMail Platform
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default GoldMailAgent;
