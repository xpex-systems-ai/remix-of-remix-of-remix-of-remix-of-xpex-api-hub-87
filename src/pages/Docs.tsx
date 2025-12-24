import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Play, Code, Book, Terminal, Zap, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";

// OpenAPI 3.0 Specification
const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "XPEX Email Validation API",
    description: "AI-powered email validation API with disposable detection, typo correction, and risk analysis.",
    version: "1.0.0",
    contact: { email: "support@xpex.dev" },
    license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
  },
  servers: [
    { url: "https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1", description: "Production" },
  ],
  paths: {
    "/validate-email": {
      post: {
        summary: "Validate Email Address",
        description: "Validates an email address and returns detailed information about its quality and risk level.",
        operationId: "validateEmail",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EmailRequest" },
              example: { email: "user@example.com" },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful validation",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationResponse" },
              },
            },
          },
          "400": { description: "Invalid request" },
          "401": { description: "Invalid or missing API key" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
    },
    schemas: {
      EmailRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      ValidationResponse: {
        type: "object",
        properties: {
          email: { type: "string" },
          valid: { type: "boolean" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          formatValid: { type: "boolean" },
          isDisposable: { type: "boolean" },
          mxValid: { type: "boolean" },
          domain: { type: "string" },
          suggestion: { type: "string", nullable: true },
        },
      },
    },
  },
};

const endpoints = [
  {
    id: "validate",
    name: "Email Validation",
    method: "POST",
    path: "/validate-email",
    description: "Validates an email and returns detailed information about its quality and risk.",
    request: `{
  "email": "test@gmail.com"
}`,
    response: `{
  "email": "test@gmail.com",
  "valid": true,
  "score": 95,
  "formatValid": true,
  "isDisposable": false,
  "mxValid": true,
  "domain": "gmail.com",
  "suggestion": null
}`,
  },
  {
    id: "validate-ai",
    name: "AI Email Validation",
    method: "POST",
    path: "/validate-email-ai",
    description: "AI-powered validation with risk analysis, typosquatting detection, and fraud indicators.",
    request: `{
  "email": "test@gmail.com"
}`,
    response: `{
  "email": "test@gmail.com",
  "isValid": true,
  "riskLevel": "low",
  "riskScore": 15,
  "analysis": {
    "formatValid": true,
    "domainType": "established_provider",
    "hasSuspiciousPatterns": false,
    "typosquattingRisk": "none",
    "fraudIndicators": []
  },
  "recommendation": "Safe to use",
  "confidence": 0.95
}`,
  },
  {
    id: "health",
    name: "Health Check",
    method: "GET",
    path: "/health",
    description: "Check the API service status.",
    request: null,
    response: `{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": "99.99%"
}`,
  },
];

const codeExamples = {
  curl: (endpoint: typeof endpoints[0]) => `curl -X ${endpoint.method} \\
  https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1${endpoint.path} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY"${endpoint.request ? ` \\
  -d '${endpoint.request.replace(/\n/g, "").replace(/  /g, "")}'` : ""}`,
  
  python: (endpoint: typeof endpoints[0]) => `import requests

url = "https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1${endpoint.path}"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
}
${endpoint.request ? `payload = ${endpoint.request}

response = requests.${endpoint.method.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`}
print(response.json())`,
  
  javascript: (endpoint: typeof endpoints[0]) => `const response = await fetch("https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1${endpoint.path}", {
  method: "${endpoint.method}",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
  }${endpoint.request ? `,
  body: JSON.stringify(${endpoint.request.replace(/\n/g, "").replace(/  /g, " ")})` : ""}
});

const data = await response.json();
console.log(data);`,
};

const Docs = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [playgroundEmail, setPlaygroundEmail] = useState("test@gmail.com");
  const [playgroundResult, setPlaygroundResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadOpenApiSpec = () => {
    const blob = new Blob([JSON.stringify(openApiSpec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xpex-openapi-spec.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("OpenAPI spec downloaded!");
  };

  const runPlayground = async () => {
    setIsLoading(true);
    // Simulated API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const isValid = playgroundEmail.includes("@") && playgroundEmail.includes(".");
    const isDisposable = ["tempmail.com", "guerrillamail.com", "10minutemail.com"].some(
      (d) => playgroundEmail.includes(d)
    );
    const score = isValid ? (isDisposable ? 30 : Math.floor(Math.random() * 20) + 75) : 0;

    setPlaygroundResult(JSON.stringify({
      ok: true,
      data: {
        email: playgroundEmail,
        valid: isValid,
        score,
        disposable: isDisposable,
        mx_records: isValid,
        domain: playgroundEmail.split("@")[1] || "",
        risk_level: score > 70 ? "low" : score > 40 ? "medium" : "high"
      },
      credits_used: 1,
      remaining_credits: 999
    }, null, 2));
    setIsLoading(false);
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-neon-cyan" />
              <h1 className="text-xl font-display font-bold text-foreground">
                API Documentation
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={downloadOpenApiSpec}>
              <FileJson className="h-4 w-4 mr-2" />
              OpenAPI Spec
            </Button>
            <Link to="/dashboard">
              <Button variant="neon" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-4 rounded-xl border border-border/50 sticky top-24">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-neon-cyan" />
                Endpoints
              </h3>
              <nav className="space-y-2">
                {endpoints.map((endpoint) => (
                  <button
                    key={endpoint.id}
                    onClick={() => setSelectedEndpoint(endpoint)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedEndpoint.id === endpoint.id
                        ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span className={`font-mono text-xs mr-2 ${
                      endpoint.method === "POST" ? "text-green-400" : "text-blue-400"
                    }`}>
                      {endpoint.method}
                    </span>
                    {endpoint.name}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-6 border-t border-border/50">
                <h4 className="font-semibold text-foreground mb-3 text-sm">Authentication</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  All requests require an API Key in the header:
                </p>
                <code className="block text-xs bg-background/50 p-2 rounded font-mono text-neon-cyan">
                  x-api-key: your_key
                </code>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50">
                <h4 className="font-semibold text-foreground mb-3 text-sm">OpenAPI 3.0</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Download the full OpenAPI specification for integration.
                </p>
                <Button variant="outline" size="sm" className="w-full" onClick={downloadOpenApiSpec}>
                  <FileJson className="h-3 w-3 mr-2" />
                  Download Spec
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Endpoint Info */}
            <div className="glass-card p-6 rounded-xl border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                  selectedEndpoint.method === "POST" 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-blue-500/20 text-blue-400"
                }`}>
                  {selectedEndpoint.method}
                </span>
                <code className="text-lg font-mono text-foreground">{selectedEndpoint.path}</code>
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {selectedEndpoint.name}
              </h2>
              <p className="text-muted-foreground">{selectedEndpoint.description}</p>
            </div>

            {/* Code Examples */}
            <div className="glass-card p-6 rounded-xl border border-border/50">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Code className="h-5 w-5 text-neon-purple" />
                Code Examples
              </h3>
              
              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="bg-background/50 border border-border/50 mb-4">
                  <TabsTrigger value="curl" className="font-mono text-xs">cURL</TabsTrigger>
                  <TabsTrigger value="python" className="font-mono text-xs">Python</TabsTrigger>
                  <TabsTrigger value="javascript" className="font-mono text-xs">JavaScript</TabsTrigger>
                </TabsList>

                {(["curl", "python", "javascript"] as const).map((lang) => (
                  <TabsContent key={lang} value={lang}>
                    <div className="relative">
                      <pre className="bg-background/80 p-4 rounded-lg border border-border/50 overflow-x-auto">
                        <code className="text-sm font-mono text-foreground whitespace-pre">
                          {codeExamples[lang](selectedEndpoint)}
                        </code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => copyCode(codeExamples[lang](selectedEndpoint), `${lang}-${selectedEndpoint.id}`)}
                      >
                        {copiedCode === `${lang}-${selectedEndpoint.id}` ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Response Example */}
            <div className="glass-card p-6 rounded-xl border border-border/50">
              <h3 className="font-display font-semibold text-foreground mb-4">Response</h3>
              <pre className="bg-background/80 p-4 rounded-lg border border-border/50 overflow-x-auto">
                <code className="text-sm font-mono text-green-400 whitespace-pre">
                  {selectedEndpoint.response}
                </code>
              </pre>
            </div>

            {/* Interactive Playground */}
            {selectedEndpoint.id === "validate" && (
              <div className="glass-card p-6 rounded-xl border border-neon-cyan/30 bg-neon-cyan/5">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Play className="h-5 w-5 text-neon-cyan" />
                  Interactive Playground
                </h3>
                
                <div className="flex gap-4 mb-4">
                  <input
                    type="email"
                    value={playgroundEmail}
                    onChange={(e) => setPlaygroundEmail(e.target.value)}
                    placeholder="Enter an email to test"
                    className="flex-1 px-4 py-2 bg-background/50 border border-border/50 rounded-lg font-mono text-sm text-foreground focus:border-neon-cyan focus:outline-none"
                  />
                  <Button variant="neon" onClick={runPlayground} disabled={isLoading}>
                    {isLoading ? (
                      "Validating..."
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Test
                      </>
                    )}
                  </Button>
                </div>

                {playgroundResult && (
                  <pre className="bg-background/80 p-4 rounded-lg border border-border/50 overflow-x-auto">
                    <code className="text-sm font-mono text-green-400 whitespace-pre">
                      {playgroundResult}
                    </code>
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default Docs;
