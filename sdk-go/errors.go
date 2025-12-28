package goldmail

import "fmt"

// GoldMailError represents an API error
type GoldMailError struct {
	Code    ErrorCode
	Message string
	Details map[string]interface{}
	Status  int
}

// Error implements the error interface
func (e *GoldMailError) Error() string {
	return fmt.Sprintf("GoldMailError[%s]: %s", e.Code, e.Message)
}

// NewError creates a new GoldMailError
func NewError(code ErrorCode, message string) *GoldMailError {
	return &GoldMailError{
		Code:    code,
		Message: message,
	}
}

// FromResponse creates an error from an API response
func ErrorFromResponse(resp APIErrorResponse, status int) *GoldMailError {
	return &GoldMailError{
		Code:    resp.Code,
		Message: resp.Message,
		Details: resp.Details,
		Status:  status,
	}
}

// NetworkError creates a network error
func NetworkError(message string) *GoldMailError {
	return &GoldMailError{
		Code:    ErrorCodeNetworkError,
		Message: message,
	}
}

// TimeoutError creates a timeout error
func TimeoutError() *GoldMailError {
	return &GoldMailError{
		Code:    ErrorCodeTimeout,
		Message: "Request timed out",
	}
}

// IsAuthError checks if the error is due to invalid API key
func (e *GoldMailError) IsAuthError() bool {
	return e.Code == ErrorCodeInvalidAPIKey
}

// IsCreditsError checks if the error is due to insufficient credits
func (e *GoldMailError) IsCreditsError() bool {
	return e.Code == ErrorCodeInsufficientCredits
}

// IsRateLimitError checks if the error is due to rate limiting
func (e *GoldMailError) IsRateLimitError() bool {
	return e.Code == ErrorCodeRateLimited
}

// IsRetryable checks if the error is retryable
func (e *GoldMailError) IsRetryable() bool {
	switch e.Code {
	case ErrorCodeRateLimited, ErrorCodeServerError, ErrorCodeNetworkError, ErrorCodeTimeout:
		return true
	default:
		return false
	}
}
