"""
Scrape job schemas for API requests/responses.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class ScrapeStatus(str, Enum):
    """Scrape job status enum."""
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ScrapeJobCreate(BaseModel):
    """Schema for starting a scrape job."""
    project_id: UUID


class ScrapeJobResponse(BaseModel):
    """Schema for scrape job response."""
    id: UUID
    project_id: UUID
    status: ScrapeStatus
    pages_discovered: int
    pages_scraped: int
    pages_failed: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ScrapeProgress(BaseModel):
    """Schema for real-time scrape progress updates."""
    job_id: UUID
    status: ScrapeStatus
    pages_discovered: int
    pages_scraped: int
    pages_failed: int
    current_url: Optional[str] = None
    message: Optional[str] = None
    progress_percent: float = 0.0


class ScrapeEvent(BaseModel):
    """Schema for WebSocket scrape events."""
    type: str  # page_discovered, page_scraped, page_failed, status_changed, error
    data: dict
    timestamp: datetime


class DiscoveredPage(BaseModel):
    """Schema for discovered page event."""
    url: str
    depth: int
    parent_url: Optional[str] = None


class ScrapedPage(BaseModel):
    """Schema for scraped page event."""
    url: str
    title: Optional[str]
    word_count: int
    success: bool
    error: Optional[str] = None

