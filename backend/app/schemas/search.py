"""
Search schemas for API requests/responses.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class SearchQuery(BaseModel):
    """Schema for search request."""
    query: str
    project_ids: Optional[List[UUID]] = None
    collection_ids: Optional[List[UUID]] = None
    tags: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search_type: str = "hybrid"  # semantic, fulltext, hybrid
    limit: int = 20
    offset: int = 0


class SearchHighlight(BaseModel):
    """Schema for search result highlight."""
    content: str
    start: int
    end: int


class SearchResult(BaseModel):
    """Schema for individual search result."""
    page_id: UUID
    url: str
    title: Optional[str]
    project_name: str
    snippet: str
    highlights: List[SearchHighlight] = []
    score: float
    scraped_at: datetime


class SearchResponse(BaseModel):
    """Schema for search response."""
    results: List[SearchResult]
    total: int
    query: str
    search_type: str
    took_ms: float


class SuggestResponse(BaseModel):
    """Schema for search suggestions."""
    suggestions: List[str]

