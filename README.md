# XPEX Neural - GoldMail Email Validation Platform

<div align="center">

![XPEX Neural](https://img.shields.io/badge/XPEX-Neural-gold?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

**Enterprise-grade email validation API with AI-powered fraud detection**

[Live Demo](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) • [API Reference](./API_REFERENCE.md) • [Contributing](./CONTRIBUTING.md)

</div>

---

## 🎯 Overview

XPEX Neural's GoldMail platform provides real-time email validation with advanced AI analysis, fraud detection, and deliverability scoring. Built for developers who need reliable, scalable email verification.

### Key Features

- **🔍 Real-time Validation** - Syntax, MX records, and deliverability checks in <200ms
- **🤖 AI-Powered Analysis** - Neural network fraud detection and risk scoring
- **📦 Bulk Processing** - Validate up to 10,000 emails per batch
- **📊 Analytics Dashboard** - Real-time usage metrics and insights
- **🔐 Enterprise Security** - TLS 1.3, RBAC, audit logging, GDPR compliant
- **💳 Flexible Pricing** - Pay-as-you-go credits with volume discounts

---

## 🚀 Quick Start

### 1. Create an Account

Sign up at the platform to get your free 10 credits:

```bash
# Navigate to /auth and create an account
# You'll receive 10 free credits to test the API
```

### 2. Generate an API Key

1. Go to Dashboard → API Keys
2. Click "Create New Key"
3. Copy your key (starts with `gm_`)

### 3. Make Your First Request

```bash
curl -X POST "https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1/validate-email" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 4. Response

```json
{
  "email": "test@example.com",
  "is_valid": true,
  "score": 85,
  "risk_level": "low",
  "mx_records": true,
  "syntax_valid": true,
  "domain_exists": true
}
```

---

## 📦 Installation

### Using the SDK (Recommended)

```bash
npm install @xpex/goldmail-sdk
```

```typescript
import { GoldMailClient } from '@xpex/goldmail-sdk';

const client = new GoldMailClient('your-api-key');

// Single validation
const result = await client.validate('user@example.com');

// Bulk validation
const results = await client.validateBulk([
  'user1@example.com',
  'user2@example.com'
]);
```

### Direct API Integration

See [API_REFERENCE.md](./API_REFERENCE.md) for complete endpoint documentation.

---

## 🏗️ Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── admin/           # Dashboard components
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Route pages
│   │   ├── products/        # Product landing pages
│   │   └── legal/           # Legal pages
│   ├── integrations/        # External integrations
│   └── lib/                 # Utilities
├── supabase/
│   └── functions/           # Edge functions (API)
├── sdk/                     # TypeScript SDK package
└── docs/                    # Documentation
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [API_REFERENCE.md](./API_REFERENCE.md) | Complete API endpoint documentation |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Developer guide and code standards |
| [SYSTEM_MANIFEST.md](./SYSTEM_MANIFEST.md) | Architecture and infrastructure details |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and release notes |

---

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm or bun

### Local Setup

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The project uses Lovable Cloud (Supabase) which auto-configures:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI |
| State Management | TanStack Query |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL with RLS |
| Payments | Stripe |
| Hosting | Lovable Cloud |

---

## 💰 Pricing

| Package | Credits | Price | Per Credit |
|---------|---------|-------|------------|
| Starter | 1,000 | $9 | $0.009 |
| Professional | 5,000 | $39 | $0.0078 |
| Business | 25,000 | $149 | $0.00596 |
| Enterprise | 100,000 | $499 | $0.00499 |

New users receive **10 free credits** on signup.

---

## 🔐 Security

- **Encryption**: TLS 1.3 for all API communications
- **Authentication**: API key + JWT-based user sessions
- **Authorization**: Row Level Security (RLS) on all tables
- **Audit**: Comprehensive logging of all API calls
- **Compliance**: GDPR tooling, SOC2 Type II in progress

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/validate-email` | POST | Single email validation |
| `/validate-email-ai` | POST | AI-powered validation |
| `/bulk-validate-email` | POST | Batch validation (up to 10k) |
| `/health` | GET | System status |
| `/purchase-credits` | POST | Buy credit packages |

See [API_REFERENCE.md](./API_REFERENCE.md) for full details.

---

## 🤝 Contributing

We welcome contributions! Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) guide for:
- Code standards and patterns
- Pull request process
- Development workflow

---

## 📄 License

Proprietary - XPEX Neural © 2025

---

## 📞 Support

- **Email**: support@xpexneural.com
- **Documentation**: [API Reference](./API_REFERENCE.md)
- **Status**: Check `/status` page for system health

---

<div align="center">

**Built with ❤️ by XPEX Neural**

</div>
