import { useState } from "react";
import { CreditCard, FileText, ExternalLink, Loader2, Receipt, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invoice {
  id: string;
  number: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}

export function BillingCenter() {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [hasLoadedInvoices, setHasLoadedInvoices] = useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription();

  const openCustomerPortal = async () => {
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro",
        description: errorMessage.includes("No Stripe customer")
          ? "Nenhum histórico de pagamento encontrado."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("get-invoices", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setInvoices(data?.invoices || []);
      setHasLoadedInvoices(true);
      
      if (data?.invoices?.length === 0) {
        toast({
          title: "Nenhuma fatura",
          description: "Você ainda não possui faturas.",
        });
      }
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast({
        title: "Erro ao carregar faturas",
        description: "Não foi possível carregar o histórico de faturas.",
        variant: "destructive",
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      paid: { variant: "default", label: "Pago" },
      open: { variant: "secondary", label: "Aberto" },
      void: { variant: "outline", label: "Cancelado" },
      uncollectible: { variant: "destructive", label: "Não cobrável" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="card-cyber">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" />
          Central de Billing
        </CardTitle>
        <CardDescription>
          Gerencie assinaturas, métodos de pagamento e histórico de faturas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plano Atual</p>
              <p className="text-2xl font-bold text-foreground capitalize">
                {subscription.tier}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Créditos</p>
              <p className="text-lg font-semibold text-primary">
                {subscription.monthlyCredits === -1 ? "∞" : subscription.monthlyCredits.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={openCustomerPortal}
            disabled={isLoadingPortal}
            variant="neon"
          >
            {isLoadingPortal ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Gerenciar Pagamento
          </Button>
          <Button
            onClick={loadInvoices}
            disabled={loadingInvoices}
            variant="outline"
          >
            {loadingInvoices ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Receipt className="h-4 w-4 mr-2" />
            )}
            Ver Faturas
          </Button>
        </div>

        {/* Invoice History */}
        {hasLoadedInvoices && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Histórico de Faturas
            </h4>
            <ScrollArea className="h-[200px]">
              {invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Receipt className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma fatura encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{invoice.number}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(invoice.created * 1000), "dd MMM yyyy", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(invoice.amount_paid, invoice.currency)}
                            </div>
                            {getStatusBadge(invoice.status)}
                          </div>
                          {invoice.hosted_invoice_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(invoice.hosted_invoice_url, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Acesse o portal de cliente para gerenciar métodos de pagamento, cancelar ou alterar sua assinatura.
        </p>
      </CardContent>
    </Card>
  );
}
