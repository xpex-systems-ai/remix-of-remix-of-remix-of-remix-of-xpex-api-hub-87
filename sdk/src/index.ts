// ============================================
// XPEX Neural GoldMail SDK
// Official TypeScript SDK for Email Validation
// ============================================

// Main client
export { GoldMailClient } from './client';

// Error handling
export { GoldMailError } from './errors';

// Types
export type {
  // Core types
  RiskLevel,
  JobStatus,
  ErrorCode,
  
  // Configuration
  ClientOptions,
  
  // Validation results
  ValidationResult,
  AIValidationResult,
  AIAnalysis,
  
  // Bulk operations
  BulkValidationOptions,
  BulkValidationResult,
  
  // Utility types
  HealthStatus,
  CreditBalance,
  APIError,
} from './types';
