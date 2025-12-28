"""
GoldMail API Client
"""

import time
from typing import Optional, List
import httpx

from .types import (
    ClientOptions,
    ValidationResult,
    AIValidationResult,
    BulkValidationOptions,
    BulkValidationResult,
    HealthStatus,
    CreditBalance,
    RiskLevel,
    JobStatus,
)
from .errors import GoldMailError


class GoldMailClient:
    """
    Official Python client for XPEX Neural GoldMail Email Validation API
    
    Example:
        >>> client = GoldMailClient("your-api-key")
        >>> result = client.validate("test@example.com")
        >>> print(result.valid)
    """
    
    def __init__(
        self,
        api_key: str,
        options: Optional[ClientOptions] = None
    ):
        """
        Initialize the GoldMail client
        
        Args:
            api_key: Your GoldMail API key
            options: Optional client configuration
        """
        if not api_key:
            raise ValueError("API key is required")
        
        self.api_key = api_key
        self.options = options or ClientOptions()
        self._client = httpx.Client(
            base_url=self.options.base_url,
            timeout=self.options.timeout / 1000,  # Convert to seconds
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-SDK-Version": "python-1.0.0"
            }
        )
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
    
    def close(self):
        """Close the HTTP client"""
        self._client.close()
    
    def _request(
        self,
        method: str,
        path: str,
        json: Optional[dict] = None,
        params: Optional[dict] = None
    ) -> dict:
        """Make an HTTP request with retry logic"""
        last_error = None
        
        for attempt in range(self.options.retry_attempts):
            try:
                response = self._client.request(
                    method=method,
                    url=path,
                    json=json,
                    params=params
                )
                
                if response.status_code >= 400:
                    error_data = response.json()
                    error = GoldMailError.from_response(error_data, response.status_code)
                    
                    if not error.is_retryable() or attempt == self.options.retry_attempts - 1:
                        raise error
                    
                    last_error = error
                else:
                    return response.json()
                    
            except httpx.TimeoutException:
                last_error = GoldMailError.timeout_error()
                if attempt == self.options.retry_attempts - 1:
                    raise last_error
            except httpx.RequestError as e:
                last_error = GoldMailError.network_error(str(e))
                if attempt == self.options.retry_attempts - 1:
                    raise last_error
            
            # Wait before retry
            time.sleep(self.options.retry_delay / 1000 * (attempt + 1))
        
        raise last_error or GoldMailError("Unknown error", "SERVER_ERROR")
    
    def validate(self, email: str) -> ValidationResult:
        """
        Validate a single email address
        
        Args:
            email: Email address to validate
            
        Returns:
            ValidationResult with validation details
            
        Raises:
            GoldMailError: If validation fails
        """
        data = self._request("POST", "/validate-email", json={"email": email})
        return ValidationResult(
            email=data["email"],
            valid=data["valid"],
            reason=data.get("reason"),
            risk_level=RiskLevel(data.get("risk_level", "medium")),
            is_disposable=data.get("is_disposable", False),
            is_role_based=data.get("is_role_based", False),
            is_free_provider=data.get("is_free_provider", False),
            mx_records=data.get("mx_records", False),
            smtp_valid=data.get("smtp_valid"),
            syntax_valid=data.get("syntax_valid", True),
            domain=data.get("domain", email.split("@")[-1] if "@" in email else ""),
            local_part=data.get("local_part", email.split("@")[0] if "@" in email else email),
            suggestion=data.get("suggestion"),
            validated_at=data.get("validated_at", "")
        )
    
    def validate_ai(self, email: str) -> AIValidationResult:
        """
        Validate email with AI-powered analysis
        
        Args:
            email: Email address to validate
            
        Returns:
            AIValidationResult with AI analysis details
            
        Raises:
            GoldMailError: If validation fails
        """
        data = self._request("POST", "/validate-email-ai", json={"email": email})
        
        from .types import AIAnalysis
        
        ai_data = data.get("ai_analysis", {})
        ai_analysis = AIAnalysis(
            confidence=ai_data.get("confidence", 0.5),
            patterns_detected=ai_data.get("patterns_detected", []),
            behavioral_score=ai_data.get("behavioral_score", 50),
            fraud_indicators=ai_data.get("fraud_indicators", []),
            recommendation=ai_data.get("recommendation", "review")
        )
        
        return AIValidationResult(
            email=data["email"],
            valid=data["valid"],
            reason=data.get("reason"),
            risk_level=RiskLevel(data.get("risk_level", "medium")),
            is_disposable=data.get("is_disposable", False),
            is_role_based=data.get("is_role_based", False),
            is_free_provider=data.get("is_free_provider", False),
            mx_records=data.get("mx_records", False),
            smtp_valid=data.get("smtp_valid"),
            syntax_valid=data.get("syntax_valid", True),
            domain=data.get("domain", email.split("@")[-1] if "@" in email else ""),
            local_part=data.get("local_part", email.split("@")[0] if "@" in email else email),
            suggestion=data.get("suggestion"),
            validated_at=data.get("validated_at", ""),
            ai_analysis=ai_analysis
        )
    
    def validate_bulk(
        self,
        emails: List[str],
        webhook_url: Optional[str] = None,
        priority: str = "normal"
    ) -> BulkValidationResult:
        """
        Submit bulk email validation job
        
        Args:
            emails: List of email addresses to validate
            webhook_url: Optional webhook for completion notification
            priority: Job priority (normal, high)
            
        Returns:
            BulkValidationResult with job details
            
        Raises:
            GoldMailError: If submission fails
        """
        data = self._request(
            "POST",
            "/bulk-validate-email",
            json={
                "emails": emails,
                "webhook_url": webhook_url,
                "priority": priority
            }
        )
        
        return BulkValidationResult(
            job_id=data["job_id"],
            status=JobStatus(data.get("status", "pending")),
            total_emails=data.get("total_emails", len(emails)),
            processed_emails=data.get("processed_emails", 0),
            valid_emails=data.get("valid_emails", 0),
            invalid_emails=data.get("invalid_emails", 0),
            results=None,
            created_at=data.get("created_at", ""),
            completed_at=data.get("completed_at")
        )
    
    def get_bulk_job_status(self, job_id: str) -> BulkValidationResult:
        """
        Get status of a bulk validation job
        
        Args:
            job_id: The job ID to check
            
        Returns:
            BulkValidationResult with current status
            
        Raises:
            GoldMailError: If request fails
        """
        data = self._request("GET", f"/bulk-validate-email?job_id={job_id}")
        
        from .types import BulkEmailResult
        
        results = None
        if data.get("results"):
            results = [
                BulkEmailResult(
                    email=r["email"],
                    valid=r["valid"],
                    reason=r.get("reason"),
                    risk_level=RiskLevel(r.get("risk_level", "medium"))
                )
                for r in data["results"]
            ]
        
        return BulkValidationResult(
            job_id=data["job_id"],
            status=JobStatus(data.get("status", "pending")),
            total_emails=data.get("total_emails", 0),
            processed_emails=data.get("processed_emails", 0),
            valid_emails=data.get("valid_emails", 0),
            invalid_emails=data.get("invalid_emails", 0),
            results=results,
            created_at=data.get("created_at", ""),
            completed_at=data.get("completed_at")
        )
    
    def health(self) -> HealthStatus:
        """
        Check API health status
        
        Returns:
            HealthStatus with API status
        """
        data = self._request("GET", "/health")
        return HealthStatus(
            status=data.get("status", "unknown"),
            timestamp=data.get("timestamp", ""),
            version=data.get("version")
        )
    
    def get_credits(self) -> CreditBalance:
        """
        Get current credit balance
        
        Returns:
            CreditBalance with current credits
            
        Raises:
            GoldMailError: If request fails
        """
        data = self._request("GET", "/check-subscription")
        return CreditBalance(
            credits=data.get("credits", 0),
            tier=data.get("tier")
        )


class AsyncGoldMailClient:
    """
    Async version of GoldMail client
    
    Example:
        >>> async with AsyncGoldMailClient("your-api-key") as client:
        ...     result = await client.validate("test@example.com")
        ...     print(result.valid)
    """
    
    def __init__(
        self,
        api_key: str,
        options: Optional[ClientOptions] = None
    ):
        if not api_key:
            raise ValueError("API key is required")
        
        self.api_key = api_key
        self.options = options or ClientOptions()
        self._client = httpx.AsyncClient(
            base_url=self.options.base_url,
            timeout=self.options.timeout / 1000,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-SDK-Version": "python-async-1.0.0"
            }
        )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()
    
    async def _request(
        self,
        method: str,
        path: str,
        json: Optional[dict] = None,
        params: Optional[dict] = None
    ) -> dict:
        """Make an async HTTP request with retry logic"""
        import asyncio
        
        last_error = None
        
        for attempt in range(self.options.retry_attempts):
            try:
                response = await self._client.request(
                    method=method,
                    url=path,
                    json=json,
                    params=params
                )
                
                if response.status_code >= 400:
                    error_data = response.json()
                    error = GoldMailError.from_response(error_data, response.status_code)
                    
                    if not error.is_retryable() or attempt == self.options.retry_attempts - 1:
                        raise error
                    
                    last_error = error
                else:
                    return response.json()
                    
            except httpx.TimeoutException:
                last_error = GoldMailError.timeout_error()
                if attempt == self.options.retry_attempts - 1:
                    raise last_error
            except httpx.RequestError as e:
                last_error = GoldMailError.network_error(str(e))
                if attempt == self.options.retry_attempts - 1:
                    raise last_error
            
            await asyncio.sleep(self.options.retry_delay / 1000 * (attempt + 1))
        
        raise last_error or GoldMailError("Unknown error", "SERVER_ERROR")
    
    async def validate(self, email: str) -> ValidationResult:
        """Validate a single email address (async)"""
        data = await self._request("POST", "/validate-email", json={"email": email})
        return ValidationResult(
            email=data["email"],
            valid=data["valid"],
            reason=data.get("reason"),
            risk_level=RiskLevel(data.get("risk_level", "medium")),
            is_disposable=data.get("is_disposable", False),
            is_role_based=data.get("is_role_based", False),
            is_free_provider=data.get("is_free_provider", False),
            mx_records=data.get("mx_records", False),
            smtp_valid=data.get("smtp_valid"),
            syntax_valid=data.get("syntax_valid", True),
            domain=data.get("domain", email.split("@")[-1] if "@" in email else ""),
            local_part=data.get("local_part", email.split("@")[0] if "@" in email else email),
            suggestion=data.get("suggestion"),
            validated_at=data.get("validated_at", "")
        )
    
    async def validate_ai(self, email: str) -> AIValidationResult:
        """Validate email with AI analysis (async)"""
        data = await self._request("POST", "/validate-email-ai", json={"email": email})
        
        from .types import AIAnalysis
        
        ai_data = data.get("ai_analysis", {})
        ai_analysis = AIAnalysis(
            confidence=ai_data.get("confidence", 0.5),
            patterns_detected=ai_data.get("patterns_detected", []),
            behavioral_score=ai_data.get("behavioral_score", 50),
            fraud_indicators=ai_data.get("fraud_indicators", []),
            recommendation=ai_data.get("recommendation", "review")
        )
        
        return AIValidationResult(
            email=data["email"],
            valid=data["valid"],
            reason=data.get("reason"),
            risk_level=RiskLevel(data.get("risk_level", "medium")),
            is_disposable=data.get("is_disposable", False),
            is_role_based=data.get("is_role_based", False),
            is_free_provider=data.get("is_free_provider", False),
            mx_records=data.get("mx_records", False),
            smtp_valid=data.get("smtp_valid"),
            syntax_valid=data.get("syntax_valid", True),
            domain=data.get("domain", email.split("@")[-1] if "@" in email else ""),
            local_part=data.get("local_part", email.split("@")[0] if "@" in email else email),
            suggestion=data.get("suggestion"),
            validated_at=data.get("validated_at", ""),
            ai_analysis=ai_analysis
        )
    
    async def health(self) -> HealthStatus:
        """Check API health (async)"""
        data = await self._request("GET", "/health")
        return HealthStatus(
            status=data.get("status", "unknown"),
            timestamp=data.get("timestamp", ""),
            version=data.get("version")
        )
