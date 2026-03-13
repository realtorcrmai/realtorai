#!/usr/bin/env python3
"""
Real Estate Voice Agent — Main Server
Async HTTP server with streaming SSE, multi-provider LLM, auth, and session persistence.

Usage:
    python main.py                          # Starts aiohttp server
    AGENT_MODE=client python main.py        # Client mode
    LLM_PROVIDER=openai python main.py      # Use OpenAI instead of Ollama
"""

from __future__ import annotations

import os
import sys
import json
import asyncio
import uuid
import re
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from config import (
    MODE, LLM_PROVIDER,
    DAILY_API_KEY, DAILY_ROOM_URL,
    CURRENT_REALTOR_ID, MAX_CONVERSATION_HISTORY,
    PERSONALIZATION_ENABLED, VOICE_AGENT_API_KEY, CORS_ORIGINS,
    SESSION_PERSIST, SESSION_EXPIRY_HOURS,
)
from system_prompts import get_system_prompt
from database import (
    init_db, log_conversation, get_conversation_history, track_preference,
    save_session, load_session, cleanup_expired_sessions,
)
from tools import (
    ALL_REALTOR_TOOLS, handle_realtor_tool,
    ALL_CLIENT_TOOLS, handle_client_tool,
    GENERIC_TOOLS, handle_generic_tool,
)
from llm_providers import get_active_provider, get_llm_provider


# ═══════════════════════════════════════════════════════════════════════════════
#  SESSION STATE
# ═══════════════════════════════════════════════════════════════════════════════

class SessionState:
    """Tracks state for a single voice/chat session."""

    def __init__(self, mode: str, realtor_id: str, listing_context: str = ""):
        self.session_id = uuid.uuid4().hex[:12]
        self.mode = mode
        self.realtor_id = realtor_id
        self.messages = []
        self.participant_name = None
        self.created_at = datetime.now()

        form_fill = bool(listing_context) and mode == "realtor"
        system_prompt = get_system_prompt(mode, realtor_name="your agent", form_fill=form_fill)
        self.messages.append({"role": "system", "content": system_prompt})

        if listing_context:
            self.messages.append({"role": "system", "content": f"Current listing context: {listing_context}"})

        if PERSONALIZATION_ENABLED:
            history = get_conversation_history(realtor_id=realtor_id, limit=10)
            if history:
                ctx = "Previous conversation context:\n"
                for msg in history[-5:]:
                    ctx += f"- {msg.get('role', 'user')}: {msg.get('content', '')[:100]}\n"
                self.messages.append({"role": "system", "content": ctx})

    @classmethod
    def from_persisted(cls, data: dict) -> "SessionState":
        """Restore a session from persisted data."""
        session = cls.__new__(cls)
        session.session_id = data["id"]
        session.mode = data["mode"]
        session.realtor_id = data["realtor_id"]
        session.messages = data["messages"]
        session.participant_name = data.get("participant")
        session.created_at = datetime.fromisoformat(data.get("created_at", datetime.now().isoformat()))
        return session

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        if len(self.messages) > MAX_CONVERSATION_HISTORY + 1:
            self.messages = [self.messages[0]] + self.messages[-MAX_CONVERSATION_HISTORY:]
        log_conversation(
            session_id=self.session_id, mode=self.mode,
            participant=self.participant_name or "unknown",
            role=role, content=content, realtor_id=self.realtor_id,
        )
        if SESSION_PERSIST:
            save_session(self.session_id, self.mode, self.realtor_id,
                         self.messages, self.participant_name)

    def get_tools(self):
        if self.mode == "realtor":
            return ALL_REALTOR_TOOLS
        elif self.mode == "client":
            return ALL_CLIENT_TOOLS
        else:
            return GENERIC_TOOLS

    def handle_tool_call(self, tool_name: str, args: dict) -> str:
        generic_names = {t["function"]["name"] for t in GENERIC_TOOLS}
        if tool_name in generic_names:
            result = handle_generic_tool(tool_name, args, self.realtor_id)
        elif self.mode == "realtor":
            result = handle_realtor_tool(tool_name, args, self.realtor_id)
        elif self.mode == "client":
            result = handle_client_tool(tool_name, args, self.realtor_id)
        else:
            result = handle_generic_tool(tool_name, args, self.realtor_id)

        log_conversation(
            session_id=self.session_id, mode=self.mode,
            participant=self.participant_name or "unknown",
            role="tool", content=f"Called {tool_name}",
            tool_name=tool_name, tool_args=args,
            tool_result=json.loads(result) if result else None,
            realtor_id=self.realtor_id,
        )

        if PERSONALIZATION_ENABLED:
            track_preference(f"tool_usage_{tool_name}", {"last_args": args}, self.realtor_id)

        return result


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_fields(text: str) -> dict:
    patterns = [r'```json\s*(\{[\s\S]*?\})\s*```', r'```\s*(\{[\s\S]*?\})\s*```']
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                fields = json.loads(match.group(1))
                if isinstance(fields, dict):
                    return fields
            except json.JSONDecodeError:
                pass
    return {}


def _strip_json_block(text: str) -> str:
    text = re.sub(r'```json\s*\{[\s\S]*?\}\s*```', '', text)
    text = re.sub(r'```\s*\{[\s\S]*?\}\s*```', '', text)
    return text.strip()


_sessions: dict[str, SessionState] = {}


# ═══════════════════════════════════════════════════════════════════════════════
#  AIOHTTP SERVER
# ═══════════════════════════════════════════════════════════════════════════════

try:
    from aiohttp import web
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    print("[WARN] aiohttp not installed. Install with: pip install aiohttp")


def _check_auth(request) -> bool:
    if not VOICE_AGENT_API_KEY:
        return True
    auth = request.headers.get("Authorization", "")
    return auth == f"Bearer {VOICE_AGENT_API_KEY}"


def _cors_headers():
    return {
        "Access-Control-Allow-Origin": CORS_ORIGINS,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }


async def handle_options(request):
    return web.Response(status=204, headers=_cors_headers())


async def handle_health(request):
    provider = get_active_provider()
    return web.json_response({
        "ok": True,
        "mode": MODE,
        "llm_provider": provider.name,
        "llm_available": provider.is_available(),
        "version": "2.0.0",
    }, headers=_cors_headers())


async def handle_sessions_list(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers())
    return web.json_response({
        "sessions": [
            {"id": sid, "mode": s.mode, "messages": len(s.messages)}
            for sid, s in _sessions.items()
        ]
    }, headers=_cors_headers())


async def handle_providers(request):
    from llm_providers import _PROVIDERS
    from tts_providers import _TTS_PROVIDERS, get_tts_provider
    from stt_providers import _STT_PROVIDERS, get_stt_provider

    llm_status = {name: cls().is_available() for name, cls in _PROVIDERS.items()}
    tts_status = {name: cls().is_available() for name, cls in _TTS_PROVIDERS.items()}
    stt_status = {name: cls().is_available() for name, cls in _STT_PROVIDERS.items()}

    return web.json_response({
        "llm": {"providers": llm_status, "active": get_active_provider().name},
        "tts": {"providers": tts_status, "active": get_tts_provider().name},
        "stt": {"providers": stt_status, "active": get_stt_provider().name},
    }, headers=_cors_headers())


async def handle_session_create(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers())

    body = await request.json() if request.content_length else {}
    mode = body.get("mode", MODE)
    listing_context = body.get("context", "")
    resume_id = body.get("resume_session_id")

    if resume_id:
        if resume_id in _sessions:
            session = _sessions[resume_id]
            return web.json_response({
                "ok": True, "session_id": session.session_id,
                "mode": session.mode, "resumed": True,
                "message_count": len(session.messages),
            }, headers=_cors_headers())
        persisted = load_session(resume_id)
        if persisted:
            session = SessionState.from_persisted(persisted)
            _sessions[session.session_id] = session
            return web.json_response({
                "ok": True, "session_id": session.session_id,
                "mode": session.mode, "resumed": True,
                "message_count": len(session.messages),
            }, headers=_cors_headers())

    session = SessionState(mode=mode, realtor_id=CURRENT_REALTOR_ID, listing_context=listing_context)
    _sessions[session.session_id] = session
    return web.json_response({
        "ok": True, "session_id": session.session_id, "mode": mode, "resumed": False,
    }, headers=_cors_headers())


async def handle_chat(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers())

    body = await request.json()
    sid = body.get("session_id")
    message = body.get("message", "")

    if sid not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404, headers=_cors_headers())

    session = _sessions[sid]
    session.add_message("user", message)
    provider = get_active_provider()

    try:
        result = await provider.chat(session.messages, session.get_tools())
        content = result["content"]

        tool_calls = result.get("tool_calls")
        if tool_calls:
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "")
                tool_args = fn.get("arguments", {})
                if isinstance(tool_args, str):
                    tool_args = json.loads(tool_args)
                tool_result = session.handle_tool_call(tool_name, tool_args)
                session.messages.append({"role": "tool", "content": tool_result})

            result2 = await provider.chat(session.messages)
            content = result2["content"]

        session.add_message("assistant", content)
        fields = _extract_fields(content)
        clean_response = _strip_json_block(content)

        return web.json_response({
            "ok": True, "response": clean_response,
            "fields": fields, "session_id": sid, "provider": provider.name,
        }, headers=_cors_headers())

    except Exception as e:
        return web.json_response({
            "error": str(e), "hint": f"Provider: {provider.name}. Is it running?",
        }, status=500, headers=_cors_headers())


async def handle_chat_stream(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers())

    body = await request.json()
    sid = body.get("session_id")
    message = body.get("message", "")

    if sid not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404, headers=_cors_headers())

    session = _sessions[sid]
    session.add_message("user", message)
    provider = get_active_provider()

    response = web.StreamResponse(
        status=200, reason="OK",
        headers={**_cors_headers(), "Content-Type": "text/event-stream",
                 "Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
    await response.prepare(request)

    try:
        full_content = ""
        async for chunk in provider.chat_stream(session.messages, session.get_tools()):
            if chunk.get("tool_calls"):
                for tc in chunk["tool_calls"]:
                    fn = tc.get("function", {})
                    tool_name = fn.get("name", "")
                    tool_args = fn.get("arguments", {})
                    if isinstance(tool_args, str):
                        tool_args = json.loads(tool_args)
                    tool_result = session.handle_tool_call(tool_name, tool_args)
                    session.messages.append({"role": "tool", "content": tool_result})
                    await response.write(f"data: {json.dumps({'tool': tool_name, 'done': False})}\n\n".encode())

                async for chunk2 in provider.chat_stream(session.messages):
                    token = chunk2.get("token", "")
                    done = chunk2.get("done", False)
                    if token:
                        full_content += token
                    await response.write(f"data: {json.dumps({'token': token, 'done': done})}\n\n".encode())
                    if done:
                        break
            else:
                token = chunk.get("token", "")
                done = chunk.get("done", False)
                if token:
                    full_content += token
                await response.write(f"data: {json.dumps({'token': token, 'done': done})}\n\n".encode())
                if done:
                    break

        session.add_message("assistant", full_content)
        fields = _extract_fields(full_content)
        if fields:
            await response.write(f"data: {json.dumps({'fields': fields, 'done': True})}\n\n".encode())

    except Exception as e:
        await response.write(f"data: {json.dumps({'error': str(e), 'done': True})}\n\n".encode())

    await response.write_eof()
    return response


async def handle_tool(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers())

    body = await request.json()
    sid = body.get("session_id")
    tool_name = body.get("tool")
    tool_args = body.get("args", {})

    if sid and sid in _sessions:
        result = _sessions[sid].handle_tool_call(tool_name, tool_args)
    else:
        result = handle_generic_tool(tool_name, tool_args, CURRENT_REALTOR_ID)

    return web.json_response(json.loads(result), headers=_cors_headers())


async def handle_reminders(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers())
    from database import get_reminders
    return web.json_response({"reminders": get_reminders(realtor_id=CURRENT_REALTOR_ID)}, headers=_cors_headers())


def create_app():
    app = web.Application()
    app.router.add_route("OPTIONS", "/{path:.*}", handle_options)
    app.router.add_get("/api/health", handle_health)
    app.router.add_get("/api/sessions", handle_sessions_list)
    app.router.add_get("/api/providers", handle_providers)
    app.router.add_get("/api/reminders", handle_reminders)
    app.router.add_post("/api/session/create", handle_session_create)
    app.router.add_post("/api/chat", handle_chat)
    app.router.add_post("/api/chat/stream", handle_chat_stream)
    app.router.add_post("/api/tool", handle_tool)
    return app


def main():
    init_db()
    cleanup_expired_sessions()
    port = int(os.getenv("VOICE_AGENT_PORT", "8768"))

    provider = get_active_provider()
    print(f"[MAIN] LLM Provider: {provider.name} (available: {provider.is_available()})")
    print(f"[MAIN] Mode: {MODE}")

    if not AIOHTTP_AVAILABLE:
        print("[ERROR] aiohttp is required. Install with: pip install aiohttp")
        sys.exit(1)

    app = create_app()
    print(f"[MAIN] Starting aiohttp server on http://127.0.0.1:{port}")
    print(f"[MAIN] Endpoints: /api/health, /api/providers, /api/session/create, /api/chat, /api/chat/stream, /api/tool, /api/reminders")
    if VOICE_AGENT_API_KEY:
        print(f"[MAIN] API key authentication: ENABLED")
    else:
        print(f"[MAIN] API key authentication: DISABLED (set VOICE_AGENT_API_KEY to enable)")
    web.run_app(app, host="127.0.0.1", port=port, print=None)


if __name__ == "__main__":
    main()
