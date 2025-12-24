import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Coins, Zap, Sparkles, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const packages = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: "2,000",
    price: "$5",
    pricePerCall: "$0.0025",
    icon: Coins,
    popular: false,
  },
  {
    id: "growth",
    name: "Growth Pack",
    credits: "20,000",
    price: "$39",
    pricePerCall: "$0.00195",
    savings: "22% savings",
    icon: Zap,
    popular: true,
  },
  {
    id: "scale",
    name: "Scale Pack",
    credits: "100,000",
    price: "$149",
    pricePerCall: "$0.00149",
    savings: "40% savings",
    icon: Crown,
    popular: false,
  },
];

const CreditPackages = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(packageId);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { package: packageId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao comprar créditos:", error);
      toast.error("Falha ao iniciar checkout. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Pay As You Go</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-3">
            <span className="text-foreground">Credit</span>{" "}
            <span className="text-gradient">Packages</span>
          </h3>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Need more flexibility? Buy credits and use them anytime. Never expires.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {packages.map((pkg, index) => (
            <div
              key={pkg.id}
              className={`relative card-cyber rounded-2xl p-6 transition-all duration-300 hover:scale-105 animate-fade-in ${
                pkg.popular
                  ? "border-accent/50 shadow-lg shadow-accent/20"
                  : "border-border/50"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-accent to-primary text-primary-foreground text-xs font-semibold rounded-full">
                  Melhor Valor
                </div>
              )}

              <div className={`inline-flex p-3 rounded-xl mb-4 ${
                pkg.popular ? "bg-accent/20" : "bg-secondary/50"
              }`}>
                <pkg.icon className={`w-5 h-5 ${
                  pkg.popular ? "text-accent" : "text-muted-foreground"
                }`} />
              </div>

              <h4 className="text-lg font-bold mb-1">{pkg.name}</h4>
              <p className="text-3xl font-bold mb-1">
                <span className={pkg.popular ? "text-gradient" : ""}>
                  {pkg.credits}
                </span>
                <span className="text-sm font-normal text-muted-foreground ml-1">credits</span>
              </p>
              
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold">{pkg.price}</span>
                <span className="text-xs text-muted-foreground">({pkg.pricePerCall}/call)</span>
              </div>

              {pkg.savings && (
                <div className="mb-4 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded inline-block">
                  {pkg.savings}
                </div>
              )}

              <Button
                variant={pkg.popular ? "cyber" : "glass"}
                className="w-full"
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading === pkg.id}
              >
                {loading === pkg.id ? "Processing..." : "Buy Now"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CreditPackages;
