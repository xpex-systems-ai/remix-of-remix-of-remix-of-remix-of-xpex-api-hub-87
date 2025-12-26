import { Button } from "@/components/ui/button";
import { Zap, Menu, X, ChevronDown } from "lucide-react";
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

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const products = [
    { name: "GoldMail Platform", href: "/products/goldmail-validation", description: "Plataforma de validação de email enterprise" },
    { name: "GoldMail API", href: "/products/goldmail-api", description: "API REST para integração direta" },
    { name: "GoldMail SaaS", href: "/products/goldmail-saas", description: "Dashboard visual para equipes" },
    { name: "Bridge Scan", href: "/marketplace", description: "Verificação de vazamentos de dados" },
    { name: "IP Insight", href: "/marketplace", description: "Geolocalização e análise de ameaças" },
    { name: "Link Magic", href: "/marketplace", description: "Monitoramento de saúde de URLs" },
  ];

  const navLinks = [
    { name: "Preços", href: "/pricing", isRoute: true },
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
                    Produtos
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-2 p-3 bg-background border border-border rounded-lg">
                      {products.map((product) => (
                        <li key={product.name}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={product.href}
                              className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium text-foreground">{product.name}</div>
                              <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            to="/marketplace"
                            className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-sm font-medium text-primary"
                          >
                            Ver Todas as APIs →
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
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
                  <Button variant="neon" size="sm">Obter API Key</Button>
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
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Produtos</div>
              {products.map((product) => (
                <Link key={product.name} to={product.href} className="text-muted-foreground hover:text-primary transition-colors pl-2" onClick={() => setIsOpen(false)}>
                  {product.name}
                </Link>
              ))}
              <Link to="/marketplace" className="text-primary hover:text-primary/80 transition-colors pl-2" onClick={() => setIsOpen(false)}>
                Ver Todas as APIs →
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
