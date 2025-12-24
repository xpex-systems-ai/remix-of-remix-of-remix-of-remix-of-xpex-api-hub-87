import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Zap, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreditTopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCredits?: number;
  requiredCredits?: number;
}

const QUICK_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 1000,
    price: 9,
    icon: Coins,
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    credits: 5000,
    price: 39,
    icon: TrendingUp,
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    credits: 15000,
    price: 99,
    icon: Sparkles,
    popular: false,
  },
];

export const CreditTopUpModal = ({
  open,
  onOpenChange,
  currentCredits = 0,
  requiredCredits = 1,
}: CreditTopUpModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to purchase credits.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('purchase-credits', {
        body: { package: packageId },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase failed',
        description: 'Unable to initiate purchase. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const deficit = Math.max(0, requiredCredits - currentCredits);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Top Up Credits
          </DialogTitle>
          <DialogDescription>
            {deficit > 0 ? (
              <span className="text-destructive">
                You need {deficit} more credits to complete this action.
              </span>
            ) : (
              'Choose a credit package to continue using the API.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
          <span className="text-sm text-muted-foreground">Current Balance</span>
          <span className="font-mono font-semibold">{currentCredits.toLocaleString()} credits</span>
        </div>

        <div className="grid gap-3">
          {QUICK_PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            return (
              <button
                key={pkg.id}
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading !== null}
                className={`
                  relative flex items-center justify-between p-4 rounded-lg border transition-all
                  hover:border-primary/50 hover:bg-accent/5 press-effect
                  ${pkg.popular ? 'border-primary bg-primary/5' : 'border-border'}
                  ${loading === pkg.id ? 'opacity-70' : ''}
                `}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground text-xs">
                    Most Popular
                  </Badge>
                )}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${pkg.popular ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${pkg.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{pkg.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {pkg.credits.toLocaleString()} credits
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">${pkg.price}</span>
                  {loading === pkg.id && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              window.location.href = '/credits';
            }}
          >
            View All Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
