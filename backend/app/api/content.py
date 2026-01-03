"""
Content API endpoints for managing scraped pages.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from uuid import UUID
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.page import Page, PageVersion
from app.schemas.page import PageResponse, PageDetail, PageListResponse, PageVersionResponse, PageUpdate
from app.api.auth import get_current_user

router = APIRouter()


@router.get("", response_model=PageListResponse)
async def list_pages(
    project_id: Optional[UUID] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("scraped_at", pattern="^(scraped_at|title|word_count|depth)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List pages with filtering and pagination."""
    # Build query
    query = select(Page).join(Project).where(Project.user_id == str(current_user.id))
    
    if project_id:
        query = query.where(Page.project_id == str(project_id))
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Page.title.ilike(search_term),
                Page.url.ilike(search_term),
                Page.content_text.ilike(search_term),
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    sort_column = getattr(Page, sort_by)
    if sort_order == "desc":
        sort_column = sort_column.desc()
    query = query.order_by(sort_column)
    
    # Apply pagination
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    pages = result.scalars().all()
    
    return PageListResponse(
        pages=[PageResponse.model_validate(p) for p in pages],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page,
    )


@router.get("/{page_id}", response_model=PageDetail)
async def get_page(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full page details."""
    result = await db.execute(
        select(Page)
        .join(Project)
        .where(
            Page.id == str(page_id),
            Project.user_id == str(current_user.id),
        )
    )
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Get version count
    version_count_result = await db.execute(
        select(func.count(PageVersion.id)).where(PageVersion.page_id == page.id)
    )
    versions_count = version_count_result.scalar()
    
    # Get tags
    tags = [tag.name for tag in page.tags] if hasattr(page, 'tags') else []
    
    # Get collections
    collections = [c.name for c in page.collections] if hasattr(page, 'collections') else []
    
    return PageDetail(
        id=page.id,
        project_id=page.project_id,
        url=page.url,
        title=page.title,
        content_markdown=page.content_markdown,
        content_html=page.content_html,
        content_text=page.content_text,
        meta_description=page.meta_description,
        word_count=page.word_count,
        depth=page.depth,
        scraped_at=page.scraped_at,
        updated_at=page.updated_at,
        versions_count=versions_count,
        tags=tags,
        collections=collections,
    )


@router.patch("/{page_id}", response_model=PageDetail)
async def update_page(
    page_id: UUID,
    page_data: PageUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update page metadata (tags, collections)."""
    result = await db.execute(
        select(Page)
        .join(Project)
        .where(
            Page.id == str(page_id),
            Project.user_id == str(current_user.id),
        )
    )
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    if page_data.title is not None:
        page.title = page_data.title
    
    # Handle tags and collections updates if provided
    # (would need to fetch and update relationships)
    
    await db.commit()
    await db.refresh(page)
    
    return await get_page(page_id, current_user, db)


@router.delete("/{page_id}")
async def delete_page(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a page."""
    result = await db.execute(
        select(Page)
        .join(Project)
        .where(
            Page.id == str(page_id),
            Project.user_id == str(current_user.id),
        )
    )
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    await db.delete(page)
    await db.commit()
    
    return {"message": "Page deleted successfully"}


@router.get("/{page_id}/versions", response_model=list[PageVersionResponse])
async def get_page_versions(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all versions of a page."""
    # Verify access
    result = await db.execute(
        select(Page)
        .join(Project)
        .where(
            Page.id == str(page_id),
            Project.user_id == str(current_user.id),
        )
    )
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    result = await db.execute(
        select(PageVersion)
        .where(PageVersion.page_id == str(page_id))
        .order_by(PageVersion.version_number.desc())
    )
    versions = result.scalars().all()
    
    return [PageVersionResponse.model_validate(v) for v in versions]


@router.get("/{page_id}/versions/{version_id}", response_model=PageVersionResponse)
async def get_page_version(
    page_id: UUID,
    version_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific version of a page."""
    # Verify access
    result = await db.execute(
        select(Page)
        .join(Project)
        .where(
            Page.id == str(page_id),
            Project.user_id == str(current_user.id),
        )
    )
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    result = await db.execute(
        select(PageVersion).where(
            PageVersion.id == str(version_id),
            PageVersion.page_id == str(page_id),
        )
    )
    version = result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return PageVersionResponse.model_validate(version)

