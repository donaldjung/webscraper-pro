"""
Projects API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.project import Project, ScrapeJob
from app.models.page import Page
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectListResponse
from app.api.auth import get_current_user

router = APIRouter()


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all projects for the current user."""
    # Get projects with page count
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    projects = result.scalars().all()
    
    # Get total count
    count_result = await db.execute(
        select(func.count(Project.id)).where(Project.user_id == current_user.id)
    )
    total = count_result.scalar()
    
    # Add page counts
    project_responses = []
    for project in projects:
        page_count_result = await db.execute(
            select(func.count(Page.id)).where(Page.project_id == project.id)
        )
        page_count = page_count_result.scalar()
        
        # Get last scraped date
        last_job_result = await db.execute(
            select(ScrapeJob.completed_at)
            .where(ScrapeJob.project_id == project.id)
            .order_by(ScrapeJob.completed_at.desc())
            .limit(1)
        )
        last_scraped = last_job_result.scalar()
        
        project_responses.append(ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            base_url=project.base_url,
            auth_method=project.auth_method.value,
            scrape_config=project.scrape_config,
            created_at=project.created_at,
            updated_at=project.updated_at,
            page_count=page_count,
            last_scraped=last_scraped,
        ))
    
    return ProjectListResponse(projects=project_responses, total=total)


@router.post("", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project."""
    project = Project(
        user_id=current_user.id,
        name=project_data.name,
        description=project_data.description,
        base_url=project_data.base_url,
        auth_method=project_data.auth_method,
        auth_config=project_data.auth_config or {},
        scrape_config=project_data.scrape_config.model_dump() if project_data.scrape_config else {},
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        base_url=project.base_url,
        auth_method=project.auth_method.value,
        scrape_config=project.scrape_config,
        created_at=project.created_at,
        updated_at=project.updated_at,
        page_count=0,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific project."""
    result = await db.execute(
        select(Project).where(
            Project.id == str(project_id),
            Project.user_id == str(current_user.id),
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get page count
    page_count_result = await db.execute(
        select(func.count(Page.id)).where(Page.project_id == project.id)
    )
    page_count = page_count_result.scalar()
    
    # Get last scraped date
    last_job_result = await db.execute(
        select(ScrapeJob.completed_at)
        .where(ScrapeJob.project_id == project.id)
        .order_by(ScrapeJob.completed_at.desc())
        .limit(1)
    )
    last_scraped = last_job_result.scalar()
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        base_url=project.base_url,
        auth_method=project.auth_method.value,
        scrape_config=project.scrape_config,
        created_at=project.created_at,
        updated_at=project.updated_at,
        page_count=page_count,
        last_scraped=last_scraped,
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a project."""
    result = await db.execute(
        select(Project).where(
            Project.id == str(project_id),
            Project.user_id == str(current_user.id),
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    if project_data.base_url is not None:
        project.base_url = project_data.base_url
    if project_data.auth_method is not None:
        project.auth_method = project_data.auth_method
    if project_data.auth_config is not None:
        project.auth_config = project_data.auth_config
    if project_data.scrape_config is not None:
        project.scrape_config = project_data.scrape_config.model_dump()
    
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        base_url=project.base_url,
        auth_method=project.auth_method.value,
        scrape_config=project.scrape_config,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project and all its data."""
    result = await db.execute(
        select(Project).where(
            Project.id == str(project_id),
            Project.user_id == str(current_user.id),
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()
    
    return {"message": "Project deleted successfully"}

