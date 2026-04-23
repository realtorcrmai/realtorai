<!-- docs-audit: none --># Email MVP Plan
**Nothing built yet. Start here every session.**

---

## The One Rule
> Does this change touch a shared table?
> `email_events` · `email_event_rules` · `contact_journeys` · `newsletters` · `newsletter_events` · `agent_drafts` · `realtor_agent_config`

**No** → ship freely, Render doesn't care
**Yes** → update both CRM + Render in same PR, run smoke test after

---

## Phases (in order)

### Phase 1 — UI Only · Zero Render risk · Do this first
- [x] `EmailMarketingTabs.tsx` — collapse 4 tabs → 3: **AI Nurture / Campaigns / Automations** (Settings moved to /newsletters/settings via header link)
- [x] Rename to plain English: "AI" tab → "AI Nurture"
- [x] Remove orphaned pages from realtor nav — already not in sidebar; no links added to main UI
- [x] Build `WhatWentOutFeed.tsx` — read-only union of newsletters with source labels (AI Nurture, Workflow, Campaign, AI Autopilot, Greeting)
- [x] AI tab: stat bar + hot leads + AI working for you + approval queue + pipeline card + WhatWentOutFeed
- [x] Campaigns tab: listing blasts + custom campaigns (unchanged — already good)
- [x] Automations tab: greeting toggles + listing blast toggle + workflow builder link (unchanged — already good)

### Phase 2 — Bug Fixes · Shared table changes · One PR
- [x] **Workflow rate limiter bug** — ALREADY FIXED: `executeAutoMessage()` already writes to `newsletters` table (workflow-engine.ts:277) with `ai_context.source='workflow'`
- [x] **Events don't advance journey phases** — `showing_confirmed` → advance buyer to `active` (showings.ts); `listing_sold` → emit newsletter event + advance seller to `past_client` (listings.ts — seller advance was already done, added newsletter event emission)
- [x] **Editorial per-recipient tracking** — `sendEdition()` now inserts per-recipient rows into `newsletters` with `ai_context.source='editorial'` so editorial sends count toward frequency caps

### Phase 3 — Kill System 5 (Drip) · Render deploy · Own PR
- [x] Confirmed System 1 (Journey) covers all contact types: buyer, seller, customer, agent — all have JOURNEY_SCHEDULES with welcome emails
- [x] Deleted `realtors360-newsletter/src/agent/drip/sequence-engine.ts` + removed empty drip/ directory (no cron to remove — drip engine was never registered as a cron)
- [ ] Smoke test: new contact → only 1 welcome email in `email_events` (not 2) — requires Render deploy to verify

### Phase 4 — Template Gallery · Separate page · Done
- [x] Created `/newsletters/templates` — server-rendered gallery of all 20 email templates
- [x] Extracted `JOURNEY_SCHEDULES` to `src/lib/constants/journey-schedules.ts` (shared between "use server" actions and UI)
- [x] Created `src/lib/constants/template-registry.ts` — central mapping of 20 templates with metadata + sample props
- [x] Created `src/components/newsletters/TemplateGalleryClient.tsx` — 3-section tabs (Buyer Journey / Seller Journey / Smart Alerts & Greetings), collapsible phase groups, scaled iframe previews, full-size dialog
- [x] Templates rendered server-side via `@react-email/render` with realtor's actual branding
- [x] Added "📋 Templates" link in PageHeader (next to ⚙️ Settings)
- [x] Architecture supports future template editing (slug → newsletter_templates) and delivery history (newsletters.template_slug)

### Phase 5 — Unified Send Gateway · New architecture · Later
- [ ] New `send_queue` table — all systems write here instead of `newsletters` directly
- [ ] Single Render worker: CASL check → global cap → priority (P1 events, P2 agent, P3 journey, P4 workflow, P5 editorial) → send → write to `newsletters`
- [ ] Replaces 3 fragmented rate limiters with one shared view

### Phase 5 — Admin UI Wiring · No timeline
- [ ] Wire existing pages into Admin UI: `/engine` `/control` `/ghost` `/suppressions` `/learning` `/insights` `/analytics/contacts`

---

## Progress

| Phase | Status |
|-------|--------|
| 1 — UI consolidation | ✅ Done (2026-04-22) |
| 2 — Bug fixes | ✅ Done (2026-04-22) |
| 3 — Kill System 5 | ✅ Done (2026-04-22) — pending Render deploy + smoke test |
| 4 — Template Gallery | ✅ Done (2026-04-23) |
| 5 — Unified Gateway | ⬜ Not started |
| 6 — Admin UI wiring | ⬜ Deferred |

---

## What NOT to Do
- Don't rename any shared table column directly (add new → migrate → remove old)
- Don't add NOT NULL without DEFAULT to a shared table
- Don't delete System 5 before verifying System 1 coverage
- Don't add tabs — 3 max
- Don't upgrade Journey emails from Haiku to Sonnet (20x cost difference)
