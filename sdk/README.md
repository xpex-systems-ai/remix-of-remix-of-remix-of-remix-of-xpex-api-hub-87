# @xpex/goldmail-sdk

Official TypeScript/JavaScript SDK for the XPEX Neural GoldMail Email Validation API.

## Installation

```bash
npm install @xpex/goldmail-sdk
# or
yarn add @xpex/goldmail-sdk
# or
pnpm add @xpex/goldmail-sdk
```

## CLI Tool

The SDK includes a command-line interface for email validation.

### Global Installation

```bash
npm install -g @xpex/goldmail-sdk
```

### CLI Usage

```bash
# Set your API key (or use -k flag)
export GOLDMAIL_API_KEY=your_api_key

# Validate a single email
goldmail validate user@example.com

# Validate with AI analysis
goldmail validate-ai suspicious@example.com -v

# Bulk validate emails from file
goldmail bulk emails.txt -o results.json

# Check bulk job status
goldmail job job_abc123

# Check your credit balance
goldmail credits

# Check API health
goldmail health
```

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--api-key <key>` | `-k` | API key (or set GOLDMAIL_API_KEY) |
| `--base-url <url>` | `-u` | Custom API base URL |
| `--verbose` | `-v` | Verbose output with full details |
| `--output <file>` | `-o` | Output results to file (JSON) |
| `--format <fmt>` | `-f` | Output format: json, table, csv |
| `--help` | `-h` | Show help message |
| `--version` | | Show version number |

## Quick Start

```typescript
import { GoldMailClient } from '@xpex/goldmail-sdk';

// Initialize the client with your API key
const client = new GoldMailClient('gm_your_api_key_here');

// Validate a single email
const result = await client.validate('user@example.com');
console.log(result);
// {
//   email: 'user@example.com',
//   is_valid: true,
//   score: 85,
//   risk_level: 'low',
//   mx_records: true,
//   syntax_valid: true,
//   domain_exists: true
// }
```

## Features

- 🔍 **Single Email Validation** - Validate emails in real-time
- 🤖 **AI-Powered Analysis** - Get fraud detection and risk scoring
- 📦 **Bulk Validation** - Process up to 10,000 emails at once
- 📊 **Health Monitoring** - Check API status
- 🔒 **TypeScript First** - Full type safety and IntelliSense
- 💻 **CLI Tool** - Command-line interface for scripts and automation

## API Reference

### Constructor

```typescript
const client = new GoldMailClient(apiKey: string, options?: ClientOptions);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | API default | Custom API base URL |
| `timeout` | `number` | `30000` | Request timeout in ms |

### Methods

#### `validate(email: string): Promise<ValidationResult>`

Validate a single email address.

```typescript
const result = await client.validate('test@example.com');
```

#### `validateAI(email: string): Promise<AIValidationResult>`

Validate with AI-powered analysis.

```typescript
const result = await client.validateAI('test@example.com');
```

#### `validateBulk(emails: string[], options?: BulkOptions): Promise<BulkValidationResult>`

Validate multiple emails at once.

```typescript
const result = await client.validateBulk([
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
], { batchSize: 100 });
```

#### `health(): Promise<HealthStatus>`

Check API health status.

```typescript
const status = await client.health();
console.log(status.status); // 'healthy'
```

## Types

### ValidationResult

```typescript
interface ValidationResult {
  email: string;
  is_valid: boolean;
  score: number;           // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  mx_records: boolean;
  syntax_valid: boolean;
  domain_exists: boolean;
  is_disposable?: boolean;
  is_role_based?: boolean;
  suggestion?: string;
}
```

### AIValidationResult

```typescript
interface AIValidationResult extends ValidationResult {
  ai_analysis: {
    fraud_probability: number;
    pattern_analysis: string;
    recommendations: string[];
  };
}
```

### BulkValidationResult

```typescript
interface BulkValidationResult {
  job_id: string;
  total_emails: number;
  valid_emails: number;
  invalid_emails: number;
  status: 'processing' | 'completed' | 'failed';
  results?: ValidationResult[];
}
```

## Error Handling

```typescript
import { GoldMailClient, GoldMailError } from '@xpex/goldmail-sdk';

try {
  const result = await client.validate('invalid');
} catch (error) {
  if (error instanceof GoldMailError) {
    console.error(`API Error: ${error.code} - ${error.message}`);
    // Handle specific error codes
    switch (error.code) {
      case 'INVALID_API_KEY':
        // Handle invalid key
        break;
      case 'INSUFFICIENT_CREDITS':
        // Handle no credits
        break;
      case 'RATE_LIMITED':
        // Handle rate limit
        break;
    }
  }
}
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

Integration tests require a valid API key:

```bash
GOLDMAIL_TEST_API_KEY=your_test_key npm run test:integration
```

## Examples

### Express.js Middleware

```typescript
import { GoldMailClient } from '@xpex/goldmail-sdk';
import { Request, Response, NextFunction } from 'express';

const client = new GoldMailClient(process.env.GOLDMAIL_API_KEY!);

export async function validateEmailMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email } = req.body;
  
  try {
    const result = await client.validate(email);
    
    if (!result.is_valid || result.risk_level === 'critical') {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    req.body.emailValidation = result;
    next();
  } catch (error) {
    next(error);
  }
}
```

### React Hook

```typescript
import { useState, useCallback } from 'react';
import { GoldMailClient, ValidationResult } from '@xpex/goldmail-sdk';

const client = new GoldMailClient('your-api-key');

export function useEmailValidation() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const validate = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.validate(email);
      setResult(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { validate, result, loading, error };
}
```

## License

MIT © XPEX Neural
