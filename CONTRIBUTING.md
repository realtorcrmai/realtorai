<!-- docs-audit-reviewed: 2026-04-21 --task-mgmt -->
# Contributing to Realtors360

## Local Development Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 20+ (22+ recommended) | `brew install node` or [nvm](https://github.com/nvm-sh/nvm) |
| **npm** | 10+ (comes with Node) | — |
| **Python** | 3.12+ | `brew install python@3.14` (for voice agent only) |
| **Git** | 2.40+ | `brew install git` |
| **Vercel CLI** | Latest | `npm i -g vercel` |
| **GitHub CLI** | Latest | `brew install gh` |

Optional:
- **Supabase CLI** — only if you need to create new migration files: `brew install supabase/tap/supabase`
- **Playwright** — only if you run browser tests: `npx playwright install chromium`

---

### Step 1 — Clone and install

```bash
git clone https://github.com/realtorcrmai/realtorai.git
cd realtorai

# Install CRM dependencies
npm install

# Install newsletter service dependencies (separate package)
cd realtors360-newsletter && npm install && cd ..

# Install voice agent dependencies (Python)
cd voice_agent && pip3 install -r requirements.txt && cd ..
```

---

### Step 2 — Get environment variables

**Fastest method** (recommended):

```bash
# Login to Vercel (one-time)
vercel login

# Pull dev environment variables directly from Vercel
vercel env pull .env.local --environment=preview
```

This gives you working credentials for the dev Supabase project, NextAuth secret, Anthropic, Resend, Twilio, Google OAuth, and everything else — in one command.

**Alternative method** (if you don't have Vercel access):

1. Copy the template: `cp .env.local.example .env.local`
2. Ask a team member for the values
3. Fill in each variable

**Important:**
- `.env.local` is gitignored — never commit it
- The old `.env.vault` mechanism is deprecated — use `vercel env pull` instead
- See `docs/ENVIRONMENTS.md` for the full env var reference

---

### Step 3 — Start the dev server

```bash
# Just the CRM (most common)
npm run dev
# → http://localhost:3000

# Or use VS Code: press F5 and select "CRM (Next.js Dev)"
# Or use the compound launch: "Full Stack (CRM + Newsletter + Voice)"
```

**Login credentials:**
- Email: `demo@realestatecrm.com`
- Password: `demo1234`

---

### All services

| Service | Port | Start command | Required? |
|---------|------|---------------|-----------|
| **CRM** (Next.js) | 3000 | `npm run dev` | Yes — core app |
| **Newsletter service** (Express) | 8080 | `cd realtors360-newsletter && npm run dev` | Only for newsletter event processing |
| **Voice agent** (Python) | 8768 | `cd voice_agent && python3 server/main.py` | Only for voice features |
| **Form server** (Python) | 8767 | `cd forms && python3 server.py` | Only for BCREA form generation |

Most development only needs the CRM running. The other services are independent and only needed when working on their specific features.

---

### Step 4 — Verify your setup

```bash
# TypeScript check (should be clean)
npm run typecheck

# Lint (should be 0 errors)
npm run lint

# Unit tests (83+ tests, ~300ms)
npm run test:quick

# Full preflight (typecheck + lint + audit)
npm run preflight

# Health check script
npm run health
```

---

## Project structure

```
realestate-crm/                  ← You are here (repo root)
├── src/
│   ├── app/                     # Next.js App Router pages + API routes
│   │   ├── (auth)/login/        # Login page
│   │   ├── (dashboard)/         # All authenticated pages
│   │   │   └── settings/team/   # Team management page
│   │   └── api/                 # API routes (webhooks, crons, REST)
│   │       └── tasks/           # Task CRUD, templates, filters, export
│   ├── actions/                 # Server actions (mutations)
│   ├── components/              # React components
│   │   ├── brand/               # Logo components (LogoIcon, LogoAnimated, etc.)
│   │   ├── layout/              # MondaySidebar, MondayHeader, MobileNav
│   │   ├── contacts/            # Contact features
│   │   ├── listings/            # Listing features
│   │   ├── newsletters/         # Newsletter features
│   │   └── ui/                  # shadcn primitives
│   ├── lib/                     # Shared utilities
│   │   ├── supabase/            # DB clients (admin, tenant, server)
│   │   ├── compliance/          # CASL consent + FINTRAC gates
│   │   └── ai-agent/            # AI agent tools
│   ├── emails/                  # React Email templates
│   ├── hooks/                   # React hooks
│   └── stores/                  # Zustand state stores
├── realtors360-newsletter/      # Newsletter engine (separate Express service)
├── voice_agent/                 # Voice AI agent (Python)
├── listingflow-sites/           # Website builder (standalone)
├── supabase/migrations/         # Database migrations (SQL)
├── scripts/                     # Utility scripts (test, seed, eval)
├── tests/                       # Integration tests
├── docs/                        # Documentation
├── .github/workflows/           # CI workflows (g1-pr.yml, g2-review.yml, g3-merge.yml)
└── .vscode/                     # VS Code workspace settings
```

---

## Environments

| | Dev | Production |
|---|---|---|
| **URL** | Preview deploys from `dev` branch | https://magnate360.com |
| **Supabase** | `qcohfohjihazivkforsj` | `opbrqlmhhqvfomevvkon` |
| **Vercel project** | `realestate-crm` | `realestate-crm` (amandhindsas-projects) |
| **Git branch** | `dev` | `main` |
| **Newsletter (Render)** | — | https://realtors360-newsletter.onrender.com |

Full details: `docs/ENVIRONMENTS.md`

---

## Git workflow

```
feature branch → PR → dev → PR → main (production)
```

### Rules

1. **Never push directly to `dev` or `main`** — always via PR
2. **Branch naming:** `<developer>/<description>` (e.g. `rahul/voice-tts`, `claude/fix-login`)
3. **PRs to `dev`:** 0 approvals required — merge your own
4. **PRs to `main`:** 1 approval required, all CI must pass (TypeScript, Lint, Build)
5. **PRs to `main` must come from `dev` or `hotfix/*`** — feature branches cannot PR to main directly
6. **Hotfixes:** branch from `main`, name `hotfix/<description>`, PR to `main`, then merge main back to dev

### CI checks (required on `main`)

| Check | What | Must pass? |
|-------|------|------------|
| Branch Policy | Validates source branch | ✅ |
| TypeScript | `npx tsc --noEmit` | ✅ |
| Lint | `npx eslint .` | ✅ |
| Build | `npm run build` | ✅ |
| Python Syntax | Compiles voice agent files | ✅ |
| G1 PR Gate (`g1-pr.yml`) | TypeScript + Lint + Build on PR open | ✅ |
| G2 Review Gate (`g2-review.yml`) | Docs audit + test plan validation on review | ✅ |
| G3 Merge Gate (`g3-merge.yml`) | Full test suite before merge to `dev`/`main` | ✅ |

---

## Database

### Running migrations

Migrations are SQL files in `supabase/migrations/`. To apply a new migration to the dev database:

```bash
# Set your Supabase Management API token
export SUPABASE_ACCESS_TOKEN=<your-token>

# Apply a specific migration file
node scripts/apply-newsletter-migrations.mjs

# Or paste SQL directly into the dashboard:
# Dev: https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new
# Prod: https://supabase.com/dashboard/project/opbrqlmhhqvfomevvkon/sql/new
```

Generate a token at https://supabase.com/dashboard/account/tokens

### Creating a new migration

```bash
# Check the latest migration number
ls supabase/migrations/ | sort | tail -5

# Create your file (increment the number)
touch supabase/migrations/088_your_feature.sql
```

Rules:
- Use `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for idempotency
- Include RLS: `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- Include indexes on every FK column and every column used in WHERE clauses
- Never modify an already-applied migration — always create a new one
- For destructive migrations, write a rollback at `supabase/rollbacks/<same_number>_rollback.sql`
- **Apply to BOTH dev and prod** after merging — use the sync SQL on Desktop if needed

### Multi-tenancy

Every user-data table has a `realtor_id` column. Always use the tenant client:

```typescript
const tc = await getAuthenticatedTenantClient();
const { data } = await tc.from("contacts").select("*");
// Automatically adds .eq("realtor_id", currentUser.id)
```

Never use `createAdminClient()` for user-initiated operations — it bypasses tenant isolation.

---

## Testing

```bash
# Quick unit tests (vitest, ~300ms)
npm run test:quick

# Unit tests only (src/__tests__/)
npm run test:unit

# Full test suite (API + CRUD + auth + cascade)
npm run test

# All tests (unit + integration + eval scripts)
npm run test:all

# Integration tests (needs TEST_SUPABASE_* env vars)
npm run test:integration

# RLS canary (cross-tenant isolation check)
npm run test:rls

# Watch mode (TDD)
npm run test:watch

# Browser tests (Playwright)
npm run test:e2e              # all E2E tests
npm run test:e2e:ui           # interactive UI mode
npm run test:e2e:debug        # debug mode
npm run test:e2e:p0           # P0 critical tests only
npm run test:e2e:desktop      # desktop viewport only
npm run test:e2e:mobile       # mobile viewport only
npm run test:contract         # contract tests (API shape validation)

# Specialized test suites
npm run test:api              # API endpoint tests
npm run test:a11y             # accessibility audit
npm run test:rtm              # requirements traceability matrix
npm run test:rtm:strict       # RTM strict mode (fail on gaps)
npm run test:rtm:json         # RTM output as JSON

# Code quality & security
npm run format:check          # check Prettier formatting
npm run scan-secrets          # detect leaked secrets (gitleaks)
npm run size-check            # bundle size limits

# Docs freshness audit
node scripts/audit-docs.mjs

# Before every PR
npm run preflight   # typecheck → lint → audit
```

---

## Common tasks

### Add a new page

1. Create `src/app/(dashboard)/your-page/page.tsx`
2. Add `export const dynamic = 'force-dynamic'` if it needs real-time data
3. Use `lf-glass` header, `lf-card` for sections
4. Link from sidebar (`src/components/layout/MondaySidebar.tsx`)

### Add a server action

1. Create or extend `src/actions/your-domain.ts`
2. Use `getAuthenticatedTenantClient()` for DB operations
3. Validate inputs with Zod
4. Call `revalidatePath('/affected-route')` after mutations
5. Return `{ error: string }` on failure — never throw

### Send an email

Always use the CASL compliance gate before sending:

```typescript
import { canSendToContact } from "@/lib/compliance/can-send";

const check = canSendToContact(contact);
if (!check.allowed) return { error: check.reason };
// Now safe to send via Resend
```

---

## Design system

### Brand

- **Name:** Realtors360 (not "RealtorAI")
- **Primary:** Navy #2D3E50
- **Accent:** Gold #C9A96E
- **CTA:** Coral #FF7A59
- **Logo components:** `src/components/brand/Logo.tsx` (`<LogoIcon>`, `<LogoAnimated>`, `<LogoSpinner>`)

### Key CSS classes

| Class | Purpose |
|-------|---------|
| `lf-card` | Glass card with backdrop-blur |
| `lf-btn` / `lf-btn-ghost` / `lf-btn-sm` | Buttons |
| `lf-badge` | Status badge (variants: `-done`, `-active`, `-pending`, `-blocked`) |
| `lf-input` / `lf-select` / `lf-textarea` | Form elements |

---

## Getting help

- `docs/ENVIRONMENTS.md` — environment setup reference
- `docs/DEVELOPER_SYNC.md` — syncing a pre-existing local to current state
- `docs/TESTING_STRATEGY.md` — test architecture
- `CLAUDE.md` — AI agent instructions (read by Claude Code automatically)
- `.claude/agent-playbook.md` — mandatory task execution protocol
- Issues: https://github.com/realtorcrmai/realtorai/issues

<!-- Last reviewed: 2026-04-21 -->

<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->
