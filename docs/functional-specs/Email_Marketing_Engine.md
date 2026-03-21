# ListingFlow Email Marketing Engine — Functional Specification

**Version:** 1.0
**Date:** March 21, 2026
**Status:** Implemented
**Module:** Email Marketing + AI Agent Layer

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [How It Works — End to End](#2-how-it-works)
3. [Contact Journeys](#3-contact-journeys)
4. [AI Content Generation](#4-ai-content-generation)
5. [Email Templates](#5-email-templates)
6. [Sending & Delivery](#6-sending--delivery)
7. [Click Tracking & Contact Intelligence](#7-click-tracking--contact-intelligence)
8. [AI Agent Layer](#8-ai-agent-layer)
9. [Approval Queue](#9-approval-queue)
10. [Analytics & Dashboard](#10-analytics--dashboard)
11. [Visual Builders](#11-visual-builders)
12. [Contact Segments](#12-contact-segments)
13. [Compliance & Unsubscribe](#13-compliance--unsubscribe)
14. [Cron Jobs & Scheduling](#14-cron-jobs--scheduling)
15. [Data Model](#15-data-model)
16. [File Reference](#16-file-reference)
17. [Environment Variables](#17-environment-variables)

---

## 1. System Overview

The ListingFlow Email Marketing Engine automates relationship nurturing for BC realtors. It replaces manual email writing with an AI-powered system that generates personalized, event-driven emails for every contact in the CRM.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REALTOR'S DASHBOARD                       │
│  Newsletter Dashboard → Approval Queue → Analytics          │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    WORKFLOW ENGINE                            │
│                                                              │
│  Contact Event ──→ Journey Phase ──→ Email Step Due          │
│                                        │                     │
│                    ┌───────────────────▼──────────────┐      │
│                    │ AI SEND ADVISOR (optional)        │      │
│                    │ Should we send / skip / swap?     │      │
│                    └───────────────────┬──────────────┘      │
│                                        │                     │
│                    ┌───────────────────▼──────────────┐      │
│                    │ AI CONTENT GENERATOR              │      │
│                    │ Claude writes unique email using:  │      │
│                    │ • Contact profile + preferences   │      │
│                    │ • Click history + engagement      │      │
│                    │ • Active listings in their area   │      │
│                    │ • AI personalization hints         │      │
│                    └───────────────────┬──────────────┘      │
│                                        │                     │
│                    ┌───────────────────▼──────────────┐      │
│                    │ REACT EMAIL TEMPLATE              │      │
│                    │ Beautiful HTML with branding       │      │
│                    └───────────────────┬──────────────┘      │
│                                        │                     │
│         ┌─────────┬───────────────────▼──────────────┐      │
│         │ Review  │         RESEND API               │      │
│         │ Mode    │ Send email + track opens/clicks   │      │
│         │ ↓       │                                   │      │
│         │ Draft → │ Approval Queue → Realtor approves │      │
│         │         │                                   │      │
│         │ Auto    │                                   │      │
│         │ Mode    │ Send immediately                  │      │
│         └─────────┴───────────────────┬──────────────┘      │
└────────────────────────────────────────┼────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────┐
│                    RESEND WEBHOOKS                            │
│                                                              │
│  email.delivered → log event                                 │
│  email.opened    → update opens count, engagement score      │
│  email.clicked   → classify link, update interests,          │
│                    hot lead alert if high-intent              │
│  email.bounced   → unsubscribe contact, pause journeys       │
│  email.complained → same as bounce                           │
│                                                              │
│  Every click feeds back into Contact Intelligence            │
│  which improves the NEXT email for that contact              │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Every email is unique.** Claude AI writes content using the contact's actual CRM data — no generic templates with `{{first_name}}` swapped in.
2. **Event-driven, not time-based.** Journey phases advance when real events happen (showing booked, offer accepted, deal closed).
3. **Clicks teach the system.** Every link click updates the contact's intelligence profile, which improves future emails.
4. **Realtor stays in control.** Review mode lets them preview and approve every email. Auto mode runs hands-free.

---

## 2. How It Works — End to End

### Step-by-Step Flow

```
STEP 1: Contact enters CRM
    └─→ Auto-enrolled in buyer or seller journey (based on contact.type)
    └─→ Phase set to "lead", first email scheduled

STEP 2: Cron runs every 5 minutes
    └─→ Finds contacts with next_email_at <= now
    └─→ For each due contact:

STEP 3: AI Send Advisor consulted (if enabled)
    └─→ Claude evaluates: "Should we send this email, skip it, or swap for something better?"
    └─→ Decision logged to audit trail

STEP 4: AI Content Generator writes the email
    └─→ Reads: contact profile, preferences, click history, active listings, AI hints
    └─→ Outputs: subject line, intro, body, CTA, optional stats/tips
    └─→ Validated against Zod schema

STEP 5: React Email template renders HTML
    └─→ One of 6 templates: NewListingAlert, MarketUpdate, JustSold, etc.
    └─→ Includes realtor branding (name, logo, colors, headshot)
    └─→ Responsive + dark mode support

STEP 6: Email queued or sent
    └─→ Review mode: saved as draft → appears in Approval Queue
    └─→ Auto mode: sent immediately via Resend API

STEP 7: Realtor reviews (review mode only)
    └─→ Opens /newsletters/queue
    └─→ Clicks email card → preview in iframe
    └─→ Clicks "Send" (approve) or "Skip"
    └─→ Can bulk-approve all pending emails

STEP 8: Resend delivers email
    └─→ Email sent to contact's inbox
    └─→ List-Unsubscribe header included
    └─→ Tracking enabled for opens and clicks

STEP 9: Contact interacts with email
    └─→ Opens email → Resend fires email.opened webhook
    └─→ Clicks link → Resend fires email.clicked webhook
    └─→ Bounces → email.bounced webhook
    └─→ Complains → email.complained webhook

STEP 10: Webhook updates Contact Intelligence
    └─→ Engagement score recalculated
    └─→ Click history updated (last 50 clicks retained)
    └─→ Interests inferred from link types (listing → area, school → family)
    └─→ Content preference updated (data_driven, lifestyle)
    └─→ High-intent clicks (showing, CMA) → alert realtor immediately

STEP 11: Next email adapts
    └─→ AI reads updated intelligence when generating next email
    └─→ Content personalized based on actual behavior
    └─→ Frequency adjusted based on engagement score

STEP 12: Phase advances on real events
    └─→ Showing booked → buyer moves from "lead" to "active"
    └─→ Offer accepted → moves to "under_contract"
    └─→ Deal closed → moves to "past_client"
    └─→ 60 days no interaction → moves to "dormant"
    └─→ Each phase has its own email sequence
```

---

## 3. Contact Journeys

### Journey Types

Every contact is enrolled in a lifecycle journey based on their type. Each journey has 5 phases with phase-specific email sequences.

### Buyer Journey

| Phase | Entry Trigger | Emails Sent | Next Phase Trigger |
|-------|--------------|-------------|-------------------|
| **Lead** | Contact created (type=buyer) | Welcome → Neighbourhood Guide (day 3) → Listing Alert (day 7) → Market Update (day 14) → Listing Alert (day 21) | Showing booked |
| **Active** | Showing booked | Weekly Listing Alerts → Market Report (day 21) | Offer accepted |
| **Under Contract** | Offer accepted | Neighbourhood Guide (day 2) | Deal closed |
| **Past Client** | Deal closed | Home Anniversary (day 30) → Market Update (day 90) → Referral Ask (day 180) → Anniversary (year 1) | Goes dormant |
| **Dormant** | 60 days no interaction | Re-engagement (immediate) → Market Update (day 14) | Click or reply |

### Seller Journey

| Phase | Entry Trigger | Emails Sent | Next Phase Trigger |
|-------|--------------|-------------|-------------------|
| **Lead** | Contact created (type=seller) | Welcome + CMA (immediate) → Market Update (day 3) → Neighbourhood Guide (day 7) | Listing signed |
| **Active Listing** | Listing created | Weekly Showing Summary | Offer accepted |
| **Under Contract** | Offer accepted | *(no automated emails — manual communication)* | Deal closed |
| **Past Client** | Deal closed | Market Update (day 30) → Referral Ask (day 90) → Anniversary (year 1) | Goes dormant |
| **Dormant** | 60 days no interaction | Re-engagement → Market Update (day 14) | Click or reply |

### Phase Transitions

Phase transitions are **event-driven**, triggered by real CRM events:

```
Contact Action              →  Journey Phase Change
──────────────────────────────────────────────────
Contact created             →  Enroll in journey, start at "lead"
Showing booked              →  Buyer → "active"
Listing created             →  Seller → "active"
Offer accepted              →  → "under_contract"
Deal closed                 →  → "past_client"
60 days no interaction      →  → "dormant"
Click or reply (dormant)    →  → back to previous phase
```

### Journey Controls

The realtor can:
- **Pause** any contact's journey (with reason)
- **Resume** a paused journey (next email scheduled immediately)
- **Advance** phase manually (without waiting for event)
- **Set send mode** per journey: Review (approve each email) or Auto (send automatically)

---

## 4. AI Content Generation

### How Claude Writes Each Email

For every email, Claude receives a rich context payload and generates unique content.

**Input to Claude:**

```
SYSTEM PROMPT (cached):
- Copywriting rules (concise, personal, no filler)
- BC real estate best practices (subject formulas, local content)
- Seasonal context (spring market, rate changes, BC Assessment)
- Personalization hints from lead scoring (tone, interests, avoid topics)

USER PROMPT (unique per contact):
- Contact: name, type, stage, lead status
- Preferences: areas, price range, bedrooms, property types, timeline
- Engagement: score, last click, content preference
- Click history: last 5 clicks with types
- Listings: up to 5 active listings matching preferences
- Email type: new_listing_alert, market_update, etc.
```

**Output from Claude (validated by Zod):**

```json
{
  "subject": "3 New Condos in Kitsilano Under $950K",
  "intro": "Hi Sarah, three new condos just hit the market in Kits...",
  "body": "The one at 2456 Cornwall is a standout — 2BR with ocean views...",
  "ctaText": "Book a Showing",
  "stats": [{ "label": "Avg Price", "value": "$920K", "change": "+4.2%" }],
  "highlights": ["Ocean views", "2 blocks from the beach"],
  "tips": ["Check school catchments before your visit"],
  "funFact": "Kitsilano was named after Chief Khahtsahlano of the Squamish Nation"
}
```

### Personalization Layers

| Layer | Source | How It Changes Content |
|-------|--------|----------------------|
| **Contact Profile** | CRM data | Name, type, area, budget, family size |
| **Click History** | Webhook tracking | What they actually engage with overrides stated prefs |
| **AI Lead Score** | Lead scorer cron | Buying readiness, intent, timeline urgency |
| **Personalization Hints** | Lead scorer output | Tone (data-driven/lifestyle), hot topics, avoid list |
| **Engagement Score** | Webhook intelligence | High engagement → more content. Low → reduce frequency |

### Fallback Handling

If Claude's response fails Zod validation or JSON parsing:
1. Try extracting JSON from markdown code fences
2. Try regex match for `{...}` pattern
3. Fall back to generic content: subject = "Update for {firstName}", body = raw text cleaned of JSON artifacts

---

## 5. Email Templates

### 6 React Email Templates

All templates use the `BaseLayout` wrapper which provides:
- Realtor branding (name, logo, headshot, accent color)
- Dark mode CSS support (`@media prefers-color-scheme: dark`)
- Mobile responsive breakpoints (600px)
- Unsubscribe link in footer
- List-Unsubscribe header for one-click unsubscribe

| Template | File | Content Structure |
|----------|------|-------------------|
| **New Listing Alert** | `NewListingAlert.tsx` | Intro → listing cards (photo, price, specs, CTA) → signoff |
| **Market Update** | `MarketUpdate.tsx` | Intro → stats grid (3 metrics) → recent sales table → commentary → CTA |
| **Just Sold** | `JustSold.tsx` | SOLD badge → hero photo → price + DOM → personal message → CTA |
| **Open House Invite** | `OpenHouseInvite.tsx` | OPEN HOUSE badge → photo → date/time box → features list → RSVP CTA |
| **Neighbourhood Guide** | `NeighbourhoodGuide.tsx` | Area badge → intro → category highlights → fun fact → CTA |
| **Home Anniversary** | `HomeAnniversary.tsx` | Party emoji → value estimate box → message → seasonal tips → CTA |

### Custom Templates

Realtors can also create custom email templates via the Template Builder (`/automations/templates`):
- Subject line with `{{variable}}` placeholders
- Body with variable insertion sidebar
- Preview with sample data
- Templates usable in workflow `auto_email` steps

---

## 6. Sending & Delivery

### Resend Integration

All newsletter emails are sent via the Resend API for:
- High deliverability
- Open/click tracking via webhooks
- Bounce/complaint handling
- Tags for attribution (newsletter_id, email_type, journey_phase)

### Retry Logic

```
Attempt 1: Send email
  ├─ Success → return messageId
  └─ 429/503 error → wait 1 second

Attempt 2: Retry
  ├─ Success → return messageId
  └─ 429/503 error → wait 2 seconds

Attempt 3: Final retry
  ├─ Success → return messageId
  └─ Any error → throw (caller handles)
```

### Email Headers

Every newsletter includes:
- `List-Unsubscribe: <url>, <mailto:...>` — for one-click unsubscribe in email clients
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click` — RFC 8058 compliance
- Tags: `newsletter_id`, `email_type`, `journey_phase` — for webhook attribution

### Workflow Email Routing

| Step Type | Sender | Tracking | Fallback |
|-----------|--------|----------|----------|
| `auto_email` | Resend API | Full (opens, clicks) | Gmail API |
| `ai_email` | Resend API | Full (opens, clicks) | None (draft saved) |
| `auto_sms` | Twilio | SMS delivery | None |
| `auto_whatsapp` | Twilio | WhatsApp delivery | None |

---

## 7. Click Tracking & Contact Intelligence

### How Clicks Are Tracked

```
1. Resend delivers email with tracked links
2. Contact clicks a link
3. Resend fires email.clicked webhook to /api/webhooks/resend
4. Webhook handler:
   a. Verifies Svix HMAC-SHA256 signature
   b. Deduplicates (same event within 60s ignored)
   c. Classifies link type from URL
   d. Logs to newsletter_events table
   e. Updates contact's newsletter_intelligence JSONB
   f. Creates hot lead alert if high-intent click
```

### Link Classification

| URL Contains | Link Type | Intelligence Action |
|-------------|-----------|-------------------|
| `/listings/` or `listing` | listing | Add area to interests, tag "active_searcher" |
| `/showings/` or `book` | showing | **HOT LEAD ALERT** → notify realtor |
| `market` or `report` | market_report | Set content_preference = "data_driven" |
| `school` | school_info | Add "family" to lifestyle_tags |
| `neighbour` or `area` | neighbourhood | Set content_preference = "lifestyle" |
| `cma` or `valuation` | cma | **HOT LEAD ALERT**, tag "considering_selling" |
| `contact` or `call` | contact_agent | **HOT LEAD ALERT** |
| `unsubscribe` | unsubscribe | Process unsubscribe |

### Engagement Score Formula

```
engagement_score = min(100,
  (min(total_opens, 20) × 2) +          // Up to 40 points
  (min(total_clicks, 15) × 3) +          // Up to 45 points
  recency_bonus                           // Up to 15 points
)

recency_bonus:
  Last engagement < 7 days  → 15
  Last engagement < 30 days → 10
  Last engagement < 90 days → 5
  No engagement             → 0
```

### Contact Intelligence Structure

Stored in `contacts.newsletter_intelligence` (JSONB):

```json
{
  "engagement_score": 72,
  "total_opens": 14,
  "total_clicks": 8,
  "last_opened": "2026-03-15T10:30:00Z",
  "last_clicked": "2026-03-15T10:32:00Z",
  "click_history": [
    { "link_type": "listing", "link_url": "/listings/kitsilano-abc", "clicked_at": "2026-03-15T10:32:00Z" }
  ],
  "inferred_interests": {
    "areas": ["kitsilano", "point-grey"],
    "property_types": [],
    "lifestyle_tags": ["family", "active_searcher"]
  },
  "content_preference": "data_driven",
  "unsubscribed_at": null
}
```

---

## 8. AI Agent Layer

Three AI-powered services run on cron schedules to make smarter decisions.

### 8.1 Lead Scorer (every 15 minutes)

**What it does:** Claude analyzes each contact's 30-day activity and outputs a multi-dimensional score.

**Input:** Contact profile + communications + newsletter events + showings + activity log

**Output:**
```json
{
  "buying_readiness": 82,
  "timeline_urgency": 65,
  "budget_fit": 70,
  "intent": "serious_buyer",
  "reasoning": "3 showing requests in 7 days, clicked CMA twice, viewing $800K-1M range",
  "stage_recommendation": "advance",
  "new_stage": "qualified",
  "personalization_hints": {
    "tone": "data-driven",
    "interests": ["Burnaby", "townhouses"],
    "price_anchor": "$850K",
    "hot_topic": "new listings",
    "avoid": "mortgage tips",
    "note": "Has school-age children (clicked school_info 4x)"
  }
}
```

**Personalization hints** are injected into the newsletter AI's system prompt, making every subsequent email more relevant.

### 8.2 Send/Skip/Swap Advisor (per email step)

**Feature flag:** `AI_SEND_ADVISOR=true`

**What it does:** Before executing an email workflow step, Claude evaluates whether the scheduled email is the right choice.

**Decisions:**
| Decision | Action |
|----------|--------|
| **Send** | Proceed with scheduled email type |
| **Skip** | Skip this email, advance to next step |
| **Swap** | Change email type to something more relevant |

**Example:** Contact is actively browsing Burnaby listings → scheduled "neighbourhood_guide" → advisor swaps to "new_listing_alert" for Burnaby.

**All decisions create drafts** (never auto-send). Realtor reviews in approval queue.

### 8.3 Next Best Action (hourly)

**What it does:** Claude reads the top 20 highest-scored contacts and generates 3-5 actionable recommendations for the realtor's dashboard.

**Actions:** Call, Send Email, Advance Stage, Create Task, Add Tag, Re-engage

**Example:**
```
🔥 Sarah Chen — Call now
   Clicked CMA 3x in 48h, viewed $900K listings.
   Likely ready to make offer.
   [Call] [Send Market Report]

⚠️ Mike Wong — Re-engage
   Was active buyer, silent 12 days after 3 showings.
   [Send Check-in] [Call]
```

"Send Email" creates a draft → navigates to approval queue (never sends directly).

---

## 9. Approval Queue

### Location: `/newsletters/queue`

### How It Works

1. AI generates email draft → status = "draft", send_mode = "review"
2. Draft appears in approval queue with:
   - Contact name and email
   - Subject line
   - Email type badge (listing alert, market update, etc.)
   - Journey phase badge
3. Realtor clicks email card → preview opens in sandboxed iframe
4. Realtor chooses:
   - **"Send"** → email sent via Resend, removed from queue
   - **"Skip"** → email marked as skipped, removed from queue
   - **"Approve All"** → batch sends all pending drafts

### Safety Features

- Loading states prevent double-clicks
- Preview uses `sandbox="allow-same-origin"` for security
- Approval count badge in newsletter dashboard header

---

## 10. Analytics & Dashboard

### Newsletter Dashboard (`/newsletters`)

| Section | Data |
|---------|------|
| **Stats Row** | Total contacts, emails sent, open rate, click rate |
| **Buyer Pipeline** | Count per phase: lead, active, under_contract, past_client, dormant |
| **Seller Pipeline** | Same 5 phases |
| **Pending Approvals** | Top 3 drafts with quick approve link |
| **Recent Activity** | Last 10 events (opens, clicks, bounces) |

### Analytics Page (`/newsletters/analytics`)

| Metric | Calculation |
|--------|-------------|
| **Open Rate** | (total opens / total sent) × 100 |
| **Click Rate** | (total clicks / total sent) × 100 |
| **Brand Score** | Composite 0-100: open score (40%) + click score (30%) + volume (20%) + health (10%) |
| **Deliverability** | Bounce count + unsubscribe count |
| **Performance by Type** | Per-email-type: sent, opens, clicks, CTR |

### Walkthrough Guide (`/newsletters/guide`)

8-step interactive wizard teaching realtors how the system works:
1. Welcome — before/after comparison
2. Smart Journeys — buyer + seller lifecycle phases
3. AI-Written Emails — side-by-side personalization examples
4. Beautiful Templates — 6 template previews
5. Review & Approve — review mode vs auto mode
6. Click Intelligence — click journey timeline example
7. Your Dashboard — mock dashboard preview
8. Get Started — action steps

---

## 11. Visual Builders

### Email Template Editor (`/automations/templates/[id]/edit`)

- Left panel: template name, subject line, body textarea
- Right sidebar: variable picker (click to insert `{{variable}}`)
- Preview: renders template with sample data in iframe
- Actions: Save, Preview, Cancel

### Visual Workflow Builder (`/automations/workflows/[id]/edit`)

- React Flow canvas with drag-and-drop nodes
- 7 node types: Email, AI Email, SMS, Wait, Condition, Task, Action
- Node palette sidebar
- Config panel for selected node
- Save & Publish → converts flow to executable workflow_steps

### Bidirectional Conversion

- **stepsToFlow():** Existing workflow_steps → React Flow nodes/edges (backward compat)
- **flowToSteps():** Visual flow → workflow_steps rows (publish)

---

## 12. Contact Segments

### Location: `/contacts/segments`

### Segment Rules

| Field | Operators | Example |
|-------|-----------|---------|
| Contact Type | equals | type = "buyer" |
| Stage | equals | stage_bar = "qualified" |
| Lead Status | equals | lead_status = "nurturing" |
| Tags | contains | tags contains "investor" |
| Unsubscribed | equals | newsletter_unsubscribed = false |

### Rule Operators

- **AND** — contact must match ALL rules
- **OR** — contact must match ANY rule

### Bulk Actions

After creating a segment:
- View matching contact count (live evaluation)
- Bulk enroll all matching contacts in a workflow

---

## 13. Compliance & Unsubscribe

### CASL Compliance

- Every email includes visible unsubscribe link in footer
- `List-Unsubscribe` header for one-click unsubscribe in email clients
- `List-Unsubscribe-Post` header for RFC 8058 compliance
- Unsubscribe is immediate and permanent (until manually re-subscribed)

### Unsubscribe Flow

```
Contact clicks unsubscribe link
    └─→ GET /api/newsletters/unsubscribe?id=<contactId>
    └─→ contacts.newsletter_unsubscribed = true
    └─→ All contact_journeys paused (reason: "unsubscribed")
    └─→ Activity log entry created
    └─→ HTML confirmation page displayed with contact's first name
```

### Bounce Handling

```
Resend fires email.bounced webhook
    └─→ contacts.newsletter_unsubscribed = true
    └─→ All contact_journeys paused (reason: "bounced")
    └─→ No more emails sent to this contact
```

### Frequency Caps

| Cap | Rule |
|-----|------|
| **Per contact per day** | Max 2 emails in any 24-hour window |
| **Deduplication** | Same email_type + journey_phase blocked within 7 days |

---

## 14. Cron Jobs & Scheduling

| Endpoint | Frequency | Purpose |
|----------|-----------|---------|
| `GET /api/cron/process-workflows` | Every 5 min | Execute due workflow steps (all types including ai_email) |
| `GET /api/cron/agent-scoring` | Every 15 min | Score contacts with recent activity via Claude |
| `GET /api/cron/agent-recommendations` | Every 1 hour | Generate next-best-action recommendations |

All cron endpoints are protected by `CRON_SECRET` bearer token.

### Process Workflow Cron Flow

```
1. Query workflow_enrollments WHERE status='active' AND next_run_at <= now (limit 50)
2. For each enrollment:
   a. Fetch current step from workflow_steps
   b. If AI_SEND_ADVISOR=true and step is email: consult send advisor
   c. Execute step (send email, create task, etc.)
   d. Log to workflow_step_logs (with ai_decision if applicable)
   e. Calculate next step's delay, schedule next_run_at
   f. If no more steps: mark enrollment as completed
3. Return { processed: count, errors: [] }
```

---

## 15. Data Model

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `newsletters` | Email drafts and sends | contact_id, email_type, subject, html_body, status, sent_at, resend_message_id, ai_context |
| `newsletter_templates` | Template registry | slug, name, email_type, default_subject |
| `newsletter_events` | Open/click/bounce tracking | newsletter_id, contact_id, event_type, link_url, link_type |
| `contact_journeys` | Journey enrollment + phase | contact_id, journey_type, current_phase, next_email_at, send_mode, is_paused |
| `agent_recommendations` | AI next-best-action | contact_id, action_type, reasoning, priority, status, expires_at |
| `contact_segments` | Dynamic contact groups | name, rules (JSONB), rule_operator, contact_count |

### Extended Columns on Existing Tables

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `contacts` | `newsletter_intelligence` | JSONB | Engagement score, click history, inferred interests |
| `contacts` | `newsletter_unsubscribed` | BOOLEAN | Unsubscribe flag |
| `contacts` | `ai_lead_score` | JSONB | AI scoring: readiness, urgency, intent, hints |
| `communications` | `newsletter_id` | UUID FK | Links message log to newsletter |
| `workflow_enrollments` | `journey_phase` | TEXT | Current journey phase |
| `workflow_enrollments` | `send_mode` | TEXT | review or auto |
| `workflow_step_logs` | `ai_decision` | JSONB | Send advisor decision audit trail |
| `workflows` | `flow_json` | JSONB | React Flow visual editor state |

### Migrations

```
010_newsletter_journey_engine.sql   — Core newsletter tables
011_unify_email_engine.sql          — Merge journey into workflow enrollments
012_email_template_builder.sql      — Template builder columns
013_visual_workflow_builder.sql     — Workflow builder columns
014_segments_ab_testing.sql         — Contact segments table
015_ai_agent.sql                    — AI scoring + recommendations
```

---

## 16. File Reference

### Server Actions
| File | Functions |
|------|-----------|
| `src/actions/newsletters.ts` | generateAndQueueNewsletter, sendNewsletter, approveNewsletter, skipNewsletter, getApprovalQueue, getNewsletterAnalytics |
| `src/actions/journeys.ts` | enrollContactInJourney, advanceJourneyPhase, pauseJourney, resumeJourney, processJourneyQueue, getJourneyDashboard |
| `src/actions/recommendations.ts` | getRecommendations, acceptRecommendation, dismissRecommendation |
| `src/actions/templates.ts` | getTemplates, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, previewTemplate |
| `src/actions/segments.ts` | getSegments, createSegment, evaluateSegment, bulkEnroll |

### Libraries
| File | Purpose |
|------|---------|
| `src/lib/resend.ts` | Resend API wrapper with retry logic |
| `src/lib/newsletter-ai.ts` | Claude content generation with Zod validation |
| `src/lib/ai-agent/lead-scorer.ts` | Lead scoring batch processor |
| `src/lib/ai-agent/send-advisor.ts` | Send/skip/swap decision engine |
| `src/lib/ai-agent/next-best-action.ts` | Dashboard recommendation generator |
| `src/lib/workflow-engine.ts` | Unified step executor (ai_email + auto_email via Resend) |
| `src/lib/flow-converter.ts` | React Flow ↔ workflow_steps converter |
| `src/lib/email-renderer.ts` | Template-to-HTML renderer |
| `src/lib/constants/journey-workflows.ts` | Buyer/seller journey definitions |

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhooks/resend` | POST | Resend webhook handler (opens, clicks, bounces) |
| `/api/newsletters/unsubscribe` | GET | Unsubscribe endpoint |
| `/api/cron/process-workflows` | GET | Unified workflow cron processor |
| `/api/cron/agent-scoring` | GET | Lead scoring cron |
| `/api/cron/agent-recommendations` | GET | Recommendations cron |

### Pages
| Route | Purpose |
|-------|---------|
| `/newsletters` | Dashboard (pipeline, stats, activity) |
| `/newsletters/queue` | Approval queue |
| `/newsletters/analytics` | Performance analytics |
| `/newsletters/guide` | Interactive walkthrough |
| `/automations/templates` | Template library |
| `/automations/templates/[id]/edit` | Template editor |
| `/automations/workflows/[id]/edit` | Visual workflow builder |
| `/contacts/segments` | Segment builder |

### Email Templates
| File | Email Type |
|------|-----------|
| `src/emails/BaseLayout.tsx` | Shared wrapper (branding, dark mode, unsubscribe) |
| `src/emails/NewListingAlert.tsx` | Property listing cards |
| `src/emails/MarketUpdate.tsx` | Stats + recent sales |
| `src/emails/JustSold.tsx` | Sale celebration |
| `src/emails/OpenHouseInvite.tsx` | Event invitation |
| `src/emails/NeighbourhoodGuide.tsx` | Area lifestyle content |
| `src/emails/HomeAnniversary.tsx` | Annual homeowner milestone |

---

## 17. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes | Resend email API authentication |
| `RESEND_FROM_EMAIL` | Yes | Verified sender email address |
| `RESEND_WEBHOOK_SECRET` | Recommended | Svix HMAC-SHA256 webhook verification |
| `CRON_SECRET` | Yes | Protects all cron endpoints |
| `ANTHROPIC_API_KEY` | Yes | Claude AI for content generation |
| `AI_SEND_ADVISOR` | Optional | Enable send/skip/swap advisor (`true`/`false`) |
| `AI_SCORING_MODEL` | Optional | Override Claude model (default: claude-sonnet-4-20250514) |
| `NEWSLETTER_AI_MODEL` | Optional | Override model for newsletter content |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for unsubscribe links |

---

## Cost Estimation

| Component | Frequency | Cost/Run | Daily Cost |
|-----------|-----------|----------|------------|
| Newsletter AI content | ~20 emails/day | $0.003/email | $0.06 |
| Lead scoring | Every 15 min, 50 contacts | $0.015/batch | $1.44 |
| Send advisor | Per email send | $0.003/decision | $0.06 |
| Next best action | Hourly | $0.05/run | $1.20 |
| Resend sending | Per email | Free (3K/mo) or $0.0004 | ~$0.01 |

**Total: ~$2.77/day** ($83/month) at 200 active contacts.
