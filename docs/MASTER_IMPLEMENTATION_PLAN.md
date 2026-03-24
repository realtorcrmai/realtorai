# ListingFlow AI Email Marketing — Master Implementation Plan

## Document Purpose

This is the single source of truth for implementing the AI-powered email marketing system. It consolidates all discussions, specs, and decisions from the planning sessions. Every developer should read this before writing code.

**Related Specs:**
- `docs/SPEC_Prospect_360.md` — 12 user stories for contact detail page
- `docs/SPEC_Email_Content_Intelligence.md` — content pipeline, blocks, branding
- `docs/SPEC_Validation_Pipeline.md` — 7-step validation, canary, production monitoring
- `docs/user-journeys.md` — 5 persona Mermaid flowcharts

**Memory Files:** 16 project files in `.claude/projects/` memory (auto-loaded every session)

---

## Part 1: Product Vision

### What We're Building

An autonomous AI email marketing system where each contact gets their own AI agent that decides what to send, when to send, and whether to send at all. The realtor approves early on, then gradually trusts the AI to send autonomously.

### What Makes This Different From Mailchimp/HubSpot

| Traditional | ListingFlow |
|---|---|
| One campaign → blast to segment | One agent per contact → unique email per person |
| Static drip sequences | Dynamic sequences that adapt from behavior |
| Manual template editing | AI generates content from CRM + market data |
| Generic merge fields ({{name}}) | Full context: click history, objections, deadlines |
| Realtor builds campaigns | Realtor approves/corrects, AI handles everything |
| Flat reporting | Revenue attribution (which email → which showing → which deal) |
| No learning | Self-improving: content, timing, frequency, sequences all adapt |

### 5 Architecture Layers

1. **Contact Intelligence Graph** — living behavioral profile per contact
2. **Event Stream** — CRM events trigger agent evaluation, not scheduled campaigns
3. **Content Engine** — Claude generates unique emails with full context + market data
4. **Send Governor** — prevents spam, enforces frequency/compliance/brand rules
5. **Realtor Dashboard** — zero campaign building, just approve/control/review

---

## Part 2: Database Schema

### Existing Tables (Keep, Enhance)

| Table | Enhancement |
|---|---|
| `contacts` | Expand `newsletter_intelligence` JSONB, add `ai_context_notes`, `notification_preferences` |
| `newsletters` | Add `status = 'suppressed'` for held-back emails, add `quality_score` |
| `newsletter_events` | No changes — raw event log, immutable |
| `contact_journeys` | Add `trust_level` (0-3), keep existing fields |
| `communications` | Add `triggered_by_newsletter_id` for attribution |

### New Tables

```sql
-- Per-realtor AI configuration (learning engine writes here)
CREATE TABLE realtor_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id TEXT NOT NULL UNIQUE,

  -- Voice rules (extracted from edits)
  voice_rules JSONB DEFAULT '[]',
  voice_examples JSONB DEFAULT '{}',

  -- Optimal sequences (learned)
  buyer_sequence JSONB DEFAULT '["welcome","listing_alert","neighbourhood_guide","market_update"]',
  seller_sequence JSONB DEFAULT '["welcome","cma_preview","market_update","listing_strategy"]',

  -- Thresholds (adjusted by learning engine)
  escalation_thresholds JSONB DEFAULT '{"soft_alert":40,"hot_lead":60,"urgent":80}',
  dormancy_days INT DEFAULT 60,
  auto_sunset_days INT DEFAULT 90,
  re_engagement_attempts INT DEFAULT 2,

  -- Frequency caps per phase
  frequency_caps JSONB DEFAULT '{"lead":{"per_week":2,"min_gap_hours":48},"active":{"per_week":3,"min_gap_hours":18},"under_contract":{"per_week":1,"min_gap_hours":72},"past_client":{"per_month":2,"min_gap_hours":168},"dormant":{"per_month":1,"min_gap_hours":336}}',

  -- Send settings
  sending_enabled BOOLEAN DEFAULT true,
  skip_weekends BOOLEAN DEFAULT false,
  quiet_hours JSONB DEFAULT '{"start":"20:00","end":"07:00"}',
  default_send_day TEXT DEFAULT 'tuesday',
  default_send_hour INT DEFAULT 9,

  -- Content rankings (learned)
  content_rankings JSONB DEFAULT '[]',

  -- Brand config
  brand_config JSONB DEFAULT '{}',

  -- Learning metadata
  total_emails_analyzed INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  learning_confidence TEXT DEFAULT 'low',
  last_learning_cycle TIMESTAMPTZ,

  -- Competitive intelligence
  competitive_intel JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent tracking (CASL + CAN-SPAM compliance)
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('express', 'implied')),
  consent_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ, -- NULL for express (never expires)
  source TEXT NOT NULL, -- 'website_form', 'open_house', 'inquiry', 'transaction', 'manual'
  consent_text TEXT, -- what they agreed to
  country TEXT DEFAULT 'CA', -- 'CA' or 'US'
  ip_address TEXT,
  withdrawn BOOLEAN DEFAULT false,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-contact hard rules from realtor (override AI inference)
CREATE TABLE contact_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  instruction_text TEXT NOT NULL,
  instruction_type TEXT DEFAULT 'constraint', -- 'constraint', 'preference', 'context'
  is_active BOOLEAN DEFAULT true,
  created_by TEXT, -- realtor email
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property watchlist per contact
CREATE TABLE contact_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  notes TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, listing_id)
);

-- Structured context/objections log
CREATE TABLE contact_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('objection', 'preference', 'concern', 'info', 'timeline')),
  text TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue attribution (email → showing → deal chain)
CREATE TABLE outcome_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'email_sent', 'email_opened', 'email_clicked', 'showing_booked', 'offer_submitted', 'deal_closed'
  newsletter_id UUID REFERENCES newsletters(id),
  listing_id UUID REFERENCES listings(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI learning audit trail
CREATE TABLE agent_learning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'threshold', 'sequence', 'frequency', 'voice_rule', 'content_ranking', 'timing'
  field_changed TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  auto_applied BOOLEAN DEFAULT false, -- true = auto, false = suggested to realtor
  approved BOOLEAN, -- NULL if pending, true/false after realtor decision
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email feedback from prospect + realtor
CREATE TABLE email_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  feedback_source TEXT NOT NULL, -- 'prospect_reaction', 'realtor_quick', 'realtor_rating', 'realtor_instruction', 'deal_survey'
  rating INT, -- 1-5 or thumbs up (1) / thumbs down (-1)
  note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtor weekly quality feedback
CREATE TABLE realtor_weekly_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id TEXT NOT NULL,
  week TEXT NOT NULL, -- '2026-W12'
  content_quality INT, -- 1-5
  tone_accuracy INT,
  listing_matching INT,
  timing_score INT,
  biggest_issue TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(realtor_id, week)
);

-- Post-showing feedback from prospect
CREATE TABLE showing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reaction TEXT CHECK (reaction IN ('loved', 'ok', 'not_for_me')),
  issues JSONB DEFAULT '[]', -- ['too_expensive', 'wrong_area', 'too_small', 'needs_reno']
  want_similar TEXT, -- 'yes_exactly', 'similar_diff_area', 'similar_lower_price'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform-wide intelligence (cross-realtor aggregate)
CREATE TABLE platform_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  week TEXT NOT NULL, -- '2026-W12'
  optimal_defaults JSONB DEFAULT '{}',
  content_benchmarks JSONB DEFAULT '{}',
  trending_angles JSONB DEFAULT '[]',
  trending_subjects JSONB DEFAULT '[]',
  realtors_contributing INT DEFAULT 0,
  total_emails_analyzed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region, week)
);

-- RLS: all tables authenticated access (single-tenant per realtor)
-- Add RLS policies matching existing pattern
```

### Expanded newsletter_intelligence JSONB Schema

```json
{
  "engagement_score": 72,
  "engagement_trend": "accelerating",
  "trend_data": [
    { "week": "2026-W10", "opens": 3, "clicks": 2 }
  ],

  "content_preferences": {
    "listing_alert": { "sent": 12, "opened": 10, "clicked": 7, "converted": 1 },
    "market_update": { "sent": 8, "opened": 2, "clicked": 0, "converted": 0 }
  },

  "timing_patterns": {
    "best_day": "tuesday",
    "best_hour": 9,
    "open_velocity_minutes": 5,
    "data_points": 18
  },

  "frequency_tolerance": {
    "current_cap": 2,
    "fatigue_detected_at": 3,
    "optimal": 2
  },

  "inferred_interests": {
    "areas": ["Kitsilano"],
    "property_types": ["condo"],
    "price_range": [800000, 950000],
    "lifestyle": ["family", "schools"]
  },

  "click_history": [
    { "type": "listing", "area": "Kits", "price": 850000, "timestamp": "..." }
  ],

  "content_intelligence": {
    "winning_patterns": { "subject_style": "data-lead", "content_angle": "comparison" },
    "losing_patterns": { "subject_style": ["hype"], "content_angle": ["generic_market"] },
    "exploration_rate": 0.2,
    "experiments_run": 12
  },

  "suppressed_content": ["market_update"],
  "conversion_probability": 0.73,
  "days_to_convert_estimate": 14,

  "competitive_signals": {
    "engagement_declining_without_cause": false,
    "possible_competitive_pressure": false
  },

  "reaction_history": [
    { "email_id": "abc", "reaction": "thumbs_up", "timestamp": "..." }
  ]
}
```

---

## Part 3: Frontend Architecture

### New Pages

| Route | Purpose | Type |
|---|---|---|
| `/contacts/[id]` | Prospect 360 View (overhaul existing) | Server + Client |
| `/settings/brand` | Brand onboarding wizard | Client |
| `/settings/integrations` | Integration Hub — manage all connections | Server + Client |
| `/settings/compliance` | Compliance dashboard | Server |
| `/newsletters/weekly-report` | Weekly report view | Server |
| `/admin/health` | Production health dashboard | Server |
| `/admin/canary` | Canary system dashboard | Server |

### New Components

| Component | File | Purpose |
|---|---|---|
| `JourneyProgressBar` | `src/components/contacts/JourneyProgressBar.tsx` | Visual timeline on contact page |
| `EmailHistoryTimeline` | `src/components/contacts/EmailHistoryTimeline.tsx` | Vertical email timeline with click details |
| `IntelligencePanel` | `src/components/contacts/IntelligencePanel.tsx` | Engagement, interests, send time display |
| `UpcomingPanel` | `src/components/contacts/UpcomingPanel.tsx` | Sequence view + reschedule + prediction |
| `ProspectControls` | `src/components/contacts/ProspectControls.tsx` | Journey toggle, frequency, content, notes |
| `QuickLogForm` | `src/components/contacts/QuickLogForm.tsx` | 5-second call/text/visit logging |
| `ContextLog` | `src/components/contacts/ContextLog.tsx` | Objections, preferences, concerns |
| `WatchlistPanel` | `src/components/contacts/WatchlistPanel.tsx` | Property watchlist per contact |
| `DailyDigestCard` | `src/components/dashboard/DailyDigestCard.tsx` | Morning summary on dashboard |
| `GlobalControlsPanel` | `src/components/newsletters/GlobalControlsPanel.tsx` | Master switch, bulk actions |
| `BrandWizard` | `src/components/settings/BrandWizard.tsx` | Brand setup flow |
| `ComplianceDashboard` | `src/components/settings/ComplianceDashboard.tsx` | Consent tracking |
| `HealthDashboard` | `src/components/admin/HealthDashboard.tsx` | Production monitoring |
| `IntegrationHub` | `src/components/settings/IntegrationHub.tsx` | Centralized integration management |

### Modified Components

| Component | Changes |
|---|---|
| `ApprovalQueueClient.tsx` | Add inline edit, AI reasoning panel, quick reactions, quality score |
| `ContactForm.tsx` | Re-add buyer/seller preference fields (lost in merge) |
| Newsletter dashboard page | Add Global Controls section, competitive insights |
| Contact detail page | Complete overhaul to Prospect 360 View |

### Email Blocks (React Email — 11 blocks)

| Block | File | Purpose |
|---|---|---|
| `HeroImageBlock` | `src/emails/blocks/HeroImage.tsx` | Full-width property image |
| `PropertyCardBlock` | `src/emails/blocks/PropertyCard.tsx` | Photo + address + price |
| `StatBoxBlock` | `src/emails/blocks/StatBox.tsx` | Big number + trend |
| `SalesTableBlock` | `src/emails/blocks/SalesTable.tsx` | Recent sales rows |
| `TextBlock` | `src/emails/blocks/Text.tsx` | Personal copy |
| `CTAButtonBlock` | `src/emails/blocks/CTAButton.tsx` | Action button |
| `CountdownBlock` | `src/emails/blocks/Countdown.tsx` | Deadline counter |
| `HeadshotSignatureBlock` | `src/emails/blocks/HeadshotSignature.tsx` | Realtor photo + info |
| `SocialLinksBlock` | `src/emails/blocks/SocialLinks.tsx` | Social media icons |
| `UnsubscribeBlock` | `src/emails/blocks/Unsubscribe.tsx` | CASL/CAN-SPAM footer |
| `PhotoGalleryBlock` | `src/emails/blocks/PhotoGallery.tsx` | 2-column photo grid |

### 7 Email Template Patterns

| Template | When | Blocks Used |
|---|---|---|
| Hero Property | Single listing focus | Hero + Text + CTA + Signature |
| Card Grid | Multiple listings | Text + Cards + CTA + Signature |
| Data Story | Market stats | Text + StatBoxes + SalesTable + CTA + Signature |
| Personal Note | Welcome, anniversary | Text + Signature |
| Countdown | Time-sensitive | Countdown + Text + CTA + Signature |
| Luxury Showcase | Premium listing | Hero + Text + PhotoGallery + CTA + Signature |
| Open House | Event invite | Hero + EventDetails + CTA + Signature |

---

## Part 4: Backend Architecture

### New Server Actions

| File | Functions |
|---|---|
| `src/actions/prospect-360.ts` | `getEmailHistory`, `getContactIntelligence`, `getUpcomingSequence`, `updateControls`, `addInstruction`, `addToWatchlist`, `addContext`, `logInteraction` |
| `src/actions/brand.ts` | `saveBrandConfig`, `getBrandConfig`, `previewBrandedEmail` |
| `src/actions/compliance.ts` | `recordConsent`, `checkConsent`, `processUnsubscribe`, `getConsentDashboard`, `requestDataDeletion` |
| `src/actions/feedback.ts` | `recordProspectReaction`, `recordRealtorFeedback`, `recordShowingFeedback`, `recordDealAttribution`, `submitWeeklyFeedback` |

### New Lib Modules

| File | Purpose |
|---|---|
| `src/lib/validators/content-validator.ts` | Name, area, budget, type, freshness, dedup checks |
| `src/lib/validators/design-validator.ts` | HTML, unsubscribe, images, links, size |
| `src/lib/validators/compliance-gate.ts` | Consent, frequency, gap, quiet hours, bounce |
| `src/lib/validators/quality-scorer.ts` | Claude Haiku 7-dimension quality scoring |
| `src/lib/canary.ts` | Canary contact management + check pipeline |
| `src/lib/voice-learning.ts` | Extract voice rules from realtor edits |
| `src/lib/send-governor.ts` | Frequency caps, engagement throttling, sunset |
| `src/lib/content-assembler.ts` | Assemble full context package for Claude |
| `src/lib/learning-engine.ts` | Weekly analysis cycle, auto-adjustments |
| `src/lib/production-alerts.ts` | Real-time metric monitoring |

### New API Routes (Cron)

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/canary-check` | Hourly | Run canary emails + validation |
| `/api/cron/daily-digest` | Daily 8 AM | Generate + send daily digest |
| `/api/cron/weekly-learning` | Weekly Sunday | Run learning cycle, update configs |
| `/api/cron/weekly-report` | Weekly Monday | Generate + send weekly report |
| `/api/cron/consent-expiry` | Daily | Check expiring consent, send re-confirmation |
| `/api/cron/auto-sunset` | Weekly | Find 0-open contacts, pause journeys |

### Modified Lib Modules

| File | Changes |
|---|---|
| `src/lib/newsletter-ai.ts` | Add voice rules, contact context, market data, competitive intel to prompt |
| `src/lib/workflow-engine.ts` | Integrate validation pipeline before every send |
| `src/lib/ai-agent/send-advisor.ts` | Un-feature-flag, integrate into main flow, log suppressions |
| `src/lib/ai-agent/lead-scorer.ts` | Feed scores into graduated escalation thresholds |

---

## Part 5: AI Integration Points

### Email Generation Prompt Structure

```
SYSTEM: You are writing as {realtor.name}. Follow these voice rules: {voice_rules}.
        Brand tone: {brand_style}. Sign off as: {signature_name}.
        NEVER guarantee property values. NEVER mention competitors negatively.

CONTEXT: {
  contact: { name, preferences, click_history, objections, context_notes,
             last_5_subjects, engagement_score, trend },
  market: { new_listings_matching, price_changes, recent_sales, area_snapshot },
  realtor: { value_props, current_listings, recent_wins },
  strategy: { email_type, goal, urgency_factors, avoid_list, experiment },
  competitive: { trending_angles, underused_by_this_realtor }
}

TASK: Generate a {email_type} email for {contact.name}.
      Use template: {template_type} with blocks: {block_list}.
      Subject line style: {winning_subject_pattern}.
      Content angle: {recommended_angle}.
      Max length: {optimal_word_count} words.
```

### Quality Scorer Prompt (Claude Haiku)

```
Rate this email 1-10 on: Personalization, Relevance, Tone, Value,
CTA clarity, Length, Uniqueness. Return JSON with scores + issues.
```

### Voice Rule Extraction Prompt

```
Compare original draft vs realtor's edited version.
Extract specific, actionable writing rules. Don't repeat existing rules.
Return JSON array of new rule strings.
```

### Weekly Learning Analysis Prompt

```
Analyze these email outcomes for {realtor_name} over the last 30 days:
{outcome_data}
Current config: {realtor_agent_config}
Identify: what content works, optimal timing, frequency sweet spot,
threshold accuracy, sequence effectiveness.
Return: auto_adjustments (safe changes) + suggestions (need approval).
```

---

## Part 6: Implementation Sprints

### Sprint 0: Safety Foundation (3 days)

**Goal:** Nothing sends without validation. Build the safety layer first.

| Task | File | Test |
|---|---|---|
| Content validator | `validators/content-validator.ts` | 15 unit tests (wrong name, wrong area, etc.) |
| Design validator | `validators/design-validator.ts` | 10 unit tests (missing unsubscribe, broken links) |
| Compliance gate | `validators/compliance-gate.ts` | 12 unit tests (unsubscribed, frequency cap, consent) |
| Quality scorer | `validators/quality-scorer.ts` | 5 integration tests (scores real AI output) |
| Canary system (basic) | `canary.ts` | 1 canary profile, delivery + content checks |
| Wire validators into workflow engine | `workflow-engine.ts` | E2E: generate → validate → send or block |
| Consent tracking table | Migration | Insert/query consent records |

**Gate:** All validators pass 100% of unit tests. Canary sends successfully. No email can bypass validation.

### Sprint 1: Fix Critical Bugs (2 days)

**Goal:** Existing system works correctly.

| Task | File | Test |
|---|---|---|
| Re-add buyer/seller preference fields | `ContactForm.tsx` | Playwright: fill prefs, save, verify on detail |
| Wire autoEnrollAndWelcome | `contacts.ts` | Create contact → verify journey + welcome draft |
| Fix page scroll (verify after merge) | `layout.tsx` | Playwright: all newsletter pages scrollable |
| Fix next.config.ts permanently | `next.config.ts` | Build succeeds, dev server starts |
| Consent table migration | `050_consent_compliance.sql` | Insert + query consent records |
| realtor_agent_config migration | `051_realtor_agent_config.sql` | Insert + query config |

**Gate:** Create contact → journey enrolls → welcome email in queue → all pages scroll → build passes.

### Sprint 2: Prospect 360 View — Phase 1 (4 days)

**Goal:** Contact detail page shows journey + email history.

| Task | File | Test |
|---|---|---|
| Journey Progress Bar | `JourneyProgressBar.tsx` | Shows correct phase, dates |
| Email History Timeline | `EmailHistoryTimeline.tsx` | Shows sent/suppressed, click details inline |
| Quick Log Form | `QuickLogForm.tsx` | Log a call, verify in timeline |
| Restructure contact detail tabs | `contacts/[id]/page.tsx` | 4 tabs render, scrollable |
| Email preview side panel | Within EmailHistoryTimeline | Click preview → HTML renders in panel |

**Gate:** Playwright: navigate to contact → see journey bar → see email history → log a call → verify in timeline.

### Sprint 3: Intelligence + Controls (4 days)

**Goal:** Realtor can see AI insights and control the agent per contact.

| Task | File | Test |
|---|---|---|
| Intelligence Panel | `IntelligencePanel.tsx` | Shows score, interests, send time, trends |
| Prospect Controls | `ProspectControls.tsx` | Toggle journey, frequency, content, notes |
| Contact Instructions | `contact_instructions` table + UI | Add instruction → AI uses it in next generation |
| Context Log | `ContextLog.tsx` | Add objection → visible in Intelligence tab |
| Upcoming Panel | `UpcomingPanel.tsx` | Shows sequence, reschedule, skip |
| Enhance click classification | `webhooks/resend/route.ts` | 12 click categories tracked |

**Gate:** Full 360 view works. Change frequency → next email respects it. Add instruction → AI follows it.

### Sprint 4: Trust System + Voice Learning (3 days)

**Goal:** Progressive trust ladder + AI learns from realtor edits.

| Task | File | Test |
|---|---|---|
| Trust level schema | `contact_journeys.trust_level` | 0-3 stored per journey |
| Trust gate in validation pipeline | `validators/compliance-gate.ts` | Level 0-1 → queue, Level 2+ → auto-send |
| Trust promotion UI | Component in Controls tab | Shows edit rate, offers promotion |
| Inline edit on approval queue | `ApprovalQueueClient.tsx` | Edit email → save → extract voice rules |
| Voice rule extraction | `voice-learning.ts` | Compare original vs edited → extract rules |
| AI reasoning panel | `ApprovalQueueClient.tsx` | "Why this email?" expandable section |

**Gate:** Edit 5 emails → voice rules extracted → next email uses rules → edit rate tracked → promotion offered at 95%+ accuracy.

### Sprint 5: Email Blocks + Branding (3 days)

**Goal:** Modular email templates + per-realtor branding.

| Task | File | Test |
|---|---|---|
| 11 React Email blocks | `src/emails/blocks/*.tsx` | Each block renders valid HTML |
| Template assembler | `content-assembler.ts` | AI selects blocks → renders complete email |
| Brand config table | In `realtor_agent_config.brand_config` | Save/load brand settings |
| Brand onboarding wizard | `BrandWizard.tsx` | 4-step setup, preview at each step |
| Luxury Showcase template | Compose from blocks | Photo gallery renders, mobile responsive |
| Email preview (mobile/desktop/dark) | In ApprovalQueueClient | Toggle between 3 preview modes |

**Gate:** Create brand → generate email → email uses brand colors/fonts/logo → preview in 3 modes → renders correctly.

### Sprint 6: Send Governor + Compliance (3 days)

**Goal:** Emails never violate frequency/consent/compliance rules.

| Task | File | Test |
|---|---|---|
| Send governor | `send-governor.ts` | Weekly cap, min gap, engagement throttling |
| Auto-sunset | Cron route | 0-open 90 days → journey paused |
| Consent checking in compliance gate | `compliance-gate.ts` | CASL: express/implied/expired checks |
| Consent re-confirmation emails | Cron route | 30 days before expiry → "Stay connected?" |
| Compliance dashboard | `/settings/compliance` page | Shows consent breakdown, expiring, recent unsubs |
| Country detection | In compliance gate | Phone prefix → country → correct law applied |

**Gate:** Send 4th email when cap is 3 → blocked. Send to unsubscribed → blocked. Implied consent expired → blocked.

### Sprint 7: Adaptive Marketing (4 days)

**Goal:** AI learns from outcomes and adjusts its own rules.

| Task | File | Test |
|---|---|---|
| Weekly learning cycle cron | `learning-engine.ts` + cron route | Analyze 30 days, calculate performance |
| Auto-adjust per-contact intelligence | In learning engine | Content prefs, timing, frequency updated |
| Auto-adjust realtor config | In learning engine | Thresholds, sequence, rankings updated |
| Suggested changes (need approval) | `agent_learning_log` + UI | Surface in weekly report |
| Content experimentation | In `content-assembler.ts` | 80/20 exploit/explore per contact |
| Monthly learning report | React Email template | What worked, what changed, voice accuracy |

**Gate:** Run learning cycle → config updates → next email uses new config → suggestions visible in UI.

### Sprint 8: Reports + Notifications (3 days)

**Goal:** Realtor gets daily/weekly reports and hot lead alerts.

| Task | File | Test |
|---|---|---|
| Daily digest cron | `/api/cron/daily-digest` | Generates summary, sends email |
| Daily digest dashboard card | `DailyDigestCard.tsx` | Shows on main dashboard |
| Weekly report cron + page | `/api/cron/weekly-report` + page | Performance + learning summary |
| Hot lead push notification | In webhook handler | Score jump or CTA click → instant alert |
| Global controls panel | `GlobalControlsPanel.tsx` | Master switch, bulk pause, frequency cap |

**Gate:** Login → see overnight summary → hot lead alert received → weekly report email arrives Monday.

### Sprint 9: Feedback Loops (3 days)

**Goal:** Both prospects and realtors can give content feedback.

| Task | File | Test |
|---|---|---|
| 👍/👎 reaction buttons in email templates | All email blocks | Click → webhook → score update |
| Preference update form (linked from email) | Public page | Pre-filled form, saves to buyer_preferences |
| Quick reactions on approval queue | `ApprovalQueueClient.tsx` | 👍/🔄/✍️/⏰/🚫 buttons |
| Post-showing survey email | New React Email template | Auto-sends 24h after showing |
| Deal close survey | Component in deal workflow | Rate AI impact, identify best email |
| Weekly batch rating | `/newsletters/weekly-report` page | Rate week's quality 1-5 |

**Gate:** Prospect clicks 👎 → score adjusts → next email changes approach. Realtor rates week → feedback logged.

### Sprint 10: Competitive Intelligence + Extras (3 days)

**Goal:** Platform learns across realtors. Watchlist, context log, competitor flag.

| Task | File | Test |
|---|---|---|
| Watchlist panel | `WatchlistPanel.tsx` | Add listing to contact's watchlist |
| Competitor awareness flag | In ProspectControls | Toggle → AI adjusts urgency |
| Platform intelligence table | Migration + weekly cron | Aggregate trends across realtors |
| Cross-realtor default optimization | In learning engine | New realtor gets optimized defaults |
| Revenue attribution chain | `outcome_events` table + UI | Email → showing → deal linked |

**Gate:** Add to watchlist → AI mentions in next email. Competitor flag → email tone changes. Attribution chain visible.

---

## Part 7: Testing Strategy

### Development Testing (Every Commit)

```yaml
# .github/workflows/ci.yml
on: push to dev

jobs:
  build:
    - npm run build (TypeScript compilation)
    - npm run lint

  unit-tests:
    - Content validator: 15 tests
    - Design validator: 10 tests
    - Compliance gate: 12 tests
    - Send governor: 8 tests
    - Learning engine: 6 tests
    - Voice extraction: 5 tests
    Total: ~56 unit tests

  integration-tests:
    - API endpoints respond (10 routes)
    - Supabase queries work (5 tables)
    - Claude API returns valid JSON (3 prompts)
    - Resend sends to test address (1 send)
    Total: ~19 integration tests

  browser-tests:
    - All pages load without JS errors (15 pages)
    - All pages scrollable (15 pages)
    - Contact form: fill + submit + verify (1 flow)
    - Approval queue: preview + approve (1 flow)
    - Newsletter dashboard loads data (1 check)
    Total: ~33 browser tests
```

### Production Testing (Built Into App)

| System | Frequency | What It Checks |
|---|---|---|
| Canary emails | Hourly | Delivery, content, rendering, links, compliance |
| Health dashboard | Real-time | Bounce rate, send rate, open rate trends |
| Quality scorer | Every email | 7-dimension AI quality check |
| Compliance monitor | Every send | Consent, frequency, unsubscribe |
| Alert system | Real-time | Bounce >3%, unsub >1%, open rate drop |
| Weekly quality report | Weekly | Sample + score 10 emails per realtor |

### AI Output Testing

| Test | Method | Frequency |
|---|---|---|
| Content accuracy | Validator checks name/area/budget/type | Every email |
| Quality scoring | Claude Haiku rates 7 dimensions | Every email |
| Voice adherence | Compare output to voice rules | Every email |
| Hallucination check | Cross-check listing data against DB | Every email |
| Personalization depth | Score based on context usage | Weekly sample |
| Experiment tracking | Log variant + outcome | Every experiment |

---

## Part 8: Deployment

### Infrastructure

| Service | Purpose | Environment |
|---|---|---|
| Vercel | Next.js hosting | Production |
| Supabase | PostgreSQL + Auth + Storage | Production |
| Resend | Email delivery | Production |
| Claude API | AI generation | Production |
| GitHub Actions | CI/CD | Development |

### Vercel Cron Jobs

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/process-workflows", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/canary-check", "schedule": "0 * * * *" },
    { "path": "/api/cron/daily-digest", "schedule": "0 15 * * *" },
    { "path": "/api/cron/weekly-learning", "schedule": "0 6 * * 0" },
    { "path": "/api/cron/weekly-report", "schedule": "0 15 * * 1" },
    { "path": "/api/cron/consent-expiry", "schedule": "0 7 * * *" },
    { "path": "/api/cron/auto-sunset", "schedule": "0 8 * * 0" }
  ]
}
```

### Environment Variables (All in Vault)

```
# Existing (already set)
NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET, NEXTAUTH_SECRET,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TWILIO_*

# New (add when needed)
RESEND_WEBHOOK_SECRET     # For webhook signature verification
CANARY_EMAIL_DOMAIN       # listingflow.com for canary addresses
AI_SEND_ADVISOR=true      # Un-feature-flag the send advisor
```

### Git Workflow

```
dev (default) ← all development pushes here
  ↓ PR with 1 approval
main (protected) ← production releases only
```

---

## Part 9: Design System (Emails)

### Mobile-First Rules
- Max width: 600px
- Single column on mobile (cards stack)
- Body font: 16px min, headings: 22px
- CTA buttons: 44px height, full-width on mobile
- All tap targets: 44x44px minimum
- Dark mode: `@media (prefers-color-scheme: dark)` on all templates
- HTML under 80KB (Gmail clips at 102KB)

### Brand Presets

| Preset | Primary | Accent | Heading Font | Vibe |
|---|---|---|---|---|
| Classic | #2C3E50 | #E74C3C | Playfair Display | Traditional |
| Modern | #1E293B | #3B82F6 | Inter | Clean |
| Luxury | #1A1A2E | #C9A96E | Playfair Display | High-end |
| Warm | #44403C | #EA580C | Bricolage Grotesque | Approachable |

---

## Part 10: Compliance Checklist

### Before Launch (Canada)
- [ ] Consent tracking table deployed
- [ ] Express/implied consent recorded on every contact
- [ ] Expiry tracking for implied consent (6mo inquiry, 2yr transaction)
- [ ] Re-confirmation emails sent 30 days before expiry
- [ ] One-click unsubscribe on every email
- [ ] Unsubscribe processed within seconds
- [ ] Brokerage name + physical address in every footer
- [ ] No property value guarantees in AI-generated content
- [ ] AI content validator catches compliance violations
- [ ] Data deletion capability built and tested
- [ ] Privacy policy page exists

### Before USA Expansion
- [ ] CAN-SPAM compliance verified (opt-out, physical address, honest subjects)
- [ ] CCPA/state law compliance (privacy policy, data rights, opt-out of sale)
- [ ] Country detection working (phone prefix + address)
- [ ] Correct law applied per contact's country

---

## Part 11: Success Metrics

### Product Metrics
| Metric | Target | How Measured |
|---|---|---|
| Email open rate | >50% (industry avg: 21%) | Resend analytics |
| Click rate | >15% | Resend analytics |
| Realtor approval rate | >80% of drafts approved | newsletters table |
| Realtor edit rate | <10% after month 1 | email_feedback table |
| Voice accuracy | >95% by month 2 | edit rate trend |
| Hot lead → showing rate | >30% | outcome_events |
| Email → deal attribution | Tracked per deal | outcome_events |
| Unsubscribe rate | <0.5% | Resend webhooks |
| Bounce rate | <2% | Resend webhooks |
| Canary pass rate | >99% | canary check logs |

### Business Metrics
| Metric | Target |
|---|---|
| Realtors onboarded | 100 in 6 months |
| Revenue per realtor | $50/month |
| Churn rate | <5%/month |
| NPS | >50 |

---

## Part 12: Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| AI sends wrong content | High — lost deal | 7-step validation pipeline, canary system |
| CASL violation | High — $10M fine | Consent tracking, compliance gate, legal review |
| Realtor loses trust | High — churn | Progressive trust, transparent reasoning, kill switch |
| Claude API outage | Medium — emails delayed | Queue system, retry, fallback to template |
| Resend deliverability issue | Medium — emails not received | Monitor bounce/spam rates, domain warming |
| Scale issues at 100+ realtors | Medium — slow processing | Batch API, queue prioritization, Inngest |
| Voice learning extracts wrong rule | Low — bad future emails | Realtor can review/delete voice rules, quality scorer catches |
| Cross-realtor data leak | High — privacy violation | All cross-realtor data anonymized, no individual exposure |

---

## Timeline Summary

| Sprint | Duration | What | Cumulative |
|---|---|---|---|
| Sprint 0 | 3 days | Validation pipeline + canary | Week 1 |
| Sprint 1 | 2 days | Fix bugs + auto-enrollment | Week 1 |
| Sprint 2 | 4 days | Prospect 360 Phase 1 (history, journey bar) | Week 2 |
| Sprint 3 | 4 days | Intelligence + Controls | Week 3 |
| Sprint 4 | 3 days | Trust system + voice learning | Week 4 |
| Sprint 5 | 3 days | Email blocks + branding | Week 5 |
| Sprint 6 | 3 days | Send governor + compliance | Week 5-6 |
| Sprint 7 | 4 days | Adaptive marketing (learning engine) | Week 6-7 |
| Sprint 8 | 3 days | Reports + notifications | Week 7-8 |
| Sprint 9 | 3 days | Feedback loops | Week 8 |
| Sprint 10 | 3 days | Competitive intelligence + extras | Week 9 |
| **Total** | **~35 days** | **Full system** | **~9 weeks** |

---

## Part 13: Corrections & Gaps Found in Review

### Review Pass 1 — Cross-Checking Memory Files

| Issue | Where Found | Correction |
|---|---|---|
| Memory says 16 files, plan said 15 | Plan header | Fixed to 16 |
| Dormancy thresholds inconsistent | Vision says 60d, Adaptive says 45d (learned) | Clarified: default 60d, learning engine can adjust to 45d based on data |
| Prospect journey has 7 sub-charts but plan only mentions "journey progress bar" | user-journeys.md vs Sprint 2 | Sprint 2 progress bar should map to the 7 prospect phases: Lead → Warm → Engaged → Hot → Active → Contract → Close |
| Direct contact scoring not in newsletter_intelligence schema | Direct Contact Logging memory | Added: scoring table from memory (call +25, text +20, visit +15, social +10) should feed into engagement_score updates |
| 12 click categories defined but Sprint 3 just says "enhance click classification" | Email Agent Vision memory | Sprint 3 must implement all 12: listing, school, market stats, mortgage calc, neighbourhood, book showing, get CMA, investment, price drop, open house RSVP, forwarded, multiple clicks |
| Reply parsing (prospect replies to email → AI extracts preferences) not in any sprint | Feedback Loops memory | Added to Sprint 9 — requires reply-able email address (not noreply@), needs email inbox monitoring or Resend inbound webhooks |
| Spouse/partner tracking (need #5 in Prospect 360) not in any sprint | Prospect 360 memory | Deferred to Sprint 10 extras — add co_buyer_id field to contacts table |
| Open house attendance tracking (need #6) not in any sprint | Prospect 360 memory | Deferred to Sprint 10 — log in QuickLogForm with type "open_house" + listing_id |
| Pre-approval tracking (need #7) not in any sprint | Prospect 360 memory | Add to Contact Instructions or buyer_preferences JSONB — Sprint 3 can handle this as part of Controls tab |
| Referral potential scoring (need #10) not in any sprint | Prospect 360 memory | Deferred — track forwarded emails in engagement data, compute referral score later |

### Review Pass 2 — Technical Gaps

| Issue | Impact | Correction |
|---|---|---|
| No migration numbering convention defined | Rahul renumbered to 001-048, we need to start at 050+ | All new migrations: 050_consent_compliance.sql, 051_realtor_agent_config.sql, 052_contact_extras.sql (instructions, watchlist, context, outcome_events), 053_feedback_tables.sql, 054_platform_intelligence.sql |
| `newsletters.quality_score` not in existing table | Need ALTER TABLE | Add to migration 050 or 051: `ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS quality_score NUMERIC(3,1)` |
| `contact_journeys.trust_level` not in existing table | Need ALTER TABLE | Add to migration 051: `ALTER TABLE contact_journeys ADD COLUMN IF NOT EXISTS trust_level INT DEFAULT 0` |
| `communications.triggered_by_newsletter_id` not in existing table | Need ALTER TABLE | Add to migration 052: `ALTER TABLE communications ADD COLUMN IF NOT EXISTS triggered_by_newsletter_id UUID REFERENCES newsletters(id)` |
| No RLS policies defined for new tables | Security gap | Every new table needs: `ALTER TABLE x ENABLE ROW LEVEL SECURITY; CREATE POLICY x_auth ON x FOR ALL USING (auth.role() = 'authenticated');` |
| Content assembler needs market data but no MLS feed exists | Data gap | Sprint 1 can work with CRM's own listings table. MLS feed integration is a separate project — use manual listing entry for now |
| Brand config references logo_url but no file upload exists | Feature gap | Sprint 5 should include Supabase Storage upload for logo + headshot. Or use URL input initially |
| Canary email domain (canary+{id}@listingflow.com) requires domain setup | Infra gap | Use delivered@resend.dev for canary in development. Production needs verified domain |
| Daily digest cron schedule says "0 15 * * *" which is 3 PM UTC, not 8 AM local | Wrong timezone | Should be dynamic per realtor timezone, or use "0 15 * * *" for PST (8 AM = 15:00 UTC in winter, 14:00 in summer). Note: Vercel cron is UTC only — may need timezone-aware wrapper |
| Vercel hobby plan only supports 2 cron jobs | Pricing gap | Need Vercel Pro ($20/mo) for 7 cron jobs, or consolidate into fewer routes with internal routing |
| No data backup/export strategy | Data safety | Add: Supabase automatic daily backups (included in Pro), plus weekly pg_dump to S3 for disaster recovery |
| No rollback plan for bad AI learning | Learning safety | Add: agent_learning_log stores old_value — rollback function reads log and reverts config to previous state |
| Email blocks use tables for email compatibility but no testing against Outlook | Rendering gap | Sprint 5 gate should include: render all 7 templates in Litmus or Email on Acid, verify Outlook 2019 + Gmail + Apple Mail |
| No rate limiting on public-facing routes | Security gap | Preference update form and reaction buttons need rate limiting to prevent abuse |

### Key Decision: What NOT to Build in V1

To keep scope manageable, these are explicitly DEFERRED beyond the 10 sprints:

| Feature | Reason to Defer |
|---|---|
| MLS feed integration | Requires Paragon/RETS API access — separate project |
| Vector DB / similarity search | Not needed until 50K+ contacts |
| Kafka / event bus | Supabase + cron is sufficient until 100+ realtors |
| ClickHouse analytics | PostgreSQL handles analysis until millions of events |
| Fine-tuned Claude model per realtor | Wait for Claude fine-tuning API availability |
| Industry newsletter monitoring (auto-scrape) | Manual competitive analysis first, automate later |
| Mobile push notifications | Web push or SMS first, native app push later |
| Multi-language emails | English only for V1, add Mandarin/Punjabi/French later |
| A/B testing UI (visual) | Sequential per-contact experiments first, no UI needed |
| Email client rendering tests (Litmus) | Manual testing first, integrate Litmus API later |

---

*Version 1.1 — 2026-03-23 (reviewed and corrected)*
*Next: Clean up tech debt, fix git author, then start Sprint 0*
