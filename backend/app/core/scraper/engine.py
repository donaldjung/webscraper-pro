"""
Main scraper engine that orchestrates the scraping process.
"""
import asyncio
import hashlib
from datetime import datetime
from typing import Callable, Optional
from urllib.parse import urljoin, urlparse
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.project import Project, ScrapeJob, ScrapeStatus
from app.models.page import Page, PageVersion, PageChunk
from app.core.scraper.crawler import Crawler
from app.core.scraper.extractor import ContentExtractor
from app.core.scraper.auth_handler import AuthHandler
from app.core.ai.embeddings import generate_embedding, chunk_text
from app.core.config import settings


class ScraperEngine:
    """Orchestrates the web scraping process."""
    
    def __init__(
        self,
        project: Project,
        job: ScrapeJob,
        db: AsyncSession,
        on_progress: Optional[Callable] = None,
    ):
        self.project = project
        self.job = job
        self.db = db
        self.on_progress = on_progress
        
        self.config = project.scrape_config
        self.extractor = ContentExtractor()
        self.crawler = Crawler(
            base_url=project.base_url,
            max_depth=self.config.get("max_depth", 3),
            max_pages=self.config.get("max_pages", 100),
            include_patterns=self.config.get("include_patterns", []),
            exclude_patterns=self.config.get("exclude_patterns", []),
            follow_external=self.config.get("follow_external", False),
            respect_robots=self.config.get("respect_robots", True),
        )
        
        self.visited_urls: set[str] = set()
        self.url_queue: asyncio.Queue = asyncio.Queue()
        self.cookies: dict = {}
        self.headers: dict = {
            "User-Agent": "WebScraperPro/1.0 (Content Extraction Tool)",
        }
        
        self._cancelled = False
    
    async def run(self):
        """Run the scraping process."""
        try:
            # Setup authentication if needed
            await self._setup_auth()
            
            # Initialize with base URL
            await self.url_queue.put((self.project.base_url, 0))
            
            # Create HTTP client
            async with httpx.AsyncClient(
                cookies=self.cookies,
                headers=self.headers,
                timeout=settings.DEFAULT_TIMEOUT,
                follow_redirects=True,
            ) as client:
                # Process URLs
                workers = [
                    asyncio.create_task(self._worker(client, i))
                    for i in range(min(settings.MAX_CONCURRENT_SCRAPES, 3))
                ]
                
                # Wait for queue to be empty
                await self.url_queue.join()
                
                # Cancel workers
                for worker in workers:
                    worker.cancel()
            
            # Update job status
            self.job.status = ScrapeStatus.COMPLETED
            self.job.completed_at = datetime.utcnow()
            await self.db.commit()
            
        except asyncio.CancelledError:
            self.job.status = ScrapeStatus.CANCELLED
            await self.db.commit()
            raise
        except Exception as e:
            self.job.status = ScrapeStatus.FAILED
            self.job.error_message = str(e)
            await self.db.commit()
            raise
    
    async def _setup_auth(self):
        """Setup authentication based on project configuration."""
        auth_handler = AuthHandler(
            method=self.project.auth_method,
            config=self.project.auth_config,
        )
        
        self.cookies, self.headers = await auth_handler.get_credentials()
    
    async def _worker(self, client: httpx.AsyncClient, worker_id: int):
        """Worker task that processes URLs from the queue."""
        while True:
            try:
                url, depth = await asyncio.wait_for(
                    self.url_queue.get(),
                    timeout=10.0,
                )
            except asyncio.TimeoutError:
                continue
            
            try:
                if self._cancelled:
                    break
                
                if url in self.visited_urls:
                    self.url_queue.task_done()
                    continue
                
                self.visited_urls.add(url)
                
                # Check limits
                if len(self.visited_urls) > self.config.get("max_pages", 100):
                    self.url_queue.task_done()
                    continue
                
                # Scrape the page
                await self._scrape_page(client, url, depth)
                
                # Rate limiting
                await asyncio.sleep(self.config.get("rate_limit", 1.0))
                
            except Exception as e:
                # Log error
                self.job.pages_failed += 1
                self.job.error_log = self.job.error_log or []
                self.job.error_log.append({
                    "url": url,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                })
                await self.db.commit()
                
                if self.on_progress:
                    self.on_progress({
                        "type": "page_failed",
                        "data": {"url": url, "error": str(e)},
                        "timestamp": datetime.utcnow().isoformat(),
                    })
            finally:
                self.url_queue.task_done()
    
    async def _scrape_page(self, client: httpx.AsyncClient, url: str, depth: int):
        """Scrape a single page."""
        # Broadcast discovery
        self.job.pages_discovered += 1
        await self.db.commit()
        
        if self.on_progress:
            self.on_progress({
                "type": "page_discovered",
                "data": {"url": url, "depth": depth},
                "timestamp": datetime.utcnow().isoformat(),
            })
        
        # Fetch the page
        response = await client.get(url)
        response.raise_for_status()
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type.lower():
            return
        
        html_content = response.text
        
        # Extract content
        extracted = self.extractor.extract(html_content, url)
        
        # Generate URL hash for deduplication
        url_hash = hashlib.sha256(url.encode()).hexdigest()
        
        # Check if page already exists (for versioning)
        result = await self.db.execute(
            select(Page).where(
                Page.project_id == self.project.id,
                Page.url_hash == url_hash,
            )
        )
        existing_page = result.scalar_one_or_none()
        
        if existing_page:
            # Check if content changed
            new_content_hash = hashlib.sha256(
                extracted["markdown"].encode()
            ).hexdigest()
            
            old_content_hash = hashlib.sha256(
                (existing_page.content_markdown or "").encode()
            ).hexdigest()
            
            if new_content_hash != old_content_hash:
                # Create new version
                version_count = len(existing_page.versions) + 1
                version = PageVersion(
                    page_id=existing_page.id,
                    content_markdown=extracted["markdown"],
                    content_hash=new_content_hash,
                    version_number=version_count,
                )
                self.db.add(version)
                
                # Update page content
                existing_page.content_markdown = extracted["markdown"]
                existing_page.content_html = html_content
                existing_page.content_text = extracted["text"]
                existing_page.title = extracted["title"]
                existing_page.meta_description = extracted["description"]
                existing_page.word_count = len(extracted["text"].split())
                existing_page.updated_at = datetime.utcnow()
        else:
            # Create new page
            page = Page(
                project_id=self.project.id,
                scrape_job_id=self.job.id,
                url=url,
                url_hash=url_hash,
                title=extracted["title"],
                content_markdown=extracted["markdown"],
                content_html=html_content,
                content_text=extracted["text"],
                meta_description=extracted["description"],
                word_count=len(extracted["text"].split()),
                depth=depth,
            )
            self.db.add(page)
            await self.db.flush()
            
            # Generate chunks (skip embeddings for SQLite)
            chunks = chunk_text(extracted["text"])
            for i, chunk_text_content in enumerate(chunks):
                chunk = PageChunk(
                    page_id=page.id,
                    content=chunk_text_content,
                    chunk_index=i,
                    token_count=len(chunk_text_content.split()),
                )
                self.db.add(chunk)
        
        await self.db.commit()
        
        # Update job progress
        self.job.pages_scraped += 1
        await self.db.commit()
        
        if self.on_progress:
            self.on_progress({
                "type": "page_scraped",
                "data": {
                    "url": url,
                    "title": extracted["title"],
                    "word_count": len(extracted["text"].split()),
                },
                "timestamp": datetime.utcnow().isoformat(),
            })
        
        # Extract and queue new links
        if depth < self.config.get("max_depth", 3):
            links = self.crawler.extract_links(html_content, url)
            for link in links:
                if link not in self.visited_urls:
                    await self.url_queue.put((link, depth + 1))
    
    def cancel(self):
        """Cancel the scraping process."""
        self._cancelled = True

