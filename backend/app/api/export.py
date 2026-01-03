"""
Export API endpoints for multiple formats.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import os
import json
import zipfile
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.page import Page
from app.models.collection import Collection, page_collections
from app.schemas.export import ExportRequest, ExportFormat, ExportResponse
from app.api.auth import get_current_user
from app.core.config import settings
from app.core.export.handlers import (
    export_to_markdown,
    export_to_pdf,
    export_to_epub,
    export_to_html,
    export_to_json,
    export_to_obsidian,
    export_to_llm,
)

router = APIRouter()


async def get_pages_for_export(
    request: ExportRequest,
    user: User,
    db: AsyncSession,
) -> list[Page]:
    """Get pages based on export request criteria."""
    pages = []
    
    if request.page_ids:
        # Get specific pages
        result = await db.execute(
            select(Page)
            .join(Project)
            .where(
                Page.id.in_(request.page_ids),
                Project.user_id == user.id,
            )
        )
        pages = list(result.scalars().all())
    
    elif request.project_ids:
        # Get all pages from projects
        result = await db.execute(
            select(Page)
            .join(Project)
            .where(
                Project.id.in_(request.project_ids),
                Project.user_id == user.id,
            )
        )
        pages = list(result.scalars().all())
    
    elif request.collection_ids:
        # Get all pages from collections
        result = await db.execute(
            select(Page)
            .join(page_collections)
            .join(Collection)
            .where(
                Collection.id.in_(request.collection_ids),
                Collection.user_id == user.id,
            )
        )
        pages = list(result.scalars().all())
    
    return pages


@router.post("", response_model=ExportResponse)
async def export_content(
    request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export content in the requested format."""
    # Get pages
    pages = await get_pages_for_export(request, current_user, db)
    
    if not pages:
        raise HTTPException(status_code=400, detail="No pages found for export")
    
    # Create export directory
    export_dir = os.path.join(settings.STORAGE_PATH, "exports", str(current_user.id))
    os.makedirs(export_dir, exist_ok=True)
    
    # Generate filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    
    # Export based on format
    if request.format == ExportFormat.MARKDOWN:
        filename, filepath = await export_to_markdown(
            pages, export_dir, timestamp, request.combine_into_single
        )
    elif request.format == ExportFormat.PDF:
        filename, filepath = await export_to_pdf(
            pages, export_dir, timestamp, request.combine_into_single
        )
    elif request.format == ExportFormat.EPUB:
        filename, filepath = await export_to_epub(
            pages, export_dir, timestamp
        )
    elif request.format == ExportFormat.HTML:
        filename, filepath = await export_to_html(
            pages, export_dir, timestamp, request.combine_into_single
        )
    elif request.format == ExportFormat.JSON:
        filename, filepath = await export_to_json(
            pages, export_dir, timestamp, request.include_metadata
        )
    elif request.format == ExportFormat.OBSIDIAN:
        filename, filepath = await export_to_obsidian(
            pages, export_dir, timestamp
        )
    elif request.format == ExportFormat.LLM:
        filename, filepath = await export_to_llm(
            pages, export_dir, timestamp
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")
    
    # Get file size
    file_size = os.path.getsize(filepath)
    
    # Generate download URL
    download_url = f"/api/export/download/{current_user.id}/{filename}"
    
    # Set expiration (24 hours)
    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    
    return ExportResponse(
        download_url=download_url,
        filename=filename,
        format=request.format,
        file_size=file_size,
        page_count=len(pages),
        expires_at=expires_at,
    )


@router.get("/download/{user_id}/{filename}")
async def download_export(
    user_id: str,
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Download an exported file."""
    # Verify ownership
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    filepath = os.path.join(settings.STORAGE_PATH, "exports", user_id, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine media type
    if filename.endswith(".zip"):
        media_type = "application/zip"
    elif filename.endswith(".pdf"):
        media_type = "application/pdf"
    elif filename.endswith(".epub"):
        media_type = "application/epub+zip"
    elif filename.endswith(".json"):
        media_type = "application/json"
    elif filename.endswith(".html"):
        media_type = "text/html"
    else:
        media_type = "text/markdown"
    
    return FileResponse(
        filepath,
        filename=filename,
        media_type=media_type,
    )

