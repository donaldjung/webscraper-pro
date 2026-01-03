"""
Collection and Tag models for organization.
"""
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.database import Base


# Association tables
page_tags = Table(
    "page_tags",
    Base.metadata,
    Column("page_id", String(36), ForeignKey("pages.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String(36), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

page_collections = Table(
    "page_collections",
    Base.metadata,
    Column("page_id", String(36), ForeignKey("pages.id", ondelete="CASCADE"), primary_key=True),
    Column("collection_id", String(36), ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True),
)


class Collection(Base):
    """Collection of pages for organization."""
    
    __tablename__ = "collections"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#6366f1")  # Hex color
    icon = Column(String(50), default="folder")
    
    # Sharing
    is_public = Column(Boolean, default=False)
    share_token = Column(String(64), nullable=True, unique=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="collections")
    pages = relationship("Page", secondary=page_collections, backref="collections")
    
    def __repr__(self):
        return f"<Collection {self.name}>"


class Tag(Base):
    """Tag for categorizing pages."""
    
    __tablename__ = "tags"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#8b5cf6")  # Hex color
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    pages = relationship("Page", secondary=page_tags, backref="tags")
    
    def __repr__(self):
        return f"<Tag {self.name}>"

