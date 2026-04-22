<!-- docs-audit-reviewed: 2026-04-21 --task-mgmt -->
# CLAUDE.md — Realtors360 Real Estate CRM

## Think Thoroughly — Depth Over Speed

**Never prioritize speed over depth.** Read the full request twice before responding. Consider 2-3 alternative approaches before picking one. Analyze trade-offs and downsides of each option. Present the best option with reasoning — not the first one that comes to mind. Re-read your own output before presenting. If the problem is complex, take the time — don't simplify to be fast. The user would rather wait for a thorough, well-analyzed answer than get a fast shallow one.

---

## Agent Playbook — MANDATORY (Read Before Every Task)

**All task execution MUST follow `.claude/agent-playbook.md` — the single source of truth.**

**STRICT REQUIREMENT:** Every task, every developer (human and AI), every time:
1. **Pre-Flight** — check branch, run health check, load memory
2. **Classify** — output classification block (task type, confidence, affected files) BEFORE any code changes
3. **Execute** — follow the per-type checklist for your task type (14 types: CODING, TESTING, DEPLOY, etc.)
4. **Validate** — run tests, verify build, check TypeScript
5. **Log** — append compliance log entry to `.claude/compliance-log.md`

**A task without a classification block is an unauthorized change. A task without a compliance log entry did not happen.**

Read the playbook before every task. It covers: pre-flight, task classification, per-type checklists (14 task types), model chaining, post-task validation, compliance logging, and production incident protocol.

---

## New Developer? Start Here

**`CONTRIBUTING.md`** — complete local setup guide (prerequisites, install, env vars, start server, project structure, git workflow, testing, common tasks). Also configures VS Code via `.vscode/` (launch configs, extensions, settings).

---

## Environments — READ BEFORE TOUCHING THE DATABASE

**Full reference:** `docs/ENVIRONMENTS.md` — always read this before running migrations, changing env vars, or deploying.

**Quick summary as of 2026-04-10:**

| Service | Platform | Status | Auto-deploy |
|---------|----------|--------|-------------|
| **CRM (Next.js)** | Vercel Preview | Live | Push to `dev` |
| **Newsletter Agent** | **Render ($7/mo)** | **Live — all flags ON** | Push to `dev` (root: `realtors360-newsletter`) |
| **Database** | Supabase `qcohfohjihazivkforsj` | Live | — |

**Critical rules:**
- **Two live services deploy from `dev`.** CRM → Vercel, Newsletter → Render. Both share the same Supabase DB.
- **Newsletter Agent is LIVE on Render** with 19 tools, 12 crons, all 7 feature flags ON. Env vars are in the Render dashboard (not Vercel).
- **`FLAG_PROCESS_WORKFLOWS=on` on Render** means the CRM's Vercel cron for process-workflows should be DISABLED to avoid double-processing.
- **One Supabase project: `qcohfohjihazivkforsj`.** Two orphaned projects (`ybgiljuclpsuhbmdhust`, `rsfjescdjuubxadfjyxb`) pending deletion — do not reference them.
- **`main` branch is reserved** for future production. `dev` is the only active branch.
- **CRM env vars** → Vercel dashboard. **Newsletter env vars** → Render dashboard. Don't mix them up.
- **Never push directly to `dev` or `main`** — always via PR.
- **Migrations:** paste SQL into https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new. Latest: 097.

**Full details, migration file catalogue, orphan table notes, deploy flow diagram, and follow-up items — all in `docs/ENVIRONMENTS.md`.**

---

## Project Overview

Realtors360 is a real estate transaction management CRM for licensed BC realtors. It automates the full property listing lifecycle — from seller intake through closing — with integrated showing management, BCREA form generation, AI content creation, and regulatory compliance tracking.

**Live URL:** localhost:3000 (dev)
**Repo root:** Current working directory (auto-detected by Claude Code via `$CLAUDE_PROJECT_DIR`)
**App files:** `src/`, `package.json`, `next.config.ts` are at repo root (flat monorepo — no nested `realestate-crm/` subdirectory)

### Git Workflow — Feature Branch Model

```
feature branch → PR → dev (integration) → PR → main (production)
```

- **Feature branches** — `<developer>/<description>` (e.g. `rahul/voice-tts`, `claude/playbook-fix`)
- **`dev`** — integration branch, protected (PR required, 0 approvals — merge your own)
- **`main`** — production, protected (PR required, 1 approval)
- **Never push directly to `dev` or `main`** — always use PRs
- Branch from `dev`, create PR back to `dev`, merge, delete feature branch
- To release: create PR from `dev → main`, get 1 approval, merge

### Deployment — Use `/deploy`

**Run `/deploy` to build and start all services locally.** The deploy skill at `.claude/skills/deploy.md` handles: pull latest, install deps, run migrations, build, start servers, and validate.

| Service | Port | Command |
|---------|------|---------|
| CRM (Next.js) | 3000 | `npm run dev` from repo root |
| Website Agent | 8768 | `npm run dev` from `realtors360-agent/` |
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

**After every build or deploy, run `/test` to validate the application.** The test skill at `.claude/skills/test.md` runs 7 categories: Navigation (35 routes), API Auth, CRUD (7 entities), Data Integrity (7 constraints), Cron Auth (4 tests), Cascade Delete, Sample Data Validation — 73+ tests total. Do NOT deploy without a passing test run.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL + RLS) | latest |
| Auth | NextAuth v5 (beta.30) | JWT sessions |
| Styling | Tailwind CSS v4 + custom Realtors360 design system | 4.x |
| UI Components | shadcn/ui v4 + custom LF components | 4.x |
| State | Zustand + TanStack React Query v5 | 5.x |
| Forms | React Hook Form + Zod v4 | 7.x / 4.x |
| SMS/WhatsApp | Twilio | 5.x |
| Calendar | Google Calendar API (googleapis) | 171.x |
| AI | Anthropic Claude SDK | 0.78.x |
| Video/Image | Kling AI API | custom |
| Form Engine | Realtors360 Python server | localhost:8767 |

---

## Project Structure

```
/  (repo root)
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
│   │   │   ├── onboarding/nps/    # NPS survey submission endpoint
│   │   │   ├── tasks/             # Task CRUD, bulk, export, templates, saved-filters
│   │   │   ├── tasks/[id]/        # Single task detail, duplicate
│   │   │   ├── tasks/[id]/activity/ # Task activity log
│   │   │   ├── tasks/[id]/subtasks/ # Subtask CRUD
│   │   │   ├── team-members/      # Team member listing
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
│   │   ├── segments.ts            # Contact segment builder + bulk enroll
│   │   ├── notifications.ts      # Notification CRUD, mark read, dismiss
│   │   └── team.ts               # Team CRUD, invites (accept/decline), memberships
│   ├── emails/                    # React Email templates
│   │   ├── BaseLayout.tsx         # Shared wrapper (branding, dark mode, unsubscribe)
│   │   ├── NewListingAlert.tsx    # Property listing cards
│   │   ├── MarketUpdate.tsx       # Stats + recent sales
│   │   ├── JustSold.tsx           # Sale celebration
│   │   ├── OpenHouseInvite.tsx    # Event invitation
│   │   ├── NeighbourhoodGuide.tsx # Area lifestyle content
│   │   ├── HomeAnniversary.tsx    # Annual homeowner milestone
│   │   └── WelcomeDripHTML.ts     # 7-email branded welcome drip sequence
│   ├── stores/                    # Zustand stores (recent-items.ts)
│   ├── components/
│   │   ├── contacts/              # ContactsTableClient, ContactPreviewSheet, ContactCard, ContactForm, CommunicationTimeline, SegmentBuilder
│   │   ├── content/               # ContentStepper, PromptsStep, GenerateStep, GalleryStep
│   │   ├── listings/              # ListingsTableClient, ListingCard, ListingForm, DocumentStatusTracker, etc.
│   │   ├── showings/              # ShowingsTableClient, ShowingRequestForm, StatusBadge, StatusActions, Communication
│   │   ├── newsletters/           # ApprovalQueueClient, NewsletterWalkthrough
│   │   ├── dashboard/             # PipelineSnapshot, AIRecommendations, RemindersWidget, ActivityFeed, TodaysPriorities, DashboardPipelineWidget
│   │   ├── help/                  # OnboardingNPS.tsx (NPS survey after checklist)
│   │   ├── shared/                # TrackRecentView.tsx (recent items bridge)
│   │   ├── email-builder/         # EmailEditorClient (template editor)
│   │   ├── workflow-builder/      # WorkflowCanvas, WorkflowEditorClient (React Flow)
│   │   ├── workflow/              # WorkflowStepper, PhaseCard, Phase1-8 components
│   │   ├── brand/                 # Logo components (LogoIcon, LogoIconDark, LogoAnimated, LogoMark, LogoSpinner)
│   │   ├── layout/                # MondaySidebar, MondayHeader, MobileNav, DashboardShellClient, CommandPalette, NotificationDropdown, PageHeader
│   │   └── ui/                    # shadcn primitives (includes enhanced data-table.tsx)
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
│   │   ├── fuzzy-match.ts         # Jaro-Winkler string matching
│   │   └── notifications.ts      # Notification helper (create, query, speed-to-lead trigger)
│   └── types/
│       ├── database.ts            # Supabase table types
│       └── index.ts               # Exported type aliases
├── supabase/migrations/
│   └── 56+ migration files (001 through 056)
├── scripts/
│   └── qa-test-email-engine.mjs   # Automated QA test runner (27 tests)
└── package.json
```

---

## Design System — Realtors360

The UI uses a HubSpot-inspired design language: clean, flat, professional. No glassmorphism or gradients. Custom styles are defined as CSS custom properties in `globals.css`. Legacy `lf-*` variables remain in the CSS but are deprecated — use the new palette.

### Key Variables
```css
--primary: #2D3E50          /* Navy — sidebar, headings */
--brand: #FF7A59            /* Coral — CTAs, active indicators */
--background: #F5F8FA       /* Light grey page background */
--sidebar: #2D3E50          /* Navy sidebar background */
--sidebar-primary: #FF7A59  /* Coral active indicator in sidebar */
--success: #00BDA5          /* Teal — success states */
--destructive: #D94F57      /* Red — errors, delete actions */
--card: #FFFFFF             /* White card background */
--border: #E5E7EB           /* Light grey borders */
```

### Component Classes
- `PageHeader` component — used on every page for breadcrumbs, tabs, and action buttons
- `DataTable` component — used for all list views (contacts, listings, showings, etc.)
- `bg-card border-border rounded-lg` — standard card styling (no glass, no blur)
- `bg-brand text-white` — primary CTA buttons
- Button variant `brand` — coral CTA buttons via shadcn Button
- Badge variants: `success`, `warning`, `info` — semantic status indicators
- Legacy `.lf-card`, `.lf-glass`, `.lf-btn` classes are **deprecated** — do not use in new code

### Layout
- Navy sidebar: 240px wide (`w-60`), `bg-sidebar`, fixed left
- Top header: 56px (`h-14`), `bg-card border-b border-border`
- Content area: `flex-1 overflow-y-auto bg-background`
- Mobile: bottom navigation bar with coral active states
- No animated gradient background — flat `bg-background` everywhere
- No horizontal pill navigation — sidebar handles all navigation

### Logo & Branding
**Brand name:** Realtors360 (not "RealtorAI" — legacy name fully replaced as of 2026-04-11)
**Brand colors:** Gold gradients `#F0D890` → `#E4C378` → `#D4B060` (logo), Navy `#2D3E50`, Coral `#FF7A59` (CTAs)
**Logo assets:** `/logo/` at monorepo root — two animated HTML files + static SVGs:
- `logo-animated.html` — Full 3D logo (420px native): floating navy shield with gradient shift, revolving glare ring, dual orbit rings (outer CW 5s / inner CCW 8s with comet trails), roofline breathing glow, peak sparkle, door light flicker, 60-star field, parallax particles, mouse tilt 3D, reflection + floor glow
- `logo-sidebar.html` — Lightweight sidebar logo (120px native): no shield, transparent bg, dual orbit rings (GPU-accelerated, linear timing), roofline glow, peak sparkle, door light flicker. 60fps optimized (pure transform/opacity, no filter animations)
- `favicon.svg` — Minimal: navy circle + gold roofline only
- `logo-icon.svg`, `logo-realtors360.svg`, `logo-realtors360-dark.svg` — Static SVGs
- `logo-v2-concept-a/b/c.svg`, `logo-concepts-full.png` — Concept variants

**React components:** `src/components/brand/Logo.tsx` — 6 exports:
- `LogoIcon` — light bg (navy roofline + gold arc)
- `LogoIconDark` — dark bg (all gold — sidebar)
- `LogoMark` — icon + "Realtors360" text
- `LogoVideo` — live animated logo via iframe; auto-picks source: ≤100px → `logo-sidebar.html`, >100px → `logo-animated.html`
- `LogoAnimated` — pure CSS 3D animated logo (React component, not iframe)
- `LogoSpinner` — loading indicator (gold spinning arc, replaces Loader2)

**Where used:**
- Sidebar: `LogoVideo size={72}` in 140px brand section (MondaySidebar.tsx). Section-specific drop-shadow color changes per active page (`SECTION_COLORS` map). Notification pulse via `logo-pulse` keyframe (globals.css) when unread notifications exist (polls `/api/notifications`).
- Login: `LogoVideo size={380}` on dark `#0a1628` background (login/page.tsx)
- Mobile login: `LogoIcon size={36}` + "Realtors360" text
- Favicon: `/public/favicon.svg` (layout.tsx metadata)
- Loading spinner: `LogoSpinner` (LoadingSpinner.tsx)

### Conventions
- Every page uses the `PageHeader` component (breadcrumbs, tabs, actions)
- List views use the `DataTable` component with sorting, filtering, pagination
- No gradients, no glass effects, no backdrop-blur in new code
- Sidebar navigation organized in 3 groups: Main, Tools, Admin
- Lucide icons in sidebar navigation; emoji icons on page content
- Status colors: green (`--success`) = confirmed/done, amber = pending, red (`--destructive`) = denied/blocked

---

## UX Features (Competitive)

12 competitive UX features built across 4 sprints + 3 rounds of code review fixes (19 bugs). Plan doc: `functional-specs/PLAN_UX_Competitive_Features.md`. Test plan: `docs/TEST_PLAN_UI_UX_Features.md` (122 test cases, 22 categories). 26/26 Playwright integration tests passing. WCAG AA compliant (18/18 color contrast pairs).

### Cmd+K Command Palette
- `src/components/layout/CommandPalette.tsx` — global search overlay triggered by Cmd+K (Mac) / Ctrl+K (Win)
- Debounced search with memoized results, contacts + listings API search support (`?search=`, `?limit=` with parseInt NaN guard and quote sanitization)
- Keyboard navigation (arrow keys + Enter), fuzzy matching
- Integrated into `MondayHeader.tsx`

### DataTable (Enhanced)
- `src/components/ui/data-table.tsx` — generic table used on all list views
- Props: `columns`, `data`, `searchKey`, `onRowClick`, `pagination` (original)
- Added: `rowActions` (per-row action menu), `bulkActions` (multi-select toolbar), `ariaLabel` (accessibility)
- Bulk actions support: email, delete, tag, export on selected rows

### PageHeader
- `src/components/layout/PageHeader.tsx` — used on every dashboard page
- Props: title, subtitle, breadcrumbs, tabs, actions

### Notification Center
- `src/components/layout/NotificationDropdown.tsx` — bell icon + unread count badge in MondayHeader
- 30-second polling for new notifications
- `src/actions/notifications.ts` — server actions (CRUD, mark read, dismiss)
- `src/lib/notifications.ts` — notification helper (create, query, speed-to-lead auto-alert on new contact within 5 min)

### Recent Items
- `src/stores/recent-items.ts` — Zustand store tracking recently viewed contacts/listings
- `src/components/shared/TrackRecentView.tsx` — bridge component placed on detail pages to record views
- Recent items surfaced in CommandPalette and sidebar

### Contact Preview
- `src/components/contacts/ContactPreviewSheet.tsx` — slide-over panel with contact details + recent communications
- Triggered from DataTable rows without full page navigation

### Dashboard Widgets
- `src/components/dashboard/ActivityFeed.tsx` — recent communications, showing updates, new contacts
- `src/components/dashboard/TodaysPriorities.tsx` — overdue tasks, today's showings, hot leads
- `src/components/dashboard/DashboardPipelineWidget.tsx` — mini listing pipeline grouped by status
- All three rendered on `src/app/(dashboard)/page.tsx`

### Lead Score Badges
- Color-coded lead score display in `ContactsTableClient.tsx`
- Reads from `contacts.newsletter_intelligence.engagement_score`
- Green (80+), amber (50-79), red (<50)

### Post-Showing Feedback
- SMS feedback request sent after "completed" status transition via Twilio
- Implemented in `src/actions/showings.ts`, logged to communications table

### Speed-to-Lead Alerts
- Auto-notification on new contact creation in `src/actions/contacts.ts`
- Triggers within 5 minutes via `src/lib/notifications.ts`

### Accessibility (WCAG AA)
- 18/18 color contrast pairs pass WCAG AA
- Skip-to-content link in `DashboardShellClient.tsx`
- aria-labels on all search inputs, tables, buttons, file uploads
- Focus rings (`ring-brand`) on DataTable rows
- Keyboard navigation: Tab + Enter on table rows, arrow keys in CommandPalette
- ARIA tab roles on PageHeader tab buttons (role="tab", aria-selected)

---

## Database Schema

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `contacts` | Buyers and sellers | name, phone, email, type, pref_channel, notes, casl_consent_given, casl_consent_date |
| `listings` | Property listings | address, seller_id, status (active/conditional/pending/sold/expired/withdrawn), list_price, property_type, mls_number |
| `users` | Authenticated users | email, name, role, plan (free/professional/studio/team/admin), enabled_features, is_active |
| `appointments` | Showings | listing_id, buyer_agent_*, start_time, status, google_event_id |
| `communications` | Unified message log | contact_id, direction, channel, body, related_id |
| `listing_documents` | Document tracking | listing_id, doc_type, file_name, file_url |
| `seller_identities` | FINTRAC compliance | listing_id, full_name, dob, citizenship, id_type/number/expiry |
| `listing_enrichment` | Property data enrichment | listing_id, geo, parcel, ltsa, assessment, strata, enrich_status (all JSONB) |
| `prompts` | AI-generated content prompts | listing_id, video_prompt, image_prompt |
| `media_assets` | Generated content files | listing_id, asset_type, status, output_url |
| `google_tokens` | Google Calendar tokens | user_email, access_token, refresh_token |
| `notifications` | In-app notifications | realtor_id, type, title, body, related_type, related_id, is_read |

### Multi-Tenancy & RLS

Realtors360 is **multi-tenant**. Every data table has a `realtor_id` column scoped to the authenticated user.

- **App-level isolation:** `getAuthenticatedTenantClient()` from `src/lib/supabase/tenant.ts` auto-injects `.eq("realtor_id", userId)` on all queries
- **DB-level defense:** RLS policies on 60+ tables enforce `realtor_id` scoping
- **Server actions:** MUST use tenant client, never raw `createAdminClient()` for user data
- **Global tables** (exempt from scoping): `google_tokens`, `newsletter_templates`, `workflow_blueprints`, `knowledge_articles`

---

## 8-Phase Listing Workflow

The CRM implements an 8-phase listing workflow (designed but not yet fully migrated to DB — `current_phase` column does not exist on `listings` table yet):

| Phase | Name | Key Features |
|-------|------|-------------|
| 1 | Seller Intake | FINTRAC identity collection, property details, commissions, showing instructions |
| 2 | Data Enrichment | BC Geocoder (API), ParcelMap BC (API), LTSA (manual), BC Assessment (manual) |
| 3 | CMA Analysis | Comparable market analysis fields |
| 4 | Pricing & Review | List price confirmation, price lock, marketing tier |
| 5 | Form Generation | 12 BCREA forms auto-filled via Python Realtors360 server |
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

### Realtors360 Python Server
- Endpoint: `REALTORS360_URL` (default: `http://127.0.0.1:8767`)
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

# Realtors360 Form Server
REALTORS360_URL=          # defaults to http://127.0.0.1:8767

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
# Start dev server (from repo root)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Start Realtors360 form server (separate terminal)
# python server at localhost:8767

# Run 102 notification migration
# Paste SQL from supabase/migrations/102_notifications.sql into Supabase SQL editor
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
git add -A && git commit && git push origin dev

# 5. Save known-good state after successful deploy
bash scripts/save-state.sh
```

**Test suite covers (73+ tests):**
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
  "name": "nextjs",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"],
  "port": 3000,
  "cwd": "<repo root>"
}
```

---

## Design Documents

Key documents in repo root: `Realtors360_Realtor_Workflow_Design_Document.docx` (12-phase lifecycle), `Realtors360_Gap_Analysis_Report.md` (current vs design), `PRD_Newsletter_Journey_Engine.md`, `PLAN_Email_Marketing_Engine.md`, `PLAN_AI_Agent.md`, `SPEC_AI_Agent_Email_Marketing.md`. Functional specs in `docs/functional-specs/`, user guide in `guides/`, 200 QA test cases in `evals.md`, 8 eval suites in `scripts/eval-*.mjs`.

**Gap analysis (March 2026):** ~40% coverage. Strong: Data Enrichment (90%), Forms (85%). Gaps: Offer Management (0%), Contract-to-Close (0%).

---

## Known Issues & Improvement Areas

- **Contacts:** Filter bar (type/stage/engagement) + bulk operations (stage change, CSV export, delete) now built. Buyer agents still flat text, no archiving (hard delete only). 200-item cap still in place (no server-side pagination).
- **Communications:** Gmail for 1:1 (plain text), Resend for newsletters, no threading. Timeline now has Load More (50 limit + pagination). Showing SMS uses seller pref_channel.
- **UI/UX (2026-04-12 audit):** Mobile collapsible sidebars on 3 detail pages. Responsive form grids. Loading skeletons for listings/showings. Newsletter queue Preview button. Dashboard newLeadsToday live. Remaining gaps: ListingWorkflow.tsx 1,138-line monolith, no server-side pagination.
- **Workflow:** DocuSign UI exists but API unconfirmed, no Paragon API (Phase 8 manual), Phases 9-12 missing, no offer management. First pending phase now auto-expands.
- **Accessibility (2026-04-12):** Muted foreground contrast fixed (#476380, 5.2:1). Workflow step aria-labels. ContactForm aria-describedby. Print styles added. Remaining: not all forms have a11y annotations.
- **Compliance:** FINTRAC sellers only (not buyers), no Receipt of Funds, no retention policy, CASL consent no expiry tracking
- **Onboarding:** Full system built -- 5-step wizard (/onboarding), 6-screen personalization (/personalize), sample data seeding (5 contacts + 3 listings + 2 showings + 1 newsletter with `is_sample` flag), post-onboarding confetti + welcome tour + checklist (5 items) + NPS survey, 7-email branded drip sequence, empty states on listings/contacts/showings pages, new agent dashboard guide for `new_agent` persona, `data-tour` attributes on sidebar nav for guided tours. Migration 103 required.

---

## Coding Conventions

- **Server Actions** over API routes for mutations (actions/ directory)
- **API routes** for GET endpoints and external webhooks
- **Zod v4** for all form/API validation
- **JSONB columns** for flexible structured data (forms_status, envelopes, enrichment data, stakeholders)
- **Path alias:** `@/` maps to `src/`
- **CSS:** Use `lf-*` classes for Realtors360 design system, avoid inline styles
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

## AI Email Marketing Engine

**Flow:** Contact added → AI writes email (text-pipeline → email-blocks → quality-pipeline) → Realtor approves → Resend sends → Webhooks track engagement → Adapt next email.

**Key libs:** `email-blocks.ts` (13 modular blocks, Apple-quality HTML), `text-pipeline.ts` (personalization + voice + compliance), `quality-pipeline.ts` (7-dimension Claude Haiku scoring), `validated-send.ts`, `send-governor.ts` (frequency caps), `newsletter-ai.ts`, `workflow-engine.ts`.

**Actions:** `newsletters.ts` (CRUD, send, approve), `journeys.ts` (enrollment, phase advancement). **Validators:** `src/lib/validators/*.ts` (content, design, compliance-gate, quality-scorer).

**Crons (require Bearer CRON_SECRET):** `/api/cron/process-workflows` (daily 9 AM), `/api/cron/daily-digest` (daily 8 AM), `/api/cron/consent-expiry` (weekly Mon 6 AM).

**UI:** `/newsletters` page with 7 tabs: Overview, AI Agent, Campaigns, Relationships, Journeys, Analytics, Settings.

**Tables:** `newsletters`, `newsletter_events`, `contact_journeys`, `contacts.newsletter_intelligence`, `realtor_agent_config`.

**Seed data:** `scripts/seed-demo.mjs` (29 contacts, 84 emails, 129 events). Phone prefix `+1604555`. Idempotent.

**Specs:** `docs/MASTER_IMPLEMENTATION_PLAN.md`, `docs/SPEC_Prospect_360.md`, `docs/SPEC_Email_Content_Intelligence.md`, `docs/SPEC_Validation_Pipeline.md`, `docs/PLAN_Competitive_RAG.md`, `docs/user-journeys.md`, `pendingwork.md`.

---

## Realtors360 Sites — AI Website Generation Platform

**Architecture:** `realtors360-sites` (admin panel) → `realtors360-agent/` (Claude Agent SDK + Playwright) → Cloudflare Pages (static sites).

**Flow:** Realtor clicks "Generate My Website" → agent scrapes top realtor sites for inspiration → generates 3 style variants (dark luxury, light modern, bold warm) as config JSONs → pre-built React components render to HTML → deploy to Cloudflare Pages → Playwright screenshots → realtor picks favorite → promote to production.

**Agent service:** `realtors360-agent/` — Node.js + Express + Anthropic SDK. API: `POST /api/generate`, `GET /api/generations/:id`, `POST /api/variants/:id/approve`.

**9 section components** (theme-driven, same code renders all 3 styles): Nav, Hero, About, Stats, Testimonials, Listings, CTA, Contact, Footer.

**Tables:** `realtor_sites`, `site_generations`, `site_variants`, `site_pages`, `testimonials`, `site_leads`, `site_media`.

**Env vars:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `AGENT_SERVICE_URL`, `ANTHROPIC_API_KEY`.


<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->

<!-- Last reviewed: 2026-04-21 — Wave 1a demo gate -->
