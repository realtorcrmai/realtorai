#!/usr/bin/env python3
"""
Database helper for the Voice Agent.
Handles SQLite connection, schema initialization, and common queries.
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime
from contextlib import contextmanager

from config import DATABASE_PATH


def _ensure_db_dir():
    """Ensure the data directory exists."""
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)


def init_db():
    """Initialize the database with schema.sql."""
    _ensure_db_dir()
    schema_path = os.path.join(os.path.dirname(__file__), "data", "schema.sql")
    with open(schema_path, "r") as f:
        schema = f.read()
    conn = sqlite3.connect(DATABASE_PATH)
    conn.executescript(schema)
    conn.close()
    print(f"[DB] Initialized → {DATABASE_PATH}")


@contextmanager
def get_db():
    """Context manager for database connections."""
    _ensure_db_dir()
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def generate_id(prefix=""):
    """Generate a short unique ID."""
    short = uuid.uuid4().hex[:8]
    return f"{prefix}{short}" if prefix else short


# ── Buyer Operations ────────────────────────────────────────────────────────

def find_buyer(name=None, buyer_id=None, realtor_id="R001"):
    """Find buyer by name or ID."""
    with get_db() as conn:
        if buyer_id:
            row = conn.execute(
                "SELECT * FROM buyers WHERE id = ? AND realtor_id = ?",
                (buyer_id, realtor_id)
            ).fetchone()
            return dict(row) if row else None
        elif name:
            rows = conn.execute(
                "SELECT * FROM buyers WHERE name LIKE ? AND realtor_id = ?",
                (f"%{name}%", realtor_id)
            ).fetchall()
            return [dict(r) for r in rows]
    return None


def create_buyer(name, criteria, realtor_id="R001", email=None, phone=None, notes=None):
    """Create a new buyer profile."""
    bid = generate_id("B")
    with get_db() as conn:
        conn.execute(
            """INSERT INTO buyers (id, name, email, phone, criteria, notes, realtor_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (bid, name, email, phone, json.dumps(criteria), notes, realtor_id)
        )
    return bid


# ── Listing Operations ──────────────────────────────────────────────────────

def find_listing(address=None, mls=None, listing_id=None, realtor_id="R001"):
    """Find listing by address, MLS number, or ID."""
    with get_db() as conn:
        if listing_id:
            row = conn.execute(
                "SELECT * FROM listings WHERE id = ? AND realtor_id = ?",
                (listing_id, realtor_id)
            ).fetchone()
            return dict(row) if row else None
        elif mls:
            row = conn.execute(
                "SELECT * FROM listings WHERE mls_number = ? AND realtor_id = ?",
                (mls, realtor_id)
            ).fetchone()
            return dict(row) if row else None
        elif address:
            rows = conn.execute(
                "SELECT * FROM listings WHERE address LIKE ? AND realtor_id = ?",
                (f"%{address}%", realtor_id)
            ).fetchall()
            return [dict(r) for r in rows]
    return None


def search_properties(criteria, realtor_id="R001"):
    """Search properties matching buyer criteria."""
    conditions = ["realtor_id = ?", "status = 'Active'"]
    params = [realtor_id]

    if criteria.get("min_price"):
        conditions.append("list_price >= ?")
        params.append(criteria["min_price"])
    if criteria.get("max_price"):
        conditions.append("list_price <= ?")
        params.append(criteria["max_price"])
    if criteria.get("beds"):
        conditions.append("beds >= ?")
        params.append(criteria["beds"])
    if criteria.get("baths"):
        conditions.append("baths >= ?")
        params.append(criteria["baths"])
    if criteria.get("property_type"):
        conditions.append("property_type = ?")
        params.append(criteria["property_type"])
    if criteria.get("city"):
        conditions.append("city LIKE ?")
        params.append(f"%{criteria['city']}%")
    if criteria.get("min_sqft"):
        conditions.append("sqft >= ?")
        params.append(criteria["min_sqft"])

    where = " AND ".join(conditions)

    with get_db() as conn:
        rows = conn.execute(
            f"SELECT * FROM listings WHERE {where} ORDER BY list_price ASC",
            params
        ).fetchall()
        return [dict(r) for r in rows]


def update_listing_status(listing_id, new_status, realtor_id="R001"):
    """Update listing pipeline status."""
    valid = ["Active", "Conditional", "Subject Removal", "Sold", "Expired", "Cancelled"]
    if new_status not in valid:
        return {"error": f"Invalid status. Must be one of: {', '.join(valid)}"}
    with get_db() as conn:
        conn.execute(
            "UPDATE listings SET status = ?, updated_at = ? WHERE id = ? AND realtor_id = ?",
            (new_status, datetime.now().isoformat(), listing_id, realtor_id)
        )
    return {"ok": True, "listing_id": listing_id, "status": new_status}


def update_listing_price(listing_id, new_price, realtor_id="R001"):
    """Update listing price."""
    with get_db() as conn:
        conn.execute(
            "UPDATE listings SET list_price = ?, updated_at = ? WHERE id = ? AND realtor_id = ?",
            (new_price, datetime.now().isoformat(), listing_id, realtor_id)
        )
    return {"ok": True, "listing_id": listing_id, "price": new_price}


def add_listing_note(listing_id, note, realtor_id="R001"):
    """Append an internal note to a listing."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT internal_notes FROM listings WHERE id = ? AND realtor_id = ?",
            (listing_id, realtor_id)
        ).fetchone()
        if not row:
            return {"error": "Listing not found"}
        existing = row["internal_notes"] or ""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        updated = f"{existing}\n[{timestamp}] {note}".strip()
        conn.execute(
            "UPDATE listings SET internal_notes = ?, updated_at = ? WHERE id = ? AND realtor_id = ?",
            (updated, datetime.now().isoformat(), listing_id, realtor_id)
        )
    return {"ok": True, "listing_id": listing_id}


# ── Client Feedback ─────────────────────────────────────────────────────────

def log_feedback(client_name, listing_id, feedback, feedback_type="viewing",
                 sentiment="neutral", realtor_id="R001", client_phone=None, follow_up=False):
    """Log client feedback from a call."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO client_feedback
               (client_name, client_phone, listing_id, feedback_type, feedback, sentiment, follow_up, realtor_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (client_name, client_phone, listing_id, feedback_type, feedback,
             sentiment, 1 if follow_up else 0, realtor_id)
        )
    return {"ok": True}


def get_client_playbook(listing_id=None, mode="feedback", realtor_id="R001"):
    """Get the playbook/script for a client call."""
    with get_db() as conn:
        if listing_id:
            row = conn.execute(
                """SELECT * FROM client_playbooks
                   WHERE listing_id = ? AND mode = ? AND realtor_id = ? AND active = 1
                   ORDER BY created_at DESC LIMIT 1""",
                (listing_id, mode, realtor_id)
            ).fetchone()
        else:
            row = conn.execute(
                """SELECT * FROM client_playbooks
                   WHERE mode = ? AND realtor_id = ? AND active = 1
                   ORDER BY created_at DESC LIMIT 1""",
                (mode, realtor_id)
            ).fetchone()
        if row:
            result = dict(row)
            result["questions"] = json.loads(result.get("questions") or "[]")
            result["talking_points"] = json.loads(result.get("talking_points") or "[]")
            return result
    return None


def configure_client_call(name, listing_id, questions, talking_points,
                          mode="feedback", realtor_id="R001"):
    """Create or update a client call playbook."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO client_playbooks (name, listing_id, questions, talking_points, mode, realtor_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, listing_id, json.dumps(questions), json.dumps(talking_points), mode, realtor_id)
        )
    return {"ok": True}


# ── Conversation Logging ────────────────────────────────────────────────────

def log_conversation(session_id, mode, participant, role, content,
                     tool_name=None, tool_args=None, tool_result=None, realtor_id="R001"):
    """Log a conversation message for history and personalization."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO conversation_logs
               (session_id, mode, participant, role, content, tool_name, tool_args, tool_result, realtor_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (session_id, mode, participant, role, content,
             tool_name, json.dumps(tool_args) if tool_args else None,
             json.dumps(tool_result) if tool_result else None, realtor_id)
        )


def get_conversation_history(session_id=None, participant=None, limit=50, realtor_id="R001"):
    """Retrieve conversation history for context."""
    with get_db() as conn:
        conditions = ["realtor_id = ?"]
        params = [realtor_id]
        if session_id:
            conditions.append("session_id = ?")
            params.append(session_id)
        if participant:
            conditions.append("participant LIKE ?")
            params.append(f"%{participant}%")
        where = " AND ".join(conditions)
        rows = conn.execute(
            f"""SELECT * FROM conversation_logs
                WHERE {where} ORDER BY created_at DESC LIMIT ?""",
            params + [limit]
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


# ── Personalization ─────────────────────────────────────────────────────────

def track_preference(key, value, realtor_id="R001"):
    """Track or update a realtor preference/pattern."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM personalization WHERE realtor_id = ? AND key = ?",
            (realtor_id, key)
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE personalization
                   SET value = ?, frequency = frequency + 1, last_used = ?
                   WHERE realtor_id = ? AND key = ?""",
                (json.dumps(value), datetime.now().isoformat(), realtor_id, key)
            )
        else:
            conn.execute(
                """INSERT INTO personalization (realtor_id, key, value)
                   VALUES (?, ?, ?)""",
                (realtor_id, key, json.dumps(value))
            )


def get_preferences(realtor_id="R001"):
    """Get all personalization preferences for a realtor."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM personalization WHERE realtor_id = ? ORDER BY frequency DESC",
            (realtor_id,)
        ).fetchall()
        return {r["key"]: json.loads(r["value"]) for r in rows}


# ── Notes (Generic Assistant) ──────────────────────────────────────────────

def save_note(title, content, tags=None, realtor_id="R001"):
    """Save a quick note."""
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO notes (title, content, tags, realtor_id)
               VALUES (?, ?, ?, ?)""",
            (title, content, json.dumps(tags or []), realtor_id)
        )
        return cursor.lastrowid


def get_notes(search=None, tag=None, limit=10, realtor_id="R001"):
    """Retrieve saved notes with optional search/filter."""
    with get_db() as conn:
        conditions = ["realtor_id = ?"]
        params = [realtor_id]

        if search:
            conditions.append("(title LIKE ? OR content LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%"])
        if tag:
            conditions.append("tags LIKE ?")
            params.append(f'%"{tag}"%')

        where = " AND ".join(conditions)
        rows = conn.execute(
            f"SELECT * FROM notes WHERE {where} ORDER BY created_at DESC LIMIT ?",
            params + [limit]
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["tags"] = json.loads(d.get("tags") or "[]")
            results.append(d)
        return results


# ── Reminders (Generic Assistant) ──────────────────────────────────────────

def save_reminder(message, remind_at, realtor_id="R001"):
    """Save a timed reminder."""
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO reminders (message, remind_at, realtor_id)
               VALUES (?, ?, ?)""",
            (message, remind_at, realtor_id)
        )
        return cursor.lastrowid


def get_reminders(include_past=False, realtor_id="R001"):
    """Get pending reminders."""
    with get_db() as conn:
        if include_past:
            rows = conn.execute(
                "SELECT * FROM reminders WHERE realtor_id = ? ORDER BY remind_at ASC",
                (realtor_id,)
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT * FROM reminders
                   WHERE realtor_id = ? AND acknowledged = 0 AND remind_at >= datetime('now')
                   ORDER BY remind_at ASC""",
                (realtor_id,)
            ).fetchall()
        return [dict(r) for r in rows]


# ── Session Persistence ───────────────────────────────────────────────────

def save_session(session_id, mode, realtor_id, messages, participant=None, expires_at=None):
    """Persist a session to the database."""
    if expires_at is None:
        from config import SESSION_EXPIRY_HOURS
        from datetime import timedelta
        expires_at = (datetime.now() + timedelta(hours=SESSION_EXPIRY_HOURS)).isoformat()

    with get_db() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO sessions (id, mode, realtor_id, messages, participant, updated_at, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (session_id, mode, realtor_id, json.dumps(messages), participant,
             datetime.now().isoformat(), expires_at)
        )


def load_session(session_id):
    """Load a persisted session."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')",
            (session_id,)
        ).fetchone()
        if row:
            d = dict(row)
            d["messages"] = json.loads(d["messages"])
            return d
    return None


def cleanup_expired_sessions():
    """Remove expired sessions."""
    with get_db() as conn:
        conn.execute("DELETE FROM sessions WHERE expires_at < datetime('now')")


# ── Cost Tracking / Logbook ───────────────────────────────────────────────

# Rates per 1K tokens / per minute / per 1K chars
COST_RATES = {
    "llm": {
        "anthropic": {"input": 0.003, "output": 0.015},   # Sonnet per 1K tokens
        "openai": {"input": 0.0025, "output": 0.010},     # GPT-4o per 1K tokens
        "ollama": {"input": 0.0, "output": 0.0},          # Free (local)
        "groq": {"input": 0.00059, "output": 0.00079},    # Llama 70B per 1K tokens
    },
    "llm_by_model": {
        "claude-haiku-4-5-20251001": {"input": 0.0008, "output": 0.004},     # Haiku 4.5
        "claude-sonnet-4-20250514": {"input": 0.003, "output": 0.015},       # Sonnet 4
    },
    "stt": {
        "openai_whisper": 0.006,     # $ per minute of audio
        "whisper_local": 0.0,        # Free
    },
    "tts": {
        "openai_tts": 0.015,         # $ per 1K characters
        "openai_tts_hd": 0.030,      # $ per 1K characters (HD)
        "edge_tts": 0.0,             # Free
        "piper": 0.0,                # Free
        "elevenlabs": 0.018,         # $ per 1K characters (approx)
    },
}


def log_cost(session_id, realtor_id, service, provider, model=None,
             input_tokens=0, output_tokens=0, audio_seconds=0.0,
             chars_processed=0, latency_ms=None, metadata=None):
    """Log a cost entry and return the calculated cost."""
    cost = calculate_cost(service, provider, input_tokens, output_tokens,
                          audio_seconds, chars_processed, model=model)

    with get_db() as conn:
        conn.execute(
            """INSERT INTO cost_log
               (session_id, realtor_id, service, provider, model,
                input_tokens, output_tokens, audio_seconds, chars_processed,
                cost_usd, latency_ms, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (session_id, realtor_id, service, provider, model,
             input_tokens, output_tokens, audio_seconds, chars_processed,
             cost, latency_ms, json.dumps(metadata) if metadata else None)
        )
    return cost


def calculate_cost(service, provider, input_tokens=0, output_tokens=0,
                   audio_seconds=0.0, chars_processed=0, model=None):
    """Calculate cost for a single API call."""
    if service == "llm":
        # Use model-specific rates if available, otherwise fall back to provider rates
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


def get_cost_summary(realtor_id="R001", days=30):
    """Get cost summary for the dashboard."""
    with get_db() as conn:
        # Total costs by service
        rows = conn.execute(
            """SELECT
                service,
                provider,
                COUNT(*) as calls,
                SUM(cost_usd) as total_cost,
                SUM(input_tokens) as total_input_tokens,
                SUM(output_tokens) as total_output_tokens,
                SUM(audio_seconds) as total_audio_seconds,
                SUM(chars_processed) as total_chars,
                AVG(latency_ms) as avg_latency_ms
               FROM cost_log
               WHERE realtor_id = ? AND created_at >= datetime('now', ?)
               GROUP BY service, provider
               ORDER BY total_cost DESC""",
            (realtor_id, f"-{days} days")
        ).fetchall()
        by_service = [dict(r) for r in rows]

        # Daily breakdown
        daily = conn.execute(
            """SELECT
                DATE(created_at) as date,
                COUNT(*) as calls,
                SUM(cost_usd) as cost,
                COUNT(DISTINCT session_id) as sessions
               FROM cost_log
               WHERE realtor_id = ? AND created_at >= datetime('now', ?)
               GROUP BY DATE(created_at)
               ORDER BY date DESC""",
            (realtor_id, f"-{days} days")
        ).fetchall()
        daily_breakdown = [dict(r) for r in daily]

        # Grand totals
        totals = conn.execute(
            """SELECT
                COUNT(*) as total_calls,
                SUM(cost_usd) as total_cost,
                COUNT(DISTINCT session_id) as total_sessions,
                SUM(audio_seconds) as total_audio_seconds
               FROM cost_log
               WHERE realtor_id = ? AND created_at >= datetime('now', ?)""",
            (realtor_id, f"-{days} days")
        ).fetchone()

        # Top sessions by cost
        top_sessions = conn.execute(
            """SELECT
                session_id,
                COUNT(*) as calls,
                SUM(cost_usd) as cost,
                SUM(audio_seconds) as audio_seconds,
                MIN(created_at) as started_at,
                MAX(created_at) as ended_at
               FROM cost_log
               WHERE realtor_id = ? AND created_at >= datetime('now', ?)
               GROUP BY session_id
               ORDER BY cost DESC
               LIMIT 10""",
            (realtor_id, f"-{days} days")
        ).fetchall()

        return {
            "period_days": days,
            "totals": {
                "cost_usd": round(totals["total_cost"] or 0, 4),
                "sessions": totals["total_sessions"] or 0,
                "api_calls": totals["total_calls"] or 0,
                "audio_minutes": round((totals["total_audio_seconds"] or 0) / 60, 1),
            },
            "by_service": by_service,
            "daily": daily_breakdown,
            "top_sessions": [dict(r) for r in top_sessions],
        }


def get_session_cost(session_id):
    """Get cost breakdown for a single session."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT service, provider, model, cost_usd, input_tokens,
                      output_tokens, audio_seconds, chars_processed, latency_ms, created_at
               FROM cost_log
               WHERE session_id = ?
               ORDER BY created_at ASC""",
            (session_id,)
        ).fetchall()

        entries = [dict(r) for r in rows]
        total = sum(e["cost_usd"] for e in entries)
        duration = 0
        if len(entries) >= 2:
            from datetime import datetime as dt
            start = dt.fromisoformat(entries[0]["created_at"])
            end = dt.fromisoformat(entries[-1]["created_at"])
            duration = (end - start).total_seconds()

        return {
            "session_id": session_id,
            "total_cost_usd": round(total, 4),
            "duration_seconds": round(duration),
            "entries": entries,
        }
