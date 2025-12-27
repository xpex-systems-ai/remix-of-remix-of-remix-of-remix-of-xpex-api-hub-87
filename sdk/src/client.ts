import {
  ClientOptions,
  ValidationResult,
  AIValidationResult,
  BulkValidationResult,
  BulkValidationOptions,
  HealthStatus,
  CreditBalance,
  APIError,
} from './types';
import { GoldMailError } from './errors';

const DEFAULT_BASE_URL = 'https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1';
const DEFAULT_TIMEOUT = 30000;

/**
 * GoldMail API Client
 * 
 * Official TypeScript client for the XPEX Neural GoldMail Email Validation API.
 * 
 * @example
 * ```typescript
 * const client = new GoldMailClient('gm_your_api_key');
 * const result = await client.validate('user@example.com');
 * ```
 */
export class GoldMailClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;
  private readonly debug: boolean;

  /**
   * Create a new GoldMail client
   * 
   * @param apiKey - Your GoldMail API key (starts with 'gm_')
   * @param options - Optional client configuration
   */
  constructor(apiKey: string, options: ClientOptions = {}) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required');
    }

    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.headers = options.headers || {};
    this.debug = options.debug || false;
  }

  /**
   * Make an authenticated request to the API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      if (this.debug) {
        console.log(`[GoldMail] ${options.method || 'GET'} ${url}`);
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as APIError;
        throw GoldMailError.fromResponse(error, response.status);
      }

      if (this.debug) {
        console.log(`[GoldMail] Response:`, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof GoldMailError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw GoldMailError.timeoutError();
        }
        throw GoldMailError.networkError(error.message);
      }

      throw GoldMailError.networkError('Unknown error occurred');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Validate a single email address
   * 
   * @param email - The email address to validate
   * @returns Validation result with score and risk assessment
   * 
   * @example
   * ```typescript
   * const result = await client.validate('user@example.com');
   * console.log(result.is_valid); // true
   * console.log(result.score);    // 85
   * ```
   */
  async validate(email: string): Promise<ValidationResult> {
    if (!email || typeof email !== 'string') {
      throw new GoldMailError('Email is required', 'INVALID_EMAIL');
    }

    return this.request<ValidationResult>('/validate-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Validate an email with AI-powered analysis
   * 
   * Includes fraud detection, pattern analysis, and recommendations.
   * Uses 2 credits per validation.
   * 
   * @param email - The email address to validate
   * @returns Extended validation result with AI analysis
   * 
   * @example
   * ```typescript
   * const result = await client.validateAI('user@example.com');
   * console.log(result.ai_analysis.fraud_probability); // 0.05
   * ```
   */
  async validateAI(email: string): Promise<AIValidationResult> {
    if (!email || typeof email !== 'string') {
      throw new GoldMailError('Email is required', 'INVALID_EMAIL');
    }

    return this.request<AIValidationResult>('/validate-email-ai', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Validate multiple emails in bulk
   * 
   * Supports up to 10,000 emails per request. Returns a job ID
   * that can be used to check status and retrieve results.
   * 
   * @param emails - Array of email addresses to validate
   * @param options - Bulk validation options
   * @returns Bulk validation job result
   * 
   * @example
   * ```typescript
   * const result = await client.validateBulk([
   *   'user1@example.com',
   *   'user2@example.com'
   * ]);
   * console.log(result.job_id);
   * ```
   */
  async validateBulk(
    emails: string[],
    options: BulkValidationOptions = {}
  ): Promise<BulkValidationResult> {
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new GoldMailError('Emails array is required', 'INVALID_EMAIL');
    }

    if (emails.length > 10000) {
      throw new GoldMailError(
        'Maximum 10,000 emails per request',
        'INVALID_EMAIL'
      );
    }

    return this.request<BulkValidationResult>('/bulk-validate-email', {
      method: 'POST',
      body: JSON.stringify({
        emails,
        batch_size: options.batchSize,
        use_ai: options.useAI,
        scheduled_at: options.scheduledAt,
        webhook_url: options.webhookUrl,
      }),
    });
  }

  /**
   * Get the status of a bulk validation job
   * 
   * @param jobId - The job ID returned from validateBulk
   * @returns Current job status and results if complete
   */
  async getBulkJobStatus(jobId: string): Promise<BulkValidationResult> {
    if (!jobId || typeof jobId !== 'string') {
      throw new GoldMailError('Job ID is required', 'VALIDATION_FAILED');
    }

    return this.request<BulkValidationResult>(
      `/bulk-validate-email?job_id=${encodeURIComponent(jobId)}`,
      { method: 'GET' }
    );
  }

  /**
   * Check API health status
   * 
   * @returns Current health status of all services
   * 
   * @example
   * ```typescript
   * const health = await client.health();
   * console.log(health.status); // 'healthy'
   * ```
   */
  async health(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health', {
      method: 'GET',
    });
  }

  /**
   * Get current credit balance
   * 
   * @returns Credit balance information
   */
  async getCredits(): Promise<CreditBalance> {
    return this.request<CreditBalance>('/credits', {
      method: 'GET',
    });
  }
}
