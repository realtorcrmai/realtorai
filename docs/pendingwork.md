<!-- docs-audit: src/** -->
# Pending Work — Realtors360 CRM

*Last updated: 2026-04-12*

## LAUNCH BLOCKER — Multi-Tenancy & Security (P0)

**Status: MUST FIX BEFORE ANY CUSTOMER LAUNCH**

Pre-launch audit on 2026-03-30 found critical issues. The app is single-tenant — all authenticated users see all data. Multiple API endpoints are unprotected. Hardcoded secrets in client code.

### Critical Fixes (Block Launch)

- [x] **Add `realtor_id` column** to ALL core tables — Done (migration 110 applied to dev+prod)
- [x] **New migration: rewrite ALL RLS policies** — Done (migration 110: 93 tables locked with `realtor_id = auth.uid()`)
- [x] **Remove anon access** — Done (migration 110 drops all existing policies before creating tenant-scoped ones)
- [x] **Remove open `USING (true)` policies** — Done (migration 110 rewrites all to tenant isolation)
- [x] **Fix middleware auth exemptions** — Done (13 exemptions removed, security comments added)
- [x] **Move CRON_SECRET** — Already server-only. No client-side exposure found. DailyDigestCard hardcoded secret removed.
- [x] **Remove hardcoded demo credentials** — Done (demo login guard: prod restricts to exact DEMO_EMAIL match)
- [x] **HMAC-signed unsubscribe tokens** — Done (all 5 email send paths use `buildUnsubscribeUrl()` with HMAC-SHA256)

### High Priority (Pre-Launch)

- [x] **Cookie consent banner** — Done (CookieConsent component in root layout, PIPEDA-compliant text)
- [x] **Data deletion endpoint** — Done (`DELETE /api/user/data` with confirmation, rate-limited, audit trail)
- [x] **CASL consent expiry tracking** — Done (cron sends re-confirmation emails 30 days before expiry, `/api/consent/reconfirm` extends by 2 years)
- [x] **Rate limiting** — Done (unsubscribe 10/min, lead-capture 20/min, data-delete 3/hour, contact-api 60/min)
- [x] **Audit trail** for unsubscribe — Already done (activity_log with full metadata)

### Files Fixed (P0 Complete)

| File | Fix Applied |
|------|-------------|
| `supabase/migrations/110_lock_rls_policies.sql` | Rewrites ALL 93 tenant tables to `realtor_id = auth.uid()` |
| `src/middleware.ts` | 13 exemptions removed, security comments added |
| `src/lib/auth.ts` | Demo login guard — prod restricts to exact DEMO_EMAIL |
| `src/lib/unsubscribe-token.ts` | HMAC-SHA256 signed tokens for unsubscribe links |
| `src/actions/newsletters.ts` | Uses `buildUnsubscribeUrl()` |
| `src/lib/resend.ts` | List-Unsubscribe header uses HMAC tokens |
| `src/actions/drip.ts` | Welcome drip uses signed tokens |

---

## Status Summary

**Phase A (Sprints 0-9): COMPLETE** — Email AI engine, 10 agent modules, 7 workflows, 6-tab UI, 14 email blocks, 8 crons, all wired and passing 2000+ tests.

**Phase B (Sprints 11-15): NOT STARTED** — Business operations brain.

**Phase C (Sprint 10): NOT STARTED** — Demo seed data + sales presentation.

**Phase D (Sprints 20-25): MOSTLY BUILT** — Website Integration Platform (SDK, APIs, chatbot, analytics, session recording). Sprint 20-22 built, Sprint 23-25 partial.

**Phase E (Future): NOT STARTED** — Home Services Marketplace (vendor directory, referrals, reviews, post-closing automation).

**Phase F (Future): NOT STARTED** — Social Media Content Studio (standalone module at `realtors360-social/`). PRD + Plan at `docs/`.

**RAG System: COMPLETE** — 12-phase pipeline, 170 tests passing, assistant UI, knowledge management.

**Voice Agent: COMPLETE** — 46 tools, 21 API routes, Python server, CRM widget.

**DDF/MLS Import: BUILT** — DDF client, mapper, import/search/sync API routes, import modal.

---

## Recently Completed (Last 48 Hours)

### RAG System — COMPLETE
- [x] RAG library (`src/lib/rag/`) — chunker, embeddings, retriever, synthesizer, guardrails, query planner, ingestion, feedback, conversation, realtime-ingest
- [x] RAG API routes (`src/app/api/rag/`) — chat, feedback, ingest, search, knowledge CRUD
- [x] Assistant UI page (`src/app/(dashboard)/assistant/`) with knowledge management
- [x] 170 tests passing across 12 phases

### Voice Agent — COMPLETE
- [x] Python server (`voice_agent/server/`) with 46 tools covering all manual CRM actions
- [x] 21 API routes (`src/app/api/voice-agent/`) — contacts, listings, showings, deals, offers, tasks, workflows, newsletters, communications, activities, enrollments, households, relationships, feedback
- [x] CRM widget components (`src/components/voice-agent/VoiceAgentPanel.tsx`, `VoiceAgentWidget.tsx`)
- [x] Quality overhaul + token optimization

### DDF/MLS Import — BUILT
- [x] DDF client library (`src/lib/ddf/`) — client, mapper, index
- [x] DDF API routes (`src/app/api/ddf/`) — import, search, sync
- [x] DDFImportModal component (`src/components/listings/DDFImportModal.tsx`)

### Website Integration Platform (Phase D) — MOSTLY BUILT
- [x] JS SDK (`public/sdk/realtors360.js`)
- [x] Website API routes (`src/app/api/websites/`) — analytics, booking, chat, lead, listings, newsletter, session, valuation
- [x] Website dashboard page (`src/app/(dashboard)/websites/`)
- [x] Dashboard components (`src/components/websites/`) — IntegrationCodesTab, AnalyticsTab, LeadsTab, SessionsTab, SettingsTab, WebsiteDashboardClient
- [x] Website Feature Blueprint spec (`docs/SPEC_Website_Feature_Blueprint.md`)

### Contact Management Enhancements — BUILT
- [x] Contact merge tool (`src/actions/contact-merge.ts`, `src/app/(dashboard)/contacts/merge/`)
- [x] Contact import/export (`src/app/api/contacts/import/`, `src/app/api/contacts/export/`)

### Email Marketing Enhancements — BUILT
- [x] Greeting automations component (`src/components/newsletters/GreetingAutomations.tsx`)
- [x] Greeting automations cron (`src/app/api/cron/greeting-automations/`)
- [x] Newsletter UI overhaul — simplified tabs, AI Working For You widget, listing blast automation

### Developer Workflow — BUILT
- [x] Agent playbook enforcement (`.claude/agent-playbook.md`, `.claude/compliance-log.md`)
- [x] CONTRIBUTING.md + feature branch workflow
- [x] Dynamic Website Platform plan (`.claude/plans/joyful-dreaming-thunder.md`)

---

## Email Marketing Engine — BUILT

All items below are implemented, wired, and tested.

### Auto-Enrollment
- [x] Auto-enroll contacts in buyer/seller journey when created in CRM (`actions/contacts.ts` -> `enrollInJourney()`)
- [x] Detect contact type (buyer/seller) and assign correct journey_type
- [x] Default new enrollments to `current_phase: "lead"`
- [x] Trigger welcome email via Speed-to-Contact workflow

### Journey Phase Advancement
- [x] Auto-advance from "lead" -> "active" when showing is booked (`lib/workflow-triggers.ts`)
- [x] Auto-advance from "active" -> "under_contract" when offer accepted
- [x] Auto-advance to "past_client" when deal closes
- [x] Auto-move to "dormant" after 60+ days of no interaction (`lib/trigger-engine.ts` -> `checkInactivity()`)
- [x] Re-activate dormant contacts when they engage (click/open via webhook)

### Send Governor
- [x] Weekly frequency cap (max 3 emails per contact per week) (`lib/send-governor.ts`)
- [x] Engagement-based throttling (reduce frequency if declining)
- [x] Auto-sunset contacts with 0 opens in 90 days
- [ ] Domain warm-up for new sending domains
- [ ] Bounce rate monitoring (abort if > 3%)

### Progressive Trust System
- [x] 4-level trust ladder (Ghost -> Co-pilot -> Supervised -> Autonomous) (`lib/ai-agent/trust-manager.ts`)
- [x] Ghost mode — agent drafts but doesn't send (`lib/ai-agent/trust-gate.ts`)
- [x] Trust promotion logic (`lib/ai-agent/trust-manager.ts`)
- [x] Edit tracking — agent learns from realtor corrections (`lib/voice-learning.ts`, `api/newsletters/edit/route.ts`)
- [x] Weekly learning cycle (`lib/learning-engine.ts`, `cron/weekly-learning`)

### Explainability & Transparency
- [x] "Why this email?" reasoning in ai_context on every draft
- [x] Suppression log visible in Performance tab ("Held Back" section)
- [x] Agent decisions logged to `agent_decisions` table
- [x] Full audit trail — `trust_audit_log`, `agent_decisions`, `send_governor_log` tables

### Content Engine
- [x] Voice training from realtor edits (`lib/voice-learning.ts`, `lib/ai-agent/voice-learner.ts`)
- [x] Per-contact content preference learning from click intelligence
- [x] 14 modular email blocks, Apple-quality design (`lib/email-blocks.ts`)
- [x] 11 email template types
- [x] Text pipeline (personalization, voice rules, compliance, dedup) (`lib/text-pipeline.ts`)
- [x] Quality pipeline (7-dimension scoring via Claude Haiku) (`lib/quality-pipeline.ts`)

### AI Agent System (10 Modules)
- [x] Lead Scorer (`lib/ai-agent/lead-scorer.ts`)
- [x] Contact Evaluator (`lib/ai-agent/contact-evaluator.ts`)
- [x] Greeting Agent — 11 occasions (`lib/ai-agent/greeting-agent.ts`)
- [x] Next-Best-Action (`lib/ai-agent/next-best-action.ts`)
- [x] Send Advisor (`lib/ai-agent/send-advisor.ts`)
- [x] Send Governor (`lib/ai-agent/send-governor.ts`)
- [x] Timing Optimizer (`lib/ai-agent/timing-optimizer.ts`)
- [x] Trust Manager (`lib/ai-agent/trust-manager.ts`)
- [x] Trust Gate (`lib/ai-agent/trust-gate.ts`)
- [x] Voice Learner (`lib/ai-agent/voice-learner.ts`)

### Cron Jobs (9)
- [x] Agent evaluate — every 10 min (events + greetings)
- [x] Agent scoring — every 15 min (Claude lead scoring)
- [x] Agent recommendations — hourly (next-best-action)
- [x] Process workflows — daily 9 AM (execute workflow steps)
- [x] Daily digest — daily 8 AM (morning summary email)
- [x] Consent expiry — weekly Mon 6 AM (CASL check)
- [x] Weekly learning — weekly Sun 3 AM (analyze + adjust)
- [x] Greeting automations — cron for birthday/anniversary/holiday emails
- [x] All registered in `vercel.json`

### UI (6-Tab Newsletter Page)
- [x] Overview — health pills, Act Now urgency, pipeline, AI activity
- [x] AI Workflows — 7 workflow cards with step counts
- [x] Performance — AI Working For You, approval queue, sent by AI, held back
- [x] Campaigns — listing blast wizard, custom campaigns, blast history
- [x] Automation — listing blast rules, greeting automations (11 occasions)
- [x] Settings — master switch, frequency cap, quiet hours, send mode

### Infrastructure
- [x] Resend webhook handler (click/open/bounce tracking, 11 click categories)
- [x] BCC monitoring (`EMAIL_MONITOR_BCC` env var)
- [x] Validated send wrapper with metadata banner
- [x] 7 workflow blueprints (108 steps total)
- [x] Demo seed script (`scripts/seed-demo.mjs`)

---

## Phase B — Business Operations Brain (NOT STARTED)

### Sprint 11: Conversation Ingestion (3 days)
- [ ] Parse call/meeting notes with Claude, extract structured context
- [ ] Store in `contact_context` table
- [ ] Feed context into email generation prompts

### Sprint 12: Market Data Feed (4 days)
- [ ] Real MLS/market data sources in email prompts
- [ ] Expanded content assembler — all 5 data sources
- [ ] Area-specific stats for market update emails

### Sprint 13: Performance Analytics (3 days)
- [ ] Win/loss tracking — link deals back to email touchpoints
- [ ] Revenue attribution — which emails led to showings/offers
- [ ] Deal velocity metrics

### Sprint 14: Competitive Benchmarking (3 days)
- [ ] Cross-realtor comparison (anonymized)
- [ ] Industry newsletter monitoring
- [ ] Behavioral anomaly detection

### Sprint 15: Beyond-Email Recommendations (4 days)
- [ ] Pricing recommendations
- [ ] Staging suggestions
- [ ] Listing timing optimization
- [ ] Deal risk assessment

---

## Phase C — Demo & Launch (NOT STARTED)

### Sprint 10: Demo Seed Data + Sales Presentation (2 days)
- [ ] 30 contacts across all journey phases with realistic Vancouver data
- [ ] Real Vancouver MLS listing data (addresses, prices, photos)
- [ ] Real email delivery to amandhindsa@outlook.com during demo
- [ ] Demo login: demo@realtors360.com / demo2026
- [ ] 5-minute demo script (overnight summary -> Sarah's 360 -> voice learning -> suppression -> ROI)

---

## Remaining Email Engine Gaps

### Not Yet Built
- [ ] Domain warm-up for new sending domains
- [ ] Bounce rate monitoring (abort if > 3%)
- [ ] A/B testing — continuous variant testing at individual level
- [ ] MLS event stream -> per-contact relevance matching (real-time)
- [ ] Revenue attribution — link deals back to email touchpoints
- [ ] Side-by-side agent vs human performance comparison
- [ ] Weekly learning cron doesn't email the report to the realtor (runs analysis but no email sent)
- [ ] Email preview in browser — no `/preview/:id` route for realtors to see emails before approving in full browser view

---

## Production Deployment — Not Done

### Vercel
- [ ] Create Vercel project and link repo
- [ ] Set all env vars in Vercel dashboard (from vault)
- [ ] Configure custom domain
- [ ] Verify all 9 cron jobs run on schedule
- [ ] Configure Resend webhook URL to production domain
- [ ] Test production build end-to-end

### Monitoring & Ops
- [ ] Error tracking (Sentry or similar)
- [ ] Uptime monitoring for cron endpoints
- [ ] Resend webhook delivery monitoring
- [ ] Database backup schedule
- [ ] Rate limit handling for Anthropic API (agent-scoring cron hits limits at scale)

---

## Core CRM — Known Gaps

### Contact Management
- [x] Auto-enrollment on contact create — BUILT
- [x] Contact fields (address, lead source, lead status, tags, partner fields) — BUILT
- [x] Contact deletion — BUILT (`deleteContact` in actions/contacts.ts)
- [x] Contact import/export — BUILT (`/api/contacts/import` + `/api/contacts/export`)
- [x] Contact merge/dedup — BUILT (`/contacts/merge` page + `actions/contact-merge.ts`)
- [ ] Contact archiving (soft delete with restore)
- [ ] Buyer agents stored as flat text on appointments, not as contacts
- [ ] Relationship mapping between contacts (beyond referred_by)
- [ ] Contact search on contacts page (no search bar, only stage filter)

### Listing Workflow
- [x] DDF/MLS import — BUILT (`src/lib/ddf/`, `src/app/api/ddf/`, `DDFImportModal.tsx`)
- [ ] E-Signature (Phase 6): DocuSign API integration not confirmed live
- [ ] MLS Submission (Phase 8): No Paragon API — manual only
- [ ] Phases 9-12: Offer management, subject tracking, closing workflow
- [ ] No offer management page or deal tracking UI

### Compliance
- [ ] FINTRAC only for sellers (not buyers)
- [ ] No Receipt of Funds or Suspicious Transaction reporting
- [ ] No record retention policy enforcement
- [x] CASL consent expiry tracking — BUILT (`cron/consent-expiry`)

---

## Phase D — Website Integration Platform (MOSTLY BUILT)

**PRD:** `docs/PRD_Website_Integration_Platform.md` (63 user stories, 127 test cases)
**Spec:** `docs/SPEC_Website_Feature_Blueprint.md`

### Sprint 20: Public APIs + JS SDK — BUILT
- [x] Embeddable JS SDK (`public/sdk/realtors360.js`)
- [x] `GET /api/websites/listings` — active listings JSON
- [x] `POST /api/websites/lead` — create CRM contact from website form
- [x] `POST /api/websites/newsletter` — newsletter signup + journey enrollment
- [x] `POST /api/websites/booking` — appointment request + calendar check
- [x] `POST /api/websites/analytics` — page view + interaction events
- [x] `POST /api/websites/valuation` — home valuation request -> seller lead
- [ ] API key auth system (`X-LF-Key` header, per-realtor keys, domain whitelist) — needs verification
- [ ] Migration `055_website_integrations.sql` — needs verification

### Sprint 21: CRM Dashboard + Embed Code Generator — BUILT
- [x] `/websites` dashboard page (`src/app/(dashboard)/websites/`)
- [x] IntegrationCodesTab — embed code cards with copy buttons
- [x] AnalyticsTab — visitor metrics
- [x] LeadsTab — website lead submissions
- [x] SessionsTab — session tracking
- [x] SettingsTab — configuration
- [ ] Add "Website" to nav in `AppHeader.tsx` — needs verification

### Sprint 22: AI Chatbot Widget — BUILT
- [x] `POST /api/websites/chat` — Claude chat endpoint
- [ ] Chat widget in SDK — shadow DOM, floating bubble, streaming responses (needs verification)
- [ ] Property cards inline in chat, quick actions, lead capture prompt
- [ ] Chatbot config in CRM settings (greeting, personality, working hours)
- [ ] Rate limiting (20 msgs/session, 100/day)

### Sprint 23: Analytics Dashboard (PARTIAL)
- [x] AnalyticsTab component exists
- [ ] Full analytics aggregation — visitor chart, stats pills, top pages, referrers, devices
- [ ] Lead funnel visualization (views -> forms -> contacts)
- [ ] UTM campaign performance table
- [ ] Server actions for analytics aggregation queries

### Sprint 24: Session Recording + FullStory (PARTIAL)
- [x] `POST /api/websites/session` — session tracking endpoint
- [x] SessionsTab component exists
- [ ] FullStory integration embed code + `FS.identify()` on form submit
- [ ] rrweb self-hosted recording (alternative)
- [ ] Session list in CRM with filters (date, converted, pages)
- [ ] "Website Activity" section on contact detail page
- [ ] Migration: `site_sessions` + `site_session_recordings` tables

### Sprint 25: Listings Feed + Advanced Widgets (NOT STARTED)
- [ ] `Realtors360.mountListings()` — responsive property card grid widget
- [ ] `Realtors360.mountNewsletter()` — newsletter signup widget
- [ ] `Realtors360.mountBooking()` — appointment booking widget
- [ ] SEO JSON-LD endpoint for listings
- [ ] Social proof ticker widget

---

## Voice Agent — COMPLETE

### Built
- [x] Python server with 46 tools covering all manual CRM actions (`voice_agent/server/`)
- [x] 21 API routes for CRM data access (`src/app/api/voice-agent/*`)
- [x] UI widget for CRM integration (`src/components/voice-agent/`)
- [x] Quality overhaul + token optimization
- [x] Multi-task decomposition protocol

### Remaining
- [ ] Voice-to-voice real-time streaming (WebSocket/WebRTC)
- [ ] Voice agent deployment (separate service — Railway/Fly.io)
- [ ] Voice agent onboarding/settings in CRM

---

## RAG System — COMPLETE

### Built
- [x] Full RAG library — chunker, embeddings, retriever, synthesizer, guardrails, query planner, ingestion, feedback, conversation (`src/lib/rag/`)
- [x] 6 API routes — chat, feedback, ingest, search, knowledge CRUD (`src/app/api/rag/`)
- [x] Assistant UI with knowledge management (`src/app/(dashboard)/assistant/`)
- [x] Realtime ingestion for CRM events (`src/lib/rag/realtime-ingest.ts`)
- [x] 170 tests passing

### Remaining
- [ ] RAG deployment (pgvector extension on Supabase, embedding model hosting)
- [ ] Knowledge base seeding with BC real estate regulations, BCREA forms docs
- [ ] RAG-enhanced email content generation (feed RAG context into newsletter AI)

---

## Website Generator (realtors360-agent)

### Built
- [x] Agent service (Express + Anthropic SDK + Playwright)
- [x] 9 section components (Nav, Hero, About, Stats, Testimonials, Listings, CTA, Contact, Footer)
- [x] 3 style presets (Dark Luxury, Light Modern, Bold & Warm)
- [x] Site config JSON generation
- [x] Cloudflare Pages deployment

### Not Built
- [ ] Drag-and-drop block editor (reorder, show/hide sections)
- [ ] Live theme editor (colors, fonts, spacing in real-time)
- [ ] Content CMS (edit text, swap photos inline)
- [ ] Custom pages (About, Listings, Blog)
- [ ] Custom domain connection via Cloudflare
- [ ] Blog/content engine with AI drafting
- [ ] Lead dashboard (view form submissions, export)
- [ ] SEO settings (meta titles, descriptions, OG images)
- [ ] Analytics (page views, visitors, conversion rate)
- [ ] IDX/listing sync from CRM

---

## Tech Debt — Discovered

- [ ] Duplicate contacts accumulate in DB when test scripts run multiple times (seed-demo.mjs now cleans by email+phone, but other scripts like test-workflow-emails.mjs may still create orphans)
- [ ] Completed workflow enrollments retain stale `next_run_at` values (seed cleans on run, but no automatic cleanup in workflow engine)
- [ ] Twilio free tier daily message limit (50/day) causes workflow processing errors in dev — need error handling to retry or skip gracefully
- [ ] ContactForm.tsx required type casts for Zod v4 union types — fragile if schema changes
- [ ] 20 tech debt items tracked in `docs/TECH_DEBT.md` — review and prioritize
- [ ] `app-duplicate-1774569215/` and `app-backup/` directories contain stale copies of source files — should be cleaned up or gitignored

---

## QA — Remaining

### Automated Test Coverage (BUILT)
- [x] 1846 UI browser tests (`scripts/test-email-marketing-ui.mjs`)
- [x] 173 eval tests (`scripts/eval-full-1000.mjs`)
- [x] 46 real email delivery tests (`scripts/test-workflow-emails.mjs`)
- [x] 27 email engine QA tests (`scripts/qa-test-email-engine.mjs`)
- [x] 1170 test cases documented (`docs/TEST_PLAN_1000.md`)
- [x] 170 RAG system tests
- [x] 283 automated tests — 278 pass (98.2%)

### Not Yet Built
- [ ] Playwright browser interaction tests (click, scroll, form submit)
- [ ] Mobile responsive tests (375px, 768px, 1024px, 1440px)
- [ ] Performance benchmarks (page load < 3s)
- [ ] Console error monitoring
- [ ] CI/CD pipeline — run tests on push to dev before merge to main
- [ ] Voice agent integration tests
- [ ] Website SDK end-to-end tests
- [ ] DDF import integration tests

---

## Developer Workflow — BUILT

- [x] Agent playbook (`.claude/agent-playbook.md`) — team enforcement, feature evaluation, docs rules
- [x] Compliance log (`.claude/compliance-log.md`)
- [x] CONTRIBUTING.md with feature branch workflow
- [x] Feature branch protection — dev protected, requires PRs
- [x] Dynamic Website Platform plan (`.claude/plans/joyful-dreaming-thunder.md`)

---

## Phase E (Future): Home Services Marketplace — NOT STARTED

Curated marketplace connecting realtors with reliable home service providers. Realtors refer trusted vendors to clients during and after transactions.

### Core Concept
- Realtors maintain a **vetted vendor directory** of local service providers
- When a client buys/sells, the realtor recommends specific vendors from the CRM
- Clients receive a branded referral with the realtor's endorsement
- Service providers get leads; realtors strengthen client relationships

### Service Categories
- **Moving**: Movers, packers, storage, junk removal
- **Repairs & Maintenance**: Plumbers, electricians, HVAC, roofers, handyman
- **Home Improvement**: Painters, landscapers, interior designers, contractors
- **Cleaning**: Move-in/move-out cleaning, deep cleaning, window washing
- **Legal & Financial**: Real estate lawyers, notaries, mortgage brokers, insurance agents
- **Inspection**: Home inspectors, pest control, mold testing
- **Smart Home**: Security systems, home automation, internet/cable setup
- **Staging**: Home stagers, furniture rental, photographers

### Features (Planned)
- [ ] Vendor directory with categories, ratings, service areas, pricing tiers
- [ ] Realtor-curated "My Vendors" list (personal favourites per category)
- [ ] One-click referral: send vendor contact + intro to client via email/SMS
- [ ] Vendor profiles: photos, reviews, license verification, insurance status
- [ ] Client feedback loop: "How was the service?" rating after referral
- [ ] Vendor search by area, availability, price range, language spoken
- [ ] Automated post-closing email: "Here are trusted vendors for your new home"
- [ ] Vendor analytics: referral count, client satisfaction, response time
- [ ] Revenue opportunity: referral fees or featured listings for vendors
- [ ] Integration with contact journeys (post-closing phase auto-triggers vendor recommendations)

### Database Tables (Planned)
- `service_vendors` — name, category, phone, email, areas_served, rating, verified
- `vendor_reviews` — contact_id, vendor_id, rating, review_text, referral_id
- `vendor_referrals` — realtor_id, vendor_id, contact_id, listing_id, status, sent_at
- `realtor_vendor_favourites` — realtor_id, vendor_id, category, notes

### Integration Points
- Contact journey: post-closing phase triggers "recommended vendors" email
- Listing workflow: Phase 7-8 (pre-listing) suggests stagers/photographers
- Newsletter engine: "Home maintenance tips" emails link to vendor directory
- Website platform: public vendor directory page on realtor's website
