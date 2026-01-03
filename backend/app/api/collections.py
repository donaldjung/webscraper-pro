"""
Collections and Tags API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
import secrets

from app.db.database import get_db
from app.models.user import User
from app.models.collection import Collection, Tag, page_collections
from app.models.page import Page
from app.schemas.collection import (
    CollectionCreate, CollectionResponse, CollectionUpdate, CollectionListResponse,
    TagCreate, TagResponse,
)
from app.api.auth import get_current_user, get_optional_user

router = APIRouter()


# Collections endpoints

@router.get("", response_model=CollectionListResponse)
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all collections for the current user."""
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.updated_at.desc())
    )
    collections = result.scalars().all()
    
    collection_responses = []
    for collection in collections:
        # Get page count
        page_count_result = await db.execute(
            select(func.count())
            .select_from(page_collections)
            .where(page_collections.c.collection_id == collection.id)
        )
        page_count = page_count_result.scalar()
        
        collection_responses.append(
            CollectionResponse(
                id=collection.id,
                name=collection.name,
                description=collection.description,
                color=collection.color,
                icon=collection.icon,
                is_public=collection.is_public,
                share_token=collection.share_token,
                page_count=page_count,
                created_at=collection.created_at,
                updated_at=collection.updated_at,
            )
        )
    
    return CollectionListResponse(
        collections=collection_responses,
        total=len(collection_responses),
    )


@router.post("", response_model=CollectionResponse)
async def create_collection(
    collection_data: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new collection."""
    collection = Collection(
        user_id=current_user.id,
        name=collection_data.name,
        description=collection_data.description,
        color=collection_data.color,
        icon=collection_data.icon,
    )
    
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_public=collection.is_public,
        share_token=collection.share_token,
        page_count=0,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(
    collection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific collection."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get page count
    page_count_result = await db.execute(
        select(func.count())
        .select_from(page_collections)
        .where(page_collections.c.collection_id == collection.id)
    )
    page_count = page_count_result.scalar()
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_public=collection.is_public,
        share_token=collection.share_token,
        page_count=page_count,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: UUID,
    collection_data: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a collection."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    if collection_data.name is not None:
        collection.name = collection_data.name
    if collection_data.description is not None:
        collection.description = collection_data.description
    if collection_data.color is not None:
        collection.color = collection_data.color
    if collection_data.icon is not None:
        collection.icon = collection_data.icon
    if collection_data.is_public is not None:
        collection.is_public = collection_data.is_public
        if collection_data.is_public and not collection.share_token:
            collection.share_token = secrets.token_urlsafe(32)
    
    await db.commit()
    await db.refresh(collection)
    
    return await get_collection(collection_id, current_user, db)


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a collection."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    await db.delete(collection)
    await db.commit()
    
    return {"message": "Collection deleted successfully"}


@router.post("/{collection_id}/pages/{page_id}")
async def add_page_to_collection(
    collection_id: UUID,
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a page to a collection."""
    # Verify collection ownership
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Verify page access
    result = await db.execute(
        select(Page).where(Page.id == page_id)
    )
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Add to collection
    await db.execute(
        page_collections.insert().values(
            page_id=page_id,
            collection_id=collection_id,
        )
    )
    await db.commit()
    
    return {"message": "Page added to collection"}


@router.delete("/{collection_id}/pages/{page_id}")
async def remove_page_from_collection(
    collection_id: UUID,
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a page from a collection."""
    # Verify collection ownership
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Remove from collection
    await db.execute(
        page_collections.delete().where(
            page_collections.c.page_id == page_id,
            page_collections.c.collection_id == collection_id,
        )
    )
    await db.commit()
    
    return {"message": "Page removed from collection"}


@router.get("/shared/{share_token}")
async def get_shared_collection(
    share_token: str,
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a publicly shared collection."""
    result = await db.execute(
        select(Collection).where(
            Collection.share_token == share_token,
            Collection.is_public == True,
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get pages in collection
    result = await db.execute(
        select(Page)
        .join(page_collections)
        .where(page_collections.c.collection_id == collection.id)
    )
    pages = result.scalars().all()
    
    return {
        "collection": CollectionResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            color=collection.color,
            icon=collection.icon,
            is_public=collection.is_public,
            share_token=collection.share_token,
            page_count=len(pages),
            created_at=collection.created_at,
            updated_at=collection.updated_at,
        ),
        "pages": pages,
    }


# Tags endpoints

@router.get("/tags", response_model=list[TagResponse])
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tags for the current user."""
    result = await db.execute(
        select(Tag).where(Tag.user_id == current_user.id)
    )
    tags = result.scalars().all()
    
    return [
        TagResponse(
            id=tag.id,
            name=tag.name,
            color=tag.color,
            page_count=len(tag.pages) if hasattr(tag, 'pages') else 0,
            created_at=tag.created_at,
        )
        for tag in tags
    ]


@router.post("/tags", response_model=TagResponse)
async def create_tag(
    tag_data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tag."""
    tag = Tag(
        user_id=current_user.id,
        name=tag_data.name,
        color=tag_data.color,
    )
    
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    
    return TagResponse(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        page_count=0,
        created_at=tag.created_at,
    )


@router.delete("/tags/{tag_id}")
async def delete_tag(
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a tag."""
    result = await db.execute(
        select(Tag).where(
            Tag.id == tag_id,
            Tag.user_id == current_user.id,
        )
    )
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    await db.delete(tag)
    await db.commit()
    
    return {"message": "Tag deleted successfully"}

