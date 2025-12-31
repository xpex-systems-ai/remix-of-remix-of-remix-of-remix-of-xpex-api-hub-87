# XPEX Neural Core - System Architecture

> **Enterprise API Infrastructure Platform**  
> Version: 1.0.0 | Last Updated: 2024

---

## Executive Summary

XPEX Neural Core is an enterprise-grade API infrastructure platform built around the **GoldMail Email Intelligence API**. The system provides a complete solution for API-as-a-Service with:

- Credit-based billing and monetization
- API key management and authentication
- Real-time usage analytics and monitoring
- Stripe integration for payments
- Multi-language SDK generation (TypeScript, Python, Go)
- OpenAPI 3.1.0 specification

---

## Architecture Classification

### 🟢 CORE (Immutable Infrastructure)

These components are production-ready and form the foundation of the platform:

| Component | Status | Description |
|-----------|--------|-------------|
| **Authentication System** | ✅ Live | Email/Password + Google OAuth via Supabase Auth |
| **User Profiles** | ✅ Live | `profiles` table with credits, referral codes |
| **API Key Management** | ✅ Live | `api_keys` table with status, usage tracking |
| **Credit System** | ✅ Live | `credit_transactions` table, deduction/addition functions |
| **Stripe Integration** | ✅ Live | Subscriptions, one-time purchases, customer portal |
| **GoldMail Validation API** | ✅ Live | `/validate-email`, `/validate-email-ai`, `/bulk-validate-email` |
| **Usage Analytics** | ✅ Live | `usage_logs` table with endpoint breakdown |
| **Admin Dashboard** | ✅ Live | Role-based access via `user_roles` table |
| **Referral System** | ✅ Live | `referrals` table with reward tracking |
| **Webhook System** | ✅ Live | `webhooks` + `webhook_logs` tables |
| **Notification System** | ✅ Live | In-app + email notifications |

### 🟡 SATELLITE (Supporting Systems)

Components that support core functionality:

| Component | Status | Description |
|-----------|--------|-------------|
| **OpenAPI Specification** | ✅ Active | `public/openapi.json` - canonical API spec |
| **TypeScript SDK** | ✅ Active | `sdk/` - npm-ready package |
| **Python SDK** | ✅ Active | `sdk-python/` - pip-ready package |
| **Go SDK** | ✅ Active | `sdk-go/` - go modules ready |
| **API Documentation** | ✅ Active | `API_REFERENCE.md` |
| **Status Page** | ✅ Active | `/status` route |
| **Storybook Design System** | ✅ Active | Component library documentation |

### 🔴 FUTURE (Roadmap Products)

Products marked as "Coming Soon" - no backend implementation:

| Product | Status | Description |
|---------|--------|-------------|
| **BreachScan** | ⏳ Planned | Data breach detection API |
| **IPInsight** | ⏳ Planned | IP intelligence and geolocation |
| **LinkMagic** | ⏳ Planned | URL health monitoring |
| **CopyVoraz** | ⏳ Planned | AI viral copy generator |
| **ExtrairProdutos** | ⏳ Planned | Marketplace data scraper |
| **GoldMail Extension** | ⏳ Planned | Browser extension |
| **GoldMail Agent** | ⏳ Planned | Autonomous email agent |

---

## Database Schema

### Core Tables (21 Total)

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION                              │
├─────────────────────────────────────────────────────────────────┤
│  profiles              │ User profiles with credits, tier       │
│  user_roles            │ Role assignments (admin, moderator)    │
│  user_achievements     │ Gamification badges                    │
│  achievements          │ Achievement definitions                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      API MANAGEMENT                              │
├─────────────────────────────────────────────────────────────────┤
│  api_keys              │ API key storage with status            │
│  usage_logs            │ Per-call usage tracking                │
│  alert_thresholds      │ Usage alert configurations             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      BILLING & CREDITS                           │
├─────────────────────────────────────────────────────────────────┤
│  credit_transactions   │ Credit ledger                          │
│  subscriptions         │ Stripe subscription sync               │
│  auto_recharge_settings│ Auto top-up configuration             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      VALIDATION JOBS                             │
├─────────────────────────────────────────────────────────────────┤
│  bulk_validation_jobs  │ Async bulk validation tracking         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      WEBHOOKS & NOTIFICATIONS                    │
├─────────────────────────────────────────────────────────────────┤
│  webhooks              │ Webhook endpoint configurations        │
│  webhook_logs          │ Delivery attempt logging               │
│  notifications         │ In-app notifications                   │
│  notification_preferences │ User notification settings          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      REFERRALS                                   │
├─────────────────────────────────────────────────────────────────┤
│  referrals             │ Referral tracking and rewards          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      SYSTEM                                      │
├─────────────────────────────────────────────────────────────────┤
│  system_incidents      │ Status page incidents                  │
│  configuration_backups │ Settings backup/restore                │
│  email_templates       │ Custom email templates                 │
│  audit_logs            │ Security audit trail                   │
│  newsletter_subscribers│ Marketing list                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Architecture

### Live Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│  BASE URL: https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1 │
└─────────────────────────────────────────────────────────────────┘

POST /validate-email
├── Authentication: X-API-Key header
├── Cost: 1 credit
├── Input: { email: string }
└── Output: ValidationResult (is_valid, domain, mx_records, disposable, score)

POST /validate-email-ai
├── Authentication: X-API-Key header
├── Cost: 1 credit
├── Input: { email: string }
└── Output: AIValidationResult (confidence_score, risk_level, insights)

POST /bulk-validate-email
├── Authentication: Bearer token
├── Cost: Dynamic (1 credit per email)
├── Input: { emails: string[], callback_url?: string }
└── Output: { job_id: string, status: string }

GET /health
├── Authentication: None
└── Output: { status: "healthy", timestamp: string }
```

### Edge Functions (27 Total)

**Validation:**
- `validate-email` - Standard validation
- `validate-email-ai` - AI-enhanced validation
- `bulk-validate-email` - Bulk async processing
- `process-scheduled-validations` - Scheduled job processor

**Billing:**
- `create-checkout` - Stripe checkout session
- `customer-portal` - Stripe portal redirect
- `stripe-webhook` - Stripe event handler
- `purchase-credits` - Credit package purchase
- `auto-recharge` - Automatic top-up
- `get-invoices` - Invoice history

**System:**
- `health` - Health check endpoint
- `rate-limit` - Rate limiting service
- `check-subscription` - Subscription validator
- `ai-insights` - AI analytics
- `api-assistant` - Chat assistant
- `send-webhook` - Webhook dispatcher
- `verify-webhook` - Webhook verification

**Alerts:**
- `check-metrics-alerts` - Metrics monitoring
- `check-usage-alerts` - Usage threshold alerts
- `send-credit-alert` - Low credit notifications
- `send-conversion-alert` - Conversion notifications

**Configuration:**
- `backup-configurations` - Settings backup
- `restore-configurations` - Settings restore

**Communication:**
- `send-contact-email` - Contact form handler
- `newsletter-subscribe` - Newsletter signup
- `send-retention-webhook` - Retention events
- `weekly-webhook-report` - Weekly reports

---

## Frontend Routes

### Public Routes
```
/                    → Landing page (Index.tsx)
/auth               → Authentication (Auth.tsx)
/pricing            → Pricing plans (Pricing.tsx)
/docs               → API documentation (Docs.tsx)
/status             → System status (Status.tsx)
/marketplace        → API catalog (Marketplace.tsx)
/about              → About page
/contact            → Contact form
/blog               → Blog (placeholder)
```

### Product Routes (CORE - Live)
```
/products/goldmail-validation  → GoldMail Validator
/products/goldmail-api         → GoldMail API
/products/goldmail-saas        → GoldMail SaaS
```

### Product Routes (FUTURE - Coming Soon)
```
/products/breach-scan          → BreachScan (locked)
/products/ip-insight           → IPInsight (locked)
/products/link-magic           → LinkMagic (locked)
/products/copy-voraz           → CopyVoraz (locked)
/products/extrair-produtos     → ExtrairProdutos (locked)
```

### Protected Routes
```
/dashboard          → User dashboard (requires auth)
/admin              → Admin panel (requires admin role)
/credits            → Credit management
```

### Legal Routes
```
/privacy            → Privacy policy
/terms              → Terms of service
/sla                → Service Level Agreement
```

---

## Security Model

### Authentication
- Supabase Auth with email/password
- Google OAuth integration
- Session management with JWT

### Authorization
- Row Level Security (RLS) on all tables
- Role-based access (admin, moderator, user)
- API key validation per request

### Rate Limiting
- Per-IP rate limiting (100 req/15min)
- Per-API-key rate limiting (1000 req/15min)
- Burst protection

---

## Billing Model

### Credit System
| Package | Credits | Price |
|---------|---------|-------|
| Starter | 1,000 | $9 |
| Growth | 5,000 | $39 |
| Scale | 25,000 | $149 |

### Subscriptions
- **Free**: 50 credits/month, 1 API key
- **Pro**: 5,000 credits/month, 10 API keys, priority support
- **Enterprise**: Unlimited credits, unlimited keys, SLA, dedicated support

---

## SDK Distribution

| Language | Package Manager | Status |
|----------|-----------------|--------|
| TypeScript | npm | ✅ Ready |
| Python | pip | ✅ Ready |
| Go | go modules | ✅ Ready |

---

## Recommendations for Stability

1. **Database Indexes**: Add indexes on `usage_logs.created_at` and `api_keys.key` for query performance
2. **Connection Pooling**: Consider Supabase pooler for high-traffic scenarios
3. **Edge Function Caching**: Implement response caching for repeated validation requests
4. **Monitoring**: Add structured logging with correlation IDs across all edge functions
5. **Backup Strategy**: Automated daily backups with point-in-time recovery
6. **Rate Limit Persistence**: Move rate limit state from in-memory to Redis/Upstash

---

## Version Control

- **Repository**: Managed by Lovable
- **Deployments**: Automatic on push
- **Edge Functions**: Auto-deployed on file changes
- **Database Migrations**: Managed via Supabase migrations

---

*This document is the canonical reference for XPEX Neural Core architecture.*
