"""
Scraping API endpoints with WebSocket support.
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime
import asyncio
import json

from app.db.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.project import Project, ScrapeJob, ScrapeStatus
from app.schemas.scrape import ScrapeJobCreate, ScrapeJobResponse, ScrapeProgress
from app.api.auth import get_current_user
from app.core.scraper.engine import ScraperEngine

router = APIRouter()

# Store active WebSocket connections
active_connections: dict[str, list[WebSocket]] = {}


class ConnectionManager:
    """Manage WebSocket connections for scrape jobs."""
    
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, job_id: str):
        if job_id in self.active_connections:
            self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
    
    async def broadcast(self, job_id: str, message: dict):
        if job_id in self.active_connections:
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


async def run_scrape_job(job_id: UUID):
    """Background task to run a scrape job."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Starting scrape job: {job_id}")
    
    async with AsyncSessionLocal() as db:
        # Get the job (convert UUID to string for SQLite)
        result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == str(job_id)))
        job = result.scalar_one_or_none()
        
        if not job:
            logger.error(f"Job not found: {job_id}")
            return
        
        # Get the project
        result = await db.execute(select(Project).where(Project.id == str(job.project_id)))
        project = result.scalar_one_or_none()
        
        if not project:
            logger.error(f"Project not found: {job.project_id}")
            return
        
        # Update job status
        job.status = ScrapeStatus.RUNNING
        job.started_at = datetime.utcnow()
        await db.commit()
        
        # Broadcast status update
        await manager.broadcast(str(job_id), {
            "type": "status_changed",
            "data": {"status": "running"},
            "timestamp": datetime.utcnow().isoformat(),
        })
        
        try:
            # Create scraper engine
            engine = ScraperEngine(
                project=project,
                job=job,
                db=db,
                on_progress=lambda data: asyncio.create_task(
                    manager.broadcast(str(job_id), data)
                ),
            )
            
            # Run the scraper
            await engine.run()
            
            # Update job status on success
            job.status = ScrapeStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            await db.commit()
            
            await manager.broadcast(str(job_id), {
                "type": "status_changed",
                "data": {"status": "completed"},
                "timestamp": datetime.utcnow().isoformat(),
            })
            
        except Exception as e:
            import traceback
            logger.error(f"Scrape job failed: {job_id}")
            logger.error(traceback.format_exc())
            
            # Update job status on failure
            job.status = ScrapeStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            await db.commit()
            
            await manager.broadcast(str(job_id), {
                "type": "error",
                "data": {"message": str(e)},
                "timestamp": datetime.utcnow().isoformat(),
            })


@router.post("/start", response_model=ScrapeJobResponse)
async def start_scrape(
    scrape_data: ScrapeJobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a new scrape job."""
    # Verify project ownership (convert UUID to string for SQLite comparison)
    result = await db.execute(
        select(Project).where(
            Project.id == str(scrape_data.project_id),
            Project.user_id == str(current_user.id),
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check for active jobs
    result = await db.execute(
        select(ScrapeJob).where(
            ScrapeJob.project_id == project.id,
            ScrapeJob.status.in_([ScrapeStatus.PENDING, ScrapeStatus.RUNNING]),
        )
    )
    active_job = result.scalar_one_or_none()
    
    if active_job:
        raise HTTPException(status_code=400, detail="A scrape job is already running for this project")
    
    # Create new job
    job = ScrapeJob(
        project_id=project.id,
        status=ScrapeStatus.PENDING,
        config_snapshot=project.scrape_config,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Start background task
    background_tasks.add_task(run_scrape_job, job.id)
    
    return ScrapeJobResponse.model_validate(job)


@router.get("/jobs/{job_id}", response_model=ScrapeJobResponse)
async def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get scrape job status."""
    result = await db.execute(
        select(ScrapeJob)
        .join(Project)
        .where(
            ScrapeJob.id == str(job_id),
            Project.user_id == str(current_user.id),
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return ScrapeJobResponse.model_validate(job)


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a running scrape job."""
    result = await db.execute(
        select(ScrapeJob)
        .join(Project)
        .where(
            ScrapeJob.id == str(job_id),
            Project.user_id == str(current_user.id),
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in [ScrapeStatus.PENDING, ScrapeStatus.RUNNING]:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled")
    
    job.status = ScrapeStatus.CANCELLED
    job.completed_at = datetime.utcnow()
    await db.commit()
    
    await manager.broadcast(str(job_id), {
        "type": "status_changed",
        "data": {"status": "cancelled"},
        "timestamp": datetime.utcnow().isoformat(),
    })
    
    return {"message": "Job cancelled"}


@router.get("/project/{project_id}/jobs")
async def list_project_jobs(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all scrape jobs for a project."""
    # Verify project ownership
    result = await db.execute(
        select(Project).where(
            Project.id == str(project_id),
            Project.user_id == str(current_user.id),
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.execute(
        select(ScrapeJob)
        .where(ScrapeJob.project_id == str(project_id))
        .order_by(ScrapeJob.created_at.desc())
    )
    jobs = result.scalars().all()
    
    return [ScrapeJobResponse.model_validate(job) for job in jobs]


@router.websocket("/ws/{job_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    job_id: str,
):
    """WebSocket endpoint for real-time scrape progress."""
    await manager.connect(websocket, job_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, job_id)

