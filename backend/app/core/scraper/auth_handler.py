"""
Authentication handler for different authentication methods.
"""
import asyncio
from typing import Tuple, Dict, Optional
from enum import Enum

from app.models.project import AuthMethod


class AuthHandler:
    """Handles authentication for scraping protected content."""
    
    def __init__(self, method: AuthMethod, config: Dict):
        self.method = method
        self.config = config or {}
    
    async def get_credentials(self) -> Tuple[Dict, Dict]:
        """Get cookies and headers for authenticated requests."""
        if self.method == AuthMethod.NONE:
            return {}, {}
        
        elif self.method == AuthMethod.BROWSER_COOKIES:
            return await self._get_browser_cookies()
        
        elif self.method == AuthMethod.MANUAL_LOGIN:
            return await self._manual_login()
        
        elif self.method == AuthMethod.CREDENTIALS:
            return await self._credential_login()
        
        return {}, {}
    
    async def _get_browser_cookies(self) -> Tuple[Dict, Dict]:
        """Extract cookies from installed browser."""
        browser = self.config.get("browser", "chrome")
        domain = self.config.get("domain", "")
        
        cookies = {}
        
        try:
            import browser_cookie3
            
            if browser == "chrome":
                cookie_jar = browser_cookie3.chrome(domain_name=domain)
            elif browser == "firefox":
                cookie_jar = browser_cookie3.firefox(domain_name=domain)
            elif browser == "safari":
                cookie_jar = browser_cookie3.safari(domain_name=domain)
            elif browser == "edge":
                cookie_jar = browser_cookie3.edge(domain_name=domain)
            else:
                # Try to load from any browser
                cookie_jar = browser_cookie3.load(domain_name=domain)
            
            for cookie in cookie_jar:
                if domain in cookie.domain:
                    cookies[cookie.name] = cookie.value
        
        except Exception as e:
            print(f"Failed to extract browser cookies: {e}")
        
        return cookies, {}
    
    async def _manual_login(self) -> Tuple[Dict, Dict]:
        """Open browser for manual login and capture cookies."""
        login_url = self.config.get("login_url", "")
        wait_for_url = self.config.get("wait_for_url", "")
        timeout = self.config.get("timeout", 120)
        
        cookies = {}
        
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                # Launch visible browser
                browser = await p.chromium.launch(headless=False)
                context = await browser.new_context()
                page = await context.new_page()
                
                # Navigate to login page
                await page.goto(login_url)
                
                # Wait for user to login
                print(f"Please login in the browser window. Waiting up to {timeout} seconds...")
                
                if wait_for_url:
                    # Wait for redirect to specific URL
                    await page.wait_for_url(
                        wait_for_url,
                        timeout=timeout * 1000,
                    )
                else:
                    # Wait for any navigation away from login page
                    await asyncio.sleep(timeout)
                
                # Extract cookies
                context_cookies = await context.cookies()
                for cookie in context_cookies:
                    cookies[cookie["name"]] = cookie["value"]
                
                await browser.close()
        
        except Exception as e:
            print(f"Manual login failed: {e}")
        
        return cookies, {}
    
    async def _credential_login(self) -> Tuple[Dict, Dict]:
        """Login programmatically with credentials."""
        login_url = self.config.get("login_url", "")
        username = self.config.get("username", "")
        password = self.config.get("password", "")
        username_field = self.config.get("username_field", "username")
        password_field = self.config.get("password_field", "password")
        submit_selector = self.config.get("submit_selector", "button[type=submit]")
        
        cookies = {}
        
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context()
                page = await context.new_page()
                
                # Navigate to login page
                await page.goto(login_url)
                
                # Fill in credentials
                await page.fill(f'input[name="{username_field}"]', username)
                await page.fill(f'input[name="{password_field}"]', password)
                
                # Submit form
                await page.click(submit_selector)
                
                # Wait for navigation
                await page.wait_for_load_state("networkidle")
                
                # Extract cookies
                context_cookies = await context.cookies()
                for cookie in context_cookies:
                    cookies[cookie["name"]] = cookie["value"]
                
                await browser.close()
        
        except Exception as e:
            print(f"Credential login failed: {e}")
        
        return cookies, {}

