# Email MVP Plan
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
- [ ] `EmailMarketingTabs.tsx` — collapse 6 tabs → 3: **AI / Campaigns / Automations**
- [ ] Rename to plain English: Journey Pipeline → AI Nurture, Event Pipeline → Smart Alerts, AI Agent → AI Autopilot, Editorial → Campaigns, lead → New Contact, active → Active Buyer/Seller
- [ ] Remove orphaned pages from realtor nav (keep files — Admin UI will link them later): `/engine` `/control` `/ghost` `/suppressions` `/learning` `/insights` `/settings/sources` `/guide` `/editorial/upgrade` `/ab-testing`
- [ ] Build `WhatWentOutFeed.tsx` — read-only union of newsletters + communications + agent_drafts, plain English labels
- [ ] AI tab: stat bar + feed + approval queue + pipeline card + single send toggle
- [ ] Campaigns tab: new campaign button + past editions list + A/B summary card + template library link
- [ ] Automations tab: greeting toggles + workflow builder link + active workflows count

### Phase 2 — Bug Fixes · Shared table changes · One PR
- [ ] **Workflow rate limiter bug** — `executeAutoMessage()` writes to `communications` but rate limiter reads `newsletters`. Fix: also write to `newsletters` with `source='workflow'` (add nullable column — safe)
- [ ] **Events don't advance journey phases** — `showing_confirmed` → advance buyer to `active`; `listing_sold` → advance seller to `past_client`
- [ ] **Editorial per-recipient tracking** — when `sendEdition()` fires, also insert per-recipient row into `newsletters` with `source='editorial'` so editorial counts in frequency cap

### Phase 3 — Kill System 5 (Drip) · Render deploy · Own PR
- [ ] Confirm System 1 (Journey) covers all contact types before deleting anything
- [ ] Delete `realtors360-newsletter/src/agent/drip/sequence-engine.ts` + remove cron + deploy Render
- [ ] Smoke test: new contact → only 1 welcome email in `email_events` (not 2)

### Phase 4 — Unified Send Gateway · New architecture · Later
- [ ] New `send_queue` table — all systems write here instead of `newsletters` directly
- [ ] Single Render worker: CASL check → global cap → priority (P1 events, P2 agent, P3 journey, P4 workflow, P5 editorial) → send → write to `newsletters`
- [ ] Replaces 3 fragmented rate limiters with one shared view

### Phase 5 — Admin UI Wiring · No timeline
- [ ] Wire existing pages into Admin UI: `/engine` `/control` `/ghost` `/suppressions` `/learning` `/insights` `/analytics/contacts`

---

## Progress

| Phase | Status |
|-------|--------|
| 1 — UI consolidation | ⬜ Not started |
| 2 — Bug fixes | ⬜ Not started |
| 3 — Kill System 5 | ⬜ Not started |
| 4 — Unified Gateway | ⬜ Not started |
| 5 — Admin UI wiring | ⬜ Deferred |

---

## What NOT to Do
- Don't rename any shared table column directly (add new → migrate → remove old)
- Don't add NOT NULL without DEFAULT to a shared table
- Don't delete System 5 before verifying System 1 coverage
- Don't add tabs — 3 max
- Don't upgrade Journey emails from Haiku to Sonnet (20x cost difference)
