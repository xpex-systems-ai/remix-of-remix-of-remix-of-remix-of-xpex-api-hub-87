import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Bell, Mail, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CreditAlertConfig {
  enabled: boolean;
  thresholds: number[]; // percentages e.g., [10, 5, 0]
  emailEnabled: boolean;
}

export const CreditAlertSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CreditAlertConfig>({
    enabled: true,
    thresholds: [10, 5, 0],
    emailEnabled: true,
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('usage_alerts, email_enabled')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig({
          enabled: data.usage_alerts,
          thresholds: [10, 5, 0], // Default thresholds
          emailEnabled: data.email_enabled,
        });
      }
    } catch (error) {
      console.error('Error fetching alert settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user?.id,
          usage_alerts: config.enabled,
          email_enabled: config.emailEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your credit alert preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

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
          <Bell className="h-5 w-5 text-primary" />
          Credit Alerts
        </CardTitle>
        <CardDescription>
          Get notified when your credit balance drops below certain thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="alerts-enabled">Enable Credit Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications when credits are running low
            </p>
          </div>
          <Switch
            id="alerts-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        {config.enabled && (
          <>
            {/* Email notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="email-enabled">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts to your registered email
                  </p>
                </div>
              </div>
              <Switch
                id="email-enabled"
                checked={config.emailEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, emailEnabled: checked })}
              />
            </div>

            {/* Threshold info */}
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-neon-orange" />
                Alert Thresholds
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-neon-orange">10%</p>
                  <p className="text-xs text-muted-foreground">Low warning</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-destructive">5%</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-destructive">0%</p>
                  <p className="text-xs text-muted-foreground">Depleted</p>
                </div>
              </div>
            </div>
          </>
        )}

        <Button onClick={saveSettings} disabled={saving} className="w-full">
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
