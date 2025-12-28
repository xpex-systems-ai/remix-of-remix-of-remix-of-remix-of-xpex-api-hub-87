"""
Type definitions for GoldMail SDK
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    """Risk level for email validation"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class JobStatus(str, Enum):
    """Status of bulk validation job"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ErrorCode(str, Enum):
    """API error codes"""
    INVALID_EMAIL = "INVALID_EMAIL"
    INVALID_API_KEY = "INVALID_API_KEY"
    RATE_LIMITED = "RATE_LIMITED"
    INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS"
    SERVER_ERROR = "SERVER_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    TIMEOUT = "TIMEOUT"
    VALIDATION_FAILED = "VALIDATION_FAILED"


class ClientOptions(BaseModel):
    """Configuration options for GoldMail client"""
    base_url: str = Field(
        default="https://ykunuwzqlwrskosyyrzm.supabase.co/functions/v1",
        description="Base URL for API requests"
    )
    timeout: int = Field(
        default=30000,
        description="Request timeout in milliseconds"
    )
    retry_attempts: int = Field(
        default=3,
        description="Number of retry attempts for failed requests"
    )
    retry_delay: int = Field(
        default=1000,
        description="Delay between retries in milliseconds"
    )


class ValidationResult(BaseModel):
    """Result of standard email validation"""
    email: str
    valid: bool
    reason: Optional[str] = None
    risk_level: RiskLevel
    is_disposable: bool
    is_role_based: bool
    is_free_provider: bool
    mx_records: bool
    smtp_valid: Optional[bool] = None
    syntax_valid: bool
    domain: str
    local_part: str
    suggestion: Optional[str] = None
    validated_at: str


class AIAnalysis(BaseModel):
    """AI-powered analysis details"""
    confidence: float = Field(ge=0, le=1)
    patterns_detected: List[str]
    behavioral_score: float = Field(ge=0, le=100)
    fraud_indicators: List[str]
    recommendation: str


class AIValidationResult(ValidationResult):
    """Result of AI-enhanced email validation"""
    ai_analysis: AIAnalysis


class BulkValidationOptions(BaseModel):
    """Options for bulk email validation"""
    emails: List[str]
    webhook_url: Optional[str] = None
    priority: str = Field(default="normal")


class BulkEmailResult(BaseModel):
    """Individual result in bulk validation"""
    email: str
    valid: bool
    reason: Optional[str] = None
    risk_level: RiskLevel


class BulkValidationResult(BaseModel):
    """Result of bulk email validation job"""
    job_id: str
    status: JobStatus
    total_emails: int
    processed_emails: int
    valid_emails: int
    invalid_emails: int
    results: Optional[List[BulkEmailResult]] = None
    created_at: str
    completed_at: Optional[str] = None


class HealthStatus(BaseModel):
    """API health status"""
    status: str
    timestamp: str
    version: Optional[str] = None


class CreditBalance(BaseModel):
    """User credit balance"""
    credits: int
    tier: Optional[str] = None


class APIError(BaseModel):
    """API error response"""
    code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None
