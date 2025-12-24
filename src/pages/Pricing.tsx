import { Helmet } from "react-helmet-async";
import { Check, Zap, Building2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for testing and small projects",
    features: [
      "100 API calls/month",
      "Email validation API",
      "Basic documentation",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
    icon: Zap,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing businesses and developers",
    features: [
      "20,000 API calls/month",
      "All validation APIs",
      "AI-powered insights",
      "Priority support",
      "Usage analytics",
      "Webhook integrations",
    ],
    cta: "Start Pro Trial",
    popular: true,
    icon: Coins,
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For large-scale operations",
    features: [
      "Unlimited API calls",
      "Custom SLA",
      "Dedicated support",
      "Custom integrations",
      "On-premise options",
      "Priority processing",
      "White-label options",
    ],
    cta: "Contact Sales",
    popular: false,
    icon: Building2,
  },
];

const creditPackages = [
  { credits: "2,000", price: "$5", perCall: "$0.0025" },
  { credits: "20,000", price: "$39", perCall: "$0.00195" },
  { credits: "100,000", price: "$149", perCall: "$0.00149" },
];

const Pricing = () => {
  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing - XPEX Neural | API Plans & Credits</title>
        <meta
          name="description"
          content="Choose the perfect plan for your API needs. Free tier, Pro subscriptions, and Enterprise solutions with pay-as-you-go credits."
        />
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free, scale as you grow. Pay only for what you use with our flexible plans.
          </p>
        </section>

        {/* Plans */}
        <section className="container mx-auto px-4 mb-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative p-6 bg-card/50 backdrop-blur border-border/50 ${
                  plan.popular ? "border-primary shadow-lg shadow-primary/20 scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <plan.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? "" : "variant-outline"}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* Credit Packages */}
        <section className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Credit Packages</h2>
            <p className="text-muted-foreground">
              Pay as you go with credit packages. Never expire, use anytime.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {creditPackages.map((pkg) => (
              <Card
                key={pkg.credits}
                className="p-6 bg-card/50 backdrop-blur border-border/50 text-center hover:border-primary/50 transition-colors"
              >
                <div className="text-3xl font-bold text-primary mb-2">{pkg.credits}</div>
                <div className="text-sm text-muted-foreground mb-4">credits</div>
                <div className="text-2xl font-bold mb-1">{pkg.price}</div>
                <div className="text-xs text-muted-foreground mb-4">{pkg.perCall} per call</div>
                <Button variant="outline" className="w-full">
                  Buy Credits
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
    </PageTransition>
  );
};

export default Pricing;
