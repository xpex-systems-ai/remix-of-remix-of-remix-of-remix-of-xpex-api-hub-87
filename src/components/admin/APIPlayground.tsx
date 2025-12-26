import { useState, useEffect, useMemo } from "react";
import { Play, Copy, Check, Code2, Terminal, Loader2, History, RotateCcw, Trash2, Key, Clock, Gauge, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAPIKeys } from "@/hooks/useAPIKeys";
import { analytics } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";

interface APIEndpoint {
  id: string;
  name: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
  exampleBody?: Record<string, unknown>;
}

interface RequestHistoryItem {
  id: string;
  endpoint: string;
  params: Record<string, string>;
  response: string;
  status: number;
  timestamp: Date;
  responseTimeMs: number;
}

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date | null;
}

const endpoints: APIEndpoint[] = [
  {
    id: "validate-email",
    name: "Validar Email",
    method: "POST",
    path: "/validate-email",
    description: "Valida um endereço de email verificando formato, domínio e deliverability.",
    params: [
      { name: "email", type: "string", required: true, description: "Endereço de email a validar" },
    ],
    exampleBody: { email: "teste@exemplo.com" },
  },
  {
    id: "validate-email-ai",
    name: "Validar Email (AI)",
    method: "POST",
    path: "/validate-email-ai",
    description: "Validação avançada de email usando inteligência artificial.",
    params: [
      { name: "email", type: "string", required: true, description: "Endereço de email a validar" },
    ],
    exampleBody: { email: "teste@exemplo.com" },
  },
  {
    id: "ai-insights",
    name: "AI Insights",
    method: "POST",
    path: "/ai-insights",
    description: "Obtém insights de IA sobre os dados de uso da sua conta.",
    params: [],
    exampleBody: {},
  },
];

const HISTORY_KEY = "xpex_api_playground_history";
const MAX_HISTORY_ITEMS = 50;

interface ResponseTimeStats {
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

function calculateResponseTimeStats(history: RequestHistoryItem[]): ResponseTimeStats | null {
  if (history.length === 0) return null;
  
  const times = history.map(h => h.responseTimeMs);
  const average = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  // Calculate trend: compare first half avg vs second half avg
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendPercent = 0;
  
  if (history.length >= 4) {
    const mid = Math.floor(history.length / 2);
    const recentTimes = times.slice(0, mid);
    const olderTimes = times.slice(mid);
    
    const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
    const olderAvg = olderTimes.reduce((a, b) => a + b, 0) / olderTimes.length;
    
    trendPercent = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
    
    if (trendPercent > 10) trend = 'up';
    else if (trendPercent < -10) trend = 'down';
  }
  
  return { average, min, max, trend, trendPercent: Math.abs(trendPercent) };
}

function exportHistory(history: RequestHistoryItem[], format: 'json' | 'csv'): void {
  let content: string;
  let mimeType: string;
  let extension: string;
  
  if (format === 'json') {
    content = JSON.stringify(history.map(item => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    })), null, 2);
    mimeType = 'application/json';
    extension = 'json';
  } else {
    const headers = ['id', 'endpoint', 'status', 'responseTimeMs', 'timestamp', 'params'];
    const rows = history.map(item => [
      item.id,
      item.endpoint,
      item.status.toString(),
      item.responseTimeMs.toString(),
      item.timestamp.toISOString(),
      JSON.stringify(item.params),
    ]);
    content = [headers.join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
    mimeType = 'text/csv';
    extension = 'csv';
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `api-history-${new Date().toISOString().split('T')[0]}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateCodeExample(endpoint: APIEndpoint, params: Record<string, string>, apiKey: string): { curl: string; javascript: string; python: string } {
  const baseUrl = `https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1${endpoint.path}`;
  const body = endpoint.exampleBody ? { ...endpoint.exampleBody, ...params } : params;
  const bodyStr = JSON.stringify(body, null, 2);

  const curl = `curl -X ${endpoint.method} \\
  "${baseUrl}" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body)}'`;

  const javascript = `const response = await fetch("${baseUrl}", {
  method: "${endpoint.method}",
  headers: {
    "x-api-key": "${apiKey || 'YOUR_API_KEY'}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${bodyStr}),
});

const data = await response.json();
console.log(data);`;

  const python = `import requests

response = requests.${endpoint.method.toLowerCase()}(
    "${baseUrl}",
    headers={
        "x-api-key": "${apiKey || 'YOUR_API_KEY'}",
        "Content-Type": "application/json",
    },
    json=${bodyStr.replace(/"/g, "'").replace(/null/g, "None").replace(/true/g, "True").replace(/false/g, "False")},
)

print(response.json())`;

  return { curl, javascript, python };
}

export function APIPlayground() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(endpoints[0].id);
  const [params, setParams] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);
  const { toast } = useToast();
  const { keys, loading: keysLoading } = useAPIKeys();

  // Calculate response time stats
  const responseTimeStats = useMemo(() => calculateResponseTimeStats(history), [history]);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: RequestHistoryItem) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }, [history]);

  // When a key is selected from dropdown, update the apiKey state
  useEffect(() => {
    if (selectedKeyId && keys.length > 0) {
      const selectedKey = keys.find(k => k.id === selectedKeyId);
      if (selectedKey) {
        setApiKey(selectedKey.key);
      }
    }
  }, [selectedKeyId, keys]);

  const endpoint = endpoints.find((e) => e.id === selectedEndpoint)!;
  const codeExamples = generateCodeExample(endpoint, params, apiKey);

  const handleCopy = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const addToHistory = (endpointId: string, requestParams: Record<string, string>, responseText: string, status: number, responseTimeMs: number) => {
    const newItem: RequestHistoryItem = {
      id: crypto.randomUUID(),
      endpoint: endpointId,
      params: requestParams,
      response: responseText,
      status,
      timestamp: new Date(),
      responseTimeMs,
    };

    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      return updated;
    });
  };

  const replayRequest = (item: RequestHistoryItem) => {
    setSelectedEndpoint(item.endpoint);
    setParams(item.params);
    setShowHistory(false);
    toast({
      title: "Requisição carregada",
      description: "Clique em 'Executar' para repetir a requisição.",
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    toast({
      title: "Histórico limpo",
      description: "Todo o histórico de requisições foi removido.",
    });
  };

  const handleExecute = async () => {
    if (!apiKey) {
      toast({
        title: "API Key necessária",
        description: "Selecione ou insira sua API Key para executar a requisição.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResponse("");

    const startTime = performance.now();

    try {
      const baseUrl = `https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1${endpoint.path}`;
      const body = endpoint.exampleBody ? { ...endpoint.exampleBody, ...params } : params;

      const res = await fetch(baseUrl, {
        method: endpoint.method,
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);
      setLastResponseTime(responseTimeMs);

      // Parse rate limit headers
      const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
      const rateLimitLimit = res.headers.get('x-ratelimit-limit');
      const rateLimitReset = res.headers.get('x-ratelimit-reset');

      if (rateLimitRemaining !== null || rateLimitLimit !== null) {
        setRateLimit({
          remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : 100,
          limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : 100,
          resetAt: rateLimitReset ? new Date(parseInt(rateLimitReset, 10)) : null,
        });
      }

      const data = await res.json();
      const responseText = JSON.stringify(data, null, 2);
      setResponse(responseText);

      // Add to history with response time
      addToHistory(endpoint.id, params, responseText, res.status, responseTimeMs);

      // Track analytics
      analytics.track('api_playground_used', {
        endpoint: endpoint.id,
        status: res.status,
      });

      toast({
        title: res.ok ? "Sucesso!" : "Erro na requisição",
        description: res.ok ? `Executado em ${responseTimeMs}ms` : `Status: ${res.status}`,
        variant: res.ok ? "default" : "destructive",
      });
    } catch (error) {
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);
      setLastResponseTime(responseTimeMs);

      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      const errorResponse = JSON.stringify({ error: errorMessage }, null, 2);
      setResponse(errorResponse);
      addToHistory(endpoint.id, params, errorResponse, 500, responseTimeMs);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="card-cyber">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Terminal className="h-5 w-5 text-primary" />
              API Playground
            </CardTitle>
            <CardDescription>Teste as APIs diretamente com exemplos de código</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Histórico ({history.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showHistory ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Histórico de Requisições</h3>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <>
                    <Select onValueChange={(format) => exportHistory(history, format as 'json' | 'csv')}>
                      <SelectTrigger className="w-[120px] h-8">
                        <Download className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="Exportar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={clearHistory} className="text-destructive h-8">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Response Time Statistics */}
            {responseTimeStats && history.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Estatísticas de Tempo de Resposta</span>
                  <Badge variant="outline" className="text-xs">
                    Últimas {history.length} requisições
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Média</div>
                    <div className="text-lg font-mono font-semibold text-primary">
                      {responseTimeStats.average}ms
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Mínimo</div>
                    <div className="text-lg font-mono font-semibold text-green-500">
                      {responseTimeStats.min}ms
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Máximo</div>
                    <div className="text-lg font-mono font-semibold text-destructive">
                      {responseTimeStats.max}ms
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Tendência</div>
                    <div className="flex items-center justify-center gap-1">
                      {responseTimeStats.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-destructive" />
                      ) : responseTimeStats.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={`text-sm font-medium ${
                        responseTimeStats.trend === 'up' ? 'text-destructive' : 
                        responseTimeStats.trend === 'down' ? 'text-green-500' : 
                        'text-muted-foreground'
                      }`}>
                        {responseTimeStats.trend === 'stable' ? 'Estável' : `${responseTimeStats.trendPercent}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <ScrollArea className="h-[400px]">
              {history.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Nenhuma requisição no histórico
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => {
                    const ep = endpoints.find(e => e.id === item.endpoint);
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.status < 400 ? "default" : "destructive"}>
                              {item.status}
                            </Badge>
                            <span className="font-medium text-sm">{ep?.name || item.endpoint}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => replayRequest(item)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Repetir
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{item.timestamp.toLocaleString('pt-BR')}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.responseTimeMs}ms
                          </span>
                        </div>
                        {Object.keys(item.params).length > 0 && (
                          <div className="text-xs font-mono mt-1 text-muted-foreground">
                            Params: {JSON.stringify(item.params)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <Button variant="outline" className="w-full" onClick={() => setShowHistory(false)}>
              Voltar ao Playground
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Endpoint</Label>
                <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {endpoints.map((ep) => (
                      <SelectItem key={ep.id} value={ep.id}>
                        <span className="flex items-center gap-2">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${ep.method === "GET" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {ep.method}
                          </span>
                          {ep.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{endpoint.description}</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Key className="h-3 w-3" />
                  API Key
                </Label>
                {keys.length > 0 ? (
                  <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma API Key" />
                    </SelectTrigger>
                    <SelectContent>
                      {keys.filter(k => k.status === 'active').map((key) => (
                        <SelectItem key={key.id} value={key.id}>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{key.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              ...{key.key.slice(-8)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Sua API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                )}
                {keys.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {keysLoading ? "Carregando..." : `${keys.filter(k => k.status === 'active').length} chave(s) ativa(s)`}
                  </p>
                )}
              </div>
            </div>

            {endpoint.params.length > 0 && (
              <div className="space-y-3">
                <Label>Parâmetros</Label>
                {endpoint.params.map((param) => (
                  <div key={param.name} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={param.name} className="text-xs font-mono">
                        {param.name}
                        {param.required && <span className="text-destructive">*</span>}
                      </Label>
                      <span className="text-xs text-muted-foreground">({param.type})</span>
                    </div>
                    <Input
                      id={param.name}
                      placeholder={param.description}
                      value={params[param.name] || ""}
                      onChange={(e) => setParams((prev) => ({ ...prev, [param.name]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Rate Limit & Response Time Display */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Rate Limit:</span>
                {rateLimit ? (
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-mono font-medium ${rateLimit.remaining < 10 ? 'text-destructive' : rateLimit.remaining < 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {rateLimit.remaining}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {rateLimit.limit}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Último tempo:</span>
                {lastResponseTime !== null ? (
                  <span className={`text-sm font-mono font-medium ${lastResponseTime < 200 ? 'text-green-500' : lastResponseTime < 500 ? 'text-yellow-500' : 'text-destructive'}`}>
                    {lastResponseTime}ms
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </div>
            </div>

            <Button onClick={handleExecute} disabled={isLoading} className="w-full" variant="neon">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Executar Requisição
                </>
              )}
            </Button>

            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              {(["curl", "javascript", "python"] as const).map((lang) => (
                <TabsContent key={lang} value={lang} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8"
                    onClick={() => handleCopy(codeExamples[lang], lang)}
                  >
                    {copied === lang ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <ScrollArea className="h-[150px] w-full rounded-md border border-border/50 bg-muted/50 p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap">{codeExamples[lang]}</pre>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>

            {response && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Resposta
                </Label>
                <ScrollArea className="h-[200px] w-full rounded-md border border-border/50 bg-muted/50 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap text-green-400">{response}</pre>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
