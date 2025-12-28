package goldmail

import "time"

// RiskLevel represents the risk level of an email
type RiskLevel string

const (
	RiskLevelLow      RiskLevel = "low"
	RiskLevelMedium   RiskLevel = "medium"
	RiskLevelHigh     RiskLevel = "high"
	RiskLevelCritical RiskLevel = "critical"
)

// JobStatus represents the status of a bulk validation job
type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusProcessing JobStatus = "processing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
)

// ErrorCode represents API error codes
type ErrorCode string

const (
	ErrorCodeInvalidEmail        ErrorCode = "INVALID_EMAIL"
	ErrorCodeInvalidAPIKey       ErrorCode = "INVALID_API_KEY"
	ErrorCodeRateLimited         ErrorCode = "RATE_LIMITED"
	ErrorCodeInsufficientCredits ErrorCode = "INSUFFICIENT_CREDITS"
	ErrorCodeServerError         ErrorCode = "SERVER_ERROR"
	ErrorCodeNetworkError        ErrorCode = "NETWORK_ERROR"
	ErrorCodeTimeout             ErrorCode = "TIMEOUT"
	ErrorCodeValidationFailed    ErrorCode = "VALIDATION_FAILED"
)

// ClientOptions contains configuration for the GoldMail client
type ClientOptions struct {
	// BaseURL is the API base URL
	BaseURL string
	// Timeout is the request timeout
	Timeout time.Duration
	// RetryAttempts is the number of retry attempts
	RetryAttempts int
	// RetryDelay is the delay between retries
	RetryDelay time.Duration
}

// DefaultOptions returns default client options
func DefaultOptions() ClientOptions {
	return ClientOptions{
		BaseURL:       "https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1",
		Timeout:       30 * time.Second,
		RetryAttempts: 3,
		RetryDelay:    1 * time.Second,
	}
}

// ValidationResult represents the result of email validation
type ValidationResult struct {
	Email          string    `json:"email"`
	Valid          bool      `json:"valid"`
	Reason         string    `json:"reason,omitempty"`
	RiskLevel      RiskLevel `json:"risk_level"`
	IsDisposable   bool      `json:"is_disposable"`
	IsRoleBased    bool      `json:"is_role_based"`
	IsFreeProvider bool      `json:"is_free_provider"`
	MXRecords      bool      `json:"mx_records"`
	SMTPValid      *bool     `json:"smtp_valid,omitempty"`
	SyntaxValid    bool      `json:"syntax_valid"`
	Domain         string    `json:"domain"`
	LocalPart      string    `json:"local_part"`
	Suggestion     string    `json:"suggestion,omitempty"`
	ValidatedAt    string    `json:"validated_at"`
}

// AIAnalysis contains AI-powered analysis details
type AIAnalysis struct {
	Confidence       float64  `json:"confidence"`
	PatternsDetected []string `json:"patterns_detected"`
	BehavioralScore  float64  `json:"behavioral_score"`
	FraudIndicators  []string `json:"fraud_indicators"`
	Recommendation   string   `json:"recommendation"`
}

// AIValidationResult extends ValidationResult with AI analysis
type AIValidationResult struct {
	ValidationResult
	AIAnalysis AIAnalysis `json:"ai_analysis"`
}

// BulkValidationOptions contains options for bulk validation
type BulkValidationOptions struct {
	Emails     []string `json:"emails"`
	WebhookURL string   `json:"webhook_url,omitempty"`
	Priority   string   `json:"priority,omitempty"`
}

// BulkEmailResult represents a single result in bulk validation
type BulkEmailResult struct {
	Email     string    `json:"email"`
	Valid     bool      `json:"valid"`
	Reason    string    `json:"reason,omitempty"`
	RiskLevel RiskLevel `json:"risk_level"`
}

// BulkValidationResult represents the result of a bulk validation job
type BulkValidationResult struct {
	JobID           string            `json:"job_id"`
	Status          JobStatus         `json:"status"`
	TotalEmails     int               `json:"total_emails"`
	ProcessedEmails int               `json:"processed_emails"`
	ValidEmails     int               `json:"valid_emails"`
	InvalidEmails   int               `json:"invalid_emails"`
	Results         []BulkEmailResult `json:"results,omitempty"`
	CreatedAt       string            `json:"created_at"`
	CompletedAt     string            `json:"completed_at,omitempty"`
}

// HealthStatus represents API health status
type HealthStatus struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Version   string `json:"version,omitempty"`
}

// CreditBalance represents user credit balance
type CreditBalance struct {
	Credits int    `json:"credits"`
	Tier    string `json:"tier,omitempty"`
}

// APIErrorResponse represents an API error response
type APIErrorResponse struct {
	Code    ErrorCode              `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}
