"""
Content extractor for converting HTML to clean text and Markdown.
"""
import re
from typing import Dict, Optional
from bs4 import BeautifulSoup, NavigableString, Comment
from markdownify import markdownify as md


class ContentExtractor:
    """Extracts and cleans content from HTML pages."""
    
    # Elements to remove completely
    REMOVE_TAGS = [
        "script", "style", "noscript", "iframe", "svg", "canvas",
        "nav", "footer", "aside", "header", "form", "button",
        "advertisement", "ad", "social", "share", "related",
    ]
    
    # Classes and IDs that typically contain non-content
    REMOVE_PATTERNS = [
        re.compile(r"(nav|menu|sidebar|footer|header|comment|ad|social|share|related|popup|modal|cookie|banner)", re.I),
    ]
    
    # Main content indicators
    CONTENT_INDICATORS = [
        "article", "main", "content", "post", "entry", "body",
        "text", "story", "documentation", "docs",
    ]
    
    def extract(self, html: str, url: str = "") -> Dict[str, Optional[str]]:
        """Extract content from HTML."""
        soup = BeautifulSoup(html, "lxml")
        
        # Extract metadata first
        title = self._extract_title(soup)
        description = self._extract_description(soup)
        
        # Remove unwanted elements
        self._clean_soup(soup)
        
        # Find main content
        main_content = self._find_main_content(soup)
        
        # Convert to markdown
        markdown = self._to_markdown(main_content)
        
        # Get plain text
        text = self._to_text(main_content)
        
        return {
            "title": title,
            "description": description,
            "markdown": markdown,
            "text": text,
            "html": str(main_content) if main_content else "",
        }
    
    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page title."""
        # Try og:title first
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"].strip()
        
        # Try regular title tag
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            return title_tag.string.strip()
        
        # Try h1
        h1 = soup.find("h1")
        if h1:
            return h1.get_text().strip()
        
        return None
    
    def _extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page description."""
        # Try og:description
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content"):
            return og_desc["content"].strip()
        
        # Try meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            return meta_desc["content"].strip()
        
        return None
    
    def _clean_soup(self, soup: BeautifulSoup) -> None:
        """Remove unwanted elements from soup."""
        # Remove comments
        for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
            comment.extract()
        
        # Remove script, style, etc.
        for tag_name in self.REMOVE_TAGS:
            for tag in soup.find_all(tag_name):
                tag.decompose()
        
        # Collect elements to remove first (to avoid modifying while iterating)
        elements_to_remove = []
        for element in soup.find_all(True):
            if element is None:
                continue
                
            classes = element.get("class", [])
            if isinstance(classes, str):
                classes = [classes]
            
            element_id = element.get("id", "") or ""
            
            combined = " ".join(classes) + " " + element_id
            
            for pattern in self.REMOVE_PATTERNS:
                if pattern.search(combined):
                    # Don't remove if it's a main content area
                    if not any(ind in combined.lower() for ind in self.CONTENT_INDICATORS):
                        elements_to_remove.append(element)
                        break
        
        # Now remove them
        for element in elements_to_remove:
            try:
                element.decompose()
            except Exception:
                pass
    
    def _find_main_content(self, soup: BeautifulSoup) -> Optional[BeautifulSoup]:
        """Find the main content area of the page."""
        # Try semantic elements first
        for tag in ["main", "article"]:
            element = soup.find(tag)
            if element:
                return element
        
        # Try content indicators in class/id
        for indicator in self.CONTENT_INDICATORS:
            # By ID
            element = soup.find(id=re.compile(indicator, re.I))
            if element and len(element.get_text()) > 100:
                return element
            
            # By class
            element = soup.find(class_=re.compile(indicator, re.I))
            if element and len(element.get_text()) > 100:
                return element
        
        # Fallback to body
        body = soup.find("body")
        if body:
            return body
        
        return soup
    
    def _to_markdown(self, soup: Optional[BeautifulSoup]) -> str:
        """Convert HTML to Markdown."""
        if not soup:
            return ""
        
        # Use markdownify with custom options
        markdown = md(
            str(soup),
            heading_style="atx",
            bullets="-",
            code_language="",
            strip=["script", "style"],
        )
        
        # Clean up excessive whitespace
        markdown = re.sub(r"\n{3,}", "\n\n", markdown)
        markdown = re.sub(r"[ \t]+\n", "\n", markdown)
        markdown = markdown.strip()
        
        return markdown
    
    def _to_text(self, soup: Optional[BeautifulSoup]) -> str:
        """Extract plain text from HTML."""
        if not soup:
            return ""
        
        # Get text with proper spacing
        text = soup.get_text(separator=" ", strip=True)
        
        # Clean up whitespace
        text = re.sub(r"\s+", " ", text)
        text = text.strip()
        
        return text

