#!/usr/bin/env python3
"""
Realtor Mode Tools
Tool schemas (for Ollama function calling) and handler functions
for the realtor-facing voice agent.
"""

import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import (
    find_buyer, create_buyer, find_listing, search_properties,
    update_listing_status, update_listing_price, add_listing_note,
    configure_client_call, get_conversation_history
)

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
                    "buyer_id": {"type": "string", "description": "Buyer ID (e.g. B12345678)"},
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
                    "beds": {"type": "integer"},
                    "baths": {"type": "number"},
                    "property_type": {"type": "string"},
                    "city": {"type": "string"},
                    "min_sqft": {"type": "integer"},
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
            "description": "Update a listing's pipeline status. Valid: Active, Conditional, Subject Removal, Sold, Expired, Cancelled.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "new_status": {
                        "type": "string",
                        "enum": ["Active", "Conditional", "Subject Removal", "Sold", "Expired", "Cancelled"],
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
#  TOOL HANDLER
# ═══════════════════════════════════════════════════════════════════════════════

def handle_realtor_tool(tool_name: str, args: dict, realtor_id: str = "R001") -> str:
    """
    Dispatch a realtor tool call and return a JSON string result.
    """
    try:
        if tool_name == "find_buyer":
            result = find_buyer(
                name=args.get("name"),
                buyer_id=args.get("buyer_id"),
                realtor_id=realtor_id,
            )
            if result is None:
                result = {"message": "No buyer found matching that query."}

        elif tool_name == "create_buyer_profile":
            bid = create_buyer(
                name=args["name"],
                criteria=args.get("criteria", {}),
                realtor_id=realtor_id,
                email=args.get("email"),
                phone=args.get("phone"),
                notes=args.get("notes"),
            )
            result = {"ok": True, "buyer_id": bid, "name": args["name"]}

        elif tool_name == "search_properties":
            criteria = {k: v for k, v in args.items() if v is not None}
            matches = search_properties(criteria, realtor_id=realtor_id)
            result = {
                "count": len(matches),
                "properties": matches[:10],  # Return top 10
            }

        elif tool_name == "find_listing":
            result = find_listing(
                address=args.get("address"),
                mls=args.get("mls"),
                listing_id=args.get("listing_id"),
                realtor_id=realtor_id,
            )
            if result is None:
                result = {"message": "No listing found matching that query."}

        elif tool_name == "update_listing_status":
            result = update_listing_status(
                args["listing_id"], args["new_status"], realtor_id=realtor_id
            )

        elif tool_name == "update_listing_price":
            result = update_listing_price(
                args["listing_id"], args["new_price"], realtor_id=realtor_id
            )

        elif tool_name == "add_listing_note":
            result = add_listing_note(
                args["listing_id"], args["note"], realtor_id=realtor_id
            )

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
