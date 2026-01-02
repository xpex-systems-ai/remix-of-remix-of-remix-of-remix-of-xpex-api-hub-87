# XPEX Stripe Billing Flow

## Overview

XPEX Neural Core uses Stripe for all payment processing, including one-time credit purchases and subscription management.

---

## Billing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BILLING FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   User       │────1───▶│  Frontend    │                      │
│  │   Action     │         │  (React)     │                      │
│  └──────────────┘         └──────────────┘                      │
│                                  │                               │
│                                  2                               │
│                                  ▼                               │
│                          ┌──────────────┐                       │
│                          │  Edge        │                       │
│                          │  Function    │                       │
│                          └──────────────┘                       │
│                                  │                               │
│                                  3                               │
│                                  ▼                               │
│                          ┌──────────────┐                       │
│                          │   Stripe     │                       │
│                          │   Checkout   │                       │
│                          └──────────────┘                       │
│                                  │                               │
│                                  4                               │
│                                  ▼                               │
│                          ┌──────────────┐                       │
│                          │   Webhook    │                       │
│                          │   Handler    │                       │
│                          └──────────────┘                       │
│                                  │                               │
│                                  5                               │
│                                  ▼                               │
│                          ┌──────────────┐                       │
│                          │   Credits    │                       │
│                          │   Added      │                       │
│                          └──────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Credit Packages

| Package | Stripe Price ID | Credits | Price (USD) |
|---------|-----------------|---------|-------------|
| Starter | `price_1Sdj4zHDcsx7lyoo2Lgoo2pI` | 2,000 | $5 |
| Growth | `price_1Sdj6HHDcsx7lyoo3UlicrrD` | 20,000 | $39 |
| Scale | `price_1Sdj7IHDcsx7lyoo1ZqzErlX` | 100,000 | $149 |

---

## Subscription Tiers

| Tier | Price | Monthly Credits | Rate Limit |
|------|-------|-----------------|------------|
| Free | $0/mo | 10 | 5 req/sec |
| Pro | $29/mo | 20,000 | 10 req/sec |
| Enterprise | $199/mo | Unlimited | 500 req/sec |

---

## Edge Functions

### 1. purchase-credits

Creates a Stripe Checkout session for credit package purchase.

**File:** `supabase/functions/purchase-credits/index.ts`

**Flow:**
1. Authenticate user via JWT
2. Validate credit package selection
3. Look up or create Stripe customer
4. Create Checkout session with package metadata
5. Return checkout URL

**Request:**
```json
{
  "package": "growth"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_xxx"
}
```

### 2. create-checkout

Creates Checkout session for subscriptions.

**File:** `supabase/functions/create-checkout/index.ts`

### 3. stripe-webhook

Handles Stripe webhook events.

**File:** `supabase/functions/stripe-webhook/index.ts`

**Handled Events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Add credits based on metadata |
| `customer.subscription.created` | Update subscription tier |
| `customer.subscription.updated` | Update tier/status |
| `customer.subscription.deleted` | Downgrade to free tier |
| `invoice.paid` | Record transaction |

### 4. customer-portal

Opens Stripe Customer Portal for subscription management.

**File:** `supabase/functions/customer-portal/index.ts`

---

## Webhook Processing

### Signature Verification

All webhooks are verified using HMAC-SHA256 signature.

```typescript
const signature = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  Deno.env.get('STRIPE_WEBHOOK_SECRET')
);
```

### Credit Allocation

On `checkout.session.completed`:

```typescript
// Extract metadata from session
const { user_id, credits } = session.metadata;

// Add credits to user profile
await supabase.rpc('add_credits', {
  p_user_id: user_id,
  p_amount: parseInt(credits)
});

// Log transaction
await supabase.from('credit_transactions').insert({
  user_id,
  amount: parseInt(credits),
  type: 'purchase',
  description: `Purchased ${credits} credits`,
  balance_after: newBalance
});
```

---

## Auto-Recharge

Users can configure automatic credit recharge when balance falls below threshold.

### Configuration

```typescript
interface AutoRechargeSettings {
  enabled: boolean;
  threshold_credits: number;  // Trigger when credits fall below
  recharge_amount: number;    // Credits to add
  recharge_package: string;   // Package to purchase
  stripe_payment_method_id: string;
}
```

### Flow

1. Credit deduction triggers threshold check
2. If below threshold and auto-recharge enabled
3. Create Stripe PaymentIntent with saved payment method
4. On success, add credits and notify user

---

## Database Tables

### profiles

```sql
profiles (
  id UUID PRIMARY KEY,
  user_id UUID,
  credits INTEGER DEFAULT 10,
  subscription_tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT
)
```

### credit_transactions

```sql
credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  amount INTEGER,
  type TEXT,  -- 'purchase', 'usage', 'signup_bonus', 'refund'
  description TEXT,
  balance_after INTEGER,
  created_at TIMESTAMPTZ
)
```

### subscriptions

```sql
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  stripe_subscription_id TEXT,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
)
```

### auto_recharge_settings

```sql
auto_recharge_settings (
  id UUID PRIMARY KEY,
  user_id UUID,
  enabled BOOLEAN DEFAULT false,
  threshold_credits INTEGER DEFAULT 100,
  recharge_amount INTEGER DEFAULT 1000,
  recharge_package TEXT DEFAULT 'starter',
  stripe_payment_method_id TEXT
)
```

---

## Testing

### Test Mode

Use Stripe test mode keys for development:
- Test API Key: `sk_test_xxx`
- Test cards: `4242424242424242`

### Webhook Testing

Use Stripe CLI to forward webhooks locally:

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

---

## Security

### Secrets Management

| Secret | Location | Purpose |
|--------|----------|---------|
| `STRIPE_SECRET_KEY` | Supabase Secrets | API authentication |
| `STRIPE_WEBHOOK_SECRET` | Supabase Secrets | Webhook verification |

### Best Practices

1. **Never expose secret key** in frontend code
2. **Always verify webhook signatures** before processing
3. **Use idempotency keys** for payment operations
4. **Log all transactions** for audit trail
5. **Implement retry logic** for webhook failures

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `invalid_api_key` | Wrong Stripe key | Check STRIPE_SECRET_KEY |
| `webhook_signature_verification_failed` | Wrong webhook secret | Check STRIPE_WEBHOOK_SECRET |
| `card_declined` | Payment failed | User should try different card |
| `insufficient_funds` | Card has no funds | User should add funds |

### Retry Logic

Stripe automatically retries failed webhooks with exponential backoff:
- Retry 1: 5 minutes
- Retry 2: 30 minutes
- Retry 3: 2 hours
- Retry 4: 8 hours
- Retry 5: 24 hours

---

## Monitoring

### Key Metrics

- Checkout conversion rate
- Credit purchase volume
- Subscription churn rate
- Failed payment rate
- Webhook delivery success

### Alerts

- Payment failures > 5% trigger alert
- Webhook failures trigger notification
- Credit depletion notifies user

---

## Support

For billing issues, contact:
- **User Support**: support@xpex.io
- **Stripe Dashboard**: https://dashboard.stripe.com
