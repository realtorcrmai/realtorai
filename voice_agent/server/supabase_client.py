"""
Async Supabase REST client for the Voice Agent Python server.
Replaces SQLite with direct Supabase queries via httpx.
All queries include tenant_id for multi-tenant isolation.
"""
from __future__ import annotations


import os
import httpx
from typing import Any, Optional

SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Reuse a single async client for connection pooling
_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=f"{SUPABASE_URL}/rest/v1",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            timeout=30.0,
        )
    return _client


async def query(
    table: str,
    *,
    tenant_id: str,
    select: str = "*",
    filters: Optional[dict[str, Any]] = None,
    order: Optional[str] = None,
    limit: int = 50,
    single: bool = False,
) -> list[dict] | dict | None:
    """Execute a SELECT query against Supabase REST API."""
    client = _get_client()
    params: dict[str, str] = {"select": select}

    # Always filter by tenant_id
    params["tenant_id"] = f"eq.{tenant_id}"

    if filters:
        for key, value in filters.items():
            if isinstance(value, str) and value.startswith(("eq.", "like.", "gte.", "lte.", "gt.", "lt.", "is.", "in.")):
                params[key] = value
            else:
                params[key] = f"eq.{value}"

    if order:
        params["order"] = order
    params["limit"] = str(limit)

    if single:
        headers = {"Accept": "application/vnd.pgrst.object+json"}
    else:
        headers = {}

    resp = await client.get(f"/{table}", params=params, headers=headers)
    resp.raise_for_status()
    return resp.json()


async def insert(
    table: str,
    *,
    tenant_id: str,
    data: dict[str, Any],
) -> dict:
    """Insert a row into Supabase."""
    client = _get_client()
    data["tenant_id"] = tenant_id
    resp = await client.post(
        f"/{table}",
        json=data,
        headers={"Prefer": "return=representation", "Accept": "application/vnd.pgrst.object+json"},
    )
    resp.raise_for_status()
    return resp.json()


async def update(
    table: str,
    *,
    tenant_id: str,
    filters: dict[str, Any],
    data: dict[str, Any],
) -> list[dict]:
    """Update rows in Supabase."""
    client = _get_client()
    params: dict[str, str] = {"tenant_id": f"eq.{tenant_id}"}
    for key, value in filters.items():
        params[key] = f"eq.{value}"

    resp = await client.patch(f"/{table}", params=params, json=data)
    resp.raise_for_status()
    return resp.json()


async def upsert(
    table: str,
    *,
    tenant_id: str,
    data: dict[str, Any],
    on_conflict: str = "id",
) -> dict:
    """Upsert a row into Supabase."""
    client = _get_client()
    data["tenant_id"] = tenant_id
    resp = await client.post(
        f"/{table}",
        json=data,
        headers={
            "Prefer": "return=representation,resolution=merge-duplicates",
            "Accept": "application/vnd.pgrst.object+json",
        },
        params={"on_conflict": on_conflict},
    )
    resp.raise_for_status()
    return resp.json()


async def delete(
    table: str,
    *,
    tenant_id: str,
    filters: dict[str, Any],
) -> None:
    """Delete rows from Supabase."""
    client = _get_client()
    params: dict[str, str] = {"tenant_id": f"eq.{tenant_id}"}
    for key, value in filters.items():
        params[key] = f"eq.{value}"

    resp = await client.delete(f"/{table}", params=params)
    resp.raise_for_status()


async def close():
    """Close the HTTP client (call on shutdown)."""
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
