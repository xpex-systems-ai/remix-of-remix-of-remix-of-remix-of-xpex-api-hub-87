import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Network, Globe, Link2, Sparkles, Clock } from 'lucide-react';
import { analytics } from '@/lib/analytics';

type ProductStatus = 'live' | 'coming-soon';

interface Product {
  name: string;
  description: string;
  cta: string;
  icon: React.ElementType;
  features: string[];
  status: ProductStatus;
}

// CORE: Only GoldMail is LIVE, all others are COMING SOON
const products: Product[] = [
  {
    name: 'GoldMail Validator',
    description: 'Enterprise email validation with AI scoring, MX/SMTP checks, and intelligence',
    cta: '/products/goldmail-validation',
    icon: Mail,
    features: ['AI Risk Scoring', 'MX/SMTP Check', 'Typo Detection'],
    status: 'live',
  },
  {
    name: 'BridgeScan',
    description: 'Data bridge scanning and API connection analysis',
    cta: '/products/breach-scan',
    icon: Network,
    features: ['API Discovery', 'Data Bridge Analysis', 'Connection Mapping'],
    status: 'coming-soon',
  },
  {
    name: 'IP Insight',
    description: 'Advanced IP information and network reputation analysis',
    cta: '/products/ip-insight',
    icon: Globe,
    features: ['IP Geolocation', 'Threat Detection', 'Network Analysis'],
    status: 'coming-soon',
  },
  {
    name: 'LinkMagic',
    description: 'Advanced link management and URL validation',
    cta: '/products/link-magic',
    icon: Link2,
    features: ['Link Validation', 'Redirect Tracking', 'Safety Check'],
    status: 'coming-soon',
  },
];

const statusColors = {
  live: 'bg-green-500/10 text-green-500 border-green-500/30',
  'coming-soon': 'bg-muted text-muted-foreground border-border',
};

const statusLabels = {
  live: 'Live',
  'coming-soon': 'Coming Soon',
};

export const ProductPortfolio = () => {
  return (
    <section className="py-24 relative overflow-hidden" id="portfolio">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">API Portfolio</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Our </span>
            <span className="text-gradient">Ecosystem</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade APIs and autonomous agents. Build with precision, monetize at scale.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card
              key={product.name}
              className={`group p-6 backdrop-blur border-border/50 transition-all duration-300 ${
                product.status === 'live' 
                  ? 'bg-card/50 hover:border-primary/50 hover:-translate-y-1' 
                  : 'bg-card/30 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl transition-colors ${
                  product.status === 'live'
                    ? 'bg-primary/10 group-hover:bg-primary/20'
                    : 'bg-muted/30'
                }`}>
                  <product.icon className={`w-6 h-6 ${
                    product.status === 'live' ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                <Badge variant="outline" className={statusColors[product.status]}>
                  {product.status === 'coming-soon' && <Clock className="w-3 h-3 mr-1" />}
                  {statusLabels[product.status]}
                </Badge>
              </div>

              <h3 className={`text-lg font-bold mb-2 transition-colors ${
                product.status === 'live' 
                  ? 'group-hover:text-primary' 
                  : 'text-muted-foreground'
              }`}>
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{product.description}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {product.features.map((feature) => (
                  <Badge 
                    key={feature} 
                    variant="secondary" 
                    className={`text-xs ${product.status === 'coming-soon' ? 'opacity-60' : ''}`}
                  >
                    {feature}
                  </Badge>
                ))}
              </div>

              {product.status === 'live' ? (
                <Button
                  variant="outline"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                  asChild
                  onClick={() => analytics.trackCTAClick(`try_${product.name}`, 'portfolio')}
                >
                  <Link to={product.cta}>
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="w-full cursor-not-allowed" disabled>
                  <Clock className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductPortfolio;
