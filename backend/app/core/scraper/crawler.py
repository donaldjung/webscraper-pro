"""
URL crawler for discovering and filtering links.
"""
import re
from urllib.parse import urljoin, urlparse
from typing import List, Optional
from bs4 import BeautifulSoup
import httpx


class Crawler:
    """Handles URL discovery and filtering."""
    
    def __init__(
        self,
        base_url: str,
        max_depth: int = 3,
        max_pages: int = 100,
        include_patterns: List[str] = None,
        exclude_patterns: List[str] = None,
        follow_external: bool = False,
        respect_robots: bool = True,
    ):
        self.base_url = base_url
        self.base_parsed = urlparse(base_url)
        self.base_domain = self.base_parsed.netloc
        
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.follow_external = follow_external
        self.respect_robots = respect_robots
        
        # Compile patterns
        self.include_patterns = [
            re.compile(p) for p in (include_patterns or [])
        ]
        self.exclude_patterns = [
            re.compile(p) for p in (exclude_patterns or [])
        ]
        
        # Default exclusions
        self.default_exclude = [
            re.compile(r'\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|tar|gz|mp4|mp3|wav|avi)$', re.I),
            re.compile(r'(logout|signout|login|signin|auth)', re.I),
            re.compile(r'#.*$'),  # Anchors
            re.compile(r'\?.*$'),  # Query strings (optional, can be removed)
        ]
        
        self.robots_rules: dict = {}
    
    async def fetch_robots(self, client: httpx.AsyncClient) -> None:
        """Fetch and parse robots.txt."""
        if not self.respect_robots:
            return
        
        robots_url = f"{self.base_parsed.scheme}://{self.base_domain}/robots.txt"
        
        try:
            response = await client.get(robots_url)
            if response.status_code == 200:
                self._parse_robots(response.text)
        except Exception:
            pass  # Ignore robots.txt errors
    
    def _parse_robots(self, content: str) -> None:
        """Parse robots.txt content."""
        current_agent = None
        
        for line in content.split("\n"):
            line = line.strip().lower()
            
            if line.startswith("user-agent:"):
                agent = line.split(":", 1)[1].strip()
                if agent == "*" or "webscraper" in agent:
                    current_agent = agent
            
            elif line.startswith("disallow:") and current_agent:
                path = line.split(":", 1)[1].strip()
                if path:
                    if current_agent not in self.robots_rules:
                        self.robots_rules[current_agent] = []
                    self.robots_rules[current_agent].append(path)
    
    def is_allowed(self, url: str) -> bool:
        """Check if URL is allowed by robots.txt."""
        if not self.respect_robots or not self.robots_rules:
            return True
        
        parsed = urlparse(url)
        path = parsed.path
        
        # Check all relevant rules
        for agent, disallowed in self.robots_rules.items():
            for pattern in disallowed:
                if path.startswith(pattern):
                    return False
        
        return True
    
    def extract_links(self, html: str, current_url: str) -> List[str]:
        """Extract and filter links from HTML content."""
        soup = BeautifulSoup(html, "lxml")
        links = []
        
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            
            # Skip javascript and mailto links
            if href.startswith(("javascript:", "mailto:", "tel:")):
                continue
            
            # Resolve relative URLs
            absolute_url = urljoin(current_url, href)
            
            # Normalize URL (remove fragments)
            parsed = urlparse(absolute_url)
            normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            if parsed.query:
                normalized += f"?{parsed.query}"
            
            # Apply filters
            if self._should_include(normalized):
                links.append(normalized)
        
        return list(set(links))  # Deduplicate
    
    def _should_include(self, url: str) -> bool:
        """Determine if a URL should be included in the crawl."""
        parsed = urlparse(url)
        
        # Check domain
        if not self.follow_external:
            if parsed.netloc != self.base_domain:
                return False
        
        # Check default exclusions
        for pattern in self.default_exclude:
            if pattern.search(url):
                return False
        
        # Check user exclusions
        for pattern in self.exclude_patterns:
            if pattern.search(url):
                return False
        
        # Check user inclusions (if specified, URL must match at least one)
        if self.include_patterns:
            if not any(p.search(url) for p in self.include_patterns):
                return False
        
        # Check robots.txt
        if not self.is_allowed(url):
            return False
        
        return True
    
    def get_sitemap_urls(self, sitemap_content: str) -> List[str]:
        """Extract URLs from a sitemap."""
        soup = BeautifulSoup(sitemap_content, "lxml-xml")
        urls = []
        
        # Handle sitemap index
        for sitemap in soup.find_all("sitemap"):
            loc = sitemap.find("loc")
            if loc:
                urls.append(loc.text.strip())
        
        # Handle regular sitemap
        for url in soup.find_all("url"):
            loc = url.find("loc")
            if loc:
                urls.append(loc.text.strip())
        
        return urls

