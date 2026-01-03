"""
Collection and Tag schemas for API requests/responses.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class TagCreate(BaseModel):
    """Schema for creating a tag."""
    name: str
    color: str = "#8b5cf6"


class TagResponse(BaseModel):
    """Schema for tag response."""
    id: UUID
    name: str
    color: str
    page_count: int = 0
    created_at: datetime
    
    class Config:
        from_attributes = True


class CollectionCreate(BaseModel):
    """Schema for creating a collection."""
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"
    icon: str = "folder"


class CollectionUpdate(BaseModel):
    """Schema for updating a collection."""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_public: Optional[bool] = None


class CollectionResponse(BaseModel):
    """Schema for collection response."""
    id: UUID
    name: str
    description: Optional[str]
    color: str
    icon: str
    is_public: bool
    share_token: Optional[str]
    page_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CollectionListResponse(BaseModel):
    """Schema for list of collections."""
    collections: List[CollectionResponse]
    total: int

