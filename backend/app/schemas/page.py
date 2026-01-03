"""
Page schemas for API requests/responses.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class PageResponse(BaseModel):
    """Schema for page response in list views."""
    id: UUID
    project_id: UUID
    url: str
    title: Optional[str]
    meta_description: Optional[str]
    word_count: int
    depth: int
    scraped_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PageDetail(BaseModel):
    """Schema for full page detail."""
    id: UUID
    project_id: UUID
    url: str
    title: Optional[str]
    content_markdown: Optional[str]
    content_html: Optional[str]
    content_text: Optional[str]
    meta_description: Optional[str]
    word_count: int
    depth: int
    scraped_at: datetime
    updated_at: datetime
    versions_count: int = 0
    tags: List[str] = []
    collections: List[str] = []
    
    class Config:
        from_attributes = True


class PageVersionResponse(BaseModel):
    """Schema for page version."""
    id: UUID
    version_number: int
    content_markdown: Optional[str]
    diff: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PageListResponse(BaseModel):
    """Schema for paginated page list."""
    pages: List[PageResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class PageUpdate(BaseModel):
    """Schema for updating page metadata."""
    title: Optional[str] = None
    tags: Optional[List[UUID]] = None
    collections: Optional[List[UUID]] = None

