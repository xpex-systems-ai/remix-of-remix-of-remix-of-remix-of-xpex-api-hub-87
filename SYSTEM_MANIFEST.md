# XPEX Neural Platform - System Manifest

> **Version:** 2.0.0  
> **Codename:** GoldMail Platform  
> **Classification:** Enterprise-Ready  
> **Last Updated:** 2025-01-27

## Overview

Email Intelligence & API Platform with real-time validation, billing, credits, and analytics.

**Core Principle:** No mocks. No fake data. Everything measurable, enforceable, auditable.

---

## Architecture

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Bundler | Vite |
| Language | TypeScript |
| UI | TailwindCSS |
| State Management | React Query + Context |
| Auth Handling | Supabase Session |

### Backend
| Component | Technology |
|-----------|------------|
| Provider | Supabase |
| Database | PostgreSQL |
| Auth | Supabase Auth |
| Edge Functions | Supabase Edge Functions |
| Billing | Stripe |
| Realtime | Supabase Realtime |

---

## Security

### Authentication
- **User Auth:** Email/Password
- **API Auth:** x-api-key header

### Authorization
- **RLS:** Enabled on all user tables
- **Roles:** user, admin, moderator

### Rate Limiting
- **Per API Key:** 60 requests/min
- **Per IP:** 20 requests/min
- **Enforcement:** Edge Function

### Audit Logging
- All sensitive actions logged to `audit_logs` table

---

## Products

| Product | Type | Status | Backend |
|---------|------|--------|---------|
| GoldMail Validation | Core API | ✅ Live | Real |
| GoldMail API | Documentation | ✅ Live | Uses Core |
| GoldMail SaaS | Dashboard | ✅ Clarified | Dashboard + API = SaaS |
| BreachScan | Security API | 🔜 Coming Soon | Mock Removed |
| IP Insight | Security API | 📋 Planned | - |
| LinkMagic | Utility API | 📋 Planned | - |

### GoldMail Validation Features
- Syntax check
- Domain check
- Disposable detection
- Role account detection
- AI score

---

## Frontend Routes

| Route | Page | Protected | Notes |
|-------|------|-----------|-------|
| `/` | Home | No | Live validator (requires auth, consumes credits) |
| `/auth` | Authentication | No | Login/Signup |
| `/dashboard` | Dashboard | Yes | Main user interface |
| `/docs` | API Docs | No | Real API playground (credits enforced) |
| `/pricing` | Pricing | No | Credit packages |
| `/marketplace` | Marketplace | No | Product catalog |

---

## Dashboard Modules

### API Keys
- CRUD operations
- Usage tracking
- Key masking

### Credits
- Balance display
- Transaction history
- Auto-recharge settings

### Usage Analytics
- Request logs
- Charts & visualizations
- Latency metrics

### Bulk Validation
- File upload
- Job queue system
- Progress tracking

### Webhooks
- Events: `validation.completed`, `credits.low`
- Retry logic with exponential backoff

---

## Billing

| Setting | Value |
|---------|-------|
| Provider | Stripe |
| Credit Unit | 1 validation |
| Cost Per Unit | 1 credit |
| Signup Bonus | 10 credits |
| Transaction Type | `signup_bonus` |

---

## Edge Functions

| Function | Auth | Credits | Notes |
|----------|------|---------|-------|
| `validate-email-ai` | API Key | ✅ | Core validation |
| `bulk-validate-email` | API Key | ✅ | Batch processing |
| `purchase-credits` | Session | - | Stripe integration |
| `stripe-webhook` | Signature | - | Payment events |
| `health` | Public | - | Status check |

---

## Data Integrity Rules

- ❌ No hardcoded stats
- ❌ No fake API responses
- ✅ Neutral display fallback (show "—" when no data)

---

## Enterprise Flags

| Flag | Status |
|------|--------|
| Production Ready | ✅ |
| Investor Safe | ✅ |
| Audit Safe | ✅ |
| Scalable | ✅ |

---

## Next Phase Roadmap

1. **Design System:** Figma integration
2. **UI Polish:** Galileo AI
3. **SDK Creation:** npm package
4. **Rate Limit Upgrade:** Redis-based

---

## Manifest JSON

```json
{
  "manifest_version": "2.0.0",
  "system": {
    "name": "XPEX Neural",
    "codename": "GoldMail Platform",
    "environment": "production",
    "classification": "enterprise-ready",
    "description": "Email Intelligence & API Platform with real-time validation, billing, credits, and analytics.",
    "core_principle": "No mocks. No fake data. Everything measurable, enforceable, auditable."
  },
  "architecture": {
    "frontend": {
      "framework": "React 18",
      "bundler": "Vite",
      "language": "TypeScript",
      "ui": "TailwindCSS",
      "state_management": "React Query + Context",
      "auth_handling": "Supabase Session"
    },
    "backend": {
      "provider": "Supabase",
      "database": "PostgreSQL",
      "auth": "Supabase Auth",
      "edge_functions": "Supabase Edge Functions",
      "billing": "Stripe",
      "realtime": "Supabase Realtime"
    }
  },
  "security": {
    "authentication": {
      "user_auth": "email_password",
      "api_auth": "x-api-key"
    },
    "authorization": {
      "rls": true,
      "roles": ["user", "admin", "moderator"]
    },
    "rate_limiting": {
      "per_api_key": "60 requests/min",
      "per_ip": "20 requests/min",
      "enforcement": "edge_function"
    },
    "audit_logging": true
  },
  "products": {
    "goldmail_validation": {
      "type": "core_api",
      "status": "live",
      "real_backend": true,
      "credits_required": 1,
      "edge_function": "validate-email-ai",
      "features": [
        "syntax_check",
        "domain_check",
        "disposable_detection",
        "role_account_detection",
        "ai_score"
      ]
    },
    "goldmail_api": {
      "type": "documentation",
      "status": "live",
      "uses_core_backend": true
    },
    "goldmail_saas": {
      "type": "dashboard",
      "status": "clarified",
      "definition": "Dashboard + API = SaaS"
    },
    "breach_scan": {
      "type": "security_api",
      "status": "coming_soon",
      "mock_removed": true
    },
    "ip_insight": {
      "type": "security_api",
      "status": "planned"
    },
    "link_magic": {
      "type": "utility_api",
      "status": "planned"
    }
  },
  "frontend_routes": {
    "/": {
      "page": "Home",
      "live_validator": {
        "mode": "real_api",
        "requires_auth": true,
        "consumes_credits": true
      }
    },
    "/auth": { "page": "Authentication" },
    "/dashboard": { "page": "Dashboard", "protected": true },
    "/docs": {
      "page": "API Docs",
      "playground": {
        "mode": "real_api",
        "credits_enforced": true,
        "no_simulation": true
      }
    },
    "/pricing": { "page": "Pricing" },
    "/marketplace": { "page": "Marketplace" }
  },
  "dashboard_modules": {
    "api_keys": {
      "crud": true,
      "usage_tracking": true,
      "masking": true
    },
    "credits": {
      "balance": true,
      "history": true,
      "auto_recharge": true
    },
    "usage_analytics": {
      "logs": true,
      "charts": true,
      "latency_metrics": true
    },
    "bulk_validation": {
      "enabled": true,
      "job_queue": true
    },
    "webhooks": {
      "events": ["validation.completed", "credits.low"],
      "retry_logic": true
    }
  },
  "billing": {
    "provider": "Stripe",
    "credit_model": {
      "unit": "validation",
      "cost_per_unit": 1
    },
    "signup_bonus": {
      "enabled": true,
      "credits": 10,
      "transaction_type": "signup_bonus"
    }
  },
  "edge_functions": [
    {
      "name": "validate-email-ai",
      "auth": "api_key",
      "credits_enforced": true
    },
    {
      "name": "bulk-validate-email",
      "auth": "api_key",
      "credits_enforced": true
    },
    {
      "name": "purchase-credits",
      "auth": "session",
      "billing": "stripe"
    },
    {
      "name": "stripe-webhook",
      "auth": "signature"
    },
    {
      "name": "health",
      "public": true
    }
  ],
  "data_integrity": {
    "no_hardcoded_stats": true,
    "no_fake_responses": true,
    "fallback_policy": "neutral_display"
  },
  "enterprise_flags": {
    "production_ready": true,
    "investor_safe": true,
    "audit_safe": true,
    "scalable": true
  },
  "next_phase": {
    "design_system": "figma",
    "ui_polish": "galileo",
    "sdk_creation": "npm",
    "rate_limit_upgrade": "redis"
  }
}
```
