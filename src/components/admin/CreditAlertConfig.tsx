import { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Save, 
  Loader2,
  CreditCard,
  AlertTriangle,
  Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCredits } from '@/hooks/useCredits';

interface AlertThreshold {
  value: number;
  enabled: boolean;
}

interface AlertSettings {
  email_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;
  thresholds: AlertThreshold[];
  custom_threshold: number;
}

const DEFAULT_THRESHOLDS = [1000, 500, 100, 50, 10];

export const CreditAlertConfig = () => {
  const [settings, setSettings] = useState<AlertSettings>({
    email_enabled: true,
    in_app_enabled: true,
    push_enabled: false,
    thresholds: DEFAULT_THRESHOLDS.map(v => ({ value: v, enabled: true })),
    custom_threshold: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance } = useCredits();

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      // Fetch notification preferences
      const { data: notifPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (notifPrefs) {
        setSettings(prev => ({
          ...prev,
          email_enabled: notifPrefs.email_enabled,
          in_app_enabled: notifPrefs.in_app_enabled,
          push_enabled: notifPrefs.push_enabled,
        }));
      }

      // Fetch alert thresholds
      const { data: alertPrefs } = await supabase
        .from('alert_thresholds')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (alertPrefs) {
        // Parse threshold settings if stored
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Update notification preferences
      const { error: notifError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          email_enabled: settings.email_enabled,
          in_app_enabled: settings.in_app_enabled,
          push_enabled: settings.push_enabled,
          usage_alerts: true,
          updated_at: new Date().toISOString(),
        });

      if (notifError) throw notifError;

      // Update or create alert thresholds
      const { error: alertError } = await supabase
        .from('alert_thresholds')
        .upsert({
          user_id: user.id,
          enabled: true,
          updated_at: new Date().toISOString(),
        });

      if (alertError) throw alertError;

      toast({
        title: 'Settings Saved',
        description: 'Your credit alert preferences have been updated',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleThreshold = (index: number) => {
    setSettings(prev => ({
      ...prev,
      thresholds: prev.thresholds.map((t, i) => 
        i === index ? { ...t, enabled: !t.enabled } : t
      ),
    }));
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5 text-primary" />
          Credit Alert Configuration
        </CardTitle>
        <CardDescription>
          Configure when and how you receive low credit notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-medium">Current Balance</span>
            </div>
            <span className="text-2xl font-bold text-primary">{balance.credits.toLocaleString()}</span>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Notification Channels</Label>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Email Alerts</p>
                  <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                </div>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_enabled: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">In-App Notifications</p>
                  <p className="text-xs text-muted-foreground">Show alerts in dashboard</p>
                </div>
              </div>
              <Switch
                checked={settings.in_app_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, in_app_enabled: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Threshold Configuration */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Alert Thresholds</Label>
          <p className="text-xs text-muted-foreground">
            Select which credit levels should trigger an alert
          </p>
          
          <div className="grid grid-cols-5 gap-2">
            {settings.thresholds.map((threshold, index) => (
              <Button
                key={threshold.value}
                variant={threshold.enabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleThreshold(index)}
                className="relative"
              >
                {threshold.value.toLocaleString()}
                {threshold.enabled && (
                  <Check className="w-3 h-3 absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5" />
                )}
              </Button>
            ))}
          </div>

          {/* Custom Threshold */}
          <div className="space-y-2">
            <Label className="text-sm">Custom Threshold</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Enter custom value"
                value={settings.custom_threshold || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, custom_threshold: parseInt(e.target.value) || 0 }))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
          </div>
        </div>

        {/* Alert Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Alert Preview</Label>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-500">Low Credit Balance Warning</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your credit balance has dropped to <strong>{Math.min(...settings.thresholds.filter(t => t.enabled).map(t => t.value), settings.custom_threshold || 999999)} credits</strong>. 
                  Consider adding more credits to avoid service interruption.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Thresholds Summary */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active alerts at:</span>
          {settings.thresholds
            .filter(t => t.enabled)
            .sort((a, b) => b.value - a.value)
            .map(t => (
              <Badge key={t.value} variant="outline">{t.value.toLocaleString()}</Badge>
            ))}
          {settings.custom_threshold > 0 && (
            <Badge variant="outline" className="text-primary border-primary">
              {settings.custom_threshold.toLocaleString()} (custom)
            </Badge>
          )}
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Alert Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreditAlertConfig;
