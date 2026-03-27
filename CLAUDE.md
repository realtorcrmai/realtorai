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

### Testing — Use `/test`

**After every build or deploy, run `/test` to validate the application.** The test skill at `.claude/skills/test.md` runs 10 phases: build verification, server health, auth, API endpoints, page loads, email engine, Supabase connection, UX scroll, contact form, and newsletter journeys. Do NOT deploy without a passing test run.

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
| `contacts` | Buyers and sellers | name, phone, email, type, pref_channel, notes |
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

### New Feature Deliverables (Mandatory)

Every new feature MUST include all of the following before it is considered complete:

1. **Skill file** — If the feature introduces a new user-invocable workflow, create a `.claude/skills/<name>.md` describing how to use/test it
2. **Use cases** — Add user stories / use case descriptions to `docs/user-journeys.md` or the relevant spec file
3. **Test scenarios** — Write comprehensive tests (see TESTING checklist below) covering:
   - Happy path for every new function/endpoint/page
   - Edge cases: empty inputs, nulls, boundaries, duplicates, invalid state transitions
   - Error conditions: network failure, missing data, auth failures
   - Data integration: FK integrity, cascade effects, cross-table consistency
4. **Navigation test** — Add new page routes to `scripts/test-suite.sh` navigation section
5. **Seed data** — If the feature introduces a new table, add representative seed data to the seed migration
6. **Documentation** — Update CLAUDE.md sections (Project Structure, Database Schema) if new files/tables added

---

## Agent Playbook — Task Execution Framework

> **Before executing ANY developer request:** classify → load checklist → execute → validate.

### Step 0: Pre-Flight (Every Session)

- Run `bash scripts/health-check.sh` (see `feedback_auto_health_check.md`)
- Confirm branch is `dev` (never work on `main`)
- Pull latest: `git pull origin dev`
- Read MEMORY.md for recent behavioral rules

If pre-flight fails: **fix the environment first**. Do NOT start the requested task with a broken build, wrong branch, or stale code.

### Step 1: Task Classification

**Output this explicitly before any work:**

```
Task: CODING:feature
Confidence: high
Reasoning: User wants to add a contact field — feature addition
Affected: contacts table, ContactForm.tsx, contacts.ts action, database.ts types
```

| Type | Subtypes | When |
|------|----------|------|
| `CODING` | feature, bugfix, refactor, script | Writing or modifying code |
| `TESTING` | unit, integration, e2e, eval | Creating/running tests, analyzing failures |
| `DEBUGGING` | error, performance, data_issue | Finding and fixing defects |
| `DESIGN_SPEC` | architecture, feature_spec, api_design, migration_plan | Design docs, specs, plans BEFORE coding |
| `RAG_KB` | pipeline, tuning, evaluation, content | RAG indexing, retrieval tuning, evaluation |
| `ORCHESTRATION` | workflow, trigger, pipeline, agent_config | AI agent workflows, trigger rules, pipeline stages |
| `INTEGRATION` | api_connect, webhook, auth, data_sync | External APIs, webhooks, third-party services |
| `DOCS` | spec, guide, runbook, changelog | Documentation |
| `EVAL` | metrics, golden_set, ab_test, quality_gate | Evaluations, test sets, scoring |
| `INFO_QA` | explain, compare, recommend | Answering questions — no code changes |

**Rules:**
- Multiple types → pick primary, note secondaries, execute in order (finish one before starting next)
- Low confidence → ask ONE clarifying question (don't guess)
- Error/stack trace mentioned → classify as `DEBUGGING` first (not CODING:bugfix)
- "Plan" or "design" before "build" → classify as `DESIGN_SPEC` first
- "Refactor" → `CODING:refactor` (NOT feature)

### Step 2: Per-Task Checklists

#### CODING:feature

**Phase 1 — Scope & Impact** (before writing ANY code):
- List every file to create or modify
- List every DB table affected (schema change? migration needed? next migration number?)
- List every API route and UI component affected
- Check integration points (Twilio, Resend, Google Calendar, Anthropic, Voyage?)
- Search codebase for overlap with existing features
- Check: new env vars needed? CLAUDE.md updates needed?
- Check: could this break existing tests? Other devs' in-progress work?

**Phase 2 — Context Loading:**
- Read ONLY affected files (not entire repo)
- Read relevant types in `src/types/database.ts`
- Read relevant migrations if touching schema
- Summarize current behavior in 3-5 bullets BEFORE modifying

**Phase 3 — Plan:**
- Entry points → data flow → new types/functions → error handling
- If complex (5+ files or schema change): present plan to developer BEFORE coding
- Specify model chain: which tier handles what

**Phase 4 — Implement** (follow Coding Conventions above + data integrity rules from memory):
- One file at a time — not giant multi-file diffs
- Validate at ALL boundaries; use DB constraints; transactions for multi-table ops
- Verify FK references exist; include rollback on partial failure
- Parent status NEVER "complete" if any child is incomplete

**Phase 5 — Self-Check** (before presenting to developer):
- Re-read every modified file line by line
- Check: unused variables, unhandled branches, type mismatches, missing error handling
- Check: empty inputs, null values, boundary values, concurrent operations
- Run `npx vitest run` — tests must pass

**Phase 6 — Output:**
- Summarize files changed + behavior added
- Note breaking changes, new env vars, new migrations
- Report test results (X passing out of Y)

#### CODING:bugfix

Same as feature, plus:
- Before Phase 4: reproduce the bug, write a FAILING test that captures it
- After Phase 4: verify the test now PASSES
- Minimal fix only — do NOT refactor surrounding code

#### CODING:refactor

- State explicitly: "This changes structure, NOT behavior"
- Existing tests must pass WITHOUT modification
- If tests need changes, explain each one

#### TESTING

**Phase 1 — Level:** unit / integration / e2e / eval

**Phase 2 — Scenario Coverage** (cover ALL of these for every function):

| Category | Examples |
|----------|---------|
| Happy path | Normal valid inputs → expected output |
| Empty/null | Missing fields, null, undefined, empty string |
| Boundary values | Min, max, at limit, one above/below |
| Invalid types | Wrong type, string where number expected |
| Special characters | Unicode, emoji, HTML entities, SQL injection, XSS |
| Duplicates | Same record twice, double-submit |
| Concurrent access | Two updates to same record simultaneously |
| Error conditions | Network failure, DB error, API timeout |
| Permission/auth | No session, wrong role, expired token |
| Cascade effects | Delete parent → what happens to children? |
| Data integrity | Orphaned records, FK violations, circular refs |
| State transitions | Invalid transitions, skipping steps, going backwards |
| Large data | Many records, long strings, large JSONB |
| Time-dependent | Timezone, date boundaries, expired data |

**Phase 3 — Implement:** vitest, test files in `app/src/` mirror, deterministic + isolated, descriptive names

**Phase 4 — Analyze failures:** categorize (environment / flaky / bug / wrong assertion) → fix root cause

**Phase 5 — Report:** X/Y passing, gaps identified, recommendations

#### DEBUGGING

**Phase 1 — Problem:** Restate symptom. Read stack trace completely. When/scope/environment?

**Phase 2 — Reproduce:** Minimal steps. Trace call path. Check: data issue? env issue? timing?

**Phase 3 — Hypotheses:** 2-4 causes ordered by likelihood. For each: what confirms, what eliminates. Check most likely first.

| Category | How to Check |
|----------|-------------|
| Data issue | Query DB directly, check specific record |
| Code logic | Read code path line by line |
| Type mismatch | Check TS types vs runtime values |
| Environment | Check .env.local, test connection |
| Race condition | Add timestamps/logging |
| External service | Test call in isolation |
| Migration gap | Compare migration vs actual schema |

**Phase 4 — Fix:** MINIMAL change. Explain root cause → fix mapping. No surrounding refactors.

**Phase 5 — Prevent:** Write test that catches this bug. Grep for similar patterns elsewhere.

#### DESIGN_SPEC

1. **Problem:** Goals, non-goals, constraints, success metrics
2. **Current state:** Audit existing code/schema. What can we reuse? What's broken?
3. **Options:** At least 2 approaches with pros/cons/risks/complexity
4. **Design:** Data model, APIs, components, data flow, error handling, security
5. **Ops:** Deployment, monitoring, failure modes, cost estimates
6. **Plan:** Phased delivery, file-level detail, test plan, dependencies

#### RAG_KB

1. **Use case:** Question types, data sources, privacy, freshness, accuracy bar
2. **Content:** Chunking strategy (per `src/lib/rag/chunker.ts`), metadata, volume estimate
3. **Retrieval:** Semantic vs hybrid, top_k, threshold, content_type filters
4. **Prompting:** System prompt structure, grounding rules, guardrails, fallback
5. **Eval:** 20+ test queries, relevance criteria, precision/recall, latency
6. **Iterate:** Low precision → tighten filters. Low recall → broaden sources. Hallucinations → strengthen grounding.

#### ORCHESTRATION

1. **Type:** Sequential / event-driven / state machine / supervisor — map to existing: trigger-engine, workflow-engine, contact-evaluator, trust-gate
2. **States:** All states + transitions + triggers + guards + dead-state handling
3. **Errors:** Timeouts, retries, human-in-the-loop, graceful degradation, circuit breaker
4. **Observability:** Log to agent_decisions, track latency, define alerts

#### INTEGRATION

1. **API:** Read docs fully. Endpoints, auth, rate limits, quotas. Sandbox available?
2. **Contracts:** Request/response schemas. Map to internal models. Handle missing/extra/mistyped fields.
3. **Errors:** Timeouts, retry with backoff, rate limit (429 + Retry-After), idempotency
4. **Security:** Keys in .env.local + vault.sh. Never log secrets. Validate webhook signatures.
5. **Tests:** Happy path, auth failure, rate limit, timeout, malformed response, webhook signature

#### DOCS

1. Audience + purpose → 2. Outline first → 3. Draft with real paths/tables → 4. Verify all references → 5. Consistent terminology with CLAUDE.md

#### EVAL

1. Define metrics → 2. Create 20+ test cases → 3. Scoring method → 4. Run + analyze → 5. Recommend ship/iterate/redesign

#### INFO_QA

1. Restate question → 2. Research codebase + CLAUDE.md + memory + git → 3. Answer with file:line citations → 4. Examples → 5. State limitations

### Step 3: Post-Task Validation

| Condition | Action |
|-----------|--------|
| Code changed | `npx vitest run` — all tests must pass |
| 5+ files changed | `bash scripts/test-suite.sh` — full 73-test suite |
| Schema changed | Verify migration: correct number, constraints, RLS |
| New env var | Document in CLAUDE.md, NEVER commit value |
| Any task done | Update todo list, mark completed |

### Model Chaining

| Phase | Model | Why |
|-------|-------|-----|
| Classification | Haiku (internal) | Fast routing |
| File search, exploration | Haiku agents | Quick parallel lookup |
| Code implementation | Sonnet agents | Speed + quality balance |
| Architecture, complex analysis | Opus (main) | Deep reasoning |
| Test writing | Sonnet agents | Accurate but straightforward |
| Code review, self-check | Opus (main) | Catches subtle bugs |

### Ask vs Act

**Act immediately:** Clear request, localized change, tests exist, standard patterns, reads/searches/git ops, running tests/builds.

**Ask first:** Ambiguous request, shared state change (schema, API, env vars), could break others' work, low confidence, destructive ops, 10+ files, trade-off with no clear winner.

---

## AI Email Marketing Engine

### How It Works (Simple)

```
Contact added → AI writes email → Realtor approves → Email sent → Track engagement → Repeat
```

### Email Flow (All Paths)

Every email in the system goes through the same process:

```
1. SOURCE generates content (auto-enroll, workflow cron, AI agent, manual blast)
2. TEXT PIPELINE (src/lib/text-pipeline.ts)
   → Personalization, voice rules, compliance check, subject dedup, length check
3. HTML RENDER (src/lib/email-blocks.ts)
   → Pick blocks based on email type → assemble Apple-quality HTML
4. QUALITY SCORE (src/lib/quality-pipeline.ts)
   → Claude Haiku rates 7 dimensions (1-10) → block if <4, regenerate if <6
5. SAVE as draft in newsletters table → appears in AI Agent approval queue
6. REALTOR approves → sendNewsletter() → validated send via Resend
7. TRACK → Resend webhooks → update contact intelligence → adapt next email
```

### Email Block System (src/lib/email-blocks.ts)

Modular blocks assembled per email type. Apple-quality design: SF Pro font, 20px radius, pill CTAs, dark mode.

| Block | Purpose |
|-------|---------|
| `heroImage` | Full-width photo with overlay text |
| `heroGradient` | Gradient background for non-listing emails |
| `priceBar` | Price + beds/baths/sqft specs |
| `personalNote` | AI-written personalized text |
| `featureList` | Icon + title + description rows |
| `photoGallery` | 2x2 image grid |
| `statsRow` | Market stats with trend arrows |
| `recentSales` | Sold properties table |
| `priceComparison` | This listing vs area average |
| `openHouse` | Event card with date/time |
| `cta` | Pill-shaped call-to-action button |
| `agentCard` | Realtor photo + name + phone |
| `footer` | Unsubscribe + physical address (CASL) |

Usage: `assembleEmail("listing_alert", { contact, agent, content, listing, market })`

### Cron Jobs (Automated via Vercel Cron — vercel.json)

| Cron | Schedule | What It Does |
|------|----------|-------------|
| `/api/cron/process-workflows` | Daily 9 AM | Check journeys + workflows → generate email drafts → AI Agent queue |
| `/api/cron/daily-digest` | Daily 8 AM | Email realtor: overnight summary, hot buyers, pending drafts |
| `/api/cron/consent-expiry` | Weekly Mon 6 AM | Check CASL consent expiring → queue re-confirmation |

All crons require `Authorization: Bearer CRON_SECRET` header.

### Email Marketing UI (Single Page — /newsletters)

7 tabs on one page:

| Tab | Purpose |
|-----|---------|
| Overview | Stat pills, hot buyers/sellers, pipeline, AI activity |
| AI Agent | Approval queue + sent emails with engagement + held back |
| Campaigns | Listing blast automation + custom campaigns + blast history |
| Relationships | Health snapshot, pipeline drilldown, activity velocity |
| Journeys | Contact journey list with search/filter/expand |
| Analytics | Open/click rates, brand score, AI insights, email log |
| Settings | Master switch, frequency cap, quiet hours, compliance |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/email-blocks.ts` | Modular email block builder (Apple-quality) |
| `src/lib/text-pipeline.ts` | Pre-send text processing (personalize, voice, compliance) |
| `src/lib/quality-pipeline.ts` | 7-dimension quality scoring via Claude Haiku |
| `src/lib/validated-send.ts` | Full validation wrapper around Resend send |
| `src/lib/send-governor.ts` | Frequency caps, engagement throttle, auto-sunset |
| `src/lib/newsletter-ai.ts` | Claude content generation with reasoning |
| `src/lib/workflow-engine.ts` | Workflow step executor (sends via blocks + Resend) |
| `src/actions/newsletters.ts` | Newsletter CRUD, send, approve, bulk, skip |
| `src/actions/journeys.ts` | Journey enrollment, phase advancement |
| `src/lib/validators/*.ts` | 4 validators: content, design, compliance-gate, quality-scorer |
| `src/lib/voice-learning.ts` | Extract writing rules from realtor edits |
| `src/lib/learning-engine.ts` | Weekly learning cycle — analyze outcomes, adjust config |
| `src/app/api/webhooks/resend/route.ts` | Click/open/bounce tracking (12 click categories) |
| `src/app/api/templates/preview/route.ts` | Apple-quality template previews (3 designs) |
| `src/app/api/listings/blast/route.ts` | Listing blast batch send to agents |
| `src/app/api/cron/daily-digest/route.ts` | Morning digest email to realtor |
| `src/app/api/cron/consent-expiry/route.ts` | CASL consent expiry checker |
| `src/components/newsletters/*.tsx` | All 7 tab components + PipelineCard |
| `scripts/seed-demo.mjs` | Demo seed data (29 contacts, 84 emails, 129 events) |

### Seed Data

Single source of truth: `scripts/seed-demo.mjs`. Run: `node scripts/seed-demo.mjs`

All demo contacts use phone prefix `+1604555` for easy cleanup. Idempotent — safe to run multiple times.

### Production Deployment

```bash
# 1. Deploy to Vercel (includes cron jobs from vercel.json)
cd realestate-crm && vercel --prod

# 2. Set env vars in Vercel dashboard (from vault)
./scripts/vault.sh status  # see all keys

# 3. Configure Resend webhook in Resend dashboard
# URL: https://your-app.vercel.app/api/webhooks/resend
# Events: email.opened, email.clicked, email.bounced, email.delivered
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `newsletters` | Email drafts, sent, suppressed — with quality_score + ai_context |
| `newsletter_events` | Open/click/bounce with link_type classification |
| `contact_journeys` | Journey enrollment, phase, trust_level, next_email_at |
| `contacts.newsletter_intelligence` | Per-contact engagement score, click history, interests |
| `realtor_agent_config` | Voice rules, frequency caps, brand config |
| `competitive_insights` | RAG-generated insights (future) |

### Specs & Plans

| Document | Location |
|----------|----------|
| Master Implementation Plan | `docs/MASTER_IMPLEMENTATION_PLAN.md` |
| Prospect 360 Spec | `docs/SPEC_Prospect_360.md` |
| Content Intelligence Spec | `docs/SPEC_Email_Content_Intelligence.md` |
| Validation Pipeline Spec | `docs/SPEC_Validation_Pipeline.md` |
| Competitive RAG Plan | `docs/PLAN_Competitive_RAG.md` |
| User Journey Maps | `docs/user-journeys.md` |
| Pending Work | `/Users/bigbear/reality crm/pendingwork.md` |

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
