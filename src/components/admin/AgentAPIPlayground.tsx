import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Play, Copy, Check, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAPIKeys } from '@/hooks/useAPIKeys';

interface PlaygroundResponse {
  status: number;
  data: unknown;
  timing: number;
}

export function AgentAPIPlayground() {
  const { keys: apiKeys } = useAPIKeys();
  const [email, setEmail] = useState('test@example.com');
  const [selectedKey, setSelectedKey] = useState('');
  const [sandboxMode, setSandboxMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const activeKeys = apiKeys.filter(k => k.status === 'active');

  const runValidation = async (useAI = false) => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    setResponse(null);
    const startTime = performance.now();

    try {
      const endpoint = useAI ? 'agent-validate-ai' : 'agent-validate';
      const headers: Record<string, string> = {};
      
      if (selectedKey) {
        headers['x-api-key'] = selectedKey;
      }
      if (sandboxMode) {
        headers['x-sandbox'] = 'true';
      }

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: { email },
        headers
      });

      const timing = Math.round(performance.now() - startTime);

      if (error) {
        setResponse({
          status: 500,
          data: { error: error.message },
          timing
        });
      } else {
        setResponse({
          status: 200,
          data,
          timing
        });
      }
    } catch (err) {
      const timing = Math.round(performance.now() - startTime);
      setResponse({
        status: 500,
        data: { error: err instanceof Error ? err.message : 'Unknown error' },
        timing
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Response copied to clipboard');
    }
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>;
    }
    if (status >= 400 && status < 500) {
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Client Error</Badge>;
    }
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Server Error</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Agent API Playground
        </CardTitle>
        <CardDescription>
          Test the Agent API endpoints in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="validate">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="validate">Email Validation</TabsTrigger>
            <TabsTrigger value="validate-ai">AI Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="validate" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="Enter email to validate"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>API Key (Optional)</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                >
                  <option value="">Use session authentication</option>
                  {activeKeys.map((key) => (
                    <option key={key.id} value={key.key}>
                      {key.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sandbox Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Test without consuming credits
                  </p>
                </div>
                <Switch
                  checked={sandboxMode}
                  onCheckedChange={setSandboxMode}
                />
              </div>

              <Button
                onClick={() => runValidation(false)}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Validation
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="validate-ai" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="Enter email for AI analysis"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sandbox Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Test without consuming credits (2 credits per AI call)
                  </p>
                </div>
                <Switch
                  checked={sandboxMode}
                  onCheckedChange={setSandboxMode}
                />
              </div>

              <Button
                onClick={() => runValidation(true)}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run AI Validation
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {response && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusBadge(response.status)}
                <span className="text-sm text-muted-foreground">
                  {response.timing}ms
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyResponse}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
              <pre className="text-sm font-mono">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
