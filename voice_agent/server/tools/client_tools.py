#!/usr/bin/env python3
"""
Client Mode Tools
Tool schemas and handler functions for the client-facing voice agent.
Only exposes public information — never internal notes or negotiation data.
"""

import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import (
    find_listing, log_feedback, get_client_playbook, get_conversation_history
)

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
#  TOOL HANDLER
# ═══════════════════════════════════════════════════════════════════════════════

def _sanitize_listing(listing_dict):
    """Remove internal/private fields from a listing before returning to client."""
    if not listing_dict:
        return None
    safe = dict(listing_dict)
    # Strip confidential fields
    for key in ["internal_notes", "seller_phone", "realtor_id"]:
        safe.pop(key, None)
    return safe


def handle_client_tool(tool_name: str, args: dict, realtor_id: str = "R001") -> str:
    """
    Dispatch a client tool call and return a JSON string result.
    Ensures no internal data is ever exposed.
    """
    try:
        if tool_name == "get_property_details":
            listing = find_listing(
                address=args.get("address"),
                listing_id=args.get("listing_id"),
                realtor_id=realtor_id,
            )
            if isinstance(listing, list):
                result = [_sanitize_listing(l) for l in listing]
            elif listing:
                result = _sanitize_listing(listing)
            else:
                result = {"message": "Property not found."}

        elif tool_name == "get_neighborhood_info":
            # In production, this would call an external API or local knowledge base
            # For now, return a structured placeholder
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
            # In production, this would check Google Calendar
            # For now, return mock availability
            result = {
                "listing_id": args.get("listing_id"),
                "available_slots": [
                    {"date": args.get("preferred_date", "TBD"), "time": "10:00 AM"},
                    {"date": args.get("preferred_date", "TBD"), "time": "2:00 PM"},
                    {"date": args.get("preferred_date", "TBD"), "time": "4:30 PM"},
                ],
                "note": "Connect Google Calendar for real availability.",
            }

        elif tool_name == "book_tour":
            # In production, this would create a Google Calendar event
            result = {
                "ok": True,
                "booking": {
                    "listing_id": args.get("listing_id"),
                    "client_name": args.get("client_name"),
                    "date": args.get("date"),
                    "time": args.get("time"),
                },
                "message": f"Tour booked for {args.get('client_name')} on {args.get('date')} at {args.get('time')}.",
            }

        elif tool_name == "log_client_feedback":
            log_feedback(
                client_name=args["client_name"],
                listing_id=args.get("listing_id"),
                feedback=args["feedback"],
                feedback_type=args.get("feedback_type", "general"),
                sentiment=args.get("sentiment", "neutral"),
                follow_up=args.get("follow_up", False),
                realtor_id=realtor_id,
                client_phone=args.get("client_phone"),
            )
            result = {"ok": True, "message": "Feedback recorded. Thank you!"}

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
