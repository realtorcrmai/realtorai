<!-- docs-audit: voice_agent/**, src/app/api/voice-agent/* -->
# PRD: Multi-Tenant Voice Agent + External Assistant Integration — Tenant Isolation, Siri, Google/Gemini, Alexa & Cortana

> **Version:** 1.3 (5-pass iterative analysis)
> **Date:** 2026-03-30
> **Author:** RealtorAI Engineering
> **Status:** Draft
> **Based on:** Gap analysis of existing voice_agent/ codebase (4,100+ lines Python, 2,290+ lines TypeScript), PRD_Voice_Agent_Complete.md (v1.1), Apple AppIntents & SiriKit documentation, Google Actions Builder & Gemini Extensions API, Amazon Alexa Skills Kit v2, Microsoft Cortana Skills documentation, Supabase RLS multi-tenant patterns, PIPEDA/PIPA/CASL compliance requirements, and competitive analysis of 6 real estate voice platforms (kvCORE, Ylopo, Sierra Interactive, Lofty, Real Geeks, Follow Up Boss)

---

## 1. Problem Statement

### 1a. The Core Problem

RealtorAI's Voice Agent is a **single-tenant, browser-only system** that cannot scale to multiple brokerages or integrate with the voice assistants realtors already use daily. Today, the entire voice infrastructure — session management, conversation history, tool execution, cost tracking — is hardcoded to a single realtor (`REALTOR_ID=R001`), stored in a local SQLite file, and accessible only through a browser widget. There is no tenant isolation: if two brokerages deployed the same instance, **every agent would see every other agent's sessions, calls, transcripts, and client data**. The API authenticates with a single hardcoded Bearer token (`va-bridge-secret-key-2026`) embedded directly in client-side source code.

Meanwhile, **78% of BC realtors** use Siri or Google Assistant daily for hands-free tasks while driving between showings (NAR 2025 Technology Survey). They dictate texts, set reminders, and check calendars — but none of these interactions touch their CRM. The voice agent sits idle in a browser tab they may never open, while the assistant on their wrist or car dashboard handles their actual voice workflow. The `/api/quick` endpoint exists for Siri Shortcuts but requires manual configuration, has no tenant awareness, and uses a static token that would be shared across all users in a multi-tenant deployment.

### 1b. Why This Matters

- **Data breach risk:** Without tenant isolation, a single misconfigured RLS policy exposes all brokerages' client data, FINTRAC records, and deal details to every user in the system
- **Revenue blocker:** RealtorAI cannot onboard a second brokerage until tenant isolation exists — the current architecture is structurally single-tenant
- **Missed engagement:** Realtors spend **2.8 hours/day driving** (NAR 2025). Every minute without CRM voice access is a missed lead response, a forgotten follow-up, or a delayed showing confirmation
- **Competitive gap:** kvCORE ($499/mo) offers Alexa integration; Ylopo ($495/mo) has Google Home routines; Sierra Interactive ($500/mo) has Siri Shortcuts — all with multi-agent support. RealtorAI has none
- **Platform lock-in:** Building only for browser Web Speech API (~65% accuracy on real estate terms) ignores the **>92% accuracy** of platform-native STT (Siri, Google) that already understands "MLS", "strata", and "FINTRAC"

### 1c. What Exists Today

| Tool (Price) | What It Does | Why It Fails for Multi-Tenant + Assistants |
|---|---|---|
| RealtorAI Voice Widget (included) | Browser-based voice agent with 63 CRM tools, Web Speech API STT, Edge TTS | Single-tenant, hardcoded REALTOR_ID, no external assistant integration, SQLite local DB |
| `/api/quick` endpoint (included) | One-shot HTTP POST for Siri Shortcuts | No tenant_id, static Bearer token, no OAuth2, manual Shortcut setup per user |
| `ask-realtor.sh` (included) | macOS shell script using AppleScript dictation | Desktop-only, no mobile, no tenant awareness, hardcoded token |
| kvCORE ($499/mo) | Alexa skill for lead alerts + showing schedule | No CRM tool execution, read-only, no multi-turn conversation |
| Ylopo ($495/mo) | Google Home routines for lead notifications | Notification-only, no voice commands, no tool calling |
| Sierra Interactive ($500/mo) | Siri Shortcuts for quick CRM queries | Pre-built shortcuts, but no session persistence, no context |

**Total cost to replicate basic voice assistant integration across platforms: $500-1,500/mo per brokerage.** No competitor combines multi-tenant isolation + multi-platform assistant integration + 63 CRM tools + session persistence + compliance tracking in a single product.

---

## 2. Vision

### 2a. One Sentence

RealtorAI Voice Agent becomes a **multi-tenant, multi-platform voice interface** where any realtor at any brokerage can manage their entire CRM — contacts, listings, showings, deals, compliance — through Siri, Google Assistant, Alexa, Cortana, or the browser widget, with complete tenant data isolation and per-tenant billing.

### 2b. The 30-Second Pitch

Sarah's driving to a showing in Surrey. She says "Hey Siri, ask RealtorAI — any new leads today?" Siri calls the RealtorAI API with Sarah's tenant-scoped OAuth token, the voice agent checks her brokerage's contacts table (isolated by RLS from every other brokerage), and responds: "You have 2 new leads — Jennifer Chen interested in East Vancouver condos under $800K, and Marcus Williams looking for a Surrey townhouse. Want me to schedule follow-ups?" Sarah says yes, and two tasks appear in her CRM before she parks. Meanwhile, her broker — on a different tenant — asks Alexa the same question and gets only their own leads. Zero data leakage. Zero manual setup. Works on every platform they already use.

### 2c. Success Metrics

| Metric | Target | Current Baseline |
|---|---|---|
| Tenant data isolation | 100% (zero cross-tenant data access) | 0% (no tenant_id exists) |
| Voice sessions per realtor per day | 5+ across all platforms | 0 (browser-only, rarely used) |
| External assistant adoption (30 days) | >40% of active realtors configure at least 1 assistant | 0% |
| Siri Shortcut setup time | <2 minutes (pre-built, auto-configured) | 15+ minutes (manual) |
| Google Action invocation success rate | >95% | N/A |
| Alexa skill certification | Passed on first submission | N/A |
| API authentication security | OAuth2 + PKCE, per-tenant keys, token rotation | Single hardcoded Bearer token |
| Cross-platform session continuity | Resume conversation within 24h on any platform | Browser-only, 30-min expiry |
| Voice interaction latency (assistant → response) | <3 seconds end-to-end | ~5 seconds (browser only) |
| Python server DB migration | 100% Supabase (zero SQLite dependency) | 100% SQLite |
| Multi-tenant onboarding time | <1 hour per new brokerage | N/A (single-tenant only) |
| PIPEDA/PIPA compliance per tenant | 100% audit trail isolation | 0% (shared logs) |

---

## 3. Target Users

### Primary: Sarah (Solo Realtor, 8 years experience)

- **Demographics:** 36, licensed 8 years, 25-35 active clients, $145K annual income, iPhone 15 Pro + Apple Watch + MacBook Air
- **Tech comfort:** Uses Siri daily for texts/reminders/navigation. Google Calendar for scheduling. Canva for social media. Comfortable with apps but won't configure anything that takes more than 5 minutes.
- **Pain:** Drives 2-3 hours daily between showings. Misses 2-3 lead inquiries per week because she can't check CRM while driving. Uses Siri for everything else — texts, calls, navigation — but her CRM is trapped in a browser tab. Has tried the browser voice widget once but forgot about it. Would use voice CRM if it worked through Siri like her other tools.
- **Goal:** "I want to say 'Hey Siri, any new leads?' and get an answer without pulling over to check my phone."
- **Budget:** Already paying for RealtorAI. Expects voice features included. Would pay $20-30/mo extra for premium voice if it saves her 30+ minutes/day.

### Secondary: David (Brokerage Owner, 3 teams, 12 agents)

- **Demographics:** 52, licensed 22 years, manages 12 agents across 3 teams, $320K annual income, Android (Samsung Galaxy S24) + Google Home + Windows laptop
- **Tech comfort:** Uses Google Assistant and Alexa at home. Relies on team leads for tech setup. Needs admin dashboard, not configuration. Primary concern is data isolation between his brokerage and others on the platform.
- **Pain:** Worries about client data leaking between brokerages if RealtorAI goes multi-tenant. Needs per-agent voice usage tracking for billing. Wants to hear "David, you have 3 deals closing this week" from his Alexa every morning without touching a screen. Currently has no visibility into which agents are using voice features.
- **Goal:** "I need to know my brokerage's data is completely separate from everyone else's, and I want my morning briefing from Alexa without any setup."
- **Budget:** $50-100/mo per brokerage for enterprise voice features with admin controls.

### Tertiary: Priya (New Agent, 1 year experience, tech-native)

- **Demographics:** 27, licensed 1 year, 8 active clients, $65K annual income, iPhone 16 + HomePod Mini + iPad
- **Tech comfort:** Power user — uses Shortcuts extensively, has custom automations, comfortable with OAuth flows and API configuration. Uses all Apple ecosystem features. Would configure Alexa if her open house clients could use it.
- **Pain:** Wants to build custom voice workflows — "When I confirm a showing, automatically text the buyer agent the lockbox code AND add it to my calendar AND log the communication." Current voice widget can't chain actions. Wants client-facing voice on listing pages so buyers can ask "What's the square footage?" without calling her.
- **Goal:** "I want voice to be the primary interface for my CRM, not just a feature. And I want my clients to use it too."
- **Budget:** Included in subscription. Would contribute feedback and beta testing for early access.

---

## 4. High-Level Feature List

### Phase 1 — Multi-Tenant Foundation (F0-F6)

| Feature | Description | Priority |
|---|---|---|
| **F0: Tenants Table & RBAC** | Create `tenants` table (if not exists) with `id`, `name`, `plan`, `status`, `billing_email`, `voice_rate_limit_per_minute`, `voice_rate_limit_per_hour`. Create `tenant_memberships` table with roles (owner/admin/agent). Tenant lifecycle: active → suspended → cancelled. Data export endpoint for PIPEDA compliance | P0 |
| **F1: Tenant ID Column Migration** | Add `tenant_id` to all voice tables (`voice_sessions`, `voice_calls`, `voice_notifications`) + `source` column for cross-platform tracking + update RLS policies to filter by tenant. Backfill existing rows with auto-created default tenant before adding NOT NULL constraint | P0 |
| **F2: Per-Tenant API Key Management** | Generate, rotate, and revoke API keys per tenant. Replace hardcoded Bearer token. Store in `tenant_api_keys` table with scoped permissions | P0 |
| **F3: OAuth2 + PKCE Authentication** | OAuth2 authorization code flow with PKCE + `state` parameter (CSRF protection) for external assistants. Token endpoint returns tenant-scoped JWT with `tenant_id`, `agent_email`, `permissions`, `aud` (platform) claims. Audience validation enforced — token for Alexa rejected on Google webhook. Refresh tokens cannot escalate scopes. Confidential clients must authenticate with client_secret | P0 |
| **F4: Python Server → Supabase Migration** | Replace all SQLite queries in `database.py` with Supabase REST API calls. Tenant context extracted from JWT on every request. Remove SQLite dependency entirely | P0 |
| **F5: Tenant-Scoped Session Management** | Session IDs namespaced by tenant (`tenant:session_id`). Cross-tenant session access blocked at DB level. Per-tenant rate limits (configurable) | P0 |
| **F6: OpenAPI 3.1 Specification** | Full OpenAPI spec for all 26 voice agent endpoints with error response schemas (400/401/403/404/429/500), pagination strategy (cursor-based), and webhook retry policies. Required for Google Actions, Alexa Skills, Gemini Extensions, and any future platform integration | P0 |

### Phase 2 — Apple Ecosystem (F7-F11)

| Feature | Description | Priority |
|---|---|---|
| **F7: Pre-Built Siri Shortcuts** | Auto-generated `.shortcut` files per tenant with baked-in OAuth token. Downloadable from CRM settings page. Covers: check leads, schedule showing, get pipeline summary, log note | P0 |
| **F8: PWA Manifest + Apple Meta Tags** | `manifest.json` with `shortcuts`, `share_target`, `protocol_handlers`. Apple meta tags for home screen installation. `realtorai://` URL scheme | P0 |
| **F9: App Intents Framework (Web-Based)** | Siri App Shortcuts via web-based intents (no native iOS app required). Register CRM actions as Siri suggestions. Proactive Siri suggestions based on usage patterns | P1 |
| **F10: Apple Watch Complication** | Siri Shortcut-powered watch complication showing: active leads count, next showing time, pipeline value. Tap to invoke voice agent | P2 |
| **F11: Handoff Support** | Start voice query on iPhone → continue on Mac browser widget. Session state preserved via Supabase. Uses Apple Handoff protocol for PWA | P2 |

### Phase 3 — Google & Amazon Ecosystem (F12-F17)

| Feature | Description | Priority |
|---|---|---|
| **F12: Google Actions / Conversational Actions** | Google Assistant Action registered via Actions Console. Webhook fulfillment to `/api/voice-agent/google-webhook`. OAuth2 account linking for tenant resolution | P0 |
| **F13: Gemini Extensions** | OpenAPI-powered Gemini Extension allowing Gemini to call RealtorAI API directly. Tenant-scoped via OAuth. Supports multi-turn conversation with tool calling | P0 |
| **F14: Alexa Custom Skill** | Alexa skill with intent handlers for: check leads, schedule showing, get pipeline, log note, get listing details. OAuth2 account linking. Skill certification-ready | P0 |
| **F15: Google Home Routines** | Pre-configured routines: morning briefing (leads + schedule + pipeline), showing prep (listing details + directions), end-of-day summary (activities logged) | P1 |
| **F16: Alexa Proactive Events** | Push notifications to Alexa: new lead alert, showing confirmation, deal stage change, compliance reminder. Uses Alexa Proactive Events API | P1 |
| **F17: Android App Links** | `assetlinks.json` for deep linking from Google Assistant to RealtorAI PWA. Verified domain ownership | P1 |

### Phase 4 — Microsoft, Polish & Intelligence (F18-F24)

| Feature | Description | Priority |
|---|---|---|
| **F18: Cortana Skill (Windows/Teams)** | Cortana skill for Windows + Microsoft Teams. Webhook fulfillment. OAuth2 via Azure AD. Covers same intents as Alexa | P1 |
| **F19: Microsoft Teams Bot** | Teams bot for voice commands within Teams calls. Uses Bot Framework SDK. Tenant resolution via Azure AD tenant ID mapping | P1 |
| **F20: Cross-Platform Session Continuity** | Start on Siri → continue on Alexa → finish in browser. Single conversation thread across all platforms. 24-hour session window | P1 |
| **F21: Per-Tenant Voice Analytics Dashboard** | Admin dashboard showing: sessions by platform, tool usage heatmap, cost per agent, latency percentiles, error rates. Filterable by tenant/agent/platform | P1 |
| **F22: Per-Tenant LLM Provider Config** | Each tenant can choose their LLM provider (Anthropic/OpenAI/Groq) and bring their own API key. Fallback chain configurable per tenant | P2 |
| **F23: Tenant Onboarding Wizard** | Step-by-step setup: create tenant → configure API keys → download Siri Shortcuts → link Google/Alexa accounts → test voice command → go live | P1 |
| **F24: Service Worker + Web Push** | Service worker for offline TTS caching, background sync, and browser push notifications. Push API for voice transcript delivery when browser is closed | P2 |

---

## 5. Detailed User Stories & Acceptance Criteria

### Epic 1: Multi-Tenant Data Isolation (F1, F2, F5)

**US-1.1: Tenant-Scoped Voice Sessions**
> As a brokerage owner, when my agents use the voice agent, I want all sessions isolated to my tenant, so no other brokerage can see my agents' conversations, transcripts, or CRM interactions.

**Acceptance Criteria:**
- [ ] Migration `061_multi_tenant_voice.sql` adds `tenant_id UUID NOT NULL REFERENCES tenants(id)` to `voice_sessions`, `voice_calls`, `voice_notifications`
- [ ] RLS policies updated: `CREATE POLICY tenant_isolation ON voice_sessions FOR ALL USING (tenant_id = (current_setting('app.tenant_id'))::uuid)`
- [ ] Same RLS pattern applied to `voice_calls` and `voice_notifications`
- [ ] Supabase admin client sets `app.tenant_id` via `SET LOCAL` before every query in voice-session-manager.ts
- [ ] Attempting to query `voice_sessions` without `app.tenant_id` set returns zero rows (not an error — fail-closed)
- [ ] Cross-tenant session access test: Agent A (tenant 1) cannot load session belonging to Agent B (tenant 2) — returns 404
- [ ] `voice_calls` FK to `voice_sessions` ensures calls inherit tenant isolation through the session
- [ ] All 26 existing API routes under `/api/voice-agent/` extract `tenant_id` from JWT and pass to Supabase
- [ ] Existing indexes updated to include `tenant_id` as leading column for query performance
- [ ] Rollback migration at `supabase/rollbacks/061_rollback.sql` removes tenant_id columns and restores original RLS

**US-1.2: Per-Tenant API Key Management**
> As a brokerage admin, when I onboard my team, I want to generate API keys scoped to my tenant, so my agents can authenticate without sharing a global secret.

**Acceptance Criteria:**
- [ ] New table `tenant_api_keys` with columns: `id`, `tenant_id`, `key_hash` (bcrypt), `key_prefix` (first 8 chars for display), `name`, `permissions` (JSONB), `last_used_at`, `expires_at`, `revoked_at`, `created_by`, `created_at`
- [ ] `POST /api/voice-agent/keys` creates new key, returns plaintext key ONCE (never stored), stores bcrypt hash
- [ ] `GET /api/voice-agent/keys` lists keys for current tenant (shows prefix, name, last_used, never shows full key)
- [ ] `DELETE /api/voice-agent/keys/:id` revokes key (sets `revoked_at`, does not delete row for audit)
- [ ] Key validation: hash incoming Bearer token against all non-expired, non-revoked keys for the tenant
- [ ] Rate limit per key: configurable, default 60 requests/minute
- [ ] Key rotation: creating a new key does not invalidate existing keys (grace period support)
- [ ] Hardcoded `va-bridge-secret-key-2026` removed from `VoiceAgentWidget.tsx` — replaced with per-session token from OAuth flow
- [ ] Audit log: every key creation, revocation, and failed auth attempt logged to `tenant_audit_log`

**US-1.3: Tenant-Scoped Rate Limiting**
> As a platform operator, when a single tenant's agents flood the voice API, I want per-tenant rate limits, so other tenants are not affected.

**Acceptance Criteria:**
- [ ] Rate limits configurable per tenant in `tenants` table: `voice_rate_limit_per_minute` (default 120), `voice_rate_limit_per_hour` (default 3000)
- [ ] Rate limiting applied at API route level using sliding window counter in Redis or Supabase
- [ ] Rate limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] 429 response with `Retry-After` header when limit exceeded
- [ ] Per-agent sub-limits within tenant: default 30 req/min per agent (prevents single agent consuming entire tenant quota)
- [ ] Rate limit bypass for webhook endpoints (Daily.co, platform callbacks)

### Epic 2: OAuth2 Authentication (F3)

**US-2.1: OAuth2 + PKCE Flow for External Assistants**
> As a realtor, when I link my Google Assistant to RealtorAI, I want a secure OAuth2 flow, so my CRM data is protected and my tenant is correctly identified.

**Acceptance Criteria:**
- [ ] OAuth2 authorization server at `/api/oauth/authorize` and `/api/oauth/token`
- [ ] Supports Authorization Code flow with PKCE (required by Google Actions, Alexa, Cortana)
- [ ] Authorization endpoint renders consent screen showing: tenant name, requested permissions, data access scope
- [ ] Token endpoint returns: `access_token` (1-hour expiry), `refresh_token` (30-day expiry), `token_type: "Bearer"`, `scope`, `expires_in`
- [ ] JWT claims include: `sub` (agent_email), `tenant_id`, `iss` (realtorai), `aud` (platform name), `permissions` (array), `iat`, `exp`
- [ ] Refresh token rotation: each refresh invalidates the previous token (prevents replay)
- [ ] PKCE: `code_verifier` and `code_challenge` (S256 method) validated on token exchange
- [ ] Consent screen is a server-rendered Next.js page at `/api/oauth/authorize` (not a SPA component)
- [ ] Consent screen UI elements: RealtorAI logo, tenant name, platform icon (Siri/Google/Alexa/Cortana), bulleted permission list in plain English ("View your contacts and leads", "Schedule and manage showings", "Access your deal pipeline"), PIPEDA notice text, "Allow" button (`lf-btn`), "Deny" button (`lf-btn-ghost`)
- [ ] On deny: redirect to `redirect_uri` with `?error=access_denied&state={state}`
- [ ] On allow: redirect to `redirect_uri` with `?code={code}&state={state}`
- [ ] If user is not logged in: redirect to `/login` with `?return_to=/api/oauth/authorize?{original_params}`
- [ ] Consent screen shows PIPEDA/PIPA notice: "Your voice interactions will be processed by AI. Transcripts are stored for 90 days."
- [ ] Token revocation endpoint: `POST /api/oauth/revoke` invalidates all tokens for a given client
- [ ] Client registration table: `oauth_clients` with `client_id`, `client_secret_hash`, `redirect_uris`, `platform` (siri/google/alexa/cortana), `tenant_id`

### Epic 3: Python Server Migration (F4)

**US-3.1: SQLite → Supabase Migration**
> As a platform engineer, when the voice server handles requests from multiple tenants, I want all data in Supabase, so tenant isolation is enforced by RLS and there's a single source of truth.

**Acceptance Criteria:**
- [ ] All 15 functions in `database.py` rewritten to use Supabase REST API (`httpx` async client)
- [ ] `find_buyer()`, `create_buyer()`, `find_listing()`, `search_properties()` → query Supabase `contacts` and `listings` tables (not local SQLite copies)
- [ ] `log_conversation()`, `get_conversation_history()` → write to Supabase `voice_conversation_logs` table (new, tenant-scoped)
- [ ] `save_session()`, `load_session()` → use Supabase `voice_sessions` table (existing, now with tenant_id)
- [ ] `track_preference()`, `get_preferences()` → use Supabase `voice_preferences` table (new, tenant-scoped)
- [ ] `save_note()`, `get_notes()`, `save_reminder()`, `get_reminders()` → use Supabase `voice_notes` and `voice_reminders` tables (new, tenant-scoped)
- [ ] Every Supabase request includes `Authorization: Bearer {service_role_key}` + `x-tenant-id` header
- [ ] Supabase admin client sets `app.tenant_id` before each query via RPC
- [ ] SQLite database file (`server/data/voice_agent.db`) deleted from repo
- [ ] `schema.sql` archived to `server/data/schema.sql.deprecated`
- [ ] Connection pooling: reuse `httpx.AsyncClient` across requests (don't create per-request)
- [ ] Latency budget: Supabase queries must complete in <100ms p95 (add monitoring)
- [ ] Fallback: if Supabase is unreachable, return 503 with `Retry-After: 5` (no silent fallback to SQLite)

### Epic 4: Apple Ecosystem Integration (F7, F8, F9)

**US-4.1: Pre-Built Siri Shortcuts**
> As a realtor using iPhone, when I open my RealtorAI settings, I want to download ready-made Siri Shortcuts, so I can say "Hey Siri, check my leads" within 2 minutes of setup.

**Acceptance Criteria:**
- [ ] Settings page at `/settings/voice-assistants` with "Apple Siri" section
- [ ] "Download Shortcuts" button generates `.shortcut` file (Apple Shortcuts format) with tenant OAuth token pre-baked
- [ ] 5 pre-built shortcuts with Siri invocation phrases:
      - "Check My Leads" → "Hey Siri, check my RealtorAI leads" (`WFWorkflowName: "Check My Leads"`, `SpokenPhrase: "check my RealtorAI leads"`)
      - "Schedule a Showing" → "Hey Siri, schedule a RealtorAI showing"
      - "Pipeline Summary" → "Hey Siri, RealtorAI pipeline"
      - "Log a Note" → "Hey Siri, RealtorAI note"
      - "Today's Schedule" → "Hey Siri, my RealtorAI schedule"
- [ ] Each shortcut: Dictate Text → HTTP POST to `/api/voice-agent/quick` with OAuth Bearer token → Speak response
- [ ] Each `.shortcut` file sets `WFWorkflowName`, `SpokenPhrase`, and `WFWorkflowIcon` metadata
- [ ] Shortcut file includes `x-callback-url` to open RealtorAI PWA at relevant page after response
- [ ] Setup time: <2 minutes from download to first successful voice command (timed during beta)
- [ ] OAuth token in shortcut auto-refreshes (refresh token stored in Shortcuts keychain)
- [ ] Shortcut gallery page at `/shortcuts` (public, no auth) showing all available shortcuts with "Add to Siri" buttons
- [ ] Analytics: track shortcut downloads and invocations per tenant via `voice_calls.source = 'siri'`

**US-4.2: PWA Installation & Deep Linking**
> As a realtor, when I add RealtorAI to my home screen, I want it to behave like a native app with voice activation and deep links from Siri.

**Acceptance Criteria:**
- [ ] `public/manifest.json` with: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#4f35d2"`, `background_color: "#f4f2ff"`
- [ ] `shortcuts` array in manifest: 4 shortcuts (New Lead, Showings, Pipeline, Voice Agent) with icons
- [ ] `share_target` in manifest: receive shared text/URLs from other apps → create note in CRM
- [ ] `protocol_handlers`: `realtorai://` scheme registered for deep links
- [ ] Apple meta tags in `layout.tsx`: `apple-mobile-web-app-capable: yes`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title: RealtorAI`, `apple-touch-icon` (180x180)
- [ ] `/.well-known/apple-app-site-association` file for universal links (future native app)
- [ ] Deep link routes: `realtorai://contacts/:id`, `realtorai://listings/:id`, `realtorai://voice?q=...`
- [ ] PWA install prompt shown after 3rd visit (not on first visit)

### Epic 5: Google & Amazon Integration (F12, F13, F14)

**US-5.1: Google Assistant Action**
> As a realtor using Android, when I say "Hey Google, ask RealtorAI for my pipeline", I want the Google Assistant to return my deal pipeline from my tenant's data.

**Acceptance Criteria:**
- [ ] Google Actions project registered in Actions Console with invocation name "RealtorAI"
- [ ] Webhook fulfillment endpoint at `/api/voice-agent/google-webhook` — validates Google signature, extracts tenant from OAuth token
- [ ] 6 intents with sample utterances (10+ per intent for certification):
      - `CheckLeads`: "check my leads", "any new leads", "who contacted me today", "new inquiries", "do I have leads", "show me recent leads", "lead update", "new contacts today", "any prospects", "incoming leads"
      - `ScheduleShowing`: "schedule a showing", "book a showing for [address]", "set up a viewing", "arrange a tour at [address]", "showing for [time]"
      - `GetPipeline`: "what's my pipeline", "pipeline summary", "how are my deals", "active deals", "deal status", "my transactions"
      - `LogNote`: "log a note", "add a note for [contact]", "make a note", "record that [text]", "note about [topic]"
      - `GetSchedule`: "what's my schedule", "today's showings", "what do I have today", "my appointments", "calendar for today"
      - `GetListingDetails`: "tell me about [address]", "listing details for [MLS]", "what's the price of [address]", "info on [address]"
- [ ] Each intent maps to existing Python voice agent tools (no new tool logic needed)
- [ ] OAuth2 account linking configured with PKCE flow to `/api/oauth/authorize`
- [ ] Multi-turn conversation: Google maintains session_id across turns within a single invocation
- [ ] Response format: SSML for rich speech output (pauses, emphasis on prices/addresses)
- [ ] Fallback intent: "I'm not sure what you mean. You can ask me about leads, showings, pipeline, or listings."
- [ ] Action tested on Google Home, Google Nest Hub, and Android phone
- [ ] Published to Google Actions directory (or internal testing channel)

**US-5.2: Gemini Extensions**
> As a realtor using Gemini, when I ask "What are my active listings?", I want Gemini to call the RealtorAI API and return my data.

**Acceptance Criteria:**
- [ ] OpenAPI 3.1 spec at `/api/voice-agent/openapi.json` — auto-generated from route definitions
- [ ] Gemini Extension registered with OpenAPI spec URL
- [ ] OAuth2 authentication: Gemini prompts user to link RealtorAI account on first use
- [ ] Gemini can invoke any of the 26 voice agent API routes through the OpenAPI spec
- [ ] Tool calling: Gemini sends structured requests, receives JSON, synthesizes natural language response
- [ ] Tenant isolation: OAuth token carries tenant_id, Supabase RLS enforces isolation
- [ ] Rate limiting: Gemini requests count against tenant's voice rate limit
- [ ] Tested with Gemini Advanced (1M context) for complex multi-step queries

**US-5.3: Alexa Custom Skill**
> As a brokerage owner with an Echo in my office, when I say "Alexa, ask RealtorAI for today's briefing", I want a morning summary of my brokerage's activity.

**Acceptance Criteria:**
- [ ] Alexa skill registered in Alexa Developer Console with invocation name "RealtorAI"
- [ ] Skill endpoint at `/api/voice-agent/alexa-webhook` — validates Alexa request signature
- [ ] 6 intent handlers matching Google intents: `CheckLeadsIntent`, `ScheduleShowingIntent`, `GetPipelineIntent`, `LogNoteIntent`, `GetScheduleIntent`, `GetListingDetailsIntent`
- [ ] `MorningBriefingIntent` — aggregates: new leads (24h), today's showings, pipeline changes, compliance reminders
- [ ] OAuth2 account linking via Alexa app (same `/api/oauth/authorize` endpoint)
- [ ] Session persistence: `sessionAttributes` carry `session_id` for multi-turn within single invocation
- [ ] SSML responses with Alexa-specific tags (`<amazon:emotion>`, `<break>`)
- [ ] Skill passes Alexa certification requirements: privacy policy URL, terms of use, sample utterances (50+)
- [ ] Tested on Echo Dot, Echo Show, Fire TV
- [ ] Published to Alexa Skills Store (or internal distribution for beta)

### Epic 6: Microsoft Ecosystem (F18, F19)

**US-6.1: Cortana Skill**
> As a realtor using Windows, when I say "Hey Cortana, ask RealtorAI for my schedule", I want my showing schedule from my CRM.

**Acceptance Criteria:**
- [ ] Cortana skill registered via Azure Bot Service
- [ ] Webhook at `/api/voice-agent/cortana-webhook` — validates Azure AD JWT
- [ ] Same 6 core intents as Google/Alexa (shared intent definitions, platform-specific response formatting)
- [ ] OAuth2 via Azure AD B2C — maps Azure AD tenant to RealtorAI tenant_id
- [ ] Response format: Cortana adaptive cards for visual display on Windows devices
- [ ] Tested on Windows 11 and Microsoft Teams desktop

**US-6.2: Microsoft Teams Bot**
> As a brokerage admin, when my team is on a Teams call, I want them to invoke RealtorAI voice commands within Teams.

**Acceptance Criteria:**
- [ ] Teams bot registered via Bot Framework
- [ ] Bot responds to `@RealtorAI` mentions in Teams channels
- [ ] Voice commands work during Teams calls via Cortana in Teams
- [ ] OAuth2 maps Teams user to RealtorAI agent_email + tenant_id
- [ ] Adaptive card responses with action buttons (e.g., "View Contact" opens RealtorAI in browser)

### Epic 7: Cross-Platform Intelligence (F20, F21, F22)

**US-7.1: Cross-Platform Session Continuity**
> As a realtor, when I start a conversation on Siri in my car and continue on Alexa at home, I want the context preserved.

**Acceptance Criteria:**
- [ ] All platforms write to same `voice_sessions` table with `source` column (siri/google/alexa/cortana/browser)
- [ ] Session lookup by `agent_email + tenant_id + status = 'active'` — returns most recent regardless of source
- [ ] Last 5 messages injected as context when resuming on different platform
- [ ] Session expires after 24 hours of inactivity (not 30 minutes)
- [ ] Platform switch logged in `voice_calls` with `source` change noted
- [ ] Test scenario: Siri → browser → Alexa → Google, all maintaining conversation thread

**US-7.2: Per-Tenant Analytics Dashboard**
> As a brokerage owner, when I open the admin panel, I want to see voice usage across my team by platform.

**Acceptance Criteria:**
- [ ] Dashboard at `/admin/voice-analytics` (tenant-admin only)
- [ ] Metrics: sessions by platform (pie chart), daily active voice users (line chart), tool usage heatmap, avg latency by platform, cost per agent
- [ ] Filter by: date range, agent, platform, intent type
- [ ] Export CSV for billing reconciliation
- [ ] Real-time: auto-refreshes every 60 seconds
- [ ] Data source: aggregate queries on `voice_sessions`, `voice_calls` filtered by `tenant_id`

### Epic 8: Tenant Lifecycle & Error Scenarios (F0, F1)

**US-8.1: Tenant Offboarding & Data Export**
> As a brokerage owner cancelling RealtorAI, I want to export all my voice data and have it deleted within 30 days, so I comply with PIPEDA data portability requirements.

**Acceptance Criteria:**
- [ ] `POST /api/admin/tenant/export` generates ZIP with: voice_sessions, voice_calls (transcripts), voice_conversation_logs, voice_preferences, voice_notes, voice_reminders, tenant_audit_log — all as JSON files
- [ ] Export excludes FINTRAC records within mandatory retention window (5 years from transaction close)
- [ ] Tenant status set to `cancelled` — all API requests return 403 "Tenant cancelled"
- [ ] 30-day grace period: tenant can reactivate by contacting support. After 30 days, hard-delete all tenant data via `DELETE FROM ... WHERE tenant_id = ?` cascade
- [ ] OAuth tokens for all platforms revoked immediately on cancellation
- [ ] All active voice sessions terminated, Daily.co rooms deleted
- [ ] Audit log entry: `tenant_cancelled` with timestamp and actor

**US-8.2: Agent Leaves Brokerage**
> As a brokerage admin, when an agent leaves my team, I want to revoke their voice access and retain their conversation history for compliance.

**Acceptance Criteria:**
- [ ] `DELETE /api/admin/tenant/members/:agent_email` removes agent from `tenant_memberships`
- [ ] All agent's active voice sessions terminated immediately
- [ ] All agent's OAuth tokens across all platforms revoked (Siri Shortcuts stop working)
- [ ] Agent's Siri Shortcuts return 401 on next invocation with message "Your access has been revoked. Contact your brokerage."
- [ ] Voice conversation history and call transcripts RETAINED under tenant ownership (not deleted with agent)
- [ ] Agent cannot re-join without new invitation from tenant admin
- [ ] If agent belongs to multiple tenants: only the specific tenant membership is removed, other tenants unaffected

**US-8.3: Network Failure Mid-Voice Command**
> As a realtor, when my internet drops during a voice command on Alexa, I want a graceful error and the ability to retry.

**Acceptance Criteria:**
- [ ] If Python server unreachable: Next.js returns platform-specific error within 5 seconds (not timeout)
- [ ] Alexa: "I'm having trouble reaching RealtorAI right now. Please try again in a moment."
- [ ] Google: Same message via `firstSimple.speech`
- [ ] Siri: Shortcut shows "Connection failed" alert with "Retry" button
- [ ] Partial execution handling: if tool was called but response never reached assistant, `voice_calls` logs the attempt with `status = 'partial'`
- [ ] No duplicate execution: idempotency key in request prevents re-running the same tool call on retry
- [ ] Browser widget: shows "Reconnecting..." banner, auto-retries SSE connection with exponential backoff

**US-8.4: User Data Deletion (Right to Be Forgotten)**
> As a realtor, when I request deletion of my personal data, I want all my voice transcripts, preferences, and OAuth tokens deleted within 30 days.

**Acceptance Criteria:**
- [ ] `POST /api/settings/delete-my-data` initiates data deletion request
- [ ] Confirmation email sent to agent's email with 7-day cooling-off period
- [ ] After confirmation: delete voice_calls (transcripts), voice_conversation_logs, voice_preferences, voice_notes, voice_reminders for that agent_email
- [ ] OAuth tokens and consent records deleted
- [ ] voice_sessions marked as `deleted_by_user` (retain session metadata for billing, remove PII)
- [ ] FINTRAC records exempted from deletion (legal retention requirement)
- [ ] Audit log entry: `data_deletion_completed` with list of affected tables and row counts

**US-8.5: LLM Response Verification**
> As a realtor, when the voice agent tells me a listing price or showing time, I want the information verified against the database, so I don't act on hallucinated data.

**Acceptance Criteria:**
- [ ] All tool results returned by Python server include `source: "database"` or `source: "ai_generated"` tag
- [ ] Voice responses that cite specific numbers (prices, dates, counts) must originate from a tool call result, not free-form LLM generation
- [ ] If LLM generates a response without a supporting tool call for factual claims, prefix with "Based on my understanding..." (hedging language)
- [ ] System prompt includes: "Never invent listing prices, showing times, contact details, or deal amounts. Always use tool results."
- [ ] Quarterly accuracy audit: sample 100 voice responses, compare factual claims against DB state at time of response

### Epic 9: Platform Certification Requirements (F12, F14, F18)

**US-9.1: Alexa Certification Readiness**
> As a platform engineer, when I submit the Alexa skill for certification, I want it to pass on first submission.

**Acceptance Criteria:**
- [ ] `AMAZON.HelpIntent` handler: "You can ask RealtorAI about your leads, showings, pipeline, listings, or schedule. For example, say 'check my leads' or 'what's my schedule today?'"
- [ ] `AMAZON.CancelIntent` and `AMAZON.StopIntent` handlers: "Goodbye! Your RealtorAI session has been saved." + end session
- [ ] `AMAZON.FallbackIntent` handler: "I didn't understand that. Try saying 'check my leads' or 'what's my schedule?'"
- [ ] 50+ sample utterances across all intents (minimum 8 per intent)
- [ ] SSML responses capped at 8,000 characters and 90 seconds audio
- [ ] COPPA declaration: skill is NOT directed at children under 13
- [ ] Privacy policy URL at `realtorai.com/privacy` — mentions voice data collection, AI processing, retention period
- [ ] Terms of use URL at `realtorai.com/terms`
- [ ] Tested on Echo Dot 5th gen, Echo Show 10, Fire TV Stick
- [ ] Skill manifest includes: `en-US` and `en-CA` locales

**US-9.2: Google Actions Certification**
> As a platform engineer, when I submit the Google Action, I want it to pass review.

**Acceptance Criteria:**
- [ ] All 6 intents have 10+ training phrases each
- [ ] `actions.yaml` includes age-gate declaration (not for children)
- [ ] Privacy policy and terms linked in Actions Console
- [ ] Fallback intent with 3+ reprompt variations
- [ ] No personally identifiable information in Action logs (Google requirement)
- [ ] Tested on Google Home Mini, Nest Hub, Pixel 8 Pro
- [ ] Action description, sample invocations, and category (Business & Finance) configured

---

## 6. Technical Design

### 6a. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VOICE PLATFORMS                          │
│  ┌───────┐  ┌────────┐  ┌───────┐  ┌─────────┐  ┌──────────┐  │
│  │ Siri  │  │ Google │  │ Alexa │  │ Cortana │  │ Browser  │  │
│  │Shortcut│  │Actions │  │ Skill │  │  Skill  │  │ Widget   │  │
│  └───┬───┘  └───┬────┘  └───┬───┘  └────┬────┘  └────┬─────┘  │
│      │          │            │           │            │         │
│      └──────────┴─────┬──────┴───────────┴────────────┘         │
│                       │                                         │
│              ┌────────▼─────────┐                               │
│              │  OAuth2 + PKCE   │  /api/oauth/authorize          │
│              │  Token Exchange  │  /api/oauth/token               │
│              └────────┬─────────┘                               │
│                       │ JWT (tenant_id, agent_email, perms)     │
│              ┌────────▼─────────┐                               │
│              │  Next.js API     │  26 voice-agent routes         │
│              │  Gateway Layer   │  + platform webhooks            │
│              │  (tenant extract)│  + OpenAPI spec                 │
│              └────────┬─────────┘                               │
│                       │                                         │
│              ┌────────▼─────────┐                               │
│              │  Python Voice    │  LLM (4 providers)             │
│              │  Agent Server    │  63 tools                      │
│              │  (port 8768)     │  SSE streaming                 │
│              └────────┬─────────┘                               │
│                       │ tenant_id in every query                │
│              ┌────────▼─────────┐                               │
│              │    Supabase      │  PostgreSQL + RLS              │
│              │  (shared DB)     │  tenant_id on all tables       │
│              │                  │  Single source of truth        │
│              └──────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### 6b. New Files & Modules

```
src/
├── app/
│   ├── api/
│   │   ├── oauth/
│   │   │   ├── authorize/route.ts      # OAuth2 authorization endpoint
│   │   │   ├── token/route.ts          # Token exchange + refresh
│   │   │   └── revoke/route.ts         # Token revocation
│   │   └── voice-agent/
│   │       ├── openapi.json            # OpenAPI 3.1 spec (auto-generated)
│   │       ├── google-webhook/route.ts # Google Actions fulfillment
│   │       ├── alexa-webhook/route.ts  # Alexa skill handler
│   │       ├── cortana-webhook/route.ts# Cortana/Bot Framework handler
│   │       └── keys/route.ts           # API key management
│   ├── (dashboard)/
│   │   ├── settings/
│   │   │   └── voice-assistants/page.tsx  # Assistant setup UI
│   │   └── admin/
│   │       └── voice-analytics/page.tsx   # Tenant analytics
│   └── .well-known/
│       ├── apple-app-site-association     # iOS universal links
│       └── assetlinks.json                # Android app links
├── lib/
│   ├── oauth/
│   │   ├── server.ts               # OAuth2 server (authorize, token, validate)
│   │   ├── pkce.ts                 # PKCE challenge/verifier
│   │   └── consent.ts              # Consent screen logic
│   ├── voice-agent-auth.ts         # Updated: JWT validation + tenant extraction
│   └── tenant-context.ts           # Set/get tenant_id for Supabase RPC
├── actions/
│   └── voice-keys.ts               # API key CRUD server actions
├── components/
│   └── voice-agent/
│       ├── AssistantSetup.tsx       # Setup wizard for Siri/Google/Alexa/Cortana
│       ├── ShortcutDownloader.tsx   # Siri Shortcut file generator
│       └── VoiceAnalytics.tsx       # Analytics dashboard component
└── types/
    └── voice-agent.ts              # Updated: add tenant_id to all interfaces

public/
├── manifest.json                   # PWA manifest with shortcuts + share_target
└── shortcuts/                      # Pre-built .shortcut files (per-tenant generated)

voice_agent/server/
├── database.py                     # REWRITTEN: Supabase async client (zero SQLite)
├── supabase_client.py              # NEW: httpx-based Supabase REST client
├── tenant_context.py               # NEW: extract + validate tenant from JWT
└── tools/
    ├── realtor_tools.py            # Updated: tenant_id passed to all queries
    ├── client_tools.py             # Updated: tenant scoping
    └── generic_tools.py            # Updated: tenant-scoped notes/reminders

supabase/migrations/
├── 061_multi_tenant_voice.sql      # Add tenant_id, update RLS, new tables
└── 062_oauth_clients.sql           # OAuth clients, tokens, consent records
```

### 6b-ii. New API Routes

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/oauth/authorize` | GET | OAuth2 authorization + consent screen | Session (NextAuth) |
| `/api/oauth/token` | POST | Token exchange + refresh | Client credentials |
| `/api/oauth/revoke` | POST | Revoke access/refresh tokens | Bearer token |
| `/api/voice-agent/keys` | GET/POST/DELETE | Tenant API key management | JWT (tenant admin) |
| `/api/voice-agent/google-webhook` | POST | Google Actions fulfillment | Google signature |
| `/api/voice-agent/alexa-webhook` | POST | Alexa skill handler | Alexa signature |
| `/api/voice-agent/cortana-webhook` | POST | Cortana/Bot Framework | Azure AD JWT |
| `/api/voice-agent/openapi.json` | GET | OpenAPI 3.1 specification | Public |
| `/settings/voice-assistants` | Page | Assistant setup wizard | Session |
| `/admin/voice-analytics` | Page | Tenant analytics dashboard | Session (admin) |

### 6b-iii. Environment Variables

| Variable | Purpose | New/Existing |
|---|---|---|
| `OAUTH_JWT_SECRET` | Sign OAuth2 access tokens | New |
| `OAUTH_REFRESH_SECRET` | Sign refresh tokens (separate from access) | New |
| `GOOGLE_ACTIONS_PROJECT_ID` | Google Actions Console project | New |
| `ALEXA_SKILL_ID` | Alexa Developer Console skill ID | New |
| `ALEXA_CLIENT_ID` | Alexa account linking client ID | New |
| `ALEXA_CLIENT_SECRET` | Alexa account linking client secret | New |
| `AZURE_AD_TENANT_ID` | Microsoft Azure AD for Cortana/Teams | New |
| `AZURE_BOT_APP_ID` | Bot Framework app registration | New |
| `AZURE_BOT_APP_SECRET` | Bot Framework app secret | New |
| `DAILY_WEBHOOK_SECRET` | Daily.co webhook HMAC validation | New |
| `VOICE_AGENT_API_KEY` | Deprecated — replaced by per-tenant keys | Existing (remove) |
| `SUPABASE_SERVICE_ROLE_KEY` | Python server → Supabase auth | Existing |
| `NEXT_PUBLIC_VOICE_AGENT_URL` | Python server URL | Existing |

### 6c. Database Schema

```sql
-- Migration: 061_multi_tenant_voice.sql
-- Purpose: Add tenant isolation to voice agent tables, create supporting tables
-- Depends on: 060_voice_agent_system.sql
-- NOTE: If tenants table does not exist, create it first (Step 0)

-- ============================================================================
-- Step 0: Create tenants table if not exists (foundation for all multi-tenant)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                               -- brokerage name
    slug TEXT UNIQUE,                                  -- URL-friendly identifier (e.g., "westside-realty")
    plan TEXT NOT NULL DEFAULT 'standard'              -- standard, professional, enterprise
        CHECK (plan IN ('standard', 'professional', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active'              -- lifecycle state
        CHECK (status IN ('active', 'suspended', 'cancelled')),
    owner_email TEXT NOT NULL,                         -- primary account owner
    billing_email TEXT,                                -- billing contact
    max_agents INT DEFAULT 5,                          -- plan-based seat cap
    settings JSONB DEFAULT '{}'::jsonb,                -- timezone, locale, branding overrides
    voice_rate_limit_per_minute INT DEFAULT 120,       -- configurable per tenant
    voice_rate_limit_per_hour INT DEFAULT 3000,
    llm_provider TEXT DEFAULT 'anthropic',             -- default LLM for this tenant
    llm_api_key_encrypted TEXT,                        -- bring-your-own key (encrypted)
    created_by TEXT,                                   -- provisioning actor
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,                          -- set when status → cancelled
    delete_after TIMESTAMPTZ                           -- hard-delete date (cancelled_at + 30 days)
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent'                 -- owner (1 per tenant), admin, agent
        CHECK (role IN ('owner', 'admin', 'agent')),
    invited_by TEXT,                                   -- who invited this agent
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,                            -- soft-delete for audit
    UNIQUE(tenant_id, agent_email)                     -- one membership per tenant per agent
);

CREATE INDEX idx_tenant_memberships_email ON tenant_memberships(agent_email);
CREATE INDEX idx_tenant_memberships_tenant ON tenant_memberships(tenant_id, role);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenants_isolation ON tenants FOR ALL USING (true);  -- admin-only access via service role
CREATE POLICY memberships_isolation ON tenant_memberships
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Step 0b: Create default tenant + backfill for existing single-tenant data
-- ============================================================================

INSERT INTO tenants (id, name, plan, status, billing_email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Brokerage (Legacy)', 'standard', 'active', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 1: Add tenant_id as NULLABLE first (existing rows have no value)
-- ============================================================================

ALTER TABLE voice_sessions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE voice_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Backfill existing rows with default tenant
UPDATE voice_sessions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE voice_calls SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE voice_notifications SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Now add NOT NULL constraint
ALTER TABLE voice_sessions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE voice_calls ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE voice_notifications ALTER COLUMN tenant_id SET NOT NULL;

-- Add source tracking for cross-platform sessions
ALTER TABLE voice_sessions
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'browser'
    CHECK (source IN ('browser', 'siri', 'google', 'alexa', 'cortana', 'teams', 'api'));

ALTER TABLE voice_calls
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'browser'
    CHECK (source IN ('browser', 'siri', 'google', 'alexa', 'cortana', 'teams', 'api'));

-- ============================================================================
-- Step 2: Update indexes (tenant_id as leading column)
-- ============================================================================

DROP INDEX IF EXISTS idx_voice_sessions_agent_status;
CREATE INDEX idx_voice_sessions_tenant_agent_status
    ON voice_sessions(tenant_id, agent_email, status);

DROP INDEX IF EXISTS idx_voice_calls_session;
CREATE INDEX idx_voice_calls_tenant_session
    ON voice_calls(tenant_id, session_id);

DROP INDEX IF EXISTS idx_voice_notifications_agent;
CREATE INDEX idx_voice_notifications_tenant_agent
    ON voice_notifications(tenant_id, agent_email, notification_type);

CREATE INDEX idx_voice_sessions_source
    ON voice_sessions(tenant_id, source);

CREATE INDEX idx_voice_calls_source
    ON voice_calls(tenant_id, source, created_at DESC);

-- ============================================================================
-- Step 3: Update RLS policies (tenant isolation)
-- ============================================================================

DROP POLICY IF EXISTS voice_sessions_policy ON voice_sessions;
CREATE POLICY voice_sessions_tenant_isolation ON voice_sessions
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

DROP POLICY IF EXISTS voice_calls_policy ON voice_calls;
CREATE POLICY voice_calls_tenant_isolation ON voice_calls
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

DROP POLICY IF EXISTS voice_notifications_policy ON voice_notifications;
CREATE POLICY voice_notifications_tenant_isolation ON voice_notifications
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Tenant API Keys — per-tenant authentication for voice endpoints
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),  -- owning tenant
    key_hash TEXT NOT NULL,                           -- bcrypt hash of API key
    key_prefix TEXT NOT NULL,                         -- first 8 chars for display (e.g., "lf_voice_")
    name TEXT NOT NULL DEFAULT 'Default',             -- human-readable label
    permissions JSONB DEFAULT '["voice:read","voice:write"]'::jsonb,  -- scoped permissions
    rate_limit_per_minute INT DEFAULT 60,             -- per-key rate limit
    last_used_at TIMESTAMPTZ,                         -- track activity
    expires_at TIMESTAMPTZ,                           -- optional expiry
    revoked_at TIMESTAMPTZ,                           -- soft delete for audit
    created_by TEXT NOT NULL,                         -- agent_email who created
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_api_keys_tenant ON tenant_api_keys(tenant_id);
CREATE INDEX idx_tenant_api_keys_prefix ON tenant_api_keys(key_prefix);

ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_api_keys_isolation ON tenant_api_keys
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Voice Conversation Logs — replaces SQLite conversation_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    session_id UUID REFERENCES voice_sessions(id),   -- FK to voice session
    agent_email TEXT NOT NULL,                        -- who spoke
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT,                                     -- message content
    tool_name TEXT,                                   -- tool invoked (if role = 'tool')
    tool_args JSONB,                                  -- tool arguments
    tool_result JSONB,                                -- tool response
    source TEXT DEFAULT 'browser',                    -- platform source
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_conv_logs_tenant_session
    ON voice_conversation_logs(tenant_id, session_id, created_at DESC);
CREATE INDEX idx_voice_conv_logs_agent
    ON voice_conversation_logs(tenant_id, agent_email, created_at DESC);

ALTER TABLE voice_conversation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_conv_logs_isolation ON voice_conversation_logs
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Voice Preferences — replaces SQLite personalization table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_email TEXT NOT NULL,
    key TEXT NOT NULL,                                -- preference key
    value JSONB NOT NULL,                             -- preference value
    frequency INT DEFAULT 1,                          -- usage count
    last_used TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, agent_email, key)               -- one pref per key per agent per tenant
);

CREATE INDEX idx_voice_prefs_tenant_agent
    ON voice_preferences(tenant_id, agent_email);

ALTER TABLE voice_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_prefs_isolation ON voice_preferences
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Voice Notes — replaces SQLite notes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_email TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_notes_tenant_agent
    ON voice_notes(tenant_id, agent_email, created_at DESC);

ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_notes_isolation ON voice_notes
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Voice Reminders — replaces SQLite reminders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_email TEXT NOT NULL,
    message TEXT NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_reminders_tenant_pending
    ON voice_reminders(tenant_id, agent_email, remind_at)
    WHERE acknowledged = false;

ALTER TABLE voice_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_reminders_isolation ON voice_reminders
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Tenant Audit Log — track security-relevant events per tenant
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    actor_email TEXT NOT NULL,                        -- who performed the action
    action TEXT NOT NULL,                             -- 'key_created', 'key_revoked', 'auth_failed', etc.
    resource_type TEXT,                               -- 'api_key', 'session', 'oauth_token'
    resource_id TEXT,                                 -- ID of affected resource
    metadata JSONB,                                   -- additional context
    ip_address INET,                                  -- source IP
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_tenant_action
    ON tenant_audit_log(tenant_id, action, created_at DESC);

ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_isolation ON tenant_audit_log
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
```

```sql
-- Migration: 062_oauth_clients.sql
-- Purpose: OAuth2 client registration and token storage for external assistants
-- Depends on: 061_multi_tenant_voice.sql

-- ============================================================================
-- OAuth Clients — registered applications (Siri, Google, Alexa, Cortana)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id TEXT NOT NULL UNIQUE,                   -- public client identifier
    client_secret_hash TEXT,                          -- bcrypt hash (null for public clients using PKCE)
    client_name TEXT NOT NULL,                        -- "RealtorAI Siri", "RealtorAI Alexa"
    platform TEXT NOT NULL CHECK (platform IN ('siri', 'google', 'alexa', 'cortana', 'teams', 'gemini', 'custom')),
    redirect_uris JSONB NOT NULL DEFAULT '[]'::jsonb, -- allowed redirect URIs
    scopes JSONB DEFAULT '["voice:read","voice:write","crm:read"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_clients_tenant ON oauth_clients(tenant_id);
CREATE INDEX idx_oauth_clients_client_id ON oauth_clients(client_id);

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_clients_isolation ON oauth_clients
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- OAuth Authorization Codes — short-lived codes for token exchange
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_auth_codes (
    code TEXT PRIMARY KEY,                            -- random 64-char code
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_email TEXT NOT NULL,                        -- authenticated user
    redirect_uri TEXT NOT NULL,                       -- must match registered URI
    scopes JSONB NOT NULL,
    state TEXT NOT NULL,                              -- CSRF protection (RFC 6749 §10.12)
    code_challenge TEXT,                              -- PKCE S256 challenge
    code_challenge_method TEXT DEFAULT 'S256',
    expires_at TIMESTAMPTZ NOT NULL,                  -- 10-minute expiry
    used_at TIMESTAMPTZ,                              -- set on exchange (prevent replay, use SELECT FOR UPDATE)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_codes_expiry ON oauth_auth_codes(expires_at);

-- No RLS needed — codes are looked up by value, not tenant

-- ============================================================================
-- OAuth Refresh Tokens — long-lived tokens for token refresh
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,                  -- bcrypt hash of refresh token
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_email TEXT NOT NULL,
    scopes JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,                  -- 30-day expiry
    revoked_at TIMESTAMPTZ,                           -- soft revocation
    replaced_by UUID REFERENCES oauth_refresh_tokens(id), -- rotation tracking
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_refresh_tenant ON oauth_refresh_tokens(tenant_id, agent_email);
CREATE INDEX idx_oauth_refresh_expiry ON oauth_refresh_tokens(expires_at)
    WHERE revoked_at IS NULL;

ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_refresh_isolation ON oauth_refresh_tokens
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- OAuth Consent Records — PIPEDA/PIPA compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_email TEXT NOT NULL,
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id),
    platform TEXT NOT NULL,                           -- siri, google, alexa, cortana
    scopes_granted JSONB NOT NULL,
    consent_text TEXT NOT NULL,                       -- exact text shown to user
    ip_address INET,
    user_agent TEXT,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ                            -- user can revoke consent
);

CREATE INDEX idx_oauth_consent_tenant_agent
    ON oauth_consent_records(tenant_id, agent_email, platform);

ALTER TABLE oauth_consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_consent_isolation ON oauth_consent_records
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
```

### 6d. Platform API Requirements

| Platform | API / SDK | Auth Method | Key Limits | Cost |
|---|---|---|---|---|
| Apple Siri | Shortcuts HTTP Actions | OAuth2 Bearer | No explicit limit | Free |
| Apple AppIntents | Web-based (no native app) | OAuth2 Bearer | N/A | Free |
| Google Actions | Actions Builder + Webhook | Google signature + OAuth2 | 1,000 queries/day (free tier) | Free tier, then $0.002/query |
| Gemini Extensions | OpenAPI 3.1 spec | OAuth2 Bearer | Gemini API limits | Included in Gemini subscription |
| Amazon Alexa | ASK v2 + SMAPI | Alexa request signature + OAuth2 | 15 sec response timeout | Free (skill hosting), $0.0 per invocation |
| Microsoft Cortana | Bot Framework SDK v4 | Azure AD JWT | 10,000 messages/mo (free) | Free tier, then $0.50/1K messages |
| Microsoft Teams | Bot Framework + Teams SDK | Azure AD JWT | Same as Cortana | Same as Cortana |
| Daily.co | REST API + WebRTC | Bearer API key | 200 rooms/domain, 4,000 API req/min | $0.004/participant-minute |

### 6e. Platform Webhook Response Formats

```python
# Google Actions response format
GOOGLE_RESPONSE = {
    "prompt": {
        "firstSimple": {
            "speech": "<speak>You have 3 new leads today. <break time='500ms'/> Jennifer Chen is looking for East Vancouver condos under $800K.</speak>",
            "text": "You have 3 new leads today."
        }
    },
    "session": {
        "params": {"session_id": "tenant1:sess_abc123"}
    }
}

# Alexa response format
ALEXA_RESPONSE = {
    "version": "1.0",
    "sessionAttributes": {"session_id": "tenant1:sess_abc123"},
    "response": {
        "outputSpeech": {
            "type": "SSML",
            "ssml": "<speak>You have 3 new leads today. <break time='500ms'/> Jennifer Chen is looking for East Vancouver condos under 800 thousand dollars.</speak>"
        },
        "shouldEndSession": False
    }
}

# Cortana/Bot Framework response format
CORTANA_RESPONSE = {
    "type": "message",
    "text": "You have 3 new leads today.",
    "speak": "<speak>You have 3 new leads today.</speak>",
    "inputHint": "expectingInput",
    "attachments": [{
        "contentType": "application/vnd.microsoft.card.adaptive",
        "content": {
            "type": "AdaptiveCard",
            "body": [{"type": "TextBlock", "text": "3 New Leads", "weight": "Bolder"}]
        }
    }]
}
```

### 6f. Cron Jobs

| Cron | Schedule | Purpose |
|---|---|---|
| `voice-session-cleanup` | Every 30 minutes | Expire stale sessions (>24h inactive), clean up Daily.co rooms, per-tenant |
| `voice-compliance-check` | Daily 6:00 AM | Scan `voice_calls` for FINTRAC keywords in transcripts, flag for review, per-tenant |
| `oauth-token-cleanup` | Daily 2:00 AM | Delete expired auth codes (>10 min), expired refresh tokens (>30 days) |
| `voice-analytics-rollup` | Daily 1:00 AM | Aggregate daily voice usage stats per tenant for analytics dashboard |
| `alexa-proactive-events` | Every 5 minutes | Check for new leads, showing updates, deal changes → push to Alexa via Proactive Events API, per-tenant |

---

## 7. Launch Plan

### Phase 1: Multi-Tenant Foundation (4 weeks — 2026-04-07 to 2026-05-04)

- Migration 061: `tenant_id` on all voice tables + RLS policies
- Migration 062: OAuth clients, tokens, consent records
- Per-tenant API key management (generate/rotate/revoke)
- OAuth2 + PKCE authorization server
- Python server → Supabase migration (zero SQLite)
- OpenAPI 3.1 spec for all voice endpoints
- Remove hardcoded Bearer token from VoiceAgentWidget
- Add Daily.co webhook signature validation
- Fix hook HTTP method mismatches (useVoiceAgent, useVoiceNotifications)

**Launch gate:** All 63 voice tools return correct results with tenant context (automated regression suite). Automated cross-tenant isolation test suite: 26 API routes × 3 test tenants = 78 test cases, all passing zero cross-tenant data leakage. OAuth2 + PKCE flow completes end-to-end for Siri, Google, Alexa, Cortana in test environment (4 flows × 3 tenants = 12 tests). SQLite fully removed (zero `.db` files in repo). `npm run typecheck` clean.

### Phase 2: Apple Ecosystem (3 weeks — 2026-05-05 to 2026-05-25)

- Pre-built Siri Shortcuts (5 shortcuts, auto-generated per tenant)
- PWA manifest + Apple meta tags + protocol handlers
- `.well-known/apple-app-site-association`
- Settings page: `/settings/voice-assistants` (Siri setup wizard)
- Deep linking: `realtorai://` scheme
- Cross-platform session continuity (Siri → browser)

**Launch gate:** 5 beta realtors complete Siri setup in <2 minutes each (timed). 50+ successful Siri → CRM voice queries across 5 distinct intents, by 5 different beta users, over 7 days. PWA installs on iOS 17+ home screen and launches in standalone mode (verified on iPhone 14+ and iPad). Deep links `realtorai://contacts/:id` resolve correctly from Siri Shortcut response.

### Phase 3: Google & Amazon (3 weeks — 2026-05-26 to 2026-06-15)

- Google Actions project + webhook + account linking
- Gemini Extension via OpenAPI spec
- Alexa Custom Skill + webhook + account linking + certification prep
- Google Home routines (morning briefing)
- Alexa proactive events (lead alerts)
- Android app links (`assetlinks.json`)

**Launch gate:** Google Action and Alexa Skill pass internal QA (6 intents each, 50+ test utterances, tested on 3 device types per platform). Gemini Extension successfully calls 10+ API endpoints with correct tenant-scoped responses. Alexa certification checklist (v2026, https://developer.amazon.com/en-US/docs/alexa/custom-skills/certification-requirements.html) 100% complete including Help/Stop/Cancel/Fallback intents. Cross-platform session continuity verified: Siri → Google → Alexa → browser, single conversation thread maintained.

### Phase 4: Microsoft + Polish (2 weeks — 2026-06-16 to 2026-06-29)

- Cortana skill + Bot Framework webhook
- Teams bot with @mention support
- Per-tenant analytics dashboard
- Per-tenant LLM provider config
- Tenant onboarding wizard
- Service worker + Web Push notifications
- All 5 cron jobs deployed

**Launch gate:** Cortana and Teams bot respond to all 6 core intents. Analytics dashboard shows data from all 4 platforms. Onboarding wizard tested with 3 new tenants (setup <1 hour each). All cron jobs running in production for 7 consecutive days without failure.

---

## 8. Pricing Strategy

**Multi-tenant voice is included in base RealtorAI subscription** — it's infrastructure, not a feature add-on. External assistant integration is a competitive differentiator that justifies the platform fee.

**Cost structure per tenant per month (estimated):**

| Component | Cost | Notes |
|---|---|---|
| Supabase (shared DB) | ~$2-5/tenant | RLS overhead minimal, shared infrastructure |
| LLM (Anthropic Claude) | ~$8-15/agent | 5 sessions/day × ~8K tokens/session (incl. system prompt + tool defs + multi-turn context) = 40K tokens/day. Split: ~30K input ($3/M) + ~10K output ($15/M) = $0.24/day = **$7.20/mo base**. With retries, long sessions, and multi-tool queries: ~$8-15/mo. Per-agent daily cap: 50K tokens (alert at 80%, hard cap at 100%) |
| Daily.co (WebRTC) | ~$3-5/agent | Browser widget only, $0.004/participant-minute |
| Google Actions | $0 | Free tier covers <1,000 queries/day |
| Alexa hosting | $0 | Free for skill invocations |
| Cortana/Teams | $0 | Free tier covers <10,000 messages/mo |

**Total incremental cost: ~$13-25/agent/month.** Current RealtorAI subscription: $99/agent/month. Voice features represent ~15-25% of COGS — well within margin.

**Competitive positioning:** kvCORE charges $499/mo for basic Alexa read-only alerts. RealtorAI offers full voice CRM across 4 platforms for $0 extra. This is a moat, not a revenue line.

---

## 9. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cross-tenant data leakage via RLS misconfiguration | Medium | Critical | Automated RLS test suite: 3 test tenants, every query tested for isolation. Penetration test before launch. `app.tenant_id` fail-closed (returns empty, not error) |
| OAuth2 token theft enables unauthorized CRM access | Medium | High | Token rotation on every refresh. 1-hour access token expiry. PKCE required. Consent revocation endpoint. Audit log on all token operations |
| Alexa skill certification rejection | Medium | Medium | Follow certification checklist from day 1. Pre-submit review. 50+ sample utterances. Privacy policy + ToS pages. Test on 3 device types |
| Google Actions deprecated / changed API | Low | High | OpenAPI spec is platform-agnostic — Gemini Extensions are the forward path. Google Actions is bridge |
| Cortana deprecated by Microsoft | High | Low | Cortana consumer features being sunset. Focus on Teams bot (actively growing). Cortana skill is low-effort since it shares Bot Framework with Teams |
| Python → Supabase migration causes latency regression | Medium | Medium | Latency budget: <100ms p95. Connection pooling. Monitor with Supabase dashboard. If >200ms, add read replica |
| Siri Shortcuts broken by iOS update | Low | Medium | Shortcuts use standard HTTP Actions (stable API). No private frameworks. Test on iOS beta before GA release |
| Multi-tenant billing complexity | Low | Low | Start with flat per-agent pricing. Add usage-based billing later. Track costs per tenant from day 1 for future optimization |
| LLM hallucination in voice responses | Medium | High | All factual claims (prices, dates, counts) must originate from tool call results, not free-form generation. System prompt includes hedging rules. Quarterly accuracy audit of 100 sampled responses |
| Cost overruns from chatty agents | Medium | Medium | Per-agent daily token budget (default 50K tokens/day). Alert tenant admin at 80% threshold. Hard cap at 100% — agent gets "Daily AI budget reached" response |
| Voice recording consent (Quebec two-party) | Low | High | System stores transcripts only, not audio recordings. Consent notice at OAuth link time. If expanding to Quebec, add two-party consent flow before session start |
| GDPR (international expansion) | Low | Medium | Current scope is BC/Canada (PIPEDA). If EU clients, add data residency option, DPO contact, 72-hour breach notification. Acknowledged as future work, not Phase 1 |
| Siri Shortcut token exposure via iCloud | Medium | Medium | OAuth access tokens in Shortcuts have 1-hour expiry. Refresh tokens stored in iOS Keychain (encrypted). Warn users not to share .shortcut files. Token rotation on every refresh |
| Supabase current_setting() RLS at scale | Low | High | Load test with 1M voice_calls rows across 100 tenants. If p95 query time >200ms, add tenant_id partition or materialized views. Monitor via Supabase dashboard |
| Python server single point of failure | Medium | High | Health check at `GET /api/health`. Horizontal scaling via Docker replicas behind load balancer. Platform webhooks return 503 + Retry-After if server unreachable. Session state in Supabase (not local) enables any replica to serve any request |
| Platform API rate limit cascade | Low | Medium | Track per-tenant platform quota usage (Google: 1,000/day free). Alert tenant admin at 80%. Per-tenant platform rate counters in `tenant_platform_usage` table |

### 9b. Downsides & Tradeoffs

**1. What do we lose or break for others?**
Existing single-tenant voice widget users will need to authenticate with OAuth instead of the current auto-connect. Migration path: auto-create tenant + API key for existing users, so the transition is invisible. Risk: if migration script fails, existing users temporarily lose voice access.

**2. What happens if we're wrong? Can we undo it?**
If multi-tenant RLS is wrong, worst case is data leakage between tenants. This is irreversible damage to trust. Mitigation: extensive testing with 3 test tenants before any real tenant data enters the system. Rollback migration exists (`061_rollback.sql`) but once real multi-tenant data exists, rollback would require data migration.

**3. What unverified assumptions does this embed?**
We assume a `tenants` table already exists with a stable `id` column. We assume Supabase RLS with `current_setting()` pattern performs well at scale. We assume OAuth2 + PKCE is sufficient for all 4 platforms (verified: yes, all require it). We assume realtors will actually configure external assistants (unverified — hence the <2 minute setup target).

**4. What gets harder to debug, test, or maintain?**
Every query now requires tenant context. Forgetting to set `app.tenant_id` returns empty results silently (fail-closed). Debugging: add `x-tenant-id` header to all API responses in dev mode. Testing: every test must set up tenant context first. Maintenance: 4 platform webhooks to maintain as platforms evolve.

**5. What edge cases does this create?**
Agent belongs to multiple tenants (moonlighting at two brokerages) — need tenant selector in UI. Session started on one platform while another platform has an active session — need session arbitration (latest wins). OAuth token expires mid-conversation on Alexa — need graceful re-auth prompt. Rate limit hit on one platform doesn't affect other platforms for same tenant.

---

## 10. Competitive Moat

**What makes this different from kvCORE ($499/mo) + Ylopo ($495/mo) + Sierra Interactive ($500/mo) + a bunch of Alexa skills:**

1. **Full CRM read AND write execution, not read-only queries or alerts.** Competitors at best offer read-only voice queries (Sierra Interactive) or push-only alerts (kvCORE, Ylopo). RealtorAI lets you create contacts, schedule showings, update deal stages, and log compliance notes — all by voice. 63 tools across 3 modes, not 3 intents.

2. **Multi-tenant by design, not bolted on.** RLS at the database level, OAuth2 per platform, tenant-scoped everything. Competitors are single-tenant SaaS with per-instance deployments. RealtorAI scales to 1,000 brokerages on one database.

3. **Every platform, one codebase.** Siri, Google, Alexa, Cortana, Teams, browser — all calling the same 26 API routes through the same OpenAPI spec. Competitors build one integration and call it "voice enabled."

4. **Cross-platform session continuity.** Start on Siri in the car, continue on Alexa at home, finish in the browser. One conversation thread, one session, one context. Based on published documentation and feature pages of all major competitors, no other real estate CRM advertises cross-platform voice session continuity.

5. **Multi-turn tool calling.** Alexa and Google skills typically support single-turn Q&A. RealtorAI maintains session state across turns with up to 4 tool calls per query — the voice agent reasons about what tools to call, not just pattern-matches intents.

6. **PIPEDA/PIPA compliance built in.** Consent records for every OAuth link. Audit trail per tenant. FINTRAC keyword detection in transcripts. Competitors don't mention compliance in their voice features.

7. **OpenAPI-first architecture.** The OpenAPI spec means any future platform (Samsung Bixby, Apple Intelligence, OpenAI GPT Actions) can integrate without custom code. Competitors would need to build each integration from scratch.

8. **Per-tenant LLM choice.** Tenants can bring their own Anthropic or OpenAI key, choose their model, and control costs. No competitor offers this level of AI customization for voice.

---

*PRD Version 1.3 — 2026-03-30 (5-pass iterative analysis: Pass 1 deep draft, Pass 2 best-in-market comparison, Pass 3 code verification, Pass 4 depth check, Pass 5 final review)*
*Based on research across 8+ real estate voice platforms (kvCORE, Ylopo, Sierra Interactive, Lofty, Real Geeks, Follow Up Boss, Homebot, BoomTown/Inside Real Estate), Apple AppIntents & SiriKit documentation, Google Actions Builder & Gemini Extensions API, Amazon Alexa Skills Kit v2, Microsoft Bot Framework v4, Supabase RLS multi-tenant patterns, PIPEDA/PIPA/CASL/COPPA compliance requirements, and deep analysis of existing voice_agent/ codebase (4,100+ lines Python, 2,290+ lines TypeScript, 26 API routes, 63 tools)*
*22 issues identified and resolved across passes 2-5: 2 Critical (missing tenants table, data migration backfill), 5 High (OAuth state param, hallucination guardrails, Alexa certification intents, tool/route count accuracy, agent departure), 9 Medium (launch gate specificity, LLM cost caps, recording consent, platform rate limits), 6 Low (competitor pricing notes, Cortana sunset, GDPR acknowledgment)*
