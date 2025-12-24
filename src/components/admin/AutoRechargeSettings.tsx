import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CreditCard, Zap, Save, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AutoRechargeSettings {
  enabled: boolean;
  threshold_credits: number;
  recharge_package: string;
  stripe_payment_method_id: string | null;
  last_recharge_at: string | null;
}

const PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 1000, price: 9 },
  { id: 'growth', name: 'Growth', credits: 5000, price: 39 },
  { id: 'scale', name: 'Scale', credits: 15000, price: 99 },
];

export const AutoRechargeSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutoRechargeSettings>({
    enabled: false,
    threshold_credits: 100,
    recharge_package: 'starter',
    stripe_payment_method_id: null,
    last_recharge_at: null,
  });
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
      checkPaymentMethod();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_recharge_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          enabled: data.enabled,
          threshold_credits: data.threshold_credits,
          recharge_package: data.recharge_package,
          stripe_payment_method_id: data.stripe_payment_method_id,
          last_recharge_at: data.last_recharge_at,
        });
      }
    } catch (error) {
      console.error('Error fetching auto-recharge settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentMethod = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', user?.id)
        .single();

      setHasPaymentMethod(!!profile?.stripe_customer_id);
    } catch (error) {
      console.error('Error checking payment method:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('auto_recharge_settings')
        .upsert({
          user_id: user?.id,
          enabled: settings.enabled,
          threshold_credits: settings.threshold_credits,
          recharge_package: settings.recharge_package,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: settings.enabled 
          ? 'Auto-recharge is now enabled.' 
          : 'Auto-recharge has been disabled.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedPackage = PACKAGES.find(p => p.id === settings.recharge_package) || PACKAGES[0];

  if (loading) {
    return (
      <Card className="card-cyber">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-cyber">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Auto-Recharge
        </CardTitle>
        <CardDescription>
          Automatically purchase credits when your balance runs low
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasPaymentMethod && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No payment method</p>
              <p className="text-sm text-muted-foreground">
                You need to make at least one purchase to save a payment method for auto-recharge.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => window.location.href = '/credits'}>
                <CreditCard className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </div>
        )}

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-recharge-enabled">Enable Auto-Recharge</Label>
            <p className="text-sm text-muted-foreground">
              Automatically charge your saved card when credits are low
            </p>
          </div>
          <Switch
            id="auto-recharge-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            disabled={!hasPaymentMethod}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Threshold */}
            <div className="space-y-2">
              <Label htmlFor="threshold">Recharge when credits drop below</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="threshold"
                  type="number"
                  min={10}
                  max={1000}
                  value={settings.threshold_credits}
                  onChange={(e) => setSettings({ ...settings, threshold_credits: parseInt(e.target.value) || 100 })}
                  className="w-32"
                />
                <span className="text-muted-foreground">credits</span>
              </div>
            </div>

            {/* Package selection */}
            <div className="space-y-2">
              <Label>Recharge package</Label>
              <Select
                value={settings.recharge_package}
                onValueChange={(value) => setSettings({ ...settings, recharge_package: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGES.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{pkg.name}</span>
                        <span className="text-muted-foreground">
                          {pkg.credits.toLocaleString()} credits - ${pkg.price}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">Auto-recharge summary</span>
              </div>
              <p className="text-sm text-muted-foreground">
                When your balance drops below <strong>{settings.threshold_credits} credits</strong>, 
                we'll automatically charge <strong>${selectedPackage.price}</strong> to add{' '}
                <strong>{selectedPackage.credits.toLocaleString()} credits</strong>.
              </p>
            </div>

            {settings.last_recharge_at && (
              <p className="text-xs text-muted-foreground">
                Last auto-recharge: {new Date(settings.last_recharge_at).toLocaleString()}
              </p>
            )}
          </>
        )}

        <Button onClick={saveSettings} disabled={saving || !hasPaymentMethod} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};
