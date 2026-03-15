#!/usr/bin/env python3
"""
Client Mode Tools
Tool schemas and async handler functions for the client-facing voice agent.
Only exposes public information — never internal notes or negotiation data.

Tools that read listings, book tours, and log feedback call the Next.js
API bridge (→ Supabase). Voice-agent-internal tools (playbooks, conversation
history) stay in local SQLite.
"""

import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from api_client import api
from database import get_client_playbook, get_conversation_history

# ═══════════════════════════════════════════════════════════════════════════════
#  TOOL SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

CLIENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_property_details",
            "description": "Get public property details for a listing. Never includes internal notes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "address": {"type": "string", "description": "Street address to search"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_neighborhood_info",
            "description": "Get neighborhood information: schools, transit, amenities, demographics.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                    "area": {"type": "string", "description": "Neighborhood or area name"},
                    "interests": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "What the client cares about: schools, transit, parks, shopping, etc.",
                    },
                },
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_tour_availability",
            "description": "Check available time slots for a property viewing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "preferred_date": {"type": "string", "description": "ISO date (YYYY-MM-DD)"},
                    "preferred_time": {"type": "string", "description": "Preferred time of day: morning, afternoon, evening"},
                },
                "required": ["listing_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_tour",
            "description": "Schedule a property viewing for the client.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "client_name": {"type": "string"},
                    "client_phone": {"type": "string"},
                    "date": {"type": "string", "description": "ISO date (YYYY-MM-DD)"},
                    "time": {"type": "string", "description": "Time (HH:MM)"},
                },
                "required": ["listing_id", "client_name", "date", "time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "log_client_feedback",
            "description": "Save client feedback about a property viewing or general inquiry.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {"type": "string"},
                    "listing_id": {"type": "string"},
                    "feedback": {"type": "string", "description": "Client's feedback/comments"},
                    "feedback_type": {
                        "type": "string",
                        "enum": ["viewing", "general", "offer", "concern"],
                    },
                    "sentiment": {
                        "type": "string",
                        "enum": ["positive", "neutral", "negative"],
                    },
                    "follow_up": {"type": "boolean", "description": "Whether realtor should follow up"},
                },
                "required": ["client_name", "feedback"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_client_playbook",
            "description": "Retrieve the realtor's playbook/script for this client call.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "mode": {
                        "type": "string",
                        "enum": ["feedback", "scheduling", "info"],
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_conversation_history",
            "description": "Retrieve past interactions with this client for personalization.",
            "parameters": {
                "type": "object",
                "properties": {
                    "participant": {"type": "string", "description": "Client name"},
                    "limit": {"type": "integer"},
                },
                "required": [],
            },
        },
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
#  ASYNC TOOL HANDLER
# ═══════════════════════════════════════════════════════════════════════════════

async def handle_client_tool(tool_name: str, args: dict, realtor_id: str = "R001") -> str:
    """
    Dispatch a client tool call and return a JSON string result.
    Listings, tours, and feedback go through the API bridge → Supabase.
    Playbooks and conversation history stay in local SQLite.
    """
    try:
        if tool_name == "get_property_details":
            if args.get("listing_id"):
                result = await api.get(
                    f"/api/voice-agent/listings/{args['listing_id']}",
                    {"mode": "client"}
                )
            elif args.get("address"):
                search = await api.get(
                    "/api/voice-agent/listings",
                    {"address": args["address"]}
                )
                if search.get("listings") and len(search["listings"]) > 0:
                    # Strip internal fields for client mode
                    listings = search["listings"]
                    for lst in listings:
                        lst.pop("notes", None)
                        lst.pop("lockbox_code", None)
                    result = listings if len(listings) > 1 else listings[0]
                else:
                    result = {"message": "Property not found."}
            else:
                result = {"message": "Please provide a listing_id or address."}

        elif tool_name == "get_neighborhood_info":
            # Stub — future external API integration
            city = args.get("city", "")
            area = args.get("area", "")
            interests = args.get("interests", [])
            result = {
                "city": city,
                "area": area,
                "info": f"Neighborhood information for {area}, {city}.",
                "note": "Detailed neighborhood data will be available when connected to local data sources.",
                "interests_queried": interests,
            }

        elif tool_name == "check_tour_availability":
            listing_id = args.get("listing_id")
            params = {"listing_id": listing_id} if listing_id else {}
            if args.get("preferred_date"):
                params["date"] = args["preferred_date"]

            result = await api.get("/api/voice-agent/showings", params)
            # Add the showing window info to help the LLM suggest times
            if result.get("showing_window"):
                result["note"] = "showing_window indicates the seller's preferred showing hours."

        elif tool_name == "book_tour":
            # Convert date + time into start_time/end_time for the appointments table
            date = args.get("date", "")
            time_str = args.get("time", "10:00")
            start_time = f"{date}T{time_str}:00"
            # Default 1-hour appointment
            end_hour = int(time_str.split(":")[0]) + 1
            end_time = f"{date}T{end_hour:02d}:{time_str.split(':')[1] if ':' in time_str else '00'}:00"

            result = await api.post("/api/voice-agent/showings", {
                "listing_id": args.get("listing_id"),
                "buyer_agent_name": args.get("client_name", ""),
                "buyer_agent_phone": args.get("client_phone", ""),
                "start_time": start_time,
                "end_time": end_time,
                "notes": f"Booked via voice agent for {args.get('client_name', 'client')}",
            })

        elif tool_name == "log_client_feedback":
            result = await api.post("/api/voice-agent/feedback", {
                "client_name": args["client_name"],
                "client_phone": args.get("client_phone"),
                "listing_id": args.get("listing_id"),
                "feedback": args["feedback"],
                "sentiment": args.get("sentiment", "neutral"),
                "follow_up": args.get("follow_up", False),
            })
            if result.get("ok"):
                result["message"] = "Feedback recorded. Thank you!"

        # ── Voice-agent-internal tools (stay in SQLite) ──────────────────

        elif tool_name == "get_client_playbook":
            playbook = get_client_playbook(
                listing_id=args.get("listing_id"),
                mode=args.get("mode", "feedback"),
                realtor_id=realtor_id,
            )
            if playbook:
                result = playbook
            else:
                result = {"message": "No playbook configured for this call.", "questions": [], "talking_points": []}

        elif tool_name == "get_conversation_history":
            history = get_conversation_history(
                participant=args.get("participant"),
                limit=args.get("limit", 20),
                realtor_id=realtor_id,
            )
            result = {"messages": history, "count": len(history)}

        else:
            result = {"error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        result = {"error": str(e)}

    return json.dumps(result, default=str)
