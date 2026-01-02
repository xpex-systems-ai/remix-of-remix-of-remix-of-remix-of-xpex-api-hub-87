# XPEX Neural Core - Architecture Overview

## System Architecture

The XPEX Neural Core is designed as a modular, scalable API marketplace with the following core components:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           XPEX NEURAL CORE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      FRONTEND (React + Vite)                        │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │     │
│  │  │  Dashboard   │  │   Pricing    │  │   API Docs   │             │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │     │
│  │  │  Agent       │  │   Billing    │  │   Usage      │             │     │
│  │  │  Consumer    │  │   Center     │  │   Analytics  │             │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    API GATEWAY (Edge Functions)                      │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │     │
│  │  │   Auth &     │  │  Rate        │  │   Credit     │             │     │
│  │  │   API Keys   │  │  Limiting    │  │   Deduction  │             │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      AGENT API SERVICES                             │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │     │
│  │  │  agent-      │  │  agent-      │  │  agent-      │             │     │
│  │  │  validate    │  │  validate-ai │  │  health      │             │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      DATA LAYER (Supabase)                          │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │     │
│  │  │  PostgreSQL  │  │  Auth        │  │  Realtime    │             │     │
│  │  │  + RLS       │  │  (Supabase)  │  │  Subscriptions│            │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      BILLING ENGINE (Stripe)                        │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │     │
│  │  │  Checkout    │  │  Webhooks    │  │  Customer    │             │     │
│  │  │  Sessions    │  │  Handler     │  │  Portal      │             │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Frontend Application

**Technology Stack:**
- React 18 with TypeScript
- Vite for bundling
- TailwindCSS + shadcn/ui for styling
- React Query for data fetching
- React Router for navigation

**Key Features:**
- Responsive dashboard with real-time metrics
- Agent Consumer Dashboard for API management
- Credit balance and billing management
- API playground for testing

### 2. API Gateway

**Edge Functions (Deno Runtime):**
- `agent-validate` - Standard email validation
- `agent-validate-ai` - AI-powered validation
- `agent-health` - Service health monitoring

**Gateway Features:**
- API key authentication via `x-api-key` header
- Tiered rate limiting (5/10/50/500 req/sec by tier)
- Credit deduction before execution
- Standardized JSON response schema

### 3. Credit Engine

**Tables:**
- `profiles` - User credits and subscription tier
- `credit_transactions` - Credit usage history
- `usage_logs` - API call logging

**Functions:**
- `deduct_credits(user_id, amount)` - Atomic credit deduction
- `add_credits(user_id, amount)` - Credit addition

### 4. Billing Engine (Stripe)

**Integrations:**
- Checkout Sessions for credit purchases
- Webhooks for payment confirmation
- Customer Portal for subscription management
- Auto-recharge for low credit alerts

**Credit Packages:**
| Package | Credits | Price |
|---------|---------|-------|
| Starter | 2,000 | $5 |
| Growth | 20,000 | $39 |
| Scale | 100,000 | $149 |

---

## Database Schema

### Core Tables

```sql
-- User profiles with credit balance
profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  email TEXT,
  credits INTEGER DEFAULT 10,
  subscription_tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT
)

-- API keys for authentication
api_keys (
  id UUID PRIMARY KEY,
  user_id UUID,
  key TEXT UNIQUE,
  name TEXT,
  status TEXT DEFAULT 'active',
  is_sandbox BOOLEAN DEFAULT false,
  calls_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ
)

-- API usage logging
usage_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  api_key_id UUID,
  endpoint TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ
)

-- Credit transaction history
credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  amount INTEGER,
  type TEXT,
  description TEXT,
  balance_after INTEGER,
  created_at TIMESTAMPTZ
)
```

---

## Security Architecture

### Authentication Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │──1──▶│  Edge    │──2──▶│  API Key │──3──▶│  Credits │
│          │      │  Function│      │  Validate│      │  Check   │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
     │                                                      │
     │                                                      ▼
     │                                               ┌──────────┐
     │◀──────────────────────────────────────────────│  Process │
     │                   Response                     │  Request │
     │                                               └──────────┘
```

### RLS Policies

All tables are protected with Row-Level Security:
- Users can only access their own data
- API keys are validated against user ownership
- Service role used for system operations

### API Key Security

- Keys prefixed with `gm_` for identification
- 64-character hex string (256-bit entropy)
- Automatic expiration support
- Key rotation with 90-day default

---

## Rate Limiting

| Tier | Requests/Second | Daily Limit |
|------|-----------------|-------------|
| Free | 5 | 500 |
| Starter | 10 | 5,000 |
| Growth | 50 | 50,000 |
| Enterprise | 500 | Unlimited |

Implementation uses sliding window algorithm with IP and API key tracking.

---

## Deployment

### Infrastructure

- **Frontend**: Lovable/Vercel hosting
- **Backend**: Supabase Edge Functions
- **Database**: Supabase PostgreSQL
- **Payments**: Stripe

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY

# Stripe (Edge Functions)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

---

## Monitoring & Observability

### Health Checks

The `/agent-health` endpoint monitors:
- Database connectivity
- MX resolver status
- AI service availability
- Edge runtime health

### Logging

- Edge function console logs
- Usage logs in database
- Webhook event logging
- Audit trail for security events

---

## Future Considerations

### Scalability
- Horizontal scaling via edge function replicas
- Database connection pooling
- CDN for static assets

### Features (Post-Core)
- Additional Agent APIs
- Custom AI models
- Multi-tenant white-label
- On-premise deployment option
