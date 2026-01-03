"""
Export handlers for various formats.
"""
import os
import json
import zipfile
import re
from typing import List, Tuple
from datetime import datetime
from urllib.parse import urlparse

from app.models.page import Page


def sanitize_filename(name: str) -> str:
    """Convert a string to a safe filename."""
    # Remove invalid characters
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    # Replace spaces with underscores
    name = name.replace(" ", "_")
    # Limit length
    return name[:100]


async def export_to_markdown(
    pages: List[Page],
    export_dir: str,
    timestamp: str,
    combine: bool = False,
) -> Tuple[str, str]:
    """Export pages to Markdown format."""
    if combine:
        # Single file with all content
        filename = f"export_{timestamp}.md"
        filepath = os.path.join(export_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# Exported Content\n\n")
            f.write(f"Exported on: {datetime.utcnow().isoformat()}\n\n")
            f.write(f"Total pages: {len(pages)}\n\n")
            f.write("---\n\n")
            
            for page in pages:
                f.write(f"## {page.title or page.url}\n\n")
                f.write(f"URL: {page.url}\n\n")
                f.write(page.content_markdown or "")
                f.write("\n\n---\n\n")
        
        return filename, filepath
    else:
        # Zip file with multiple markdown files
        filename = f"export_{timestamp}.zip"
        filepath = os.path.join(export_dir, filename)
        
        with zipfile.ZipFile(filepath, "w", zipfile.ZIP_DEFLATED) as zf:
            for page in pages:
                page_filename = sanitize_filename(page.title or page.url_hash) + ".md"
                content = f"# {page.title or 'Untitled'}\n\n"
                content += f"URL: {page.url}\n\n"
                content += page.content_markdown or ""
                zf.writestr(page_filename, content.encode("utf-8"))
        
        return filename, filepath


async def export_to_pdf(
    pages: List[Page],
    export_dir: str,
    timestamp: str,
    combine: bool = False,
) -> Tuple[str, str]:
    """Export pages to PDF format."""
    try:
        from weasyprint import HTML, CSS
        
        if combine:
            filename = f"export_{timestamp}.pdf"
            filepath = os.path.join(export_dir, filename)
            
            # Build HTML content
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1, h2, h3 { color: #333; }
                    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
                    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
                    .page-break { page-break-after: always; }
                </style>
            </head>
            <body>
            """
            
            for i, page in enumerate(pages):
                html_content += f"<h1>{page.title or 'Untitled'}</h1>"
                html_content += f"<p><small>Source: {page.url}</small></p>"
                html_content += page.content_html or f"<p>{page.content_text}</p>"
                if i < len(pages) - 1:
                    html_content += '<div class="page-break"></div>'
            
            html_content += "</body></html>"
            
            HTML(string=html_content).write_pdf(filepath)
            
            return filename, filepath
        else:
            # Zip file with multiple PDFs
            filename = f"export_{timestamp}.zip"
            filepath = os.path.join(export_dir, filename)
            
            with zipfile.ZipFile(filepath, "w", zipfile.ZIP_DEFLATED) as zf:
                for page in pages:
                    html_content = f"""
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="utf-8"><style>body {{ font-family: Georgia, serif; }}</style></head>
                    <body>
                        <h1>{page.title or 'Untitled'}</h1>
                        <p><small>Source: {page.url}</small></p>
                        {page.content_html or page.content_text}
                    </body>
                    </html>
                    """
                    
                    pdf_bytes = HTML(string=html_content).write_pdf()
                    pdf_filename = sanitize_filename(page.title or page.url_hash) + ".pdf"
                    zf.writestr(pdf_filename, pdf_bytes)
            
            return filename, filepath
    
    except ImportError:
        # Fallback to markdown if weasyprint not available
        return await export_to_markdown(pages, export_dir, timestamp, combine)


async def export_to_epub(
    pages: List[Page],
    export_dir: str,
    timestamp: str,
) -> Tuple[str, str]:
    """Export pages to EPUB format."""
    try:
        from ebooklib import epub
        
        filename = f"export_{timestamp}.epub"
        filepath = os.path.join(export_dir, filename)
        
        book = epub.EpubBook()
        book.set_identifier(f"webscraper-{timestamp}")
        book.set_title("Exported Content")
        book.set_language("en")
        
        chapters = []
        
        for i, page in enumerate(pages):
            chapter = epub.EpubHtml(
                title=page.title or f"Page {i+1}",
                file_name=f"chapter_{i+1}.xhtml",
                lang="en",
            )
            
            content = f"<h1>{page.title or 'Untitled'}</h1>"
            content += f"<p><small>Source: {page.url}</small></p>"
            content += page.content_html or f"<p>{page.content_text}</p>"
            
            chapter.content = content
            book.add_item(chapter)
            chapters.append(chapter)
        
        # Table of contents
        book.toc = [(epub.Section("Content"), chapters)]
        
        # Spine
        book.spine = ["nav"] + chapters
        
        # Navigation
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        
        epub.write_epub(filepath, book)
        
        return filename, filepath
    
    except ImportError:
        # Fallback to markdown
        return await export_to_markdown(pages, export_dir, timestamp, True)


async def export_to_html(
    pages: List[Page],
    export_dir: str,
    timestamp: str,
    combine: bool = False,
) -> Tuple[str, str]:
    """Export pages to HTML format."""
    if combine:
        filename = f"export_{timestamp}.html"
        filepath = os.path.join(export_dir, filename)
        
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Content</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #fafafa; }
        article { background: white; padding: 30px; margin-bottom: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1 { color: #1a1a1a; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
        h2, h3 { color: #333; }
        a { color: #6366f1; }
        code { background: #f1f1f1; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        pre { background: #1a1a1a; color: #fff; padding: 20px; border-radius: 8px; overflow-x: auto; }
        pre code { background: none; color: inherit; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    </style>
</head>
<body>
"""
        
        for page in pages:
            html += f"""<article>
    <h1>{page.title or 'Untitled'}</h1>
    <div class="meta">Source: <a href="{page.url}">{page.url}</a></div>
    {page.content_html or f'<p>{page.content_text}</p>'}
</article>
"""
        
        html += "</body></html>"
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)
        
        return filename, filepath
    else:
        filename = f"export_{timestamp}.zip"
        filepath = os.path.join(export_dir, filename)
        
        with zipfile.ZipFile(filepath, "w", zipfile.ZIP_DEFLATED) as zf:
            for page in pages:
                page_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{page.title or 'Untitled'}</title>
</head>
<body>
    <h1>{page.title or 'Untitled'}</h1>
    <p>Source: {page.url}</p>
    {page.content_html or page.content_text}
</body>
</html>"""
                html_filename = sanitize_filename(page.title or page.url_hash) + ".html"
                zf.writestr(html_filename, page_html.encode("utf-8"))
        
        return filename, filepath


async def export_to_json(
    pages: List[Page],
    export_dir: str,
    timestamp: str,
    include_metadata: bool = True,
) -> Tuple[str, str]:
    """Export pages to JSON format."""
    filename = f"export_{timestamp}.json"
    filepath = os.path.join(export_dir, filename)
    
    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "total_pages": len(pages),
        "pages": [],
    }
    
    for page in pages:
        page_data = {
            "url": page.url,
            "title": page.title,
            "content_markdown": page.content_markdown,
            "content_text": page.content_text,
        }
        
        if include_metadata:
            page_data.update({
                "meta_description": page.meta_description,
                "word_count": page.word_count,
                "depth": page.depth,
                "scraped_at": page.scraped_at.isoformat() if page.scraped_at else None,
            })
        
        data["pages"].append(page_data)
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return filename, filepath


async def export_to_obsidian(
    pages: List[Page],
    export_dir: str,
    timestamp: str,
) -> Tuple[str, str]:
    """Export pages to Obsidian vault format."""
    filename = f"obsidian_vault_{timestamp}.zip"
    filepath = os.path.join(export_dir, filename)
    
    with zipfile.ZipFile(filepath, "w", zipfile.ZIP_DEFLATED) as zf:
        # Create index file
        index_content = "# Index\n\n"
        
        for page in pages:
            page_title = sanitize_filename(page.title or page.url_hash)
            page_filename = f"{page_title}.md"
            
            # Add to index
            index_content += f"- [[{page_title}]]\n"
            
            # Create page with YAML frontmatter
            content = f"""---
url: {page.url}
title: "{page.title or 'Untitled'}"
scraped_at: {page.scraped_at.isoformat() if page.scraped_at else ''}
word_count: {page.word_count}
---

# {page.title or 'Untitled'}

{page.content_markdown or ''}
"""
            
            zf.writestr(page_filename, content.encode("utf-8"))
        
        # Write index
        zf.writestr("_Index.md", index_content.encode("utf-8"))
    
    return filename, filepath


async def export_to_llm(
    pages: List[Page],
    export_dir: str,
    timestamp: str,
) -> Tuple[str, str]:
    """Export pages optimized for LLM context windows."""
    filename = f"llm_context_{timestamp}.txt"
    filepath = os.path.join(export_dir, filename)
    
    # Build optimized format
    content = "=" * 80 + "\n"
    content += "CONTEXT DOCUMENT\n"
    content += f"Generated: {datetime.utcnow().isoformat()}\n"
    content += f"Total Sources: {len(pages)}\n"
    content += "=" * 80 + "\n\n"
    
    for i, page in enumerate(pages, 1):
        content += f"[SOURCE {i}]\n"
        content += f"Title: {page.title or 'Untitled'}\n"
        content += f"URL: {page.url}\n"
        content += "-" * 40 + "\n"
        
        # Use plain text for cleaner LLM input
        text = page.content_text or ""
        
        # Clean up text
        text = re.sub(r"\s+", " ", text)
        text = text.strip()
        
        content += text + "\n"
        content += "\n" + "=" * 80 + "\n\n"
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    return filename, filepath

