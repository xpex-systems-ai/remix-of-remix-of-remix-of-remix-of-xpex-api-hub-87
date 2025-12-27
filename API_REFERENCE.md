# XPEX Neural API Reference

> **Base URL:** `https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1`

## Authentication

All API endpoints (except `/health`) require authentication via API key.

```
Header: x-api-key: YOUR_API_KEY
```

API keys can be created and managed in the [Dashboard](/dashboard).

---

## Endpoints

### Email Validation

#### `POST /validate-email`

Basic email validation with format checks, disposable detection, and MX validation.

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | Your API key |
| `Content-Type` | Yes | `application/json` |

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "email": "user@example.com",
    "valid": true,
    "score": 100,
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
  "response_time_ms": 45,
  "rate_limit": {
    "remaining": 99,
    "reset_at": "2025-01-01T00:01:00.000Z"
  }
}
```

**Rate Limits:**
- 100 requests/minute per API key
- 30 requests/minute per IP

**Credit Cost:** 1 credit per validation

---

#### `POST /validate-email-ai`

AI-powered email validation with deep analysis, fraud detection, and recommendations.

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | Your API key |
| `Content-Type` | Yes | `application/json` |

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "email": "user@example.com",
    "valid": true,
    "score": 85,
    "disposable": false,
    "mx_found": true,
    "format_valid": true,
    "domain": "example.com",
    "risk_level": "low",
    "risk_score": 15,
    "fraud_indicators": [],
    "typo_detected": false,
    "suggested_correction": null,
    "domain_analysis": "Legitimate corporate domain",
    "recommendations": ["Safe to use for transactional emails"],
    "response_time_ms": 892,
    "ai_powered": true
  },
  "credits_used": 1,
  "remaining_credits": 98,
  "rate_limit": {
    "remaining": 58,
    "reset_at": "2025-01-01T00:01:00.000Z"
  }
}
```

**Rate Limits:**
- 60 requests/minute per API key
- 20 requests/minute per IP

**Credit Cost:** 1 credit per validation

---

#### `POST /bulk-validate-email`

Bulk email validation for processing large email lists.

**Authentication:** Session-based (requires logged-in user)

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer {session_token}` |
| `Content-Type` | Yes | `application/json` |

**Request Body (Create Job):**
```json
{
  "emails": ["email1@example.com", "email2@test.com"],
  "fileName": "my_list.csv",
  "scheduledAt": "2025-01-02T10:00:00.000Z"
}
```

**Request Body (Process Job):**
```json
{
  "jobId": "uuid-of-created-job",
  "emails": ["email1@example.com", "email2@test.com"],
  "fileName": "my_list.csv"
}
```

**Response (200 OK - Job Created):**
```json
{
  "success": true,
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_emails": 1000,
  "scheduled": false,
  "message": "Job created. Call again with jobId to process."
}
```

**Response (200 OK - Job Completed):**
```json
{
  "success": true,
  "processed": 1000,
  "valid": 850,
  "invalid": 150,
  "credits_used": 1000
}
```

**Credit Cost:** 1 credit per email validated

---

### Health & Status

#### `GET /health`

Check system health and service status. **No authentication required.**

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "services": [
    {
      "name": "database",
      "status": "healthy",
      "latency_ms": 23,
      "message": "Connected",
      "last_checked": "2025-01-01T00:00:00.000Z"
    },
    {
      "name": "stripe",
      "status": "healthy",
      "latency_ms": 156,
      "message": "Connected",
      "last_checked": "2025-01-01T00:00:00.000Z"
    }
  ],
  "summary": {
    "total": 5,
    "healthy": 5,
    "degraded": 0,
    "unhealthy": 0
  }
}
```

**Status Codes:**
- `200` - Healthy or Degraded
- `503` - Unhealthy (one or more critical services down)

---

### Billing

#### `POST /purchase-credits`

Initiate a Stripe checkout session for purchasing credits.

**Authentication:** Session-based (requires logged-in user)

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer {session_token}` |
| `Content-Type` | Yes | `application/json` |

**Request Body:**
```json
{
  "package": "starter"
}
```

**Available Packages:**
| Package | Credits | Price |
|---------|---------|-------|
| `starter` | 2,000 | $5 |
| `growth` | 20,000 | $39 |
| `scale` | 100,000 | $149 |

**Response (200 OK):**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "ok": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_API_KEY` | 401 | No API key provided |
| `INVALID_API_KEY` | 403 | API key not found or inactive |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `MISSING_EMAIL` | 400 | Email field not provided |
| `INTERNAL_ERROR` | 500 | Server error |

### Rate Limit Headers

All rate-limited endpoints return these headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
```

---

## Code Examples

### cURL

```bash
curl -X POST \
  https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/validate-email \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"email": "test@example.com"}'
```

### JavaScript

```javascript
const response = await fetch(
  'https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/validate-email',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_API_KEY',
    },
    body: JSON.stringify({ email: 'test@example.com' }),
  }
);

const result = await response.json();
console.log(result.data.valid); // true or false
```

### Python

```python
import requests

response = requests.post(
    'https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/validate-email',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY',
    },
    json={'email': 'test@example.com'}
)

result = response.json()
print(result['data']['valid'])
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

- **Documentation:** [/docs](/docs)
- **Dashboard:** [/dashboard](/dashboard)
- **Contact:** [/contact](/contact)
- **Status Page:** [/status](/status)
