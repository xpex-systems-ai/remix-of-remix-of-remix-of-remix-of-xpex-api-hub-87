import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, ShoppingCart, TrendingUp, Package, ArrowRight, Clock, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

const ExtrairProdutos = () => {
  return (
    <>
      <Helmet>
        <title>ExtrairProdutos - Product Data Scraper | XPEX Neural</title>
        <meta
          name="description"
          content="Scrape product data from major marketplaces automatically. Coming soon to XPEX Neural."
        />
      </Helmet>

      <main className="min-h-screen bg-background text-foreground">
        <Navbar />

        {/* Hero */}
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <Clock className="w-3 h-3 mr-1" />
                Coming Soon
              </Badge>

              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="text-foreground">Extrair</span>
                <span className="text-gradient">Produtos</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Extract product data from marketplaces automatically. Price monitoring and structured data extraction.
              </p>

              {/* Coming Soon Card */}
              <Card className="p-8 bg-card/50 backdrop-blur border-border/50 max-w-2xl mx-auto">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Database className="w-10 h-10 text-yellow-500" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold mb-2">In Development</h3>
                    <p className="text-muted-foreground">
                      We're building a robust product data extraction API supporting major marketplaces with price tracking and structured output.
                      Join the waitlist to be notified at launch.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="outline" asChild>
                      <Link to="/auth">
                        <Bell className="w-4 h-4 mr-2" />
                        Notify Me at Launch
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link to="/products/goldmail-validation">
                        Explore GoldMail API <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Planned Features */}
        <section className="py-20 bg-secondary/20">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">Planned Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: ShoppingCart,
                  title: 'Multi-marketplace',
                  description: 'Support for Mercado Livre, Amazon, Shopee, and more.',
                  status: 'Planned'
                },
                {
                  icon: TrendingUp,
                  title: 'Price Tracking',
                  description: 'Price history and variation alerts.',
                  status: 'Planned'
                },
                {
                  icon: Package,
                  title: 'Structured Data',
                  description: 'JSON-ready structured data for immediate use.',
                  status: 'Planned'
                },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  className="p-6 bg-card/50 backdrop-blur border-border/50 relative"
                >
                  <Badge variant="outline" className="absolute top-4 right-4 text-xs text-yellow-500 border-yellow-500/30">
                    {feature.status}
                  </Badge>
                  <feature.icon className="w-10 h-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Meanwhile, explore our validation API</h2>
            <p className="text-muted-foreground mb-8">
              GoldMail Validator is production-ready and available now.
            </p>
            <Button size="lg" asChild>
              <Link to="/products/goldmail-validation">
                Explore GoldMail <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
};

export default ExtrairProdutos;
