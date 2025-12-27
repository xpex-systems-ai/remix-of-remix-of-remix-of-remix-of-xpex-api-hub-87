# Contributing to XPEX Neural

Welcome! This guide will help you get started contributing to the XPEX Neural platform.

## Table of Contents

- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Project Overview

XPEX Neural is an enterprise-grade email validation and API intelligence platform. See [SYSTEM_MANIFEST.md](./SYSTEM_MANIFEST.md) for the complete architecture specification.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, shadcn/ui |
| State | React Query, Context API |
| Backend | Supabase (PostgreSQL, Edge Functions) |
| Auth | Supabase Auth |
| Billing | Stripe |
| AI | Lovable AI Gateway |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Supabase CLI (optional, for local development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd xpex-neural

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The project uses Lovable Cloud, which automatically provisions:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**Do not edit `.env` directly** - it's auto-generated.

For edge function secrets (Stripe, Resend, etc.), these are configured in the Lovable Cloud dashboard.

---

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   └── admin/           # Dashboard components
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Route pages
│   │   ├── products/        # Product pages
│   │   └── legal/           # Legal pages
│   ├── contexts/            # React contexts
│   ├── lib/                 # Utility functions
│   └── integrations/        # Supabase client (auto-generated)
├── supabase/
│   ├── functions/           # Edge functions
│   └── config.toml          # Supabase configuration
├── public/                  # Static assets
├── SYSTEM_MANIFEST.md       # Architecture specification
├── API_REFERENCE.md         # API documentation
└── CONTRIBUTING.md          # This file
```

---

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code improvements

### Commit Messages

Use conventional commits:

```
feat: add bulk validation scheduling
fix: correct rate limit calculation
docs: update API reference
refactor: extract validation logic to hook
```

### Pull Requests

1. Create a feature branch
2. Make changes with clear commits
3. Test locally
4. Open PR with description of changes
5. Wait for review

---

## Code Standards

### TypeScript

- Use strict mode
- Define explicit types (avoid `any`)
- Use interfaces for objects

```typescript
// ✅ Good
interface ValidationResult {
  email: string;
  valid: boolean;
  score: number;
}

// ❌ Bad
const result: any = validate(email);
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Extract logic to custom hooks

```typescript
// ✅ Good - focused component
const CreditBalance = () => {
  const { credits } = useCredits();
  return <span>{credits} credits</span>;
};

// ❌ Bad - component doing too much
const Dashboard = () => {
  // 500 lines of mixed concerns
};
```

### Styling

- Use Tailwind semantic tokens from `index.css`
- Never use direct colors (`text-white`, `bg-black`)
- All colors must be HSL-based design tokens

```typescript
// ✅ Good
<div className="bg-background text-foreground" />

// ❌ Bad
<div className="bg-white text-black" />
```

### Edge Functions

- Always include CORS headers
- Use comprehensive logging
- Handle all error cases
- Validate inputs before processing

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

console.log('[FUNCTION-NAME] Step description', { details });
```

---

## Testing

### Manual Testing

1. Test all user flows in the preview
2. Check console for errors
3. Verify network requests succeed
4. Test on mobile viewport

### API Testing

Use the API Playground in `/docs` or cURL:

```bash
curl -X POST \
  https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/validate-email \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"email": "test@example.com"}'
```

### Edge Function Logs

Check edge function logs in Lovable Cloud for debugging.

---

## Deployment

### Automatic Deployment

Lovable handles deployment automatically:
- Code changes trigger preview builds
- Edge functions deploy on save
- Database migrations require approval

### Production Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] No console errors
- [ ] API endpoints respond correctly
- [ ] Rate limiting works
- [ ] Credits deduct properly
- [ ] Webhooks fire correctly
- [ ] Mobile responsive

---

## Key Patterns

### Credit Deduction

Always use the atomic `deduct_credits` RPC:

```typescript
const { data: newCredits } = await supabase.rpc('deduct_credits', {
  p_user_id: userId,
  p_amount: 1,
});
```

### API Key Validation

```typescript
const keyValidation = await validateApiKey(apiKey);
if (!keyValidation.valid) {
  return new Response(JSON.stringify({
    ok: false,
    error: 'Invalid API key',
    code: 'INVALID_API_KEY',
  }), { status: 403 });
}
```

### Rate Limiting

```typescript
const rateLimit = checkRateLimit(`key:${apiKey}`, RATE_LIMITS.perApiKey);
if (!rateLimit.allowed) {
  return new Response(JSON.stringify({
    ok: false,
    error: 'Rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
  }), { status: 429 });
}
```

---

## Resources

- [SYSTEM_MANIFEST.md](./SYSTEM_MANIFEST.md) - Architecture specification
- [API_REFERENCE.md](./API_REFERENCE.md) - API documentation
- [/docs](/docs) - Interactive API documentation
- [/status](/status) - System status page

---

## Questions?

Open an issue or contact the team via [/contact](/contact).
