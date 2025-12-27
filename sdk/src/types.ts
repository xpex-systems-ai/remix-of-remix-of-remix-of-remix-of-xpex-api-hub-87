// ============================================
// XPEX Neural GoldMail SDK - Type Definitions
// ============================================

/**
 * Risk level classification for email validation
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Status of a bulk validation job
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * API error codes
 */
export type ErrorCode =
  | 'INVALID_API_KEY'
  | 'INSUFFICIENT_CREDITS'
  | 'RATE_LIMITED'
  | 'INVALID_EMAIL'
  | 'VALIDATION_FAILED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

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
 * Result from single email validation
 */
export interface ValidationResult {
  /** The email address that was validated */
  email: string;

  /** Whether the email is valid */
  is_valid: boolean;

  /** Validation score from 0-100 */
  score: number;

  /** Risk classification */
  risk_level: RiskLevel;

  /** Whether MX records exist for the domain */
  mx_records: boolean;

  /** Whether the email syntax is valid */
  syntax_valid: boolean;

  /** Whether the domain exists */
  domain_exists: boolean;

  /** Whether the email uses a disposable domain */
  is_disposable?: boolean;

  /** Whether the email is a role-based address (e.g., info@, support@) */
  is_role_based?: boolean;

  /** Whether the email is a catch-all address */
  is_catch_all?: boolean;

  /** Whether the email appears to be a free email provider */
  is_free_provider?: boolean;

  /** Suggested correction for typos */
  suggestion?: string;

  /** Timestamp of validation */
  validated_at: string;
}

/**
 * AI-specific analysis data
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
 * Result from AI-powered email validation
 */
export interface AIValidationResult extends ValidationResult {
  /** AI analysis data */
  ai_analysis: AIAnalysis;
}

/**
 * Options for bulk validation
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
 */
export interface BulkValidationResult {
  /** Unique job identifier */
  job_id: string;

  /** Total emails submitted */
  total_emails: number;

  /** Number of valid emails */
  valid_emails: number;

  /** Number of invalid emails */
  invalid_emails: number;

  /** Current job status */
  status: JobStatus;

  /** Number of processed emails */
  processed_emails: number;

  /** Credits used for this job */
  credits_used: number;

  /** When the job was created */
  created_at: string;

  /** When the job completed (if applicable) */
  completed_at?: string;

  /** Individual validation results (if completed) */
  results?: ValidationResult[];

  /** Error message if job failed */
  error_message?: string;
}

/**
 * API health status response
 */
export interface HealthStatus {
  /** Overall system status */
  status: 'healthy' | 'degraded' | 'down';

  /** API version */
  version: string;

  /** Current timestamp */
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
 */
export interface APIError {
  /** Error code */
  code: ErrorCode;

  /** Human-readable error message */
  message: string;

  /** Additional error details */
  details?: Record<string, unknown>;
}
