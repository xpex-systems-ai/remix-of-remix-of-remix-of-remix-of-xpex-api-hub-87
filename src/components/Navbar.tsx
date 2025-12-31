import { Button } from "@/components/ui/button";
import { Zap, Menu, X, Clock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { user } = useAuth();

  // CORE: Only GoldMail is LIVE, everything else is FUTURE
  const coreProducts = [
    { 
      name: "GoldMail API", 
      href: "/products/goldmail-api", 
      description: "Email validation REST API",
      status: "live" as const
    },
    { 
      name: "GoldMail Validator", 
      href: "/products/goldmail-validation", 
      description: "Enterprise email intelligence platform",
      status: "live" as const
    },
    { 
      name: "GoldMail SaaS", 
      href: "/products/goldmail-saas", 
      description: "Visual dashboard for teams",
      status: "live" as const
    },
  ];

  const futureProducts = [
    { name: "BreachScan", href: "/products/breach-scan", description: "Data breach detection", status: "coming-soon" as const },
    { name: "IPInsight", href: "/products/ip-insight", description: "IP intelligence & geolocation", status: "coming-soon" as const },
    { name: "LinkMagic", href: "/products/link-magic", description: "URL health monitoring", status: "coming-soon" as const },
    { name: "CopyVoraz", href: "/products/copy-voraz", description: "AI viral copy generator", status: "coming-soon" as const },
    { name: "ExtrairProdutos", href: "/products/extrair-produtos", description: "Marketplace data scraper", status: "coming-soon" as const },
  ];

  const navLinks = [
    { name: "Pricing", href: "/pricing", isRoute: true },
    { name: "Docs", href: "/docs", isRoute: true },
    { name: "Status", href: "/status", isRoute: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Zap className="w-8 h-8 text-primary transition-all group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/30 blur-xl group-hover:bg-primary/50 transition-all" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-gradient">XPEX</span>
              <span className="text-foreground"> NEURAL</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-primary text-sm font-medium">
                    Products
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[400px] p-4 bg-background border border-border rounded-lg">
                      {/* CORE Products - Live */}
                      <div className="mb-4">
                        <div className="text-xs uppercase text-muted-foreground font-semibold mb-2 px-2">
                          Core Platform
                        </div>
                        <ul className="space-y-1">
                          {coreProducts.map((product) => (
                            <li key={product.name}>
                              <NavigationMenuLink asChild>
                                <Link
                                  to={product.href}
                                  className="flex items-center justify-between rounded-md p-3 hover:bg-accent transition-colors"
                                >
                                  <div>
                                    <div className="text-sm font-medium text-foreground">{product.name}</div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
                                  </div>
                                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs shrink-0">
                                    Live
                                  </Badge>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* FUTURE Products - Coming Soon */}
                      <div className="border-t border-border pt-4">
                        <div className="text-xs uppercase text-muted-foreground font-semibold mb-2 px-2">
                          Coming Soon
                        </div>
                        <ul className="space-y-1">
                          {futureProducts.map((product) => (
                            <li key={product.name}>
                              <NavigationMenuLink asChild>
                                <Link
                                  to={product.href}
                                  className="flex items-center justify-between rounded-md p-3 hover:bg-accent/50 transition-colors opacity-70"
                                >
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground">{product.name}</div>
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">{product.description}</p>
                                  </div>
                                  <Badge variant="outline" className="text-muted-foreground border-border text-xs shrink-0">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Soon
                                  </Badge>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="border-t border-border pt-3 mt-3">
                        <NavigationMenuLink asChild>
                          <Link
                            to="/marketplace"
                            className="block text-center text-sm font-medium text-primary hover:text-primary/80 py-2"
                          >
                            View All APIs →
                          </Link>
                        </NavigationMenuLink>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link key={link.name} to={link.href} className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                  {link.name}
                </Link>
              ) : (
                <a key={link.name} href={link.href} className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                  {link.name}
                </a>
              )
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <ConnectionStatus />
            <ThemeToggle />
            {user ? (
              <Link to="/dashboard">
                <Button variant="neon" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="neon" size="sm">Get API Key</Button>
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-4">
              {/* Core Products */}
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Core Platform</div>
              {coreProducts.map((product) => (
                <Link 
                  key={product.name} 
                  to={product.href} 
                  className="text-foreground hover:text-primary transition-colors pl-2 flex items-center justify-between" 
                  onClick={() => setIsOpen(false)}
                >
                  {product.name}
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">Live</Badge>
                </Link>
              ))}
              
              {/* Future Products */}
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-4">Coming Soon</div>
              {futureProducts.map((product) => (
                <Link 
                  key={product.name} 
                  to={product.href} 
                  className="text-muted-foreground hover:text-primary/70 transition-colors pl-2 flex items-center justify-between opacity-60" 
                  onClick={() => setIsOpen(false)}
                >
                  {product.name}
                  <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Soon</Badge>
                </Link>
              ))}

              <Link to="/marketplace" className="text-primary hover:text-primary/80 transition-colors pl-2" onClick={() => setIsOpen(false)}>
                View All APIs →
              </Link>
              <div className="border-t border-border/50 pt-4 mt-2">
                {navLinks.map((link) =>
                  link.isRoute ? (
                    <Link key={link.name} to={link.href} className="block text-muted-foreground hover:text-primary transition-colors py-2" onClick={() => setIsOpen(false)}>
                      {link.name}
                    </Link>
                  ) : (
                    <a key={link.name} href={link.href} className="block text-muted-foreground hover:text-primary transition-colors py-2" onClick={() => setIsOpen(false)}>
                      {link.name}
                    </a>
                  )
                )}
              </div>
              <div className="flex items-center gap-4 pt-4">
                <ThemeToggle />
                {user ? (
                  <Link to="/dashboard" className="flex-1">
                    <Button variant="neon" size="sm" className="w-full">Dashboard</Button>
                  </Link>
                ) : (
                  <Link to="/auth" className="flex-1">
                    <Button variant="neon" size="sm" className="w-full">Login</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
