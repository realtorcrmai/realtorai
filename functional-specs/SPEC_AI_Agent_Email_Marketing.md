# Realtors360 AI Agent — Functional Requirements & Technical Specification

**Version:** 1.0
**Date:** March 2026
**Status:** Draft
**Project:** Realtors360 Real Estate CRM — AI Agent Layer for Email Marketing

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Functional Requirements](#3-functional-requirements)
4. [System Architecture](#4-system-architecture)
5. [Data Model](#5-data-model)
6. [Technical Specification — Deliverable A: Lead Scoring Engine](#6-deliverable-a)
7. [Technical Specification — Deliverable B: Send Advisor](#7-deliverable-b)
8. [Technical Specification — Deliverable C: Next Best Action Dashboard](#8-deliverable-c)
9. [Claude Prompt Engineering](#9-claude-prompt-engineering)
10. [API Specification](#10-api-specification)
11. [Cost Model & Optimization](#11-cost-model)
12. [Security & Privacy](#12-security)
13. [Testing Strategy](#13-testing)
14. [Deployment & Operations](#14-deployment)
15. [Out of Scope](#15-out-of-scope)

---

## 1. Executive Summary

### What
An AI decision layer (powered by Claude Sonnet) that sits on top of the existing Realtors360 workflow engine. The agent reads CRM data, reasons about contact behavior, and outputs actionable decisions — lead scores, send/skip/swap recommendations, next-best-action suggestions, and stage advancement proposals.

### Why
The current email marketing system sends emails on fixed schedules to all contacts regardless of context. A buyer who clicked 5 listings yesterday still gets a generic neighbourhood guide 3 days later. A dormant contact gets the same drip as an active one. The AI agent makes the system adaptive — the right message, to the right person, at the right time.

### How
Three batch-processing services that run on cron schedules, read from Supabase, call Claude via Anthropic API, and write decisions back to the database. The existing workflow engine reads these decisions and executes accordingly. The realtor sees AI recommendations on their dashboard and can accept or dismiss them.

### Constraints
- Budget: ~$2.70/day ($81/month) at 200 active contacts
- Latency: Batch processing only, no real-time requirements
- Autonomy: Agent recommends, human decides (no autonomous actions on critical paths)
- Model: Claude Sonnet 4 (via Anthropic SDK, already installed)
- Infrastructure: Supabase (PostgreSQL), Next.js API routes, Vercel Crons

---

## 2. Problem Statement

### Current State

The Realtors360 CRM has two email engines:

**Workflow Automation Engine** (`src/lib/workflow-engine.ts`)
- 7 pre-built drip sequences with 103 total steps
- Executes steps blindly at scheduled times
- No awareness of contact behavior between steps
- Hard-coded trigger conditions (exact enum matches)

**Newsletter Journey Engine** (`src/actions/journeys.ts`)
- 5-phase lifecycle journeys with fixed email schedules
- Claude generates email content but has minimal context
- Engagement scoring is a fixed formula: `opens×2 + clicks×3 + recency_bonus`
- Interest inference is pattern-matched, not reasoned

### Problems

| Problem | Impact | Example |
|---------|--------|---------|
| Blind drip scheduling | Irrelevant emails → unsubscribes | Buyer clicking Vancouver listings gets a generic "home tips" email instead of Vancouver listings |
| Fixed engagement scoring | Misranked leads → missed opportunities | A contact who clicks 5 listings in 2 hours scores the same as one who clicks 5 over 2 months |
| No behavioral stage advancement | Manual bottleneck | Contact shows "active buyer" behavior but stays at "lead" until agent manually updates |
| No proactive recommendations | Agent misses signals | Agent doesn't see that a contact went silent after 3 showings (possible churn) |
| Generic content personalization | Lower engagement | Claude writes emails without knowing the contact browses townhouses near schools |

### Desired State

- Emails are contextually relevant — the system knows what each contact cares about right now
- Lead scores reflect actual buying/selling readiness, not just email opens
- Stage transitions happen automatically based on behavioral signals
- The realtor's dashboard surfaces the 3-5 most important actions to take today
- Email content is personalized based on inferred interests and behavioral patterns

---

## 3. Functional Requirements

### FR-1: AI Lead Scoring

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | System shall score contacts on 4 dimensions: buying_readiness (0-100), timeline_urgency (0-100), budget_fit (0-100), intent classification | Must |
| FR-1.2 | Scores shall be computed by Claude analyzing last 30 days of contact activity (communications, newsletter events, appointments, workflow enrollments) | Must |
| FR-1.3 | Scoring shall run every 15 minutes as a batch job processing up to 50 contacts per cycle | Must |
| FR-1.4 | Contacts with new activity since last scoring shall be prioritized | Must |
| FR-1.5 | Each score shall include a human-readable `reasoning` field explaining the assessment | Must |
| FR-1.6 | Scores shall be stored on the contact record for real-time access by other components | Must |
| FR-1.7 | Intent shall be classified as one of: `serious_buyer`, `window_shopping`, `investor`, `active_seller`, `considering_selling`, `dormant`, `partner` | Should |

### FR-2: Send/Skip/Swap Advisor

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Before executing any email workflow step, system shall consult Claude for a send/skip/swap recommendation | Must |
| FR-2.2 | Claude shall receive: contact profile, AI lead score, last 5 interactions, scheduled email type, current matching listings | Must |
| FR-2.3 | Claude shall respond with: decision (send/skip/swap), swap_to email type if swapping, reasoning | Must |
| FR-2.4 | "Skip" shall advance the workflow to the next step without sending | Must |
| FR-2.5 | "Swap" shall change the email type to Claude's recommendation before sending | Must |
| FR-2.6 | All decisions shall be logged to `workflow_step_logs` for audit and analytics | Must |
| FR-2.7 | Feature shall be toggleable via `AI_SEND_ADVISOR` environment variable | Must |
| FR-2.8 | If Claude API is unavailable, system shall fall back to "send" (no blocking) | Must |

### FR-3: Auto Stage Advancement

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Lead scorer shall include a stage_recommendation in its output (advance/maintain/regress) | Must |
| FR-3.2 | Stage recommendations shall be saved to `agent_recommendations` table | Must |
| FR-3.3 | Recommendations shall appear on the dashboard for agent approval | Must |
| FR-3.4 | Agent shall be able to [Accept] or [Dismiss] each recommendation | Must |
| FR-3.5 | Accepted recommendations shall update the contact's `stage_bar` and `lead_status` | Must |
| FR-3.6 | `Under Contract` and `Closed` stages shall never be auto-recommended (manual only) | Must |
| FR-3.7 | Stage changes shall trigger appropriate workflow enrollments via existing trigger system | Should |

### FR-4: Content Personalization Hints

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Lead scorer shall generate personalization hints alongside scores | Must |
| FR-4.2 | Hints shall include: preferred tone, interests (areas, property types), price anchor, hot topics, topics to avoid, relationship stage, personalization note | Must |
| FR-4.3 | Hints shall be stored in `contacts.newsletter_intelligence.ai_hints` | Must |
| FR-4.4 | Newsletter AI shall include hints in Claude context when generating email content | Must |
| FR-4.5 | Hints shall be refreshed every time the contact is re-scored (max once per 24h) | Should |

### FR-5: Next Best Action Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | System shall generate 3-5 actionable recommendations for the realtor every hour | Must |
| FR-5.2 | Recommendations shall be based on highest-scored contacts with recent activity | Must |
| FR-5.3 | Each recommendation shall include: contact name, action type, reasoning, priority (hot/warm/info) | Must |
| FR-5.4 | Action types: `call`, `send_email`, `enroll_workflow`, `advance_stage`, `send_check_in` | Must |
| FR-5.5 | Dashboard card shall display recommendations with action buttons | Must |
| FR-5.6 | [Call] button shall log a call task in the CRM | Must |
| FR-5.7 | [Send Email] button shall navigate to newsletter compose for that contact | Must |
| FR-5.8 | [Advance Stage] button shall update contact stage | Must |
| FR-5.9 | [Dismiss] button shall mark recommendation as dismissed and hide it | Must |
| FR-5.10 | Recommendations shall auto-expire after 24 hours | Should |
| FR-5.11 | Dismissed recommendations shall not be re-generated for the same contact+action within 7 days | Should |

---

## 4. System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CRON SCHEDULER                            │
│  Every 15 min: /api/cron/agent-scoring                      │
│  Every 5 min:  /api/cron/process-workflows (with advisor)   │
│  Every 1 hour: /api/cron/agent-recommendations              │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────────────┐
│ Lead Scorer │  │ Send Advisor    │  │ Recommendation     │
│             │  │                 │  │ Generator          │
│ Reads:      │  │ Reads:          │  │                    │
│ - contacts  │  │ - contact       │  │ Reads:             │
│ - activity  │  │ - ai_lead_score │  │ - top scored       │
│ - comms     │  │ - recent events │  │   contacts         │
│ - events    │  │ - step config   │  │ - activity logs    │
│ - showings  │  │ - listings      │  │ - workflow state   │
│             │  │                 │  │                    │
│ Writes:     │  │ Returns:        │  │ Writes:            │
│ - ai_score  │  │ - send/skip/    │  │ - agent_           │
│ - ai_hints  │  │   swap decision │  │   recommendations  │
│ - stage_rec │  │ - reasoning     │  │                    │
└──────┬──────┘  └────────┬────────┘  └─────┬──────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│                                                              │
│  contacts.ai_lead_score (JSONB)                              │
│  contacts.newsletter_intelligence.ai_hints (JSONB)           │
│  agent_recommendations (table)                               │
│  workflow_step_logs.ai_decision (JSONB)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   Dashboard UI          │
              │   AIRecommendations     │
              │   component             │
              │   [Accept] [Dismiss]    │
              └─────────────────────────┘
```

### Data Flow

```
Contact clicks email link
  → Resend webhook fires → newsletter_events table updated
  → Contact intelligence updated (engagement score, click history)
  → Next cron cycle: Lead Scorer picks up contact (has new activity)
  → Claude analyzes: "3 listing clicks in Burnaby + CMA click = serious buyer"
  → Writes: ai_lead_score = {buying_readiness: 82, intent: "serious_buyer", ...}
  → Writes: stage_recommendation = "advance to qualified"
  → Writes: personalization_hints = {interests: ["Burnaby", "townhouses"], ...}
  → Next cron cycle: Recommendation Generator picks up high-scored contact
  → Claude generates: "Call Sarah — she's clicked CMA 3 times, likely ready to offer"
  → Writes: agent_recommendations row
  → Dashboard shows recommendation card
  → Realtor clicks [Call] → task created, call logged
  → Meanwhile: Workflow cron fires → buyer_nurture step 5 due
  → Send Advisor checks: "neighbourhood_guide scheduled, but Sarah is actively browsing Burnaby"
  → Claude: "swap to new_listing_alert — send Burnaby listings while interest is hot"
  → Workflow engine sends swapped email → logged with ai_decision
```

### Integration Points with Existing Code

| Existing Component | Integration | Direction |
|-------------------|-------------|-----------|
| `src/lib/workflow-engine.ts` | Send Advisor pre-execution hook | Agent → Engine |
| `src/lib/newsletter-ai.ts` | Personalization hints injection | Agent → Newsletter AI |
| `src/lib/workflow-triggers.ts` | Stage recommendations check | Agent → Triggers |
| `src/actions/contacts.ts` | ai_lead_score in contact queries | Agent → Contacts |
| `src/app/api/webhooks/resend/route.ts` | Triggers rescoring on engagement events | Webhook → Agent |
| `src/app/(dashboard)/page.tsx` | Recommendations card | Agent → Dashboard UI |
| `src/actions/workflows.ts` | Enrollment from accepted recommendations | Dashboard → Workflows |

---

## 5. Data Model

### New Table: `agent_recommendations`

```sql
CREATE TABLE agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'call', 'send_email', 'send_check_in', 'enroll_workflow',
    'advance_stage', 'pause_workflow', 'reengagement'
  )),
  action_config JSONB NOT NULL DEFAULT '{}',
  -- action_config examples:
  -- call: { "reason": "CMA interest", "talking_points": ["mention Burnaby listings", "ask about timeline"] }
  -- send_email: { "email_type": "new_listing_alert", "listings": ["uuid1", "uuid2"] }
  -- advance_stage: { "from": "lead", "to": "qualified" }
  -- enroll_workflow: { "workflow_slug": "buyer_nurture" }
  reasoning TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('hot', 'warm', 'info')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'expired', 'executed')),
  source TEXT NOT NULL DEFAULT 'scoring' CHECK (source IN ('scoring', 'send_advisor', 'recommendation')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  executed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_rec_contact ON agent_recommendations(contact_id, status);
CREATE INDEX idx_agent_rec_status ON agent_recommendations(status, priority, created_at DESC);
CREATE INDEX idx_agent_rec_expires ON agent_recommendations(expires_at) WHERE status = 'pending';
```

### Extended Column: `contacts.ai_lead_score`

```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_lead_score JSONB;
-- Structure:
-- {
--   "buying_readiness": 82,          -- 0-100
--   "timeline_urgency": 65,          -- 0-100
--   "budget_fit": 70,                -- 0-100
--   "intent": "serious_buyer",       -- enum string
--   "reasoning": "3 showing requests in 7 days...",
--   "stage_recommendation": "advance",  -- advance | maintain | regress
--   "recommended_stage": "qualified",   -- target stage if advance/regress
--   "stage_reasoning": "Contact viewed 8 properties...",
--   "personalization_hints": {
--     "tone": "data-driven",
--     "interests": ["Burnaby", "townhouses", "near schools"],
--     "price_anchor": "$850K",
--     "hot_topic": "new listings",
--     "avoid": ["mortgage tips"],
--     "relationship_stage": "warm",
--     "note": "Has school-age children. Emphasize family features."
--   },
--   "scored_at": "2026-03-20T14:30:00Z",
--   "model": "claude-sonnet-4-20250514",
--   "tokens_used": { "input": 820, "output": 195 }
-- }

CREATE INDEX idx_contacts_ai_score ON contacts
  USING gin (ai_lead_score jsonb_path_ops);
```

### Extended Column: `workflow_step_logs.ai_decision`

```sql
ALTER TABLE workflow_step_logs ADD COLUMN IF NOT EXISTS ai_decision JSONB;
-- Structure:
-- {
--   "decision": "swap",              -- send | skip | swap
--   "original_email_type": "neighbourhood_guide",
--   "swap_to": "new_listing_alert",
--   "reasoning": "Contact actively browsing Burnaby listings...",
--   "confidence": 0.85,
--   "model": "claude-sonnet-4-20250514",
--   "latency_ms": 1240
-- }
```

### Full Migration: `supabase/migrations/015_ai_agent.sql`

```sql
-- AI Lead Score on contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_lead_score JSONB;
CREATE INDEX IF NOT EXISTS idx_contacts_ai_score
  ON contacts USING gin (ai_lead_score jsonb_path_ops);

-- AI Decision audit on workflow step logs
ALTER TABLE workflow_step_logs ADD COLUMN IF NOT EXISTS ai_decision JSONB;

-- Agent Recommendations table
CREATE TABLE IF NOT EXISTS agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'call', 'send_email', 'send_check_in', 'enroll_workflow',
    'advance_stage', 'pause_workflow', 'reengagement'
  )),
  action_config JSONB NOT NULL DEFAULT '{}',
  reasoning TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('hot', 'warm', 'info')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'dismissed', 'expired', 'executed'
  )),
  source TEXT NOT NULL DEFAULT 'scoring' CHECK (source IN (
    'scoring', 'send_advisor', 'recommendation'
  )),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  executed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_rec_contact ON agent_recommendations(contact_id, status);
CREATE INDEX idx_agent_rec_status ON agent_recommendations(status, priority, created_at DESC);
CREATE INDEX idx_agent_rec_expires ON agent_recommendations(expires_at) WHERE status = 'pending';

-- RLS: authenticated users can access all rows (single-tenant)
ALTER TABLE agent_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage recommendations"
  ON agent_recommendations FOR ALL
  USING (auth.role() = 'authenticated');

-- Auto-expire cron (call this periodically or use pg_cron if available)
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS void AS $$
  UPDATE agent_recommendations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
$$ LANGUAGE sql;
```

---

## 6. Technical Specification — Deliverable A: Lead Scoring Engine

### 6.1 Module: `src/lib/ai-agent/lead-scorer.ts`

```typescript
// --- Types ---

interface LeadScore {
  buying_readiness: number;      // 0-100
  timeline_urgency: number;      // 0-100
  budget_fit: number;            // 0-100
  intent: ContactIntent;
  reasoning: string;
  stage_recommendation: 'advance' | 'maintain' | 'regress';
  recommended_stage?: string;
  stage_reasoning?: string;
  personalization_hints: PersonalizationHints;
  scored_at: string;
  model: string;
  tokens_used: { input: number; output: number };
}

type ContactIntent =
  | 'serious_buyer'
  | 'window_shopping'
  | 'investor'
  | 'active_seller'
  | 'considering_selling'
  | 'dormant'
  | 'partner'
  | 'unknown';

interface PersonalizationHints {
  tone: 'data-driven' | 'lifestyle' | 'professional' | 'casual';
  interests: string[];           // areas, property types, features
  price_anchor?: string;         // "$850K" — inferred from viewed properties
  hot_topic?: string;            // what they're engaging with now
  avoid: string[];               // topics they ignore
  relationship_stage: 'cold' | 'warming' | 'warm' | 'hot' | 'cooling';
  note: string;                  // free-text personalization insight
}

// --- Functions ---

/**
 * Score a single contact.
 * Fetches all relevant data from Supabase, builds context, calls Claude.
 */
async function scoreContact(contactId: string): Promise<LeadScore>;

/**
 * Score a batch of contacts (max 50).
 * Processes sequentially to avoid rate limits.
 * Returns map of contactId → LeadScore.
 */
async function scoreBatch(contactIds: string[]): Promise<Map<string, LeadScore>>;

/**
 * Build the context string for Claude from a contact's data.
 * Kept under 800 tokens to control costs.
 */
function buildScoringContext(contact: Contact, data: ContactData): string;
```

### 6.2 Context Assembly

For each contact, fetch from Supabase:

| Query | Table | Fields | Limit |
|-------|-------|--------|-------|
| Contact profile | `contacts` | name, type, email, phone, lead_status, stage_bar, tags, buyer_preferences, seller_preferences, newsletter_intelligence, ai_lead_score (previous) | 1 |
| Recent communications | `communications` | direction, channel, body (truncated 100 chars), created_at | Last 10, ordered DESC |
| Newsletter events | `newsletter_events` | event_type, link_url, link_type, created_at | Last 20, ordered DESC |
| Appointments | `appointments` | listing_id, status, start_time | Last 5, ordered DESC |
| Active workflow enrollments | `workflow_enrollments` | workflow_id (join workflow name), status, current_step | All active |
| Activity log | `activity_log` | action, details, created_at | Last 10, ordered DESC |

**Token budget:** ~800 input tokens per contact. Truncate communication bodies, skip low-value events.

### 6.3 Scoring Rubric (Claude System Prompt)

```
You are a real estate CRM AI analyst. Score this contact on their likelihood to transact.

OUTPUT FORMAT: Valid JSON only, no markdown fences.
{
  "buying_readiness": <0-100>,
  "timeline_urgency": <0-100>,
  "budget_fit": <0-100>,
  "intent": "<serious_buyer|window_shopping|investor|active_seller|considering_selling|dormant|partner|unknown>",
  "reasoning": "<1-2 sentences explaining the score>",
  "stage_recommendation": "<advance|maintain|regress>",
  "recommended_stage": "<new|qualified|active|under_contract|closed|dormant>",
  "stage_reasoning": "<1 sentence if advance/regress>",
  "personalization_hints": {
    "tone": "<data-driven|lifestyle|professional|casual>",
    "interests": ["<area>", "<property type>", ...],
    "price_anchor": "<$XXK or null>",
    "hot_topic": "<what they engage with most>",
    "avoid": ["<topics they ignore>"],
    "relationship_stage": "<cold|warming|warm|hot|cooling>",
    "note": "<1 sentence personalization insight>"
  }
}

SCORING RUBRIC:

buying_readiness (behavioral signals):
- 80-100: Multiple showing requests, CMA clicks, contacting agent, viewing specific properties repeatedly
- 60-79: Regular listing browsing, opening most emails, setting preferences, engaging with market data
- 40-59: Occasional email opens, some listing clicks, early-stage browsing
- 20-39: Minimal engagement, opened 1-2 emails, no listing interaction
- 0-19: No activity, or only opened welcome email

timeline_urgency (how soon they might act):
- 80-100: Activity clustering in last 48 hours, multiple high-intent actions
- 60-79: Consistent activity over last week, increasing engagement trend
- 40-59: Sporadic activity, no clear urgency pattern
- 20-39: Activity spread over weeks/months, no acceleration
- 0-19: Last activity > 30 days ago

budget_fit (based on properties viewed vs inventory):
- 80-100: Consistently viewing properties in a tight price range that matches available inventory
- 60-79: Viewing properties in a range with some matching inventory
- 40-59: Broad price range or insufficient data to determine
- 0-39: Viewing properties outside available inventory range

STAGE RULES:
- Only recommend "advance" if clear behavioral evidence supports it
- NEVER recommend "under_contract" or "closed" (these require manual confirmation)
- Recommend "regress" to "dormant" only if 30+ days of zero activity after prior engagement
- Current stage matters: don't recommend advancing to a stage they're already at

PERSONALIZATION RULES:
- Infer tone from content they engage with (data = market reports; lifestyle = neighbourhood guides)
- Price anchor = mode of property prices they've viewed
- "avoid" = email types they consistently open but never click, or never open
- Keep "note" specific and actionable, not generic
```

### 6.4 Cron Endpoint: `src/app/api/cron/agent-scoring/route.ts`

```typescript
// GET /api/cron/agent-scoring
// Headers: { "x-cron-secret": CRON_SECRET }
// Schedule: Every 15 minutes
//
// Logic:
// 1. Verify CRON_SECRET header
// 2. Query contacts to score:
//    a. Contacts with newsletter_events in last 15 min (new activity)
//    b. Contacts with ai_lead_score.scored_at > 24 hours ago (stale scores)
//    c. Contacts with no ai_lead_score at all (never scored)
//    d. Limit 50, ordered by: new activity first, then stale, then never scored
// 3. Call scoreBatch(contactIds)
// 4. For each scored contact:
//    a. Update contacts.ai_lead_score with score JSON
//    b. Update contacts.newsletter_intelligence.ai_hints with personalization_hints
//    c. If stage_recommendation = "advance" or "regress":
//       Insert into agent_recommendations table
// 5. Return { scored: count, recommendations: count, errors: count }
```

### 6.5 Newsletter AI Integration

**File:** `src/lib/newsletter-ai.ts`

In `generateNewsletterContent()`, after building the existing context, add:

```typescript
// Inject AI personalization hints if available
if (context.contact.ai_hints) {
  const hints = context.contact.ai_hints;
  additionalContext += `\n\nAI PERSONALIZATION HINTS (use these to tailor content):
- Preferred tone: ${hints.tone}
- Key interests: ${hints.interests.join(', ')}
- Price range they're browsing: ${hints.price_anchor || 'unknown'}
- Currently most engaged with: ${hints.hot_topic || 'general content'}
- Topics to avoid (low engagement): ${hints.avoid.join(', ') || 'none identified'}
- Relationship stage: ${hints.relationship_stage}
- Personal note: ${hints.note}`;
}
```

---

## 7. Technical Specification — Deliverable B: Send Advisor

### 7.1 Module: `src/lib/ai-agent/send-advisor.ts`

```typescript
// --- Types ---

interface SendDecision {
  decision: 'send' | 'skip' | 'swap';
  swap_to?: string;              // email_type to swap to
  reasoning: string;
  confidence: number;            // 0-1
  latency_ms: number;
}

// --- Functions ---

/**
 * Advise whether to send, skip, or swap an email workflow step.
 * Called by the workflow engine before executing email steps.
 */
async function adviseSend(
  contactId: string,
  scheduledEmailType: string,
  workflowSlug: string,
  stepOrder: number
): Promise<SendDecision>;
```

### 7.2 Context Assembly

For the send advisor, fetch:

| Data | Source | Fields |
|------|--------|--------|
| Contact profile | `contacts` | name, type, stage_bar, ai_lead_score (intent, buying_readiness) |
| AI hints | `contacts.newsletter_intelligence.ai_hints` | tone, interests, hot_topic, avoid |
| Last 5 interactions | `newsletter_events` + `communications` | event_type, channel, body snippet, link_type, created_at |
| Scheduled email | Step config | email_type (e.g., "neighbourhood_guide") |
| Current inventory | `listings` | WHERE status = 'active', matching contact interests if known |
| Workflow context | `workflow_enrollments` | workflow name, current step, total steps |

**Token budget:** ~600 input tokens. Keep concise.

### 7.3 Advisor Prompt (Claude System Prompt)

```
You are an email marketing advisor for a real estate CRM. A workflow is about to send an email to a contact. Decide if this is the right email at the right time.

OUTPUT FORMAT: Valid JSON only.
{
  "decision": "<send|skip|swap>",
  "swap_to": "<email_type if swapping, null otherwise>",
  "reasoning": "<1-2 sentences>",
  "confidence": <0.0-1.0>
}

DECISION RULES:

SEND when:
- The scheduled email matches the contact's current interests and engagement level
- No strong signal to do otherwise
- Default to "send" if unsure (confidence < 0.6)

SKIP when:
- Contact received an email in the last 24 hours (frequency cap)
- Contact's engagement is declining and more emails might cause unsubscribe
- The email topic is something they consistently ignore (in "avoid" list)
- Contact is dormant and this isn't a re-engagement email

SWAP when:
- Contact is showing strong interest in a specific area/type but scheduled email is generic
- There are new listings matching their interests (swap to new_listing_alert)
- Contact clicked CMA or contact_agent recently (swap to more direct/action-oriented email)
- Contact's hot_topic doesn't match the scheduled email type

AVAILABLE EMAIL TYPES TO SWAP TO:
- new_listing_alert: New properties matching interests
- market_update: Area market stats and trends
- just_sold: Recently sold property in their area
- open_house_invite: Upcoming open house
- neighbourhood_guide: Area lifestyle info
- home_anniversary: Anniversary of purchase (past clients only)
- reengagement: "We miss you" for dormant contacts
```

### 7.4 Workflow Engine Integration

**File:** `src/lib/workflow-engine.ts`

In the `executeStep()` function, add a pre-execution hook:

```typescript
// Before executing auto_email or ai_email steps:
if (
  (step.action_type === 'auto_email' || step.action_type === 'ai_email') &&
  process.env.AI_SEND_ADVISOR === 'true'
) {
  try {
    const decision = await adviseSend(
      enrollment.contact_id,
      step.config.email_type || step.config.template_id,
      workflow.slug,
      step.step_order
    );

    // Log the decision
    await logStepWithDecision(enrollment.id, step.id, decision);

    if (decision.decision === 'skip') {
      console.log(`[AI ADVISOR] Skipping step ${step.step_order}: ${decision.reasoning}`);
      // Advance to next step without executing
      return advanceToNextStep(enrollment);
    }

    if (decision.decision === 'swap' && decision.swap_to) {
      console.log(`[AI ADVISOR] Swapping ${step.config.email_type} → ${decision.swap_to}: ${decision.reasoning}`);
      // Override the email type for this execution only
      step = { ...step, config: { ...step.config, email_type: decision.swap_to } };
    }
    // If 'send', proceed normally
  } catch (error) {
    // Fallback: send as scheduled if AI advisor fails
    console.error('[AI ADVISOR] Error, falling back to send:', error);
  }
}

// ... existing execution logic continues
```

### 7.5 Feature Flag

```
# .env.local
AI_SEND_ADVISOR=true    # Set to false to disable AI advisor without code change
```

When `false`, the workflow engine skips the advisor call entirely — zero overhead, zero cost.

---

## 8. Technical Specification — Deliverable C: Next Best Action Dashboard

### 8.1 Module: `src/lib/ai-agent/next-best-action.ts`

```typescript
// --- Types ---

interface Recommendation {
  contact_id: string;
  contact_name: string;
  action_type: 'call' | 'send_email' | 'send_check_in' | 'enroll_workflow' | 'advance_stage' | 'reengagement';
  action_config: Record<string, unknown>;
  reasoning: string;
  priority: 'hot' | 'warm' | 'info';
}

// --- Functions ---

/**
 * Generate 3-5 next-best-action recommendations.
 * Called hourly by cron.
 */
async function generateRecommendations(): Promise<Recommendation[]>;
```

### 8.2 Context Assembly

Build a summary of the top 20 contacts for Claude to reason over:

```typescript
// 1. Fetch top 20 contacts by buying_readiness DESC (from ai_lead_score)
// 2. For each, build a 2-line summary:
//    "Sarah Chen (buyer, score:82, stage:lead) — 3 showings this week, clicked CMA 2x, last active 2h ago"
//    "Mike Wong (buyer, score:71, stage:active) — was active, silent 12 days, 3 showings then nothing"
// 3. Also fetch: dismissed recommendations in last 7 days (to avoid repeats)
// 4. Also fetch: currently active workflow enrollments per contact
```

**Token budget:** ~1500 input tokens for 20 contact summaries, ~500 output tokens for 5 recommendations.

### 8.3 Recommendation Prompt (Claude System Prompt)

```
You are an AI assistant for a real estate agent. Based on the contact summaries below, recommend the 3-5 most important actions the agent should take today.

OUTPUT FORMAT: JSON array, no markdown fences.
[
  {
    "contact_id": "<uuid>",
    "action_type": "<call|send_email|send_check_in|enroll_workflow|advance_stage|reengagement>",
    "action_config": { ... },
    "reasoning": "<1-2 sentences, specific and actionable>",
    "priority": "<hot|warm|info>"
  }
]

PRIORITY RULES:
- HOT: Contact showing strong buying/selling signals, needs immediate attention (call today)
- WARM: Contact engagement trending up, good time to nurture (send email, advance stage)
- INFO: Interesting pattern but no urgency (FYI for agent)

ACTION RULES:
- "call": When contact shows high-intent behavior (CMA clicks, showing requests, going silent after high activity)
- "send_email": When there's relevant content to send (new listings in their area, market update)
- "advance_stage": When behavioral signals clearly indicate they've moved past their current stage
- "reengagement": When previously active contact has gone silent 10+ days
- "enroll_workflow": When contact isn't in an appropriate workflow for their stage

AVOID:
- Don't recommend the same action for the same contact if it was dismissed recently
- Don't recommend calling contacts who are in early "lead" stage with low engagement
- Don't recommend more than 2 "hot" priorities (agent can only handle so many urgent tasks)
- Be specific in reasoning — cite actual behaviors, not generic advice
```

### 8.4 Cron Endpoint: `src/app/api/cron/agent-recommendations/route.ts`

```typescript
// GET /api/cron/agent-recommendations
// Headers: { "x-cron-secret": CRON_SECRET }
// Schedule: Every 1 hour
//
// Logic:
// 1. Verify CRON_SECRET header
// 2. Expire old recommendations: UPDATE status='expired' WHERE expires_at < now()
// 3. Call generateRecommendations()
// 4. For each recommendation:
//    a. Check if same contact+action_type was dismissed in last 7 days → skip
//    b. Check if same contact+action_type already pending → skip
//    c. Insert into agent_recommendations table
// 5. Return { generated: count, skipped_duplicates: count, expired: count }
```

### 8.5 Server Actions: `src/actions/recommendations.ts`

```typescript
/**
 * Fetch pending recommendations for dashboard display.
 * Returns up to 5, ordered by priority (hot first) then created_at DESC.
 */
async function getRecommendations(): Promise<RecommendationWithContact[]>;

/**
 * Dismiss a recommendation. Sets status='dismissed', dismissed_at=now().
 * Creates a 7-day suppression window for same contact+action_type.
 */
async function dismissRecommendation(id: string): Promise<void>;

/**
 * Execute a recommendation. Performs the action, sets status='executed'.
 *
 * Actions:
 * - call: Creates a manual_task in activity_log + agent_notifications
 * - send_email: Calls generateAndQueueNewsletter() for the contact
 * - advance_stage: Updates contact.stage_bar and contact.lead_status
 * - enroll_workflow: Calls enrollContactInWorkflow()
 * - reengagement: Enrolls in lead_reengagement workflow
 */
async function executeRecommendation(id: string): Promise<{ success: boolean; error?: string }>;
```

### 8.6 Dashboard Component: `src/components/dashboard/AIRecommendations.tsx`

```typescript
// Client component ("use client")
// Fetches recommendations on mount via server action
// Displays 3-5 cards, each with:
//   - Priority icon: 🔥 (hot), ⚠️ (warm), 📈 (info)
//   - Contact name (linked to contact detail page)
//   - Action description (1 line)
//   - Reasoning (1-2 lines, muted text)
//   - Action buttons based on action_type:
//     call → [📞 Call] — creates task
//     send_email → [📧 Send] — navigates to /newsletters/compose?contact=<id>
//     advance_stage → [⬆️ Advance to <stage>] — updates contact
//     enroll_workflow → [▶️ Enroll] — enrolls in workflow
//     reengagement → [🔄 Re-engage] — enrolls in reengagement workflow
//   - [✕ Dismiss] button on all cards
// Loading state: skeleton cards
// Empty state: "No recommendations right now. Your contacts are on track."
// Refresh button: re-fetches recommendations
```

### 8.7 Dashboard Integration

**File:** `src/app/(dashboard)/page.tsx`

Add the recommendations card after the existing stats section:

```typescript
import { AIRecommendations } from '@/components/dashboard/AIRecommendations';

// In the dashboard layout, after existing cards:
<AIRecommendations />
```

---

## 9. Claude Prompt Engineering

### Token Optimization

| Component | Input tokens | Output tokens | Model | Cost per call |
|-----------|-------------|---------------|-------|---------------|
| Lead Scorer | ~800 | ~200 | Sonnet | $0.003 |
| Send Advisor | ~600 | ~100 | Sonnet | $0.002 |
| Recommendation Generator | ~1500 | ~500 | Sonnet | $0.008 |

### Prompt Caching Strategy

Use Anthropic's prompt caching for system prompts (scoring rubric, advisor rules, recommendation rules). These are static and can be cached across all calls in a batch.

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 300,
  system: [
    {
      type: "text",
      text: SCORING_RUBRIC,         // ~500 tokens, cached
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [
    { role: "user", content: contactContext }  // ~300 tokens, unique per contact
  ]
});
```

This reduces cost by ~50% for batch operations (system prompt tokens charged at cache rate after first call).

### Error Handling

1. **JSON parse failure:** Retry once with explicit "respond with valid JSON only" appended. If still fails, return null score (contact skipped this cycle).
2. **Rate limit:** Back off 30 seconds, retry. If persistent, process remaining contacts in next cycle.
3. **Timeout (>10s):** Abort, log, skip contact. Will be retried next cycle.
4. **Unexpected values:** Clamp scores to 0-100, validate intent against enum, default stage_recommendation to "maintain".

---

## 10. API Specification

### Cron Endpoints (Protected)

All cron endpoints require header: `x-cron-secret: <CRON_SECRET>`

```
GET /api/cron/agent-scoring
  Response: { scored: number, recommendations: number, errors: number, duration_ms: number }
  Schedule: Every 15 minutes
  Timeout: 120 seconds

GET /api/cron/agent-recommendations
  Response: { generated: number, skipped_duplicates: number, expired: number, duration_ms: number }
  Schedule: Every 1 hour
  Timeout: 60 seconds
```

### Dashboard API (Server Actions)

```typescript
// These are Next.js server actions, called from client components

getRecommendations()
  Returns: RecommendationWithContact[]   // max 5, ordered by priority

dismissRecommendation(id: string)
  Returns: void
  Side effects: Updates status to 'dismissed', sets dismissed_at

executeRecommendation(id: string)
  Returns: { success: boolean, error?: string }
  Side effects: Depends on action_type (see 8.5)
```

---

## 11. Cost Model & Optimization

### Daily Cost at Scale

| Contacts | Lead Scoring | Send Advisor | Recommendations | Total/day | Total/month |
|----------|-------------|-------------|-----------------|-----------|-------------|
| 50 | $0.36 | $0.02 | $1.20 | $1.58 | $47 |
| 200 | $1.44 | $0.06 | $1.20 | $2.70 | $81 |
| 500 | $3.60 | $0.15 | $1.20 | $4.95 | $149 |
| 1000 | $7.20 | $0.30 | $1.20 | $8.70 | $261 |

### Optimization Levers

| Lever | Savings | Tradeoff |
|-------|---------|----------|
| Use Haiku for lead scoring | -70% on scoring | Slightly less nuanced scores |
| Score only contacts with new activity | -50% on scoring | Stale scores for inactive contacts (OK — they're dormant) |
| Recommendations every 4h instead of hourly | -75% on recommendations | Recommendations up to 4h delayed |
| Skip advisor for auto_sms steps | -30% on advisor | SMS steps sent without AI review (acceptable — they're simpler) |
| Prompt caching | -50% on all components | None (pure optimization) |

### Cost Monitoring

Log token usage per call in the score/decision JSON. Create a simple dashboard query:

```sql
SELECT
  date_trunc('day', (ai_lead_score->>'scored_at')::timestamptz) as day,
  COUNT(*) as contacts_scored,
  SUM((ai_lead_score->'tokens_used'->>'input')::int) as total_input_tokens,
  SUM((ai_lead_score->'tokens_used'->>'output')::int) as total_output_tokens
FROM contacts
WHERE ai_lead_score IS NOT NULL
GROUP BY 1 ORDER BY 1 DESC;
```

---

## 12. Security & Privacy

### Data Protection
- Contact PII (phone, email, address) is passed to Claude for context but is NOT stored in prompts or logged beyond what Supabase already stores
- Claude API calls use Anthropic's zero-retention policy (data not used for training)
- AI scores and decisions are stored in Supabase with the same RLS policies as other CRM data

### Access Control
- Cron endpoints protected by `CRON_SECRET` header
- Dashboard recommendations visible to all authenticated users (single-tenant model)
- Agent recommendations are suggestions only — no autonomous actions on critical paths

### Audit Trail
- Every AI decision logged: `workflow_step_logs.ai_decision` for send/skip/swap
- Every score stored with timestamp and model version: `contacts.ai_lead_score.scored_at`
- Every recommendation tracked: `agent_recommendations` table with full lifecycle (pending → executed/dismissed/expired)

---

## 13. Testing Strategy

### Unit Tests

| Test | Module | Assertion |
|------|--------|-----------|
| Context builder produces valid token count | `lead-scorer.ts` | Output < 800 tokens |
| Score parser handles malformed JSON | `lead-scorer.ts` | Returns null, doesn't throw |
| Score parser clamps out-of-range values | `lead-scorer.ts` | buying_readiness = 150 → 100 |
| Send advisor defaults to "send" on error | `send-advisor.ts` | API failure → { decision: "send" } |
| Feature flag disables advisor | `workflow-engine.ts` | AI_SEND_ADVISOR=false → no Claude call |
| Recommendations skip dismissed duplicates | `next-best-action.ts` | Same contact+action within 7 days → skipped |

### Integration Tests

| Test | Steps | Expected |
|------|-------|----------|
| End-to-end scoring | Insert contact with activity → call cron → check ai_lead_score | Score populated with valid JSON |
| Send advisor swap | Enroll contact → set next step = neighbourhood_guide → contact has Burnaby clicks → run cron | ai_decision.decision = "swap", email sent is new_listing_alert |
| Recommendation lifecycle | Generate → display on dashboard → click [Accept] → verify action taken | Recommendation status progresses: pending → executed |
| Personalization in email | Score contact with hints → generate newsletter → inspect HTML | Email content references contact's interests |

### Manual E2E Test

1. Seed 5 contacts with varying activity levels in Supabase
2. Run `curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/agent-scoring`
3. Verify `contacts.ai_lead_score` populated for all 5
4. Run `curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/agent-recommendations`
5. Open dashboard → verify AI Recommendations card shows 3-5 items
6. Click [Advance Stage] on one → verify contact stage updated
7. Click [Dismiss] on another → verify it disappears, not re-generated next cycle
8. Enroll a scored contact in a workflow → trigger a step → verify ai_decision logged

---

## 14. Deployment & Operations

### Environment Variables

```bash
# Add to .env.local
CRON_SECRET=<random-32-char-string>      # Protects cron endpoints
AI_SEND_ADVISOR=true                      # Feature flag for send advisor
AI_SCORING_BATCH_SIZE=50                  # Max contacts per scoring cycle
AI_SCORING_MODEL=claude-sonnet-4-20250514 # Model for scoring
AI_ADVISOR_MODEL=claude-sonnet-4-20250514 # Model for send advisor
AI_RECOMMENDATION_MODEL=claude-sonnet-4-20250514 # Model for recommendations
```

### Cron Configuration

For Vercel Crons (`vercel.json`):
```json
{
  "crons": [
    { "path": "/api/cron/agent-scoring", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/agent-recommendations", "schedule": "7 * * * *" },
    { "path": "/api/cron/process-workflows", "schedule": "*/5 * * * *" }
  ]
}
```

For local dev, use the CronCreate tool or manual curl calls.

### Monitoring

- Log `duration_ms` for each cron run → alert if > 60s
- Log `errors` count per cron run → alert if > 5
- Track daily token spend via `ai_lead_score.tokens_used` aggregation
- Monitor `agent_recommendations` table size → expire old records

### Rollback Plan

1. Set `AI_SEND_ADVISOR=false` → immediately disables send advisor (emails send as before)
2. Stop cron jobs → no new scores or recommendations generated
3. Existing scores and recommendations remain in DB but become stale and expire
4. No data migration needed to rollback — all AI data is additive (new columns, new table)

---

## 15. Out of Scope

| Feature | Reason | When to Build |
|---------|--------|---------------|
| Real-time AI responses | Expensive, adds latency, not needed for email marketing | Never for email; consider for chat/showing requests |
| Autonomous actions | Realtors need control over their client relationships | After 6 months of trust-building with recommendation accuracy |
| Optimal send time | Requires 6+ months of delivery data to find per-contact patterns | After accumulating 10K+ send events |
| Predictive deal scoring | Need outcome data (which contacts actually closed deals) | After implementing offer/contract tracking |
| Conversational AI chatbot | Separate product with different UX requirements | Separate initiative |
| Multi-language support | All contacts are English-speaking BC market | When expanding to Quebec/international |
| Custom scoring rubrics | One-size-fits-all rubric is sufficient for v1 | When realtors request domain-specific scoring |
| Image/video analysis | Content engine handles media separately | Not applicable to email marketing |

---

## Appendix A: File Inventory

### New Files (11)

| File | Purpose | Deliverable |
|------|---------|-------------|
| `src/lib/ai-agent/lead-scorer.ts` | Lead scoring engine | A |
| `src/lib/ai-agent/send-advisor.ts` | Send/skip/swap advisor | B |
| `src/lib/ai-agent/next-best-action.ts` | Recommendation generator | C |
| `src/app/api/cron/agent-scoring/route.ts` | Scoring cron endpoint | A |
| `src/app/api/cron/agent-recommendations/route.ts` | Recommendation cron endpoint | C |
| `src/components/dashboard/AIRecommendations.tsx` | Dashboard card component | C |
| `src/actions/recommendations.ts` | Recommendation CRUD actions | C |
| `supabase/migrations/015_ai_agent.sql` | Database migration | A |

### Modified Files (5)

| File | Change | Deliverable |
|------|--------|-------------|
| `src/lib/workflow-engine.ts` | Add send advisor pre-execution hook | B |
| `src/lib/newsletter-ai.ts` | Inject personalization hints into context | A |
| `src/actions/contacts.ts` | Include ai_lead_score in queries | A |
| `src/app/(dashboard)/page.tsx` | Add AIRecommendations card | C |
| `.env.local` | Add CRON_SECRET, AI_SEND_ADVISOR, model configs | A |

---

## Appendix B: Deliverable Dependencies

```
Deliverable A (Lead Scoring)
  ├── No external dependencies
  ├── Deliverable B depends on A (needs ai_lead_score data)
  └── Deliverable C depends on A (needs scored contacts)

Deliverable B (Send Advisor)
  ├── Depends on A (reads ai_lead_score)
  └── Depends on unified cron processor (Deliverable 1.4 from Email Marketing Plan)

Deliverable C (Next Best Action)
  ├── Depends on A (reads ai_lead_score for top contacts)
  └── No dependency on B
```

**Build order:** A → B and C in parallel
