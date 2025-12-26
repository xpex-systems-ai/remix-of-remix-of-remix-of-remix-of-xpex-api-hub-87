import { Zap, Github, Twitter, Linkedin, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStarted, setFormStarted] = useState(false);

  // Track form started when user begins typing email
  useEffect(() => {
    if (email && !formStarted) {
      setFormStarted(true);
      analytics.trackFormStarted("newsletter_form", "newsletter", "/footer");
    }
  }, [email, formStarted]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email },
      });

      if (error) throw error;

      // Track successful newsletter subscription
      analytics.trackFormSubmitted("newsletter_form", "newsletter", "/footer", true);

      if (data?.alreadySubscribed) {
        toast.info("You're already subscribed to our newsletter!");
      } else {
        toast.success("Subscribed! Welcome to the XPEX Neural newsletter.");
      }
      setEmail("");
      setFormStarted(false);
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);
      
      // Track failed newsletter subscription
      analytics.trackFormSubmitted("newsletter_form", "newsletter", "/footer", false, error.message);
      
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const links = {
    products: [
      { name: "GoldMail Platform", href: "/products/goldmail-validation", isRoute: true },
      { name: "GoldMail API", href: "/products/goldmail-api", isRoute: true },
      { name: "GoldMail SaaS", href: "/products/goldmail-saas", isRoute: true },
      { name: "GoldMail Bundles", href: "/products/goldmail-bundles", isRoute: true },
    ],
    product: [
      { name: "APIs", href: "/marketplace", isRoute: true },
      { name: "Preços", href: "/pricing", isRoute: true },
      { name: "Documentação", href: "/docs", isRoute: true },
      { name: "Status", href: "/status", isRoute: true },
    ],
    company: [
      { name: "Sobre", href: "/about", isRoute: true },
      { name: "Blog", href: "/blog", isRoute: true },
      { name: "Contato", href: "/contact", isRoute: true },
    ],
    legal: [
      { name: "Privacidade", href: "/legal/privacy", isRoute: true },
      { name: "Termos", href: "/legal/terms", isRoute: true },
      { name: "SLA", href: "/legal/sla", isRoute: true },
    ],
  };

  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-6 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Zap className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">
                <span className="text-gradient">XPEX</span>{" "}
                <span className="text-foreground">NEURAL</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Construa APIs. Agentes trabalham para você. Dinheiro flui. 
              O motor de riqueza autônomo para a Economia de Agentes.
            </p>
            <div className="flex gap-4">
              <a href="mailto:xpexneural@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="https://github.com/jrsmidia8602-ctrl" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://x.com/xpexsystems" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://www.linkedin.com/in/xpex-systems-i-a-ab6058341" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* GoldMail Products */}
          <div>
            <h4 className="font-semibold mb-4">GoldMail</h4>
            <ul className="space-y-3">
              {links.products.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-3">
              {links.product.map((link) => (
                <li key={link.name}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-3">
              {links.company.map((link) => (
                <li key={link.name}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.name}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-muted-foreground text-sm mb-4">
              Fique atualizado com as últimas APIs e insights da economia de agentes.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-border/50 text-sm"
                required
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isSubmitting}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} XPEX Neural. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground font-mono">
            Criado por <span className="text-primary">Servo</span> • Powered by AI Agents
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
