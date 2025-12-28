# XPEX Neural GoldMail Python SDK

Official Python SDK for the XPEX Neural GoldMail Email Validation API.

## Installation

```bash
pip install xpex-goldmail
```

## Quick Start

```python
from goldmail import GoldMailClient

# Initialize the client
client = GoldMailClient("your-api-key")

# Validate a single email
result = client.validate("test@example.com")
print(f"Valid: {result.valid}, Risk: {result.risk_level}")

# AI-powered validation
ai_result = client.validate_ai("suspicious@temp-mail.org")
print(f"AI Confidence: {ai_result.ai_analysis.confidence}")
print(f"Fraud Indicators: {ai_result.ai_analysis.fraud_indicators}")

# Close the client when done
client.close()
```

## Using Context Manager

```python
from goldmail import GoldMailClient

with GoldMailClient("your-api-key") as client:
    result = client.validate("user@company.com")
    print(result.valid)
```

## Async Support

```python
import asyncio
from goldmail.client import AsyncGoldMailClient

async def main():
    async with AsyncGoldMailClient("your-api-key") as client:
        result = await client.validate("test@example.com")
        print(f"Valid: {result.valid}")

asyncio.run(main())
```

## Bulk Validation

```python
from goldmail import GoldMailClient
import time

client = GoldMailClient("your-api-key")

# Submit bulk job
emails = ["user1@example.com", "user2@example.com", "invalid@fake.xyz"]
job = client.validate_bulk(emails, webhook_url="https://your-webhook.com/callback")
print(f"Job ID: {job.job_id}")

# Poll for results
while job.status.value != "completed":
    time.sleep(5)
    job = client.get_bulk_job_status(job.job_id)
    print(f"Progress: {job.processed_emails}/{job.total_emails}")

# Process results
for result in job.results:
    print(f"{result.email}: {result.valid}")
```

## Configuration

```python
from goldmail import GoldMailClient, ClientOptions

options = ClientOptions(
    base_url="https://api.xpexneural.com/v1",
    timeout=60000,  # 60 seconds
    retry_attempts=5,
    retry_delay=2000  # 2 seconds
)

client = GoldMailClient("your-api-key", options=options)
```

## Error Handling

```python
from goldmail import GoldMailClient, GoldMailError

client = GoldMailClient("your-api-key")

try:
    result = client.validate("test@example.com")
except GoldMailError as e:
    if e.is_auth_error():
        print("Invalid API key")
    elif e.is_credits_error():
        print("Insufficient credits")
    elif e.is_rate_limit_error():
        print("Rate limited, try again later")
    else:
        print(f"Error: {e.code} - {e}")
```

## API Reference

### GoldMailClient

| Method | Description |
|--------|-------------|
| `validate(email)` | Standard email validation |
| `validate_ai(email)` | AI-powered validation with fraud detection |
| `validate_bulk(emails, webhook_url?, priority?)` | Submit bulk validation job |
| `get_bulk_job_status(job_id)` | Check bulk job status |
| `health()` | Check API health |
| `get_credits()` | Get credit balance |

### Types

- `ValidationResult` - Standard validation result
- `AIValidationResult` - AI-enhanced validation result
- `BulkValidationResult` - Bulk job result
- `RiskLevel` - Enum: low, medium, high, critical
- `JobStatus` - Enum: pending, processing, completed, failed

## License

MIT License - see [LICENSE](LICENSE) for details.
