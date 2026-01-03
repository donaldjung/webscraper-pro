"""
User schemas for API requests/responses.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for user profile updates."""
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    settings: Optional[dict] = None


class UserResponse(BaseModel):
    """Schema for user response."""
    id: UUID
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    settings: dict
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""
    sub: str
    exp: datetime

