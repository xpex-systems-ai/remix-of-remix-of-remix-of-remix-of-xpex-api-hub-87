import { ErrorCode, APIError } from './types';

/**
 * Custom error class for GoldMail API errors
 */
export class GoldMailError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly status?: number;

  constructor(
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>,
    status?: number
  ) {
    super(message);
    this.name = 'GoldMailError';
    this.code = code;
    this.details = details;
    this.status = status;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GoldMailError);
    }
  }

  /**
   * Create error from API response
   */
  static fromResponse(response: APIError, status?: number): GoldMailError {
    return new GoldMailError(
      response.message,
      response.code,
      response.details,
      status
    );
  }

  /**
   * Create network error
   */
  static networkError(message: string): GoldMailError {
    return new GoldMailError(message, 'NETWORK_ERROR');
  }

  /**
   * Create timeout error
   */
  static timeoutError(): GoldMailError {
    return new GoldMailError('Request timed out', 'TIMEOUT');
  }

  /**
   * Check if error is due to invalid API key
   */
  isAuthError(): boolean {
    return this.code === 'INVALID_API_KEY';
  }

  /**
   * Check if error is due to insufficient credits
   */
  isCreditsError(): boolean {
    return this.code === 'INSUFFICIENT_CREDITS';
  }

  /**
   * Check if error is due to rate limiting
   */
  isRateLimitError(): boolean {
    return this.code === 'RATE_LIMITED';
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return (
      this.code === 'RATE_LIMITED' ||
      this.code === 'SERVER_ERROR' ||
      this.code === 'NETWORK_ERROR' ||
      this.code === 'TIMEOUT'
    );
  }

  /**
   * Get formatted error message
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      status: this.status,
    };
  }
}
