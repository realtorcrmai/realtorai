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
            "name": "find_contact",
            "description": "Search for any contact in the CRM by name — buyers, sellers, partners, leads, or any type. Returns matching contacts with their profiles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Contact name (partial match)"},
                    "contact_id": {"type": "string", "description": "Contact ID for exact lookup"},
                    "type": {"type": "string", "description": "Optional filter: buyer, seller, partner, or leave empty for all types"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_buyer",
            "description": "Look up a buyer specifically. Use find_contact for general contact search.",
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
                    "category": {
                        "type": "string",
                        "enum": ["follow_up", "showing", "paperwork", "marketing", "admin"],
                        "description": "Task category (default: follow_up)",
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
    # ── Contact Management ────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "update_contact",
            "description": "Update any field on an existing contact — name, phone, email, type, preferred channel, stage, lead status, source, or notes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "ID of the contact to update"},
                    "name": {"type": "string", "description": "Full name"},
                    "phone": {"type": "string", "description": "Phone number"},
                    "email": {"type": "string", "description": "Email address"},
                    "type": {
                        "type": "string",
                        "enum": ["buyer", "seller"],
                        "description": "Contact type",
                    },
                    "pref_channel": {
                        "type": "string",
                        "enum": ["sms", "whatsapp", "email"],
                        "description": "Preferred communication channel",
                    },
                    "stage_bar": {"type": "string", "description": "Contact lifecycle stage"},
                    "lead_status": {"type": "string", "description": "Lead status (e.g. hot, warm, cold)"},
                    "source": {"type": "string", "description": "Lead source (e.g. referral, website, open house)"},
                    "notes": {"type": "string", "description": "Internal notes about the contact"},
                },
                "required": ["contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_contact",
            "description": "Permanently delete a contact from the CRM. This cannot be undone.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "ID of the contact to delete"},
                },
                "required": ["contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_contact_details",
            "description": "Get the full profile of a contact including linked listings, deals, tasks, communications, and journey status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "ID of the contact to retrieve"},
                },
                "required": ["contact_id"],
            },
        },
    },
    # ── Listing Management ────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "create_listing",
            "description": "Create a new property listing in the CRM.",
            "parameters": {
                "type": "object",
                "properties": {
                    "address": {"type": "string", "description": "Full property address"},
                    "seller_id": {"type": "string", "description": "Contact ID of the seller"},
                    "lockbox_code": {"type": "string", "description": "Lockbox code for property access"},
                    "list_price": {"type": "number", "description": "Listing price in dollars"},
                    "property_type": {"type": "string", "description": "Property type (e.g. detached, condo, townhouse)"},
                    "mls_number": {"type": "string", "description": "MLS number if already assigned"},
                    "notes": {"type": "string", "description": "Internal notes about the listing"},
                },
                "required": ["address", "seller_id", "lockbox_code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_listing",
            "description": "Permanently delete a listing from the CRM. This cannot be undone.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string", "description": "ID of the listing to delete"},
                },
                "required": ["listing_id"],
            },
        },
    },
    # ── Showing Management ────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_showings",
            "description": "List showings with optional filters for listing, status, or date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string", "description": "Filter showings for this listing ID"},
                    "status": {
                        "type": "string",
                        "enum": ["requested", "confirmed", "denied", "cancelled"],
                        "description": "Filter by showing status",
                    },
                    "date": {"type": "string", "description": "Filter by date (ISO format, e.g. 2026-04-01)"},
                    "limit": {"type": "integer", "description": "Maximum number of showings to return (default 20)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_showing",
            "description": "Create a showing request for a listing on behalf of a buyer agent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string", "description": "ID of the listing to show"},
                    "buyer_agent_name": {"type": "string", "description": "Buyer agent's full name"},
                    "buyer_agent_phone": {"type": "string", "description": "Buyer agent's phone number"},
                    "start_time": {"type": "string", "description": "Showing start time in ISO format (e.g. 2026-04-01T14:00:00)"},
                    "end_time": {"type": "string", "description": "Showing end time in ISO format (e.g. 2026-04-01T15:00:00)"},
                    "buyer_agent_email": {"type": "string", "description": "Buyer agent's email address"},
                    "notes": {"type": "string", "description": "Special instructions or notes for the showing"},
                },
                "required": ["listing_id", "buyer_agent_name", "buyer_agent_phone", "start_time", "end_time"],
            },
        },
    },
    # ── Task Management ───────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "Update a task's status, priority, due date, title, or description.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "ID of the task to update"},
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed"],
                        "description": "New task status",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "New task priority",
                    },
                    "due_date": {"type": "string", "description": "New due date in ISO format (e.g. 2026-04-01)"},
                    "title": {"type": "string", "description": "New task title"},
                    "description": {"type": "string", "description": "New task description"},
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Permanently delete a task from the CRM.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "ID of the task to delete"},
                },
                "required": ["task_id"],
            },
        },
    },
    # ── Deal Management ───────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "update_deal",
            "description": "Update a deal's stage, status, value, commission percentage, or linked listing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "deal_id": {"type": "string", "description": "ID of the deal to update"},
                    "stage": {"type": "string", "description": "New deal stage (e.g. new_lead, active, under_contract, closed)"},
                    "status": {"type": "string", "description": "New deal status"},
                    "value": {"type": "number", "description": "Updated deal value / expected sale price"},
                    "commission_pct": {"type": "number", "description": "Updated commission percentage"},
                    "listing_id": {"type": "string", "description": "Link or update the associated listing ID"},
                },
                "required": ["deal_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_deal_details",
            "description": "Get full details of a deal including checklist items, parties involved, and linked listing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "deal_id": {"type": "string", "description": "ID of the deal to retrieve"},
                },
                "required": ["deal_id"],
            },
        },
    },
    # ── Offer Management ──────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_offers",
            "description": "List offers for a listing or by buyer contact, optionally filtered by status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string", "description": "Filter offers for this listing ID"},
                    "buyer_contact_id": {"type": "string", "description": "Filter offers from this buyer contact ID"},
                    "status": {"type": "string", "description": "Filter by offer status (e.g. pending, accepted, rejected, countered, withdrawn)"},
                    "limit": {"type": "integer", "description": "Maximum number of offers to return (default 20)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_offer",
            "description": "Create a new offer on a listing from a buyer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string", "description": "ID of the listing being offered on"},
                    "buyer_contact_id": {"type": "string", "description": "Contact ID of the buyer making the offer"},
                    "offer_amount": {"type": "number", "description": "Offer price in dollars"},
                    "expiry_date": {"type": "string", "description": "Offer expiry date/time in ISO format"},
                    "financing_type": {"type": "string", "description": "Financing type (e.g. cash, conventional, insured)"},
                    "deposit_amount": {"type": "number", "description": "Deposit amount in dollars"},
                    "conditions_text": {"type": "string", "description": "Subject conditions (e.g. subject to financing, inspection)"},
                    "possession_date": {"type": "string", "description": "Requested possession date in ISO format"},
                },
                "required": ["listing_id", "buyer_contact_id", "offer_amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_offer",
            "description": "Accept, reject, counter, or withdraw an offer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "offer_id": {"type": "string", "description": "ID of the offer to update"},
                    "action": {
                        "type": "string",
                        "enum": ["accept", "reject", "counter", "withdraw"],
                        "description": "Action to take on the offer",
                    },
                    "notes": {"type": "string", "description": "Optional notes or counter-offer details"},
                },
                "required": ["offer_id", "action"],
            },
        },
    },
    # ── Household Management ──────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_households",
            "description": "List all households in the CRM.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_household_members",
            "description": "Get a household with all its member contacts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "household_id": {"type": "string", "description": "ID of the household to retrieve"},
                },
                "required": ["household_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_household",
            "description": "Create a new household group to link related contacts (e.g. a family).",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Household name (e.g. 'The Smith Family')"},
                    "address": {"type": "string", "description": "Household address"},
                    "notes": {"type": "string", "description": "Notes about the household"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_to_household",
            "description": "Add a contact to an existing household.",
            "parameters": {
                "type": "object",
                "properties": {
                    "household_id": {"type": "string", "description": "ID of the household"},
                    "contact_id": {"type": "string", "description": "ID of the contact to add to the household"},
                },
                "required": ["household_id", "contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remove_from_household",
            "description": "Remove a contact from their current household.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "ID of the contact to remove from their household"},
                },
                "required": ["contact_id"],
            },
        },
    },
    # ── Relationship Management ───────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_relationships",
            "description": "Get all relationships for a contact (spouse, family, friends, colleagues, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "ID of the contact to get relationships for"},
                },
                "required": ["contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_relationship",
            "description": "Link two contacts with a defined relationship type.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_a_id": {"type": "string", "description": "ID of the first contact"},
                    "contact_b_id": {"type": "string", "description": "ID of the second contact"},
                    "relationship_type": {
                        "type": "string",
                        "enum": ["spouse", "parent", "child", "sibling", "friend", "colleague", "neighbour", "other"],
                        "description": "Type of relationship between the two contacts",
                    },
                    "notes": {"type": "string", "description": "Optional notes about the relationship"},
                },
                "required": ["contact_a_id", "contact_b_id", "relationship_type"],
            },
        },
    },
    # ── Workflow Management ───────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_workflows",
            "description": "List all available automation workflows that contacts can be enrolled in.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "enroll_in_workflow",
            "description": "Enroll a contact in an automation workflow.",
            "parameters": {
                "type": "object",
                "properties": {
                    "workflow_id": {"type": "string", "description": "ID of the workflow to enroll the contact in"},
                    "contact_id": {"type": "string", "description": "ID of the contact to enroll"},
                },
                "required": ["workflow_id", "contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_enrollments",
            "description": "Check the active workflow enrollment status for a contact.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "ID of the contact to check enrollments for"},
                },
                "required": ["contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "manage_enrollment",
            "description": "Pause, resume, or exit a contact's workflow enrollment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "enrollment_id": {"type": "string", "description": "ID of the enrollment to manage"},
                    "action": {
                        "type": "string",
                        "enum": ["pause", "resume", "exit"],
                        "description": "Action to take on the enrollment",
                    },
                },
                "required": ["enrollment_id", "action"],
            },
        },
    },
    # ── Activity Logging ──────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_activities",
            "description": "Get the activity log for a contact — calls, emails, showings, notes, and more.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "ID of the contact to get activities for"},
                    "activity_type": {
                        "type": "string",
                        "enum": ["call", "email", "meeting", "showing", "note", "task", "sms", "whatsapp", "social_media", "open_house", "referral", "follow_up", "other"],
                        "description": "Filter by activity type",
                    },
                    "limit": {"type": "integer", "description": "Maximum number of activities to return (default 20)"},
                },
                "required": ["contact_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "log_activity",
            "description": "Log a new activity against a contact (call, email, meeting, showing, note, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {"type": "string", "description": "ID of the contact to log the activity against"},
                    "activity_type": {
                        "type": "string",
                        "enum": ["call", "email", "sms", "whatsapp", "meeting", "note", "property_showing", "open_house", "website_visit", "email_open", "link_click", "form_submission", "document_signed", "offer_submitted", "offer_received"],
                        "description": "Type of activity",
                    },
                    "description": {"type": "string", "description": "Description or summary of the activity"},
                    "metadata": {"type": "object", "description": "Additional structured data for the activity (e.g. call duration, outcome)"},
                },
                "required": ["contact_id", "activity_type"],
            },
        },
    },
    # ── Newsletter Management ─────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_newsletters",
            "description": "List newsletter drafts, approved newsletters, or sent newsletters.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["draft", "approved", "sent"],
                        "description": "Filter by newsletter status",
                    },
                    "limit": {"type": "integer", "description": "Maximum number of newsletters to return (default 20)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "approve_newsletter",
            "description": "Approve or skip a newsletter draft in the approval queue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "newsletter_id": {"type": "string", "description": "ID of the newsletter to approve or skip"},
                    "action": {
                        "type": "string",
                        "enum": ["approve", "skip"],
                        "description": "Approve to schedule sending, skip to dismiss the draft",
                    },
                },
                "required": ["newsletter_id", "action"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "bc_real_estate_reference",
            "description": "Look up BC real estate reference info: BCREA forms, FINTRAC compliance, property types, listing statuses, PTT/GST taxes, subject clauses, strata, ALR, or listing workflow phases. Use this when the user asks about real estate terms, forms, compliance, or processes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "enum": ["forms", "fintrac", "property_types", "statuses", "taxes", "terms", "workflow", "all"],
                        "description": "Which reference topic to look up",
                    },
                },
                "required": ["topic"],
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
        if tool_name == "find_contact":
            params = {}
            if args.get("contact_id"):
                params["id"] = args["contact_id"]
            elif args.get("name"):
                params["name"] = args["name"]
            if args.get("type"):
                params["type"] = args["type"]
            result = await api.get("/api/voice-agent/contacts", params)
            if result.get("count", 0) == 0:
                result = {"message": f"No contact found matching '{args.get('name', args.get('contact_id', ''))}'."}

        elif tool_name == "find_buyer":
            params = {}
            if args.get("buyer_id"):
                params["id"] = args["buyer_id"]
            elif args.get("name"):
                params["name"] = args["name"]
            # Search all types first, then filter if needed
            result = await api.get("/api/voice-agent/contacts", params)
            if result.get("count", 0) == 0:
                result = {"message": "No contact found matching that query."}

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
                "category": args.get("category", "follow_up"),
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

        # ── Contact Management ────────────────────────────────────────────

        elif tool_name == "update_contact":
            payload = {}
            for field in ["name", "phone", "email", "type", "pref_channel", "stage_bar", "lead_status", "source", "notes"]:
                if args.get(field) is not None:
                    payload[field] = args[field]
            result = await api.patch(f"/api/voice-agent/contacts/{args['contact_id']}", payload)

        elif tool_name == "delete_contact":
            result = await api.delete(f"/api/voice-agent/contacts/{args['contact_id']}")

        elif tool_name == "get_contact_details":
            result = await api.get(f"/api/voice-agent/contacts/{args['contact_id']}")

        # ── Listing Management ────────────────────────────────────────────

        elif tool_name == "create_listing":
            payload = {
                "address": args["address"],
                "seller_id": args["seller_id"],
                "lockbox_code": args["lockbox_code"],
            }
            if args.get("list_price") is not None:
                payload["list_price"] = args["list_price"]
            if args.get("property_type"):
                payload["property_type"] = args["property_type"]
            if args.get("mls_number"):
                payload["mls_number"] = args["mls_number"]
            if args.get("notes"):
                payload["notes"] = args["notes"]
            result = await api.post("/api/voice-agent/listings", payload)

        elif tool_name == "delete_listing":
            result = await api.delete(f"/api/voice-agent/listings/{args['listing_id']}")

        # ── Showing Management ────────────────────────────────────────────

        elif tool_name == "get_showings":
            params = {}
            if args.get("listing_id"):
                params["listing_id"] = args["listing_id"]
            if args.get("status"):
                params["status"] = args["status"]
            if args.get("date"):
                params["date"] = args["date"]
            params["limit"] = str(args.get("limit", 20))
            result = await api.get("/api/voice-agent/showings", params)

        elif tool_name == "create_showing":
            payload = {
                "listing_id": args["listing_id"],
                "buyer_agent_name": args["buyer_agent_name"],
                "buyer_agent_phone": args["buyer_agent_phone"],
                "start_time": args["start_time"],
                "end_time": args["end_time"],
            }
            if args.get("buyer_agent_email"):
                payload["buyer_agent_email"] = args["buyer_agent_email"]
            if args.get("notes"):
                payload["notes"] = args["notes"]
            result = await api.post("/api/voice-agent/showings", payload)

        # ── Task Management ───────────────────────────────────────────────

        elif tool_name == "update_task":
            payload = {}
            for field in ["status", "priority", "due_date", "title", "description"]:
                if args.get(field) is not None:
                    payload[field] = args[field]
            result = await api.patch(f"/api/voice-agent/tasks/{args['task_id']}", payload)

        elif tool_name == "delete_task":
            result = await api.delete(f"/api/voice-agent/tasks/{args['task_id']}")

        # ── Deal Management ───────────────────────────────────────────────

        elif tool_name == "update_deal":
            payload = {}
            for field in ["stage", "status", "listing_id"]:
                if args.get(field) is not None:
                    payload[field] = args[field]
            if args.get("value") is not None:
                payload["value"] = args["value"]
            if args.get("commission_pct") is not None:
                payload["commission_pct"] = args["commission_pct"]
            result = await api.patch(f"/api/voice-agent/deals/{args['deal_id']}", payload)

        elif tool_name == "get_deal_details":
            result = await api.get(f"/api/voice-agent/deals/{args['deal_id']}")

        # ── Offer Management ──────────────────────────────────────────────

        elif tool_name == "get_offers":
            params = {}
            if args.get("listing_id"):
                params["listing_id"] = args["listing_id"]
            if args.get("buyer_contact_id"):
                params["buyer_contact_id"] = args["buyer_contact_id"]
            if args.get("status"):
                params["status"] = args["status"]
            params["limit"] = str(args.get("limit", 20))
            result = await api.get("/api/voice-agent/offers", params)

        elif tool_name == "create_offer":
            payload = {
                "listing_id": args["listing_id"],
                "buyer_contact_id": args["buyer_contact_id"],
                "offer_amount": args["offer_amount"],
            }
            for field in ["expiry_date", "financing_type", "conditions_text", "possession_date"]:
                if args.get(field):
                    payload[field] = args[field]
            if args.get("deposit_amount") is not None:
                payload["deposit_amount"] = args["deposit_amount"]
            result = await api.post("/api/voice-agent/offers", payload)

        elif tool_name == "update_offer":
            payload = {"action": args["action"]}
            if args.get("notes"):
                payload["notes"] = args["notes"]
            result = await api.patch(f"/api/voice-agent/offers/{args['offer_id']}", payload)

        # ── Household Management ──────────────────────────────────────────

        elif tool_name == "get_households":
            result = await api.get("/api/voice-agent/households")

        elif tool_name == "get_household_members":
            result = await api.get(f"/api/voice-agent/households/{args['household_id']}")

        elif tool_name == "create_household":
            payload = {"name": args["name"]}
            if args.get("address"):
                payload["address"] = args["address"]
            if args.get("notes"):
                payload["notes"] = args["notes"]
            result = await api.post("/api/voice-agent/households", payload)

        elif tool_name == "add_to_household":
            result = await api.patch(
                f"/api/voice-agent/households/{args['household_id']}",
                {"action": "add_member", "contact_id": args["contact_id"]},
            )

        elif tool_name == "remove_from_household":
            result = await api.patch(
                f"/api/voice-agent/contacts/{args['contact_id']}",
                {"household_id": None},
            )

        # ── Relationship Management ───────────────────────────────────────

        elif tool_name == "get_relationships":
            result = await api.get("/api/voice-agent/relationships", {"contact_id": args["contact_id"]})

        elif tool_name == "create_relationship":
            payload = {
                "contact_a_id": args["contact_a_id"],
                "contact_b_id": args["contact_b_id"],
                "relationship_type": args["relationship_type"],
            }
            if args.get("notes"):
                payload["notes"] = args["notes"]
            result = await api.post("/api/voice-agent/relationships", payload)

        # ── Workflow Management ───────────────────────────────────────────

        elif tool_name == "get_workflows":
            result = await api.get("/api/voice-agent/workflows")

        elif tool_name == "enroll_in_workflow":
            result = await api.post("/api/voice-agent/workflows", {
                "workflow_id": args["workflow_id"],
                "contact_id": args["contact_id"],
            })

        elif tool_name == "get_enrollments":
            result = await api.get("/api/voice-agent/enrollments", {"contact_id": args["contact_id"]})

        elif tool_name == "manage_enrollment":
            result = await api.patch("/api/voice-agent/enrollments", {
                "enrollment_id": args["enrollment_id"],
                "action": args["action"],
            })

        # ── Activity Logging ──────────────────────────────────────────────

        elif tool_name == "get_activities":
            params = {"contact_id": args["contact_id"]}
            if args.get("activity_type"):
                params["activity_type"] = args["activity_type"]
            params["limit"] = str(args.get("limit", 20))
            result = await api.get("/api/voice-agent/activities", params)

        elif tool_name == "log_activity":
            payload = {
                "contact_id": args["contact_id"],
                "activity_type": args["activity_type"],
            }
            if args.get("description"):
                payload["description"] = args["description"]
            if args.get("metadata"):
                payload["metadata"] = args["metadata"]
            result = await api.post("/api/voice-agent/activities", payload)

        # ── Newsletter Management ─────────────────────────────────────────

        elif tool_name == "get_newsletters":
            params = {}
            if args.get("status"):
                params["status"] = args["status"]
            params["limit"] = str(args.get("limit", 20))
            result = await api.get("/api/voice-agent/newsletters", params)

        elif tool_name == "approve_newsletter":
            result = await api.patch("/api/voice-agent/newsletters", {
                "newsletter_id": args["newsletter_id"],
                "action": args["action"],
            })

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

        elif tool_name == "bc_real_estate_reference":
            topic = args.get("topic", "all").lower()
            ref = {}
            if topic in ("forms", "all"):
                ref["bcrea_forms"] = {
                    "DORTS": "Disclosure of Representation in Trading Services — given at first contact before trading services begin",
                    "MLC": "Multiple Listing Contract — listing agreement between seller and brokerage for MLS rights",
                    "PDS": "Property Disclosure Statement — seller's written disclosure of known defects and material facts",
                    "FINTRAC": "Individual Identification Information Record — federal AML compliance, two government IDs required",
                    "PRIVACY": "Privacy Disclosure — how personal info is collected/used/stored under BC PIPA",
                    "C3": "Contract of Purchase and Sale — primary purchase agreement with offer price, subjects, completion day",
                    "DRUP": "Disclosure of Risks to Unrepresented Parties",
                    "MLS_INPUT": "MLS Data Input Form — technical data sheet for Paragon",
                    "MKTAUTH": "Marketing Authorization — authorizes internet, virtual tours, open houses, social media",
                    "AGENCY": "Agency Disclosure — documents who the licensee represents at time of offer",
                    "C3CONF": "Contract of Purchase and Sale Confirmation",
                    "FAIRHSG": "Fair Housing Declaration — equal opportunity housing under BC Human Rights Code",
                }
            if topic in ("fintrac", "all"):
                ref["fintrac"] = {
                    "requirement": "Identity verification required for ALL clients before providing trading services",
                    "ids": "Two government-issued IDs: one photo ID (passport, driver's license) + one secondary",
                    "corporations": "Verify entity and identify beneficial owners with 25%+ ownership",
                    "source_of_funds": "Document when cash transaction or funds inconsistent with stated occupation",
                    "retention": "ALL records kept minimum 5 years from transaction date",
                    "str": "Suspicious Transaction Reports filed within 30 days",
                    "pep": "Politically Exposed Persons require enhanced due diligence + senior management approval",
                    "large_cash": "Large Cash Transaction Reports for cash $10,000+ within 24 hours",
                }
            if topic in ("property_types", "all"):
                ref["property_types"] = {
                    "detached": "Single-family home, own lot, no strata",
                    "condo": "Strata-titled unit, subject to bylaws, strata fees, depreciation reports",
                    "townhouse": "Ground-level strata unit, private outdoor space",
                    "land": "Vacant lot, acreage, rural — may be ALR restricted",
                    "commercial": "Retail, office, industrial, mixed-use — GST almost always applies",
                    "multi_family": "Duplex, triplex, fourplex, larger rental buildings",
                }
            if topic in ("statuses", "all"):
                ref["listing_statuses"] = {
                    "Active": "Live on MLS, accepting showings/offers",
                    "Conditional": "Accepted offer with outstanding subject clauses",
                    "Subject Removal": "All conditions waived, deal is firm and binding",
                    "Sold": "Transaction completed, ownership transferred",
                    "Withdrawn": "Removed from marketing before expiry",
                    "Expired": "Listing term ended without sale",
                }
            if topic in ("taxes", "all"):
                ref["taxes"] = {
                    "PTT": "1% on first 200K, 2% on 200K-2M, 3% over 2M, 5% on residential over 3M. First-time buyer exemption under 500K",
                    "GST": "5% on new construction and substantially renovated homes. Partial rebate under 450K for primary residences",
                }
            if topic in ("terms", "all"):
                ref["key_terms"] = {
                    "Subject Clauses": "Conditions in C3 that must be satisfied/waived before firm (financing, inspection, strata docs)",
                    "Subject Removal": "Waiving all conditions — contract becomes firm. Backing out forfeits deposit",
                    "Completion Day": "Date ownership legally transfers, title changes hands",
                    "Adjustment Day": "Date property taxes, strata fees, utilities adjusted between buyer and seller",
                    "Strata Fees": "Monthly fees for building insurance, maintenance, contingency reserve",
                    "Form B": "Strata Information Certificate — fees, special levies, bylaws, litigation. 7-day buyer review",
                    "Depreciation Report": "30-year engineering report on future repair/replacement costs for strata common property",
                    "ALR": "Agricultural Land Reserve — protected farmland, development heavily restricted",
                }
            if topic in ("workflow", "all"):
                ref["workflow_phases"] = {
                    "Phase 1": "Seller Intake — FINTRAC identity, property details, commissions, showing instructions",
                    "Phase 2": "Data Enrichment — BC Geocoder, ParcelMap BC, LTSA, BC Assessment",
                    "Phase 3": "CMA Analysis — comparable sales, active competition, expired listings",
                    "Phase 4": "Pricing & Review — confirm list price, lock price, set marketing tier",
                    "Phase 5": "Form Generation — auto-fill 12 BCREA forms via Python server",
                    "Phase 6": "E-Signature — DocuSign envelope tracking",
                    "Phase 7": "MLS Preparation — Claude AI remarks, photo management",
                    "Phase 8": "MLS Submission — manual submission to Paragon",
                }
            result = ref if ref else {"error": f"Unknown topic: {topic}. Use: forms, fintrac, property_types, statuses, taxes, terms, workflow, or all"}

        else:
            result = {"error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        result = {"error": str(e)}

    return json.dumps(result, default=str)
