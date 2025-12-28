# XPEX Neural GoldMail Go SDK

Official Go SDK for the XPEX Neural GoldMail Email Validation API.

## Installation

```bash
go get github.com/xpex-neural/goldmail-sdk-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/xpex-neural/goldmail-sdk-go"
)

func main() {
    // Create client
    client := goldmail.NewClient("your-api-key")

    // Validate email
    result, err := client.Validate(context.Background(), "test@example.com")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Valid: %v, Risk: %s\n", result.Valid, result.RiskLevel)
}
```

## AI-Powered Validation

```go
result, err := client.ValidateAI(ctx, "suspicious@temp-mail.org")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("AI Confidence: %.2f\n", result.AIAnalysis.Confidence)
fmt.Printf("Fraud Indicators: %v\n", result.AIAnalysis.FraudIndicators)
fmt.Printf("Recommendation: %s\n", result.AIAnalysis.Recommendation)
```

## Bulk Validation

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/xpex-neural/goldmail-sdk-go"
)

func main() {
    client := goldmail.NewClient("your-api-key")
    ctx := context.Background()

    // Submit bulk job
    opts := goldmail.BulkValidationOptions{
        Emails: []string{
            "user1@example.com",
            "user2@example.com",
            "invalid@fake.xyz",
        },
        WebhookURL: "https://your-webhook.com/callback",
        Priority:   "normal",
    }

    job, err := client.ValidateBulk(ctx, opts)
    if err != nil {
        panic(err)
    }

    fmt.Printf("Job ID: %s\n", job.JobID)

    // Poll for completion
    for job.Status != goldmail.JobStatusCompleted {
        time.Sleep(5 * time.Second)
        job, err = client.GetBulkJobStatus(ctx, job.JobID)
        if err != nil {
            panic(err)
        }
        fmt.Printf("Progress: %d/%d\n", job.ProcessedEmails, job.TotalEmails)
    }

    // Process results
    for _, result := range job.Results {
        fmt.Printf("%s: %v\n", result.Email, result.Valid)
    }
}
```

## Custom Configuration

```go
import "time"

options := goldmail.ClientOptions{
    BaseURL:       "https://api.xpexneural.com/v1",
    Timeout:       60 * time.Second,
    RetryAttempts: 5,
    RetryDelay:    2 * time.Second,
}

client := goldmail.NewClientWithOptions("your-api-key", options)
```

## Error Handling

```go
result, err := client.Validate(ctx, "test@example.com")
if err != nil {
    if gmErr, ok := err.(*goldmail.GoldMailError); ok {
        switch {
        case gmErr.IsAuthError():
            fmt.Println("Invalid API key")
        case gmErr.IsCreditsError():
            fmt.Println("Insufficient credits")
        case gmErr.IsRateLimitError():
            fmt.Println("Rate limited, try again later")
        default:
            fmt.Printf("Error: %s - %s\n", gmErr.Code, gmErr.Message)
        }
    } else {
        fmt.Printf("Unexpected error: %v\n", err)
    }
    return
}
```

## Context Support

All methods accept a `context.Context` for cancellation and timeouts:

```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

result, err := client.Validate(ctx, "test@example.com")
```

## API Reference

### Client Methods

| Method | Description |
|--------|-------------|
| `Validate(ctx, email)` | Standard email validation |
| `ValidateAI(ctx, email)` | AI-powered validation |
| `ValidateBulk(ctx, opts)` | Submit bulk validation job |
| `GetBulkJobStatus(ctx, jobID)` | Check bulk job status |
| `Health(ctx)` | Check API health |
| `GetCredits(ctx)` | Get credit balance |

### Types

- `ValidationResult` - Standard validation result
- `AIValidationResult` - AI-enhanced validation result
- `BulkValidationResult` - Bulk job result
- `RiskLevel` - Risk level constants
- `JobStatus` - Job status constants
- `GoldMailError` - Custom error type

## License

MIT License - see [LICENSE](LICENSE) for details.
