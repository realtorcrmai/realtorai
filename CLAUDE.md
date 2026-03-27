# CLAUDE.md — ListingFlow Real Estate CRM

## Project Overview

ListingFlow is a real estate transaction management CRM for licensed BC realtors. It automates the full property listing lifecycle — from seller intake through closing — with integrated showing management, BCREA form generation, AI content creation, and regulatory compliance tracking.

**Live URL:** localhost:3000 (dev)
**Monorepo root:** `/Users/bigbear/reality crm/`
**App directory:** `/Users/bigbear/reality crm/realestate-crm/`

### Git Workflow

- **`dev`** — default branch, all development commits go here
- **`main`** — production/release, protected (requires PR with 1 approval)
- Always push to `dev`. Never push directly to `main`.
- To release: create PR from `dev → main`, get approval, merge.

### Deployment — Use `/deploy`

**Run `/deploy` to build and start all services locally.** The deploy skill at `.claude/skills/deploy.md` handles: pull latest, install deps, run migrations, build, start servers, and validate.

| Service | Port | Command |
|---------|------|---------|
| CRM (Next.js) | 3000 | `npm run dev` from `realestate-crm/` |
| Website Agent | 8768 | `npm run dev` from `listingflow-agent/` |
| Form Server | 8767 | Python server (separate) |

### Secrets — Encrypted Vault

API keys are stored encrypted in `.env.vault` (committed to git). **Never commit `.env.local` or put API keys in code/CLAUDE.md.**

```bash
# First time setup — decrypt secrets
./scripts/vault.sh decrypt        # passphrase from team lead

# After adding a new API key
./scripts/vault.sh encrypt        # re-encrypt and commit .env.vault

# Check what's stored
./scripts/vault.sh status         # shows keys with masked values

# Change passphrase
./scripts/vault.sh rotate
```

When you add a new secret: edit `.env.local` → run `encrypt` → commit `.env.vault` → tell team to `decrypt` after pull.

### Testing — MANDATORY

**After every build or deploy, run `/test` to validate the application.** The test skill at `.claude/skills/test.md` runs 10 phases: build verification, server health, auth, API endpoints, page loads, email engine, Supabase connection, UX scroll, contact form, and newsletter journeys. Do NOT deploy without a passing test run.

### Test Plans & Documentation — MANDATORY

**When building new features, you MUST update the relevant test plan documents.** These are the source of truth for production deployment testing.

| Document | Location | Purpose |
|----------|----------|---------|
| **Production Test Plan (1170 cases)** | `docs/TEST_PLAN_1000.md` | 16-category test plan with user stories, acceptance criteria, and test steps. Run with every production deployment. |
| **Production Deployment Guide** | `docs/PRODUCTION_DEPLOYMENT.md` | Environment setup, service configuration, migration steps, monitoring. |
| **Tech Debt Registry** | `docs/TECH_DEBT.md` | 19 tracked tech debt items with severity, file paths, and fix instructions. |

**Test Scripts (Automated):**

| Script | Command | Tests |
|--------|---------|-------|
| UI Browser Tests | `node scripts/test-email-marketing-ui.mjs` | 1833 tests — page loads, DB integrity, cross-references, workflows |
| Email Delivery Tests | `node scripts/test-workflow-emails.mjs` | 46 real emails sent across all 7 workflows |
| Email Engine QA | `node scripts/qa-test-email-engine.mjs` | 27 tests — AI generation, send, track pipeline |

**Rules for updating test plans:**
1. **Every new feature** must add test cases to `TEST_PLAN_1000.md` in the relevant category
2. **Every new API endpoint** must add test cases to the HOOK or INT category
3. **Every new UI component** must add test cases to the relevant page category
4. **Every bug fix** must add a regression test case
5. **Every new automation/workflow** must add cases to the WF category
6. **Test case IDs** follow the pattern `CATEGORY-NNN` (e.g., EMAIL-251, CONTACT-121)
7. **New tech debt** must be logged in `TECH_DEBT.md` with severity and file path
8. If you add a new page route, add it to NAV category AND update the automated test script

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL + RLS) | latest |
| Auth | NextAuth v5 (beta.30) | JWT sessions |
| Styling | Tailwind CSS v4 + custom ListingFlow design system | 4.x |
| UI Components | shadcn/ui v4 + custom LF components | 4.x |
| State | Zustand + TanStack React Query v5 | 5.x |
| Forms | React Hook Form + Zod v4 | 7.x / 4.x |
| SMS/WhatsApp | Twilio | 5.x |
| Calendar | Google Calendar API (googleapis) | 171.x |
| AI | Anthropic Claude SDK | 0.78.x |
| Video/Image | Kling AI API | custom |
| Form Engine | ListingFlow Python server | localhost:8767 |

---

## Project Structure

```
realestate-crm/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page (demo + Google OAuth)
│   │   ├── (dashboard)/           # Protected dashboard routes
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   ├── listings/          # Listings list + [id] detail + [id]/workflow
│   │   │   ├── contacts/          # Contacts list + [id] detail
│   │   │   ├── showings/          # Showings list + [id] detail
│   │   │   ├── calendar/          # Google Calendar + showing events
│   │   │   └── content/           # AI content engine + [id] detail
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/ # NextAuth handler
│   │   │   ├── calendar/          # events + busy endpoints
│   │   │   ├── contacts/          # Contact CRUD API
│   │   │   ├── forms/generate/    # BCREA form generation proxy
│   │   │   ├── listings/          # Listing CRUD API
│   │   │   ├── showings/          # Showing CRUD API
│   │   │   ├── mls-remarks/       # Claude AI MLS remarks
│   │   │   ├── neighborhood/      # Mock neighbourhood comps
│   │   │   ├── kling/status/      # Kling AI task polling
│   │   │   └── webhooks/twilio/   # Inbound SMS/WhatsApp handler
│   │   ├── globals.css            # Design system + Tailwind config
│   │   └── layout.tsx             # Root layout (fonts, providers)
│   ├── actions/                   # Server actions
│   │   ├── calendar.ts            # Google Calendar events
│   │   ├── contacts.ts            # Contact CRUD + messaging
│   │   ├── content.ts             # AI prompt/media generation
│   │   ├── enrichment.ts          # BC Geocoder, ParcelMap, LTSA, Assessment
│   │   ├── listings.ts            # Listing CRUD
│   │   ├── showings.ts            # Showing workflow + Twilio messaging
│   │   ├── workflow.ts            # 8-phase workflow advancement
│   │   ├── newsletters.ts         # Newsletter CRUD, AI generation, send, analytics
│   │   ├── journeys.ts            # Journey enrollment, phase advancement, cron
│   │   ├── recommendations.ts     # AI recommendations CRUD + execute
│   │   ├── templates.ts           # Email template CRUD, preview, duplicate
│   │   └── segments.ts            # Contact segment builder + bulk enroll
│   ├── emails/                    # React Email templates
│   │   ├── BaseLayout.tsx         # Shared wrapper (branding, dark mode, unsubscribe)
│   │   ├── NewListingAlert.tsx    # Property listing cards
│   │   ├── MarketUpdate.tsx       # Stats + recent sales
│   │   ├── JustSold.tsx           # Sale celebration
│   │   ├── OpenHouseInvite.tsx    # Event invitation
│   │   ├── NeighbourhoodGuide.tsx # Area lifestyle content
│   │   └── HomeAnniversary.tsx    # Annual homeowner milestone
│   ├── components/
│   │   ├── contacts/              # ContactCard, ContactForm, CommunicationTimeline, SegmentBuilder
│   │   ├── content/               # ContentStepper, PromptsStep, GenerateStep, GalleryStep
│   │   ├── listings/              # ListingCard, ListingForm, DocumentStatusTracker, etc.
│   │   ├── showings/              # ShowingRequestForm, StatusBadge, StatusActions, Communication
│   │   ├── newsletters/           # ApprovalQueueClient, NewsletterWalkthrough
│   │   ├── dashboard/             # PipelineSnapshot, AIRecommendations, RemindersWidget
│   │   ├── email-builder/         # EmailEditorClient (template editor)
│   │   ├── workflow-builder/      # WorkflowCanvas, WorkflowEditorClient (React Flow)
│   │   ├── workflow/              # WorkflowStepper, PhaseCard, Phase1-8 components
│   │   ├── layout/                # Sidebar, TopBar, MobileNav
│   │   └── ui/                    # shadcn primitives
│   ├── hooks/                     # useListings, useContacts, useShowings, useKlingTask
│   ├── lib/
│   │   ├── supabase/              # client.ts, server.ts, admin.ts
│   │   ├── anthropic/             # creative-director.ts (Claude AI)
│   │   ├── ai-agent/              # lead-scorer.ts, send-advisor.ts, next-best-action.ts
│   │   ├── kling/                 # Video/image generation API
│   │   ├── auth.ts                # NextAuth config (demo + Google OAuth)
│   │   ├── twilio.ts              # SMS/WhatsApp wrapper
│   │   ├── resend.ts              # Resend email API wrapper with retry
│   │   ├── newsletter-ai.ts       # Claude content generation for newsletters
│   │   ├── workflow-engine.ts     # Unified step executor (ai_email + auto_email via Resend)
│   │   ├── flow-converter.ts      # React Flow ↔ workflow_steps converter
│   │   ├── email-renderer.ts      # Template-to-HTML renderer
│   │   ├── google-calendar.ts     # Calendar API wrapper
│   │   ├── cdm-mapper.ts          # Listing → Common Data Model for forms
│   │   └── fuzzy-match.ts         # Jaro-Winkler string matching
│   └── types/
│       ├── database.ts            # Supabase table types
│       └── index.ts               # Exported type aliases
├── supabase/migrations/
│   ├── 001_initial_schema.sql     # contacts, listings, appointments, communications, documents
│   ├── 002-009_*.sql              # tasks, forms, content engine, contacts, workflows
│   ├── 010_newsletter_journey_engine.sql  # newsletters, newsletter_events, contact_journeys
│   ├── 011_unify_email_engine.sql # merge journey into workflow_enrollments
│   ├── 012_email_template_builder.sql # builder_json, is_ai_template columns
│   ├── 013_visual_workflow_builder.sql # flow_json for React Flow editor
│   ├── 014_segments_ab_testing.sql # contact_segments table
│   └── 015_ai_agent.sql          # ai_lead_score, agent_recommendations, ai_decision
├── scripts/
│   └── qa-test-email-engine.mjs   # Automated QA test runner (27 tests)
└── package.json
```

---

## Design System — ListingFlow

The UI uses a custom glassmorphism design language. All custom styles are defined as CSS custom properties in `globals.css`.

### Key Variables
```css
--lf-bg: #f4f2ff           /* Light purple background */
--lf-indigo: #4f35d2        /* Primary brand color */
--lf-coral: #ff5c3a         /* Accent / CTA color */
--lf-teal: #00bfa5          /* Success accent */
--lf-emerald: #059669       /* Positive states */
--lf-text: #1a1535          /* Primary text */
--lf-r: 13px                /* Border radius */
--lf-sh: 0 2px 12px rgba(79,53,210,.08)  /* Card shadow */
--lf-font-heading: 'Bricolage Grotesque'
--lf-font-body: 'Bricolage Grotesque'
```

### Component Classes
- `.lf-card` — Glass card with backdrop-blur, white 85% opacity
- `.lf-glass` — Glass panel for header/nav
- `.lf-btn` — Primary indigo button
- `.lf-btn-ghost` — Outlined button variant
- `.lf-btn-sm` — Small button
- `.lf-btn-success` / `.lf-btn-danger` — Semantic variants
- `.lf-badge` — Status badge (variants: `-done`, `-active`, `-pending`, `-blocked`, `-info`)
- `.lf-input` / `.lf-select` / `.lf-textarea` — Form elements
- `.lf-phase-num` — Workflow phase indicator (circle with number)
- `.lf-enrich-row` — Data enrichment row with hover effect

### Layout
- Fixed glass header: 60px height
- Horizontal pill navigation: 40px height
- Content area: `margin-top: 100px` (header + nav), `padding: 18px`
- Animated gradient background canvas (`.wf-canvas`)
- No vertical sidebar (converted to horizontal nav)

### Conventions
- Emoji icons throughout UI (no Lucide icons on pages, only in some components)
- Gradient avatars: seller = indigo→coral, buyer = indigo→purple
- Status colors: green = confirmed/done, amber = pending, red = denied/blocked
- All pages use `lf-glass` header bar with gradient title text

---

## Database Schema

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `contacts` | All contacts | name, phone, email, type (buyer/seller/customer/agent/partner/other), pref_channel, notes |
| `listings` | Property listings | address, seller_id, status, current_phase (1-8), list_price, forms_status, envelopes, mls_status |
| `appointments` | Showings | listing_id, buyer_agent_*, start_time, status, google_event_id |
| `communications` | Unified message log | contact_id, direction, channel, body, related_id |
| `listing_documents` | Document tracking | listing_id, doc_type, file_name, file_url |
| `seller_identities` | FINTRAC compliance | listing_id, full_name, dob, citizenship, id_type/number/expiry |
| `listing_enrichment` | Property data enrichment | listing_id, geo, parcel, ltsa, assessment, strata, enrich_status (all JSONB) |
| `prompts` | AI-generated content prompts | listing_id, video_prompt, image_prompt |
| `media_assets` | Generated content files | listing_id, asset_type, status, output_url |
| `google_tokens` | Google Calendar tokens | user_email, access_token, refresh_token |

### RLS Policy
All tables: `auth.role() = 'authenticated'` — single-tenant, all rows visible to logged-in users.

---

## 8-Phase Listing Workflow

The CRM implements an 8-phase listing workflow (stored as `current_phase` on listings):

| Phase | Name | Key Features |
|-------|------|-------------|
| 1 | Seller Intake | FINTRAC identity collection, property details, commissions, showing instructions |
| 2 | Data Enrichment | BC Geocoder (API), ParcelMap BC (API), LTSA (manual), BC Assessment (manual) |
| 3 | CMA Analysis | Comparable market analysis fields |
| 4 | Pricing & Review | List price confirmation, price lock, marketing tier |
| 5 | Form Generation | 12 BCREA forms auto-filled via Python ListingFlow server |
| 6 | E-Signature | DocuSign envelope tracking (UI exists, integration partial) |
| 7 | MLS Preparation | Claude AI remarks generation, photo management |
| 8 | MLS Submission | Manual submission step (no Paragon API integration) |

Phase advancement is sequential with audit trail logging.

---

## Key Integrations

### Twilio (SMS + WhatsApp)
- Showing request notifications to sellers
- YES/NO webhook processing for showing confirmation
- Lockbox code delivery on confirmation
- Direct messaging from CRM to contacts
- Phone formatting: auto-adds +1 prefix, strips whitespace

### Google Calendar
- Import agent's calendar events for availability checking
- Create calendar events for confirmed showings
- Token refresh via google_tokens table

### Claude AI (Anthropic)
- MLS public remarks generation (max 500 chars)
- MLS REALTOR remarks generation (max 500 chars)
- Kling video/image prompt generation
- Instagram caption + hashtag generation
- Model: Claude Sonnet

### Kling AI
- Image-to-Video: hero image → 4K video (9:16 for Reels)
- Text-to-Image: prompt → 8K image (1:1 for Instagram)
- Async task polling via /api/kling/status

### ListingFlow Python Server
- Endpoint: `LISTINGFLOW_URL` (default: `http://127.0.0.1:8767`)
- `POST /api/form/html` — accepts CDM payload, returns pre-filled HTML form
- 12 BCREA forms: DORTS, MLC, PDS, FINTRAC, PRIVACY, C3, DRUP, MLS_INPUT, MKTAUTH, AGENCY, C3CONF, FAIRHSG

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=

# Anthropic
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=

# ListingFlow Form Server
LISTINGFLOW_URL=          # defaults to http://127.0.0.1:8767

# Kling AI
KLING_API_BASE_URL=
KLING_IMAGE_API_BASE_URL=

# Demo Auth
DEMO_EMAIL=
DEMO_PASSWORD=

# Resend (Newsletter Engine)
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_WEBHOOK_SECRET=
```

---

## Development Commands

```bash
# Start dev server (from realestate-crm/)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Start ListingFlow form server (separate terminal)
# python server at localhost:8767
```

### MANDATORY: Test Before Build & Deploy

**Every time you build or deploy, run the test suite first:**

```bash
# 1. Health check (run at session start)
bash scripts/health-check.sh

# 2. Full test suite (run before every build/deploy)
bash scripts/test-suite.sh

# 3. Only if tests pass → build
npm run build

# 4. Only if build passes → deploy (auto via CI on push to main)
git add -A && git commit && git push origin main

# 5. Save known-good state after successful deploy
bash scripts/save-state.sh
```

**Test suite covers (85+ tests):**
- Navigation: All 35+ page routes return 200
- CRUD: Create/Read/Update/Delete for contacts, listings, tasks, deals, households, communications
- Data Integrity: NOT NULL, CHECK constraints, UNIQUE, self-relationship, cascade delete
- Auth: Cron endpoints require Bearer token, reject invalid/missing tokens
- Sample Data: Property type diversity, status variety, CASL consent, households, relationships

**Use `/test` slash command** to run the full test suite interactively.

### Dev Server via Claude Preview
Configured in `.claude/launch.json`:
```json
{
  "name": "dev",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev", "--prefix", "/Users/bigbear/reality crm/realestate-crm"],
  "port": 3000
}
```

---

## Design Documents

Located in project root (`/Users/bigbear/reality crm/`):

| Document | Description |
|----------|-------------|
| `ListingFlow_Realtor_Workflow_Design_Document.docx` | Complete 12-phase BC realtor listing lifecycle specification |
| `ListingFlow_Gap_Analysis_Report.docx` | Comparative analysis: design doc vs current implementation |
| `ListingFlow_Gap_Analysis_Report.md` | Same gap analysis in Markdown format |
| `PRD_Newsletter_Journey_Engine.md` | Full PRD for AI newsletter & journey engine |
| `PLAN_Email_Marketing_Engine.md` | 12-deliverable implementation plan (4 phases) |
| `PLAN_AI_Agent.md` | AI agent layer plan (lead scoring, send advisor, recommendations) |
| `SPEC_AI_Agent_Email_Marketing.md` | Technical specification for AI agent layer |

### Functional Specs & Guides
| Document | Location |
|----------|----------|
| `Email_Marketing_Engine.md` | `docs/functional-specs/` and `functional-specs/` |
| `Email_Marketing_User_Guide.html` | `guides/` — customer-facing HTML guide |
| `evals.md` | `realestate-crm/` — 200 QA test cases |

### QA Test Runner
```bash
# Run automated QA tests for the email marketing engine
RESEND_API_KEY=<key> ANTHROPIC_API_KEY=<key> CRON_SECRET=<secret> \
  node scripts/qa-test-email-engine.mjs
```

### Gap Analysis Summary (March 2026)
- **Overall coverage: ~40%** (34 built, 13 partial, 38 missing)
- **Strongest areas:** Data Enrichment (90%), Form Preparation (85%), Listing Intake (75%)
- **Major gaps:** Offer Management (0%), Contract-to-Close (0%), Post-Closing (10%)
- **Bonus features not in doc:** Content Engine (Claude + Kling AI), WhatsApp integration, AI Newsletter Engine

---

## Known Issues & Improvement Areas

### Contact Management
- Minimal fields (no address, lead source, lead status, tags)
- No contact deletion or archiving
- No search bar on contacts page
- Buyer agents stored as flat text on appointments, not as contacts
- No relationship mapping between contacts

### Communication System
- Gmail API integration exists for 1:1 email (plain text only)
- Resend integration for newsletters (AI-powered, HTML templates)
- Flat timeline with no conversation threading or filtering
- Message templates exist with variable substitution
- Workflow engine handles scheduled messages
- Agent notifications exist for workflow events
- Showing messages to buyer agents hardcoded to SMS (ignores pref_channel)
- Inbound webhook only processes YES/NO for showings

### Workflow
- E-Signature (Phase 6): DocuSign UI exists but API integration not confirmed live
- MLS Submission (Phase 8): No Paragon API — manual step only
- Phases 9-12 not represented in the workflow stepper
- No offer management, subject tracking, or closing workflow

### Compliance
- FINTRAC only implemented for sellers (not buyers)
- No Receipt of Funds or Suspicious Transaction reporting
- No record retention policy enforcement
- CASL consent tracking exists as form but no expiry tracking

---

## Coding Conventions

- **Server Actions** over API routes for mutations (actions/ directory)
- **API routes** for GET endpoints and external webhooks
- **Zod v4** for all form/API validation
- **JSONB columns** for flexible structured data (forms_status, envelopes, enrichment data, stakeholders)
- **Path alias:** `@/` maps to `src/`
- **CSS:** Use `lf-*` classes for ListingFlow design system, avoid inline styles
- **No Lucide icons on pages** — use emoji icons for UI consistency
- **Supabase admin client** (`supabase/admin.ts`) for server-side operations that bypass RLS
- **force-dynamic** on pages that need real-time data
- **Revalidate paths** after mutations: `revalidatePath('/route')`

---

## AI Email Marketing Engine

### How It Works

```
Contact added → Journey auto-enrolls → AI agent evaluates → Claude writes email
  → Quality pipeline scores → Realtor approves (or auto-send) → Resend delivers
  → Webhooks track opens/clicks → Contact intelligence updates → AI adapts next email
```

### Email Flow (All Paths)

```
1. SOURCE (auto-enroll, workflow cron, AI agent, manual blast, greeting agent)
2. TEXT PIPELINE (src/lib/text-pipeline.ts)
   → Personalization, voice rules, compliance check, subject dedup, length check
3. HTML RENDER (src/lib/email-blocks.ts)
   → Pick blocks based on email type → assemble Apple-quality HTML
4. QUALITY SCORE (src/lib/quality-pipeline.ts)
   → Claude Haiku rates 7 dimensions (1-10) → block if <4, regenerate if <6
   → Greeting emails skip quality scoring (intentionally short & personal)
5. SAVE as draft in newsletters table → appears in Performance tab queue
6. REALTOR approves → sendNewsletter() → validated send via Resend
7. BCC to EMAIL_MONITOR_BCC with metadata banner (workflow, step, contact, phase)
8. TRACK → Resend webhooks → update contact intelligence → adapt next email
```

### Email Marketing UI (Single Page — /newsletters)

6 tabs on one page:

| Tab | Purpose |
|-----|---------|
| **Overview** | Health pills (hot/warm/cold), Act Now urgency card, pipeline (buyer+seller merged), AI activity feed |
| **AI Workflows** | 7 workflow cards (Buyer Nurture, Post-Close Buyer/Seller, Speed-to-Contact, Re-Engagement, Open House Follow-Up, Referral Partner) with step counts, links to `/automations/workflows/{id}` |
| **Performance** | AI Working For You (impact stats, success stories, upcoming sends), AI Agent Queue (approve/skip/bulk), Sent by AI (expandable engagement timeline), Held Back (suppressed with reasons) |
| **Campaigns** | Manual Listing Blast wizard (4 steps), Custom Campaign wizard (4 steps), Blast History with expandable stats |
| **Automation** | Listing Blast Automations (multi-rule: trigger × template × recipients × approval), Greeting Automations (11 occasions: birthday, home anniversary, Christmas, New Year, Diwali, Lunar New Year, Canada Day, Thanksgiving, Valentine's, Mother's Day, Father's Day) |
| **Settings** | AI sending master switch, frequency cap, quiet hours, weekend sending, default send mode — all persisted to `realtor_agent_config` DB |

### AI Agent System (10 Modules)

| Module | File | Purpose |
|--------|------|---------|
| Lead Scorer | `src/lib/ai-agent/lead-scorer.ts` | Claude scores contacts 0-100 |
| Contact Evaluator | `src/lib/ai-agent/contact-evaluator.ts` | Processes events, makes send/skip/defer decisions |
| **Greeting Agent** | `src/lib/ai-agent/greeting-agent.ts` | Detects birthdays/holidays, Claude writes personalized greetings |
| Next-Best-Action | `src/lib/ai-agent/next-best-action.ts` | Generates recommendations (call, send_email, send_greeting, reengage) |
| Send Advisor | `src/lib/ai-agent/send-advisor.ts` | Per-email send decision |
| Send Governor | `src/lib/ai-agent/send-governor.ts` | Frequency caps, auto-sunset, engagement throttle |
| Timing Optimizer | `src/lib/ai-agent/timing-optimizer.ts` | Optimal send time per contact |
| Trust Manager | `src/lib/ai-agent/trust-manager.ts` | Ghost → Supervised → Autonomous progression |
| Trust Gate | `src/lib/ai-agent/trust-gate.ts` | Applies trust level to send decisions |
| Voice Learner | `src/lib/ai-agent/voice-learner.ts` | Learns realtor's writing style from edits |

### Greeting Agent Flow

```
Agent-evaluate cron (every 10 min)
  → Load greeting rules from realtor_agent_config
  → For each enabled rule: is today the right date?
    → Birthday/Anniversary: match from contact_dates table
    → Holidays: calendar date check (fixed + calculated)
  → Find matching contacts (dedup: skip if sent this year)
  → Batch contacts → Claude AI writes unique greeting per contact
  → Queue as newsletter (auto-send or review based on rule)
  → Apple-quality HTML via email-blocks system
```

### 7 Workflows (108 Steps Total)

| Workflow | Steps | Trigger | Contact |
|----------|-------|---------|---------|
| Buyer Nurture Plan | 24 | new_lead | Buyer |
| Post-Close Buyer | 19 | listing_status_change | Buyer |
| Post-Close Seller | 19 | listing_status_change | Seller |
| Lead Speed-to-Contact | 12 | new_lead | Any | **Inactive by default** — realtor enables manually |
| Referral Partner | 12 | tag_added | Any |
| Lead Re-Engagement | 11 | inactivity | Any |
| Open House Follow-Up | 11 | showing_completed | Buyer |

Blueprints: `src/lib/constants/workflows.ts`. Steps seeded via `scripts/test-workflow-emails.mjs`.

### Cron Jobs (8 Scheduled — vercel.json)

| Cron | Schedule | What It Does |
|------|----------|-------------|
| `agent-evaluate` | Every 10 min | Process contact events + greeting agent |
| `agent-scoring` | Every 15 min | AI lead scoring (batch 50) |
| `agent-recommendations` | Hourly | Next-best-action generation |
| `process-workflows` | Daily 9 AM | Execute workflow steps for enrolled contacts |
| `daily-digest` | Daily 8 AM | Email realtor overnight summary |
| `consent-expiry` | Weekly Mon 6 AM | CASL consent expiry check |
| `weekly-learning` | Weekly Sun 3 AM | Analyze outcomes, adjust AI config |

All crons require `Authorization: Bearer CRON_SECRET` header.

### Email Block System (src/lib/email-blocks.ts)

14 modular blocks, Apple-quality design: SF Pro font, 20px radius, pill CTAs, dark mode.

| Block | Purpose |
|-------|---------|
| `header` | ListingFlow branding |
| `heroImage` | Full-width photo with overlay |
| `heroGradient` | Gradient background for non-listing |
| `priceBar` | Price + beds/baths/sqft |
| `personalNote` | AI-written personalized text |
| `featureList` | Icon + title + description rows |
| `photoGallery` | 2x2 image grid |
| `statsRow` | Market stats with trend arrows |
| `recentSales` | Sold properties table |
| `priceComparison` | This listing vs area average |
| `openHouse` | Event card with date/time |
| `cta` | Pill-shaped call-to-action |
| `agentCard` | Realtor photo + name + phone |
| `footer` | Unsubscribe + physical address (CASL) |

11 template definitions: `listing_alert`, `welcome`, `market_update`, `neighbourhood_guide`, `home_anniversary`, `just_sold`, `open_house`, `seller_report`, `cma_preview`, `re_engagement`, `luxury_showcase`.

### BCC Monitoring

Set `EMAIL_MONITOR_BCC=email@example.com` in `.env.local`. Every outgoing email gets:
- BCC to the monitor address
- Purple metadata banner injected showing: Workflow, Step, Email Type, Journey Phase, Contact Name, Triggered By, Sent To, Timestamp

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/email-blocks.ts` | Modular email block builder (Apple-quality) |
| `src/lib/text-pipeline.ts` | Pre-send text processing |
| `src/lib/quality-pipeline.ts` | 7-dimension quality scoring via Claude Haiku |
| `src/lib/validated-send.ts` | Full validation wrapper + BCC metadata |
| `src/lib/send-governor.ts` | Frequency caps, engagement throttle, auto-sunset |
| `src/lib/newsletter-ai.ts` | Claude content generation with reasoning |
| `src/lib/workflow-engine.ts` | Workflow step executor |
| `src/lib/ai-agent/*.ts` | 10 AI agent modules (scoring, evaluation, greetings, trust) |
| `src/actions/newsletters.ts` | Newsletter CRUD, send, approve, bulk, blast |
| `src/actions/journeys.ts` | Journey enrollment, phase advancement |
| `src/actions/config.ts` | Realtor config, automation rules, greeting rules |
| `src/lib/validators/*.ts` | 4 validators: content, design, compliance-gate, quality-scorer |
| `src/lib/resend.ts` | Email send with retry, BCC, metadata banner |
| `src/app/api/webhooks/resend/route.ts` | Click/open/bounce tracking (11 click categories) |
| `src/app/api/templates/preview/route.ts` | Apple-quality template previews (3 designs) |
| `src/app/api/listings/blast/route.ts` | Listing blast batch send |
| `src/app/api/cron/agent-evaluate/route.ts` | Agent cron (events + greetings) |
| `src/components/newsletters/*.tsx` | 6 tab components + AIWorkingForYou + ListingBlastAutomation + GreetingAutomations |
| `scripts/seed-demo.mjs` | Demo seed data |

### Automation Rules (Persisted to DB)

**Listing Blast Rules** — saved to `realtor_agent_config.brand_config.automation_rules`:
- Multiple rules, each with: trigger (listing_active/listing_created/price_change), template, recipients, approval mode, enabled toggle

**Greeting Rules** — saved to `realtor_agent_config.brand_config.greeting_rules`:
- Per-occasion: occasion, recipients, approval mode, personal note (AI hint), enabled toggle
- 11 occasions supported (birthday through Father's Day)

### Key Tables

| Table | Purpose |
|-------|---------|
| `newsletters` | Email drafts, sent, suppressed — with quality_score + ai_context |
| `newsletter_events` | Open/click/bounce with link_type classification |
| `contact_journeys` | Journey enrollment, phase, trust_level, next_email_at |
| `contact_dates` | Birthdays, anniversaries (label + date columns) |
| `contacts.newsletter_intelligence` | Per-contact engagement score, click history, interests |
| `realtor_agent_config` | Voice rules, frequency caps, brand config, automation_rules, greeting_rules |
| `workflows` | 7 workflows with trigger_type, contact_type, is_active |
| `workflow_steps` | 108 steps with action_type, delay, task_config, action_config |
| `workflow_enrollments` | Contact enrollments with current_step, next_run_at |
| `agent_recommendations` | AI next-best-actions including send_greeting |
| `agent_decisions` | AI send/skip/defer decisions with reasoning |

### Testing

| Script | Command | Coverage |
|--------|---------|----------|
| UI Tests | `node scripts/test-email-marketing-ui.mjs` | 1860 tests — pages, DB, workflows, templates |
| Email Delivery | `node scripts/test-workflow-emails.mjs` | 46 real emails across all 7 workflows |
| Email Engine QA | `node scripts/qa-test-email-engine.mjs` | 27 pipeline tests |
| Full Test Plan | `docs/TEST_PLAN_1000.md` | 1170 detailed test cases, 16 categories |

### Specs & Docs

| Document | Location |
|----------|----------|
| Production Deployment Guide | `docs/PRODUCTION_DEPLOYMENT.md` |
| Tech Debt Registry | `docs/TECH_DEBT.md` |
| Test Plan (1170 cases) | `docs/TEST_PLAN_1000.md` |
| PRD: Newsletter & Journey Engine | `PRD_Newsletter_Journey_Engine.md` |
| Master Implementation Plan | `docs/MASTER_IMPLEMENTATION_PLAN.md` |
| Pending Work | `/Users/bigbear/reality crm/pendingwork.md` |

---

## Website Integration Platform (Phase D)

**PRD:** `docs/PRD_Website_Integration_Platform.md`

An integration SDK that connects ANY realtor website to the CRM. Not a website builder — the realtor has their own site and embeds our script/widgets.

### How It Works
```
Realtor adds: <script src=".../listingflow.js" data-key="lf_xxx"></script>
  → Analytics auto-tracked (page views, clicks, sessions)
  → Embed widgets: chatbot, listings feed, newsletter signup, booking
  → All data flows to CRM: contacts, events, sessions
  → CRM /websites dashboard: embed codes, analytics, leads, settings
```

### API Endpoints (all require X-LF-Key header)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/websites/listings` | GET | Active listings JSON |
| `/api/websites/lead` | POST | Create contact |
| `/api/websites/newsletter` | POST | Newsletter signup + journey enrollment |
| `/api/websites/booking` | POST | Appointment request |
| `/api/websites/analytics` | POST | Page view + interaction events |
| `/api/websites/chat` | POST | AI chatbot (Claude + CRM tools) |
| `/api/websites/valuation` | POST | Home valuation → seller lead |

### SDK (public/sdk/listingflow.js)
```javascript
ListingFlow.trackEvent(type, metadata)          // Custom event
ListingFlow.submitLead({ name, phone, email })  // Lead capture
ListingFlow.mountChat("div-id")                 // AI chatbot widget
ListingFlow.mountNewsletter("div-id")           // Newsletter signup
ListingFlow.mountListings("div-id", filters)    // Property card grid
ListingFlow.mountBooking("div-id")              // Appointment booking
```

### CRM Dashboard (/websites)
4 tabs: Integration Codes (7 embed snippets), Analytics (visitors, pages, funnel), Leads (website contacts), Settings (API key, domains, chatbot config)

### Key Tables
| Table | Purpose |
|-------|---------|
| `realtor_sites` | API key, allowed_domains, chatbot_config, integrations_enabled |
| `site_analytics_events` | Page views, clicks, form submits |
| `site_sessions` | Visitor sessions with journey data |
| `site_session_recordings` | rrweb replay chunks |

### Sprint Plan (6 sprints, ~16 days)
- Sprint 20: Public APIs + JS SDK foundation
- Sprint 21: CRM dashboard + embed code generator
- Sprint 22: AI chatbot widget (Claude + tool_use)
- Sprint 23: Analytics dashboard
- Sprint 24: Session recording + FullStory
- Sprint 25: Listings feed + advanced widgets

---

## ListingFlow Sites — AI Website Generation Platform

### Architecture

**Pre-built components + Claude Agent SDK + Cloudflare Pages**

```
listingflow-sites (Admin Panel) → listingflow-agent (Cloud Agent) → Cloudflare Pages (Static Sites)
                                         ↕
                                   Supabase (Data) + Claude API (Anthropic)
```

The platform generates unique realtor websites automatically:
1. Realtor clicks **"Generate My Website"** in the admin panel
2. **Cloud agent** autonomously searches for top realtor sites in the agent's market, scrapes 3-5 for design inspiration (hidden from user)
3. Agent generates **3 site config JSONs** — each a different style (dark luxury, light modern, bold warm) — by blending scraped design patterns with the realtor's content
4. **Pre-built React components** (`listingflow-sites/src/components/sections/`) render each config into static HTML
5. All 3 variants deploy to **Cloudflare Pages** as preview URLs
6. **Playwright** screenshots each variant at desktop + mobile
7. Realtor sees **3 preview cards** with screenshots — picks their favorite
8. Selected variant promoted to **production** → live URL

### Section Components (9 sections, theme-driven)

Same components render all 3 style variants — the difference is the theme config (colors, fonts), not different code.

| Section | Description |
|---------|-------------|
| Nav | Transparent over hero, sticky on scroll, logo + links |
| Hero | Full-screen image with dark overlay + headline |
| About | Two-column: headshot left, bio + credentials right |
| Stats | 3-column metrics (homes sold, volume, experience) |
| Testimonials | Quote cards with client name + role |
| Listings | Property card grid (photo, address, price, beds/baths) |
| CTA | Full-width banner with button |
| Contact | Simple form: name, email, phone, message |
| Footer | Multi-column: contact info, nav links, areas served |

### 3 Style Presets

| Style | Vibe | Example |
|-------|------|---------|
| Dark Luxury | mikemarfori.com inspired | Black bg, gold accent, Playfair Display |
| Light Modern | Clean, airy | White bg, navy accent, DM Sans |
| Bold & Warm | Energetic, approachable | Cream bg, terracotta accent, Bricolage Grotesque |

### Agent Service

- **Location:** `listingflow-agent/` (separate package in monorepo root)
- **Stack:** Node.js + Express + Anthropic SDK + Playwright
- **API:**
  - `POST /api/generate` — start generation (kicks off autonomous agent)
  - `GET /api/generations/:id` — poll status + get variants with screenshots
  - `POST /api/variants/:id/approve` — promote variant to production
- **Deployment:** Railway or Fly.io (Dockerized)
- **Agent tools:** search (web), scrape (reference sites), crm-data (Supabase), config (Claude generates 3 JSONs), render (ReactDOMServer → HTML), deploy (Cloudflare API), screenshot (Playwright)

### Database Tables (Sites)

| Table | Purpose |
|-------|---------|
| `realtor_sites` | Agent profile, branding, contact info |
| `site_generations` | Generation runs (status, reference scrapes) |
| `site_variants` | 3 variants per generation (config, preview URL, screenshots) |
| `site_pages` | Custom pages |
| `testimonials` | Client testimonials |
| `site_leads` | Contact form submissions |
| `site_media` | Uploaded photos/videos |

### Site Config JSON

Agent generates 3 of these (one per style):
```json
{
  "theme": {
    "colors": { "bg": "#000", "text": "#fff", "accent": "#c9a96e", "muted": "#acacac" },
    "fonts": { "heading": "Playfair Display", "body": "Inter" }
  },
  "nav": { "logo_url": "...", "links": ["About", "Listings", "Contact"] },
  "hero": { "images": ["url1"], "headline": "...", "subheadline": "..." },
  "about": { "headshot_url": "...", "name": "...", "bio": "...", "credentials": ["..."] },
  "stats": { "items": [{ "number": "500+", "label": "Homes Sold" }] },
  "testimonials": { "items": [{ "quote": "...", "name": "...", "role": "Seller" }] },
  "listings": { "items": [{ "photo": "...", "address": "...", "price": "$899,000", "beds": 3, "baths": 2 }] },
  "cta": { "headline": "...", "button_text": "Contact Me", "button_link": "#contact" },
  "contact": { "lead_endpoint": "https://..." },
  "footer": { "phone": "...", "email": "...", "address": "...", "areas": ["Vancouver", "Surrey"] }
}
```

### Environment Variables (Sites)

```
CLOUDFLARE_API_TOKEN=          # Pages API access
CLOUDFLARE_ACCOUNT_ID=         # Account ID
AGENT_SERVICE_URL=             # URL of deployed agent service (e.g. https://lf-agent.fly.dev)
ANTHROPIC_API_KEY=             # For agent service
```
