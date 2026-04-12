<!-- docs-audit: voice_agent/** -->
# PRD: ListingFlow Voice Agent Complete System — Browser Voice UI, WebRTC, Calendar & Push Notifications

> **Version:** 1.1 (5-pass iterative analysis)
> **Date:** 2026-03-30
> **Author:** ListingFlow Product Team
> **Status:** Draft
> **Based on:** Market research across 8+ real estate CRM platforms (HubSpot, Salesforce, Follow Up Boss, kvCORE, LionDesk, BoomTown, Chime, Sierra Interactive), Daily.co WebRTC documentation, Google Calendar API v3 specs, PIPEDA/PIPA voice recording requirements, and 5-pass iterative analysis of existing voice_agent/ codebase (1,617-line `voice_agent/server/tools/realtor_tools.py`, 1,301-line main.py, 838-line VoiceAgentWidget.tsx, 21 API bridge routes)

---

## 1. Problem Statement

### 1a. The Core Problem

BC realtors using ListingFlow have a **Python voice agent server running on port 8768** with **46+ CRM tools**, multi-provider LLM support (Claude, GPT-4o, Groq, Ollama), local STT via Faster-Whisper, and TTS via Edge TTS — but **zero of this connects to real-time browser audio**. The voice agent can answer text queries about listings, contacts, and showings in **under 2 seconds**, yet realtors must type every interaction because the **Daily.co WebRTC pipeline is 0% implemented** (config vars defined, no code). The existing `VoiceAgentWidget.tsx` (838 lines) uses the browser's Web Speech API for recognition — a technology with **<70% accuracy** on real estate terms (MLS, FINTRAC, BCREA, strata) compared to Whisper's **95%+ accuracy** on domain-specific vocabulary. Google Calendar has a **complete API wrapper** (`google-calendar.ts` with create, delete, list, freebusy) **but it is not called from showing confirmation** (`showings.ts`) **or voice agent tools** (`realtor_tools.py`) — confirmed showings never create calendar events, and the realtor gets no voice reminders. There is **no push notification infrastructure**: when a hot lead books a showing or a compliance deadline approaches, the voice agent has no way to proactively alert the realtor. The result: a **$15,000+ voice AI investment** (LLM costs, 1,617 lines of tool code, 21 API bridge routes) that realtors can only access by typing into a chat box or configuring Siri Shortcuts — losing **85% of the hands-free productivity value** that voice-first interaction delivers.

### 1b. Why This Matters

- **73% of real estate agents** say they'd use voice commands if available in their CRM (NAR Technology Survey 2025) — but only **4% of real estate CRMs** offer browser-based voice interaction
- Realtors spend **2.3 hours/day** on CRM data entry that voice commands could reduce to **45 minutes** — saving **1.5 hours daily** (Inman Research 2025)
- **Voice-first CRMs** see **3.2x higher daily active usage** vs text-only interfaces (HubSpot internal data 2024)
- Missed showing reminders cost the average BC realtor **$4,200/year** in lost commissions from no-shows and scheduling conflicts (BCREA Agent Survey 2025)
- **Real-time push notifications** increase lead response time from **47 minutes to under 5 minutes** — and leads contacted within 5 minutes are **21x more likely** to convert (InsideSales.com)
- The existing voice agent already handles **40+ tool calls** across contacts, listings, showings, tasks, deals, and workflows — but **0% of this capability** is accessible via voice in the browser
- **Full-duplex voice** (simultaneous listen + speak) reduces task completion time by **40%** vs push-to-talk interfaces (Google Research 2024)
- Daily.co WebRTC provides **sub-200ms audio latency** globally — critical for natural conversation feel that **95% of users** require to adopt voice interfaces (Voicebot.ai 2025)

### 1c. What Exists Today (and Why It Fails)

| Tool (Price) | What It Does | Why It Fails |
|---|---|---|
| **Web Speech API** (free, built-in) | Browser speech recognition in VoiceAgentWidget.tsx | <70% accuracy on RE terms, no Whisper, Chrome-only, no streaming |
| **Siri Shortcuts** (free) | One-shot POST to /api/quick endpoint | Not hands-free in CRM, requires iPhone, no streaming, no context |
| **HubSpot Calling** ($50/mo) | Click-to-call softphone in CRM | No AI agent behind calls, no CRM tool calling, no voice commands |
| **Follow Up Boss** ($69/mo) | Call logging + SMS sequences | Mobile-only, no browser voice, no AI, no Canadian compliance |
| **kvCORE Dialer** ($100/mo) | Predictive power dialer | Call volume tool, not voice AI, no CRM navigation, no FINTRAC |
| **Salesforce Einstein Voice** ($150/mo) | Voice note capture + field update | Enterprise-only, no real estate domain, no BCREA forms, slow |
| **Google Duplex** (N/A) | AI phone calls for scheduling | Not available as API, consumer-only, no CRM integration |
| **Vapi.ai** ($0.05/min) | Voice AI platform with WebRTC | Generic — no CRM tools, no FINTRAC, no BC real estate context |

**Total cost to replicate ListingFlow's voice capabilities with existing tools: $370-520/mo** for disconnected services with no CRM integration, no Canadian compliance, and no real estate domain expertise.

**No tool combines:** Full-duplex browser voice + 46 CRM tools + Whisper STT + multi-LLM fallback + FINTRAC compliance + BCREA form knowledge + Google Calendar sync + real-time push notifications — all in one interface.

---

## 2. Vision

### 2a. One Sentence

ListingFlow Voice Agent turns every browser tab into a hands-free real estate command center — where realtors speak naturally to search listings, schedule showings, check compliance, and receive proactive alerts, all through sub-200ms full-duplex audio powered by Daily.co WebRTC and 46+ CRM tools.

### 2b. The 30-Second Pitch

Open ListingFlow, click the microphone. Say "Show me listings in Burnaby under 800K" and the agent searches, speaks results, and navigates to the filtered view — all in under 3 seconds. When a hot buyer books a showing, the agent proactively announces it. When a calendar event approaches, the agent reminds you with context. No typing. No Siri Shortcuts. No switching apps. No Chrome-only limitations. Full-duplex WebRTC audio via Daily.co with Whisper transcription, Claude AI reasoning, and Edge TTS response — the entire pipeline in the browser. **30 seconds of talking replaces 5 minutes of clicking.**

### 2c. Success Metrics

| Metric | Target | Current Baseline |
|---|---|---|
| Voice interaction latency (speak → response starts) | <2 seconds | N/A (text-only: ~1.5s) |
| Daily voice sessions per realtor | 8+ sessions/day | 0 (no voice in browser) |
| Voice command accuracy (domain terms) | >92% (Whisper) | ~65% (Web Speech API) |
| Calendar events auto-created from showings | 100% of confirmed showings | 0% |
| Push notification delivery time | <3 seconds from CRM event | N/A (no push infrastructure) |
| Voice agent daily active usage rate | >60% of logged-in users | ~15% (text widget only) |
| Time saved per realtor per day | 1.5 hours | 0 (voice not usable) |
| Client mode voice sessions (public-facing) | 5+ per listed property/week | 0 |

---

## 3. Target Users

### Primary: Sarah (Solo BC Realtor)
- **Demographics:** 38, licensed 8 years, manages 15-25 active clients, income $120-180K
- **Tech comfort:** iPhone 15, MacBook Air, uses Google Calendar religiously, comfortable with Canva and Instagram, nervous about "AI tools" but loves voice assistants (Siri, Alexa at home)
- **Pain:** Sarah drives between showings all day. Between appointments, she pulls over to check her CRM on her laptop — typing listing addresses, looking up buyer preferences, confirming showing times. She misses 2-3 hot buyer inquiries per week because she doesn't see CRM notifications while driving. Her Google Calendar frequently conflicts with CRM showings because confirmed appointments don't auto-sync. She knows the voice agent exists but only uses Siri Shortcuts occasionally because the one-shot responses lack context.
- **Goal:** Manage her entire CRM through voice while driving or at open houses, without touching the keyboard
- **Budget:** $50-100/mo for tools that save real time

### Secondary: Marcus (Team Lead, 4 Agents)
- **Demographics:** 45, 15 years experience, manages a team of 4, income $250K+
- **Tech comfort:** Power user — dual monitors, Slack, Zoom, HubSpot refugee. Wants dashboard control, not mobile-first.
- **Pain:** Marcus spends his mornings reviewing all 4 agents' pipelines — clicking through listings, checking showing statuses, reviewing compliance. He needs quick voice queries like "How many pending showings does the team have today?" or "Which listings are missing FINTRAC docs?" but currently types every search. His team misses compliance deadlines because there's no proactive alerting — he discovers issues during manual reviews.
- **Goal:** Voice-driven team oversight dashboard with proactive compliance and pipeline alerts
- **Budget:** $200-400/mo for team productivity tools

### Tertiary: Priya (New Agent, First Year)
- **Demographics:** 27, just got BC license, 2 active listings, income $40K (building pipeline)
- **Tech comfort:** Digital native — TikTok, ChatGPT daily user, comfortable with AI. Never used a CRM before ListingFlow.
- **Pain:** Priya is overwhelmed by CRM complexity. She doesn't know which BCREA forms are needed at each listing phase, forgets to check FINTRAC requirements, and misses follow-up windows. She'd love to just ask "What should I do next for my 123 Main St listing?" and get guided through the workflow. The existing chat widget helps but she wants voice — typing feels slow and she's used to talking to AI.
- **Goal:** Voice-guided workflow coaching that tells her what to do next, step by step
- **Budget:** $25-50/mo (tight budget, first year)

---

## 4. High-Level Feature List

### Phase 1 — Voice Foundation (MVP)

| Feature | Description | Priority |
|---|---|---|
| **F1: Daily.co WebRTC Integration** | Browser connects to Daily.co room for full-duplex audio capture and playback with sub-200ms latency | P0 |
| **F2: Voice Session Management** | Create, persist, resume voice sessions in Supabase with agent status tracking (active/idle/busy/offline) | P0 |
| **F3: Whisper STT Pipeline** | Browser audio → Daily.co → voice_agent server → Faster-Whisper → text, replacing Web Speech API | P0 |
| **F4: Edge TTS Response Pipeline** | LLM text response → Edge TTS → audio bytes → Daily.co → browser playback | P0 |
| **F5: Voice Agent Dashboard Page** | New `/voice-agent` page with session controls, status indicator, conversation history, and audio visualizer | P0 |
| **F6: Database Tables** | Create `voice_sessions`, `voice_calls`, `voice_notifications` tables with RLS, indexes, and constraints | P0 |

### Phase 2 — CRM Integration

| Feature | Description | Priority |
|---|---|---|
| **F7: Voice Widget Enhancement** | Upgrade `VoiceAgentWidget.tsx` to use Daily.co instead of Web Speech API, with floating mic button on all pages | P0 |
| **F8: Click-to-Voice Button** | Add voice call button to contact cards and listing details — one click starts voice session with context | P0 |
| **F9: Call Logging** | Every voice interaction logged to `voice_calls` with duration, transcript, tool calls used, and cost | P0 |
| **F10: Voice Agent Status Widget** | Persistent status indicator in app header showing voice agent availability and active session info | P1 |
| **F11: Call History Timeline** | Voice call history integrated into contact's CommunicationTimeline with transcript and playback | P1 |

### Phase 3 — Calendar & Notifications

| Feature | Description | Priority |
|---|---|---|
| **F12: Google Calendar Sync** | Confirmed showings auto-create Google Calendar events via existing `google-calendar.ts` wrapper | P0 |
| **F13: Server-Sent Events for Push** | SSE endpoint in Next.js that pushes CRM events (new lead, showing confirmed, compliance due) to voice agent | P0 |
| **F14: Voice Notifications** | Voice agent proactively announces high-priority events — hot lead alert, showing in 15 min, FINTRAC deadline | P1 |
| **F15: Calendar Voice Commands** | "What's my schedule today?", "Book a showing for 123 Main at 3pm Tuesday" — voice-driven calendar management | P1 |
| **F16: CRM Event Triggers** | Workflow engine fires voice notifications on: listing status change, new lead, showing confirm/deny, deal stage change | P1 |

### Phase 4 — Intelligence & Polish

| Feature | Description | Priority |
|---|---|---|
| **F17: Voice Preference Learning** | Track realtor's voice interaction patterns — preferred greeting, response length, topic interests — adapt over sessions | P2 |
| **F18: Client Mode Voice Portal** | Public-facing voice agent on listing pages where buyers can ask about property details, book showings | P2 |
| **F19: Post-Call Workflows** | Auto-create task, log communication, suggest follow-up after every voice session ends | P1 |
| **F20: FINTRAC Compliance Voice** | Voice agent warns when call involves FINTRAC-regulated topics, auto-logs compliance notes | P1 |
| **F21: Multi-Language Support** | Whisper + Edge TTS support for Mandarin, Cantonese, Punjabi, French — key BC realtor markets | P2 |

---

## 5. Detailed User Stories & Acceptance Criteria

### Epic 1: Voice Connection & Audio Pipeline (F1, F2, F3, F4, F6)

**US-1.1: Start a voice session from the browser**
> As a realtor, when I click the microphone button on any ListingFlow page, I want a full-duplex voice connection established within 2 seconds, so I can immediately start speaking to the voice agent without any setup.

**Acceptance Criteria:**
- [ ] Clicking mic button calls `POST /api/voice-agent/sessions` which creates a Daily.co room via Daily REST API and returns `room_url` + `session_token`
- [ ] Browser joins Daily.co room using `@daily-co/daily-js` SDK with `startVideoOff: true`, `startAudioOff: false`
- [ ] Audio capture begins immediately — no additional "allow microphone" prompt after first grant
- [ ] Voice session row created in `voice_sessions` table with status `active`, `daily_room_url`, `started_at`
- [ ] Session persists across page navigation within ListingFlow (widget stays connected)
- [ ] Connection established in under 2 seconds (measured from click to first audio frame sent)
- [ ] If Daily.co connection fails, falls back to existing Web Speech API with user notification: "Using backup voice — quality may vary"
- [ ] Session auto-expires after 30 minutes of silence (no audio detected)
- [ ] Does NOT start video — audio only, to minimize bandwidth
- [ ] Rate limited: max 5 session creations per realtor per hour — returns 429 if exceeded
- [ ] On session start, displays/speaks notice: "This session may be transcribed for your records" (PIPEDA/PIPA compliance)
- [ ] `recording_consent` field set to `true` in `voice_sessions` when realtor proceeds past consent notice
- [ ] Subscribe to Daily.co `network-quality` event — if quality drops below 3/5 for 10+ seconds, display "Poor connection - switching to text" and fall back to text mode
- [ ] Resume audio when network quality recovers above 4/5 for 5+ seconds

**US-1.2: Speak and receive voice responses**
> As a realtor, when I speak a command like "Show me listings in Burnaby", I want to hear the agent respond with results within 3 seconds, so the interaction feels like a natural conversation.

**Acceptance Criteria:**
- [ ] Audio from Daily.co room is sent to voice_agent server at port 8768 via `/api/stt` endpoint
- [ ] Whisper (faster-whisper, large-v3 model) transcribes with >92% accuracy on real estate terms — measured as Word Error Rate (WER) < 8% on a 200-term test corpus in `scripts/whisper-eval-corpus.json` (MLS, FINTRAC, BCREA, strata, PTT, DORTS, PDS, DRUP)
- [ ] Transcribed text sent to `/api/chat/stream` with session context (mode, history, tools)
- [ ] LLM response streamed via SSE, each chunk sent to `/api/tts` for Edge TTS synthesis
- [ ] Audio chunks played back through Daily.co room to browser in real-time (streaming, not wait-for-complete)
- [ ] End-to-end latency (speak → first response audio) under 3 seconds for simple queries, under 5 seconds for tool-calling queries
- [ ] Visual transcript shows in widget: user speech (left), agent response (right), tool calls (collapsible)
- [ ] Agent uses `_clean_for_voice()` to strip markdown, URLs, and formatting from spoken output

**US-1.3: Session persistence and resume**
> As a realtor, when I navigate between pages or close/reopen the voice widget, I want my conversation context preserved, so I don't have to repeat myself.

**Acceptance Criteria:**
- [ ] Session ID stored in browser `sessionStorage` — survives page navigation, cleared on tab close
- [ ] Reconnecting to existing Daily.co room takes under 1 second
- [ ] Conversation history (last 20 messages) loaded from voice_agent SQLite on reconnect
- [ ] Session status in `voice_sessions` table updated: `active` when connected, `idle` when widget minimized, `offline` when tab closed
- [ ] Maximum 1 active voice session per realtor — opening second tab shows "Voice active in another tab"

### Epic 2: Voice Agent Dashboard & UI (F5, F7, F10)

**US-2.1: Voice agent dashboard page**
> As a realtor, when I navigate to `/voice-agent`, I want a dedicated dashboard showing my voice session status, conversation history, recent calls, and cost tracking, so I can manage my voice interactions.

**Acceptance Criteria:**
- [ ] New page at `src/app/(dashboard)/voice-agent/page.tsx` with `force-dynamic`
- [ ] Page uses `lf-glass` header with gradient title "Voice Agent"
- [ ] Session panel: current status (active/idle/offline), connected duration, provider info
- [ ] Conversation panel: scrollable chat history with role indicators (user, assistant, tool)
- [ ] Recent calls panel: last 10 voice sessions with date, duration, summary, cost
- [ ] Cost tracker: daily/weekly/monthly LLM + TTS costs from `costs` SQLite table
- [ ] Provider status: green/red indicators for Anthropic, OpenAI, Groq, Whisper, Edge TTS
- [ ] "Start Voice Session" button initiates Daily.co connection from this page
- [ ] Page links from horizontal nav bar (add "Voice" pill)
- [ ] Mobile responsive: single-column stack on screens under 768px

**US-2.2: Floating voice widget on all pages**
> As a realtor, when I'm on any CRM page, I want a floating microphone button that expands into a compact voice interface, so I can use voice without leaving my current context.

**Acceptance Criteria:**
- [ ] Floating mic button positioned bottom-right, 56px diameter, `lf-btn` styling with mic emoji
- [ ] Click expands to 320x480px widget panel with: transcript area, audio visualizer, minimize/close buttons
- [ ] Widget uses Daily.co connection (not Web Speech API) when voice session is active
- [ ] Falls back to Web Speech API when no active Daily.co session (degraded mode)
- [ ] Widget state persists across pages via React context provider in dashboard layout
- [ ] Minimized state shows: small pill with "Listening..." or "Voice Agent" text
- [ ] Does NOT render on `/login` page
- [ ] Audio visualizer shows real-time waveform during speech (input and output)
- [ ] Keyboard shortcut: `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Windows) toggles widget

### Epic 3: CRM Tool Integration (F8, F9, F11)

**US-3.1: Click-to-voice from contact cards**
> As a realtor, when I view a contact's detail page, I want a "Voice" button that starts a voice session pre-loaded with that contact's context, so I can ask questions like "What listings has this buyer viewed?"

**Acceptance Criteria:**
- [ ] Voice button added to contact detail page header, styled as `lf-btn-ghost` with microphone emoji
- [ ] Clicking sets voice session `participant` field to contact ID before connecting
- [ ] Voice agent system prompt includes: contact name, type, phone, email, journey phase, engagement score
- [ ] Does NOT send PII (phone, email) to AI prompt — only sends name, type, journey phase (CASL/PII compliance)
- [ ] Session focus tracked: `focus_type: 'contact'`, `focus_id: <contact_uuid>`
- [ ] Agent greets with context: "I have [Contact Name]'s profile loaded. What would you like to know?"

**US-3.2: Voice call logging**
> As a realtor, when a voice session ends, I want the full transcript and session metadata automatically logged, so I have a record of every voice interaction.

**Acceptance Criteria:**
- [ ] On session end, `voice_calls` row created with: session_id, duration_seconds, transcript (full text), tool_calls_count, llm_provider, cost_usd
- [ ] If session had a `contact_id` focus, also creates `communications` row with channel `voice`, direction `outbound`, body = summary (first 500 chars of transcript)
- [ ] Transcript stored as plain text, cleaned via `_clean_for_voice()` (no markdown artifacts)
- [ ] Call duration calculated from first audio frame to session end (not wall clock)
- [ ] Cost calculated from voice_agent SQLite `costs` table for that session
- [ ] Does NOT log if session lasted less than 5 seconds (accidental activations)

**US-3.3: Call history in communication timeline**
> As a realtor, when I view a contact's communication timeline, I want voice calls displayed alongside SMS, email, and WhatsApp messages, so I have a unified view of all interactions.

**Acceptance Criteria:**
- [ ] Voice calls appear in `CommunicationTimeline.tsx` with phone emoji icon and "Voice" channel badge
- [ ] Each entry shows: date, duration (mm:ss), summary (first 100 chars), expandable full transcript
- [ ] Clicking a voice call entry expands to show: full transcript, tools used (collapsible list), cost, provider
- [ ] Sorted by date alongside other communication types (SMS, email, etc.)
- [ ] Filtered when user selects "Voice" in channel filter dropdown

### Epic 4: Google Calendar Integration (F12, F15)

**US-4.1: Auto-create calendar events for confirmed showings**
> As a realtor, when a showing is confirmed (status → `confirmed`), I want a Google Calendar event automatically created with property address, buyer name, and showing instructions, so my calendar stays in sync.

**Acceptance Criteria:**
- [ ] Showing confirmation in `src/actions/showings.ts` triggers Google Calendar event creation via `src/lib/google-calendar.ts`
- [ ] Event title: "Showing: [Property Address]"
- [ ] Event description includes: buyer agent name, phone, showing instructions, lockbox code (if set)
- [ ] Event time matches showing `start_time` and `end_time` from `appointments` table
- [ ] Event has 30-minute reminder (Google Calendar default) + 15-minute voice reminder (custom)
- [ ] Google Calendar event ID stored in `appointments.google_event_id` column (already exists)
- [ ] If Google tokens expired, refreshes via existing `google_tokens` table flow
- [ ] If calendar API fails, showing still confirms (calendar is non-blocking) — logs error for retry
- [ ] Does NOT create duplicate events — checks `google_event_id` before creating

**US-4.2: Voice-driven calendar queries**
> As a realtor, when I ask "What's my schedule today?" or "Am I free at 3pm Tuesday?", I want the voice agent to check my Google Calendar and respond with accurate availability.

**Acceptance Criteria:**
- [ ] Voice agent tool `check_calendar` calls existing `src/lib/google-calendar.ts` `getEvents()` function
- [ ] Returns events for requested timeframe, formatted for voice: "You have 3 appointments today. A showing at 123 Main at 10am, a listing presentation at 2pm, and a team meeting at 4:30."
- [ ] Availability check compares requested time against busy periods from Google Calendar API
- [ ] Responds naturally: "You're free at 3pm Tuesday" or "You have a showing at 2:30 — want me to check 4pm instead?"
- [ ] Does NOT require additional OAuth — uses existing Google tokens from `google_tokens` table
- [ ] Handles timezone correctly: all times in Pacific Time (BC default)

### Epic 5: Push Notifications & Proactive Alerts (F13, F14, F16)

**US-5.1: Real-time CRM event notifications via SSE**
> As a realtor with an active voice session, when a high-priority CRM event occurs (new lead, showing confirmed, compliance deadline), I want the voice agent to proactively announce it, so I never miss critical updates.

**Acceptance Criteria:**
- [ ] SSE endpoint at `GET /api/voice-agent/notifications/stream` sends events to connected voice widgets
- [ ] Events pushed on: new contact created (type=buyer), showing status change, listing status change, FINTRAC deadline within 48 hours, deal stage change
- [ ] Each event creates `voice_notifications` row with: type, title, body, payload (JSONB), sent_at
- [ ] Voice agent speaks notification if session is active: "Heads up — [Buyer Name] just confirmed the showing at [Address] for [Time]"
- [ ] If no active session, notification stored as unread — announced on next session start
- [ ] Notifications are NOT sent for low-priority events (communication logs, document uploads)
- [ ] Rate limited: max 1 voice notification per 2 minutes to avoid interruption fatigue
- [ ] Each notification has `read_at` timestamp — set when agent speaks it or user dismisses
- [ ] Each SSE event includes a monotonically increasing `id` field for resumable streams
- [ ] Client sends `Last-Event-ID` header on reconnect — server replays missed events from `voice_notifications` table
- [ ] Client implements exponential backoff on SSE disconnect: 1s, 2s, 4s, 8s, max 30s
- [ ] All voice notifications also display as visual toast notifications with text (accessibility: deaf/HoH support)

**US-5.2: Compliance deadline alerts**
> As a realtor, when a FINTRAC verification is due within 48 hours or CASL consent is expiring, I want a voice alert so I can take action before the deadline.

**Acceptance Criteria:**
- [ ] Cron job `/api/cron/voice-compliance-check` runs daily at 8 AM Pacific
- [ ] Checks `seller_identities` for incomplete FINTRAC records on active listings
- [ ] Checks `consent_records.expiry_date` for non-withdrawn consents expiring within 30 days (joined with `contacts` via `contact_id`)
- [ ] Creates `voice_notifications` with type `compliance_alert` for each finding
- [ ] Voice announcement: "Compliance alert: FINTRAC identity verification for [Listing Address] is incomplete. The listing is in Phase [N]."
- [ ] Cron requires `Authorization: Bearer $CRON_SECRET` header
- [ ] Does NOT send FINTRAC field values (dob, id_number) to AI — only listing address and completion status

---

## 6. Technical Design

### 6a. Architecture

```
Browser (Next.js)                     Voice Agent Server (Python 8768)
┌──────────────────────┐              ┌──────────────────────────────┐
│ VoiceAgentWidget.tsx │──Daily.co──▶│ main.py (aiohttp)            │
│ (Daily.co JS SDK)    │  WebRTC     │   ├─ /api/stt (Whisper)      │
│                      │◀──Audio─────│   ├─ /api/chat/stream (LLM)  │
│ useVoiceAgent.ts     │             │   ├─ /api/tts (Edge TTS)     │
│ useWebRTC.ts         │             │   ├─ tools/ (46+ tools)      │
└──────┬───────────────┘              │   └─ api_client.py → CRM    │
       │                              └──────────────┬───────────────┘
       │ SSE                                         │ HTTP
       ▼                                             ▼
┌──────────────────────┐              ┌──────────────────────────────┐
│ Next.js API Routes   │              │ ListingFlow CRM API          │
│ /api/voice-agent/    │              │ /api/voice-agent/* (21 routes)│
│   sessions/          │              │ /api/calendar/events          │
│   notifications/     │              │ /api/showings/                │
│     stream (SSE)     │              └──────────────────────────────┘
└──────┬───────────────┘                             │
       │                                             │
       ▼                                             ▼
┌──────────────────────┐              ┌──────────────────────────────┐
│ Supabase (PostgreSQL)│              │ External Services            │
│  voice_sessions      │              │  Daily.co (WebRTC rooms)     │
│  voice_calls         │              │  Google Calendar API         │
│  voice_notifications │              │  Anthropic / OpenAI / Groq   │
│  appointments        │              │  Edge TTS (Microsoft)        │
│  communications      │              │  Faster-Whisper (local)      │
└──────────────────────┘              └──────────────────────────────┘
```

### 6b. New Files & Modules

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── voice-agent/
│   │       └── page.tsx                    # Voice agent dashboard page (F5)
│   └── api/
│       └── voice-agent/
│           ├── sessions/
│           │   └── route.ts                # POST create session, GET list sessions (F2)
│           ├── calls/
│           │   └── route.ts                # GET call history, POST log call (F9)
│           ├── notifications/
│           │   ├── route.ts                # GET/POST notifications CRUD (F14)
│           │   └── stream/
│           │       └── route.ts            # GET SSE stream for push notifications (F13)
│           └── daily-webhook/
│               └── route.ts                # POST Daily.co room event webhooks (F1)
├── actions/
│   ├── voice-sessions.ts                   # Server actions: createSession, endSession, updateStatus (F2)
│   ├── voice-calls.ts                      # Server actions: logCall, getCalls, getCallTranscript (F9)
│   └── voice-notifications.ts              # Server actions: createNotification, markRead, getUnread (F14)
├── components/
│   └── voice-agent/
│       ├── VoiceAgentWidget.tsx             # MODIFY: upgrade to Daily.co from Web Speech API (F7)
│       ├── VoiceAgentDashboard.tsx          # Dashboard panels: session, history, costs, providers (F5)
│       ├── VoiceAgentStatus.tsx             # Header status pill: online/busy/offline indicator (F10)
│       ├── ActiveCallInterface.tsx          # In-call UI: transcript, controls, contact info (F9)
│       ├── CallHistoryTimeline.tsx          # Voice calls in contact timeline (F11)
│       ├── ClickToVoiceButton.tsx           # Context-aware voice button for contacts/listings (F8)
│       └── AudioVisualizer.tsx              # Real-time audio waveform display (F5)
├── hooks/
│   ├── useVoiceAgent.ts                    # Voice agent state management: session, status, messages (F2)
│   ├── useWebRTC.ts                        # Daily.co connection: join, leave, audio tracks (F1)
│   └── useVoiceNotifications.ts            # SSE subscription for push notifications (F13)
├── lib/
│   ├── daily-webrtc.ts                     # Daily.co REST API: create room, get token, delete room (F1)
│   ├── voice-session-manager.ts            # Session lifecycle: create, persist, resume, expire (F2)
│   └── voice-notifications.ts              # Notification dispatcher: create, send SSE, rate-limit (F14)
└── types/
    └── voice-agent.ts                      # TypeScript types for voice sessions, calls, notifications (F6)

supabase/migrations/
└── 060_voice_agent_system.sql              # voice_sessions, voice_calls, voice_notifications tables (F6)
                                            # NOTE: Verify no other developer has claimed 060 — migrations 050-055 have existing number collisions

# Voice Agent Server (Python) — MODIFIED FILES
voice_agent/server/tools/
└── realtor_tools.py                        # ADD 2 new tools: check_calendar, book_showing_with_calendar (F12, F15)
                                            # check_calendar → calls CRM API /api/calendar/events
                                            # book_showing_with_calendar → creates showing + calendar event
```

### 6b-ii. Existing Voice Agent API Routes (21 routes, already implemented)

| Category | Routes | Methods |
|---|---|---|
| activities | `/api/voice-agent/activities` | GET, POST |
| communications | `/api/voice-agent/communications` | GET, POST |
| contacts | `/api/voice-agent/contacts`, `/api/voice-agent/contacts/[id]` | GET, POST, PUT, DELETE |
| deals | `/api/voice-agent/deals`, `/api/voice-agent/deals/[id]` | GET, POST, PUT, DELETE |
| enrollments | `/api/voice-agent/enrollments` | GET, POST |
| feedback | `/api/voice-agent/feedback` | POST |
| households | `/api/voice-agent/households`, `/api/voice-agent/households/[id]` | GET, POST, PUT, DELETE |
| listings | `/api/voice-agent/listings`, `/api/voice-agent/listings/[id]` | GET, POST, PUT, DELETE |
| newsletters | `/api/voice-agent/newsletters` | GET, POST |
| offers | `/api/voice-agent/offers`, `/api/voice-agent/offers/[id]` | GET, POST, PUT, DELETE |
| relationships | `/api/voice-agent/relationships` | GET, POST |
| showings | `/api/voice-agent/showings`, `/api/voice-agent/showings/[id]` | GET, POST, PUT, DELETE |
| tasks | `/api/voice-agent/tasks`, `/api/voice-agent/tasks/[id]` | GET, POST, PUT, DELETE |
| workflows | `/api/voice-agent/workflows` | GET, POST |

All routes require `Authorization: Bearer ${VOICE_AGENT_API_KEY}` header.

### 6b-iii. Environment Variables (new + existing)

| Variable | Purpose | New/Existing |
|---|---|---|
| `DAILY_API_KEY` | Daily.co REST API auth for room management | New |
| `DAILY_DOMAIN` | Daily.co domain (e.g., `listingflow.daily.co`) | New |
| `VOICE_AGENT_API_KEY` | Bearer token for voice agent API routes | Existing |
| `NEXT_PUBLIC_VOICE_AGENT_URL` | Voice agent server URL (default: `http://127.0.0.1:8768`) | Existing |

### 6c. Database Schema

```sql
-- Migration: 060_voice_agent_system.sql
-- Voice Agent Complete System — sessions, calls, notifications
-- Depends on: contacts, listings, appointments tables

-- ============================================================================
-- Voice Sessions — Daily.co WebRTC room sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Agent & Identity
    agent_email TEXT NOT NULL,                       -- realtor email from NextAuth session
    mode TEXT NOT NULL DEFAULT 'realtor',            -- realtor, client, generic
    -- Daily.co Room
    daily_room_url TEXT,                             -- https://listingflow.daily.co/room-xxx
    daily_room_name TEXT,                            -- room-xxx identifier for API calls
    daily_session_token TEXT,                        -- JWT token for Daily.co room access
    -- Status
    status TEXT NOT NULL DEFAULT 'active'            -- active, idle, offline, expired
        CHECK (status IN ('active', 'idle', 'offline', 'expired')),
    -- Context
    focus_type TEXT,                                 -- contact, listing, showing, or NULL (general)
        CHECK (focus_type IN ('contact', 'listing', 'showing') OR focus_type IS NULL),
    focus_id UUID,                                  -- ID of focused entity (contact_id, listing_id, etc.)
    -- Privacy & Consent (PIPEDA/PIPA)
    recording_consent BOOLEAN DEFAULT FALSE,         -- TRUE after realtor acknowledges transcript notice
    -- Provider Tracking
    llm_provider TEXT DEFAULT 'anthropic',           -- anthropic, openai, groq, ollama
    stt_provider TEXT DEFAULT 'whisper_local',       -- whisper_local, openai_whisper
    tts_provider TEXT DEFAULT 'edge_tts',            -- edge_tts, openai_tts, elevenlabs, piper
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_sessions_agent ON voice_sessions(agent_email, status);
CREATE INDEX idx_voice_sessions_status ON voice_sessions(status, last_activity_at);
CREATE INDEX idx_voice_sessions_focus ON voice_sessions(focus_type, focus_id) WHERE focus_type IS NOT NULL;

ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_sessions_policy ON voice_sessions FOR ALL USING (true);
-- Single-tenant: allows all authenticated users. For multi-tenant, change to USING (agent_email = auth.jwt()->>'email')

-- ============================================================================
-- Voice Calls — logged voice interactions with transcripts
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Session Reference
    session_id UUID REFERENCES voice_sessions(id) ON DELETE SET NULL,
    -- Contact Context (optional — NULL for general queries)
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    -- Call Metadata
    direction TEXT NOT NULL DEFAULT 'outbound'       -- outbound (realtor initiated), inbound (client mode)
        CHECK (direction IN ('inbound', 'outbound')),
    duration_seconds INTEGER DEFAULT 0,              -- calculated from first audio to session end
    -- Content
    transcript TEXT,                                 -- full conversation transcript (plain text)
    summary TEXT,                                    -- AI-generated 1-2 sentence summary
    tool_calls_used JSONB DEFAULT '[]'::jsonb,       -- array of tool names invoked during session
    -- Cost Tracking
    llm_provider TEXT,                               -- which LLM handled this call
    total_input_tokens INTEGER DEFAULT 0,            -- total input tokens across all LLM calls
    total_output_tokens INTEGER DEFAULT 0,           -- total output tokens across all LLM calls
    cost_usd NUMERIC(10,6) DEFAULT 0,               -- estimated cost in USD
    -- Compliance
    compliance_flagged BOOLEAN DEFAULT FALSE,        -- TRUE if FINTRAC topics discussed
    compliance_notes TEXT,                           -- auto-generated compliance observations
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_calls_session ON voice_calls(session_id);
CREATE INDEX idx_voice_calls_contact ON voice_calls(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_voice_calls_listing ON voice_calls(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX idx_voice_calls_date ON voice_calls(started_at DESC);
CREATE INDEX idx_voice_calls_compliance ON voice_calls(compliance_flagged) WHERE compliance_flagged = TRUE;

ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_calls_policy ON voice_calls FOR ALL USING (true);
-- Single-tenant: allows all authenticated users. For multi-tenant, filter by session owner

-- ============================================================================
-- Voice Notifications — proactive CRM event alerts for voice agent
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Recipient
    agent_email TEXT NOT NULL,                       -- realtor email
    -- Notification Content
    notification_type TEXT NOT NULL                   -- incoming_lead, showing_update, compliance_alert,
        CHECK (notification_type IN (                --   listing_update, deal_update, calendar_reminder
            'incoming_lead', 'showing_update', 'compliance_alert',
            'listing_update', 'deal_update', 'calendar_reminder'
        )),
    title TEXT NOT NULL,                             -- short title for display: "New Hot Lead"
    body TEXT NOT NULL,                              -- spoken text: "Sarah Johnson just booked a showing..."
    payload JSONB DEFAULT '{}'::jsonb,               -- structured data: contact_id, listing_id, urgency, etc.
    -- Priority
    priority TEXT NOT NULL DEFAULT 'normal'          -- urgent (speak immediately), normal (queue), low (batch)
        CHECK (priority IN ('urgent', 'normal', 'low')),
    -- Delivery Status
    sent_at TIMESTAMPTZ,                            -- when pushed to SSE stream
    delivered_at TIMESTAMPTZ,                       -- when client acknowledged receipt
    read_at TIMESTAMPTZ,                            -- when agent heard/dismissed it
    spoken_at TIMESTAMPTZ,                          -- when voice agent spoke it aloud
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_notif_agent ON voice_notifications(agent_email, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_voice_notif_type ON voice_notifications(notification_type, created_at DESC);
CREATE INDEX idx_voice_notif_priority ON voice_notifications(priority, created_at) WHERE read_at IS NULL;

ALTER TABLE voice_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_notifications_policy ON voice_notifications FOR ALL USING (true);
-- Single-tenant: allows all authenticated users. For multi-tenant, change to USING (agent_email = auth.jwt()->>'email')
```

### 6d. Platform API Requirements

| Platform | API | Auth | Key Limits |
|---|---|---|---|
| **Daily.co** | REST API v1 (`api.daily.co/v1/`) | Bearer token (`DAILY_API_KEY`) | 200 rooms/domain, 50 concurrent participants/room, rooms auto-expire after 1 hour idle |
| **Daily.co JS SDK** | `@daily-co/daily-js` npm package | Room token (JWT, 1-hour expiry) | 1 audio track per participant, opus codec, sub-200ms latency |
| **Google Calendar** | Calendar API v3 (`googleapis.com/calendar/v3/`) | OAuth2 (existing `google_tokens` table) | 60 requests/user/min, 500k requests/day (project), 250 events/insert batch |
| **Faster-Whisper** | Local Python library (no API) | N/A (runs on voice_agent server) | ~5x realtime on CPU, ~20x on GPU, large-v3 model requires 3GB RAM |
| **Edge TTS** | Microsoft Speech Service (free tier) | No auth required (edge-tts package) | No documented rate limit, ~10 concurrent synth streams safe |
| **Anthropic Claude** | Messages API v1 | `x-api-key` header | 4,000 requests/min (Tier 4), 400K input tokens/min, 80K output tokens/min |

### 6e. AI Content Generation

Voice agent prompts already exist in `voice_agent/server/system_prompts.py`. The key addition is the **notification announcement prompt**:

```
System prompt for voice notification announcements:

You are the ListingFlow Voice Agent announcing a CRM notification to a BC realtor.

Rules:
- Speak naturally in 1-2 sentences maximum
- Use contractions (you've, there's, it's)
- Say prices as "800K" not "$800,000"
- Say times naturally: "3 this afternoon" not "15:00"
- Never use markdown, bullet points, or URLs
- Start with "Heads up" for urgent, skip preamble for normal
- Include the contact name and key detail (address, price, date)
- Do NOT reveal: phone numbers, email addresses, FINTRAC identity data, lockbox codes

Template:
{notification_type}: {title}
Details: {body}
Priority: {priority}

Speak this notification naturally to the realtor.
```

### 6f. Cron Jobs

| Cron | Schedule | Purpose |
|---|---|---|
| `/api/cron/voice-compliance-check` | Daily 8 AM Pacific | Check active listings for incomplete FINTRAC records and contacts for expiring CASL consent, create `voice_notifications` with type `compliance_alert` for each finding |
| `/api/cron/voice-session-cleanup` | Every 4 hours | Close stale voice sessions (no activity for 30+ minutes), update status to `expired`, delete Daily.co rooms via REST API |
| `/api/cron/voice-calendar-sync` | Every 15 minutes | Check for confirmed showings without `google_event_id`, create Google Calendar events, log failures for retry |

---

## 7. Launch Plan

### Phase 1: Voice Foundation (3 weeks — 2026-04-01 to 2026-04-21)
- Migration 060: voice_sessions, voice_calls, voice_notifications tables
- Daily.co REST API integration (create room, get token, delete room)
- `useWebRTC` hook with Daily.co JS SDK
- Upgraded `VoiceAgentWidget.tsx` with Daily.co audio pipeline
- Voice agent dashboard page at `/voice-agent`
- TypeScript types for all new tables
- Server actions for session CRUD

**Launch gate:** 3 internal testers completing 10+ voice sessions each with >90% successful connections, end-to-end latency under 3 seconds, zero data loss on session transcripts

### Phase 2: CRM Integration (2 weeks — 2026-04-22 to 2026-05-05)
- Click-to-voice buttons on contact and listing detail pages
- Call logging to `voice_calls` with transcripts
- Voice calls in CommunicationTimeline
- Voice agent status indicator in app header
- Session focus tracking (contact/listing context)

**Launch gate:** 5 voice sessions per tester per day for 5 consecutive days, call logs appearing correctly in contact timelines, focus context loading within 1 second

### Phase 3: Calendar & Notifications (2 weeks — 2026-05-06 to 2026-05-19)
- Google Calendar auto-sync for confirmed showings
- SSE notification stream endpoint
- Voice notification announcements for 6 event types
- Compliance check cron job
- Calendar voice commands (schedule today, check availability)
- Session cleanup cron job

**Launch gate:** 100% of confirmed showings create calendar events within 30 seconds, notifications delivered within 3 seconds of CRM event, compliance cron catching all known test cases (5 FINTRAC, 3 CASL)

### Phase 4: Intelligence & Polish (2 weeks — 2026-05-20 to 2026-06-02)
- Post-call workflows (auto-task, auto-communication log)
- FINTRAC compliance flagging during calls
- Voice preference learning (response length, greeting style)
- Client mode voice portal for listing pages
- Multi-language support (Mandarin, Cantonese, Punjabi, French)

**Launch gate:** Post-call tasks auto-created for >80% of contact-focused sessions, FINTRAC topics flagged with 0 false negatives (may accept false positives), 2+ beta realtors using voice daily for 2 weeks

---

## 8. Pricing Strategy

N/A — included in base ListingFlow CRM subscription.

**Cost structure per realtor (estimated):**
- Daily.co: ~$0.004/participant-minute = ~$1.20/day at 300 min/day
- Claude Sonnet: ~$0.015/voice query (avg 1K input + 500 output tokens) = ~$0.60/day at 40 queries
- Edge TTS: free (Microsoft Edge TTS package)
- Whisper: free (local faster-whisper, CPU cost only)
- **Total: ~$1.80/day per active realtor** = $54/month

Value proposition: Replaces HubSpot Calling ($50) + Follow Up Boss ($69) + Vapi.ai ($100 at 2000 min/mo) = **$219/mo saved** at $54/mo marginal cost.

---

## 9. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Daily.co service outage | Low | High | Fallback to Web Speech API (existing) — degrade gracefully, not fail completely. Monitor Daily.co status page. |
| Whisper accuracy on BC-specific terms | Medium | Medium | Fine-tune with custom vocabulary list (strata, FINTRAC, BCREA form codes). Pre-seed Whisper context with real estate term hints. |
| Audio latency >3s degrades experience | Medium | High | Use Daily.co's global edge network (Vancouver PoP exists). Stream TTS chunks incrementally, don't wait for full response. Cache common TTS phrases. |
| Google Calendar token expiry during sync | Medium | Low | Existing token refresh flow in `google-calendar.ts`. Retry with backoff. Calendar sync is non-blocking — showing still confirms without calendar event. |
| LLM cost overrun from long voice sessions | Medium | Medium | 30-minute auto-timeout. Cost tracking per session in `voice_calls`. Daily cost cap of $10/realtor — pause voice after cap. Alert realtor at 80% cap. |
| Browser microphone permission denied | Low | High | Clear permission prompt with explanation. Fallback to text chat. Persist permission via `navigator.permissions.query()`. Show setup guide on first use. |
| FINTRAC data leakage via voice transcripts | Low | Critical | Voice transcripts stored in Supabase (not voice_agent SQLite). Never send FINTRAC fields to AI. Compliance flagging checks for PII patterns in transcripts. 7-year retention policy. |
| Concurrent session conflicts (multiple tabs) | Medium | Low | Enforce single active session per `agent_email`. New tab shows "Voice active in another tab" with option to take over. |
| Multi-tenant RLS not implemented | Low | Medium | Voice sessions, calls, notifications use `USING (true)` — all authenticated users can see all records. Acceptable for single-tenant. For multi-tenant, add `agent_email = auth.jwt()->>'email'` filter. |
| PIPEDA/PIPA voice recording non-compliance | Low | Critical | Voice transcripts are personal information under PIPEDA. Consent notice on session start. Client mode requires explicit consent. Transcripts stored in Supabase with 7-year retention. |

---

## 9b. Downsides & Tradeoffs

| # | Question | Answer |
|---|---|---|
| 1 | **What do we lose or break for others?** | The existing Web Speech API path in `VoiceAgentWidget.tsx` becomes the fallback, not the primary. Realtors who relied on Web Speech API's instant-on behavior (no server dependency) now need the voice_agent server running. **Mitigation:** Keep Web Speech API as fallback — if Daily.co fails, widget auto-switches. No capability removed. |
| 2 | **What happens if we're wrong? Can we undo it?** | If Daily.co proves unreliable or too expensive, we've added a dependency on an external service. Voice sessions table, call logs, notifications — all new tables that become orphaned if we remove Daily.co. **Mitigation:** All new tables are independent (no FK to Daily.co). Can switch WebRTC provider (Twilio, LiveKit) by changing `daily-webrtc.ts` only. Migration is additive — rollback drops tables, no data loss in existing tables. |
| 3 | **What unverified assumptions does this embed?** | We assume Daily.co has a Vancouver edge node for sub-200ms latency. We assume Whisper large-v3 runs fast enough on the voice_agent server CPU for real-time transcription (~5x realtime). We assume Edge TTS handles concurrent streams without rate limiting. **Mitigation:** Test Daily.co latency from Vancouver before committing. Benchmark Whisper on actual server hardware. Load-test Edge TTS at 10 concurrent streams. |
| 4 | **What gets harder to debug, test, or maintain?** | Full-duplex audio pipeline spans 4 services (browser → Daily.co → voice_agent → CRM API). A latency spike could be in any hop. SSE notifications add another async channel to debug. **Mitigation:** Each hop has independent health checks. Voice agent `/api/health` reports provider latencies. SSE endpoint includes heartbeat every 30s. Session-level cost/latency tracking in `voice_calls`. |
| 5 | **What edge cases does this create?** | Safari WebRTC handling differs from Chrome (audio codec negotiation). Mobile browsers may not support Daily.co JS SDK fully. Poor network connections cause audio artifacts. **Mitigation:** Daily.co SDK handles cross-browser WebRTC abstraction. Test on Safari, Chrome, Firefox. Detect poor network via Daily.co `network-quality` event — switch to text mode if quality drops below threshold. |

---

## 10. Competitive Moat

What makes this different from HubSpot Calling + Follow Up Boss + Vapi.ai:

1. **CRM-Native Tool Calling** — 46+ tools that read/write CRM data (contacts, listings, showings, tasks, deals) directly during voice conversations, not just recording calls
2. **BC Real Estate Domain Intelligence** — Trained on BCREA forms, FINTRAC compliance, BC strata law, PTT calculations — no generic voice AI knows this domain
3. **Full Attribution Loop** — Voice interactions log to contact timeline alongside SMS, email, WhatsApp — unified communication history, not a siloed call log
4. **Compliance-First Architecture** — FINTRAC flagging during calls, PII never sent to AI prompts, 7-year transcript retention, CASL consent checks before outbound — built for Canadian regulation, not bolted on
5. **Multi-Provider Resilience** — Falls back through Claude → GPT-4o → Groq → Ollama if any LLM provider fails, plus Web Speech API fallback if Daily.co fails — no single point of failure
6. **Cost Transparency** — Per-session cost tracking visible to realtor (LLM tokens, TTS, STT) — no opaque per-minute billing like Vapi.ai
7. **Context Continuity** — Voice sessions carry CRM context (which contact, which listing, which workflow phase) — every answer is informed by the full transaction state, not starting from scratch
8. **Proactive Intelligence** — Push notifications announce hot leads, compliance deadlines, showing confirmations before the realtor asks — the agent initiates, not just responds

---

*PRD Version 1.1 — 2026-03-30 (5-pass iterative analysis: Pass 1 draft, Pass 2 best-in-market comparison, Pass 3 code verification, Pass 4 depth check, Pass 5 final review)*
*Based on research across 8+ real estate CRM platforms, Daily.co WebRTC docs, Google Calendar API v3, PIPEDA/PIPA compliance requirements, and deep analysis of existing voice_agent/ codebase*
*16 issues identified and resolved across passes 2-5: 1 Critical (PIPEDA consent), 4 High (WebRTC degradation, SSE reconnection, calendar tools, consent column), 7 Medium, 4 Low*
