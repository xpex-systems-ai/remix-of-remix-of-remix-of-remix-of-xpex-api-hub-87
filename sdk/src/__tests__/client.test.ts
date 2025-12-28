import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoldMailClient } from '../client';
import { GoldMailError } from '../errors';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GoldMailClient', () => {
  let client: GoldMailClient;

  beforeEach(() => {
    client = new GoldMailClient('test-api-key');
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      expect(() => new GoldMailClient('')).toThrow('API key is required');
    });

    it('should create client with default options', () => {
      const client = new GoldMailClient('test-key');
      expect(client).toBeInstanceOf(GoldMailClient);
    });

    it('should create client with custom options', () => {
      const client = new GoldMailClient('test-key', {
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        retryAttempts: 5,
        retryDelay: 2000,
      });
      expect(client).toBeInstanceOf(GoldMailClient);
    });
  });

  describe('validate', () => {
    it('should validate email successfully', async () => {
      const mockResponse = {
        email: 'test@example.com',
        valid: true,
        risk_level: 'low',
        is_disposable: false,
        is_role_based: false,
        is_free_provider: false,
        mx_records: true,
        syntax_valid: true,
        domain: 'example.com',
        local_part: 'test',
        validated_at: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.validate('test@example.com');

      expect(result.email).toBe('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            code: 'INVALID_EMAIL',
            message: 'Invalid email format',
          }),
      });

      await expect(client.validate('invalid-email')).rejects.toThrow(
        GoldMailError
      );
    });

    it('should retry on server error', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              code: 'SERVER_ERROR',
              message: 'Internal server error',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              email: 'test@example.com',
              valid: true,
              risk_level: 'low',
            }),
        });

      const result = await client.validate('test@example.com');
      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateAI', () => {
    it('should validate email with AI analysis', async () => {
      const mockResponse = {
        email: 'test@example.com',
        valid: true,
        risk_level: 'low',
        is_disposable: false,
        is_role_based: false,
        is_free_provider: false,
        mx_records: true,
        syntax_valid: true,
        domain: 'example.com',
        local_part: 'test',
        validated_at: '2024-01-01T00:00:00Z',
        ai_analysis: {
          confidence: 0.95,
          patterns_detected: ['corporate_domain'],
          behavioral_score: 85,
          fraud_indicators: [],
          recommendation: 'accept',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.validateAI('test@example.com');

      expect(result.email).toBe('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.aiAnalysis.confidence).toBe(0.95);
      expect(result.aiAnalysis.recommendation).toBe('accept');
    });
  });

  describe('validateBulk', () => {
    it('should submit bulk validation job', async () => {
      const mockResponse = {
        job_id: 'job-123',
        status: 'pending',
        total_emails: 3,
        processed_emails: 0,
        valid_emails: 0,
        invalid_emails: 0,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.validateBulk([
        'a@example.com',
        'b@example.com',
        'c@example.com',
      ]);

      expect(result.jobId).toBe('job-123');
      expect(result.status).toBe('pending');
      expect(result.totalEmails).toBe(3);
    });

    it('should include webhook URL if provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            job_id: 'job-123',
            status: 'pending',
            total_emails: 1,
            processed_emails: 0,
            valid_emails: 0,
            invalid_emails: 0,
            created_at: '2024-01-01T00:00:00Z',
          }),
      });

      await client.validateBulk(['test@example.com'], {
        webhookUrl: 'https://webhook.example.com',
        priority: 'high',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.webhook_url).toBe('https://webhook.example.com');
      expect(callBody.priority).toBe('high');
    });
  });

  describe('getBulkJobStatus', () => {
    it('should get bulk job status', async () => {
      const mockResponse = {
        job_id: 'job-123',
        status: 'completed',
        total_emails: 3,
        processed_emails: 3,
        valid_emails: 2,
        invalid_emails: 1,
        results: [
          { email: 'a@example.com', valid: true, risk_level: 'low' },
          { email: 'b@example.com', valid: true, risk_level: 'low' },
          { email: 'c@fake.xyz', valid: false, risk_level: 'high' },
        ],
        created_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:01:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getBulkJobStatus('job-123');

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(3);
      expect(result.validEmails).toBe(2);
      expect(result.invalidEmails).toBe(1);
    });
  });

  describe('health', () => {
    it('should check API health', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'healthy',
            timestamp: '2024-01-01T00:00:00Z',
            version: '1.0.0',
          }),
      });

      const result = await client.health();

      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('getCredits', () => {
    it('should get credit balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            credits: 1000,
            tier: 'pro',
          }),
      });

      const result = await client.getCredits();

      expect(result.credits).toBe(1000);
      expect(result.tier).toBe('pro');
    });
  });
});

describe('GoldMailError', () => {
  it('should create error from response', () => {
    const error = GoldMailError.fromResponse(
      {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided',
      },
      401
    );

    expect(error.code).toBe('INVALID_API_KEY');
    expect(error.message).toBe('Invalid API key provided');
    expect(error.status).toBe(401);
  });

  it('should identify auth errors', () => {
    const error = new GoldMailError('Auth error', 'INVALID_API_KEY');
    expect(error.isAuthError()).toBe(true);
    expect(error.isCreditsError()).toBe(false);
  });

  it('should identify credits errors', () => {
    const error = new GoldMailError('No credits', 'INSUFFICIENT_CREDITS');
    expect(error.isCreditsError()).toBe(true);
    expect(error.isAuthError()).toBe(false);
  });

  it('should identify rate limit errors', () => {
    const error = new GoldMailError('Rate limited', 'RATE_LIMITED');
    expect(error.isRateLimitError()).toBe(true);
  });

  it('should identify retryable errors', () => {
    const retryableError = new GoldMailError('Server error', 'SERVER_ERROR');
    expect(retryableError.isRetryable()).toBe(true);

    const nonRetryableError = new GoldMailError('Invalid', 'INVALID_EMAIL');
    expect(nonRetryableError.isRetryable()).toBe(false);
  });

  it('should convert to JSON', () => {
    const error = new GoldMailError('Test error', 'SERVER_ERROR', { foo: 'bar' }, 500);
    const json = error.toJSON();

    expect(json.name).toBe('GoldMailError');
    expect(json.code).toBe('SERVER_ERROR');
    expect(json.message).toBe('Test error');
    expect(json.details).toEqual({ foo: 'bar' });
    expect(json.status).toBe(500);
  });
});
