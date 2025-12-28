"""
XPEX Neural GoldMail SDK
Official Python SDK for Email Validation
"""

from .client import GoldMailClient
from .types import (
    RiskLevel,
    JobStatus,
    ErrorCode,
    ClientOptions,
    ValidationResult,
    AIValidationResult,
    AIAnalysis,
    BulkValidationOptions,
    BulkValidationResult,
    HealthStatus,
    CreditBalance,
)
from .errors import GoldMailError

__version__ = "1.0.0"
__all__ = [
    "GoldMailClient",
    "GoldMailError",
    "RiskLevel",
    "JobStatus",
    "ErrorCode",
    "ClientOptions",
    "ValidationResult",
    "AIValidationResult",
    "AIAnalysis",
    "BulkValidationOptions",
    "BulkValidationResult",
    "HealthStatus",
    "CreditBalance",
]
