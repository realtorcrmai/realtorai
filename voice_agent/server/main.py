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
    log_cost, get_cost_summary, get_session_cost,
)
from tools import (
    ALL_REALTOR_TOOLS, handle_realtor_tool,
    ALL_CLIENT_TOOLS, handle_client_tool,
    GENERIC_TOOLS, handle_generic_tool,
)
from llm_providers import get_active_provider, get_llm_provider, get_provider_for_query
from stt_providers import get_stt_provider
from api_client import api as listingflow_api
import logger


# ═══════════════════════════════════════════════════════════════════════════════
#  RATE LIMITING — In-memory per-session and global request tracking
# ═══════════════════════════════════════════════════════════════════════════════

_rate_limiter: dict[str, list[float]] = {}  # session_id -> list of timestamps
_RATE_LIMIT_PER_SESSION = 30   # Max requests per minute per session
_RATE_LIMIT_GLOBAL = 120       # Max requests per minute globally
_RATE_LIMIT_GLOBAL_KEY = "__global__"


def _check_rate_limit(session_id: str) -> str | None:
    """Check rate limits. Returns an error message if exceeded, None if OK."""
    import time
    now = time.time()
    window = 60.0  # 1-minute window

    # Clean old entries and check global
    if _RATE_LIMIT_GLOBAL_KEY not in _rate_limiter:
        _rate_limiter[_RATE_LIMIT_GLOBAL_KEY] = []
    global_ts = _rate_limiter[_RATE_LIMIT_GLOBAL_KEY]
    _rate_limiter[_RATE_LIMIT_GLOBAL_KEY] = [t for t in global_ts if now - t < window]
    if len(_rate_limiter[_RATE_LIMIT_GLOBAL_KEY]) >= _RATE_LIMIT_GLOBAL:
        logger.warn("RATE", f"Global rate limit exceeded ({_RATE_LIMIT_GLOBAL}/min)")
        return "Too Many Requests — server is busy, please try again shortly"

    # Check per-session
    if session_id:
        if session_id not in _rate_limiter:
            _rate_limiter[session_id] = []
        session_ts = _rate_limiter[session_id]
        _rate_limiter[session_id] = [t for t in session_ts if now - t < window]
        if len(_rate_limiter[session_id]) >= _RATE_LIMIT_PER_SESSION:
            logger.warn("RATE", f"Session {session_id} rate limit exceeded ({_RATE_LIMIT_PER_SESSION}/min)")
            return "Too Many Requests — slow down, max 30 requests per minute"
        _rate_limiter[session_id].append(now)

    _rate_limiter[_RATE_LIMIT_GLOBAL_KEY].append(now)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
#  SESSION STATE
# ═══════════════════════════════════════════════════════════════════════════════

class SessionState:
    """Tracks state for a single voice/chat session."""

    # Number of recent turns to keep verbatim before summarizing
    RECENT_WINDOW = 12
    # Max messages before triggering summarization
    SUMMARIZE_THRESHOLD = 20

    def __init__(self, mode: str, realtor_id: str, listing_context: str = ""):
        self.session_id = uuid.uuid4().hex[:12]
        self.mode = mode
        self.realtor_id = realtor_id
        self.messages = []
        self.participant_name = None
        self.created_at = datetime.now()

        # ── Focus tracking: what contact/listing the agent is "locked on" to ──
        self.focus = {
            "contact_id": None, "contact_name": None,
            "listing_id": None, "listing_address": None,
            "deal_id": None,
        }

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
        session.focus = data.get("focus", {
            "contact_id": None, "contact_name": None,
            "listing_id": None, "listing_address": None,
            "deal_id": None,
        })
        return session

    def _get_focus_context(self) -> str:
        """Build a short context string from current focus."""
        parts = []
        if self.focus.get("contact_name"):
            parts.append(f"Currently focused on contact: {self.focus['contact_name']}")
        if self.focus.get("listing_address"):
            parts.append(f"Currently focused on listing: {self.focus['listing_address']}")
        if self.focus.get("deal_id"):
            parts.append(f"Active deal ID: {self.focus['deal_id']}")
        return ". ".join(parts)

    def _update_focus_from_tool(self, tool_name: str, args: dict, result_str: str):
        """Extract focus entities from tool calls and results."""
        try:
            result = json.loads(result_str) if result_str else {}
        except (json.JSONDecodeError, TypeError):
            result = {}

        # Update focus based on tool used
        if tool_name in ("find_contact", "get_contact"):
            if isinstance(result, dict) and result.get("name"):
                self.focus["contact_name"] = result["name"]
                self.focus["contact_id"] = result.get("id")
            elif isinstance(result, list) and len(result) == 1:
                self.focus["contact_name"] = result[0].get("name")
                self.focus["contact_id"] = result[0].get("id")
        elif tool_name in ("find_listing", "get_listing"):
            if isinstance(result, dict) and result.get("address"):
                self.focus["listing_address"] = result["address"]
                self.focus["listing_id"] = result.get("id")
            elif isinstance(result, list) and len(result) == 1:
                self.focus["listing_address"] = result[0].get("address")
                self.focus["listing_id"] = result[0].get("id")
        elif tool_name in ("find_buyer", "create_buyer_profile"):
            if isinstance(result, dict) and result.get("name"):
                self.focus["contact_name"] = result["name"]
                self.focus["contact_id"] = result.get("id")
        elif tool_name in ("update_listing_status", "update_listing_price", "add_listing_note"):
            if args.get("address"):
                self.focus["listing_address"] = args["address"]

    def _summarize_old_turns(self):
        """Compress older conversation turns into a summary to keep context tight.
        Keeps system messages + last RECENT_WINDOW messages verbatim.
        Everything in between gets summarized into a single system message."""
        # Separate system messages from conversation
        system_msgs = [m for m in self.messages if m["role"] == "system"]
        conv_msgs = [m for m in self.messages if m["role"] != "system"]

        if len(conv_msgs) <= self.SUMMARIZE_THRESHOLD:
            return  # Not enough to summarize

        # Split into old (to summarize) and recent (to keep)
        cutoff = len(conv_msgs) - self.RECENT_WINDOW
        old_msgs = conv_msgs[:cutoff]
        recent_msgs = conv_msgs[cutoff:]

        # Build a compact summary of old turns
        summary_parts = []
        for msg in old_msgs:
            role = msg["role"]
            content = msg["content"]
            if role == "tool":
                summary_parts.append(f"[tool result: {content[:80]}]")
            else:
                # Truncate long messages
                preview = content[:120] + "..." if len(content) > 120 else content
                summary_parts.append(f"{role}: {preview}")

        summary_text = (
            "Summary of earlier conversation:\n"
            + "\n".join(summary_parts)
        )

        # Rebuild messages: system + summary + recent
        self.messages = system_msgs + [
            {"role": "system", "content": summary_text}
        ] + recent_msgs

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

        # Summarize old turns instead of brute-force truncation
        self._summarize_old_turns()

        log_conversation(
            session_id=self.session_id, mode=self.mode,
            participant=self.participant_name or "unknown",
            role=role, content=content, realtor_id=self.realtor_id,
        )
        if SESSION_PERSIST:
            save_session(self.session_id, self.mode, self.realtor_id,
                         self.messages, self.participant_name)

    def get_messages_with_focus(self) -> list:
        """Return messages with current date/time and focus context injected."""
        msgs = list(self.messages)

        # Inject current date/time as a system message (eliminates wrong-date hallucinations)
        now = datetime.now()
        time_ctx = f"Current date and time: {now.strftime('%A, %B %d, %Y at %I:%M %p')}. Use this for all date calculations."
        msgs.append({"role": "system", "content": time_ctx})

        # Inject focus context
        focus_ctx = self._get_focus_context()
        if focus_ctx:
            msgs.append({"role": "system", "content": f"[Session focus] {focus_ctx}"})

        return msgs

    # ── Dynamic tool selection ─────────────────────────────────────────
    # Instead of sending all 56 tools every turn (~8K tokens), send a
    # core set (~12 tools) + extra groups matched by message keywords.
    # This cuts tool tokens by ~60% on most turns.

    # Tools always included regardless of message
    _CORE_TOOLS = {
        "find_contact", "find_listing", "search_properties", "get_tasks",
        "get_deals", "navigate_to", "get_crm_help", "bc_real_estate_reference",
        "get_current_time", "calculate", "take_note", "get_notes",
    }

    # Keyword → additional tool groups
    _TOOL_ROUTES = {
        "contact": {"create_buyer_profile", "update_contact", "delete_contact",
                     "get_contact_details", "find_buyer", "get_communications",
                     "get_activities", "log_activity"},
        "buyer": {"find_buyer", "create_buyer_profile", "get_contact_details"},
        "listing": {"update_listing_status", "update_listing_price", "add_listing_note",
                     "create_listing", "delete_listing"},
        "showing": {"get_showings", "create_showing", "confirm_showing"},
        "task": {"create_task", "update_task", "delete_task"},
        "deal": {"create_deal", "update_deal", "get_deal_details"},
        "offer": {"get_offers", "create_offer", "update_offer"},
        "household": {"get_households", "get_household_members", "create_household",
                       "add_to_household", "remove_from_household"},
        "family": {"get_households", "get_household_members", "create_household",
                    "add_to_household"},
        "relationship": {"get_relationships", "create_relationship"},
        "workflow": {"get_workflows", "enroll_in_workflow", "get_enrollments",
                      "manage_enrollment"},
        "email": {"get_newsletters", "approve_newsletter", "get_communications"},
        "newsletter": {"get_newsletters", "approve_newsletter"},
        "call": {"configure_client_call", "get_conversation_history",
                  "get_activities", "log_activity"},
        "note": {"add_listing_note", "take_note", "get_notes", "log_activity"},
        "remind": {"set_reminder", "create_task"},
        "reminder": {"set_reminder", "create_task"},
        "create": {"create_task", "create_deal", "create_listing", "create_showing",
                    "create_buyer_profile", "create_offer", "create_household",
                    "create_relationship", "log_activity"},
        "add": {"create_task", "create_deal", "create_listing", "create_showing",
                "create_buyer_profile", "log_activity", "add_listing_note",
                "add_to_household"},
        "schedule": {"create_showing", "create_task", "set_reminder"},
        "book": {"create_showing", "create_task"},
        "weather": {"weather"},
        "search": {"web_search"},
        "summarize": {"summarize_text"},
        "history": {"get_conversation_history", "get_activities"},
        "status": {"update_listing_status", "update_task", "update_deal",
                    "confirm_showing"},
        "price": {"update_listing_price", "calculate"},
        "delete": {"delete_contact", "delete_listing", "delete_task"},
        "create": {"create_buyer_profile", "create_listing", "create_task",
                    "create_deal", "create_showing", "create_offer",
                    "create_household", "create_relationship"},
        "update": {"update_contact", "update_listing_status", "update_listing_price",
                    "update_task", "update_deal", "update_offer"},
    }

    def get_tools(self, message: str = "") -> list:
        """Return tools relevant to the current message. Core set always included,
        additional groups activated by keyword matching."""
        if self.mode == "client":
            return ALL_CLIENT_TOOLS  # client mode has few tools, send all
        if self.mode != "realtor":
            return GENERIC_TOOLS

        # Build the set of tool names to include
        selected = set(self._CORE_TOOLS)

        # Match keywords in the message
        lower_msg = message.lower()
        for keyword, tool_names in self._TOOL_ROUTES.items():
            if keyword in lower_msg:
                selected.update(tool_names)

        # If focus is on a contact, include contact tools
        if self.focus.get("contact_name"):
            selected.update(self._TOOL_ROUTES.get("contact", set()))
        # If focus is on a listing, include listing tools
        if self.focus.get("listing_address"):
            selected.update(self._TOOL_ROUTES.get("listing", set()))
            selected.update(self._TOOL_ROUTES.get("showing", set()))

        # Filter the full tool list to only selected names
        all_tools = ALL_REALTOR_TOOLS
        filtered = [t for t in all_tools if t["function"]["name"] in selected]

        # Safety: if somehow nothing matched, return core set from full list
        if len(filtered) < 5:
            return [t for t in all_tools if t["function"]["name"] in self._CORE_TOOLS]

        return filtered

    async def handle_tool_call(self, tool_name: str, args: dict) -> str:
        generic_names = {t["function"]["name"] for t in GENERIC_TOOLS}
        if tool_name in generic_names:
            result = await handle_generic_tool(tool_name, args, self.realtor_id)
        elif self.mode == "realtor":
            result = await handle_realtor_tool(tool_name, args, self.realtor_id)
        elif self.mode == "client":
            result = await handle_client_tool(tool_name, args, self.realtor_id)
        else:
            result = await handle_generic_tool(tool_name, args, self.realtor_id)

        # Update session focus from tool results
        self._update_focus_from_tool(tool_name, args, result)

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


def _clean_for_voice(text: str) -> str:
    """Strip markdown and formatting artifacts so the response sounds natural when spoken."""
    if not text:
        return text
    # Remove JSON blocks first
    text = _strip_json_block(text)
    # Remove markdown headers
    text = re.sub(r'#{1,6}\s+', '', text)
    # Remove bold/italic markers
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    # Remove inline code backticks
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    # Remove markdown links [text](url) → text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove bullet points and numbered lists — convert to natural flow
    text = re.sub(r'^\s*[-•*]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Collapse multiple newlines into single space
    text = re.sub(r'\n{2,}', '. ', text)
    text = re.sub(r'\n', ' ', text)
    # Clean up extra spaces and periods
    text = re.sub(r'\s{2,}', ' ', text)
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'\.\s*\.', '.', text)
    return text.strip()


# Fallback responses when the LLM returns empty
_EMPTY_FALLBACKS = [
    "Sorry, I lost my train of thought there. Could you say that again?",
    "I didn't quite get a response together. What were you asking?",
    "Hmm, let me try again. Could you repeat that?",
]
_fallback_idx = 0


def _get_fallback() -> str:
    global _fallback_idx
    msg = _EMPTY_FALLBACKS[_fallback_idx % len(_EMPTY_FALLBACKS)]
    _fallback_idx += 1
    return msg


_sessions: dict[str, SessionState] = {}


# ═══════════════════════════════════════════════════════════════════════════════
#  AIOHTTP SERVER
# ═══════════════════════════════════════════════════════════════════════════════

try:
    from aiohttp import web
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    logger.warn("INIT", "aiohttp not installed. Install with: pip install aiohttp")


def _check_auth(request) -> bool:
    if not VOICE_AGENT_API_KEY:
        return True
    auth = request.headers.get("Authorization", "")
    return auth == f"Bearer {VOICE_AGENT_API_KEY}"


def _cors_headers(request=None):
    """Build CORS headers. When CORS_ORIGINS is a comma-separated list,
    check the request Origin against allowed origins and reflect it back."""
    origin = "*"
    if CORS_ORIGINS == "*":
        origin = "*"
    elif request:
        req_origin = request.headers.get("Origin", "")
        allowed = [o.strip() for o in CORS_ORIGINS.split(",")]
        if req_origin in allowed:
            origin = req_origin
        else:
            origin = allowed[0] if allowed else "*"
    else:
        # No request context — use first allowed origin
        allowed = [o.strip() for o in CORS_ORIGINS.split(",")]
        origin = allowed[0] if allowed else "*"
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }


async def handle_options(request):
    return web.Response(status=204, headers=_cors_headers(request))


async def handle_health(request):
    provider = get_active_provider()
    return web.json_response({
        "ok": True,
        "mode": MODE,
        "llm_provider": provider.name,
        "llm_available": provider.is_available(),
        "version": "2.0.0",
    }, headers=_cors_headers(request))


async def handle_sessions_list(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))
    return web.json_response({
        "sessions": [
            {"id": sid, "mode": s.mode, "messages": len(s.messages)}
            for sid, s in _sessions.items()
        ]
    }, headers=_cors_headers(request))


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
    }, headers=_cors_headers(request))


async def handle_session_create(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

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
            }, headers=_cors_headers(request))
        persisted = load_session(resume_id)
        if persisted:
            session = SessionState.from_persisted(persisted)
            _sessions[session.session_id] = session
            return web.json_response({
                "ok": True, "session_id": session.session_id,
                "mode": session.mode, "resumed": True,
                "message_count": len(session.messages),
            }, headers=_cors_headers(request))

    session = SessionState(mode=mode, realtor_id=CURRENT_REALTOR_ID, listing_context=listing_context)
    _sessions[session.session_id] = session
    return web.json_response({
        "ok": True, "session_id": session.session_id, "mode": mode, "resumed": False,
    }, headers=_cors_headers(request))


async def handle_chat(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

    body = await request.json()
    sid = body.get("session_id")
    message = body.get("message", "").strip()

    # Rate limit check
    rate_err = _check_rate_limit(sid or "anonymous")
    if rate_err:
        return web.json_response({"error": rate_err}, status=429, headers=_cors_headers(request))

    # Empty message guard — return helpful prompt instead of hanging
    if not message:
        return web.json_response({
            "ok": True,
            "response": "I didn't catch that. Could you please say or type your question?",
            "fields": {},
            "session_id": sid,
            "provider": "none",
        }, headers=_cors_headers(request))

    if sid not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404, headers=_cors_headers(request))

    session = _sessions[sid]
    session.add_message("user", message)
    provider = get_provider_for_query(message)

    try:
        import time as _time
        _t0 = _time.time()

        result = await provider.chat(session.get_messages_with_focus(), session.get_tools(message))
        content = result["content"]

        _latency1 = int((_time.time() - _t0) * 1000)
        _usage = result.get("usage", {})
        log_cost(
            session_id=sid, realtor_id=session.realtor_id,
            service="llm", provider=provider.name,
            model=getattr(provider, "model", None),
            input_tokens=_usage.get("input_tokens", len(message) // 4),
            output_tokens=_usage.get("output_tokens", len(content) // 4),
            latency_ms=_latency1,
            metadata={
                "type": "chat",
                "message_preview": message[:80],
                "tools_sent": len(session.get_tools(message)),
                "cache_creation_input_tokens": _usage.get("cache_creation_input_tokens", 0),
                "cache_read_input_tokens": _usage.get("cache_read_input_tokens", 0),
            },
        )

        # Multi-round tool call loop (up to 3 rounds, matching streaming handler)
        max_tool_rounds = 3
        for _round in range(max_tool_rounds):
            tool_calls = result.get("tool_calls")
            if not tool_calls:
                break

            # Build tool_result blocks (Anthropic format)
            raw_blocks = result.get("raw_content_blocks", [])
            if raw_blocks:
                session.messages.append({"role": "assistant_tool_use", "content": raw_blocks})

            tool_result_blocks = []
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "")
                tool_use_id = tc.get("id", "")
                tool_args = fn.get("arguments", {})
                if isinstance(tool_args, str):
                    tool_args = json.loads(tool_args)
                try:
                    tool_result = await session.handle_tool_call(tool_name, tool_args)
                except Exception as te:
                    tool_result = json.dumps({"error": f"Tool {tool_name} failed: {te}"})
                tool_result_blocks.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use_id,
                    "content": tool_result,
                })

            session.messages.append({"role": "tool_result", "content": tool_result_blocks})

            _t1 = _time.time()
            result = await provider.chat(session.get_messages_with_focus())
            content = result["content"]
            _latency2 = int((_time.time() - _t1) * 1000)
            _usage2 = result.get("usage", {})
            log_cost(
                session_id=sid, realtor_id=session.realtor_id,
                service="llm", provider=provider.name,
                model=getattr(provider, "model", None),
                input_tokens=_usage2.get("input_tokens", 0),
                output_tokens=_usage2.get("output_tokens", len(content) // 4),
                latency_ms=_latency2,
                metadata={"type": "tool_followup", "round": _round + 1,
                          "tools": [tc.get("function", {}).get("name") for tc in tool_calls]},
            )

        # Handle empty response — retry once
        if not content or not content.strip():
            result2 = await provider.chat(session.get_messages_with_focus())
            content = result2.get("content", "")
            if not content or not content.strip():
                content = _get_fallback()

        session.add_message("assistant", content)
        fields = _extract_fields(content)
        clean_response = _clean_for_voice(content)

        return web.json_response({
            "ok": True, "response": clean_response,
            "fields": fields, "session_id": sid, "provider": provider.name,
        }, headers=_cors_headers(request))

    except Exception as e:
        return web.json_response({
            "error": str(e), "hint": f"Provider: {provider.name}. Is it running?",
        }, status=500, headers=_cors_headers(request))


async def handle_chat_stream(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

    body = await request.json()
    sid = body.get("session_id")
    message = body.get("message", "").strip()

    # Rate limit check
    rate_err = _check_rate_limit(sid or "anonymous")
    if rate_err:
        return web.json_response({"error": rate_err}, status=429, headers=_cors_headers(request))

    # Empty message guard
    if not message:
        return web.json_response({
            "ok": True,
            "response": "I didn't catch that. Could you please say or type your question?",
            "fields": {},
            "session_id": sid,
            "provider": "none",
        }, headers=_cors_headers(request))

    if sid not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404, headers=_cors_headers(request))

    session = _sessions[sid]
    session.add_message("user", message)
    provider = get_provider_for_query(message)

    response = web.StreamResponse(
        status=200, reason="OK",
        headers={**_cors_headers(request), "Content-Type": "text/event-stream",
                 "Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
    await response.prepare(request)

    import time as _time

    try:
        full_content = ""
        max_tool_rounds = 3
        _tools_used = []
        _t0 = _time.time()
        tools = session.get_tools(message)
        _total_input_tokens = 0
        _total_output_tokens = 0

        for _round in range(max_tool_rounds + 1):
            got_tool_call = False

            async for chunk in provider.chat_stream(
                session.get_messages_with_focus(),
                tools if _round < max_tool_rounds else None,
            ):
                if chunk.get("tool_calls"):
                    got_tool_call = True
                    # Capture usage from this round
                    _usage = chunk.get("usage", {})
                    _total_input_tokens += _usage.get("input_tokens", 0)
                    _total_output_tokens += _usage.get("output_tokens", 0)

                    # Store assistant's tool_use message in session history
                    # (Anthropic needs to see the assistant's tool_use blocks)
                    raw_blocks = chunk.get("raw_content_blocks", [])
                    if raw_blocks:
                        session.messages.append({
                            "role": "assistant_tool_use",
                            "content": raw_blocks,
                        })

                    # Build tool_result blocks for all tool calls in this round
                    tool_result_blocks = []
                    for tc in chunk["tool_calls"]:
                        fn = tc.get("function", {})
                        tool_name = fn.get("name", "")
                        tool_use_id = tc.get("id", "")
                        _tools_used.append(tool_name)
                        tool_args = fn.get("arguments", {})
                        if isinstance(tool_args, str):
                            try:
                                tool_args = json.loads(tool_args)
                            except json.JSONDecodeError:
                                tool_args = {}
                        try:
                            tool_result = await session.handle_tool_call(tool_name, tool_args)
                        except Exception as te:
                            tool_result = json.dumps({"error": f"Tool {tool_name} failed: {te}"})

                        tool_result_blocks.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": tool_result,
                        })
                        await response.write(f"data: {json.dumps({'tool': tool_name, 'done': False})}\n\n".encode())

                    # Store tool results as proper Anthropic tool_result message
                    session.messages.append({
                        "role": "tool_result",
                        "content": tool_result_blocks,
                    })
                    break  # exit inner loop, outer loop starts next round
                else:
                    token = chunk.get("token", "")
                    done = chunk.get("done", False)
                    if token:
                        full_content += token
                    # Capture usage from final chunk
                    if done:
                        _usage = chunk.get("usage", {})
                        _total_input_tokens += _usage.get("input_tokens", 0)
                        _total_output_tokens += _usage.get("output_tokens", 0)
                    await response.write(f"data: {json.dumps({'token': token, 'done': done})}\n\n".encode())
                    if done:
                        break

            if not got_tool_call:
                break

        # If empty response after tool calls, retry with non-streaming fallback
        if not full_content.strip() and _tools_used:
            try:
                fallback_result = await provider.chat(session.get_messages_with_focus())
                full_content = fallback_result.get("content", "")
                _fu = fallback_result.get("usage", {})
                _total_input_tokens += _fu.get("input_tokens", 0)
                _total_output_tokens += _fu.get("output_tokens", 0)
                if full_content.strip():
                    await response.write(f"data: {json.dumps({'token': full_content, 'done': True})}\n\n".encode())
            except Exception:
                pass

        # Final fallback
        if not full_content.strip():
            fallback_msg = _get_fallback()
            full_content = fallback_msg
            await response.write(f"data: {json.dumps({'token': fallback_msg, 'done': True})}\n\n".encode())

        session.add_message("assistant", full_content)
        fields = _extract_fields(full_content)
        if fields:
            await response.write(f"data: {json.dumps({'fields': fields, 'done': True})}\n\n".encode())

        # Log cost with real tokens when available, estimates as fallback
        _latency = int((_time.time() - _t0) * 1000)
        _meta = {"type": "stream", "message_preview": message[:80]}
        if _tools_used:
            _meta["tools"] = _tools_used
        log_cost(
            session_id=sid, realtor_id=session.realtor_id,
            service="llm", provider=provider.name,
            model=getattr(provider, "model", None),
            input_tokens=_total_input_tokens or (len(message) // 4),
            output_tokens=_total_output_tokens or (len(full_content) // 4),
            latency_ms=_latency,
            metadata=_meta,
        )

    except Exception as e:
        error_msg = "I ran into a technical issue. Could you try asking again?"
        await response.write(f"data: {json.dumps({'token': error_msg, 'done': True})}\n\n".encode())
        session.add_message("assistant", error_msg)

    await response.write_eof()
    return response


async def handle_tool(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

    body = await request.json()
    sid = body.get("session_id")
    tool_name = body.get("tool")
    tool_args = body.get("args", {})

    if sid and sid in _sessions:
        result = await _sessions[sid].handle_tool_call(tool_name, tool_args)
    else:
        result = await handle_generic_tool(tool_name, tool_args, CURRENT_REALTOR_ID)

    return web.json_response(json.loads(result), headers=_cors_headers(request))


async def handle_reminders(request):
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))
    from database import get_reminders
    return web.json_response({"reminders": get_reminders(realtor_id=CURRENT_REALTOR_ID)}, headers=_cors_headers(request))


async def on_startup(app):
    """
    Warm up Turbopack lazy-compiled voice-agent API routes on startup.
    Turbopack only compiles routes on first request; hitting them once prevents
    the first real user request from getting a 500 compilation error.
    """
    from config import LISTINGFLOW_API, VOICE_AGENT_API_KEY
    import aiohttp

    warmup_paths = [
        "/api/voice-agent/contacts",
        "/api/voice-agent/listings",
        "/api/voice-agent/showings",
        "/api/voice-agent/tasks",
        "/api/voice-agent/deals",
        "/api/voice-agent/feedback",
    ]
    base = LISTINGFLOW_API.rstrip("/")
    headers = {}
    if VOICE_AGENT_API_KEY:
        headers["Authorization"] = f"Bearer {VOICE_AGENT_API_KEY}"

    logger.info("WARMUP", "Pinging Next.js voice-agent routes to trigger Turbopack compilation...")
    try:
        async with aiohttp.ClientSession() as session:
            for path in warmup_paths:
                url = f"{base}{path}"
                try:
                    async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                        logger.info("WARMUP", f"{path} -> HTTP {resp.status}")
                except Exception as e:
                    logger.warn("WARMUP", f"{path} -> error: {e}")
    except Exception as e:
        logger.error("WARMUP", f"Session error: {e}")
    logger.info("WARMUP", "Done.")

    # Pre-render common TTS phrases for instant playback
    await _prerender_common_phrases()


async def on_shutdown(app):
    """Clean up the API client session on server shutdown."""
    await listingflow_api.close()


async def handle_costs(request):
    """GET /api/costs — Cost logbook dashboard."""
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

    days = int(request.query.get("days", "30"))
    summary = get_cost_summary(realtor_id=CURRENT_REALTOR_ID, days=days)
    return web.json_response(summary, headers=_cors_headers(request))


# ═══════════════════════════════════════════════════════════════════════════════
#  TTS CACHE — LRU cache for recent TTS outputs + pre-rendered common phrases
# ═══════════════════════════════════════════════════════════════════════════════

import hashlib
from collections import OrderedDict

_tts_cache: OrderedDict[str, bytes] = OrderedDict()
_TTS_CACHE_MAX = 100  # Max cached audio clips

# Common phrases that get pre-rendered on startup for instant playback
_TTS_PRERENDER_PHRASES = [
    "I didn't catch that. Could you say that again?",
    "Let me look that up for you.",
    "Working on it.",
    "Done.",
    "Got it.",
    "I ran into a technical issue. Could you try asking again?",
    "Is there anything else you need?",
    "Want me to do anything else with that?",
    "I found a few results.",
    "Let me check on that.",
    "Sorry, I lost my train of thought there. Could you say that again?",
    "I didn't quite get a response together. What were you asking?",
    "Hmm, let me try again. Could you repeat that?",
]


def _tts_cache_key(text: str, voice: str) -> str:
    return hashlib.md5(f"{voice}:{text}".encode()).hexdigest()


async def _synthesize_and_cache(text: str, voice: str) -> bytes | None:
    """Synthesize text via Edge TTS, cache the result, and return audio bytes."""
    key = _tts_cache_key(text, voice)

    # Check cache first
    if key in _tts_cache:
        _tts_cache.move_to_end(key)
        return _tts_cache[key]

    try:
        import edge_tts
        import io

        communicate = edge_tts.Communicate(text, voice)
        buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])

        audio_bytes = buffer.getvalue()
        if not audio_bytes:
            return None

        # Store in cache
        _tts_cache[key] = audio_bytes
        # Evict oldest if over limit
        while len(_tts_cache) > _TTS_CACHE_MAX:
            _tts_cache.popitem(last=False)

        return audio_bytes
    except Exception:
        return None


async def _prerender_common_phrases(voice: str = "en-US-AvaMultilingualNeural"):
    """Pre-render common TTS phrases on startup for instant playback."""
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        logger.warn("TTS", "edge-tts not installed, skipping pre-render.")
        return

    count = 0
    for phrase in _TTS_PRERENDER_PHRASES:
        result = await _synthesize_and_cache(phrase, voice)
        if result:
            count += 1
    logger.info("TTS", f"Pre-rendered {count}/{len(_TTS_PRERENDER_PHRASES)} common phrases.")


async def handle_tts(request):
    """POST /api/tts — Convert text to speech using Edge TTS with caching."""
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

    body = await request.json()
    text = body.get("text", "").strip()
    voice = body.get("voice", "en-US-AvaMultilingualNeural")

    if not text:
        return web.json_response({"error": "No text provided"}, status=400, headers=_cors_headers(request))

    # Clean the text for speech
    clean_text = _clean_for_voice(text)
    if not clean_text:
        return web.json_response({"error": "No speakable text after cleanup"}, status=400, headers=_cors_headers(request))

    audio_bytes = await _synthesize_and_cache(clean_text, voice)

    if not audio_bytes:
        return web.json_response({"error": "TTS failed or edge-tts not installed"}, status=500, headers=_cors_headers(request))

    return web.Response(
        body=audio_bytes,
        content_type="audio/mpeg",
        headers={**_cors_headers(request), "Content-Length": str(len(audio_bytes))},
    )


async def handle_tts_voices(request):
    """GET /api/tts/voices — List available Edge TTS voices."""
    try:
        import edge_tts
        voices = await edge_tts.list_voices()
        # Filter to English voices for simplicity
        en_voices = [
            {"name": v["Name"], "gender": v["Gender"], "locale": v["Locale"]}
            for v in voices if v["Locale"].startswith("en-")
        ]
        return web.json_response({"voices": en_voices}, headers=_cors_headers(request))
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500, headers=_cors_headers(request))


async def handle_quick(request):
    """POST /api/quick — One-shot endpoint for Siri Shortcuts / Google Assistant.
    Creates a session, sends the message, returns the response — all in one call.
    Body: {"message": "How many active listings?"}
    Returns: {"response": "You have 15 active listings...", "session_id": "..."}
    """
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

    body = await request.json()
    message = body.get("message", "").strip()
    if not message:
        return web.json_response({"error": "No message provided"}, status=400, headers=_cors_headers(request))

    # Rate limit check
    quick_sid = body.get("session_id", "quick_anonymous")
    rate_err = _check_rate_limit(quick_sid)
    if rate_err:
        return web.json_response({"error": rate_err}, status=429, headers=_cors_headers(request))

    # Reuse existing Siri session or create new one
    siri_sid = body.get("session_id")
    if siri_sid and siri_sid in _sessions:
        session = _sessions[siri_sid]
    else:
        session = SessionState(mode="realtor", realtor_id=CURRENT_REALTOR_ID)
        _sessions[session.session_id] = session
        siri_sid = session.session_id

    session.add_message("user", message)
    provider = get_provider_for_query(message)

    import time as _time
    _t0 = _time.time()
    _tools_used = []
    content = ""
    _total_input = 0
    _total_output = 0

    try:
        # Multi-round tool loop (same as streaming handler but non-streaming)
        for _round in range(4):
            tools = session.get_tools(message) if _round < 3 else None
            result = await provider.chat(session.get_messages_with_focus(), tools)
            _usage = result.get("usage", {})
            _total_input += _usage.get("input_tokens", 0)
            _total_output += _usage.get("output_tokens", 0)

            tool_calls = result.get("tool_calls")
            if not tool_calls:
                content = result.get("content", "")
                break

            # Store assistant tool_use in history
            raw_blocks = result.get("raw_content_blocks", [])
            if raw_blocks:
                session.messages.append({"role": "assistant_tool_use", "content": raw_blocks})

            # Execute tools and store results
            tool_result_blocks = []
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "")
                tool_use_id = tc.get("id", "")
                _tools_used.append(tool_name)
                tool_args = fn.get("arguments", {})
                if isinstance(tool_args, str):
                    try:
                        tool_args = json.loads(tool_args)
                    except json.JSONDecodeError:
                        tool_args = {}
                try:
                    tool_result = await session.handle_tool_call(tool_name, tool_args)
                except Exception as te:
                    tool_result = json.dumps({"error": str(te)})
                tool_result_blocks.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use_id,
                    "content": tool_result,
                })

            session.messages.append({"role": "tool_result", "content": tool_result_blocks})

        if not content.strip():
            content = "Sorry, I couldn't process that. Try again?"

        session.add_message("assistant", content)
        clean = _clean_for_voice(content)

        _latency = int((_time.time() - _t0) * 1000)
        log_cost(
            session_id=siri_sid, realtor_id=session.realtor_id,
            service="llm", provider=provider.name,
            model=getattr(provider, "model", None),
            input_tokens=_total_input, output_tokens=_total_output,
            latency_ms=_latency,
            metadata={"type": "quick", "source": body.get("source", "siri"), "tools": _tools_used},
        )

        return web.json_response({
            "ok": True,
            "response": clean,
            "session_id": siri_sid,
            "tools_used": _tools_used,
            "provider": provider.name,
        }, headers=_cors_headers(request))

    except Exception as e:
        return web.json_response({
            "error": str(e), "hint": "Voice agent error"
        }, status=500, headers=_cors_headers(request))


async def handle_stt(request):
    """POST /api/stt — Transcribe audio using Whisper.
    Accepts: multipart/form-data with 'audio' file, or raw audio bytes.
    Returns: {"text": "transcribed text", "provider": "whisper_local"}
    """
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

    import time as _time
    _t0 = _time.time()

    # Accept audio from multipart form or raw body
    content_type = request.content_type or ""
    audio_bytes = None
    language = "en"

    if "multipart" in content_type:
        reader = await request.multipart()
        async for part in reader:
            if part.name == "audio":
                audio_bytes = await part.read()
            elif part.name == "language":
                language = (await part.text()) or "en"
    else:
        audio_bytes = await request.read()
        language = request.query.get("language", "en")

    if not audio_bytes:
        return web.json_response({"error": "No audio provided"}, status=400, headers=_cors_headers(request))

    try:
        stt = get_stt_provider()
        text = await stt.transcribe(audio_bytes, language=language)
        _latency = int((_time.time() - _t0) * 1000)

        # Log STT cost
        audio_seconds = len(audio_bytes) / 32000  # rough estimate for 16kHz 16-bit
        log_cost(
            session_id="stt", realtor_id=CURRENT_REALTOR_ID,
            service="stt", provider=stt.name,
            audio_seconds=audio_seconds,
            latency_ms=_latency,
            metadata={"text_preview": text[:80]},
        )

        return web.json_response({
            "ok": True,
            "text": text,
            "provider": stt.name,
            "latency_ms": _latency,
        }, headers=_cors_headers(request))

    except Exception as e:
        return web.json_response({
            "error": f"STT failed: {e}",
            "provider": get_stt_provider().name,
        }, status=500, headers=_cors_headers(request))


async def handle_session_costs(request):
    """GET /api/costs/:session_id — Cost breakdown for a single session."""
    if not _check_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_cors_headers(request))

    sid = request.match_info["session_id"]
    breakdown = get_session_cost(sid)
    return web.json_response(breakdown, headers=_cors_headers(request))


def create_app():
    app = web.Application()
    app.on_startup.append(on_startup)
    app.on_shutdown.append(on_shutdown)
    app.router.add_route("OPTIONS", "/{path:.*}", handle_options)
    app.router.add_get("/api/health", handle_health)
    app.router.add_get("/api/sessions", handle_sessions_list)
    app.router.add_get("/api/providers", handle_providers)
    app.router.add_get("/api/reminders", handle_reminders)
    app.router.add_get("/api/costs", handle_costs)
    app.router.add_get("/api/costs/{session_id}", handle_session_costs)
    app.router.add_post("/api/session/create", handle_session_create)
    app.router.add_post("/api/chat", handle_chat)
    app.router.add_post("/api/chat/stream", handle_chat_stream)
    app.router.add_post("/api/quick", handle_quick)
    app.router.add_post("/api/tool", handle_tool)
    app.router.add_post("/api/tts", handle_tts)
    app.router.add_post("/api/stt", handle_stt)
    app.router.add_get("/api/tts/voices", handle_tts_voices)
    return app


def main():
    init_db()
    cleanup_expired_sessions()
    port = int(os.getenv("VOICE_AGENT_PORT", "8768"))

    provider = get_active_provider()
    logger.info("MAIN", f"LLM Provider: {provider.name} (available: {provider.is_available()})")
    logger.info("MAIN", f"Mode: {MODE}")

    if not AIOHTTP_AVAILABLE:
        logger.error("MAIN", "aiohttp is required. Install with: pip install aiohttp")
        sys.exit(1)

    app = create_app()
    logger.info("MAIN", f"Starting aiohttp server on http://127.0.0.1:{port}")
    logger.info("MAIN", f"Endpoints: /api/health, /api/providers, /api/session/create, /api/chat, /api/chat/stream, /api/tool, /api/reminders, /api/costs")
    if VOICE_AGENT_API_KEY:
        logger.info("MAIN", "API key authentication: ENABLED")
    else:
        logger.warn("MAIN", "API key authentication: DISABLED (set VOICE_AGENT_API_KEY to enable)")
    web.run_app(app, host="127.0.0.1", port=port, print=None)


if __name__ == "__main__":
    main()
