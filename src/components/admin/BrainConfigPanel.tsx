import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Scale, AlertTriangle, Save, RefreshCw, Loader2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface BrainConfig {
  id: string;
  config_key: string;
  config_value: Json;
  description: string | null;
}

interface RoutingWeights {
  performance: number;
  availability: number;
  latency: number;
  cost: number;
}

interface RiskThresholds {
  low_threshold: number;
  medium_threshold: number;
  circuit_breaker_failures: number;
  circuit_breaker_timeout_ms: number;
}

export const BrainConfigPanel: React.FC = () => {
  const [configs, setConfigs] = useState<BrainConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Routing weights state
  const [routingWeights, setRoutingWeights] = useState<RoutingWeights>({
    performance: 0.4,
    availability: 0.3,
    latency: 0.2,
    cost: 0.1
  });

  // Risk thresholds state
  const [riskThresholds, setRiskThresholds] = useState<RiskThresholds>({
    low_threshold: 75,
    medium_threshold: 50,
    circuit_breaker_failures: 3,
    circuit_breaker_timeout_ms: 30000
  });

  // Feature flags
  const [autoFailover, setAutoFailover] = useState(true);
  const [loggingEnabled, setLoggingEnabled] = useState(true);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brain_config')
        .select('*')
        .order('config_key');

      if (error) throw error;

      const configList = (data || []) as BrainConfig[];
      setConfigs(configList);

      // Parse existing configs
      configList.forEach((config) => {
        const value = config.config_value as Record<string, unknown> | null;
        if (!value || typeof value !== 'object') return;
        
        if (config.config_key === 'routing_weights') {
          setRoutingWeights(prev => ({ 
            ...prev, 
            performance: typeof value.performance === 'number' ? value.performance : prev.performance,
            availability: typeof value.availability === 'number' ? value.availability : prev.availability,
            latency: typeof value.latency === 'number' ? value.latency : prev.latency,
            cost: typeof value.cost === 'number' ? value.cost : prev.cost
          }));
        }
        if (config.config_key === 'risk_thresholds') {
          setRiskThresholds(prev => ({ 
            ...prev,
            low_threshold: typeof value.low_threshold === 'number' ? value.low_threshold : prev.low_threshold,
            medium_threshold: typeof value.medium_threshold === 'number' ? value.medium_threshold : prev.medium_threshold,
            circuit_breaker_failures: typeof value.circuit_breaker_failures === 'number' ? value.circuit_breaker_failures : prev.circuit_breaker_failures,
            circuit_breaker_timeout_ms: typeof value.circuit_breaker_timeout_ms === 'number' ? value.circuit_breaker_timeout_ms : prev.circuit_breaker_timeout_ms
          }));
        }
        if (config.config_key === 'features') {
          if ('auto_failover' in value && typeof value.auto_failover === 'boolean') setAutoFailover(value.auto_failover);
          if ('logging_enabled' in value && typeof value.logging_enabled === 'boolean') setLoggingEnabled(value.logging_enabled);
        }
      });
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast.error('Failed to load brain configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const saveConfig = async (key: string, value: Json, description: string) => {
    setSaving(true);
    try {
      const existing = configs.find(c => c.config_key === key);

      if (existing) {
        const { error } = await supabase
          .from('brain_config')
          .update({ config_value: value, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brain_config')
          .insert({ config_key: key, config_value: value, description });
        if (error) throw error;
      }

      toast.success(`${key} saved successfully`);
      fetchConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoutingWeights = () => {
    // Normalize weights to sum to 1
    const total = routingWeights.performance + routingWeights.availability + 
                  routingWeights.latency + routingWeights.cost;
    const normalized: Json = {
      performance: Math.round((routingWeights.performance / total) * 100) / 100,
      availability: Math.round((routingWeights.availability / total) * 100) / 100,
      latency: Math.round((routingWeights.latency / total) * 100) / 100,
      cost: Math.round((routingWeights.cost / total) * 100) / 100
    };
    saveConfig('routing_weights', normalized, 'Agent selection routing weights');
  };

  const handleSaveRiskThresholds = () => {
    const thresholdsJson: Json = {
      low_threshold: riskThresholds.low_threshold,
      medium_threshold: riskThresholds.medium_threshold,
      circuit_breaker_failures: riskThresholds.circuit_breaker_failures,
      circuit_breaker_timeout_ms: riskThresholds.circuit_breaker_timeout_ms
    };
    saveConfig('risk_thresholds', thresholdsJson, 'Risk assessment thresholds');
  };

  const handleSaveFeatures = () => {
    const featuresJson: Json = { auto_failover: autoFailover, logging_enabled: loggingEnabled };
    saveConfig('features', featuresJson, 'Feature flags');
  };

  const weightsTotal = routingWeights.performance + routingWeights.availability + 
                       routingWeights.latency + routingWeights.cost;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brain Configuration</h2>
          <p className="text-muted-foreground">Manage routing weights, risk thresholds, and feature flags</p>
        </div>
        <Button variant="outline" onClick={fetchConfigs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="routing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Routing Weights
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Thresholds
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routing">
          <Card>
            <CardHeader>
              <CardTitle>Agent Selection Weights</CardTitle>
              <CardDescription>
                Configure how the Brain Layer scores and selects agents. Weights are normalized to sum to 1.0.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Performance Weight</Label>
                    <Badge variant="outline">{(routingWeights.performance / weightsTotal * 100).toFixed(0)}%</Badge>
                  </div>
                  <Slider
                    value={[routingWeights.performance * 100]}
                    onValueChange={([val]) => setRoutingWeights(prev => ({ ...prev, performance: val / 100 }))}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">Higher = prefer agents with better success rates</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Availability Weight</Label>
                    <Badge variant="outline">{(routingWeights.availability / weightsTotal * 100).toFixed(0)}%</Badge>
                  </div>
                  <Slider
                    value={[routingWeights.availability * 100]}
                    onValueChange={([val]) => setRoutingWeights(prev => ({ ...prev, availability: val / 100 }))}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">Higher = prefer agents with lower current load</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Latency Weight</Label>
                    <Badge variant="outline">{(routingWeights.latency / weightsTotal * 100).toFixed(0)}%</Badge>
                  </div>
                  <Slider
                    value={[routingWeights.latency * 100]}
                    onValueChange={([val]) => setRoutingWeights(prev => ({ ...prev, latency: val / 100 }))}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">Higher = prefer faster agents</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Cost Weight</Label>
                    <Badge variant="outline">{(routingWeights.cost / weightsTotal * 100).toFixed(0)}%</Badge>
                  </div>
                  <Slider
                    value={[routingWeights.cost * 100]}
                    onValueChange={([val]) => setRoutingWeights(prev => ({ ...prev, cost: val / 100 }))}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">Higher = prefer cheaper agents</p>
                </div>
              </div>

              <Button onClick={handleSaveRoutingWeights} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Routing Weights
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Thresholds</CardTitle>
              <CardDescription>
                Configure confidence thresholds for risk classification and circuit breaker settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="low-threshold">Low Risk Threshold (%)</Label>
                  <Input
                    id="low-threshold"
                    type="number"
                    min={50}
                    max={100}
                    value={riskThresholds.low_threshold}
                    onChange={(e) => setRiskThresholds(prev => ({ ...prev, low_threshold: parseInt(e.target.value) || 75 }))}
                  />
                  <p className="text-xs text-muted-foreground">Confidence above this = low risk</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medium-threshold">Medium Risk Threshold (%)</Label>
                  <Input
                    id="medium-threshold"
                    type="number"
                    min={0}
                    max={riskThresholds.low_threshold}
                    value={riskThresholds.medium_threshold}
                    onChange={(e) => setRiskThresholds(prev => ({ ...prev, medium_threshold: parseInt(e.target.value) || 50 }))}
                  />
                  <p className="text-xs text-muted-foreground">Confidence above this = medium risk</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cb-failures">Circuit Breaker Failures</Label>
                  <Input
                    id="cb-failures"
                    type="number"
                    min={1}
                    max={10}
                    value={riskThresholds.circuit_breaker_failures}
                    onChange={(e) => setRiskThresholds(prev => ({ ...prev, circuit_breaker_failures: parseInt(e.target.value) || 3 }))}
                  />
                  <p className="text-xs text-muted-foreground">Consecutive failures before circuit opens</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cb-timeout">Circuit Breaker Timeout (ms)</Label>
                  <Input
                    id="cb-timeout"
                    type="number"
                    min={5000}
                    max={300000}
                    step={5000}
                    value={riskThresholds.circuit_breaker_timeout_ms}
                    onChange={(e) => setRiskThresholds(prev => ({ ...prev, circuit_breaker_timeout_ms: parseInt(e.target.value) || 30000 }))}
                  />
                  <p className="text-xs text-muted-foreground">Time before circuit tries to close</p>
                </div>
              </div>

              <Button onClick={handleSaveRiskThresholds} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Risk Thresholds
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Enable or disable Brain Layer features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Automatic Failover</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically try fallback agents when primary agent fails
                    </p>
                  </div>
                  <Switch checked={autoFailover} onCheckedChange={setAutoFailover} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Decision Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all orchestration decisions to brain_decisions table
                    </p>
                  </div>
                  <Switch checked={loggingEnabled} onCheckedChange={setLoggingEnabled} />
                </div>
              </div>

              <Button onClick={handleSaveFeatures} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Features
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Current Config Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>Raw configuration values stored in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {configs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No configurations saved yet. Save settings above to create them.</p>
            ) : (
              configs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono">{config.config_key}</code>
                    {config.description && (
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {JSON.stringify(config.config_value).slice(0, 50)}...
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrainConfigPanel;
