from __future__ import annotations
#!/usr/bin/env python3
"""
Database helper for the Voice Agent.
Uses Supabase (via supabase_client) for all persistence.
All functions are async and require tenant_id for multi-tenant isolation.
"""

import json
import uuid
from datetime import datetime, timedelta

import supabase_client as sb


# ── Graceful DB wrapper (tables may not exist yet) ─────────────────────────

import functools

def db_safe(default=None):
    """Decorator: catch DB errors (missing tables etc.) and return default."""
    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            try:
                return await fn(*args, **kwargs)
            except Exception as e:
                err = str(e)
                if "404" in err or "schema cache" in err or "Not Found" in err:
                    return default  # Table doesn't exist yet — silent
                print(f"[DB] {fn.__name__} error: {err[:120]}")
                return default
        return wrapper
    return decorator


# ── Schema / Init ──────────────────────────────────────────────────────────

async def init_db():
    """No-op. Schema is managed by Supabase migrations."""
    print("[DB] Using Supabase — schema managed by migrations")


def generate_id(prefix=""):
    """Generate a short unique ID."""
    short = uuid.uuid4().hex[:8]
    return f"{prefix}{short}" if prefix else short


# ── Buyer / Contact Operations ─────────────────────────────────────────────

@db_safe()
async def find_buyer(tenant_id: str, name: str = None, buyer_id: str = None):
    """Find buyer by name or ID from the contacts table."""
    if buyer_id:
        return await sb.query(
            "contacts",
            tenant_id=tenant_id,
            filters={"id": f"eq.{buyer_id}"},
            single=True,
        )
    elif name:
        return await sb.query(
            "contacts",
            tenant_id=tenant_id,
            filters={"name": f"ilike.%{name}%"},
        )
    return None


@db_safe()
async def create_buyer(
    tenant_id: str,
    name: str,
    criteria: dict,
    email: str = None,
    phone: str = None,
    notes: str = None,
):
    """Create a new buyer contact."""
    data = {
        "name": name,
        "email": email,
        "phone": phone,
        "type": "buyer",
        "notes": notes,
        "newsletter_intelligence": json.dumps({"buyer_criteria": criteria}),
    }
    return await sb.insert("contacts", tenant_id=tenant_id, data=data)


# ── Listing Operations ────────────────────────────────────────────────────

@db_safe()
async def find_listing(
    tenant_id: str,
    address: str = None,
    mls: str = None,
    listing_id: str = None,
):
    """Find listing by address, MLS number, or ID."""
    if listing_id:
        return await sb.query(
            "listings",
            tenant_id=tenant_id,
            filters={"id": f"eq.{listing_id}"},
            single=True,
        )
    elif mls:
        return await sb.query(
            "listings",
            tenant_id=tenant_id,
            filters={"mls_number": f"eq.{mls}"},
            single=True,
        )
    elif address:
        return await sb.query(
            "listings",
            tenant_id=tenant_id,
            filters={"address": f"ilike.%{address}%"},
        )
    return None


@db_safe()
async def search_properties(tenant_id: str, criteria: dict):
    """Search properties matching buyer criteria."""
    filters: dict = {"status": "eq.Active"}

    if criteria.get("min_price"):
        filters["list_price"] = f"gte.{criteria['min_price']}"
    if criteria.get("max_price"):
        # If min_price already set we need a separate key — use PostgREST range
        # For simplicity, override (last wins for same column). Build combined later if needed.
        if "list_price" in filters:
            # both min and max — use PostgREST "and" filter via column name tricks
            # PostgREST doesn't support two filters on same column in query params easily.
            # Workaround: use the "and" filter syntax or just accept last-wins.
            pass
        filters["list_price"] = f"lte.{criteria['max_price']}"
    if criteria.get("beds"):
        filters["beds"] = f"gte.{criteria['beds']}"
    if criteria.get("baths"):
        filters["baths"] = f"gte.{criteria['baths']}"
    if criteria.get("property_type"):
        filters["property_type"] = f"eq.{criteria['property_type']}"
    if criteria.get("city"):
        filters["city"] = f"ilike.%{criteria['city']}%"
    if criteria.get("min_sqft"):
        filters["sqft"] = f"gte.{criteria['min_sqft']}"

    return await sb.query(
        "listings",
        tenant_id=tenant_id,
        filters=filters,
        order="list_price.asc",
        limit=100,
    )


@db_safe()
async def update_listing_status(tenant_id: str, listing_id: str, new_status: str):
    """Update listing pipeline status."""
    valid = ["Active", "Conditional", "Subject Removal", "Sold", "Expired", "Cancelled"]
    if new_status not in valid:
        return {"error": f"Invalid status. Must be one of: {', '.join(valid)}"}

    await sb.update(
        "listings",
        tenant_id=tenant_id,
        filters={"id": listing_id},
        data={"status": new_status, "updated_at": datetime.now().isoformat()},
    )
    return {"ok": True, "listing_id": listing_id, "status": new_status}


@db_safe()
async def update_listing_price(tenant_id: str, listing_id: str, new_price: float):
    """Update listing price."""
    await sb.update(
        "listings",
        tenant_id=tenant_id,
        filters={"id": listing_id},
        data={"list_price": new_price, "updated_at": datetime.now().isoformat()},
    )
    return {"ok": True, "listing_id": listing_id, "price": new_price}


@db_safe()
async def add_listing_note(tenant_id: str, listing_id: str, note: str):
    """Append an internal note to a listing."""
    row = await sb.query(
        "listings",
        tenant_id=tenant_id,
        select="internal_notes",
        filters={"id": f"eq.{listing_id}"},
        single=True,
    )
    if not row:
        return {"error": "Listing not found"}

    existing = row.get("internal_notes") or ""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    updated = f"{existing}\n[{timestamp}] {note}".strip()

    await sb.update(
        "listings",
        tenant_id=tenant_id,
        filters={"id": listing_id},
        data={"internal_notes": updated, "updated_at": datetime.now().isoformat()},
    )
    return {"ok": True, "listing_id": listing_id}


# ── Client Feedback ────────────────────────────────────────────────────────

@db_safe()
async def log_feedback(
    tenant_id: str,
    client_name: str,
    listing_id: str,
    feedback: str,
    feedback_type: str = "viewing",
    sentiment: str = "neutral",
    client_phone: str = None,
    follow_up: bool = False,
    session_id: str = None,
):
    """Log client feedback as a voice_conversation_logs entry."""
    await sb.insert(
        "voice_conversation_logs",
        tenant_id=tenant_id,
        data={
            "session_id": session_id or generate_id("fb-"),
            "mode": "feedback",
            "participant": client_name,
            "role": "tool_result",
            "content": feedback,
            "tool_name": "log_feedback",
            "tool_args": json.dumps({
                "listing_id": listing_id,
                "feedback_type": feedback_type,
                "sentiment": sentiment,
                "client_phone": client_phone,
                "follow_up": follow_up,
            }),
        },
    )
    return {"ok": True}


@db_safe()
async def get_client_playbook(
    tenant_id: str,
    listing_id: str = None,
    mode: str = "feedback",
):
    """Get the playbook/script for a client call from voice_preferences."""
    key = f"playbook:{mode}:{listing_id}" if listing_id else f"playbook:{mode}:default"

    rows = await sb.query(
        "voice_preferences",
        tenant_id=tenant_id,
        filters={"key": f"eq.{key}"},
        limit=1,
    )
    if rows:
        value = rows[0].get("value")
        if isinstance(value, str):
            value = json.loads(value)
        return value
    return None


@db_safe()
async def configure_client_call(
    tenant_id: str,
    name: str,
    listing_id: str,
    questions: list,
    talking_points: list,
    mode: str = "feedback",
):
    """Create or update a client call playbook stored as a voice preference."""
    key = f"playbook:{mode}:{listing_id}" if listing_id else f"playbook:{mode}:default"

    await sb.upsert(
        "voice_preferences",
        tenant_id=tenant_id,
        data={
            "key": key,
            "value": json.dumps({
                "name": name,
                "listing_id": listing_id,
                "questions": questions,
                "talking_points": talking_points,
                "mode": mode,
                "active": True,
            }),
        },
        on_conflict="tenant_id,key",
    )
    return {"ok": True}


# ── Conversation Logging ──────────────────────────────────────────────────

@db_safe()
async def log_conversation(
    tenant_id: str,
    session_id: str,
    mode: str,
    participant: str,
    role: str,
    content: str,
    tool_name: str = None,
    tool_args: dict = None,
    tool_result: dict = None,
):
    """Log a conversation message for history and personalization."""
    await sb.insert(
        "voice_conversation_logs",
        tenant_id=tenant_id,
        data={
            "session_id": session_id,
            "mode": mode,
            "participant": participant,
            "role": role,
            "content": content,
            "tool_name": tool_name,
            "tool_args": json.dumps(tool_args) if tool_args else None,
            "tool_result": json.dumps(tool_result) if tool_result else None,
        },
    )


@db_safe()
async def get_conversation_history(
    tenant_id: str,
    session_id: str = None,
    participant: str = None,
    limit: int = 50,
):
    """Retrieve conversation history for context."""
    filters: dict = {}
    if session_id:
        filters["session_id"] = f"eq.{session_id}"
    if participant:
        filters["participant"] = f"ilike.%{participant}%"

    rows = await sb.query(
        "voice_conversation_logs",
        tenant_id=tenant_id,
        filters=filters,
        order="created_at.desc",
        limit=limit,
    )
    # Return in chronological order
    return list(reversed(rows)) if rows else []


# ── Personalization / Preferences ─────────────────────────────────────────

@db_safe()
async def track_preference(tenant_id: str, key: str, value):
    """Track or update a realtor preference/pattern."""
    # Try to fetch existing to bump frequency
    existing = await sb.query(
        "voice_preferences",
        tenant_id=tenant_id,
        filters={"key": f"eq.{key}"},
        limit=1,
    )
    if existing:
        freq = (existing[0].get("frequency") or 0) + 1
        await sb.update(
            "voice_preferences",
            tenant_id=tenant_id,
            filters={"key": key},
            data={
                "value": json.dumps(value),
                "frequency": freq,
                "last_used": datetime.now().isoformat(),
            },
        )
    else:
        await sb.insert(
            "voice_preferences",
            tenant_id=tenant_id,
            data={
                "key": key,
                "value": json.dumps(value),
                "frequency": 1,
            },
        )


@db_safe()
async def get_preferences(tenant_id: str) -> dict:
    """Get all personalization preferences for a tenant."""
    rows = await sb.query(
        "voice_preferences",
        tenant_id=tenant_id,
        order="frequency.desc",
        limit=200,
    )
    result = {}
    for r in rows:
        val = r.get("value")
        try:
            result[r["key"]] = json.loads(val) if isinstance(val, str) else val
        except (json.JSONDecodeError, TypeError):
            result[r["key"]] = val
    return result


# ── Notes ─────────────────────────────────────────────────────────────────

@db_safe()
async def save_note(
    tenant_id: str,
    title: str,
    content: str,
    tags: list = None,
):
    """Save a quick note."""
    row = await sb.insert(
        "voice_notes",
        tenant_id=tenant_id,
        data={
            "title": title,
            "content": content,
            "tags": json.dumps(tags or []),
        },
    )
    return row.get("id")


@db_safe()
async def get_notes(
    tenant_id: str,
    search: str = None,
    tag: str = None,
    limit: int = 10,
):
    """Retrieve saved notes with optional search/filter."""
    filters: dict = {}
    if search:
        # Use or filter via PostgREST — search title or content
        filters["or"] = f"(title.ilike.%{search}%,content.ilike.%{search}%)"
    if tag:
        filters["tags"] = f"like.%\"{tag}\"%"

    rows = await sb.query(
        "voice_notes",
        tenant_id=tenant_id,
        filters=filters,
        order="created_at.desc",
        limit=limit,
    )
    results = []
    for r in rows:
        tags_val = r.get("tags")
        try:
            r["tags"] = json.loads(tags_val) if isinstance(tags_val, str) else (tags_val or [])
        except (json.JSONDecodeError, TypeError):
            r["tags"] = []
        results.append(r)
    return results


# ── Reminders ─────────────────────────────────────────────────────────────

@db_safe()
async def save_reminder(tenant_id: str, message: str, remind_at: str):
    """Save a timed reminder."""
    row = await sb.insert(
        "voice_reminders",
        tenant_id=tenant_id,
        data={
            "message": message,
            "remind_at": remind_at,
        },
    )
    return row.get("id")


@db_safe()
async def get_reminders(tenant_id: str, include_past: bool = False):
    """Get pending reminders."""
    filters: dict = {}
    if not include_past:
        filters["acknowledged"] = "eq.false"
        filters["remind_at"] = f"gte.{datetime.now().isoformat()}"

    rows = await sb.query(
        "voice_reminders",
        tenant_id=tenant_id,
        filters=filters,
        order="remind_at.asc",
        limit=100,
    )
    return rows or []


# ── Session Persistence ──────────────────────────────────────────────────

@db_safe()
async def save_session(
    tenant_id: str,
    session_id: str,
    mode: str,
    messages: list,
    participant: str = None,
    expires_at: str = None,
):
    """Persist a session to the database."""
    if expires_at is None:
        from config import SESSION_EXPIRY_HOURS
        expires_at = (datetime.now() + timedelta(hours=SESSION_EXPIRY_HOURS)).isoformat()

    await sb.upsert(
        "voice_sessions",
        tenant_id=tenant_id,
        data={
            "id": session_id,
            "mode": mode,
            "messages": json.dumps(messages),
            "participant": participant,
            "updated_at": datetime.now().isoformat(),
            "expires_at": expires_at,
        },
        on_conflict="id",
    )


@db_safe()
async def load_session(tenant_id: str, session_id: str):
    """Load a persisted session."""
    rows = await sb.query(
        "voice_sessions",
        tenant_id=tenant_id,
        filters={
            "id": f"eq.{session_id}",
            "expires_at": f"gt.{datetime.now().isoformat()}",
        },
        limit=1,
    )
    if rows:
        d = rows[0]
        msgs = d.get("messages")
        d["messages"] = json.loads(msgs) if isinstance(msgs, str) else (msgs or [])
        return d
    return None


@db_safe()
async def cleanup_expired_sessions(tenant_id: str):
    """Remove expired sessions."""
    await sb.delete(
        "voice_sessions",
        tenant_id=tenant_id,
        filters={"expires_at": f"lt.{datetime.now().isoformat()}"},
    )


# ── Cost Tracking / Logbook ─────────────────────────────────────────────

# Rates per 1K tokens / per minute / per 1K chars
COST_RATES = {
    "llm": {
        "anthropic": {"input": 0.003, "output": 0.015},
        "openai": {"input": 0.0025, "output": 0.010},
        "ollama": {"input": 0.0, "output": 0.0},
        "groq": {"input": 0.00059, "output": 0.00079},
    },
    "llm_by_model": {
        "claude-haiku-4-5-20251001": {"input": 0.0008, "output": 0.004},
        "claude-sonnet-4-20250514": {"input": 0.003, "output": 0.015},
    },
    "stt": {
        "openai_whisper": 0.006,
        "whisper_local": 0.0,
    },
    "tts": {
        "openai_tts": 0.015,
        "openai_tts_hd": 0.030,
        "edge_tts": 0.0,
        "piper": 0.0,
        "elevenlabs": 0.018,
    },
}


def calculate_cost(service, provider, input_tokens=0, output_tokens=0,
                   audio_seconds=0.0, chars_processed=0, model=None):
    """Calculate cost for a single API call (pure function, no DB)."""
    if service == "llm":
        if model and model in COST_RATES.get("llm_by_model", {}):
            rates = COST_RATES["llm_by_model"][model]
        else:
            rates = COST_RATES["llm"].get(provider, {"input": 0, "output": 0})
        return (input_tokens / 1000) * rates["input"] + (output_tokens / 1000) * rates["output"]
    elif service == "stt":
        rate = COST_RATES["stt"].get(provider, 0.0)
        return (audio_seconds / 60) * rate
    elif service == "tts":
        rate = COST_RATES["tts"].get(provider, 0.0)
        return (chars_processed / 1000) * rate
    return 0.0


@db_safe()
async def log_cost(
    tenant_id: str,
    session_id: str,
    service: str,
    provider: str,
    model: str = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    audio_seconds: float = 0.0,
    chars_processed: int = 0,
    latency_ms: int = None,
    metadata: dict = None,
):
    """Log a cost entry and return the calculated cost."""
    cost = calculate_cost(
        service, provider, input_tokens, output_tokens,
        audio_seconds, chars_processed, model=model,
    )

    await sb.insert(
        "voice_cost_log",
        tenant_id=tenant_id,
        data={
            "session_id": session_id,
            "service": service,
            "provider": provider,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "audio_seconds": audio_seconds,
            "chars_processed": chars_processed,
            "cost_usd": cost,
            "latency_ms": latency_ms,
            "metadata": json.dumps(metadata) if metadata else None,
        },
    )
    return cost


@db_safe()
async def get_cost_summary(tenant_id: str, days: int = 30):
    """Get cost summary for the dashboard.

    Note: Complex aggregation queries are not supported via PostgREST.
    This fetches raw rows and aggregates in Python.
    """
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()

    rows = await sb.query(
        "voice_cost_log",
        tenant_id=tenant_id,
        filters={"created_at": f"gte.{cutoff}"},
        order="created_at.desc",
        limit=5000,
    )

    if not rows:
        return {
            "period_days": days,
            "totals": {"cost_usd": 0, "sessions": 0, "api_calls": 0, "audio_minutes": 0},
            "by_service": [],
            "daily": [],
            "top_sessions": [],
        }

    # Aggregate by service+provider
    by_svc: dict = {}
    for r in rows:
        key = (r.get("service", ""), r.get("provider", ""))
        if key not in by_svc:
            by_svc[key] = {
                "service": key[0], "provider": key[1], "calls": 0,
                "total_cost": 0, "total_input_tokens": 0, "total_output_tokens": 0,
                "total_audio_seconds": 0, "total_chars": 0, "latency_sum": 0, "latency_count": 0,
            }
        s = by_svc[key]
        s["calls"] += 1
        s["total_cost"] += r.get("cost_usd") or 0
        s["total_input_tokens"] += r.get("input_tokens") or 0
        s["total_output_tokens"] += r.get("output_tokens") or 0
        s["total_audio_seconds"] += r.get("audio_seconds") or 0
        s["total_chars"] += r.get("chars_processed") or 0
        if r.get("latency_ms"):
            s["latency_sum"] += r["latency_ms"]
            s["latency_count"] += 1

    by_service = []
    for s in sorted(by_svc.values(), key=lambda x: -x["total_cost"]):
        s["avg_latency_ms"] = (s["latency_sum"] / s["latency_count"]) if s["latency_count"] else None
        del s["latency_sum"]
        del s["latency_count"]
        by_service.append(s)

    # Daily breakdown
    by_day: dict = {}
    session_ids = set()
    total_cost = 0.0
    total_audio = 0.0
    for r in rows:
        date_str = (r.get("created_at") or "")[:10]
        if date_str not in by_day:
            by_day[date_str] = {"date": date_str, "calls": 0, "cost": 0, "sessions": set()}
        by_day[date_str]["calls"] += 1
        by_day[date_str]["cost"] += r.get("cost_usd") or 0
        by_day[date_str]["sessions"].add(r.get("session_id"))
        session_ids.add(r.get("session_id"))
        total_cost += r.get("cost_usd") or 0
        total_audio += r.get("audio_seconds") or 0

    daily = []
    for d in sorted(by_day.values(), key=lambda x: x["date"], reverse=True):
        d["sessions"] = len(d["sessions"])
        daily.append(d)

    # Top sessions by cost
    by_sess: dict = {}
    for r in rows:
        sid = r.get("session_id")
        if sid not in by_sess:
            by_sess[sid] = {
                "session_id": sid, "calls": 0, "cost": 0, "audio_seconds": 0,
                "started_at": r.get("created_at"), "ended_at": r.get("created_at"),
            }
        bs = by_sess[sid]
        bs["calls"] += 1
        bs["cost"] += r.get("cost_usd") or 0
        bs["audio_seconds"] += r.get("audio_seconds") or 0
        if r.get("created_at", "") < bs["started_at"]:
            bs["started_at"] = r["created_at"]
        if r.get("created_at", "") > bs["ended_at"]:
            bs["ended_at"] = r["created_at"]

    top_sessions = sorted(by_sess.values(), key=lambda x: -x["cost"])[:10]

    return {
        "period_days": days,
        "totals": {
            "cost_usd": round(total_cost, 4),
            "sessions": len(session_ids),
            "api_calls": len(rows),
            "audio_minutes": round(total_audio / 60, 1),
        },
        "by_service": by_service,
        "daily": daily,
        "top_sessions": top_sessions,
    }


@db_safe()
async def get_session_cost(tenant_id: str, session_id: str):
    """Get cost breakdown for a single session."""
    rows = await sb.query(
        "voice_cost_log",
        tenant_id=tenant_id,
        filters={"session_id": f"eq.{session_id}"},
        order="created_at.asc",
        limit=1000,
    )

    entries = rows or []
    total = sum(e.get("cost_usd", 0) for e in entries)
    duration = 0
    if len(entries) >= 2:
        try:
            start = datetime.fromisoformat(entries[0]["created_at"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(entries[-1]["created_at"].replace("Z", "+00:00"))
            duration = (end - start).total_seconds()
        except (KeyError, ValueError):
            pass

    return {
        "session_id": session_id,
        "total_cost_usd": round(total, 4),
        "duration_seconds": round(duration),
        "entries": entries,
    }
