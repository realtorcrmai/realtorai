# Usecase: Voice Agent

## Problem Statement

A realtor's hands are often occupied — driving between showings, walking through a property with a client, or in back-to-back calls. Switching to a laptop to log a note, create a task, or look up a contact breaks flow and loses context. Repetitive data entry (seller intake, showing booking, deal stage updates) is time-consuming when done via mouse-and-keyboard.

ListingFlow's Voice Agent solves this with a floating chat-and-voice widget embedded in every CRM page. The realtor can speak or type naturally to search the database, create and update records, navigate the app, fill seller intake forms by dictation, confirm showings, check the pipeline, and get contextual help — all without leaving the current page. The same agent works in three modes: realtor (full internal CRM access), client (brand-safe public representative), and generic (general-purpose assistant).

---

## User Roles

| Role | Mode | Description |
|------|------|-------------|
| Listing Agent | `realtor` | Full internal access: all CRM data, tools, and navigation commands |
| Client (Buyer/Seller) | `client` | Receives calls on behalf of realtor: collects feedback, books tours, answers property questions (no internal data exposed) |
| Public User / Generic | `generic` | General-purpose assistant: calculations, time, reminders, web search, weather |

---

## Existing System Context

### Architecture
```
Browser (React)                      Python Server (aiohttp)          Next.js API Bridge
─────────────────────────────        ──────────────────────────       ──────────────────────
VoiceAgentWidget.tsx        ←→       voice_agent/server/main.py  ←→  /api/voice-agent/*
VoiceAgentPanel.tsx                  ├─ system_prompts.py              ├─ contacts
  ├─ Web Speech API (STT)            ├─ tools/realtor_tools.py         ├─ listings
  ├─ SpeechSynthesis (TTS)           ├─ tools/client_tools.py          ├─ showings
  ├─ SSE streaming                   ├─ tools/generic_tools.py         ├─ tasks
  └─ navigate_to handler             ├─ llm_providers.py               ├─ deals
                                     ├─ stt_providers.py               ├─ offers
                                     ├─ tts_providers.py               ├─ workflows
                                     ├─ database.py (SQLite)           ├─ enrollments
                                     ├─ api_client.py                  ├─ newsletters
                                     └─ config.py                      ├─ activities
                                                                        ├─ households
                                                                        ├─ relationships
                                                                        ├─ communications
                                                                        └─ feedback
```

### Server Components

**Python aiohttp server** — `voice_agent/server/main.py`
- Port: `8768` (configurable via `VOICE_AGENT_PORT`)
- Base URL: `http://127.0.0.1:8768` (or `NEXT_PUBLIC_VOICE_AGENT_URL`)
- Auth: Bearer token (`VOICE_AGENT_API_KEY`); if empty, auth disabled
- Session state: in-memory `_sessions` dict + SQLite persistence (`voice_agent.db`)
- Startup: warmup pings 6 Next.js voice-agent routes to trigger Turbopack compilation

**SQLite database** — `voice_agent/server/data/voice_agent.db`
- Tables: `conversation_log`, `preferences`, `playbooks`, `reminders`, `sessions`, `cost_log`
- Local-only data: conversation history, user preferences, call playbooks, reminders, LLM cost tracking

**React components** — `src/components/voice-agent/`
- `VoiceAgentWidget.tsx` — floating button + chat panel
- `VoiceAgentPanel.tsx` — expanded voice interface (full-screen mode)

### Server Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check + provider status |
| `/api/providers` | GET | LLM/TTS/STT provider availability matrix |
| `/api/sessions` | GET | List active sessions |
| `/api/session/create` | POST | Create or resume session |
| `/api/chat` | POST | Non-streaming chat (full response) |
| `/api/chat/stream` | POST | Streaming SSE chat |
| `/api/tool` | POST | Direct tool invocation (bypasses LLM) |
| `/api/reminders` | GET | List active reminders |
| `/api/costs` | GET | LLM cost summary |
| `/api/costs/{session_id}` | GET | Per-session cost breakdown |

---

## Features

### 1. Floating Widget UI
- Fixed position widget on every CRM page
- Bot icon button (collapsed) expands to chat panel
- Chat panel shows conversation history with role-labeled messages (`user`, `assistant`, `tool`, `nav`)
- `connected` state badge shows green/grey dot based on health check ping every 30 seconds
- Provider label shows active LLM (e.g., "anthropic", "ollama")
- Continuous mode: after AI finishes speaking, microphone auto-reactivates

### 2. Speech Recognition (STT)
- Uses browser `window.SpeechRecognition` / `window.webkitSpeechRecognition` (Web Speech API)
- `recognition.continuous = false`, `recognition.interimResults = true`, `recognition.lang = "en-US"`
- Interim results displayed in input field as the user speaks
- Final transcript auto-submitted on `recognition.onend` when in continuous mode
- Server-side fallback: Whisper local (`large-v3` model) or OpenAI Whisper via `stt_providers.py`
  - `STT_PROVIDER` env var: `whisper_local` | `openai_whisper`

### 3. Text-to-Speech (TTS)
- Primary: browser `window.speechSynthesis` with `SpeechSynthesisUtterance`
  - Voice preference order: Samantha → Google Natural → any local English voice
  - Rate: `1.05`, Pitch: `1.0`, Language: `en-US`
  - Markdown cleaned before speaking (strips `**`, `##`, `` ` ``, links)
- Server-side TTS via `tts_providers.py`:
  - `TTS_PROVIDER` env var: `piper` | `openai_tts` | `elevenlabs`
  - Piper: `PIPER_VOICE` (default `en_US-amy-medium`)
  - OpenAI TTS: `OPENAI_TTS_VOICE` (default `nova`), `OPENAI_TTS_MODEL` (`tts-1-hd`)
  - ElevenLabs: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- Toggle: TTS on/off button in widget header (Volume2 / VolumeX icon)
- Speaking state: "Stop" button (Square icon) cancels current utterance

### 4. Session Management
- Each browser session creates a unique `session_id` via `POST /api/session/create`
- Sessions persist to SQLite (`SESSION_PERSIST = true` by default) with `SESSION_EXPIRY_HOURS = 24`
- Sessions can be resumed: `POST /api/session/create` with `{ resume_session_id: "..." }`
- `MAX_CONVERSATION_HISTORY = 50` — older messages trimmed from context window while system prompt preserved
- `PERSONALIZATION_ENABLED = true` — last 5 conversation turns injected into new sessions for continuity
- Tool call execution and results logged to `conversation_log` table in SQLite

### 5. Three Modes

#### Realtor Mode (`AGENT_MODE=realtor`)
- Full access to all CRM data via Next.js API bridge
- Can create, read, update, delete: contacts, listings, showings, tasks, deals, offers, workflows, newsletters
- Navigation commands executed client-side via `navigate_to` tool
- Form-fill mode: activated when `listing_context` is passed to session create; agent extracts structured fields from natural language and returns them as JSON blocks for the CRM to auto-populate
- Access to all BC real estate knowledge, FINTRAC rules, BCREA forms, market terminology

#### Client Mode (`AGENT_MODE=client`)
- Public-facing representative for the realtor
- Introduces itself as calling on behalf of `[REALTOR_NAME]`
- Can collect showing feedback, schedule tours, answer public property questions
- CANNOT access internal negotiation notes, seller motivations, or bottom lines
- Tools: `get_property_details`, `check_tour_availability`, `book_tour`, `log_client_feedback`, `get_client_playbook`

#### Generic Mode (`AGENT_MODE=generic`)
- No real estate context
- General assistant: math, time, reminders, notes, web search, weather, summarization
- Tools: `get_current_time`, `calculate`, `set_reminder`, `take_note`, `get_notes`, `web_search`, `weather`, `summarize_text`

### 6. LLM Providers and Fallback Chain
Priority resolution (from `config.py`):
1. `LLM_PROVIDER` env var (explicit override)
2. Anthropic (`ANTHROPIC_API_KEY` set) → default `claude-sonnet-4-20250514`
3. OpenAI (`OPENAI_API_KEY` set) → default `gpt-4o`
4. Ollama (local) → default `llama3.2:8b`

Fallback chain: `LLM_FALLBACK_CHAIN = "anthropic,openai,ollama"` (comma-separated in env)

Providers implemented in `llm_providers.py`:
| Provider | Class | Key Config |
|----------|-------|-----------|
| Ollama | `OllamaProvider` | `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` |
| OpenAI | `OpenAIProvider` | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Anthropic | `AnthropicProvider` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| Groq | `GroqProvider` | `GROQ_API_KEY`, `GROQ_MODEL` (default `llama-3.3-70b-versatile`) |

All providers implement `chat(messages, tools)` and `chat_stream(messages, tools)` async interfaces.

`provider.is_available()` checked at health endpoint — status returned at `GET /api/health`.

### 7. Tool Calling (60 Realtor Tools)

Tools are dispatched in `handle_realtor_tool()` in `realtor_tools.py`. All CRM tools route through `api_client.py` → Next.js API bridge → Supabase. Local tools (reminders, notes, playbooks) stay in SQLite.

#### Contact Tools
| Tool | Bridge Endpoint | Description |
|------|----------------|-------------|
| `find_contact` | `GET /api/voice-agent/contacts` | Search by name, type, or contact_id |
| `find_buyer` | `GET /api/voice-agent/contacts` | Buyer-specific lookup |
| `create_buyer_profile` | `POST /api/voice-agent/contacts` | Create buyer with search criteria stored in notes |
| `update_contact` | `PATCH /api/voice-agent/contacts` | Update name, phone, email, type, pref_channel, stage_bar, lead_status, source, notes |
| `delete_contact` | `DELETE /api/voice-agent/contacts` | Permanent delete |
| `get_contact_details` | `GET /api/voice-agent/contacts/{id}` | Full profile + linked listings, deals, tasks, journey status |
| `get_communications` | `GET /api/voice-agent/communications` | SMS/email/WhatsApp/notes history for a contact |
| `get_activities` | `GET /api/voice-agent/activities` | Activity log per contact |
| `log_activity` | `POST /api/voice-agent/activities` | Log call, meeting, email, note, etc. |

#### Listing Tools
| Tool | Bridge Endpoint | Description |
|------|----------------|-------------|
| `search_properties` | `GET /api/voice-agent/listings` | Filter by price, address, status |
| `find_listing` | `GET /api/voice-agent/listings` | Lookup by address, MLS, or listing_id |
| `update_listing_status` | `PATCH /api/voice-agent/listings` | Change status (active/conditional/sold/etc.) |
| `update_listing_price` | `PATCH /api/voice-agent/listings` | Update list_price |
| `add_listing_note` | `PATCH /api/voice-agent/listings` | Append internal note |
| `create_listing` | `POST /api/voice-agent/listings` | Create new listing |
| `delete_listing` | `DELETE /api/voice-agent/listings` | Permanent delete |

#### Showing Tools
| Tool | Bridge Endpoint | Description |
|------|----------------|-------------|
| `get_showings` | `GET /api/voice-agent/showings` | Filter by listing, status, date |
| `create_showing` | `POST /api/voice-agent/showings` | Book showing + trigger Twilio seller notification |
| `confirm_showing` | `PATCH /api/voice-agent/showings` | confirm/deny/cancel appointment |

#### Task Tools
| Tool | Bridge Endpoint | Description |
|------|----------------|-------------|
| `get_tasks` | `GET /api/voice-agent/tasks` | Filter by status, priority, contact_id, listing_id |
| `create_task` | `POST /api/voice-agent/tasks` | Create task with due date and optional links |
| `update_task` | `PATCH /api/voice-agent/tasks` | Update status, priority, due date, title |
| `delete_task` | `DELETE /api/voice-agent/tasks` | Permanent delete |

#### Deal Tools
| Tool | Bridge Endpoint | Description |
|------|----------------|-------------|
| `get_deals` | `GET /api/voice-agent/deals` | Filter by stage, type, contact_id, listing_id |
| `create_deal` | `POST /api/voice-agent/deals` | Create new pipeline deal |
| `update_deal` | `PATCH /api/voice-agent/deals` | Update stage, status, value, commission |
| `get_deal_details` | `GET /api/voice-agent/deals/{id}` | Full deal + checklist + parties |

#### Offer Tools
| Tool | Bridge Endpoint | Description |
|------|----------------|-------------|
| `get_offers` | `GET /api/voice-agent/offers` | Filter by listing, buyer, status |
| `create_offer` | `POST /api/voice-agent/offers` | Submit offer with financials and conditions |
| `update_offer` | `PATCH /api/voice-agent/offers` | accept/reject/counter/withdraw |

#### Household & Relationship Tools
| Tool | Bridge Endpoint | Description |
|------|----------------|-------------|
| `get_households` | `GET /api/voice-agent/households` | List all households |
| `get_household_members` | `GET /api/voice-agent/households/{id}` | Household + member contacts |
| `create_household` | `POST /api/voice-agent/households` | Create household group |
| `add_to_household` | `PATCH /api/voice-agent/households` | Add contact to household |
| `remove_from_household` | `PATCH /api/voice-agent/contacts` | Remove contact from household |
| `get_relationships` | `GET /api/voice-agent/relationships` | Get contact's interpersonal links |
| `create_relationship` | `POST /api/voice-agent/relationships` | Link two contacts (spouse, parent, etc.) |

#### Workflow & Newsletter Tools
| Tool | Bridge Endpoint | Description |
|------|----------------|-------------|
| `get_workflows` | `GET /api/voice-agent/workflows` | List all automation workflows |
| `enroll_in_workflow` | `POST /api/voice-agent/enrollments` | Enroll contact in workflow |
| `get_enrollments` | `GET /api/voice-agent/enrollments` | Check active enrollments for contact |
| `manage_enrollment` | `PATCH /api/voice-agent/enrollments` | pause/resume/exit enrollment |
| `get_newsletters` | `GET /api/voice-agent/newsletters` | List by status (draft/approved/sent) |
| `approve_newsletter` | `POST /api/voice-agent/newsletters` | Approve or skip draft |

#### Navigation & Help Tools
| Tool | Notes | Description |
|------|-------|-------------|
| `navigate_to` | Client-side only | Navigate to CRM page; `page` enum + optional `id` and `tab` |
| `get_crm_help` | SQLite + prompt | Answer "how do I..." questions about ListingFlow |
| `configure_client_call` | SQLite | Set up automated client outreach playbook |
| `get_conversation_history` | SQLite | Retrieve past session history for context |

#### Generic Tools (all modes)
| Tool | Description |
|------|-------------|
| `get_current_time` | Current date/time in any timezone |
| `calculate` | Safe math expression evaluator |
| `set_reminder` | Create timed reminder in SQLite |
| `take_note` | Save persistent note |
| `get_notes` | Retrieve notes by keyword |
| `web_search` | Search the web for current information |
| `weather` | Current weather and forecast for any location |
| `summarize_text` | Condense long text into a brief |

### 8. Navigation Commands
Client-side navigation in `VoiceAgentWidget.tsx` via `parseNavigation()`:

Trigger phrases: `"go to"`, `"open"`, `"show me"`, `"navigate to"`, `"take me to"`, `"switch to"`, `"show"`

`NAV_MAP` (client-side immediate navigation):
```
dashboard/home → /
contacts       → /contacts
tasks          → /tasks
listings       → /listings
showings       → /showings
calendar       → /calendar
newsletters/email → /newsletters
assistant      → /assistant
knowledge      → /assistant/knowledge
```

`navigate_to` tool (LLM-driven, broader page coverage):
Full page enum includes: `dashboard`, `listings`, `contacts`, `showings`, `calendar`, `tasks`, `pipeline`, `newsletters`, `newsletters/queue`, `newsletters/analytics`, `newsletters/guide`, `automations`, `automations/templates`, `content`, `search`, `workflow`, `import`, `forms`, `forms/templates`, `contacts/segments`, `settings`, `inbox`

When a specific record ID is provided (e.g. `navigate_to({ page: "contacts", id: "uuid", tab: "intelligence" })`), the widget calls `router.push("/contacts/{id}?tab=intelligence")`.

### 9. Form-Fill Mode
Activated when a session is created with `listing_context` parameter (from Phase 1 Seller Intake page):
- `FORM_FILL_INSTRUCTION` appended to realtor system prompt
- Agent extracts structured fields from natural language and returns them in a JSON code block at the end of every response
- `_extract_fields(content)` in `main.py` parses the JSON block
- `_strip_json_block(content)` removes it from the spoken/displayed response
- Fields returned in API response as `{ fields: { seller_name, seller_dob, property_address, list_price, ... } }`
- CRM auto-populates form fields from the `fields` object

### 10. Cost Tracking
- Every LLM call logs to `cost_log` table in SQLite: provider, model, input_tokens, output_tokens, latency_ms, metadata
- `GET /api/costs?days=30` returns cost summary with totals and per-session breakdown
- `GET /api/costs/{session_id}` returns cost for a single session

---

## End-to-End Scenarios

### Scenario 1: Realtor Asks About Contacts by Voice

1. Realtor is driving; opens voice widget with one hand, taps mic
2. Says: "Find contacts named Wei"
3. Web Speech API captures transcript → `POST /api/chat` with `{ session_id, message: "Find contacts named Wei" }`
4. LLM (Anthropic) recognizes `find_contact` tool → returns tool_call with `{ name: "Wei" }`
5. `handle_realtor_tool("find_contact", { name: "Wei" })` → `GET /api/voice-agent/contacts?name=Wei` → Supabase query
6. Tool result: 2 matches — "Wei Zhang (buyer)" and "Wei Chen (seller)"
7. LLM generates: "I found two contacts named Wei — Wei Zhang, a buyer in Burnaby, and Wei Chen, a seller. Which one do you need?"
8. TTS reads the response aloud. Mic auto-activates (continuous mode).
9. Realtor says: "Wei Zhang" → `find_contact({ contact_id: zhang_id })` → full profile returned
10. Agent: "Wei Zhang is an active buyer looking for a condo in Burnaby under $900K. He has a showing scheduled on April 11th."

### Scenario 2: Create a Task by Voice

1. Realtor says: "Remind me to call Maria Chen on Friday about the Oak Street offer"
2. LLM extracts `create_task` intent: `{ title: "Call Maria Chen about Oak Street offer", due_date: "2026-04-03", contact_id: maria_id }`
3. `find_contact({ name: "Maria Chen" })` executed first to resolve `contact_id`
4. `create_task({ title: "...", due_date: "2026-04-03", contact_id: maria_id })` executed
5. Task created in Supabase, `revalidatePath("/tasks")`
6. Agent: "Done. Task created to call Maria Chen on Friday about the Oak Street offer."
7. TTS reads confirmation

### Scenario 3: Navigate to a Page by Voice

1. Realtor says: "Take me to the approval queue"
2. `parseNavigation()` checks for trigger phrases — "take me to" matches
3. "approval queue" → not in `NAV_MAP` (client-side) → falls through to LLM
4. LLM identifies `navigate_to({ page: "newsletters/queue" })`
5. Tool result includes `navigate: true`, `path: "/newsletters/queue"`
6. `VoiceAgentWidget` intercepts `navigate_to` tool response, calls `router.push("/newsletters/queue")`
7. Agent: "Opening the approval queue." — nav message displayed in chat as role `"nav"`

### Scenario 4: Dictate Seller Intake Data (Form-Fill Mode)

1. Realtor is on Phase 1 Seller Intake page for a new listing
2. Voice widget launched with `listing_context` = "New listing at 1234 Maple St"
3. Session created with `FORM_FILL_INSTRUCTION` appended to system prompt
4. Realtor dictates: "The seller is Jane Smith, born March 15 1980, she lives at 456 Oak St Vancouver, she's a teacher"
5. Agent responds: "Got it — Jane Smith, born 1980-03-15, teacher at 456 Oak Street. What's her phone number and email?"
6. Response includes JSON block:
   ```json
   {"seller_name": "Jane Smith", "seller_dob": "1980-03-15", "seller_address": "456 Oak St, Vancouver, BC", "seller_occupation": "Teacher"}
   ```
7. `_extract_fields()` parses the JSON; `fields` object returned in API response
8. CRM auto-fills: `seller_name`, `seller_dob`, `seller_address`, `seller_occupation` fields in the form
9. Realtor continues: "Her phone is 604-555-0100, email jane@example.com"
10. Agent extracts `seller_phone` and `seller_email`, appends to form

### Scenario 5: Confirm a Showing by Voice

1. Realtor gets a call from seller: "Yes, I confirm the showing tomorrow at 2pm"
2. Realtor opens voice widget, says: "Confirm the showing for 1234 Maple Street tomorrow"
3. LLM calls `get_showings({ listing_id: maple_id, date: "2026-04-11" })`
4. Finds one `"requested"` showing at 2pm for buyer agent Alex Reed
5. LLM confirms with realtor: "Found a 2pm showing for Alex Reed at 1234 Maple. Confirm it?"
6. Realtor: "Yes"
7. `confirm_showing({ showing_id: appt_id, action: "confirm" })` executed
8. `POST /api/voice-agent/showings` → `updateShowingStatus()` server action
9. Google Calendar event created, lockbox code sent to buyer agent via SMS
10. Agent: "Confirmed. Alex Reed has been sent the lockbox code. Calendar event created for tomorrow at 2pm."

### Scenario 6: Search Listings by Criteria

1. Realtor says: "Show me active condos in Burnaby under 900K"
2. LLM calls `search_properties({ status: "active", max_price: 900000, address: "Burnaby" })`
3. Returns 5 matching listings
4. Agent: "I found 5 active condos in Burnaby under $900K. The top 3 are: 678 Imperial at $849K, 901 Austin at $875K, and 234 Willingdon at $799K. Want me to send these to a buyer?"
5. Realtor: "Yes, send them to Wei Zhang"
6. Agent creates follow-up task or navigates to Wei's contact to send listings

---

## Demo Script

**Setup:** Voice agent server running at port 8768, Anthropic API key configured, Next.js running at port 3000.

1. **Open `/contacts`** — floating widget visible in bottom-right corner
2. **Click bot icon** — chat panel expands; greeting appears: "Good afternoon! You're on Contacts. I can search for anyone, score leads, or draft a message. Who do you need?"
3. **Provider badge** — show green connected dot, "anthropic" label
4. **Type "find Wei Zhang"** — observe tool call log, contact details returned
5. **Click mic icon** — speak "Navigate to the pipeline" — observe router navigation to `/pipeline`
6. **On pipeline page** — say "What deals are in the closing stage?" → `get_deals({ stage: "closing" })`
7. **TTS demo** — toggle TTS on, ask "What is the PTT rate in BC?" — AI reads BC real estate knowledge aloud
8. **Form-fill demo** — open a listing's Phase 1 workflow, activate voice, dictate seller details — watch form fields auto-populate
9. **Cost check** — type "How much have I spent on AI today?" → `GET /api/costs?days=1` summary

---

## Data Model

### SQLite Database (`voice_agent.db`)
| Table | Key Fields |
|-------|-----------|
| `conversation_log` | `session_id`, `mode`, `participant`, `role`, `content`, `tool_name`, `tool_args` (JSON), `tool_result` (JSON), `realtor_id`, `created_at` |
| `preferences` | `key`, `value` (JSON), `realtor_id`, `updated_at` |
| `playbooks` | `name`, `listing_id`, `questions` (JSON), `talking_points` (JSON), `mode`, `realtor_id`, `created_at` |
| `reminders` | `text`, `remind_at`, `realtor_id`, `created_at`, `fired` |
| `sessions` | `id`, `mode`, `realtor_id`, `messages` (JSON), `participant`, `created_at` |
| `cost_log` | `session_id`, `realtor_id`, `service`, `provider`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `latency_ms`, `metadata` (JSON), `created_at` |

### Session Object (in-memory)
| Field | Type | Notes |
|-------|------|-------|
| `session_id` | str | 12-char hex UUID |
| `mode` | str | `realtor` / `client` / `generic` |
| `realtor_id` | str | From `REALTOR_ID` env (default `R001`) |
| `messages` | list | Full OpenAI-format message array (system + history) |
| `participant_name` | str | Client name (client mode only) |
| `created_at` | datetime | Session start time |

---

## Voice Agent Integration

### Configuration (Environment Variables)
```bash
# LLM
LLM_PROVIDER=anthropic              # anthropic | openai | ollama | groq
LLM_FALLBACK_CHAIN=anthropic,openai,ollama
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:8b
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# TTS
TTS_PROVIDER=piper                  # piper | openai_tts | elevenlabs
PIPER_VOICE=en_US-amy-medium
OPENAI_TTS_VOICE=nova
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# STT
STT_PROVIDER=whisper_local          # whisper_local | openai_whisper
WHISPER_MODEL=large-v3

# Server
VOICE_AGENT_PORT=8768
VOICE_AGENT_API_KEY=                # Empty = no auth
AGENT_MODE=realtor                  # realtor | client | generic
REALTOR_ID=R001
LISTINGFLOW_API=http://127.0.0.1:3000

# Session
SESSION_EXPIRY_HOURS=24
SESSION_PERSIST=true

# Feature Flags
PERSONALIZATION_ENABLED=true
MAX_CONVERSATION_HISTORY=50
```

### Example Voice Interactions by Category

**Contacts:**
- "Find contacts named Sarah" → `find_contact({ name: "Sarah" })`
- "Create a buyer profile for James Park, looking for a townhouse in Coquitlam between 800K and 1.1 million" → `create_buyer_profile({ name: "James Park", criteria: { property_type: "townhouse", city: "Coquitlam", min_price: 800000, max_price: 1100000 } })`
- "Update Wei Zhang's preferred channel to WhatsApp" → `find_contact` → `update_contact({ pref_channel: "whatsapp" })`

**Listings:**
- "What active listings do I have over $1.5 million?" → `search_properties({ status: "active", min_price: 1500000 })`
- "Mark 456 Oak Street as conditional" → `find_listing` → `update_listing_status({ new_status: "conditional" })`
- "Add a note to the Maple Street listing: seller is flexible on possession date" → `add_listing_note({ note: "..." })`

**Showings:**
- "What showings are requested today?" → `get_showings({ status: "requested", date: "today" })`
- "Deny the showing from Tom Chen for Oak Street" → `get_showings` → `confirm_showing({ action: "deny" })`

**Deals & Offers:**
- "What are my conditional deals?" → `get_deals({ stage: "conditional" })`
- "Accept the offer from Wei Zhang on Maple Street" → `get_offers` → `update_offer({ action: "accept" })`
- "Create a deal for Sarah Kim looking to sell her condo in Burnaby, list price $780K, 3.5% commission" → `find_contact` → `create_deal({ type: "seller", value: 780000, commission_pct: 3.5 })`

**Workflows & Newsletters:**
- "Enroll Maria Chen in the buyer drip workflow" → `get_workflows` → `enroll_in_workflow`
- "How many newsletter drafts are waiting?" → `get_newsletters({ status: "draft" })`
- "Approve all pending newsletters" → `get_newsletters` → `approve_newsletter` × N

**Navigation:**
- "Go to showings" → client-side `router.push("/showings")`
- "Take me to the newsletter analytics" → `navigate_to({ page: "newsletters/analytics" })`
- "Open Wei Zhang's contact with the intelligence tab" → `navigate_to({ page: "contacts", id: wei_id, tab: "intelligence" })`

**BC Real Estate Knowledge:**
- "What is the PTT rate on a $1.5M property?" → AI calculates: "$21,000 (1% on first $200K + 2% on $200K–$1.5M)"
- "When does FINTRAC need to be completed?" → AI explains: "Before providing trading services; two government-issued IDs required"
- "What forms do I need for a new listing?" → AI lists all 12 BCREA forms with descriptions
