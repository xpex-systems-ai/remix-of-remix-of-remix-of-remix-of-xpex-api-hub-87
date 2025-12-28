"""
Custom exceptions for GoldMail SDK
"""

from typing import Optional, Dict, Any
from .types import ErrorCode


class GoldMailError(Exception):
    """Custom exception for GoldMail API errors"""
    
    def __init__(
        self,
        message: str,
        code: ErrorCode,
        details: Optional[Dict[str, Any]] = None,
        status: Optional[int] = None
    ):
        super().__init__(message)
        self.code = code
        self.details = details
        self.status = status
    
    @classmethod
    def from_response(
        cls,
        response: Dict[str, Any],
        status: Optional[int] = None
    ) -> "GoldMailError":
        """Create error from API response"""
        return cls(
            message=response.get("message", "Unknown error"),
            code=ErrorCode(response.get("code", "SERVER_ERROR")),
            details=response.get("details"),
            status=status
        )
    
    @classmethod
    def network_error(cls, message: str) -> "GoldMailError":
        """Create network error"""
        return cls(message=message, code=ErrorCode.NETWORK_ERROR)
    
    @classmethod
    def timeout_error(cls) -> "GoldMailError":
        """Create timeout error"""
        return cls(message="Request timed out", code=ErrorCode.TIMEOUT)
    
    def is_auth_error(self) -> bool:
        """Check if error is due to invalid API key"""
        return self.code == ErrorCode.INVALID_API_KEY
    
    def is_credits_error(self) -> bool:
        """Check if error is due to insufficient credits"""
        return self.code == ErrorCode.INSUFFICIENT_CREDITS
    
    def is_rate_limit_error(self) -> bool:
        """Check if error is due to rate limiting"""
        return self.code == ErrorCode.RATE_LIMITED
    
    def is_retryable(self) -> bool:
        """Check if error is retryable"""
        return self.code in [
            ErrorCode.RATE_LIMITED,
            ErrorCode.SERVER_ERROR,
            ErrorCode.NETWORK_ERROR,
            ErrorCode.TIMEOUT
        ]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary"""
        return {
            "code": self.code.value,
            "message": str(self),
            "details": self.details,
            "status": self.status
        }
