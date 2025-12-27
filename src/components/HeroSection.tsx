import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import LiveValidator from "./LiveValidator";
import { useValidationStats } from "@/hooks/useValidationStats";
import { analytics } from "@/lib/analytics";

const HeroSection = () => {
  const { stats } = useValidationStats();

  // Format validation count honestly
  const formatValidations = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    if (count > 0) return count.toString();
    return "—"; // Show dash when no data
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      
      {/* Scan Line Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Production-Ready Email Validation API
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="text-foreground">Construa monetização</span>
            <br />
            <span className="text-gradient">inteligente</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            APIs e agentes autônomos trabalham para você.
            Descubra, integre e monetize com precisão.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button 
              variant="cyber" 
              size="xl" 
              className="group w-full sm:w-auto" 
              asChild
              onClick={() => analytics.trackCTAClick('comece_a_construir', 'hero')}
            >
              <a href="/auth">
                Comece a Construir
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <Button 
              variant="glass" 
              size="xl" 
              className="w-full sm:w-auto" 
              asChild
              onClick={() => analytics.trackDemoStarted('hero_demo')}
            >
              <a href="/products/gold-email-validator">
                <Play className="w-5 h-5" />
                Assista a Demo
              </a>
            </Button>
          </div>

          {/* Live Demo */}
          <div className="mt-12 animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <LiveValidator />
          </div>

          {/* Stats - Only show real data or honest messaging */}
          <div className="grid grid-cols-3 gap-8 mt-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {[
              { 
                value: formatValidations(stats.total_validations), 
                label: "Validações",
                show: stats.total_validations > 0
              },
              { 
                value: `${stats.avg_latency_ms}ms`, 
                label: "Latência Média",
                show: true
              },
              { 
                value: `${stats.success_rate}%`, 
                label: "Precisão",
                show: true
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-1">
                  {stat.show ? stat.value : "—"}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
