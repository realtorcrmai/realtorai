#!/usr/bin/env python3
"""
Async HTTP client for calling the ListingFlow Next.js API.
Replaces direct SQLite calls for listings, contacts, showings, and feedback
so that Supabase is the single source of truth.
"""

import aiohttp
from config import LISTINGFLOW_API, VOICE_AGENT_API_KEY


class ListingFlowAPI:
    """Async HTTP client for the ListingFlow Next.js voice-agent API routes."""

    def __init__(self):
        self.base_url = LISTINGFLOW_API.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {VOICE_AGENT_API_KEY}",
            "Content-Type": "application/json",
        }
        self._session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def get(self, path: str, params: dict | None = None) -> dict:
        """HTTP GET request. Returns parsed JSON response."""
        session = await self._get_session()
        url = f"{self.base_url}{path}"
        try:
            async with session.get(url, headers=self.headers, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                data = await resp.json()
                if resp.status >= 400:
                    return {"error": data.get("error", f"HTTP {resp.status}"), "_status": resp.status}
                return data
        except aiohttp.ClientError as e:
            return {"error": f"API connection error: {e}"}
        except Exception as e:
            return {"error": f"API error: {e}"}

    async def post(self, path: str, data: dict) -> dict:
        """HTTP POST request. Returns parsed JSON response."""
        session = await self._get_session()
        url = f"{self.base_url}{path}"
        try:
            async with session.post(url, headers=self.headers, json=data, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                result = await resp.json()
                if resp.status >= 400:
                    return {"error": result.get("error", f"HTTP {resp.status}"), "_status": resp.status}
                return result
        except aiohttp.ClientError as e:
            return {"error": f"API connection error: {e}"}
        except Exception as e:
            return {"error": f"API error: {e}"}

    async def patch(self, path: str, data: dict) -> dict:
        """HTTP PATCH request. Returns parsed JSON response."""
        session = await self._get_session()
        url = f"{self.base_url}{path}"
        try:
            async with session.patch(url, headers=self.headers, json=data, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                result = await resp.json()
                if resp.status >= 400:
                    return {"error": result.get("error", f"HTTP {resp.status}"), "_status": resp.status}
                return result
        except aiohttp.ClientError as e:
            return {"error": f"API connection error: {e}"}
        except Exception as e:
            return {"error": f"API error: {e}"}

    async def close(self):
        """Close the underlying aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()


# Singleton instance
api = ListingFlowAPI()
