#!/usr/bin/env python3
"""
Realtor Mode Tools
Tool schemas (for Ollama function calling) and async handler functions
for the realtor-facing voice agent.

Tools that read/write listings, contacts, and showings call the Next.js
API bridge (→ Supabase). Voice-agent-internal tools (playbooks, conversation
history) stay in local SQLite.
"""

import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from api_client import api
from database import configure_client_call, get_conversation_history

# ═══════════════════════════════════════════════════════════════════════════════
#  TOOL SCHEMAS (OpenAI-compatible function calling format for Ollama)
# ═══════════════════════════════════════════════════════════════════════════════

REALTOR_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "find_buyer",
            "description": "Look up a buyer by name or buyer ID. Returns buyer profile with criteria and notes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Buyer name (partial match)"},
                    "buyer_id": {"type": "string", "description": "Buyer ID"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_buyer_profile",
            "description": "Create a new buyer profile with search criteria. Extract requirements from natural language.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Buyer's full name"},
                    "criteria": {
                        "type": "object",
                        "description": "Search criteria extracted from conversation",
                        "properties": {
                            "min_price": {"type": "number"},
                            "max_price": {"type": "number"},
                            "beds": {"type": "integer"},
                            "baths": {"type": "number"},
                            "property_type": {"type": "string"},
                            "city": {"type": "string"},
                            "areas": {"type": "array", "items": {"type": "string"}},
                            "min_sqft": {"type": "integer"},
                            "must_haves": {"type": "array", "items": {"type": "string"}},
                            "deal_breakers": {"type": "array", "items": {"type": "string"}},
                        },
                    },
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["name", "criteria"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_properties",
            "description": "Search active listings matching buyer criteria. Returns sorted matches.",
            "parameters": {
                "type": "object",
                "properties": {
                    "min_price": {"type": "number"},
                    "max_price": {"type": "number"},
                    "address": {"type": "string", "description": "Partial address to search"},
                    "status": {"type": "string", "description": "Listing status (default: active)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_listing",
            "description": "Look up a listing by address, MLS number, or listing ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "address": {"type": "string", "description": "Street address (partial match)"},
                    "mls": {"type": "string", "description": "MLS number"},
                    "listing_id": {"type": "string", "description": "Internal listing ID"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_listing_status",
            "description": "Update a listing's pipeline status. Valid: active, pending, sold.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "new_status": {
                        "type": "string",
                        "enum": ["active", "pending", "sold"],
                    },
                },
                "required": ["listing_id", "new_status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_listing_price",
            "description": "Update the list price of a listing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "new_price": {"type": "number"},
                },
                "required": ["listing_id", "new_price"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_listing_note",
            "description": "Add an internal note to a listing (negotiation notes, seller motivations, etc).",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "note": {"type": "string"},
                },
                "required": ["listing_id", "note"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "configure_client_call",
            "description": "Set up an automated client call playbook with questions and talking points.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Playbook name"},
                    "listing_id": {"type": "string"},
                    "questions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Questions to ask the client",
                    },
                    "talking_points": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Key points to mention during the call",
                    },
                    "mode": {
                        "type": "string",
                        "enum": ["feedback", "scheduling", "info"],
                    },
                },
                "required": ["name", "listing_id", "questions"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_conversation_history",
            "description": "Retrieve past conversation history for context and personalization.",
            "parameters": {
                "type": "object",
                "properties": {
                    "participant": {"type": "string", "description": "Filter by participant name"},
                    "limit": {"type": "integer", "description": "Max messages to return (default 50)"},
                },
                "required": [],
            },
        },
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
#  ASYNC TOOL HANDLER
# ═══════════════════════════════════════════════════════════════════════════════

async def handle_realtor_tool(tool_name: str, args: dict, realtor_id: str = "R001") -> str:
    """
    Dispatch a realtor tool call and return a JSON string result.
    Listings/contacts go through the Next.js API bridge → Supabase.
    Playbooks and conversation history stay in local SQLite.
    """
    try:
        if tool_name == "find_buyer":
            params = {"type": "buyer"}
            if args.get("buyer_id"):
                params["id"] = args["buyer_id"]
            elif args.get("name"):
                params["name"] = args["name"]
            result = await api.get("/api/voice-agent/contacts", params)
            if result.get("count", 0) == 0:
                result = {"message": "No buyer found matching that query."}

        elif tool_name == "create_buyer_profile":
            criteria = args.get("criteria", {})
            # Store criteria as JSON in the notes field
            notes_parts = []
            if args.get("notes"):
                notes_parts.append(args["notes"])
            if criteria:
                notes_parts.append(f"Search criteria: {json.dumps(criteria)}")

            result = await api.post("/api/voice-agent/contacts", {
                "name": args["name"],
                "phone": args.get("phone", ""),
                "email": args.get("email"),
                "type": "buyer",
                "notes": "\n".join(notes_parts) if notes_parts else None,
            })

        elif tool_name == "search_properties":
            params = {}
            if args.get("min_price"):
                params["min_price"] = str(args["min_price"])
            if args.get("max_price"):
                params["max_price"] = str(args["max_price"])
            if args.get("address"):
                params["address"] = args["address"]
            if args.get("status"):
                params["status"] = args["status"]
            else:
                params["status"] = "active"
            result = await api.get("/api/voice-agent/listings", params)
            # Rename for backward compatibility with prompts
            if "listings" in result:
                result["properties"] = result.pop("listings")

        elif tool_name == "find_listing":
            if args.get("listing_id"):
                result = await api.get(f"/api/voice-agent/listings/{args['listing_id']}")
            elif args.get("mls"):
                result = await api.get("/api/voice-agent/listings", {"mls_number": args["mls"]})
                if result.get("listings") and len(result["listings"]) > 0:
                    result = result["listings"][0]
                else:
                    result = {"message": "No listing found matching that MLS number."}
            elif args.get("address"):
                result = await api.get("/api/voice-agent/listings", {"address": args["address"]})
                if result.get("listings") and len(result["listings"]) > 0:
                    result = result["listings"] if len(result["listings"]) > 1 else result["listings"][0]
                else:
                    result = {"message": "No listing found matching that address."}
            else:
                result = {"message": "Please provide a listing_id, MLS number, or address."}

        elif tool_name == "update_listing_status":
            result = await api.patch(
                f"/api/voice-agent/listings/{args['listing_id']}",
                {"status": args["new_status"]}
            )

        elif tool_name == "update_listing_price":
            result = await api.patch(
                f"/api/voice-agent/listings/{args['listing_id']}",
                {"list_price": args["new_price"]}
            )

        elif tool_name == "add_listing_note":
            result = await api.patch(
                f"/api/voice-agent/listings/{args['listing_id']}",
                {"notes": args["note"]}
            )

        # ── Voice-agent-internal tools (stay in SQLite) ──────────────────

        elif tool_name == "configure_client_call":
            result = configure_client_call(
                name=args["name"],
                listing_id=args["listing_id"],
                questions=args.get("questions", []),
                talking_points=args.get("talking_points", []),
                mode=args.get("mode", "feedback"),
                realtor_id=realtor_id,
            )

        elif tool_name == "get_conversation_history":
            history = get_conversation_history(
                participant=args.get("participant"),
                limit=args.get("limit", 50),
                realtor_id=realtor_id,
            )
            result = {"messages": history, "count": len(history)}

        else:
            result = {"error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        result = {"error": str(e)}

    return json.dumps(result, default=str)
