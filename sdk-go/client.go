package goldmail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client is the GoldMail API client
type Client struct {
	apiKey  string
	options ClientOptions
	http    *http.Client
}

// NewClient creates a new GoldMail client with default options
func NewClient(apiKey string) *Client {
	return NewClientWithOptions(apiKey, DefaultOptions())
}

// NewClientWithOptions creates a new GoldMail client with custom options
func NewClientWithOptions(apiKey string, options ClientOptions) *Client {
	return &Client{
		apiKey:  apiKey,
		options: options,
		http: &http.Client{
			Timeout: options.Timeout,
		},
	}
}

// doRequest performs an HTTP request with retry logic
func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	var lastErr error

	for attempt := 0; attempt < c.options.RetryAttempts; attempt++ {
		var reqBody io.Reader
		if body != nil {
			jsonBody, err := json.Marshal(body)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal request body: %w", err)
			}
			reqBody = bytes.NewReader(jsonBody)
		}

		url := c.options.BaseURL + path
		req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Authorization", "Bearer "+c.apiKey)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-SDK-Version", "go-"+Version)

		resp, err := c.http.Do(req)
		if err != nil {
			if ctx.Err() == context.DeadlineExceeded {
				lastErr = TimeoutError()
			} else {
				lastErr = NetworkError(err.Error())
			}

			if attempt < c.options.RetryAttempts-1 {
				time.Sleep(c.options.RetryDelay * time.Duration(attempt+1))
				continue
			}
			return nil, lastErr
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %w", err)
		}

		if resp.StatusCode >= 400 {
			var apiErr APIErrorResponse
			if err := json.Unmarshal(respBody, &apiErr); err != nil {
				return nil, &GoldMailError{
					Code:    ErrorCodeServerError,
					Message: string(respBody),
					Status:  resp.StatusCode,
				}
			}

			gmErr := ErrorFromResponse(apiErr, resp.StatusCode)

			if !gmErr.IsRetryable() || attempt == c.options.RetryAttempts-1 {
				return nil, gmErr
			}

			lastErr = gmErr
			time.Sleep(c.options.RetryDelay * time.Duration(attempt+1))
			continue
		}

		return respBody, nil
	}

	if lastErr != nil {
		return nil, lastErr
	}
	return nil, NewError(ErrorCodeServerError, "Unknown error")
}

// Validate validates a single email address
func (c *Client) Validate(ctx context.Context, email string) (*ValidationResult, error) {
	body := map[string]string{"email": email}
	respBody, err := c.doRequest(ctx, "POST", "/validate-email", body)
	if err != nil {
		return nil, err
	}

	var result ValidationResult
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Set defaults if not present
	if result.RiskLevel == "" {
		result.RiskLevel = RiskLevelMedium
	}
	if result.Domain == "" && strings.Contains(email, "@") {
		parts := strings.Split(email, "@")
		result.Domain = parts[len(parts)-1]
		result.LocalPart = parts[0]
	}

	return &result, nil
}

// ValidateAI validates an email with AI-powered analysis
func (c *Client) ValidateAI(ctx context.Context, email string) (*AIValidationResult, error) {
	body := map[string]string{"email": email}
	respBody, err := c.doRequest(ctx, "POST", "/validate-email-ai", body)
	if err != nil {
		return nil, err
	}

	var result AIValidationResult
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if result.RiskLevel == "" {
		result.RiskLevel = RiskLevelMedium
	}

	return &result, nil
}

// ValidateBulk submits a bulk email validation job
func (c *Client) ValidateBulk(ctx context.Context, opts BulkValidationOptions) (*BulkValidationResult, error) {
	if opts.Priority == "" {
		opts.Priority = "normal"
	}

	respBody, err := c.doRequest(ctx, "POST", "/bulk-validate-email", opts)
	if err != nil {
		return nil, err
	}

	var result BulkValidationResult
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if result.Status == "" {
		result.Status = JobStatusPending
	}

	return &result, nil
}

// GetBulkJobStatus gets the status of a bulk validation job
func (c *Client) GetBulkJobStatus(ctx context.Context, jobID string) (*BulkValidationResult, error) {
	path := fmt.Sprintf("/bulk-validate-email?job_id=%s", jobID)
	respBody, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}

	var result BulkValidationResult
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// Health checks API health status
func (c *Client) Health(ctx context.Context) (*HealthStatus, error) {
	respBody, err := c.doRequest(ctx, "GET", "/health", nil)
	if err != nil {
		return nil, err
	}

	var result HealthStatus
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// GetCredits gets current credit balance
func (c *Client) GetCredits(ctx context.Context) (*CreditBalance, error) {
	respBody, err := c.doRequest(ctx, "GET", "/check-subscription", nil)
	if err != nil {
		return nil, err
	}

	var result CreditBalance
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}
