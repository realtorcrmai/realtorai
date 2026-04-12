<!-- docs-audit: src/lib/ai-agent/*, src/actions/newsletters.ts -->
# Vision Context: Rethinking Email Marketing for Real Estate with AI Agents

## The Core Problem: Campaigns Are Dead

Every email platform today — HubSpot included — is built around the same 2012-era mental model: Create Campaign → Pick Segment → Write Email → Schedule → Send → Report. This is fundamentally broken for real estate because the "product catalog" changes daily, every contact is on a unique timeline, realtors aren't marketers, and the data that matters is behavioral. The industry needs an autonomous system that handles the entire email relationship without the realtor touching it.

## The New Architecture: Agent-Per-Contact

Instead of one campaign hitting thousands of contacts, each contact gets their own AI agent that:
- Knows everything about the contact (history, clicks, preferences, lifecycle stage)
- Watches for relevant triggers (new listing in their area, price drop, market shift)
- Decides what to send, when to send, and whether to send at all
- Generates the content from scratch — every email is unique
- Learns from outcomes (opens, clicks, replies, unsubscribes)

## The Five Layers

### Layer 1 — The Contact Intelligence Graph
Replace flat contact records with a living knowledge graph tracking intent signals, inferred profile (budget, areas, property types, timeline, motivation), relationship state (lifecycle, engagement trend, trust level, risk), and constraints (CASL consent, preferred channel, frequency preference).

### Layer 2 — The Event Stream (Not Campaigns)
Stop thinking in campaigns. Think in events that trigger agent evaluation: MLS events (new listing, price change, sold), market events (monthly stats, rate changes), contact events (click, open, reply, showing booked), calendar events (purchase anniversary), and absence events (no engagement for X days).

### Layer 3 — The Content Engine (Not Templates)
Every email generated fresh with full context: contact profile, triggering event, listing data, market context, realtor's voice rules, last email sent. The output isn't a template with merge fields — it's a unique email written for one person.

### Layer 4 — The Send Governor
Prevents AI from becoming spam. Enforces: max 3 emails per contact per week, min 18h between emails, engagement-based throttling, deliverability monitoring, auto-sunset for 0-open contacts, CASL compliance, brand voice enforcement.

### Layer 5 — The Realtor Dashboard (Not a Campaign Manager)
Zero campaign building. Zero template editing. Zero segmentation. The realtor sees: what the AI did overnight, hot lead alerts, pending reviews, weekly stats, agent insights, and simple controls (on/off, frequency, voice settings).

## Building Trust Through Radical Transparency

### The Trust Ladder: Progressive Autonomy
4 levels that the agent earns through demonstrated competence:
- **Level 0 — Ghost Mode (Week 1-2):** Agent drafts, realtor reviews everything, realtor sends manually. "Let me see everything."
- **Level 1 — Co-pilot (Week 3-4):** Agent drafts, realtor gets notification, 1-tap approve/edit/skip. "I trust the tone, let me skim faster."
- **Level 2 — Supervised (Month 2-3):** Agent sends automatically, realtor gets daily digest, can pause anytime. "Just show me the important stuff."
- **Level 3 — Autonomous (Month 4+):** Agent handles everything, realtor gets weekly summary, intervenes on exceptions only. "Tell me when something needs me."

The agent cannot promote itself. Only the realtor unlocks the next level after the system shows stats (edit rate trending down, approval rate, open rate, unsubscribes).

### Explainability: Show Your Work
Every email has expandable "Why this email?" reasoning: why this contact, why now, why this tone, what was considered but not sent. "What I chose NOT to do" is the trust superpower — showing restraint earns more trust than eagerness.

### Suppression Visibility
Show the realtor when the agent held back: "3 emails suppressed today" with reasons (unengaged contact, frequency cap, wrong timing). Override button available but tracked.

### Edit Tracking & Voice Learning
Every realtor edit is tracked. The agent extracts style rules from corrections ("Don't use exclamation marks", "Say 'worth a look' not 'check this out'"). Monthly learning report shows edit rate trending from 67% in week 1 to 0% by week 4.

### Kill Switches & Controls
Master on/off, per-contact override, email recall within 5 minutes, frequency caps, topic avoidance, "never email" list. The recall button's existence reduces anxiety even if rarely used.

### Ghost Mode Proof
During trial: "Agent would have sent 34 emails vs your 8. Agent identified 6 listings you didn't email about — 2 sold within 5 days." Blind test: "Can you tell which email is yours vs the agent's?"

## What This Kills from HubSpot's Model

| HubSpot Today | Agent-Native Platform |
|---|---|
| Drag-and-drop email builder | Eliminated — AI generates everything |
| Segment builder with filters | Eliminated — each contact is their own segment |
| Workflow automation trees | Eliminated — agents make real-time decisions |
| A/B testing | Continuous — every email is unique, system learns |
| Campaign calendar | Eliminated — events drive sends, not schedules |
| Template library | Replaced by voice training + brand guidelines |
| Reporting dashboards | Replaced by agent insights in natural language |
| Lead scoring (manual rules) | Eliminated — agent observes behavior directly |
| Drip sequences | Eliminated — agents adapt in real-time |

## Gap Analysis: Current Realtors360 vs Vision

**Overall: ~35% built toward the vision.** The email engine foundation is strong (85%), but the paradigm shift — agent-per-contact, progressive trust, transparency, voice learning — is largely unbuilt.

**What's built:** AI content generation, 6 email templates, contact intelligence tracking, click classification, lead scoring, send advisor (feature-flagged), recommendations engine, approval queue, journey engine, workflow engine, Resend webhooks.

**What's missing:** Per-contact agent evaluation, real-time event pipeline, 4-level trust ladder, ghost mode, inline editing + voice learning, suppression log, agent reasoning UI, send governor (advanced), dynamic timing, overnight summary dashboard, agent insights/learning reports, email recall.

---
---

# AI Agent Email Marketing System -- Implementation Plan

## Executive Summary

Transform Realtors360's campaign-style email system into an **agent-per-contact autonomous system** with progressive trust, transparency, and explainability. This plan builds on top of the existing 85% email engine (newsletters, journeys, workflow engine, lead scorer, send advisor, recommendations) and introduces 6 phases of new capability.

**Core Paradigm Shift:** Instead of "run a journey schedule for everyone identically," each contact gets an AI agent that evaluates real-time events, decides what/when/whether to send, learns from realtor edits, and progressively earns autonomy.

---

## Architecture Overview

```
                    +----------------------------------+
                    |       Event Bus (DB-backed)       |
                    |  new_listing | showing_booked |   |
                    |  click_event | stage_change |     |
                    |  listing_sold | contact_created   |
                    +---------+------------------------+
                              |
                    +---------v------------------------+
                    |   Contact Agent Evaluator        |
                    |   (per-contact AI evaluation)    |
                    |                                  |
                    |  +----------+ +--------------+   |
                    |  | Relevance| | Send Governor|   |
                    |  | Scorer   | | (caps/timing)|   |
                    |  +----+-----+ +------+-------+   |
                    |       |              |           |
                    |  +----v--------------v-------+   |
                    |  |    Decision Engine         |   |
                    |  |  send/skip/defer/swap      |   |
                    |  +----+----------------------+   |
                    +-------+--------------------------+
                            |
              +-------------v--------------+
              |   Trust Gate (4 levels)     |
              | Ghost>Copilot>Supervised>Auto|
              +-------------+--------------+
                            |
              +-------------v--------------+
              |   Newsletter Generator      |
              |   (existing: Claude AI +    |
              |    React Email + Resend)    |
              +-------------+--------------+
                            |
              +-------------v--------------+
              |   Explainability Layer      |
              |   reasoning + suppression   |
              |   log + edit tracking       |
              +----------------------------+
```

---

## Phase 1: Foundation -- Agent Evaluation Engine + Event Pipeline

**Goal:** Replace hardcoded journey schedules with event-driven, per-contact AI evaluation. When events occur (new listing, showing booked, stage change), each relevant contact's agent evaluates whether to act.

### Deliverable 1.1: Event Log Table + Event Emitters

**User Story:** As a system, I want all CRM events captured in a unified event log so that contact agents can evaluate them.

**Acceptance Criteria:**
- Given a new listing is created, When it is saved, Then an event `listing_created` is written to `agent_events` with listing data
- Given a showing is booked, When appointment status changes to confirmed, Then event `showing_confirmed` is written
- Given a contact clicks a newsletter link, When the Resend webhook fires, Then event `email_clicked` is written
- Given a listing status changes to sold, When updated, Then event `listing_sold` is written
- Events are queryable by contact_id, event_type, and created_at

**Database Changes -- Migration `016_agent_event_pipeline.sql`:**

```sql
CREATE TABLE IF NOT EXISTS agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'listing_created', 'listing_updated', 'listing_sold', 'listing_price_change',
    'showing_requested', 'showing_confirmed', 'showing_cancelled',
    'contact_created', 'contact_stage_changed', 'contact_tag_added',
    'email_sent', 'email_opened', 'email_clicked', 'email_bounced',
    'high_intent_click', 'engagement_spike',
    'journey_phase_changed', 'manual_note_added'
  )),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_events_unprocessed ON agent_events(created_at)
  WHERE processed = false;
CREATE INDEX idx_agent_events_contact ON agent_events(contact_id, created_at);
CREATE INDEX idx_agent_events_type ON agent_events(event_type, created_at);
CREATE INDEX idx_agent_events_listing ON agent_events(listing_id)
  WHERE listing_id IS NOT NULL;

ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage agent_events"
  ON agent_events FOR ALL USING (true);
```

**Files to Create/Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/016_agent_event_pipeline.sql` | Create | Event log + decisions tables |
| `src/lib/ai-agent/event-emitter.ts` | Create | Functions to emit events from various CRM actions |
| `src/actions/listings.ts` | Modify | Add `emitListingEvent()` call on create/update/sold |
| `src/actions/showings.ts` | Modify | Add `emitEvent()` call on status changes |
| `src/actions/contacts.ts` | Modify | Add `emitContactEvent()` call on create/stage change |
| `src/app/api/webhooks/resend/route.ts` | Modify | Add `emitEngagementEvent()` call in `updateContactIntelligence` |

**`src/lib/ai-agent/event-emitter.ts` -- Key Signatures:**

```typescript
export async function emitEvent(
  eventType: string,
  contactId: string | null,
  listingId: string | null,
  payload: Record<string, unknown>
): Promise<void>

export async function emitListingEvent(
  listingId: string,
  eventType: 'listing_created' | 'listing_updated' | 'listing_sold' | 'listing_price_change',
  payload: Record<string, unknown>
): Promise<void>

export async function emitContactEvent(
  contactId: string,
  eventType: 'contact_created' | 'contact_stage_changed' | 'contact_tag_added',
  payload: Record<string, unknown>
): Promise<void>

export async function emitEngagementEvent(
  contactId: string,
  eventType: 'email_clicked' | 'email_opened' | 'high_intent_click' | 'engagement_spike',
  payload: Record<string, unknown>
): Promise<void>
```

**Integration Points:**
- In `src/actions/listings.ts`, the existing `createListing()` and `updateListing()` functions currently do `supabase.from("listings").insert(...)` / `.update(...)`. After the mutation succeeds, add `await emitListingEvent(listingId, 'listing_created', { address, list_price, bedrooms, ... })`.
- In `src/app/api/webhooks/resend/route.ts`, the existing `updateContactIntelligence()` function (line 171) already classifies link types. After it updates the contact intelligence, add `await emitEngagementEvent(contactId, 'email_clicked', { linkType, linkUrl, newsletterId })`. For high-intent clicks (showing/cma/contact_agent already detected at line 252), also emit `high_intent_click`.

**Evals & Tests:**
- Insert a listing via action -> verify event row in `agent_events`
- Book a showing -> verify `showing_confirmed` event
- Resend webhook click -> verify both `newsletter_events` row AND `agent_events` row
- Query unprocessed events -> get correct count
- Events older than 24h still unprocessed -> monitoring alert

---

### Deliverable 1.2: Contact Agent Evaluator (Core Engine)

**User Story:** As a realtor, I want each contact to have an AI agent that evaluates events and decides what action to take, so that communications are personalized and timely.

**Acceptance Criteria:**
- Given an unprocessed `listing_created` event exists, When the agent evaluator cron runs, Then for each buyer contact the AI evaluates relevance (area match, beds, price range) and creates a newsletter draft if relevance_score > 65
- Given an unprocessed `email_clicked` event of type `listing`, When evaluated, Then if 3+ listing clicks in 7 days for same area, emit `high_intent_click` and generate a targeted listing alert
- Given no events exist for a contact in 14 days, When the evaluator runs, Then skip (do not spam)
- The evaluator processes max 100 events per cron run, marks them `processed = true`
- Each evaluation produces a structured `AgentDecision` record saved to `agent_decisions`

**Database Changes (add to migration 016):**

```sql
CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_id UUID REFERENCES agent_events(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('send', 'skip', 'defer', 'suppress')),
  email_type TEXT,
  reasoning TEXT NOT NULL,
  relevance_score FLOAT,
  confidence FLOAT,
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  outcome TEXT CHECK (outcome IN (
    'draft_created', 'sent', 'approved', 'edited', 'skipped_by_user',
    'suppressed', 'ghost_stored', 'recalled', NULL
  )),
  newsletter_id UUID REFERENCES newsletters(id) ON DELETE SET NULL,
  trust_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_decisions_contact ON agent_decisions(contact_id, created_at);
CREATE INDEX idx_agent_decisions_outcome ON agent_decisions(outcome);
CREATE INDEX idx_agent_decisions_decision ON agent_decisions(decision, created_at);

ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage agent_decisions"
  ON agent_decisions FOR ALL USING (true);
```

**Files to Create:**

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ai-agent/contact-evaluator.ts` | Create | Core per-contact evaluation engine |
| `src/app/api/cron/agent-evaluate/route.ts` | Create | Cron endpoint, runs every 5 min |

**`src/lib/ai-agent/contact-evaluator.ts` -- Key Signatures:**

```typescript
interface AgentEvent {
  id: string;
  event_type: string;
  contact_id: string | null;
  listing_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface ContactWithIntel {
  id: string;
  name: string;
  type: string;
  email: string | null;
  stage_bar: string | null;
  buyer_preferences: Record<string, any> | null;
  newsletter_intelligence: Record<string, any> | null;
  ai_lead_score: Record<string, any> | null;
  agent_enabled: boolean;
  agent_never_email: boolean;
  agent_frequency_pref: string | null;
  agent_topic_avoid: string[];
}

interface AgentDecision {
  contactId: string;
  eventId: string;
  decision: 'send' | 'skip' | 'defer' | 'suppress';
  emailType?: string;
  reasoning: string;
  relevanceScore: number;
  confidence: number;
  contextSnapshot: Record<string, unknown>;
}

// Process batch of unprocessed events
export async function processEventBatch(
  limit?: number
): Promise<{ processed: number; decisions: number; errors: number }>

// For listing events: find all matching buyer contacts and evaluate each
async function evaluateListingEventForAllContacts(
  event: AgentEvent
): Promise<AgentDecision[]>

// For contact-specific events (click, stage change): evaluate just that contact
async function evaluateContactEvent(
  event: AgentEvent
): Promise<AgentDecision | null>

// Single contact evaluation via Claude AI
async function evaluateEventForContact(
  event: AgentEvent,
  contact: ContactWithIntel,
  recentHistory: { emailsSent7d: number; lastEmailAt: string | null; recentClicks: any[] }
): Promise<AgentDecision>
```

**AI System Prompt for Evaluator:**

```
You are an email marketing agent for a BC real estate CRM. You evaluate whether
a specific CRM event warrants sending an email to a specific contact.

EVALUATION CRITERIA:
- Area match: Does the contact's interest areas overlap with the listing area?
- Price match: Is the listing within +/-20% of contact's stated budget?
- Bedrooms/type: Do property attributes match preferences?
- Engagement recency: Has the contact engaged in the last 30 days?
- Frequency check: How many emails have they received in the last 7 days?
- Journey phase: Are they in a phase where this email type makes sense?
- Behavioral signals: Recent click patterns suggesting interest shift

OUTPUT (valid JSON only):
{
  "decision": "send|skip|defer|suppress",
  "email_type": "new_listing_alert",
  "reasoning": "Area match (Kitsilano), price in range ($750K vs budget), 2 listing clicks this week",
  "relevance_score": 82,
  "confidence": 0.85
}

RULES:
- "defer": relevant but bad timing (too many recent emails, low engagement period). Re-evaluate later.
- "suppress": not relevant. Do not re-evaluate for this event.
- "skip": marginally relevant but not worth sending. Move on.
- Only "send" if relevance_score > 65 AND confidence > 0.6
- Use model claude-haiku for cost efficiency (this is a high-volume call)
```

**Cost Note:** Use `claude-haiku` for event evaluation (cheapest, fast). The existing lead-scorer and newsletter-ai already use `claude-sonnet`. The evaluator needs to be cheap because it runs at high volume (potentially hundreds of event-contact pairs per cron cycle).

**Cron Route Pattern (follows existing pattern at `/api/cron/agent-scoring/route.ts`):**

```typescript
// src/app/api/cron/agent-evaluate/route.ts
// GET, protected by CRON_SECRET bearer token
// Calls processEventBatch(100)
// Returns { ok, processed, decisions, errors, processedAt }
```

**Evals & Tests:**
- New listing in Kitsilano, buyer contact with Kits preference -> decision = send, relevance > 70
- New listing in Surrey, buyer interested in Vancouver only -> decision = suppress
- Contact received 3 emails in last 7 days + relevant listing -> decision = defer
- Dormant contact with 0 engagement in 90 days -> decision = skip
- Run batch of 50 events -> all marked processed, decisions logged
- Contact with `agent_enabled = false` -> skipped entirely
- Contact with `agent_never_email = true` -> suppressed immediately (no AI call)

---

### Deliverable 1.3: Replace Journey Hardcoded Schedules

**User Story:** As a realtor, I want the AI agent to decide email timing dynamically based on contact behavior, rather than fixed 72h/168h/336h delays.

**Acceptance Criteria:**
- Given a contact journey has `agent_mode = 'agent_driven'`, When events occur, Then the agent evaluator handles all email decisions (no hardcoded schedule)
- Given a contact journey has `agent_mode = 'schedule'`, When the existing processJourneyQueue cron runs, Then the existing behavior is preserved exactly
- The `JOURNEY_SCHEDULES` constant in `src/actions/journeys.ts` is kept as a fallback
- New contacts default to `agent_mode = 'schedule'` for backward compatibility

**Database Changes (add to migration 016):**

```sql
ALTER TABLE contact_journeys ADD COLUMN IF NOT EXISTS
  agent_mode TEXT NOT NULL DEFAULT 'schedule'
  CHECK (agent_mode IN ('schedule', 'agent_driven'));
```

**Files to Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/actions/journeys.ts` | Modify | Add agent_mode parameter to `enrollContactInJourney()`, skip scheduling `next_email_at` when agent_driven |
| `src/lib/ai-agent/contact-evaluator.ts` | Modify | Check `agent_mode` before evaluating; respect journey phase context |

**Key change in `enrollContactInJourney()`:** When `agent_mode = 'agent_driven'`, set `next_email_at = null` (the agent evaluator decides timing). When `agent_mode = 'schedule'`, existing behavior preserved exactly.

**Dependencies:** Deliverables 1.1 and 1.2.

**Evals & Tests:**
- Enroll contact with `agent_mode = 'agent_driven'` -> no hardcoded `next_email_at` set
- New listing event -> agent evaluator picks it up and generates email for agent_driven contacts
- Enroll contact with `agent_mode = 'schedule'` -> existing behavior preserved exactly
- `processJourneyQueue()` only processes contacts with `agent_mode = 'schedule'`

---

## Phase 2: Progressive Trust System (4 Levels)

**Goal:** Implement a 4-level trust system where the agent earns autonomy through demonstrated good judgment, measured by realtor edit rates.

### Deliverable 2.1: Trust Level Schema + Trust Manager

**User Story:** As a realtor, I want to control how much autonomy the AI agent has, starting with full review ("Ghost Mode") and progressing to autonomous sending as I build trust.

**Acceptance Criteria:**
- Given a new CRM instance, When the system initializes, Then global trust level defaults to `ghost`
- Given trust level is `ghost`, When the agent wants to send, Then email is drafted but NOT queued for review -- stored in `ghost_drafts` for comparison only
- Given trust level is `copilot`, When the agent wants to send, Then email is queued for review (existing approval queue behavior)
- Given trust level is `supervised`, When the agent wants to send, Then email is auto-sent but realtor can recall within 30 min
- Given trust level is `autonomous`, When the agent wants to send, Then email is auto-sent with no recall
- Trust promotion requires: 20+ emails at current level, less than 15% edit rate, more than 50% approval rate
- Trust can be manually set by the realtor at any time (override)
- Per-contact trust override is available

**Database Changes -- Migration `017_progressive_trust.sql`:**

```sql
CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO agent_settings (key, value) VALUES
  ('global_trust_level', '"ghost"'),
  ('trust_promotion_threshold', '{"min_emails": 20, "max_edit_rate": 0.15, "min_approval_rate": 0.50}'),
  ('send_governor', '{"weekly_cap": 3, "daily_cap": 1, "min_gap_hours": 24}')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage agent_settings"
  ON agent_settings FOR ALL USING (true);

-- Per-contact agent settings
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_trust_level TEXT
  CHECK (agent_trust_level IN ('ghost', 'copilot', 'supervised', 'autonomous', NULL));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_never_email BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_frequency_pref TEXT
  CHECK (agent_frequency_pref IN ('aggressive', 'normal', 'conservative', 'minimal', NULL));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_topic_avoid JSONB DEFAULT '[]'::jsonb;

-- Ghost mode drafts
CREATE TABLE IF NOT EXISTS ghost_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES agent_decisions(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  ai_context JSONB DEFAULT '{}'::jsonb,
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recall window for supervised mode
CREATE TABLE IF NOT EXISTS email_recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  recalled BOOLEAN NOT NULL DEFAULT false,
  recalled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_recalls_active ON email_recalls(expires_at)
  WHERE recalled = false;

-- Trust audit log
CREATE TABLE IF NOT EXISTS trust_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_level TEXT NOT NULL,
  new_level TEXT NOT NULL,
  reason TEXT NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('auto_promotion', 'manual', 'demotion')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ghost_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_ghost_drafts" ON ghost_drafts FOR ALL USING (true);
CREATE POLICY "auth_email_recalls" ON email_recalls FOR ALL USING (true);
CREATE POLICY "auth_trust_audit_log" ON trust_audit_log FOR ALL USING (true);
```

**Files to Create:**

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ai-agent/trust-manager.ts` | Create | Trust level resolution, promotion logic, metrics |
| `src/lib/ai-agent/trust-gate.ts` | Create | Route agent decisions through trust level |
| `src/actions/agent-settings.ts` | Create | Server actions for global + per-contact settings |
| `src/app/api/cron/trust-promotion/route.ts` | Create | Daily check for trust promotion eligibility |

**`src/lib/ai-agent/trust-manager.ts` -- Key Signatures:**

```typescript
type TrustLevel = 'ghost' | 'copilot' | 'supervised' | 'autonomous';

export async function getEffectiveTrustLevel(contactId?: string): Promise<TrustLevel>

export async function getGlobalTrustLevel(): Promise<TrustLevel>

export async function setGlobalTrustLevel(level: TrustLevel, reason: string): Promise<void>

export async function setContactTrustOverride(
  contactId: string,
  level: TrustLevel | null
): Promise<void>

export async function evaluateTrustPromotion(): Promise<{
  eligible: boolean;
  currentLevel: TrustLevel;
  suggestedLevel: TrustLevel | null;
  metrics: TrustMetrics;
}>

interface TrustMetrics {
  emailsAtCurrentLevel: number;
  editRate: number;
  approvalRate: number;
  skipRate: number;
  avgEditDistance: number;
}

export async function calculateTrustMetrics(since?: Date): Promise<TrustMetrics>
```

**`src/lib/ai-agent/trust-gate.ts` -- Key Signature:**

```typescript
export async function applyTrustGate(
  decision: AgentDecision,
  generatedEmail: { subject: string; htmlBody: string; aiContext: Record<string, unknown> }
): Promise<{
  action: 'ghost_stored' | 'queued_for_review' | 'sent_with_recall' | 'sent_autonomous';
  newsletterId?: string;
  ghostDraftId?: string;
  recallId?: string;
}>
```

Trust gate logic:
- `ghost`: Create row in `ghost_drafts`, return `ghost_stored`
- `copilot`: Call existing `generateAndQueueNewsletter()` with `send_mode = 'review'`, return `queued_for_review`
- `supervised`: Call `generateAndQueueNewsletter()` with `send_mode = 'auto'`, create `email_recalls` row with 30 min TTL, return `sent_with_recall`
- `autonomous`: Call `generateAndQueueNewsletter()` with `send_mode = 'auto'`, return `sent_autonomous`

**`src/actions/agent-settings.ts` -- Key Signatures:**

```typescript
export async function getAgentSettings(): Promise<Record<string, any>>
export async function updateGlobalTrustLevel(level: TrustLevel): Promise<void>
export async function updateContactAgentSettings(contactId: string, settings: Partial<ContactAgentSettings>): Promise<void>
export async function recallEmail(recallId: string): Promise<{ success: boolean; error?: string }>
```

**Dependencies:** Phase 1 complete.

---

### Deliverable 2.2: Trust Level UI + Per-Contact Agent Controls

**User Story:** As a realtor, I want to see and control the current trust level from the newsletter control panel, and override it per contact.

**Acceptance Criteria:**
- Given I navigate to `/newsletters/control`, When I view the Agent Trust tab, Then I see the current global trust level with a visual stepper (ghost -> copilot -> supervised -> autonomous)
- Given I click "Change Trust Level", When I select a new level, Then it updates globally with a confirmation dialog
- Given I view a contact's detail page, When I scroll to "AI Agent" section, Then I see: agent on/off toggle, trust override dropdown, frequency preference, topic avoidance tags, "never email" checkbox
- Given the system has processed 20+ emails at copilot level with less than 15% edit rate, When I visit the control panel, Then I see a "Promote to Supervised" suggestion with metrics

**Files to Create/Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/components/newsletters/TrustLevelPanel.tsx` | Create | Global trust level stepper + controls |
| `src/components/contacts/ContactAgentControls.tsx` | Create | Per-contact agent settings form |
| `src/app/(dashboard)/newsletters/control/page.tsx` | Modify | Add Agent Trust tab to existing 4-tab layout |

**UI -- Trust Level Panel (within control page):**

The panel displays 4 steps (Ghost, Copilot, Supervised, Autonomous) as a horizontal stepper with the current level highlighted. Below shows the promotion metrics (emails processed at this level, edit rate, approval rate) and whether promotion criteria are met. A dropdown or button set allows manual override.

**UI -- Per-Contact Agent Controls:**

Rendered as an `lf-card` section on the contact detail page. Contains:
- Toggle: "Agent Enabled" (boolean)
- Select: "Trust Override" (Ghost / Copilot / Supervised / Autonomous / Inherit Global)
- Select: "Frequency Preference" (Aggressive / Normal / Conservative / Minimal)
- Checkbox: "Never Email This Contact"
- Tag input: "Topic Avoidance" (multi-select from: market updates, open houses, listing alerts, etc.)
- Read-only stats: Agent decisions count for last 30 days

**Evals & Tests:**
- Change global trust to copilot -> agent_settings row updated, trust_audit_log entry created
- Set contact override to supervised -> contacts.agent_trust_level updated
- `getEffectiveTrustLevel(contactId)` returns contact override when set, global when null

---

## Phase 3: Explainability & Transparency Layer

### Deliverable 3.1: Reasoning Panel on Approval Queue

**User Story:** As a realtor, I want to see why the AI chose to send a specific email to a specific contact, so I can make informed approval decisions.

**Acceptance Criteria:**
- Given an email is in the approval queue with an associated `agent_decisions` record, When I expand it, Then I see: triggering event, relevance score (0-100), key matching factors, confidence level, alternative considerations
- Given the AI considered but rejected an alternative email type, When I view reasoning, Then I see "Also considered: Market Update (scored 45, skipped because sent 3 days ago)"
- The reasoning panel is collapsible (hidden by default)
- Queue items without an agent decision (legacy emails) show "No AI evaluation available"

**Files to Create/Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/components/newsletters/ReasoningPanel.tsx` | Create | Expandable reasoning display component |
| `src/components/newsletters/ApprovalQueueClient.tsx` | Modify | Add reasoning toggle below each queue item, expand QueueItem interface to include decision data |
| `src/actions/newsletters.ts` | Modify | Join `agent_decisions` in `getApprovalQueue()` query |

**Modification to `getApprovalQueue()` in `src/actions/newsletters.ts`:** The current query at line 363 selects `"*, contacts(id, name, email, type)"`. Modify to also fetch the associated agent decision: after fetching newsletters, do a separate query to `agent_decisions` where `newsletter_id` matches, and attach the decision data to each queue item.

**ReasoningPanel Props:**

```typescript
interface ReasoningPanelProps {
  decision: {
    reasoning: string;
    relevanceScore: number;
    confidence: number;
    contextSnapshot: {
      triggeringEvent?: string;
      matchFactors?: Array<{ factor: string; match: boolean; detail: string }>;
      alternatives?: Array<{ emailType: string; score: number; reason: string }>;
    };
  } | null;
}
```

---

### Deliverable 3.2: Suppression Log ("What I Held Back")

**User Story:** As a realtor, I want to see what emails the AI decided NOT to send, so I can verify the agent is not missing opportunities.

**Acceptance Criteria:**
- Given the agent made `skip`, `defer`, or `suppress` decisions, When I navigate to `/newsletters/suppressions`, Then I see a list of held-back emails with reasoning
- Given a suppressed email was wrong (I wanted to send it), When I click "Send Anyway", Then a new email is generated and queued for that contact/type
- Filter by: date range, decision type, contact name
- Sorted by created_at descending (most recent first)

**Files to Create:**

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(dashboard)/newsletters/suppressions/page.tsx` | Create | Server component, fetches suppressed decisions |
| `src/components/newsletters/SuppressionLogClient.tsx` | Create | Interactive list with filters + "Send Anyway" |
| `src/actions/agent-decisions.ts` | Create | `getSuppressedDecisions()`, `sendAnyway()` |

**`src/actions/agent-decisions.ts` -- Key Signatures:**

```typescript
export async function getSuppressedDecisions(filters?: {
  decisionType?: 'skip' | 'defer' | 'suppress';
  contactId?: string;
  days?: number;
}): Promise<SuppressionRow[]>

export async function sendAnyway(decisionId: string): Promise<{ success: boolean; newsletterId?: string }>
// Creates a newsletter draft via generateAndQueueNewsletter using the decision's contact and email_type

export async function getDecisionsByContact(contactId: string, limit?: number): Promise<AgentDecisionRow[]>
```

**UI Layout:** Follow the existing newsletter pages pattern (lf-glass header, lf-card list items). Each suppression row shows: decision badge (skip=yellow, defer=orange, suppress=red), contact name, email type, reasoning text, relevance score, created_at timestamp, and two action buttons: "Send Anyway" (lf-btn-sm) and "Dismiss" (lf-btn-ghost).

---

### Deliverable 3.3: Ghost Mode Comparison View

**User Story:** As a realtor in Ghost Mode, I want to compare what the AI would have sent versus what I actually sent, so I can evaluate agent quality before trusting it.

**Acceptance Criteria:**
- Given trust level = ghost, When I navigate to `/newsletters/ghost`, Then I see a side-by-side of ghost drafts vs actually sent emails for the same contacts
- Given a ghost draft exists for a contact who also received a manual email, When viewed, Then both are shown side-by-side
- Given ghost drafts exist with no corresponding manual email, When viewed, Then they show as "Missed opportunity"
- A "match rate" metric shows how often the AI agreed with what the realtor sent

**Files to Create:**

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(dashboard)/newsletters/ghost/page.tsx` | Create | Ghost comparison page |
| `src/components/newsletters/GhostComparisonClient.tsx` | Create | Side-by-side comparison |
| `src/actions/ghost-drafts.ts` | Create | Fetch ghost drafts, match with real sent emails |

**`src/actions/ghost-drafts.ts` -- Key Signatures:**

```typescript
export async function getGhostComparisons(days?: number): Promise<{
  matchRate: number;
  comparisons: GhostComparison[];
}>

interface GhostComparison {
  ghostDraft: { id: string; contactName: string; emailType: string; subject: string; htmlBody: string; reasoning: string; relevanceScore: number; createdAt: string };
  actualEmail: { id: string; subject: string; htmlBody: string; sentAt: string } | null;
  similarity: number; // 0-1 based on fuzzy match of subjects
}
```

The matching logic: For each ghost draft, look for a newsletter sent to the same contact_id within +/- 48 hours. If found, compute similarity using the existing `src/lib/fuzzy-match.ts` (Jaro-Winkler) on the subject lines.

**Dependencies:** Deliverable 2.1 (ghost_drafts table exists, trust gate stores ghost drafts).

---

## Phase 4: Voice Learning & Edit Intelligence

### Deliverable 4.1: Inline Email Editor on Approval Queue

**User Story:** As a realtor, I want to edit AI-generated emails directly in the approval queue before sending, so I can adjust tone or add personal details.

**Acceptance Criteria:**
- Given an email is in the approval queue, When I click "Edit", Then the preview panel switches to an editable mode with: editable subject input field, editable body textarea (or basic rich text), Save & Send button, Cancel button
- Given I edit the subject and body, When I click "Save & Send", Then the newsletter is updated with my edits, the original content is preserved for comparison, and the email is sent
- Given I edit an email, When saved, Then `edit_distance` is calculated (0.0 = no changes, 1.0 = complete rewrite) and stored
- The original AI content is stored in `original_subject` and `original_html_body`

**Database Changes -- Migration `018_edit_intelligence.sql`:**

```sql
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS original_subject TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS original_html_body TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS edit_distance FLOAT;

CREATE TABLE IF NOT EXISTS voice_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'tone', 'greeting', 'sign_off', 'vocabulary', 'structure',
    'subject_line', 'avoid', 'always_include'
  )),
  rule_text TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  source_count INT NOT NULL DEFAULT 1,
  examples JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  original_subject TEXT NOT NULL,
  edited_subject TEXT NOT NULL,
  original_body_excerpt TEXT NOT NULL,
  edited_body_excerpt TEXT NOT NULL,
  edit_distance FLOAT NOT NULL,
  edit_type TEXT CHECK (edit_type IN (
    'minor_tweak', 'tone_change', 'content_change', 'major_rewrite'
  )),
  extracted_rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE voice_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_voice_rules" ON voice_rules FOR ALL USING (true);
CREATE POLICY "auth_edit_history" ON edit_history FOR ALL USING (true);
```

**Files to Create/Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/components/newsletters/InlineEmailEditor.tsx` | Create | Editable subject + body with preview toggle |
| `src/components/newsletters/ApprovalQueueClient.tsx` | Modify | Add "Edit" button, toggle between preview and edit mode |
| `src/actions/newsletters.ts` | Modify | Add `editAndSendNewsletter()` server action |

**`editAndSendNewsletter()` in `src/actions/newsletters.ts`:**

```typescript
export async function editAndSendNewsletter(
  newsletterId: string,
  editedSubject: string,
  editedHtmlBody: string
): Promise<{ success: boolean; editDistance: number; error?: string }>
```

This function: (1) fetches original newsletter, (2) stores originals in `original_subject`/`original_html_body`, (3) updates with edited content, (4) calculates edit distance using Jaro-Winkler from `src/lib/fuzzy-match.ts` (1 - similarity), (5) creates `edit_history` row, (6) sends via existing `sendNewsletter()`, (7) updates `agent_decisions.outcome` to `'edited'`.

**InlineEmailEditor component:** A client component that receives the current subject/body, renders them in editable inputs (subject as `<input>`, body as `<textarea>` with basic formatting), and calls the `editAndSendNewsletter` action on save. The edit distance classification: < 0.1 = minor_tweak, < 0.3 = tone_change, < 0.6 = content_change, >= 0.6 = major_rewrite.

---

### Deliverable 4.2: Voice Learning Engine

**User Story:** As a realtor, I want the AI to learn my writing style from my edits, so that future emails sound more like me.

**Acceptance Criteria:**
- Given 10+ edited emails exist in `edit_history`, When the voice learning cron runs, Then it extracts patterns via Claude (e.g., greeting preference, tone, vocabulary)
- Given voice rules exist with `is_active = true`, When the newsletter AI generates content, Then `buildSystemPrompt()` in `src/lib/newsletter-ai.ts` includes a voice rules block
- Given a new rule conflicts with an existing one, Then the higher-confidence rule wins
- A Voice Profile page at `/newsletters/voice` shows all rules with toggle on/off and example edits

**Files to Create/Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ai-agent/voice-learner.ts` | Create | Extract voice rules from edit history via Claude |
| `src/app/api/cron/voice-learning/route.ts` | Create | Daily cron to process recent edits |
| `src/lib/newsletter-ai.ts` | Modify | Add voice rules to system prompt in `buildSystemPrompt()` |
| `src/app/(dashboard)/newsletters/voice/page.tsx` | Create | Voice profile management page |
| `src/components/newsletters/VoiceProfileClient.tsx` | Create | Voice rules list with toggles |
| `src/actions/voice-rules.ts` | Create | CRUD for voice rules |

**`src/lib/ai-agent/voice-learner.ts` -- Key Signatures:**

```typescript
export async function extractVoiceRules(
  recentEdits: EditHistoryRow[]
): Promise<VoiceRule[]>

export async function getActiveVoiceRules(): Promise<VoiceRule[]>

export async function buildVoiceRulesPromptBlock(): Promise<string>
```

**Modification to `src/lib/newsletter-ai.ts`:** In `buildSystemPrompt()` (line 141), after the existing `hintsBlock`, add:

```typescript
const voiceBlock = await buildVoiceRulesPromptBlock();
// Append to system prompt:
// YOUR VOICE RULES (learned from past edits):
// - Always start with "Hey [name]" not "Hello"
// - Keep paragraphs to 2-3 sentences
// - Avoid exclamation marks in subject lines
// Follow these rules closely — they reflect the realtor's personal style.
```

**AI Prompt for Voice Extraction:**

```
Analyze these email edits where a realtor revised AI-generated content.
For each pair (original -> edited), identify consistent patterns in:
1. Greeting style
2. Sign-off style
3. Tone (formal vs casual vs warm)
4. Vocabulary preferences
5. Structure preferences
6. Subject line patterns
7. Things always added
8. Things always removed

Output JSON array. Only include rules with 2+ supporting examples.
Confidence: 0.5 for 2 examples, +0.1 per additional example, cap at 0.95.
```

**Dependencies:** Deliverable 4.1.

---

## Phase 5: Advanced Send Governor + Dynamic Timing

### Deliverable 5.1: Send Governor (Caps, Throttling, Sunset)

**User Story:** As a realtor, I want the AI to respect smart sending limits and automatically stop emailing unengaged contacts.

**Acceptance Criteria:**
- Given a contact has received N emails this week (where N >= weekly_cap from agent_settings), When the agent wants to send, Then decision = `defer` with reason "weekly cap reached"
- Given a contact has not opened any of the last 5 emails, When evaluated, Then auto-sunset: set `contacts.auto_sunset = true`, suppress further emails
- Given a contact in auto-sunset receives a manual inbound communication, When detected, Then sunset is lifted
- Configurable caps: daily_cap, weekly_cap, min_gap_hours (from `agent_settings`)
- Bounce rate monitoring: if > 5% in last 7 days, trigger global pause recommendation

**Database Changes -- Migration `019_send_governor.sql`:**

```sql
CREATE TABLE IF NOT EXISTS send_governor_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  newsletter_id UUID REFERENCES newsletters(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_number INT NOT NULL DEFAULT EXTRACT(WEEK FROM NOW())::INT,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT
);

CREATE INDEX idx_governor_contact_week ON send_governor_log(contact_id, year, week_number);
CREATE INDEX idx_governor_contact_recent ON send_governor_log(contact_id, sent_at);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS auto_sunset BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sunset_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sunset_reason TEXT;

ALTER TABLE send_governor_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_send_governor_log" ON send_governor_log FOR ALL USING (true);
```

**Files to Create/Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ai-agent/send-governor.ts` | Create | Frequency caps, sunset, deliverability checks |
| `src/lib/ai-agent/contact-evaluator.ts` | Modify | Call governor BEFORE AI evaluation to short-circuit |
| `src/actions/newsletters.ts` | Modify | Call `logSend()` after successful send |

**`src/lib/ai-agent/send-governor.ts` -- Key Signatures:**

```typescript
interface GovernorResult {
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: Date;
}

export async function checkGovernor(contactId: string): Promise<GovernorResult>
export async function logSend(contactId: string, emailType: string, newsletterId?: string): Promise<void>
export async function checkAutoSunset(contactId: string): Promise<{ shouldSunset: boolean; reason?: string }>
export async function liftSunset(contactId: string): Promise<void>
export async function getDeliverabilityMetrics(days?: number): Promise<{
  bounceRate: number;
  complaintRate: number;
  shouldPause: boolean;
}>
```

**Integration into evaluator:** In `processEventBatch()` in `contact-evaluator.ts`, before calling Claude for evaluation, call `checkGovernor(contactId)`. If `allowed = false`, immediately create an `agent_decisions` row with `decision = 'defer'` and the governor's reason. This avoids wasting AI API calls.

---

### Deliverable 5.2: Dynamic Send Timing

**User Story:** As a realtor, I want emails sent at the optimal time for each contact based on their engagement patterns.

**Acceptance Criteria:**
- Given a contact consistently opens emails between 8-10 AM (from `newsletter_events` open timestamps), When scheduling, Then target that window
- Given no open-time data for a contact, Then use default (Tuesday/Thursday 9 AM PST)
- The timing optimizer returns a `scheduledFor` timestamp that the evaluator uses when creating deferred sends
- `agent_decisions` with `decision = 'send'` include a `scheduled_send_at` in the context_snapshot

**Files to Create/Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ai-agent/timing-optimizer.ts` | Create | Analyze open patterns, compute optimal time |
| `src/lib/ai-agent/contact-evaluator.ts` | Modify | Use timing optimizer output when creating send decisions |

**`src/lib/ai-agent/timing-optimizer.ts` -- Key Signatures:**

```typescript
export async function getOptimalSendTime(contactId: string): Promise<{
  scheduledFor: Date;
  confidence: number;
  basis: 'historical_opens' | 'day_of_week_pattern' | 'default';
}>

export async function analyzeOpenTimePatterns(contactId: string): Promise<{
  preferredHours: number[];
  preferredDays: number[];
  sampleSize: number;
}>
```

**Implementation:** Query `newsletter_events` where `event_type = 'opened'` and `contact_id = X`, extract hour-of-day from `created_at`, build a histogram. If sample size >= 5, use the peak hour. Otherwise, fall back to default. The scheduled time is stored in the newsletter's `ai_context` JSONB field as `scheduled_send_at`.

**Dependencies:** Phase 1 (events table for open timestamps), existing newsletter_events already track opens.

---

## Phase 6: Agent Dashboard Redesign + Overnight Summary

### Deliverable 6.1: "What Your AI Did Overnight" Summary

**User Story:** As a realtor starting my day, I want a morning summary of what the AI agent did overnight.

**Acceptance Criteria:**
- Given I open the dashboard after overnight activity, When agent decisions exist from 10 PM - 8 AM, Then I see a summary card with counts of sent, held back, and hot lead alerts
- Given emails were auto-sent (supervised/autonomous), Then I can see each one with a quick-recall button (if within recall window)
- Given the AI held back emails, Then I see why each was held with a "Send Anyway" option
- The summary covers the period from last dashboard visit (or last 12 hours, whichever is shorter)

**Files to Create/Modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/components/dashboard/OvernightSummary.tsx` | Create | Morning summary card component |
| `src/actions/agent-summary.ts` | Create | Aggregate overnight agent activity |
| `src/app/(dashboard)/page.tsx` | Modify | Add OvernightSummary above existing AIRecommendations widget (line 25 area) |

**`src/actions/agent-summary.ts` -- Key Signatures:**

```typescript
interface OvernightSummary {
  period: { from: string; to: string };
  emailsSent: Array<{
    newsletterId: string;
    contactName: string;
    emailType: string;
    subject: string;
    sentAt: string;
    canRecall: boolean;
    recallId?: string;
  }>;
  emailsHeldBack: Array<{
    decisionId: string;
    contactName: string;
    emailType: string;
    reasoning: string;
    relevanceScore: number;
  }>;
  hotLeadAlerts: Array<{
    contactName: string;
    contactId: string;
    action: string;
    timestamp: string;
  }>;
  agentDecisionCounts: {
    send: number;
    skip: number;
    defer: number;
    suppress: number;
  };
}

export async function getOvernightSummary(): Promise<OvernightSummary>
```

**UI Pattern:** Follow the existing AIRecommendations component pattern (line 58 of `src/components/dashboard/AIRecommendations.tsx`): glass container, emoji-led sections, compact cards with action buttons. The overnight summary sits at the top of the dashboard page, above PipelineSnapshot.

---

### Deliverable 6.2: Agent Activity Feed

**User Story:** As a realtor, I want a real-time feed of all AI agent activity so I have full operational visibility.

**Acceptance Criteria:**
- Given I navigate to `/newsletters/activity`, Then I see a chronological feed of all agent decisions
- Filter by: decision type (send/skip/defer/suppress), contact name, date range
- Each entry shows: timestamp, contact name, event that triggered it, decision, reasoning excerpt, outcome (if resolved)
- Pagination: load 50 at a time with "Load More"

**Files to Create:**

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(dashboard)/newsletters/activity/page.tsx` | Create | Activity feed page |
| `src/components/newsletters/AgentActivityFeed.tsx` | Create | Filterable activity list |
| `src/actions/agent-decisions.ts` | Modify | Add `getActivityFeed()` with filters and pagination |

---

### Deliverable 6.3: Agent Insights + Learning Report

**User Story:** As a realtor, I want monthly insights on agent performance so I can decide whether to increase trust.

**Acceptance Criteria:**
- Given 30+ days of agent activity, When I view `/newsletters/insights`, Then I see: edit rate trend (weekly buckets), approval rate trend, open rates (AI-sent vs manual), suppression accuracy report
- Given the edit rate is declining, Then show encouragement text
- Given enough data for trust promotion, Then show "Upgrade to [next level]" CTA

**Files to Create:**

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(dashboard)/newsletters/insights/page.tsx` | Create | Insights page |
| `src/components/newsletters/InsightsClient.tsx` | Create | Metrics display with trend indicators |
| `src/actions/agent-insights.ts` | Create | Aggregate metrics by week, compute trends |

**`src/actions/agent-insights.ts` -- Key Signatures:**

```typescript
export async function getAgentInsights(days?: number): Promise<{
  editRateTrend: Array<{ week: string; rate: number }>;
  approvalRateTrend: Array<{ week: string; rate: number }>;
  openRateComparison: { aiSent: number; manualSent: number };
  topPerformingEmailTypes: Array<{ type: string; openRate: number; clickRate: number }>;
  trustPromotionEligible: boolean;
  trustMetrics: TrustMetrics;
}>
```

---

## Implementation Sequence & Dependencies

```
Phase 1 (Foundation) .............. 3-4 days
  1.1 Event Pipeline
  1.2 Contact Evaluator
  1.3 Replace Journeys
         |
Phase 2 (Trust) .................. 2-3 days
  2.1 Trust Schema + Manager
  2.2 Trust UI + Contact Controls
         |
Phase 3 (Explainability) ........ 2-3 days
  3.1 Reasoning Panel
  3.2 Suppression Log
  3.3 Ghost Comparison
         |
Phase 4 (Voice Learning) ........ 2-3 days
  4.1 Inline Editor
  4.2 Voice Learning Engine
         |
Phase 5 (Governor + Timing) ..... 1-2 days
  5.1 Send Governor
  5.2 Dynamic Timing
         |
Phase 6 (Dashboard) ............. 2-3 days
  6.1 Overnight Summary
  6.2 Activity Feed
  6.3 Insights

Total: 12-18 days
```

---

## New Environment Variables

```
AI_AGENT_ENABLED=true               # Master kill switch for agent system
AI_AGENT_EVAL_MODEL=claude-haiku    # Cheap model for event evaluation
AGENT_EVAL_BATCH_SIZE=100           # Events per cron run
```

The existing `AI_SEND_ADVISOR`, `AI_SCORING_MODEL`, and `CRON_SECRET` variables remain unchanged.

---

## Migration Summary

| Migration File | New Tables | New Columns |
|---------------|------------|-------------|
| `016_agent_event_pipeline.sql` | `agent_events`, `agent_decisions` | `contact_journeys.agent_mode` |
| `017_progressive_trust.sql` | `agent_settings`, `ghost_drafts`, `email_recalls`, `trust_audit_log` | `contacts.agent_trust_level`, `contacts.agent_enabled`, `contacts.agent_never_email`, `contacts.agent_frequency_pref`, `contacts.agent_topic_avoid` |
| `018_edit_intelligence.sql` | `voice_rules`, `edit_history` | `newsletters.original_subject`, `newsletters.original_html_body`, `newsletters.edited_at`, `newsletters.edit_distance` |
| `019_send_governor.sql` | `send_governor_log` | `contacts.auto_sunset`, `contacts.sunset_at`, `contacts.sunset_reason` |

---

## Risk Mitigations

1. **AI Cost Control:** Use `claude-haiku` for event evaluation (high-volume, cheap). Reserve `claude-sonnet` for email generation only. At 200 contacts and 10 events/day, roughly 2000 evaluator calls/day (haiku pricing is minimal).

2. **Backward Compatibility:** The existing journey system (`processJourneyQueue` in `src/actions/journeys.ts`) is NOT removed. The new `agent_mode` column defaults to `'schedule'`, preserving current behavior exactly. Agent-driven mode is opt-in.

3. **Trust Level Safety:** Ghost mode is the default. No emails auto-send until the realtor explicitly promotes trust level. This prevents any uncontrolled sending.

4. **Rate Limiting:** The send governor is checked BEFORE AI evaluation to avoid wasting API calls on contacts who cannot receive email anyway.

5. **Graceful Degradation:** If the Claude API is down, the evaluator catches errors and falls back to the existing journey schedule system. All AI calls in `contact-evaluator.ts` are wrapped in try/catch.

6. **Data Integrity:** All new tables have RLS enabled with the existing single-tenant `FOR ALL USING (true)` policy pattern. All new columns have sensible defaults so existing data is not broken.

---

### Critical Files for Implementation

- `/Users/bigbear/reality crm/realestate-crm/src/lib/ai-agent/contact-evaluator.ts` (to create) -- Core engine: event-driven per-contact AI evaluation, the central piece that replaces hardcoded journey schedules
- `/Users/bigbear/reality crm/realestate-crm/src/lib/ai-agent/trust-gate.ts` (to create) -- Trust routing: decides what happens after AI generates an email (ghost store, queue for review, auto-send with recall, or auto-send)
- `/Users/bigbear/reality crm/realestate-crm/src/actions/newsletters.ts` -- Existing email generation pipeline that must be extended with edit tracking (original_subject/body), ghost draft creation, and recall support
- `/Users/bigbear/reality crm/realestate-crm/src/components/newsletters/ApprovalQueueClient.tsx` -- Existing approval queue UI that must gain inline editing, reasoning panel expansion, and edit-before-send capability
- `/Users/bigbear/reality crm/realestate-crm/src/lib/newsletter-ai.ts` -- Existing Claude content generation that must incorporate voice rules from edit learning into its system prompt
