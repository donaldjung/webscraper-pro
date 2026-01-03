"""
Search API endpoints with AI-powered semantic search.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from uuid import UUID
from typing import Optional
import time

from app.db.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.page import Page, PageChunk
from app.schemas.search import SearchQuery, SearchResult, SearchResponse, SuggestResponse
from app.api.auth import get_current_user
from app.core.ai.embeddings import generate_embedding

router = APIRouter()


@router.post("", response_model=SearchResponse)
async def search(
    query: SearchQuery,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search across all scraped content."""
    start_time = time.time()
    results = []
    
    if query.search_type == "semantic":
        results = await semantic_search(query, current_user, db)
    elif query.search_type == "fulltext":
        results = await fulltext_search(query, current_user, db)
    else:  # hybrid
        results = await hybrid_search(query, current_user, db)
    
    took_ms = (time.time() - start_time) * 1000
    
    return SearchResponse(
        results=results,
        total=len(results),
        query=query.query,
        search_type=query.search_type,
        took_ms=took_ms,
    )


async def semantic_search(
    query: SearchQuery,
    user: User,
    db: AsyncSession,
) -> list[SearchResult]:
    """Perform semantic search - fallback to fulltext for SQLite."""
    # For SQLite, we fall back to full-text search since vector search requires pgvector
    return await fulltext_search(query, user, db)


async def fulltext_search(
    query: SearchQuery,
    user: User,
    db: AsyncSession,
) -> list[SearchResult]:
    """Perform full-text search using PostgreSQL."""
    search_term = f"%{query.query}%"
    
    sql_query = (
        select(
            Page.id.label("page_id"),
            Page.url,
            Page.title,
            Project.name.label("project_name"),
            Page.content_text.label("snippet"),
            Page.scraped_at,
        )
        .join(Project, Page.project_id == Project.id)
        .where(Project.user_id == user.id)
        .where(
            Page.content_text.ilike(search_term)
            | Page.title.ilike(search_term)
        )
        .limit(query.limit)
        .offset(query.offset)
    )
    
    result = await db.execute(sql_query)
    rows = result.fetchall()
    
    results = []
    for row in rows:
        # Find snippet around the match
        snippet = row.snippet or ""
        lower_content = snippet.lower()
        lower_query = query.query.lower()
        
        pos = lower_content.find(lower_query)
        if pos != -1:
            start = max(0, pos - 100)
            end = min(len(snippet), pos + len(query.query) + 100)
            snippet = ("..." if start > 0 else "") + snippet[start:end] + ("..." if end < len(snippet) else "")
        else:
            snippet = snippet[:300] + "..." if len(snippet) > 300 else snippet
        
        results.append(
            SearchResult(
                page_id=row.page_id,
                url=row.url,
                title=row.title,
                project_name=row.project_name,
                snippet=snippet,
                highlights=[],
                score=1.0,
                scraped_at=row.scraped_at,
            )
        )
    
    return results


async def hybrid_search(
    query: SearchQuery,
    user: User,
    db: AsyncSession,
) -> list[SearchResult]:
    """Combine semantic and full-text search results."""
    # Get results from both methods
    semantic_results = await semantic_search(query, user, db)
    fulltext_results = await fulltext_search(query, user, db)
    
    # Combine and deduplicate results
    seen_ids = set()
    combined = []
    
    # Interleave results, preferring semantic matches
    for i in range(max(len(semantic_results), len(fulltext_results))):
        if i < len(semantic_results):
            if semantic_results[i].page_id not in seen_ids:
                seen_ids.add(semantic_results[i].page_id)
                combined.append(semantic_results[i])
        
        if i < len(fulltext_results):
            if fulltext_results[i].page_id not in seen_ids:
                seen_ids.add(fulltext_results[i].page_id)
                combined.append(fulltext_results[i])
    
    return combined[:query.limit]


@router.get("/suggest", response_model=SuggestResponse)
async def suggest(
    q: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get search suggestions based on existing content."""
    search_term = f"%{q}%"
    
    # Get matching page titles
    result = await db.execute(
        select(Page.title)
        .join(Project)
        .where(
            Project.user_id == current_user.id,
            Page.title.ilike(search_term),
        )
        .distinct()
        .limit(5)
    )
    
    titles = [row[0] for row in result.fetchall() if row[0]]
    
    return SuggestResponse(suggestions=titles)

