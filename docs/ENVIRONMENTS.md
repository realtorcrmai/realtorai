<!-- docs-audit-reviewed: 2026-04-25 --paragon-pdf-import -->
<!-- docs-audit: vercel.json, .env.local.example, supabase/migrations/* -->
# Environments — Realtors360 CRM

> **Source of truth** for which Supabase projects, Vercel environments, and branches map to dev vs production. If you're a developer or AI agent starting work on this repo, **read this first**.
> Last updated: 2026-04-25 (proper dev/prod separation)

---

## TL;DR

| | Dev | Production |
|---|---|---|
| **Git branch** | `dev` | `main` |
| **Supabase project** | `qcohfohjihazivkforsj` | `opbrqlmhhqvfomevvkon` |
| **CRM (Next.js)** | Vercel Preview | Vercel Production — https://magnate360.com |
| **Newsletter Agent** | — | Render ($7/mo) — auto-deploys from `dev` branch |
| **Deploy trigger** | Push to `dev` → Vercel Preview | Merge PR to `main` → Vercel Production |

### Services currently running

| Service | Platform | Environment | Database | Status |
|---------|----------|-------------|----------|--------|
| **CRM** | Vercel Production | `main` branch | `opbrqlmhhqvfomevvkon` (prod) | Live — https://magnate360.com |
| **CRM Preview** | Vercel Preview | `dev` branch | `qcohfohjihazivkforsj` (dev) | Live — auto-deploy on push |
| **Newsletter Agent** | Render ($7/mo) | `dev` branch | `opbrqlmhhqvfomevvkon` (prod) | Live |
| **Dev Database** | Supabase | — | `qcohfohjihazivkforsj` | Live |
| **Prod Database** | Supabase | — | `opbrqlmhhqvfomevvkon` | Live |

### Newsletter Agent Feature Flags (set in Render env vars)

| Flag | Status | What it does |
|------|--------|-------------|
| `FLAG_SAVED_SEARCH` | ON | Matches new listings to saved buyer searches (every 15 min) |
| `FLAG_PROCESS_WORKFLOWS` | ON | **The critical port** — workflow step processing (every 2 min). CRM Vercel cron should be disabled when this is ON. |
| `FLAG_AGENT_SCORING` | ON | Lead scoring + recommendations (every 15 min) |
| `FLAG_AGENT_TRIAGE` | ON | Newsletter AI agent evaluates contacts hourly |
| `FLAG_WEEKLY_LEARNING` | ON | Adaptive learning cycle (Monday 6am Vancouver) |
| `FLAG_RAG_BACKFILL` | ON | RAG embeddings backfill (Sunday 3am Vancouver) |
| `FLAG_MARKET_SCRAPER` | ON | Market stats for 8 BC areas (Sunday 2am Vancouver) |

### Git Workflow

```
feature branch → PR → dev (preview) → PR → main (production / magnate360.com)
```

- **Never push directly to `dev` or `main`** — always via PR
- `dev` pushes auto-deploy to Vercel Preview + Render Newsletter
- `main` merges auto-deploy to Vercel Production (magnate360.com)

---

## Supabase

### Two projects — dev and production

| | Dev | Production |
|---|---|---|
| **Ref** | `qcohfohjihazivkforsj` | `opbrqlmhhqvfomevvkon` |
| **Display name** | "realtyaicontent" (legacy) | Magnate360 Prod |
| **Dashboard** | [Dev Dashboard](https://supabase.com/dashboard/project/qcohfohjihazivkforsj) | [Prod Dashboard](https://supabase.com/dashboard/project/opbrqlmhhqvfomevvkon) |
| **SQL editor** | [Dev SQL](https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new) | [Prod SQL](https://supabase.com/dashboard/project/opbrqlmhhqvfomevvkon/sql/new) |
| **REST API** | `https://qcohfohjihazivkforsj.supabase.co` | `https://opbrqlmhhqvfomevvkon.supabase.co` |
| **Data** | Test/seed data | Real client data |

**Both databases have identical schemas (171 tables).** Migrations must be applied to BOTH databases. Run on dev first, verify, then apply to prod.

**Local development** (`.env.local`) points to the dev database.

### History — what existed before 2026-04-09

Historically there were 3 Supabase projects drifting apart. All three were consolidated into `qcohfohjihazivkforsj` on 2026-04-09. The other two are orphaned pending deletion:

| Ref | Old name | State |
|---|---|---|
| `ybgiljuclpsuhbmdhust` | "amandhindsa's Project" | Orphaned — will be deleted after a safety window |
| `rsfjescdjuubxadfjyxb` | "Realtors360-prod" | Orphaned — was never populated |

**Do not connect to these.** All 17 hardcoded references in `scripts/` and `docs/` were updated on 2026-04-09 to point at `qcohfohjihazivkforsj`. If you see `ybgilju*` or `rsfjes*` anywhere except historical docs (`docs/ANALYSIS_Playbook_Enhancement.md`), that's a stale reference and should be fixed.

### Migrations

- **Location:** `supabase/migrations/*.sql` (CRM core) and `listingflow-sites/supabase/migrations/*.sql` (sites module)
- **Runner:** `scripts/apply-newsletter-migrations.mjs` (uses Supabase Management API)
- **Required env var:** `SUPABASE_ACCESS_TOKEN` — generate at https://supabase.com/dashboard/account/tokens
- **Dry-run flag:** `--dry-run` supported
- **Dashboard fallback:** paste SQL at https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new

### Orphan tables without migration files

Two tables exist in the DB but have no migration file in the repo:
- `seller_identities` (FINTRAC compliance)
- `listing_enrichment` (BC Geocoder / ParcelMap / LTSA / Assessment)

They were reconstructed via `pg_catalog` introspection during the 2026-04-09 consolidation. **If you spin up a fresh Supabase project from the migration files, these 2 tables will not exist.** A follow-up task is to write migration files for them.

### Known schema quirks

- **Two demo realtor users** (different UUIDs, different emails):
  - `7de22757-dd3a-4a4f-a088-c422746e88d4` → `demo-legacy@realestatecrm.com` (from the old ybgilju DB)
  - `e044c0c6-5523-49bc-a7e4-9fc93bfa8c3a` → `demo@realestatecrm.com` (original qcohfoh seed)
  - Most of the 698 contacts are scoped to `7de22757...`. If you want to see them in your dev session, log in as `demo-legacy@realestatecrm.com`.
- **Invalid `CREATE POLICY IF NOT EXISTS` syntax** in `073_contact_sync.sql` — PostgreSQL does not support `IF NOT EXISTS` on `CREATE POLICY`. The file was patched inline during the 2026-04-09 application but the committed file still has the broken syntax. If you re-run it on a fresh DB it will fail. Fix: use `DROP POLICY IF EXISTS ... ; CREATE POLICY ...` instead.

---

## Vercel

### The one project

- **Team:** `amandhindsas-projects`
- **Project:** `realestate-crm`
- **Project ID:** `prj_IcVhYCWnsdi0HjtigKKT5PiYwSVe`
- **Dashboard:** https://vercel.com/amandhindsas-projects/realestate-crm
- **Framework:** Next.js 16.x
- **Node:** 24.x
- **Git integration:** connected to `realtorcrmai/realtorai` via Vercel GitHub App (installed 2026-04-09)

### Branch → environment mapping

| Branch | Vercel environment | Deploy behaviour | URL |
|---|---|---|---|
| `dev` | Preview | Auto-deploy on every push, always at the stable branch alias | `https://realestate-crm-git-dev-amandhindsas-projects.vercel.app` |
| `main` | Production | Auto-deploy on every push (currently no pushes — reserved for future prod setup) | `https://realestate-crm-jade-ten.vercel.app` |
| Any feature branch | Preview | Auto-deploy per commit, unique URL per deploy | `realestate-crm-<hash>-amandhindsas-projects.vercel.app` |

### Current gotchas

1. **The `main` branch exists but no "real" production is set up on it yet.** Any merge to `main` will deploy to the Production URL with Production env vars — be careful.
2. **`dev` deploys are labelled "Preview" in Vercel**, not "Production", because `main` is still the nominal production branch. This is intentional — see the "Why not set dev as the production branch?" section below.
3. **Google OAuth redirect URLs** are configured only for the production URL. Logging in with Google on the dev preview URL will fail until you add `https://realestate-crm-git-dev-amandhindsas-projects.vercel.app/api/auth/callback/google` to the allowed redirects at https://console.cloud.google.com/apis/credentials. Demo login (email + password) works without any Google Cloud changes.

### Why not set dev as the production branch?

A common pattern is to point Vercel's "production branch" at whatever you call "live" — so `dev = production branch` if you only have one live environment. We deliberately do NOT do this, because:

- A separate production environment is being set up **soon**
- When it is, the production branch will be `main` (or similar)
- Changing production branch in Vercel is a one-click operation, but renaming env-var scopes afterwards is tedious
- Keeping `dev` in the "Preview" slot reserves the "Production" slot for the real prod later

So **pushes to `dev` auto-deploy as Preview deployments** with their own stable URL. When production is ready, we'll either (a) keep this project and start pushing to `main`, or (b) spin up a second Vercel project dedicated to prod.

---

## Environment variables

### Where they live

| Location | Purpose | Who edits | How |
|---|---|---|---|
| **Vercel Preview env** | Used by dev branch deploys | Owner via CLI or dashboard | `vercel env add <name> preview` |
| **Vercel Production env** | Used by main branch deploys (when it happens) | Owner via CLI or dashboard | `vercel env add <name> production` |
| **GitHub Actions secrets** | Used by CI workflows only (not deploys anymore) | Owner via `gh secret set` or dashboard | https://github.com/realtorcrmai/realtorai/settings/secrets/actions |
| **Local `.env.local`** | Local `npm run dev` on each developer's machine | Each developer | Manually edit, gitignored |
| **`.env.vault` (encrypted)** | Backup/sync mechanism for `.env.local` values across devs | Any developer after running `./scripts/vault.sh decrypt` | `./scripts/vault.sh encrypt` after edits |
| **`.env.local.example`** | Template documenting the required variable names | Committed to git | Update when adding a new env var |

### Currently set

All 3 Supabase env vars are configured identically in Vercel Preview, Vercel Production, and GitHub Actions secrets. They all point at `qcohfohjihazivkforsj`:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://qcohfohjihazivkforsj.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (jwt starting with `eyJhbGci...twFTs6bg...`)
- `SUPABASE_SERVICE_ROLE_KEY` = (jwt starting with `eyJhbGci...uWkkflNh...`)

Vercel Preview has a total of 19 env vars (Supabase + Anthropic + Resend + Twilio + Google OAuth + NextAuth + demo creds + cron + telemetry). The full list is in the Vercel dashboard or via `vercel env ls preview`.

### Env-specific overrides

Two variables have different values in Preview vs Production to match the URL they're running at:

| Var | Preview (dev) | Production (main) |
|---|---|---|
| `NEXTAUTH_URL` | `https://realestate-crm-git-dev-amandhindsas-projects.vercel.app` | `https://realestate-crm-jade-ten.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | same as NEXTAUTH_URL | same as NEXTAUTH_URL |

**If you add a new env var** that depends on the deployment URL (callback URL, webhook URL, email link base, etc.), remember to set it differently in Preview vs Production.

### 🚨 `.env.vault` is stale

The encrypted `.env.vault` was last re-encrypted on **2026-04-01** — before the Supabase consolidation. It still contains the OLD `ybgiljuclpsuhbmdhust` project URL and keys. **Anyone who runs `./scripts/vault.sh decrypt` today will get stale credentials that point at an orphaned Supabase project.**

**Follow-up required:** whoever has the vault passphrase should:
1. Decrypt: `./scripts/vault.sh decrypt`
2. Edit `.env.local` to match the current values (from Vercel: `vercel env pull .env.local`)
3. Re-encrypt: `./scripts/vault.sh encrypt`
4. Commit the updated `.env.vault`
5. Tell the team to `./scripts/vault.sh decrypt` to pick up the fresh values

### How to update env vars safely

**Changing a Supabase env var:**
1. Update Vercel Preview: `printf 'VALUE' | vercel env rm NAME preview --yes && printf 'VALUE' | vercel env add NAME preview`
2. Update Vercel Production: same command with `production`
3. Update GitHub Actions secret: `printf 'VALUE' | gh secret set NAME --repo realtorcrmai/realtorai`
4. Update your local `.env.local` manually
5. Re-encrypt the vault (see above)
6. Trigger redeploys so the new values take effect (push to dev + main, or use the Vercel dashboard)

**Always use `printf`, not `echo`** — `echo` adds a trailing newline that breaks the value. (This has bitten the team once — see compliance log entry 2026-04-09.)

---

## Deploy flow

```
     edit locally
         │
         ▼
 feature branch (claude/foo, rahul/bar)
         │
         ▼   (PR)
         ▼
    dev branch ─────┬───────► Vercel Preview auto-deploy (CRM)
                    │         URL: realestate-crm-git-dev-amandhindsas-projects.vercel.app
                    │         DB: qcohfohjihazivkforsj
                    │
                    └───────► Render auto-deploy (Newsletter Agent)
                              Root: realtors360-newsletter/
                              DB: qcohfohjihazivkforsj (same)
                              12 crons, 19 agent tools, all flags ON
         │
         ▼   (PR from dev → main, requires 1 approval)
         ▼
    main branch ────────────► Vercel Production auto-deploy
                              Status: ⚠ reserved — not in active use yet
```

### Rules

1. **Never push directly to `dev` or `main`.** Always via PR. Branch protection is enforced.
2. **Feature branch → PR → dev → preview deploy → smoke test → PR dev → main → production deploy.** That's the only path code takes.
3. **Once production is really set up**, do not merge dev → main without running the full `/test` suite first. Prod data is prod data.
4. **Nothing is "prod" today.** The codebase is not yet serving real customers. Don't treat `main` like a sacred branch until it actually has live users.

---

## Other external services

| Service | Purpose | Project / Account | Notes |
|---|---|---|---|
| **Render** | Newsletter Agent hosting | `realtors360-newsletter` service ($7/mo) | Auto-deploys from `dev`, root dir `realtors360-newsletter`. Env vars set in Render dashboard. |
| Anthropic Claude | AI content + agent layer | Shared API key | Used by both CRM + Newsletter service |
| Resend | Email sending + webhooks | Shared API key | From: `onboarding@resend.dev` (sandbox — verify domain for production) |
| Twilio | SMS + WhatsApp | Shared account | Used by CRM showings + Newsletter workflow steps |
| Google Calendar / OAuth | Calendar sync + login | Shared client ID | Per `.env.local` → `GOOGLE_CLIENT_ID/SECRET` |
| Voyage AI | RAG embeddings | Shared API key | Used by Newsletter RAG backfill + retriever |
| Kling AI | Video/image generation | Shared API key | Per `.env.local` → `KLING_*` (if configured) |
| BC Geocoder | Address autocomplete | Free public API | No key required |
| Realtors360 Python form server | BCREA form rendering | Local only (`localhost:8767`) | Not deployed to cloud |

**When you add a new external service**, decide up-front whether it needs separate dev vs prod credentials (e.g., Stripe test mode vs live mode) and set both env scopes accordingly.

---

## Logo Static Assets

The logo animation system uses pure HTML/CSS/JS files in `public/` — no npm dependencies or env vars needed.

| File | Served at | Notes |
|------|-----------|-------|
| `public/logo-animated.html` | `/logo-animated.html` | Full 3D animated login logo (420px native) |
| `public/logo-sidebar.html` | `/logo-sidebar.html` | Lightweight sidebar logo (120px native, GPU-optimized) |
| `public/favicon.svg` | `/favicon.svg` | Browser tab favicon |

These files are loaded via `<iframe>` by the `LogoVideo` React component (`src/components/brand/Logo.tsx`). They deploy automatically with the Next.js build.

**Middleware whitelist:** `src/middleware.ts` has `pathname.startsWith("/logo-")` in the public routes list, preventing auth redirects when iframes fetch these files. The `config.matcher` also excludes them entirely from middleware processing. No changes needed on new deploys.

---

## Quick reference for AI agents

If you're Claude Code or another agent working in this repo, here's what you need to know in one glance:

- **DB target:** Always `qcohfohjihazivkforsj` (Supabase). Never assume any other project ref.
- **Branch you're probably on:** `dev` (or a feature branch off it). Use `git branch --show-current` to confirm.
- **Two deployed services:**
  - **CRM** → Vercel (auto-deploy from `dev`) → `realestate-crm-git-dev-amandhindsas-projects.vercel.app`
  - **Newsletter Agent** → Render (auto-deploy from `dev`, root dir `realtors360-newsletter`) → check Render dashboard for URL
- **Newsletter Agent is LIVE** with all 7 feature flags ON. 19 tools, 12 crons, 121 tests. Code at `realtors360-newsletter/`.
- **Both services share the same Supabase DB** (`qcohfohjihazivkforsj`). Changes to DB schema affect both.
- **Newsletter env vars** are set in the Render dashboard (not Vercel). CRM env vars are in Vercel.
- **Migration files:** `supabase/migrations/*.sql`. Latest: 151 (`paragon_imports_bucket` — private 15 MB bucket + RLS for Paragon PDF imports, auto-cleaned after 7 days by `/api/cron/cleanup-paragon-pdfs`). Never modify applied migrations — create new ones.
- **Pending production migrations:** When merging `dev → main`, apply these to the production DB:
  - `104_ai_quality_tier.sql` — adds `ai_quality_tier` column to `realtor_agent_config`
- **Running SQL:** Use dashboard SQL editor at https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new
- **Adding CRM env vars:** `vercel env add <name> preview` + `vercel env add <name> production`
- **Adding Newsletter env vars:** Render dashboard → Environment tab
- **Before any destructive operation:** wrap in `BEGIN; ... ROLLBACK;` first.
- **`FLAG_PROCESS_WORKFLOWS=on` on Render** means the CRM's Vercel cron for process-workflows should be DISABLED to avoid double-processing.

---

## Open follow-ups (post-consolidation)

1. **Delete orphaned Supabase projects** `ybgiljuclpsuhbmdhust` + `rsfjescdjuubxadfjyxb` via https://supabase.com/dashboard after 24–48h safety window
2. **Re-encrypt `.env.vault`** with current Vercel values (see "🚨 `.env.vault` is stale" above)
3. **Delete dead `.github/workflows/deploy.yml` + `netlify.toml`** — Netlify is no longer the deploy target
4. **Rename the Supabase project** from "realtyaicontent" to something sensible like "realtors360-dev" via Settings → General
5. **Write migration files** for `seller_identities` + `listing_enrichment` (currently reconstructed via introspection, not in the repo)
6. **Fix the broken `CREATE POLICY IF NOT EXISTS` syntax** in `073_contact_sync.sql`
7. **Dedupe the two demo realtors** — collapse `demo-legacy@realestatecrm.com` + `demo@realestatecrm.com` into one
8. **Check `realtors360-sites/.env.local`** — may still point at the old ybgilju project
9. **Move to us-east-2 or ca-central-1** eventually — `us-west-2` adds ~30-40ms latency for Canadian users (fix needs a fresh Supabase project + data re-migration)
10. **Add `VERCEL_TOKEN` to GitHub Actions secrets** if you want CI to trigger deploys without relying on the Vercel GitHub App

## References

- `docs/PRODUCTION_DEPLOYMENT.md` — deploy runbook (touched by 2026-04-09 consolidation)
- `.claude/skills/deploy.md` — `/deploy` slash command
- `scripts/apply-newsletter-migrations.mjs` — migration runner
- `.claude/compliance-log.md` — chronological record of every DB/infra change (search for "2026-04-09" for the consolidation entry)
- `~/.claude/projects/-Users-bigbear-reality-crm/memory/reference_supabase.md` — Claude Code memory mirror of the connection details
- `~/.claude/projects/-Users-bigbear-reality-crm/sessions/2026-04-09-supabase-consolidation.md` — full session notes from the consolidation
