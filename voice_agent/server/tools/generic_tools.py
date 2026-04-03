from __future__ import annotations
#!/usr/bin/env python3
"""
Generic Assistant Tools
General-purpose tools that work alongside real estate tools.
Provides: time, math, notes, reminders, web search, weather, summarization.
"""

import json
import math
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import save_note, get_notes, save_reminder, get_reminders
from api_client import api

# ═══════════════════════════════════════════════════════════════════════════════
#  TOOL SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

GENERIC_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "Get the current date and time, optionally in a specific timezone.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "IANA timezone (e.g. 'America/Vancouver', 'UTC', 'Asia/Tokyo'). Defaults to local time.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluate a mathematical expression safely. Supports basic arithmetic, exponents, sqrt, trig, log, abs, round, min, max.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Math expression (e.g. '(1850000 * 0.025) + 500', 'sqrt(144)', '15 ** 2')",
                    },
                },
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "take_note",
            "description": "Save a quick note for later retrieval. Useful for capturing ideas, tasks, or information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Short title for the note"},
                    "content": {"type": "string", "description": "The note content"},
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional tags for categorization",
                    },
                },
                "required": ["title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_notes",
            "description": "Retrieve saved notes. Can search by title keyword or tag.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "Search notes by title or content"},
                    "tag": {"type": "string", "description": "Filter by tag"},
                    "limit": {"type": "integer", "description": "Max notes to return (default 10)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_reminder",
            "description": "Set a reminder for a specific time or after a delay.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "What to remind about"},
                    "when": {
                        "type": "string",
                        "description": "When to remind. ISO datetime (e.g. '2025-03-15T14:00:00') or relative (e.g. '30m', '2h', '1d')",
                    },
                },
                "required": ["message", "when"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information. Returns top results with titles, URLs, and snippets.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "max_results": {"type": "integer", "description": "Max results (default 5, max 10)"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "weather",
            "description": "Get current weather information for a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name or location (e.g. 'Vancouver, BC', 'Surrey')"},
                },
                "required": ["location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "summarize_text",
            "description": "Summarize a long piece of text into key bullet points.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "The text to summarize"},
                    "style": {
                        "type": "string",
                        "enum": ["brief", "detailed", "bullet_points"],
                        "description": "Summary style (default: bullet_points)",
                    },
                },
                "required": ["text"],
            },
        },
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
#  SAFE MATH EVALUATOR
# ═══════════════════════════════════════════════════════════════════════════════

_SAFE_MATH_NAMES = {
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "pi": math.pi,
    "e": math.e,
    "ceil": math.ceil,
    "floor": math.floor,
    "pow": pow,
}


def safe_eval_math(expression: str) -> float:
    """Safely evaluate a math expression using ast."""
    import ast
    import operator

    _OPS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError(f"Unsupported constant: {node.value}")
        elif isinstance(node, ast.BinOp):
            op = _OPS.get(type(node.op))
            if not op:
                raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
            return op(_eval(node.left), _eval(node.right))
        elif isinstance(node, ast.UnaryOp):
            op = _OPS.get(type(node.op))
            if not op:
                raise ValueError(f"Unsupported unary op: {type(node.op).__name__}")
            return op(_eval(node.operand))
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in _SAFE_MATH_NAMES:
                func = _SAFE_MATH_NAMES[node.func.id]
                args = [_eval(arg) for arg in node.args]
                return func(*args)
            raise ValueError(f"Unsupported function: {ast.dump(node.func)}")
        elif isinstance(node, ast.Name):
            if node.id in _SAFE_MATH_NAMES:
                return _SAFE_MATH_NAMES[node.id]
            raise ValueError(f"Unsupported name: {node.id}")
        else:
            raise ValueError(f"Unsupported expression: {type(node).__name__}")

    tree = ast.parse(expression, mode="eval")
    return _eval(tree)


# ═══════════════════════════════════════════════════════════════════════════════
#  TOOL HANDLER
# ═══════════════════════════════════════════════════════════════════════════════

def _parse_relative_time(when_str: str) -> datetime:
    """Parse relative time strings like '30m', '2h', '1d'."""
    from datetime import timedelta

    when_str = when_str.strip().lower()
    units = {"m": "minutes", "h": "hours", "d": "days", "s": "seconds"}

    for suffix, unit in units.items():
        if when_str.endswith(suffix):
            try:
                value = int(when_str[:-1])
                return datetime.now() + timedelta(**{unit: value})
            except ValueError:
                pass

    # Try ISO format
    try:
        return datetime.fromisoformat(when_str)
    except ValueError:
        raise ValueError(f"Cannot parse time: {when_str}. Use ISO format or relative (e.g. '30m', '2h', '1d').")


async def handle_generic_tool(tool_name: str, args: dict, realtor_id: str = "R001") -> str:
    """Dispatch a generic tool call and return a JSON string result."""
    try:
        if tool_name == "get_current_time":
            tz_name = args.get("timezone")
            if tz_name:
                try:
                    from zoneinfo import ZoneInfo
                    tz = ZoneInfo(tz_name)
                    now = datetime.now(tz)
                except (ImportError, KeyError):
                    # Fallback if zoneinfo is not available
                    now = datetime.now()
                    return json.dumps({
                        "datetime": now.isoformat(),
                        "formatted": now.strftime("%A, %B %d, %Y at %I:%M %p"),
                        "note": f"Could not resolve timezone '{tz_name}', showing local time.",
                    })
            else:
                now = datetime.now()

            result = {
                "datetime": now.isoformat(),
                "date": now.strftime("%Y-%m-%d"),
                "time": now.strftime("%I:%M %p"),
                "day": now.strftime("%A"),
                "formatted": now.strftime("%A, %B %d, %Y at %I:%M %p"),
                "timezone": tz_name or "local",
            }

        elif tool_name == "calculate":
            expression = args["expression"]
            try:
                answer = safe_eval_math(expression)
                result = {
                    "expression": expression,
                    "result": answer,
                    "formatted": f"{answer:,.2f}" if isinstance(answer, float) else str(answer),
                }
            except Exception as e:
                result = {"error": f"Math error: {e}", "expression": expression}

        elif tool_name == "take_note":
            note_id = save_note(
                title=args["title"],
                content=args["content"],
                tags=args.get("tags", []),
                realtor_id=realtor_id,
            )
            # Also log as CRM activity so it shows up in the system
            crm_result = None
            try:
                crm_result = await api.post("/api/voice-agent/activities", {
                    "type": "note",
                    "description": f"{args['title']}: {args['content']}",
                })
            except Exception:
                pass  # Local note is saved, CRM is best-effort
            result = {"ok": True, "note_id": note_id, "crm_activity": crm_result, "message": f"Note '{args['title']}' saved."}

        elif tool_name == "get_notes":
            notes = get_notes(
                search=args.get("search"),
                tag=args.get("tag"),
                limit=args.get("limit", 10),
                realtor_id=realtor_id,
            )
            result = {"notes": notes, "count": len(notes)}

        elif tool_name == "set_reminder":
            when = _parse_relative_time(args["when"])
            # Save to local SQLite as backup
            reminder_id = save_reminder(
                message=args["message"],
                remind_at=when.isoformat(),
                realtor_id=realtor_id,
            )
            # Also create a real CRM task so it shows up in the system
            crm_result = None
            try:
                crm_result = await api.post("/api/voice-agent/tasks", {
                    "title": args["message"],
                    "due_date": when.isoformat(),
                    "priority": "medium",
                    "category": "follow_up",
                })
            except Exception as e:
                crm_result = {"error": f"Local reminder saved but CRM task failed: {e}"}
            result = {
                "ok": True,
                "reminder_id": reminder_id,
                "crm_task": crm_result,
                "message": f"Reminder set for {when.strftime('%I:%M %p on %B %d')} and added to your CRM tasks.",
                "remind_at": when.isoformat(),
            }

        elif tool_name == "web_search":
            query = args["query"]
            max_results = min(args.get("max_results", 5), 10)
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, max_results=max_results))
                result = {
                    "query": query,
                    "results": [
                        {
                            "title": r.get("title", ""),
                            "url": r.get("href", ""),
                            "snippet": r.get("body", ""),
                        }
                        for r in results
                    ],
                    "count": len(results),
                }
            except ImportError:
                result = {
                    "error": "Web search not available. Install: pip install duckduckgo-search",
                    "query": query,
                }
            except Exception as e:
                result = {"error": f"Search failed: {e}", "query": query}

        elif tool_name == "weather":
            location = args["location"]
            try:
                import httpx
                resp = httpx.get(
                    f"https://wttr.in/{location}?format=j1",
                    timeout=10,
                    follow_redirects=True,
                )
                resp.raise_for_status()
                data = resp.json()
                current = data.get("current_condition", [{}])[0]
                result = {
                    "location": location,
                    "temperature_c": current.get("temp_C", "N/A"),
                    "temperature_f": current.get("temp_F", "N/A"),
                    "feels_like_c": current.get("FeelsLikeC", "N/A"),
                    "condition": current.get("weatherDesc", [{}])[0].get("value", "Unknown"),
                    "humidity": current.get("humidity", "N/A"),
                    "wind_kmph": current.get("windspeedKmph", "N/A"),
                    "wind_dir": current.get("winddir16Point", "N/A"),
                    "visibility_km": current.get("visibility", "N/A"),
                    "uv_index": current.get("uvIndex", "N/A"),
                }
            except ImportError:
                result = {"error": "httpx not installed. pip install httpx", "location": location}
            except Exception as e:
                result = {"error": f"Weather lookup failed: {e}", "location": location}

        elif tool_name == "summarize_text":
            text = args["text"]
            style = args.get("style", "bullet_points")
            # For summarization, we return instructions for the LLM to summarize
            # This is handled by the LLM itself, not a tool
            word_count = len(text.split())
            result = {
                "original_word_count": word_count,
                "style": style,
                "text_preview": text[:500] + "..." if len(text) > 500 else text,
                "instruction": f"Please summarize the following text in {style} style. Text has {word_count} words.",
            }

        else:
            result = {"error": f"Unknown generic tool: {tool_name}"}

    except Exception as e:
        result = {"error": str(e)}

    return json.dumps(result, default=str)
