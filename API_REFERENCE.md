# GoldMail Email Intelligence API Reference

> **Version:** 1.0.0  
> **Base URL:** `https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1`  
> **OpenAPI Spec:** [`/openapi.json`](./public/openapi.json)

Enterprise-grade email validation and intelligence API with credit-based billing.

---

## Authentication

All API requests (except `/health`) require authentication via API key.

```
X-API-Key: your_api_key_here
```

Obtain your API key from **Dashboard → API Keys**.

---

## Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per API Key | 100 requests | 1 minute |
| Per IP | 30 requests | 1 minute |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705320000
```

---

## Endpoints

### POST /validate-email

Standard email validation with format, deliverability, and risk checks.

**Credits:** 1 per request

#### Request

```bash
curl -X POST https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/validate-email \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"email": "user@example.com"}'
```

#### Response

```json
{
  "ok": true,
  "data": {
    "email": "user@gmail.com",
    "valid": true,
    "score": 95,
    "checks": {
      "format_valid": true,
      "is_disposable": false,
      "mx_valid": true,
      "has_typo": false
    },
    "suggestion": null,
    "risk_level": "low"
  },
  "credits_used": 1,
  "remaining_credits": 99,
  "response_time_ms": 145,
  "rate_limit": {
    "remaining": 98,
    "reset_at": "2024-01-15T12:00:00Z"
  }
}
```

---

### POST /validate-email-ai

AI-powered email validation with behavioral inference and fraud detection.

**Credits:** 1 per request

#### Request

```bash
curl -X POST https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/validate-email-ai \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"email": "user@example.com"}'
```

#### Response

```json
{
  "ok": true,
  "data": {
    "email": "user@gmail.com",
    "valid": true,
    "score": 92,
    "disposable": false,
    "mx_found": true,
    "format_valid": true,
    "domain": "gmail.com",
    "risk_level": "low",
    "risk_score": 8,
    "fraud_indicators": [],
    "typo_detected": false,
    "suggested_correction": null,
    "domain_analysis": "Gmail is a major email provider with excellent deliverability",
    "recommendations": ["Safe to use for transactional emails"],
    "response_time_ms": 850,
    "ai_powered": true
  },
  "credits_used": 1,
  "remaining_credits": 98,
  "rate_limit": {
    "remaining": 58,
    "reset_at": "2024-01-15T12:00:00Z"
  }
}
```

---

### POST /bulk-validate-email

Submit a batch of emails for asynchronous validation.

**Credits:** 1 per email (dynamic)

**Authentication:** Session-based (requires logged-in user via `Authorization: Bearer {token}`)

#### Request

```bash
curl -X POST https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/bulk-validate-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "emails": ["user1@example.com", "user2@example.com"],
    "fileName": "contacts.csv"
  }'
```

#### Response

```json
{
  "ok": true,
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "total_emails": 2,
  "message": "Bulk validation job created"
}
```

---

### GET /health

Health check endpoint. **No authentication required.**

#### Request

```bash
curl https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/health
```

#### Response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T12:00:00Z",
  "services": {
    "api": "operational",
    "database": "operational",
    "validation": "operational"
  },
  "response_time_ms": 12
}
```

---

### POST /purchase-credits

Initiate a Stripe checkout session for purchasing credits.

**Authentication:** Session-based (requires logged-in user)

#### Request

```bash
curl -X POST https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/purchase-credits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"package": "starter"}'
```

**Available Packages:**

| Package | Credits | Price |
|---------|---------|-------|
| `starter` | 2,000 | $5 |
| `growth` | 20,000 | $39 |
| `scale` | 100,000 | $149 |

#### Response

```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_API_KEY` | 401 | No API key provided in headers |
| `INVALID_API_KEY` | 403 | API key is invalid or inactive |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits for the request |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `MISSING_EMAIL` | 400 | Email field is required |
| `INVALID_EMAIL` | 400 | Email format is invalid |
| `INTERNAL_ERROR` | 500 | Server-side error |

### Error Response Format

```json
{
  "ok": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

---

## Risk Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| `low` | 80-100 | Safe to use |
| `medium` | 50-79 | Use with caution |
| `high` | 20-49 | High risk, not recommended |
| `critical` | 0-19 | Do not use |

---

## SDKs

Official SDKs are available for:

### TypeScript/JavaScript

```bash
npm install @xpex/goldmail-sdk
```

```typescript
import { GoldMailClient } from '@xpex/goldmail-sdk';

const client = new GoldMailClient('your_api_key');
const result = await client.validate('user@example.com');
```

### Python

```bash
pip install goldmail-sdk
```

```python
from goldmail import GoldMailClient

client = GoldMailClient('your_api_key')
result = client.validate('user@example.com')
```

### Go

```bash
go get github.com/xpex/goldmail-go
```

```go
import "github.com/xpex/goldmail-go"

client := goldmail.NewClient("your_api_key")
result, err := client.Validate(ctx, "user@example.com")
```

---

## Webhooks

Configure webhooks in the Dashboard to receive real-time notifications.

### Supported Events

| Event | Description |
|-------|-------------|
| `validation.completed` | Bulk validation job completed |
| `credits.low` | Credit balance below threshold |
| `credits.exhausted` | Credit balance reached zero |

### Webhook Payload

```json
{
  "event": "validation.completed",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "data": {
    "job_id": "uuid",
    "total": 1000,
    "valid": 850,
    "invalid": 150
  }
}
```

### Webhook Signature

Webhooks are signed with HMAC-SHA256. Verify using your webhook secret:

```javascript
const crypto = require('crypto');

const signature = req.headers['x-webhook-signature'];
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

const isValid = signature === expectedSignature;
```

---

## Support

- **Email:** api@xpexneural.com
- **Documentation:** https://xpexneural.com/docs
- **Status:** https://xpexneural.com/status
