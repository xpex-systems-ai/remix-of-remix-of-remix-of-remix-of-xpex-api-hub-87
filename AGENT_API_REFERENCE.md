# XPEX Agent API Reference

## Overview

The XPEX Agent API provides high-throughput email validation services designed for AI agents, autonomous systems, and B2B integrations.

**Base URL:** `https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1`

---

## Authentication

All API requests require authentication via the `x-api-key` header.

```bash
curl -X POST "https://api.xpex.io/functions/v1/agent-validate" \
  -H "x-api-key: gm_your_api_key_here" \
  -H "Content-Type: application/json"
```

### API Key Types

| Type | Header | Credits | Use Case |
|------|--------|---------|----------|
| Production | `x-api-key: gm_xxx` | Deducted | Live validation |
| Sandbox | `X-Sandbox-Mode: true` | Not deducted | Testing |

---

## Endpoints

### POST /agent-validate

Standard email validation with MX record verification.

**Cost:** 1 credit per request

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "valid": true,
  "score": 95,
  "email": "user@example.com",
  "domain": "example.com",
  "checks": {
    "format": {
      "valid": true,
      "message": "Valid email format"
    },
    "mx": {
      "valid": true,
      "records": ["mx1.example.com", "mx2.example.com"],
      "message": "Valid MX records found"
    },
    "disposable": {
      "is_disposable": false,
      "message": "Not a disposable email"
    },
    "typo": {
      "has_typo": false,
      "suggestion": null
    }
  },
  "credits": {
    "used": 1,
    "remaining": 9999
  },
  "metadata": {
    "processed_at": "2024-01-15T10:30:00Z",
    "response_time_ms": 45,
    "version": "2.0.0"
  }
}
```

---

### POST /agent-validate-ai

AI-powered validation with fraud detection and risk scoring.

**Cost:** 2 credits per request

**Request:**
```json
{
  "email": "user@suspicious-domain.com"
}
```

**Response:**
```json
{
  "valid": true,
  "score": 72,
  "email": "user@suspicious-domain.com",
  "domain": "suspicious-domain.com",
  "checks": {
    "format": { "valid": true },
    "mx": { "valid": true },
    "disposable": { "is_disposable": false }
  },
  "ai": {
    "riskScore": 65,
    "fraudIndicators": [
      "Recently registered domain",
      "Low email volume from domain"
    ],
    "deliverabilityScore": 78,
    "patternAnalysis": {
      "isBusinessEmail": false,
      "isRoleBasedEmail": false,
      "domainAge": "< 30 days"
    },
    "recommendations": [
      "Consider additional verification",
      "Monitor for bounce rates"
    ]
  },
  "credits": {
    "used": 2,
    "remaining": 9998
  }
}
```

---

### GET /agent-health

Service health check (no authentication required).

**Cost:** 0 credits

**Response:**
```json
{
  "ok": true,
  "status": "operational",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "services": [
    {
      "name": "database",
      "status": "operational",
      "latency_ms": 12,
      "message": "Connected"
    },
    {
      "name": "ai_service",
      "status": "operational",
      "latency_ms": 0,
      "message": "AI service configured"
    },
    {
      "name": "mx_resolver",
      "status": "operational",
      "latency_ms": 45,
      "message": "MX resolution operational"
    },
    {
      "name": "runtime",
      "status": "operational",
      "latency_ms": 0,
      "message": "Edge runtime operational"
    }
  ],
  "endpoints": [
    { "path": "/agent/validate", "method": "POST", "status": "available", "cost": 1 },
    { "path": "/agent/validate-ai", "method": "POST", "status": "available", "cost": 2 },
    { "path": "/agent/health", "method": "GET", "status": "available", "cost": 0 }
  ],
  "rate_limits": [
    { "tier": "Free", "requests_per_second": 5 },
    { "tier": "Starter", "requests_per_second": 10 },
    { "tier": "Growth", "requests_per_second": 50 },
    { "tier": "Enterprise", "requests_per_second": 500 }
  ]
}
```

---

## Rate Limiting

Rate limits are enforced per API key based on subscription tier.

| Tier | Requests/Second | Burst Limit |
|------|-----------------|-------------|
| Free | 5 | 10 |
| Starter | 10 | 25 |
| Growth | 50 | 100 |
| Enterprise | 500 | 1000 |

### Rate Limit Headers

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1705315860
```

### Rate Limit Exceeded Response

```json
{
  "valid": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Please retry after 1 second.",
  "retryAfter": 1
}
```

---

## Error Handling

### Error Response Format

```json
{
  "valid": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or expired |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits for this request |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INVALID_EMAIL` | 400 | Email format is invalid |
| `VALIDATION_FAILED` | 500 | Internal validation error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Sandbox Mode

Test your integration without consuming credits.

### Enable Sandbox Mode

**Option 1:** Use a sandbox API key (created in dashboard)

**Option 2:** Add header to any request:
```bash
-H "X-Sandbox-Mode: true"
```

### Sandbox Limitations

- Rate limit: 50 requests/minute
- All validation results are real
- No credits are deducted
- Usage is logged but not billed

---

## SDK Examples

### TypeScript

```typescript
import { GoldMailClient } from '@xpex/goldmail-sdk';

const client = new GoldMailClient({
  apiKey: process.env.GOLDMAIL_API_KEY,
  sandbox: false,
});

// Basic validation
const result = await client.validate('user@example.com');

// AI validation
const aiResult = await client.validateAI('user@example.com');

// Health check
const health = await client.health();
```

### Python

```python
from goldmail import GoldMailClient

client = GoldMailClient(api_key="gm_xxx", sandbox=False)

# Basic validation
result = client.validate("user@example.com")

# AI validation
ai_result = client.validate_ai("user@example.com")

# Health check
health = client.health()
```

### Go

```go
client := goldmail.NewClient(os.Getenv("GOLDMAIL_API_KEY"))

// Basic validation
result, err := client.Validate(ctx, "user@example.com")

// AI validation
aiResult, err := client.ValidateAI(ctx, "user@example.com")

// Health check
health, err := client.Health(ctx)
```

---

## Webhooks

Configure webhooks to receive real-time notifications.

### Supported Events

| Event | Description |
|-------|-------------|
| `validation.completed` | Email validation completed |
| `credits.low` | Credits below threshold |
| `credits.depleted` | All credits consumed |
| `api_key.rotated` | API key was rotated |

### Webhook Payload

```json
{
  "event": "validation.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "email": "user@example.com",
    "valid": true,
    "score": 95
  }
}
```

### Signature Verification

All webhooks include HMAC-SHA256 signature in `X-Webhook-Signature` header.

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## Best Practices

### 1. Use Sandbox for Testing
Always test with sandbox mode before going to production.

### 2. Handle Rate Limits
Implement exponential backoff when receiving 429 responses.

### 3. Monitor Credits
Set up auto-recharge or credit alerts to avoid service interruption.

### 4. Rotate API Keys
Regularly rotate API keys (recommended: every 90 days).

### 5. Use AI Validation Selectively
Use standard validation for high-volume, AI validation for high-risk emails.

---

## Support

- **Documentation**: https://docs.xpex.io
- **Email**: support@xpex.io
- **Status Page**: https://status.xpex.io
