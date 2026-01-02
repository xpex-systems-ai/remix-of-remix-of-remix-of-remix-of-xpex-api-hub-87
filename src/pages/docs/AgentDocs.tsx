import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Copy, Key, Zap, Shield, Code, Terminal, BookOpen, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const AgentDocs = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (code: string, section: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(section);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const typescriptExample = `import { GoldMailClient } from '@xpex/goldmail-sdk';

// Initialize with your API key
const client = new GoldMailClient({
  apiKey: process.env.GOLDMAIL_API_KEY,
  sandbox: true, // Enable sandbox mode for testing
});

// Validate a single email
async function validateEmail(email: string) {
  try {
    const result = await client.validate(email);
    
    console.log('Valid:', result.valid);
    console.log('Score:', result.score);
    console.log('MX Records:', result.checks.mx.valid);
    console.log('Credits used:', result.credits.used);
    
    return result;
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      console.log('Rate limited, retry after:', error.retryAfter);
    }
    throw error;
  }
}

// AI-powered validation with fraud detection
async function validateWithAI(email: string) {
  const result = await client.validateAI(email);
  
  console.log('Risk Score:', result.ai.riskScore);
  console.log('Fraud Indicators:', result.ai.fraudIndicators);
  console.log('Recommendations:', result.ai.recommendations);
  
  return result;
}

// Check API health
async function checkHealth() {
  const health = await client.health();
  console.log('API Status:', health.status);
  console.log('Services:', health.services);
}

// Production usage (disable sandbox)
const prodClient = new GoldMailClient({
  apiKey: process.env.GOLDMAIL_API_KEY,
  sandbox: false,
});`;

  const pythonExample = `from goldmail import GoldMailClient, GoldMailError
import os

# Initialize client
client = GoldMailClient(
    api_key=os.environ["GOLDMAIL_API_KEY"],
    sandbox=True  # Enable sandbox for testing
)

# Basic validation
def validate_email(email: str) -> dict:
    try:
        result = client.validate(email)
        
        print(f"Valid: {result.valid}")
        print(f"Score: {result.score}")
        print(f"MX Valid: {result.checks['mx']['valid']}")
        print(f"Credits used: {result.credits['used']}")
        
        return result
    except GoldMailError as e:
        if e.code == "RATE_LIMITED":
            print(f"Rate limited. Retry after {e.retry_after}s")
        raise

# AI-powered validation
def validate_with_ai(email: str) -> dict:
    result = client.validate_ai(email)
    
    print(f"Risk Score: {result.ai['riskScore']}")
    print(f"Fraud Indicators: {result.ai['fraudIndicators']}")
    print(f"Deliverability: {result.ai['deliverabilityScore']}")
    
    return result

# Batch validation
async def validate_batch(emails: list[str]) -> list[dict]:
    results = await client.validate_batch(emails)
    
    valid_count = sum(1 for r in results if r.valid)
    print(f"Valid: {valid_count}/{len(emails)}")
    
    return results

# Health check
def check_health():
    health = client.health()
    print(f"Status: {health.status}")
    print(f"MX Resolver: {health.services['mxResolver']['status']}")

# Production usage
prod_client = GoldMailClient(
    api_key=os.environ["GOLDMAIL_API_KEY"],
    sandbox=False
)`;

  const goExample = `package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/xpex-neural/goldmail-go"
)

func main() {
    // Initialize client with sandbox mode
    client := goldmail.NewClient(os.Getenv("GOLDMAIL_API_KEY"))
    client.SetSandbox(true) // Enable sandbox for testing

    ctx := context.Background()

    // Basic validation
    result, err := client.Validate(ctx, "user@example.com")
    if err != nil {
        if goldmail.IsRateLimited(err) {
            retryErr := err.(*goldmail.RateLimitError)
            log.Printf("Rate limited. Retry after %ds", retryErr.RetryAfter)
        }
        log.Fatal(err)
    }

    fmt.Printf("Valid: %v\\n", result.Valid)
    fmt.Printf("Score: %d\\n", result.Score)
    fmt.Printf("MX Valid: %v\\n", result.Checks.MX.Valid)
    fmt.Printf("Credits used: %d\\n", result.Credits.Used)

    // AI-powered validation
    aiResult, err := client.ValidateAI(ctx, "user@example.com")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Risk Score: %d\\n", aiResult.AI.RiskScore)
    fmt.Printf("Fraud Indicators: %v\\n", aiResult.AI.FraudIndicators)
    fmt.Printf("Deliverability: %d\\n", aiResult.AI.DeliverabilityScore)

    // Health check
    health, err := client.Health(ctx)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("API Status: %s\\n", health.Status)
    fmt.Printf("MX Resolver: %s\\n", health.Services.MXResolver.Status)

    // Production usage (disable sandbox)
    prodClient := goldmail.NewClient(os.Getenv("GOLDMAIL_API_KEY"))
    prodClient.SetSandbox(false)
}`;

  const curlExample = `# Health check (no auth required)
curl -X GET "https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/agent-health" \\
  -H "Content-Type: application/json"

# Validate email (sandbox mode)
curl -X POST "https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/agent-validate" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Sandbox-Mode: true" \\
  -d '{"email": "test@example.com"}'

# AI validation (production mode)
curl -X POST "https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/agent-validate-ai" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@company.com"}'

# Rotate API key
curl -X POST "https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/rotate-api-key" \\
  -H "Authorization: Bearer YOUR_USER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"keyId": "your-key-uuid", "expirationDays": 90}'`;

  return (
    <>
      <Helmet>
        <title>Agent Onboarding | XPEX Agent API Documentation</title>
        <meta name="description" content="Complete guide for integrating AI agents and automated systems with XPEX Neural's Agent API. Includes SDK examples for TypeScript, Python, and Go." />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Zap className="w-3 h-3 mr-1" />
              Agent API v2.0
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Agent Onboarding Guide
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to integrate your AI agents and automated systems 
              with the XPEX Agent API for high-throughput email validation.
            </p>
          </div>

          {/* Quick Start Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <Card>
              <CardHeader className="pb-2">
                <Key className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">1. Get API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create a sandbox or production API key from your dashboard.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <Code className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">2. Install SDK</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Install our official SDK for TypeScript, Python, or Go.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <Zap className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">3. Test in Sandbox</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Validate emails without consuming credits in sandbox mode.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <Shield className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">4. Go Live</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Switch to production and start validating at scale.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sandbox Mode Alert */}
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                <CardTitle>Sandbox Mode</CardTitle>
              </div>
              <CardDescription>
                Test your integration without consuming credits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                Sandbox mode allows you to test your integration completely free. Simply:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Create a sandbox API key from your dashboard</li>
                <li>Or add the <code className="bg-muted px-1 rounded">X-Sandbox-Mode: true</code> header to any request</li>
                <li>All validation results are real, but no credits are deducted</li>
                <li>Rate limits are lower (50 req/min) to prevent abuse</li>
              </ul>
            </CardContent>
          </Card>

          {/* SDK Examples */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                <CardTitle>SDK Examples</CardTitle>
              </div>
              <CardDescription>
                Complete code examples for all supported languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="typescript">
                <TabsList className="mb-4">
                  <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="go">Go</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>

                <TabsContent value="typescript">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(typescriptExample, 'typescript')}
                    >
                      {copiedSection === 'typescript' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{typescriptExample}</code>
                    </pre>
                  </div>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Installation:</p>
                    <code className="text-sm">npm install @xpex/goldmail-sdk</code>
                  </div>
                </TabsContent>

                <TabsContent value="python">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(pythonExample, 'python')}
                    >
                      {copiedSection === 'python' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{pythonExample}</code>
                    </pre>
                  </div>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Installation:</p>
                    <code className="text-sm">pip install goldmail</code>
                  </div>
                </TabsContent>

                <TabsContent value="go">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(goExample, 'go')}
                    >
                      {copiedSection === 'go' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{goExample}</code>
                    </pre>
                  </div>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Installation:</p>
                    <code className="text-sm">go get github.com/xpex-neural/goldmail-go</code>
                  </div>
                </TabsContent>

                <TabsContent value="curl">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(curlExample, 'curl')}
                    >
                      {copiedSection === 'curl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{curlExample}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* API Reference */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <CardTitle>API Reference</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Endpoints Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Endpoint</th>
                        <th className="text-left py-2 px-4">Method</th>
                        <th className="text-left py-2 px-4">Credits</th>
                        <th className="text-left py-2 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-mono text-xs">/agent-validate</td>
                        <td className="py-2 px-4"><Badge>POST</Badge></td>
                        <td className="py-2 px-4">1</td>
                        <td className="py-2 px-4">Standard email validation with MX check</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-mono text-xs">/agent-validate-ai</td>
                        <td className="py-2 px-4"><Badge>POST</Badge></td>
                        <td className="py-2 px-4">2</td>
                        <td className="py-2 px-4">AI-powered validation with fraud detection</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-mono text-xs">/agent-health</td>
                        <td className="py-2 px-4"><Badge variant="secondary">GET</Badge></td>
                        <td className="py-2 px-4">0</td>
                        <td className="py-2 px-4">Health check for all services</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-mono text-xs">/rotate-api-key</td>
                        <td className="py-2 px-4"><Badge>POST</Badge></td>
                        <td className="py-2 px-4">0</td>
                        <td className="py-2 px-4">Rotate API key with expiration</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Rate Limits */}
                <div>
                  <h3 className="font-semibold mb-2">Rate Limits by Tier</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">Free</p>
                      <p className="text-2xl font-bold">100</p>
                      <p className="text-xs text-muted-foreground">requests/minute</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">Starter</p>
                      <p className="text-2xl font-bold">500</p>
                      <p className="text-xs text-muted-foreground">requests/minute</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">Professional</p>
                      <p className="text-2xl font-bold">2,000</p>
                      <p className="text-xs text-muted-foreground">requests/minute</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg border-2 border-primary">
                      <p className="font-medium">Enterprise</p>
                      <p className="text-2xl font-bold">10,000</p>
                      <p className="text-xs text-muted-foreground">requests/minute</p>
                    </div>
                  </div>
                </div>

                {/* Error Codes */}
                <div>
                  <h3 className="font-semibold mb-2">Error Codes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Code</th>
                          <th className="text-left py-2 px-4">HTTP</th>
                          <th className="text-left py-2 px-4">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 px-4 font-mono text-xs">UNAUTHORIZED</td>
                          <td className="py-2 px-4">401</td>
                          <td className="py-2 px-4">Missing or invalid API key</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-4 font-mono text-xs">KEY_EXPIRED</td>
                          <td className="py-2 px-4">401</td>
                          <td className="py-2 px-4">API key has expired, needs rotation</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-4 font-mono text-xs">INSUFFICIENT_CREDITS</td>
                          <td className="py-2 px-4">402</td>
                          <td className="py-2 px-4">Not enough credits for this operation</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-4 font-mono text-xs">RATE_LIMITED</td>
                          <td className="py-2 px-4">429</td>
                          <td className="py-2 px-4">Too many requests, check X-RateLimit headers</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-mono text-xs">IP_RATE_LIMITED</td>
                          <td className="py-2 px-4">429</td>
                          <td className="py-2 px-4">IP-based rate limit exceeded</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Rotation Guide */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                <CardTitle>API Key Rotation</CardTitle>
              </div>
              <CardDescription>
                Enterprise security best practice for credential management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">
                  For enterprise security compliance, we recommend rotating your API keys every 90 days. 
                  Our rotation system allows seamless key updates without downtime.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Automatic Features</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• New key generated with 90-day expiration</li>
                      <li>• Old key immediately deactivated</li>
                      <li>• Audit log entry created</li>
                      <li>• Settings preserved (sandbox, environment)</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Best Practices</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Set up key rotation reminders</li>
                      <li>• Use environment variables for keys</li>
                      <li>• Monitor KEY_EXPIRED errors</li>
                      <li>• Test new keys in sandbox first</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Create your first API key and start validating emails in minutes.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild>
                <a href="/dashboard">Get API Key</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/products/bot-api">View Pricing</a>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default AgentDocs;
