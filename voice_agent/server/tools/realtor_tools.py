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
            "description": "Update a listing's pipeline status. Valid: active, pending, sold, conditional, subject_removal, withdrawn, expired.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "new_status": {
                        "type": "string",
                        "enum": ["active", "pending", "sold", "conditional", "subject_removal", "withdrawn", "expired"],
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
    {
        "type": "function",
        "function": {
            "name": "navigate_to",
            "description": "Navigate to a page in the ListingFlow CRM. Use this when the user wants to go to a specific page, view, or section of the app.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page": {
                        "type": "string",
                        "description": "The page to navigate to. Examples: dashboard, listings, contacts, showings, calendar, tasks, pipeline, newsletters, automations, content, search, workflow, import, forms, settings, inbox",
                        "enum": [
                            "dashboard", "listings", "contacts", "showings", "calendar",
                            "tasks", "pipeline", "newsletters", "newsletters/queue",
                            "newsletters/analytics", "newsletters/guide", "automations",
                            "automations/templates", "content", "search", "workflow",
                            "import", "forms", "forms/templates", "contacts/segments",
                            "settings", "inbox",
                        ],
                    },
                    "id": {
                        "type": "string",
                        "description": "Optional record ID to navigate to a specific detail page (e.g., a specific contact or listing)",
                    },
                    "tab": {
                        "type": "string",
                        "description": "Optional tab to open on the detail page (e.g., intelligence, activity, deals for contacts)",
                    },
                },
                "required": ["page"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_crm_help",
            "description": "Get help about ListingFlow CRM features, workflows, and how to use the app. Use when the user asks 'how do I...', 'where is...', 'what does X do'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "The topic to get help on. Examples: listing workflow, forms, newsletters, contacts, showings, compliance, FINTRAC",
                    },
                },
                "required": ["topic"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_tasks",
            "description": "Search and list tasks. Filter by status, priority, or linked contact/listing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed"],
                        "description": "Filter by task status",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "Filter by task priority",
                    },
                    "contact_id": {"type": "string", "description": "Filter tasks linked to this contact ID"},
                    "listing_id": {"type": "string", "description": "Filter tasks linked to this listing ID"},
                    "limit": {"type": "integer", "description": "Maximum number of tasks to return (default 20)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task for the realtor.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Task title"},
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "Task priority (default: medium)",
                    },
                    "due_date": {"type": "string", "description": "Due date in ISO format (e.g. 2026-04-01)"},
                    "contact_id": {"type": "string", "description": "Contact ID to link to this task"},
                    "listing_id": {"type": "string", "description": "Listing ID to link to this task"},
                    "notes": {"type": "string", "description": "Additional notes for the task"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_deals",
            "description": "Search deals in the pipeline. Filter by stage, type, contact, or listing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "stage": {"type": "string", "description": "Deal stage to filter by (e.g. new_lead, active, under_contract, closed)"},
                    "type": {
                        "type": "string",
                        "enum": ["buyer", "seller"],
                        "description": "Deal type",
                    },
                    "contact_id": {"type": "string", "description": "Filter deals linked to this contact ID"},
                    "listing_id": {"type": "string", "description": "Filter deals linked to this listing ID"},
                    "limit": {"type": "integer", "description": "Maximum number of deals to return (default 20)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_deal",
            "description": "Create a new deal in the pipeline.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Deal title"},
                    "type": {
                        "type": "string",
                        "enum": ["buyer", "seller"],
                        "description": "Deal type",
                    },
                    "contact_id": {"type": "string", "description": "Contact ID associated with this deal"},
                    "listing_id": {"type": "string", "description": "Listing ID associated with this deal"},
                    "stage": {"type": "string", "description": "Initial deal stage (default: new_lead)"},
                    "value": {"type": "number", "description": "Deal value / expected sale price"},
                    "commission_pct": {"type": "number", "description": "Commission percentage"},
                },
                "required": ["title", "type", "contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_communications",
            "description": "Get communication history for a contact. Shows SMS, email, WhatsApp messages and notes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "Contact ID to fetch communications for"},
                    "channel": {
                        "type": "string",
                        "enum": ["sms", "whatsapp", "email", "note"],
                        "description": "Filter by communication channel",
                    },
                    "limit": {"type": "integer", "description": "Maximum number of messages to return (default 20)"},
                },
                "required": ["contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "confirm_showing",
            "description": "Confirm or deny a showing request. Updates the appointment status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "showing_id": {"type": "string", "description": "Showing / appointment ID"},
                    "action": {
                        "type": "string",
                        "enum": ["confirm", "deny", "cancel"],
                        "description": "Action to take on the showing",
                    },
                    "notes": {"type": "string", "description": "Optional notes or reason"},
                },
                "required": ["showing_id", "action"],
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

        # ── Local tools (no API call) ─────────────────────────────────────

        elif tool_name == "navigate_to":
            page = args.get("page", "dashboard")
            record_id = args.get("id", "")
            tab = args.get("tab", "")

            routes = {
                "dashboard": "/",
                "listings": "/listings",
                "contacts": "/contacts",
                "showings": "/showings",
                "calendar": "/calendar",
                "tasks": "/tasks",
                "pipeline": "/pipeline",
                "newsletters": "/newsletters",
                "newsletters/queue": "/newsletters/queue",
                "newsletters/analytics": "/newsletters/analytics",
                "newsletters/guide": "/newsletters/guide",
                "automations": "/automations",
                "automations/templates": "/automations/templates",
                "content": "/content",
                "search": "/search",
                "workflow": "/workflow",
                "import": "/import",
                "forms": "/forms",
                "forms/templates": "/forms/templates",
                "contacts/segments": "/contacts/segments",
                "settings": "/settings",
                "inbox": "/inbox",
            }

            path = routes.get(page, "/")
            if record_id:
                path = f"/{page}/{record_id}"
            if tab:
                path += f"?tab={tab}"

            result = {
                "action": "navigate",
                "path": path,
                "page_name": page.replace("/", " → ").title(),
                "message": f"Navigating to {page.replace('/', ' → ').title()}",
            }

        elif tool_name == "get_tasks":
            params = {}
            if args.get("status"):
                params["status"] = args["status"]
            if args.get("priority"):
                params["priority"] = args["priority"]
            if args.get("contact_id"):
                params["contact_id"] = args["contact_id"]
            if args.get("listing_id"):
                params["listing_id"] = args["listing_id"]
            params["limit"] = str(args.get("limit", 20))
            result = await api.get("/api/voice-agent/tasks", params)

        elif tool_name == "create_task":
            payload = {
                "title": args["title"],
                "priority": args.get("priority", "medium"),
            }
            if args.get("due_date"):
                payload["due_date"] = args["due_date"]
            if args.get("contact_id"):
                payload["contact_id"] = args["contact_id"]
            if args.get("listing_id"):
                payload["listing_id"] = args["listing_id"]
            if args.get("notes"):
                payload["notes"] = args["notes"]
            result = await api.post("/api/voice-agent/tasks", payload)

        elif tool_name == "get_deals":
            params = {}
            if args.get("stage"):
                params["stage"] = args["stage"]
            if args.get("type"):
                params["type"] = args["type"]
            if args.get("contact_id"):
                params["contact_id"] = args["contact_id"]
            if args.get("listing_id"):
                params["listing_id"] = args["listing_id"]
            params["limit"] = str(args.get("limit", 20))
            result = await api.get("/api/voice-agent/deals", params)

        elif tool_name == "create_deal":
            payload = {
                "title": args["title"],
                "type": args["type"],
                "contact_id": args["contact_id"],
                "stage": args.get("stage", "new_lead"),
            }
            if args.get("listing_id"):
                payload["listing_id"] = args["listing_id"]
            if args.get("value") is not None:
                payload["value"] = args["value"]
            if args.get("commission_pct") is not None:
                payload["commission_pct"] = args["commission_pct"]
            result = await api.post("/api/voice-agent/deals", payload)

        elif tool_name == "get_communications":
            params = {"contact_id": args["contact_id"]}
            if args.get("channel"):
                params["channel"] = args["channel"]
            params["limit"] = str(args.get("limit", 20))
            result = await api.get("/api/voice-agent/communications", params)

        elif tool_name == "confirm_showing":
            action_to_status = {
                "confirm": "confirmed",
                "deny": "denied",
                "cancel": "cancelled",
            }
            payload = {"status": action_to_status.get(args["action"], args["action"])}
            if args.get("notes"):
                payload["notes"] = args["notes"]
            result = await api.patch(
                f"/api/voice-agent/showings/{args['showing_id']}",
                payload,
            )

        elif tool_name == "get_crm_help":
            topic = args.get("topic", "").lower()

            knowledge_base = {
                "listing workflow": (
                    "ListingFlow uses an 8-phase listing workflow: "
                    "Phase 1 — Seller Intake (FINTRAC identity, property details, commissions, showing instructions); "
                    "Phase 2 — Data Enrichment (BC Geocoder, ParcelMap BC, LTSA, BC Assessment); "
                    "Phase 3 — CMA Analysis (comparable market analysis); "
                    "Phase 4 — Pricing & Review (list price, price lock, marketing tier); "
                    "Phase 5 — Form Generation (12 BCREA forms auto-filled via Python server); "
                    "Phase 6 — E-Signature (DocuSign envelope tracking); "
                    "Phase 7 — MLS Preparation (Claude AI remarks, photo management); "
                    "Phase 8 — MLS Submission (manual submission). "
                    "Navigate to a listing and click 'Workflow' to advance phases."
                ),
                "forms": (
                    "ListingFlow generates 12 BCREA forms automatically from listing data: "
                    "DORTS, MLC, PDS, FINTRAC, PRIVACY, C3, DRUP, MLS_INPUT, MKTAUTH, AGENCY, C3CONF, FAIRHSG. "
                    "Forms are generated in Phase 5 via the Python ListingFlow server at port 8767. "
                    "Go to a listing's workflow, reach Phase 5, and click 'Generate Forms'. "
                    "You can also browse form templates at /forms/templates."
                ),
                "newsletters": (
                    "The AI Newsletter Engine sends 6 email types: "
                    "New Listing Alert, Market Update, Just Sold, Open House Invite, Neighbourhood Guide, Home Anniversary. "
                    "Drafts are AI-generated by Claude and queued for your approval at /newsletters/queue. "
                    "Analytics (opens, clicks, attribution) are at /newsletters/analytics. "
                    "Contact journeys automate lifecycle-driven email sequences for buyers and sellers. "
                    "Emails are sent via Resend and every click is tracked to build contact intelligence."
                ),
                "contacts": (
                    "Contacts are buyers or sellers stored in the CRM. "
                    "Each contact has a name, phone, email, type (buyer/seller), preferred channel (SMS/WhatsApp/email), and notes. "
                    "View contacts at /contacts. Click a contact to see their communication timeline, journey status, and AI intelligence. "
                    "Contact segments (audience groups) are at /contacts/segments — use them to bulk-enroll contacts into automation workflows."
                ),
                "showings": (
                    "Showings are managed end-to-end: buyer agent submits a request → seller is notified by SMS/WhatsApp → seller replies YES/NO → "
                    "confirmation triggers lockbox code delivery and Google Calendar event creation. "
                    "View all showings at /showings. Each showing has a status: pending, confirmed, denied, completed. "
                    "Messages to buyer agents and sellers are logged in the communication timeline."
                ),
                "compliance": (
                    "FINTRAC identity verification is collected for sellers in Phase 1 (full name, DOB, citizenship, ID type/number/expiry). "
                    "CASL consent is tracked as a form field on contacts. "
                    "Note: FINTRAC for buyers, Receipt of Funds reports, and Suspicious Transaction reports are not yet implemented. "
                    "Record retention policies are not yet enforced in the system."
                ),
                "fintrac": (
                    "FINTRAC identity verification is collected for sellers during Phase 1 — Seller Intake. "
                    "Required fields: full legal name, date of birth, citizenship, ID type (passport/driver's licence/etc.), ID number, and expiry date. "
                    "This data is stored in the seller_identities table. "
                    "Buyer FINTRAC collection is not yet implemented."
                ),
                "content engine": (
                    "The AI Content Engine generates marketing assets for listings using Claude AI and Kling AI. "
                    "Claude generates MLS public remarks (max 500 chars), REALTOR remarks (max 500 chars), Instagram captions, and Kling prompts. "
                    "Kling AI generates Image-to-Video (hero photo → 4K video for Reels) and Text-to-Image (prompt → 8K image for Instagram). "
                    "Access the content engine at /content. Select a listing to start generating assets."
                ),
                "pipeline": (
                    "The pipeline view shows all listings grouped by status: active, pending, sold. "
                    "Each card shows the listing address, price, current workflow phase, and key dates. "
                    "Use /pipeline for a visual deal-stage overview. "
                    "Update a listing's status via the listing detail page or by voice command."
                ),
                "automations": (
                    "Automations (workflows) are visual email/SMS sequences built with the React Flow workflow builder at /automations. "
                    "Each workflow has steps: ai_email (Claude-generated), auto_email (template-based), delay, condition. "
                    "Contacts are enrolled individually or in bulk via segments. "
                    "Browse and manage reusable email templates at /automations/templates."
                ),
                "import": (
                    "Import contacts in bulk from Excel or CSV at /import. "
                    "Required columns: name, phone or email, type (buyer/seller). "
                    "Optional: preferred channel, notes. "
                    "After import, contacts can be immediately enrolled into journey workflows."
                ),
                "calendar": (
                    "The calendar at /calendar shows your Google Calendar events alongside CRM showing events. "
                    "Connect your Google account to sync availability. "
                    "Confirmed showings automatically create Google Calendar events. "
                    "Use the calendar to check availability before scheduling showings."
                ),
                "settings": (
                    "Settings at /settings allow you to configure: Google Calendar integration, "
                    "Twilio SMS/WhatsApp phone numbers, Resend email sender address, "
                    "demo credentials, and notification preferences."
                ),
                "inbox": (
                    "The inbox at /inbox aggregates inbound messages from SMS, WhatsApp, and email. "
                    "Showing confirmations (YES/NO replies) are automatically processed by the Twilio webhook. "
                    "Other inbound messages appear here for manual follow-up."
                ),
            }

            # Find the best matching topic from the knowledge base
            help_text = None
            for key, text in knowledge_base.items():
                if key in topic or topic in key:
                    help_text = text
                    break

            # Fallback: partial word match
            if not help_text:
                for key, text in knowledge_base.items():
                    if any(word in key for word in topic.split() if len(word) > 3):
                        help_text = text
                        break

            if not help_text:
                help_text = (
                    f"I don't have specific help content for '{topic}'. "
                    "Available topics: listing workflow, forms, newsletters, contacts, showings, "
                    "compliance, FINTRAC, content engine, pipeline, automations, import, calendar, settings, inbox."
                )

            result = {"topic": topic, "help": help_text}

        else:
            result = {"error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        result = {"error": str(e)}

    return json.dumps(result, default=str)
