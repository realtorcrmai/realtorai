# Plan: AI Agent Layer for Realtors360 Email Marketing

> Full specification document: `/Users/bigbear/reality crm/SPEC_AI_Agent_Email_Marketing.md`
> **Action:** Copy this plan to `/Users/bigbear/reality crm/PLAN_AI_Agent.md` for VSCode Claude Code to read

## Context

The email marketing engine (from `PLAN_Email_Marketing_Engine.md`) covers the **mechanics** — send this email, at this time, to this person. But all decisions are hard-coded:
- Fixed drip schedules (welcome at 0h, guide at 72h, etc.)
- Fixed engagement scoring formula (opens×2 + clicks×3)
- Fixed trigger conditions (exact enum matches)
- No "should we even send this?" reasoning
- No "what should we send instead?" adaptation

An AI agent adds a **decision layer** on top of the existing workflow engine — it doesn't replace the engine, it makes smarter decisions about what the engine executes.

## What the Agent IS and ISN'T

**IS:** A Claude-powered reasoning service that runs periodically (via cron) and makes decisions using CRM data. It reads contact history, engagement patterns, and workflow state, then outputs **actions** that the existing workflow engine executes.

**ISN'T:** A real-time chatbot, an autonomous agent that takes actions without oversight, or a replacement for the workflow engine. The agent **recommends**, the engine **executes**.

## Architecture

```
Every 15 minutes (cron):
┌──────────────────────────────────────────────┐
│           AI AGENT (Claude Sonnet)            │
│                                              │
│  Reads:                    Outputs:          │
│  - Contact profiles        - Next best action │
│  - Click/open history      - Lead scores      │
│  - Workflow enrollments    - Churn alerts      │
│  - Communication logs      - Send/skip/swap   │
│  - Listing inventory       - Stage advances    │
│  - Activity timeline       - Agent alerts      │
│                                              │
└──────────┬───────────────────────────────────┘
           │ writes to agent_recommendations table
           │
┌──────────▼───────────────────────────────────┐
│         EXISTING WORKFLOW ENGINE              │
│  Reads recommendations, executes actions     │
│  (send email, enroll workflow, create task,  │
│   update stage, alert agent)                 │
└──────────────────────────────────────────────┘
```

## 5 Agent Capabilities (Ranked by Impact)

### 1. Smart Lead Scoring (replaces fixed formula)
**Current:** `engagement_score = opens×2 + clicks×3 + recency_bonus`
**Agent:** Claude reads last 30 days of contact activity and outputs a multi-dimensional score:

```json
{
  "contact_id": "abc",
  "buying_readiness": 82,    // behavioral signals
  "timeline_urgency": 65,    // click clustering + recency
  "budget_fit": 70,          // properties viewed vs inventory
  "intent": "serious_buyer", // or "window_shopping", "investor", "dormant"
  "reasoning": "3 showing requests in 7 days, clicked CMA twice, viewing $800K-1M range consistently"
}
```

**Why realistic:** This is a batch job (run on 50 contacts per cron cycle), not real-time. Claude reads ~500 tokens of context per contact, outputs ~100 tokens. At $0.003/contact, scoring 200 contacts/day = $0.60/day.

**Files:**
- `src/lib/ai-agent/lead-scorer.ts` — Builds context, calls Claude, parses score
- `src/app/api/cron/agent-scoring/route.ts` — Cron endpoint, processes batch
- Add `ai_lead_score JSONB` column to `contacts` table

---

### 2. Send/Skip/Swap Decision (replaces blind drip)
**Current:** Workflow engine blindly executes the next step at scheduled time.
**Agent:** Before executing an email step, ask Claude: "Given this contact's recent activity, should we send this email, skip it, or swap it for something better?"

```
Input to Claude:
- Contact: Sarah Chen, buyer, engagement_score: 45, last_opened: 3 days ago
- Scheduled email: "neighbourhood_guide" (step 5 of buyer_nurture)
- Recent activity: Clicked 3 listing links in Burnaby yesterday, opened last 2 emails
- Current inventory: 4 new listings in Burnaby this week

Claude output:
{
  "decision": "swap",
  "swap_to": "new_listing_alert",
  "reasoning": "Contact is actively browsing Burnaby listings. A neighbourhood guide is generic — send the 4 new Burnaby listings instead while interest is hot.",
  "urgency": "high"
}
```

**Why realistic:** Only runs when a step is about to execute (not on every contact). Adds ~1s latency per email send. The workflow engine already has the cron processor — this is a pre-execution hook.

**Files:**
- `src/lib/ai-agent/send-advisor.ts` — Builds context, calls Claude, returns decision
- Modify `src/lib/workflow-engine.ts` — Add pre-execution hook before `auto_email`/`ai_email` steps
- Add `ai_decision` column to `workflow_step_logs` for audit trail

---

### 3. Next Best Action for Agent Dashboard
**Current:** Agent sees activity log but gets no proactive suggestions.
**Agent:** Claude reads the top 10 highest-scored contacts and generates actionable recommendations.

```
Dashboard card:
┌─────────────────────────────────────────────┐
│  AI Recommendations                    ↻    │
│                                             │
│  🔥 Sarah Chen — Call now                   │
│     Clicked CMA 3x in 48h, viewed $900K    │
│     listings. Likely ready to make offer.   │
│     [Call] [Send Market Report]             │
│                                             │
│  ⚠️  Mike Wong — Re-engage                  │
│     Was active buyer, silent 12 days after  │
│     3 showings. May have found another      │
│     agent. [Send Check-in] [Call]           │
│                                             │
│  📈 Priya Sharma — Upgrade to active        │
│     Opened 5/5 emails, clicked 3 listings.  │
│     Still marked as "lead". [Advance Stage] │
│                                             │
└─────────────────────────────────────────────┘
```

**Why realistic:** Runs once per hour, processes top 10-20 contacts only. Output displayed on dashboard — agent decides whether to act. No autonomous actions.

**Files:**
- `src/lib/ai-agent/next-best-action.ts` — Builds contact summaries, calls Claude, returns recommendations
- `src/app/api/cron/agent-recommendations/route.ts` — Hourly cron
- Create `agent_recommendations` table (contact_id, action_type, reasoning, priority, status, expires_at)
- `src/components/dashboard/AIRecommendations.tsx` — Dashboard card component
- Modify `src/app/(dashboard)/page.tsx` — Add recommendations card

---

### 4. Auto Stage Advancement
**Current:** Contact stage (`lead → qualified → active → under_contract → closed`) is updated manually or by exact trigger matches.
**Agent:** Claude evaluates behavioral signals and recommends stage changes.

```
Rules Claude applies:
- Lead → Qualified: Multiple property views + email engagement > 60 + preferences set
- Qualified → Active: Showing booked or multiple high-intent clicks
- Active → Under Contract: (manual only — agent must confirm)
- Any → Dormant: 30+ days no activity after being active
- Dormant → Active: Re-engagement click + new showing request
```

**Why realistic:** Runs in the same batch as lead scoring (capability 1). Claude already has the context — adding stage recommendation is just one more output field.

**Added to lead scorer output:**
```json
{
  "stage_recommendation": "advance",
  "new_stage": "qualified",
  "reasoning": "Contact viewed 8 properties, engaged with 4/5 emails, set price preference to $700-900K"
}
```

**Files:**
- Extend `src/lib/ai-agent/lead-scorer.ts` — Add stage recommendation to output
- Modify `src/lib/workflow-triggers.ts` — Check AI recommendations before manual trigger matching
- Add confirmation UI: agent sees "AI suggests advancing Sarah to Qualified" with [Accept] [Dismiss]

---

### 5. Content Personalization Hints
**Current:** Claude AI generates email content with generic context (contact name, type, area).
**Agent:** Before content generation, the agent generates "personalization hints" based on the contact's behavioral profile.

```
Hints for contact Sarah Chen:
{
  "tone": "data-driven",           // from content_preference
  "interests": ["Burnaby", "townhouses", "near schools"],
  "price_anchor": "$850K",          // from properties viewed
  "hot_topic": "new listings",      // from recent click pattern
  "avoid": "mortgage tips",         // opened but never clicked these
  "relationship_stage": "warm",     // based on engagement trajectory
  "personalization_note": "Sarah has school-age children (clicked school_info 4x). Emphasize family-friendly features."
}
```

These hints are injected into the existing `generateNewsletterContent()` context so Claude writes better emails.

**Why realistic:** No new API call — the hints are pre-computed during lead scoring (capability 1) and stored on the contact. The newsletter AI already accepts context — we're just enriching it.

**Files:**
- Extend `src/lib/ai-agent/lead-scorer.ts` — Add personalization hints to output
- Store hints in `contacts.newsletter_intelligence.ai_hints` (JSONB, already exists)
- Modify `src/lib/newsletter-ai.ts` — Include `ai_hints` in Claude context when generating content

---

## Implementation Plan (3 Deliverables)

### Deliverable A: Agent Core + Lead Scoring + Personalization Hints
**Effort:** 3 days | **Capabilities:** 1, 4, 5

**Migration:** `supabase/migrations/015_ai_agent.sql`
```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_lead_score JSONB;
-- Fields: buying_readiness, timeline_urgency, budget_fit, intent, reasoning,
--         stage_recommendation, new_stage, personalization_hints

CREATE TABLE agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  action_type TEXT NOT NULL,
  action_config JSONB,
  reasoning TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Files to create:**
- `src/lib/ai-agent/lead-scorer.ts`
  - `scoreContact(contactId)` — fetches contact + activity + communications + newsletter_events, builds prompt, calls Claude, returns score JSON
  - `scoreBatch(contactIds)` — processes up to 50 contacts
  - Prompt template: system prompt with scoring rubric, user prompt with contact data summary
  - Output: `{ buying_readiness, timeline_urgency, budget_fit, intent, reasoning, stage_recommendation, personalization_hints }`

- `src/app/api/cron/agent-scoring/route.ts`
  - Protected by CRON_SECRET
  - Fetches contacts with recent activity (last 7 days) OR stale scores (scored > 24h ago)
  - Calls `scoreBatch()`
  - Writes scores to `contacts.ai_lead_score`
  - Writes stage recommendations to `agent_recommendations`

**Files to modify:**
- `src/lib/newsletter-ai.ts` — Add `ai_hints` from `contact.ai_lead_score.personalization_hints` to Claude context
- `src/actions/contacts.ts` — Include `ai_lead_score` in contact queries

**Test:** Run cron endpoint, verify scores written to contacts table, verify newsletter AI uses personalization hints in generated content.

---

### Deliverable B: Send/Skip/Swap + Audit Trail
**Effort:** 2 days | **Capability:** 2

**Files to create:**
- `src/lib/ai-agent/send-advisor.ts`
  - `adviseSend(enrollmentId, step)` — fetches contact context + recent activity + current step details, asks Claude: send/skip/swap?
  - Returns: `{ decision: "send"|"skip"|"swap", swap_to?: string, reasoning: string }`
  - Prompt includes: contact profile, last 5 interactions, scheduled email type, current listings matching contact interests

**Files to modify:**
- `src/lib/workflow-engine.ts` — Add pre-execution hook:
  ```
  Before executing auto_email or ai_email step:
  1. Call adviseSend(enrollment, step)
  2. If "send" → proceed as normal
  3. If "skip" → log skip reason, advance to next step
  4. If "swap" → change email_type to recommended, then proceed
  5. Log decision to workflow_step_logs.metadata.ai_decision
  ```

- `src/app/api/cron/process-workflows/route.ts` — Enable the hook (feature flag: `AI_SEND_ADVISOR=true` env var)

**Migration:** Add column to workflow_step_logs:
```sql
ALTER TABLE workflow_step_logs ADD COLUMN IF NOT EXISTS ai_decision JSONB;
```

**Test:** Enroll contact in workflow, manually set next_run_at to past, run cron, verify Claude was consulted before send, verify decision logged in step_logs.

**Feature flag:** `AI_SEND_ADVISOR=true/false` in `.env.local` — can disable without code change if costs are too high.

---

### Deliverable C: Next Best Action Dashboard Card
**Effort:** 2 days | **Capability:** 3

**Files to create:**
- `src/lib/ai-agent/next-best-action.ts`
  - `generateRecommendations()` — fetches top 20 contacts by `ai_lead_score.buying_readiness` DESC, generates 3-5 actionable recommendations via Claude
  - Each recommendation: contact_id, action_type (call, send_email, enroll_workflow, advance_stage), reasoning, priority (hot/warm/info)

- `src/app/api/cron/agent-recommendations/route.ts`
  - Runs hourly
  - Calls `generateRecommendations()`
  - Writes to `agent_recommendations` table
  - Expires old recommendations (> 24h)

- `src/components/dashboard/AIRecommendations.tsx`
  - Card with 3-5 recommendation rows
  - Each row: priority icon, contact name, action description, reasoning snippet
  - Action buttons: [Call] [Send Email] [Advance Stage] [Dismiss]
  - [Call] → opens phone dialer / logs call task
  - [Send Email] → navigates to newsletter compose for that contact
  - [Advance Stage] → calls API to update contact stage
  - [Dismiss] → marks recommendation as dismissed

- `src/actions/recommendations.ts` — `getRecommendations()`, `dismissRecommendation()`, `executeRecommendation()`

**Files to modify:**
- `src/app/(dashboard)/page.tsx` — Add `<AIRecommendations />` card to dashboard

**Test:** Run cron, verify recommendations appear on dashboard, click action buttons, verify they execute correctly.

---

## Cost Estimation

| Capability | Frequency | Contacts/run | Tokens/contact | Cost/run | Daily cost |
|---|---|---|---|---|---|
| Lead Scoring | Every 15 min | 50 | ~800 in + 200 out | $0.015 | $1.44 |
| Send Advisor | Per email send | ~20/day | ~600 in + 100 out | $0.003 | $0.06 |
| Next Best Action | Hourly | Top 20 | ~1500 in + 500 out | $0.05 | $1.20 |

**Total: ~$2.70/day** ($81/month) at 200 active contacts with Claude Sonnet.

Can reduce by:
- Scoring only contacts with new activity (not all 200)
- Running Next Best Action every 4h instead of hourly
- Using Haiku for lead scoring ($0.30/day instead of $1.44)

---

## What We're NOT Building (And Why)

| Idea | Why Not |
|---|---|
| Real-time AI agent (responds instantly) | Adds latency to every action, expensive, not needed for email marketing |
| Autonomous agent (acts without approval) | Realtors need control — agent recommends, human decides |
| AI-powered email scheduling (optimal send time) | Requires 6+ months of send data to train. Build later when we have data. |
| Conversational AI (chatbot for leads) | Different product entirely — scope creep |
| Predictive deal scoring | Need outcome data (which contacts actually bought/sold) — we don't track this yet |

---

## Deliverable Summary

| # | Deliverable | Effort | Dependencies |
|---|---|---|---|
| **A** | Agent Core + Lead Scoring + Personalization + Auto Stage | 3 days | Phase 1 of email plan (unified engine) |
| **B** | Send/Skip/Swap Advisor + Audit Trail | 2 days | A + Deliverable 1.4 (cron processor) |
| **C** | Next Best Action Dashboard Card | 2 days | A |

**Total: 7 developer-days** | **Running cost: ~$2.70/day**

Can run parallel with Phase 2-3 of the email marketing plan (visual builders). No overlap.

## Review Corrections (3-Pass Audit Against Codebase)

### Pass 1: Data Flow Integrity — ALL VERIFIED
Every column, table, and function the spec references exists in the actual codebase. Confirmed:
- `contacts.stage_bar` (migration 011), `lead_status` (008), `tags` (008), `buyer_preferences` (007), `seller_preferences` (014), `newsletter_intelligence` (010), `last_activity_date` (015), `household_id` (017), `family_members` (006), `referred_by_id` (006)
- `workflow_enrollments`, `workflow_steps`, `workflow_step_logs`, `activity_log`, `agent_notifications`, `message_templates` — all from migration 009
- `newsletter_events`, `newsletters`, `contact_journeys` — all from migration 010
- `newsletter_intelligence` JSONB keys: `total_opens`, `last_opened`, `total_clicks`, `last_clicked`, `click_history`, `inferred_interests`, `content_preference`, `engagement_score` — all match webhook handler

### Pass 2: Schema Corrections Required

**1. action_type CHECK constraint needs ALTER**
The `workflow_steps.action_type` CHECK constraint (migration 009) currently allows:
`auto_email, auto_sms, auto_whatsapp, manual_task, auto_alert, system_action, wait, condition`
Plus `milestone` added in migration 010.
**Spec needs:** Add `ai_email` to the CHECK constraint via ALTER:
```sql
ALTER TABLE workflow_steps DROP CONSTRAINT IF EXISTS workflow_steps_action_type_check;
ALTER TABLE workflow_steps ADD CONSTRAINT workflow_steps_action_type_check
  CHECK (action_type IN ('auto_email','auto_sms','auto_whatsapp','manual_task',
    'auto_alert','system_action','wait','condition','milestone','ai_email'));
```

**2. newsletter_intelligence.ai_hints — safe write pattern**
The Resend webhook handler (`src/app/api/webhooks/resend/route.ts`) does a spread update on `newsletter_intelligence`:
```typescript
const updated = { ...existing, total_opens: ..., engagement_score: ... };
```
This PRESERVES existing keys including `ai_hints`. However, the spec should explicitly note:
- Lead scorer writes to `newsletter_intelligence.ai_hints`
- Webhook handler writes to `newsletter_intelligence.engagement_score`, etc.
- Both do `{ ...existing, newFields }` — no overwrite conflict as long as both spread first

**3. TypeScript types missing newsletter_id on communications**
`src/types/database.ts` is missing `newsletter_id: string | null` on the communications table types. Schema has it (migration 010). Not a blocker for agent but should be fixed as part of implementation.

### Pass 3: Integration Points Verified

**Showing events:** `showing_completed` trigger fires in `showings.ts` when status = "confirmed". Agent can subscribe to this for recommendations.

**Listing events:** `listing_status_change` trigger fires in `listings.ts` on status transitions (active/pending/sold). Auto-syncs seller `stage_bar`. Perfect for agent to detect deal progression.

**Dashboard UI:** Current layout has PipelineSnapshot → Feature Tiles. Recommendations card fits between them. No existing recommendation/AI scoring code anywhere in codebase (only `dataScore` for data completeness, unrelated).

**Contact detail page:** Right sidebar (340px fixed) already shows `dataScore` (data quality). AI lead scores should ALSO display here — add to spec as additional integration point.

**Newsletter function:** `generateAndQueueNewsletter(contactId, emailType, journeyPhase, journeyId?, sendMode)` — agent's `executeRecommendation()` should call this with correct 5 params.

**No duplication risk:** Zero existing recommendation, ai_score, or lead_score code found in entire src/. Clean slate.

### Spec Updates Needed Before Implementation

| # | Update | Location in Spec |
|---|--------|-----------------|
| 1 | Add ALTER TABLE for action_type CHECK constraint to include 'ai_email' | Migration 015_ai_agent.sql |
| 2 | Note spread-safe write pattern for newsletter_intelligence.ai_hints | Section 6.4 (cron endpoint) |
| 3 | Add AI score display to contact detail right sidebar | New FR in Section 3 |
| 4 | Fix executeRecommendation() to call generateAndQueueNewsletter with correct 5 params | Section 8.5 |
| 5 | Add 'milestone' to action_type list in workflow engine discussion | Section 7.4 |
| 6 | Note communications.newsletter_id TypeScript type gap | Appendix |
| 7 | **Add email confirmation/preview requirement** — see below | Section 3 (FR-2), Section 7, Section 8 |

### Email Types: Transactional vs Newsletter (User Requirement)

In the workflow, there are two fundamentally different types of emails. The system must treat them differently:

**Transactional Emails (1:1, triggered by contact activity)**
- Welcome email, follow-up after showing, check-in text, thank you after close
- Triggered by a specific contact action (new lead, showing confirmed, deal closed)
- Personal tone — feels like the realtor wrote it directly to that person
- Uses `message_templates` with {{variables}} (name, listing address, etc.)
- Step type: `auto_email` (from existing workflow engine)
- **Confirmation:** Sent automatically OR via review queue depending on workflow `send_mode`
- **Example:** "Hi Sarah, thanks for visiting 123 Main St yesterday. I'd love to hear your thoughts..."

**Newsletter Emails (1:many, content-driven, AI-generated)**
- New listing alert, market update, neighbourhood guide, home anniversary
- Scheduled by drip timing (72h after lead, monthly market update, etc.)
- Marketing tone — informative, branded, designed template with images/stats
- Uses React Email templates rendered by Claude AI (6 built-in types)
- Step type: `ai_email` (new step type from this spec)
- **Confirmation:** ALWAYS goes to approval queue — realtor previews AI-generated content before send
- **Example:** Beautiful HTML email with listing photos, price, neighborhood stats, CTA button

**How they differ in the workflow:**

| Aspect | Transactional (`auto_email`) | Newsletter (`ai_email`) |
|--------|------------------------------|------------------------|
| Content source | `message_templates` table (pre-written) | Claude AI generates per-contact |
| Template style | Plain text with {{variables}} | React Email HTML (designed, responsive) |
| Personalization | Variable substitution only | AI reads contact intelligence, infers interests, adapts tone |
| Send channel | Email, SMS, or WhatsApp (per step config) | Email only (rich HTML) |
| Confirmation | Configurable (auto or review) | Always review queue (default) |
| AI Advisor | Optional (can be skipped for simple messages) | Always consulted (swap/skip/send) |
| Tracking | Basic send log | Full Resend tracking (opens, clicks, bounces, intelligence) |
| Frequency cap | None (workflow timing controls) | Max 1 newsletter per contact per 24h, same type dedup 7 days |
| Cost | $0 (template only) | ~$0.003 per email (Claude API call) |

**In the visual workflow builder (Phase 3):**
- Purple "Email" node → user picks: "Template Email" (auto_email) or "AI Newsletter" (ai_email)
- Template Email: select from message_templates dropdown, preview with sample variables
- AI Newsletter: select email_type (new_listing_alert, market_update, etc.), AI generates at send time

**Key rule:** Transactional emails can auto-send (they're pre-written, predictable). Newsletter emails always queue for review (AI-generated content needs human eye before reaching clients).

---

### Email Confirmation Before Send (User Requirement)

**No email shall be sent without the realtor previewing and confirming it first.** This applies to ALL email paths:

**1. Send Advisor (Deliverable B):**
- When the advisor returns `send` or `swap`, the system generates the email as a **draft** (status = 'draft') — NOT auto-sent
- Draft appears in the approval queue (`/newsletters/queue`) with the AI advisor reasoning shown
- If the advisor swapped the email type, the queue shows: "AI recommended: New Listing Alert instead of Neighbourhood Guide — [reason]"
- Realtor clicks [Preview] to see full email in iframe, then [Send] or [Skip]
- This replaces the `send_mode: "auto"` behavior — all AI-advised emails default to `send_mode: "review"`

**2. Next Best Action (Deliverable C):**
- When realtor clicks [Send Email] on a recommendation, it does NOT send immediately
- Instead: generates email draft → navigates to `/newsletters/queue` with that draft highlighted
- Realtor previews the generated email and clicks [Send] to confirm

**3. Workflow ai_email Steps:**
- All `ai_email` steps should default `send_mode: "review"` (not "auto")
- Email is generated, saved as draft, appears in approval queue
- Realtor can batch-approve or review individually
- Optional: realtor can enable `send_mode: "auto"` per workflow if they trust the content (opt-in, not default)

**4. Approval Queue Enhancements:**
- Show AI reasoning for each email: "Why this email?" card with advisor decision or recommendation context
- Show AI lead score badge on each contact in the queue (hot/warm/info)
- "Approve All" button for batch confirmation (existing feature, preserved)
- Email preview must show the FINAL rendered HTML with all variables resolved

**Impact on Spec:**
- FR-2.2 update: Send advisor should always create drafts, never auto-send
- FR-2.4 update: "Skip" still works the same (advances workflow, no email)
- FR-5.7 update: [Send Email] button → generate draft → navigate to queue (not direct send)
- Section 7.4 update: Workflow engine hook defaults send_mode to "review" for all AI-advised emails
- Section 8.5 update: `executeRecommendation()` for send_email → calls `generateAndQueueNewsletter(..., "review")` → redirects to queue

---

## AI Content Generation Strategy

### How Claude Generates Newsletter Content Today

Currently (`src/lib/newsletter-ai.ts`), Claude receives minimal context:
- Contact name, type, email
- A few listings (address, price, beds, baths)
- Email type and journey phase
- Optional: engagement score, click history

**Problem:** Claude generates generic real estate copy because it doesn't know what top BC realtors actually send, what the contact cares about, or what demographic factors drive engagement.

### The Fix: 3-Layer Content Intelligence

#### Layer 1: Reference Newsletter Research (One-Time Setup + Quarterly Refresh)

Before Claude generates ANY content, it should know what good BC real estate newsletters look like. This is a **pre-computed knowledge base**, not a per-email lookup.

**Implementation:**
- Create `src/lib/ai-agent/newsletter-reference.ts`
- On first run (or quarterly via scheduled task): use Claude with web_search tool to research 20-30 top BC realtor newsletters
- Extract patterns: subject line formulas, content structure, tone, what works per audience segment
- Store as a static reference prompt in `newsletter_reference_data` (Supabase or local JSON)
- Inject this as part of Claude's system prompt when generating any newsletter

**What to extract from top performers:**
- Subject line patterns that get 30-40% open rates (e.g., "[Neighbourhood] Market Report — March 2026" vs "Your Monthly Update")
- Content structure: what sections in what order (hook → data → listings → CTA)
- Tone per audience: first-time buyers (educational, encouraging) vs investors (data-heavy, ROI-focused) vs past clients (warm, personal, referral-ask)
- Local content that BC audiences engage with (school catchment, transit, parks, local restaurants)
- Seasonal hooks (spring market, rate changes, BC Assessment notices in January)

**Cost:** One-time ~$0.50 per research run. Quarterly = $2/year.

#### Layer 2: Demographic-Driven Personalization (Per Contact)

The CRM already collects rich demographics. Here's what matters most for newsletters and how Claude should use each:

**Tier 1 — High Impact Demographics (directly change content):**

| Field | Source | How It Changes Content |
|---|---|---|
| `buyer_preferences.preferred_areas` | Buyer prefs form | Only show listings/stats for THEIR areas, not generic metro |
| `buyer_preferences.price_range_min/max` | Buyer prefs form | Filter listings to their budget, cite comparable stats in their range |
| `buyer_preferences.property_types` | Buyer prefs form | "3 new townhouses in Burnaby" not "3 new properties" |
| `buyer_preferences.move_in_timeline` | Buyer prefs form | Urgent (< 3 months) → action-oriented CTAs. Long (12+ months) → educational content |
| `seller_preferences.motivation` | Seller prefs form | Relocating → moving logistics tips. Downsizing → "right-size your life" angle. Estate → sensitivity |
| `demographics.family_size` + `family_members` | Demographics form | Family > 2 → school info, parks, family-friendly. Single/couple → nightlife, walkability, commute |
| `newsletter_intelligence.inferred_interests` | Webhook tracking | What they ACTUALLY click on overrides stated preferences |
| `tags` | Agent-assigned | "investor" → ROI focus. "first-time buyer" → educational. "VIP" → exclusive access tone |

**Tier 2 — Medium Impact (tone and timing):**

| Field | Source | How It Changes Content |
|---|---|---|
| `demographics.occupation` | Demographics form | Professional → concise data. Creative → lifestyle-driven. Executive → luxury positioning |
| `demographics.income_range` | Demographics form | Affects which listings to feature, price range of market data |
| `demographics.languages` | Demographics form | If includes Mandarin/Punjabi/Hindi → could note multilingual service in footer |
| `demographics.hobbies_interests` | Demographics form | Golfer → mention golf course proximity. Foodie → restaurant scene |
| `source` | Lead source | Referral → warmer personal tone. Cold lead → more educational, build trust first |
| `stage_bar` | Lifecycle | Lead → educational. Active → action-oriented. Past client → personal, referral-ask |
| `lead_status` | Pipeline | Qualified → they're serious, push listings. Nurturing → slower educational drip |

**Tier 3 — Timing Signals (when to send what):**

| Field | Source | How It Affects Timing |
|---|---|---|
| `demographics.birthday` | Demographics form | Birthday month → personal note + "thinking of you" |
| `contact_dates` (anniversary, move-in) | Events table | Home anniversary → equity update. Purchase anniversary → "1 year in your home!" |
| `last_activity_date` | Auto-tracked | Active in last 7 days → more frequent. Dormant 30+ days → re-engagement |
| `newsletter_intelligence.engagement_score` | Webhook | Score > 70 → safe to send more often. Score < 30 → reduce frequency, risk unsubscribe |

#### Layer 3: Enhanced Claude System Prompt

The lead scorer (Deliverable A) computes `personalization_hints`. These hints feed into the newsletter AI's system prompt. Here's the enhanced prompt structure:

```
SYSTEM PROMPT (cached, ~800 tokens):
You are a real estate email copywriter for a BC REALTOR.

CONTENT RULES (from top-performing BC newsletters):
- Subject: Use [Area] + specific detail, not generic. E.g., "3 New Burnaby Townhouses Under $800K"
- Hook: Open with a relevant stat, question, or local event — never "Hi [Name], I hope you're well"
- Body: Lead with value (listings, data, tips), then personal note, then CTA
- CTA: One clear action per email. "Book a Showing" not "Learn More"
- Tone: Match the contact's profile (see personalization hints below)
- Local flavor: Reference specific BC neighborhoods, schools, parks, transit by name
- Length: 150-300 words for market updates, 100-200 for listing alerts, 200-400 for guides

SEASONAL CONTEXT:
- January: BC Assessment notices → "Did your home value change?"
- March-April: Spring market surge → "New listings hitting the market"
- September: Back to school → families looking for school catchment
- Fall: Rate announcements → "What the latest rate change means for you"

USER PROMPT (unique per contact, ~400 tokens):
Generate a {email_type} email for this contact:

CONTACT PROFILE:
- Name: {name}, Type: {type}, Stage: {stage_bar}
- Areas of interest: {preferred_areas or inferred_interests.areas}
- Budget: {price_range_min}-{price_range_max}
- Property types: {property_types}
- Timeline: {move_in_timeline}
- Family: {family_size} members, {family_members summary}

AI PERSONALIZATION HINTS:
- Tone: {hints.tone}
- Hot topic: {hints.hot_topic}
- Interests: {hints.interests}
- Avoid: {hints.avoid}
- Note: {hints.note}

MATCHING LISTINGS (if applicable):
{filtered listings matching contact preferences}

RECENT ENGAGEMENT:
- Last opened: {days} days ago
- Last clicked: {link_type} — {link_url}
- Engagement score: {score}/100
```

### Key Demographics That Make Newsletters Better

Based on research and the CRM data model, these are the **must-have** demographic fields that the AI needs:

| Rank | Field | Why It Matters | Currently Collected? |
|---|---|---|---|
| 1 | **Preferred areas** | Filters ALL content to relevant geography | Yes (buyer_preferences) |
| 2 | **Price range** | Determines which listings to feature, market data to cite | Yes (buyer_preferences) |
| 3 | **Property type** | "3 new townhouses" >> "3 new properties" | Yes (buyer_preferences) |
| 4 | **Move-in timeline** | Urgent vs long-term changes tone and CTA | Yes (buyer_preferences) |
| 5 | **Family size/members** | School info, family-friendly features, space needs | Yes (demographics + family_members) |
| 6 | **Tags (investor/first-time/VIP)** | Completely changes content angle | Yes (tags array) |
| 7 | **Click history** | What they ACTUALLY engage with (overrides stated prefs) | Yes (newsletter_intelligence) |
| 8 | **Engagement score** | Determines send frequency and content depth | Yes (newsletter_intelligence) |
| 9 | **Motivation (sellers)** | Relocating vs downsizing vs estate = different tone | Yes (seller_preferences) |
| 10 | **Occupation** | Professional tone vs lifestyle tone | Yes (demographics) |

**Gap:** All key fields already exist in the CRM. The problem isn't data collection — it's that `newsletter-ai.ts` currently only passes 3-4 of these to Claude. The fix is in Deliverable A (personalization hints) which pre-computes all of this into a concise hints object.

### Newsletter Reference Research: Implementation

**New scheduled task or one-time script:**

```typescript
// src/lib/ai-agent/newsletter-reference.ts

async function researchTopNewsletters(): Promise<NewsletterReference> {
  // 1. Use Claude with web_search to find top BC realtor newsletters
  // 2. Analyze 20-30 examples for patterns
  // 3. Extract: subject formulas, content structures, tone per segment
  // 4. Store as JSON reference for all future content generation

  const research = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{
      role: "user",
      content: `Research the top 20 BC real estate agent newsletters.
      Find examples from: Vancouver, Surrey, Burnaby, Richmond, Victoria, Kelowna.

      For each, extract:
      1. Subject line patterns that get high open rates
      2. Content structure (sections, order, length)
      3. Tone and voice per audience segment
      4. Types of local content included
      5. CTA patterns
      6. Seasonal themes used

      Compile into a "best practices guide" that another AI can follow when generating newsletters.`
    }]
  });

  // Parse and store the reference
  return parseAndStore(research);
}
```

This runs once, produces a ~2000 token reference guide, and gets injected as a cached system prompt for ALL future newsletter generation. Quarterly refresh keeps it current.

---

## Verification

1. **Lead Scoring:** `curl /api/cron/agent-scoring` → check `contacts.ai_lead_score` populated in Supabase
2. **Personalization:** Generate a newsletter for a scored contact → verify AI hints appear in email content
3. **Send Advisor:** Enroll contact in workflow with AI_SEND_ADVISOR=true → verify `ai_decision` logged in step_logs
4. **Recommendations:** `curl /api/cron/agent-recommendations` → check dashboard shows cards with actions
5. **Stage Advance:** Accept a stage recommendation on dashboard → verify contact stage updated
