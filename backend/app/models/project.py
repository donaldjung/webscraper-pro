"""
Project and ScrapeJob models.
"""
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey, Enum, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.database import Base


class AuthMethod(str, enum.Enum):
    """Authentication method for scraping."""
    NONE = "none"
    BROWSER_COOKIES = "browser_cookies"
    MANUAL_LOGIN = "manual_login"
    CREDENTIALS = "credentials"


class ScrapeStatus(str, enum.Enum):
    """Status of a scrape job."""
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Project(Base):
    """Project containing scrape configurations and results."""
    
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    base_url = Column(String(2048), nullable=False)
    
    # Authentication configuration
    auth_method = Column(Enum(AuthMethod), default=AuthMethod.NONE)
    auth_config = Column(JSON, default=dict)  # Encrypted credentials, cookie settings, etc.
    
    # Scrape configuration
    scrape_config = Column(JSON, default=lambda: {
        "max_depth": 3,
        "max_pages": 100,
        "rate_limit": 1.0,
        "respect_robots": True,
        "include_patterns": [],
        "exclude_patterns": [],
        "follow_external": False,
    })
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="projects")
    scrape_jobs = relationship("ScrapeJob", back_populates="project", cascade="all, delete-orphan")
    pages = relationship("Page", back_populates="project", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Project {self.name}>"


class ScrapeJob(Base):
    """Individual scrape job execution."""
    
    __tablename__ = "scrape_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    status = Column(Enum(ScrapeStatus), default=ScrapeStatus.PENDING)
    
    # Progress tracking
    pages_discovered = Column(Integer, default=0)
    pages_scraped = Column(Integer, default=0)
    pages_failed = Column(Integer, default=0)
    
    # Timing
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    error_log = Column(JSON, default=list)
    
    # Configuration snapshot (in case project config changes)
    config_snapshot = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="scrape_jobs")
    
    def __repr__(self):
        return f"<ScrapeJob {self.id} - {self.status}>"

