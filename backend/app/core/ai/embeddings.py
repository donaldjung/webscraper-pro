"""
AI embedding generation and text chunking utilities.
Simplified version without OpenAI dependency for local development.
"""
from typing import List, Optional

from app.core.config import settings


async def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding vector for text. Returns None without OpenAI."""
    # OpenAI not configured - skip embeddings for SQLite/local dev
    return None


def chunk_text(
    text: str,
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[str]:
    """Split text into chunks based on word count."""
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
    
    if not text:
        return []
    
    # Simple word-based chunking
    words = text.split()
    
    if len(words) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        
        # Move to next chunk with overlap
        start = end - chunk_overlap
    
    return chunks


async def generate_summary(text: str, max_length: int = 200) -> Optional[str]:
    """Generate a summary of the text. Returns None without OpenAI."""
    return None


async def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    """Extract keywords from text. Returns empty without OpenAI."""
    return []

