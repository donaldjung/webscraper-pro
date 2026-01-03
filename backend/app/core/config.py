"""
Application configuration settings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database (SQLite for local development)
    DATABASE_URL: str = "sqlite+aiosqlite:///./webscraper.db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Storage
    STORAGE_PATH: str = "storage"
    
    # Scraping
    MAX_CONCURRENT_SCRAPES: int = 5
    DEFAULT_TIMEOUT: int = 30
    RATE_LIMIT_DELAY: float = 1.0
    MAX_PAGES_PER_SCRAPE: int = 1000
    
    # AI
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

