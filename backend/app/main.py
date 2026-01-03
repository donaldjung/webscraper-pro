"""
WebScraper Pro - FastAPI Backend
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import scrape, search, content, export, auth, projects, collections
from app.db.database import init_db
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await init_db()
    
    # Create storage directory
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    
    yield
    
    # Shutdown
    pass


app = FastAPI(
    title="WebScraper Pro API",
    description="Intelligent content extraction platform with AI-powered search",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for scraped content
os.makedirs("storage", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(scrape.router, prefix="/api/scrape", tags=["Scraping"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(collections.router, prefix="/api/collections", tags=["Collections"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "WebScraper Pro API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

