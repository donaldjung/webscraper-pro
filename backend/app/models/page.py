"""
Page and content models.
"""
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.database import Base


class Page(Base):
    """Scraped page content."""
    
    __tablename__ = "pages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    scrape_job_id = Column(String(36), ForeignKey("scrape_jobs.id", ondelete="SET NULL"), nullable=True)
    
    # URL information
    url = Column(String(2048), nullable=False)
    url_hash = Column(String(64), nullable=False, index=True)  # SHA256 hash for deduplication
    
    # Content
    title = Column(String(512), nullable=True)
    content_markdown = Column(Text, nullable=True)
    content_html = Column(Text, nullable=True)
    content_text = Column(Text, nullable=True)  # Plain text for search
    
    # Metadata
    meta_description = Column(Text, nullable=True)
    word_count = Column(Integer, default=0)
    depth = Column(Integer, default=0)  # Distance from root URL
    
    # File storage path (for large content)
    storage_path = Column(String(512), nullable=True)
    
    # Timestamps
    scraped_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="pages")
    versions = relationship("PageVersion", back_populates="page", cascade="all, delete-orphan")
    chunks = relationship("PageChunk", back_populates="page", cascade="all, delete-orphan")
    
    # Create indexes
    __table_args__ = (
        Index("ix_pages_project_url", "project_id", "url_hash"),
    )
    
    def __repr__(self):
        return f"<Page {self.title or self.url}>"


class PageVersion(Base):
    """Version history for page content."""
    
    __tablename__ = "page_versions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(String(36), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    
    # Content snapshot
    content_markdown = Column(Text, nullable=True)
    content_hash = Column(String(64), nullable=False)  # To detect changes
    
    # Diff from previous version
    diff = Column(Text, nullable=True)
    
    version_number = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    page = relationship("Page", back_populates="versions")
    
    def __repr__(self):
        return f"<PageVersion {self.page_id} v{self.version_number}>"


class PageChunk(Base):
    """Chunked content for vector embeddings."""
    
    __tablename__ = "page_chunks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(String(36), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    
    # Chunk content
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, default=0)
    
    # Token information
    token_count = Column(Integer, default=0)
    
    # Vector embedding stored as JSON string for SQLite compatibility
    embedding = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    page = relationship("Page", back_populates="chunks")
    
    def __repr__(self):
        return f"<PageChunk {self.page_id} #{self.chunk_index}>"

