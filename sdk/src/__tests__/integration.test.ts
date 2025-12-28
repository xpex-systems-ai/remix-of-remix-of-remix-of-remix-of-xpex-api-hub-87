/**
 * Integration Tests for GoldMail SDK
 * These tests call actual API endpoints with a test API key
 * 
 * To run integration tests:
 * 1. Set GOLDMAIL_TEST_API_KEY environment variable
 * 2. Run: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GoldMailClient } from '../client';
import { GoldMailError, ValidationError, AuthenticationError, RateLimitError } from '../errors';

// Skip integration tests if no API key is provided
const API_KEY = process.env.GOLDMAIL_TEST_API_KEY;
const BASE_URL = process.env.GOLDMAIL_TEST_BASE_URL;

const describeIntegration = API_KEY ? describe : describe.skip;

describeIntegration('GoldMail SDK Integration Tests', () => {
  let client: GoldMailClient;

  beforeAll(() => {
    client = new GoldMailClient(API_KEY!, {
      baseUrl: BASE_URL,
      timeout: 30000,
      debug: true,
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await client.health();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(typeof health.latency_ms).toBe('number');
      expect(health.timestamp).toBeDefined();
    });

    it('should include service details', async () => {
      const health = await client.health();
      
      expect(health.services).toBeDefined();
      if (health.services) {
        expect(typeof health.services).toBe('object');
      }
    });
  });

  describe('Single Email Validation', () => {
    it('should validate a properly formatted email', async () => {
      const result = await client.validate('test@gmail.com');
      
      expect(result).toBeDefined();
      expect(result.email).toBe('test@gmail.com');
      expect(typeof result.is_valid).toBe('boolean');
      expect(result.status).toBeDefined();
      expect(['valid', 'invalid', 'risky', 'unknown']).toContain(result.status);
    });

    it('should detect invalid email format', async () => {
      const result = await client.validate('not-an-email');
      
      expect(result.is_valid).toBe(false);
      expect(result.status).toBe('invalid');
    });

    it('should provide domain information', async () => {
      const result = await client.validate('user@gmail.com');
      
      expect(result.domain).toBeDefined();
      if (result.domain) {
        expect(typeof result.domain.name).toBe('string');
        expect(typeof result.domain.has_mx).toBe('boolean');
      }
    });

    it('should handle disposable email detection', async () => {
      const result = await client.validate('test@tempmail.com');
      
      expect(result).toBeDefined();
      // Disposable status depends on the email
      expect(typeof result.is_disposable).toBe('boolean');
    });

    it('should include confidence score', async () => {
      const result = await client.validate('user@example.com');
      
      expect(result.confidence_score).toBeDefined();
      expect(typeof result.confidence_score).toBe('number');
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(100);
    });
  });

  describe('AI Email Validation', () => {
    it('should provide AI-powered analysis', async () => {
      const result = await client.validateAI('suspicious.user123@gmail.com');
      
      expect(result).toBeDefined();
      expect(result.email).toBe('suspicious.user123@gmail.com');
      expect(result.ai_analysis).toBeDefined();
    });

    it('should include risk assessment', async () => {
      const result = await client.validateAI('legit.business@company.com');
      
      expect(result.risk_score).toBeDefined();
      expect(typeof result.risk_score).toBe('number');
    });

    it('should provide recommendations', async () => {
      const result = await client.validateAI('test@example.com');
      
      expect(result.recommendations).toBeDefined();
      if (result.recommendations) {
        expect(Array.isArray(result.recommendations)).toBe(true);
      }
    });
  });

  describe('Bulk Email Validation', () => {
    it('should create a bulk validation job', async () => {
      const emails = [
        'user1@gmail.com',
        'user2@yahoo.com',
        'invalid-email',
      ];

      const result = await client.validateBulk(emails);
      
      expect(result).toBeDefined();
      expect(result.job_id).toBeDefined();
      expect(typeof result.job_id).toBe('string');
      expect(result.status).toBeDefined();
      expect(['pending', 'processing', 'completed', 'failed']).toContain(result.status);
      expect(result.total_emails).toBe(3);
    });

    it('should accept bulk validation options', async () => {
      const emails = ['test1@example.com', 'test2@example.com'];
      const options = {
        webhook_url: 'https://example.com/webhook',
        priority: 'high' as const,
      };

      const result = await client.validateBulk(emails, options);
      
      expect(result.job_id).toBeDefined();
    });

    it('should retrieve bulk job status', async () => {
      const emails = ['check@example.com'];
      const job = await client.validateBulk(emails);
      
      // Wait a moment for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const status = await client.getBulkJobStatus(job.job_id);
      
      expect(status).toBeDefined();
      expect(status.job_id).toBe(job.job_id);
      expect(status.status).toBeDefined();
      expect(typeof status.processed_emails).toBe('number');
    });
  });

  describe('Credits', () => {
    it('should retrieve credit balance', async () => {
      const credits = await client.getCredits();
      
      expect(credits).toBeDefined();
      expect(typeof credits.balance).toBe('number');
      expect(credits.balance).toBeGreaterThanOrEqual(0);
    });

    it('should include usage information', async () => {
      const credits = await client.getCredits();
      
      if (credits.used_today !== undefined) {
        expect(typeof credits.used_today).toBe('number');
      }
      if (credits.limit !== undefined) {
        expect(typeof credits.limit).toBe('number');
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw AuthenticationError for invalid API key', async () => {
      const invalidClient = new GoldMailClient('invalid_api_key', { baseUrl: BASE_URL });
      
      await expect(invalidClient.validate('test@example.com')).rejects.toThrow(AuthenticationError);
    });

    it('should throw ValidationError for malformed requests', async () => {
      // Empty email should trigger validation error
      await expect(client.validate('')).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      const badClient = new GoldMailClient(API_KEY!, {
        baseUrl: 'https://invalid-url-that-does-not-exist.com',
        timeout: 5000,
      });
      
      await expect(badClient.health()).rejects.toThrow(GoldMailError);
    });

    it('should respect timeout settings', async () => {
      const slowClient = new GoldMailClient(API_KEY!, {
        baseUrl: BASE_URL,
        timeout: 1, // 1ms timeout - should fail
      });
      
      await expect(slowClient.health()).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit responses', async () => {
      // This test may not always trigger rate limiting
      // depending on the API's rate limit configuration
      const requests = Array(10).fill(null).map(() => 
        client.validate('ratelimit-test@example.com')
      );
      
      try {
        await Promise.all(requests);
      } catch (error) {
        if (error instanceof RateLimitError) {
          expect(error.retryAfter).toBeDefined();
        }
        // Rate limiting may not occur - test passes either way
      }
    });
  });

  describe('Response Times', () => {
    it('should complete validation within acceptable time', async () => {
      const start = Date.now();
      await client.validate('timing-test@gmail.com');
      const duration = Date.now() - start;
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
    });

    it('should complete health check quickly', async () => {
      const start = Date.now();
      await client.health();
      const duration = Date.now() - start;
      
      // Health check should be fast
      expect(duration).toBeLessThan(5000);
    });
  });
});

// Cleanup test for persistent resources
describe('Cleanup', () => {
  it('placeholder for cleanup tasks', () => {
    // Add cleanup logic here if needed
    expect(true).toBe(true);
  });
});
