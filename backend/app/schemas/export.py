"""
Export schemas for API requests/responses.
"""
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from enum import Enum


class ExportFormat(str, Enum):
    """Export format options."""
    MARKDOWN = "markdown"
    PDF = "pdf"
    EPUB = "epub"
    HTML = "html"
    JSON = "json"
    OBSIDIAN = "obsidian"
    LLM = "llm"  # Optimized for LLM context windows


class ExportRequest(BaseModel):
    """Schema for export request."""
    format: ExportFormat
    page_ids: Optional[List[UUID]] = None
    project_ids: Optional[List[UUID]] = None
    collection_ids: Optional[List[UUID]] = None
    include_metadata: bool = True
    include_images: bool = False
    combine_into_single: bool = False  # Combine all pages into one file


class ExportResponse(BaseModel):
    """Schema for export response."""
    download_url: str
    filename: str
    format: ExportFormat
    file_size: int
    page_count: int
    expires_at: str

