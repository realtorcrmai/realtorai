# Use Case: Unified AI Agent

## Problem Statement
Realtors have two separate AI buttons (chat + voice) with different capabilities. They don't know which to use, and neither system can do everything the realtor needs.

## User Roles
- **Realtor** (primary user) — asks questions, gives commands via text or voice
- **Admin** — sees all data, configures agent settings

## Existing System Context
- RAG Chat Widget: text-only, searches embeddings, read-only
- Voice Agent: voice-only, queries live DB, can take actions via 56 tools
- Both have separate sessions, auth, and data access patterns

## Scenarios

### Scenario 1: Morning Briefing (Voice → Text)
**Preconditions:** Realtor opens dashboard, clicks AI button
1. Realtor clicks 🎤 and says "What do I have today?"
2. Agent searches calendar (tool), contacts with upcoming dates (tool), pending tasks (tool)
3. Agent responds via voice: "You have 3 showings today. Sarah Chen's listing at 123 Main has a new offer. You have 5 tasks due."
4. Realtor switches to text mode (clicks keyboard icon)
5. Types: "Tell me more about Sarah's offer"
6. Agent searches RAG (knowledge) + queries offers table (tool) — responds in text with details
7. Conversation continues in text mode with full context from voice interaction

### Scenario 2: Contact Lookup on Detail Page (Text)
**Preconditions:** Realtor is on /contacts/[id] detail page
1. Realtor clicks AI button, types: "Summarize this contact's history"
2. Agent receives page context (contact_id from usePageContext)
3. Agent calls searchKnowledge tool (RAG) with contact_id filter
4. Agent also calls getContact tool for live data
5. Responds with grounded summary: last contact date, communication frequency, engagement score, next recommended action
6. Sources shown with clickable links

### Scenario 3: Take Action via Voice
**Preconditions:** Realtor is driving, uses voice mode
1. Realtor: "Create a task to follow up with John Davidson tomorrow"
2. Agent calls searchContacts("John Davidson") → finds contact
3. Agent calls createTask(title: "Follow up with John Davidson", due: tomorrow, contact_id: found ID)
4. Agent confirms: "Done. I've created a task to follow up with John Davidson tomorrow. It's set as medium priority."
5. Realtor: "Make it high priority"
6. Agent calls updateTask(priority: "high") → confirms update

## Demo Script

### Setup
- Dev server running at localhost:3000
- Python audio service at localhost:8768
- Demo data seeded (contacts, listings, tasks)

### Script
1. Open dashboard → single AI button visible (bottom-right)
2. Click button → chat panel opens in text mode
3. Type "How many active listings do I have?" → agent responds with count + details
4. Click 🎤 → voice mode activates
5. Say "Schedule a showing for 123 Main Street tomorrow at 2pm" → agent creates showing
6. Click keyboard icon → back to text
7. Navigate to /contacts/[id] → context changes
8. Type "What's this contact's engagement score?" → agent responds with contact-specific data

### Key Talking Points
- One button replaces two
- Seamless text ↔ voice switching
- Page-aware context
- Can search knowledge AND take actions in same conversation
- Multi-tenant: each realtor only sees their own data
