import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { APIAssistant } from "@/components/APIAssistant";
import { RouteTracker } from "@/components/RouteTracker";
import { OnboardingTour } from "@/components/OnboardingTour";
import ErrorBoundary from "@/components/ErrorBoundary";
import { RetryProvider } from "@/contexts/RetryContext";
import { CreditModalProvider } from "@/contexts/CreditModalContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Docs from "./pages/Docs";
import Pricing from "./pages/Pricing";
import Marketplace from "./pages/Marketplace";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Blog from "./pages/Blog";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import SLA from "./pages/legal/SLA";
import Contact from "./pages/Contact";
import Status from "./pages/Status";
import GoldEmailValidator from "./pages/GoldEmailValidator";
import BridgeScan from "./pages/products/BridgeScan";
import IPInsight from "./pages/products/IPInsight";
import LinkMagic from "./pages/products/LinkMagic";
import BreachScan from "./pages/products/BreachScan";
import CopyVoraz from "./pages/products/CopyVoraz";
import ExtrairProdutos from "./pages/products/ExtrairProdutos";
import GoldMailValidation from "./pages/products/GoldMailValidation";
import Credits from "./pages/Credits";
import NotFound from "./pages/NotFound";
import CookieConsent from "./components/CookieConsent";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ErrorBoundary 
      fallbackTitle="Erro na Aplicação" 
      fallbackDescription="Ocorreu um erro inesperado na aplicação. Por favor, recarregue a página."
    >
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="xpex-theme">
        <AuthProvider>
          <RetryProvider>
            <CreditModalProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <RouteTracker />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/docs" element={<Docs />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/legal/terms" element={<Terms />} />
                  <Route path="/legal/privacy" element={<Privacy />} />
                  <Route path="/legal/sla" element={<SLA />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/products/gold-email-validator" element={<GoldEmailValidator />} />
                  <Route path="/products/bridgescan" element={<BridgeScan />} />
                  <Route path="/products/ip-insight" element={<IPInsight />} />
                  <Route path="/products/link-magic" element={<LinkMagic />} />
                  <Route path="/products/breach-scan" element={<BreachScan />} />
                  <Route path="/products/copy-voraz" element={<CopyVoraz />} />
                  <Route path="/products/extrair-produtos" element={<ExtrairProdutos />} />
                  <Route path="/products/goldmail-validation" element={<GoldMailValidation />} />
                  <Route path="/credits" element={<Credits />} />
                  <Route
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="/admin" 
                    element={
                      <ProtectedRoute>
                        <Admin />
                      </ProtectedRoute>
                    } 
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <APIAssistant />
                <CookieConsent />
              <OnboardingTour />
              </BrowserRouter>
            </TooltipProvider>
            </CreditModalProvider>
          </RetryProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  </HelmetProvider>
);

export default App;
