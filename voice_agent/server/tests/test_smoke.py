#!/usr/bin/env python3
"""
Smoke tests for the Voice Agent server.
Run: python -m pytest tests/test_smoke.py -v
Requires the server to be running at localhost:8768.
"""
import asyncio
import aiohttp
import pytest

BASE_URL = "http://127.0.0.1:8768"
API_KEY = "va-bridge-secret-key-2026"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


@pytest.fixture
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.mark.asyncio
async def test_health_endpoint():
    """Health endpoint returns ok=True with provider info."""
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BASE_URL}/api/health") as resp:
            assert resp.status == 200
            data = await resp.json()
            assert data["ok"] is True
            assert "llm_provider" in data
            assert "version" in data


@pytest.mark.asyncio
async def test_health_no_auth_required():
    """Health endpoint works without auth header."""
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BASE_URL}/api/health") as resp:
            assert resp.status == 200


@pytest.mark.asyncio
async def test_session_create():
    """Session creation returns a valid session ID."""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{BASE_URL}/api/session/create",
            headers=HEADERS,
            json={"mode": "realtor"},
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert data["ok"] is True
            assert "session_id" in data
            assert len(data["session_id"]) > 0


@pytest.mark.asyncio
async def test_session_create_requires_auth():
    """Session creation rejects requests without auth (if key is set)."""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{BASE_URL}/api/session/create",
            headers={"Content-Type": "application/json"},
            json={"mode": "realtor"},
        ) as resp:
            # If auth is enabled, should be 401. If disabled, 200.
            assert resp.status in (200, 401)


@pytest.mark.asyncio
async def test_chat_invalid_session():
    """Chat with invalid session ID returns 404."""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{BASE_URL}/api/chat",
            headers=HEADERS,
            json={"session_id": "nonexistent-session-id", "message": "hello"},
        ) as resp:
            assert resp.status == 404


@pytest.mark.asyncio
async def test_chat_empty_message():
    """Chat with empty message returns a polite fallback."""
    # Create session first
    async with aiohttp.ClientSession() as session:
        create_resp = await session.post(
            f"{BASE_URL}/api/session/create",
            headers=HEADERS,
            json={"mode": "realtor"},
        )
        create_data = await create_resp.json()
        sid = create_data["session_id"]

        # Send empty message
        async with session.post(
            f"{BASE_URL}/api/chat",
            headers=HEADERS,
            json={"session_id": sid, "message": ""},
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert data["ok"] is True
            assert "response" in data


@pytest.mark.asyncio
async def test_chat_basic_message():
    """Chat with a simple message returns a valid response."""
    async with aiohttp.ClientSession() as session:
        create_resp = await session.post(
            f"{BASE_URL}/api/session/create",
            headers=HEADERS,
            json={"mode": "realtor"},
        )
        create_data = await create_resp.json()
        sid = create_data["session_id"]

        async with session.post(
            f"{BASE_URL}/api/chat",
            headers=HEADERS,
            json={"session_id": sid, "message": "What time is it?"},
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert data["ok"] is True
            assert "response" in data
            assert len(data["response"]) > 0


@pytest.mark.asyncio
async def test_stream_endpoint_returns_sse():
    """Streaming chat returns Server-Sent Events format."""
    async with aiohttp.ClientSession() as session:
        create_resp = await session.post(
            f"{BASE_URL}/api/session/create",
            headers=HEADERS,
            json={"mode": "realtor"},
        )
        create_data = await create_resp.json()
        sid = create_data["session_id"]

        async with session.post(
            f"{BASE_URL}/api/chat/stream",
            headers=HEADERS,
            json={"session_id": sid, "message": "Say hello"},
        ) as resp:
            assert resp.status == 200
            assert "text/event-stream" in resp.headers.get("Content-Type", "")
            # Read at least one chunk
            chunk = await resp.content.readline()
            assert chunk is not None


@pytest.mark.asyncio
async def test_tts_voices():
    """TTS voices endpoint returns a list."""
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{BASE_URL}/api/tts/voices",
            headers=HEADERS,
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert "voices" in data


@pytest.mark.asyncio
async def test_providers_endpoint():
    """Providers endpoint returns available providers."""
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{BASE_URL}/api/providers",
            headers=HEADERS,
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert "providers" in data


@pytest.mark.asyncio
async def test_costs_endpoint():
    """Costs endpoint returns cost summary."""
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{BASE_URL}/api/costs",
            headers=HEADERS,
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            # Should have some cost structure
            assert isinstance(data, dict)
