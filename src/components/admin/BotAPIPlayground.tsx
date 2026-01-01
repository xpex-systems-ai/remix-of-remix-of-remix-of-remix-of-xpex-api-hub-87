import { useState } from 'react';
import { 
  Play, 
  Terminal, 
  Loader2, 
  Copy, 
  Check, 
  Code2,
  Bot,
  Mail,
  Activity,
  FileText,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface BotEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; placeholder?: string }[];
  costPerRequest: number;
}

const botEndpoints: BotEndpoint[] = [
  {
    id: 'validate',
    name: 'Validate Emails',
    method: 'POST',
    path: '/bot-consumer-validate',
    description: 'Batch validate emails with rate limiting per plan',
    params: [
      { name: 'emails', type: 'textarea', required: true, placeholder: 'email1@example.com\nemail2@example.com' },
      { name: 'use_ai', type: 'boolean', required: false },
      { name: 'callback_url', type: 'string', required: false, placeholder: 'https://your-webhook.com/callback' },
    ],
    costPerRequest: 1,
  },
  {
    id: 'health',
    name: 'Health Check',
    method: 'GET',
    path: '/bot-consumer-health',
    description: 'Get bot health status, uptime, and performance metrics',
    params: [],
    costPerRequest: 0,
  },
  {
    id: 'logs',
    name: 'Get Logs',
    method: 'GET',
    path: '/bot-consumer-logs',
    description: 'Retrieve execution logs with filtering',
    params: [
      { name: 'limit', type: 'number', required: false, placeholder: '50' },
      { name: 'status', type: 'select', required: false },
    ],
    costPerRequest: 0,
  },
  {
    id: 'schedule',
    name: 'Schedule Validation',
    method: 'POST',
    path: '/bot-scheduled-validation',
    description: 'Schedule a batch validation for later execution',
    params: [
      { name: 'name', type: 'string', required: false, placeholder: 'My Scheduled Job' },
      { name: 'emails', type: 'textarea', required: true, placeholder: 'email1@example.com\nemail2@example.com' },
      { name: 'scheduled_at', type: 'datetime', required: true },
    ],
    costPerRequest: 1,
  },
  {
    id: 'auto-recharge',
    name: 'Trigger Auto-Recharge',
    method: 'POST',
    path: '/bot-consumer-auto-recharge',
    description: 'Manually trigger auto-recharge if configured',
    params: [],
    costPerRequest: 0,
  },
];

export const BotAPIPlayground = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(botEndpoints[0].id);
  const [params, setParams] = useState<Record<string, string | boolean>>({});
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const { toast } = useToast();
  const { session } = useAuth();

  const endpoint = botEndpoints.find(e => e.id === selectedEndpoint)!;

  const handleParamChange = (name: string, value: string | boolean) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handleExecute = async () => {
    if (!session?.access_token) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to use the API playground.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResponse('');
    setResponseTime(null);
    setResponseStatus(null);

    const startTime = performance.now();

    try {
      // Build request body
      let body: Record<string, unknown> = {};
      
      for (const param of endpoint.params) {
        const value = params[param.name];
        if (value !== undefined && value !== '') {
          if (param.name === 'emails' && typeof value === 'string') {
            body.emails = value.split('\n').map(e => e.trim()).filter(e => e);
          } else {
            body[param.name] = value;
          }
        }
      }

      const { data, error } = await supabase.functions.invoke(endpoint.path.replace('/', ''), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: Object.keys(body).length > 0 ? body : undefined,
      });

      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));

      if (error) {
        setResponseStatus(500);
        setResponse(JSON.stringify({ error: error.message }, null, 2));
        toast({
          title: 'Request Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setResponseStatus(200);
        setResponse(JSON.stringify(data, null, 2));
        toast({
          title: 'Success',
          description: `Request completed in ${Math.round(endTime - startTime)}ms`,
        });
      }
    } catch (error) {
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      setResponseStatus(500);
      
      const message = error instanceof Error ? error.message : 'Unknown error';
      setResponse(JSON.stringify({ error: message }, null, 2));
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCurlExample = () => {
    const baseUrl = `https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1${endpoint.path}`;
    
    let body: Record<string, unknown> = {};
    for (const param of endpoint.params) {
      const value = params[param.name];
      if (value !== undefined && value !== '') {
        if (param.name === 'emails' && typeof value === 'string') {
          body.emails = value.split('\n').map(e => e.trim()).filter(e => e);
        } else {
          body[param.name] = value;
        }
      }
    }

    const hasBody = Object.keys(body).length > 0;
    
    return `curl -X ${endpoint.method} \\
  "${baseUrl}" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json"${hasBody ? ` \\
  -d '${JSON.stringify(body)}'` : ''}`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-primary" />
          Bot API Playground
        </CardTitle>
        <CardDescription>
          Test bot-consumer endpoints directly from the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Endpoint Selection */}
        <div className="grid md:grid-cols-5 gap-2">
          {botEndpoints.map((ep) => (
            <Button
              key={ep.id}
              variant={selectedEndpoint === ep.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedEndpoint(ep.id);
                setParams({});
                setResponse('');
              }}
              className="justify-start"
            >
              {ep.id === 'validate' && <Mail className="w-4 h-4 mr-1" />}
              {ep.id === 'health' && <Activity className="w-4 h-4 mr-1" />}
              {ep.id === 'logs' && <FileText className="w-4 h-4 mr-1" />}
              {ep.id === 'schedule' && <Zap className="w-4 h-4 mr-1" />}
              {ep.id === 'auto-recharge' && <Bot className="w-4 h-4 mr-1" />}
              {ep.name}
            </Button>
          ))}
        </div>

        {/* Endpoint Info */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'}>
              {endpoint.method}
            </Badge>
            <code className="text-sm font-mono text-muted-foreground">{endpoint.path}</code>
            {endpoint.costPerRequest > 0 && (
              <Badge variant="outline" className="ml-auto">
                {endpoint.costPerRequest} credit/email
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>
        </div>

        {/* Parameters */}
        {endpoint.params.length > 0 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Parameters</Label>
            <div className="grid gap-4">
              {endpoint.params.map((param) => (
                <div key={param.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">{param.name}</Label>
                    {param.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </div>
                  
                  {param.type === 'textarea' && (
                    <Textarea
                      placeholder={param.placeholder}
                      value={(params[param.name] as string) || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value)}
                      className="font-mono text-sm"
                      rows={4}
                    />
                  )}
                  
                  {param.type === 'string' && (
                    <Input
                      placeholder={param.placeholder}
                      value={(params[param.name] as string) || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value)}
                    />
                  )}
                  
                  {param.type === 'number' && (
                    <Input
                      type="number"
                      placeholder={param.placeholder}
                      value={(params[param.name] as string) || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value)}
                    />
                  )}
                  
                  {param.type === 'datetime' && (
                    <Input
                      type="datetime-local"
                      value={(params[param.name] as string) || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value)}
                    />
                  )}
                  
                  {param.type === 'boolean' && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={(params[param.name] as boolean) || false}
                        onCheckedChange={(checked) => handleParamChange(param.name, checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {params[param.name] ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}
                  
                  {param.type === 'select' && param.name === 'status' && (
                    <Select
                      value={(params[param.name] as string) || 'all'}
                      onValueChange={(value) => handleParamChange(param.name, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execute Button */}
        <Button onClick={handleExecute} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Execute Request
            </>
          )}
        </Button>

        {/* Response */}
        {(response || responseTime !== null) && (
          <Tabs defaultValue="response">
            <TabsList className="bg-secondary/30">
              <TabsTrigger value="response">Response</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            
            <TabsContent value="response" className="mt-4">
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {responseStatus && (
                      <Badge variant={responseStatus === 200 ? 'default' : 'destructive'}>
                        {responseStatus}
                      </Badge>
                    )}
                    {responseTime !== null && (
                      <span className="text-xs text-muted-foreground">{responseTime}ms</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <ScrollArea className="h-[300px] rounded-lg border border-border/50 bg-secondary/20">
                  <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                    {response || 'No response yet'}
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="curl" className="mt-4">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2 z-10"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generateCurlExample());
                    toast({ title: 'Copied to clipboard' });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <ScrollArea className="h-[200px] rounded-lg border border-border/50 bg-secondary/20">
                  <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                    {generateCurlExample()}
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default BotAPIPlayground;
