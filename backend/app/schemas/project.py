"""
Project schemas for API requests/responses.
"""
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class AuthMethod(str, Enum):
    """Authentication method enum."""
    NONE = "none"
    BROWSER_COOKIES = "browser_cookies"
    MANUAL_LOGIN = "manual_login"
    CREDENTIALS = "credentials"


class ScrapeConfig(BaseModel):
    """Configuration for scraping behavior."""
    max_depth: int = 3
    max_pages: int = 100
    rate_limit: float = 1.0
    respect_robots: bool = True
    include_patterns: List[str] = []
    exclude_patterns: List[str] = []
    follow_external: bool = False


class AuthConfig(BaseModel):
    """Authentication configuration."""
    method: AuthMethod = AuthMethod.NONE
    browser: Optional[str] = None  # chrome, firefox, safari
    login_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None  # Will be encrypted


class ProjectCreate(BaseModel):
    """Schema for creating a project."""
    name: str
    description: Optional[str] = None
    base_url: str
    auth_method: AuthMethod = AuthMethod.NONE
    auth_config: Optional[dict] = None
    scrape_config: Optional[ScrapeConfig] = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: Optional[str] = None
    description: Optional[str] = None
    base_url: Optional[str] = None
    auth_method: Optional[AuthMethod] = None
    auth_config: Optional[dict] = None
    scrape_config: Optional[ScrapeConfig] = None


class ProjectResponse(BaseModel):
    """Schema for project response."""
    id: UUID
    name: str
    description: Optional[str]
    base_url: str
    auth_method: str
    scrape_config: dict
    created_at: datetime
    updated_at: datetime
    page_count: Optional[int] = 0
    last_scraped: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Schema for list of projects."""
    projects: List[ProjectResponse]
    total: int

