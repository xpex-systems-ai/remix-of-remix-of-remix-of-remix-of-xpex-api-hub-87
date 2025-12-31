// ============================================
// XPEX Neural GoldMail SDK - Type Definitions
// Generated from OpenAPI 3.1.0 Specification
// ============================================

/**
 * Risk level classification for email validation
 * @see OpenAPI: #/components/schemas/RiskLevel
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Status of a bulk validation job
 * @see OpenAPI: #/components/schemas/JobStatus
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * API error codes
 * @see OpenAPI: #/components/schemas/ErrorCode
 */
export type ErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'INSUFFICIENT_CREDITS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MISSING_EMAIL'
  | 'INVALID_EMAIL'
  | 'INTERNAL_ERROR';

/**
 * Client configuration options
 */
export interface ClientOptions {
  /**
   * Custom API base URL
   * @default 'https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1'
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Validation checks performed on an email
 * @see OpenAPI: #/components/schemas/ValidationChecks
 */
export interface ValidationChecks {
  /** Email format is syntactically correct */
  format_valid: boolean;
  /** Email uses a disposable domain */
  is_disposable: boolean;
  /** Domain has valid MX records */
  mx_valid: boolean;
  /** Possible typo detected in domain */
  has_typo: boolean;
}

/**
 * Rate limit information
 * @see OpenAPI: #/components/schemas/RateLimitInfo
 */
export interface RateLimitInfo {
  /** Remaining requests in current window */
  remaining: number;
  /** When the rate limit window resets (ISO 8601) */
  reset_at: string;
}

/**
 * Result from single email validation
 * @see OpenAPI: #/components/schemas/ValidationResult
 */
export interface ValidationResult {
  /** The email address that was validated */
  email: string;
  /** Whether the email is considered valid */
  valid: boolean;
  /** Validation confidence score (0-100) */
  score: number;
  /** Validation checks performed */
  checks: ValidationChecks;
  /** Suggested correction for typos */
  suggestion: string | null;
  /** Risk classification */
  risk_level: RiskLevel;
}

/**
 * Full validation response including metadata
 * @see OpenAPI: #/components/schemas/ValidationResponse
 */
export interface ValidationResponse {
  /** Request success status */
  ok: boolean;
  /** Validation result data */
  data: ValidationResult;
  /** Credits consumed by this request */
  credits_used: number;
  /** Remaining credit balance */
  remaining_credits: number;
  /** Response time in milliseconds */
  response_time_ms: number;
  /** Rate limit information */
  rate_limit: RateLimitInfo;
}

/**
 * AI-specific validation result
 * @see OpenAPI: #/components/schemas/AIValidationResult
 */
export interface AIValidationResult {
  /** The validated email address */
  email: string;
  /** Whether the email is considered valid */
  valid: boolean;
  /** Deliverability score (0-100) */
  score: number;
  /** Uses a disposable domain */
  disposable: boolean;
  /** MX records found */
  mx_found: boolean;
  /** Format is valid */
  format_valid: boolean;
  /** Email domain */
  domain: string;
  /** Risk classification */
  risk_level: RiskLevel;
  /** AI-computed risk score (0=safe, 100=dangerous) */
  risk_score: number;
  /** List of detected fraud indicators */
  fraud_indicators: string[];
  /** AI detected a typosquatting attempt */
  typo_detected: boolean;
  /** AI-suggested domain correction */
  suggested_correction: string | null;
  /** AI analysis of the email domain */
  domain_analysis: string | null;
  /** AI-generated recommendations */
  recommendations: string[];
  /** Response time in milliseconds */
  response_time_ms: number;
  /** AI-powered validation flag */
  ai_powered: true;
}

/**
 * Full AI validation response including metadata
 * @see OpenAPI: #/components/schemas/AIValidationResponse
 */
export interface AIValidationResponse {
  /** Request success status */
  ok: boolean;
  /** AI validation result data */
  data: AIValidationResult;
  /** Credits consumed by this request */
  credits_used: number;
  /** Remaining credit balance */
  remaining_credits: number;
  /** Rate limit information */
  rate_limit: RateLimitInfo;
}

/**
 * AI analysis data (for backwards compatibility)
 */
export interface AIAnalysis {
  /** Probability of fraud (0-1) */
  fraud_probability: number;
  /** Pattern analysis description */
  pattern_analysis: string;
  /** List of recommendations */
  recommendations: string[];
  /** Confidence score of AI analysis */
  confidence: number;
  /** Detected patterns */
  patterns_detected: string[];
}

/**
 * Options for bulk validation
 * @see OpenAPI: #/components/schemas/BulkValidationRequest
 */
export interface BulkValidationOptions {
  /**
   * Number of emails to process per batch
   * @default 100
   */
  batchSize?: number;

  /**
   * Whether to use AI validation for each email
   * @default false
   */
  useAI?: boolean;

  /**
   * Schedule validation for a future time (ISO 8601)
   */
  scheduledAt?: string;

  /**
   * Webhook URL to notify when complete
   */
  webhookUrl?: string;
}

/**
 * Result from bulk validation job
 * @see OpenAPI: #/components/schemas/BulkValidationResponse
 */
export interface BulkValidationResult {
  /** Request success status */
  ok: boolean;
  /** Unique job identifier for tracking */
  job_id: string;
  /** Current job status */
  status: JobStatus;
  /** Total emails submitted */
  total_emails: number;
  /** Status message */
  message?: string;
  /** Number of valid emails (when completed) */
  valid_emails?: number;
  /** Number of invalid emails (when completed) */
  invalid_emails?: number;
  /** Number of processed emails */
  processed_emails?: number;
  /** Credits used for this job */
  credits_used?: number;
  /** When the job was created */
  created_at?: string;
  /** When the job completed (if applicable) */
  completed_at?: string;
  /** Individual validation results (if completed) */
  results?: ValidationResult[];
  /** Error message if job failed */
  error_message?: string;
}

/**
 * API health status response
 * @see OpenAPI: #/components/schemas/HealthResponse
 */
export interface HealthStatus {
  /** Overall system status */
  status: 'healthy' | 'degraded' | 'down';
  /** API version */
  version: string;
  /** Current timestamp (ISO 8601) */
  timestamp: string;
  /** Individual service statuses */
  services: {
    api: 'operational' | 'degraded' | 'down';
    database: 'operational' | 'degraded' | 'down';
    validation: 'operational' | 'degraded' | 'down';
  };
  /** Average response time in ms */
  response_time_ms: number;
}

/**
 * Credit balance information
 */
export interface CreditBalance {
  /** Current credit balance */
  balance: number;
  /** Credits used this month */
  used_this_month: number;
  /** Subscription tier */
  tier: string;
}

/**
 * API error response
 * @see OpenAPI: #/components/schemas/ErrorResponse
 */
export interface APIError {
  /** Request failed */
  ok: false;
  /** Human-readable error message */
  error: string;
  /** Error code */
  code: ErrorCode;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Insufficient credits error response
 * @see OpenAPI: #/components/schemas/InsufficientCreditsError
 */
export interface InsufficientCreditsError extends APIError {
  code: 'INSUFFICIENT_CREDITS';
  credits_required: number;
  credits_available: number;
}

/**
 * Rate limit error response
 * @see OpenAPI: #/components/schemas/RateLimitError
 */
export interface RateLimitError extends APIError {
  code: 'RATE_LIMIT_EXCEEDED';
  retry_after_seconds: number;
}
