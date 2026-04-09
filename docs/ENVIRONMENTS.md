# Environments — Realtors360 CRM

> **Source of truth** for which Supabase projects, Vercel environments, and branches map to dev vs production. If you're a developer or AI agent starting work on this repo, **read this first**.
> Last updated: 2026-04-09 (post Supabase consolidation)

---

## TL;DR

| | Dev | Production |
|---|---|---|
| **Supabase project** | `qcohfohjihazivkforsj` ("realtyaicontent") | **not set up yet — planned** |
| **Git branch** | `dev` | `main` (nothing there yet — reserved) |
| **Vercel environment** | Preview | Production |
| **Deploy URL** | `https://realestate-crm-git-dev-amandhindsas-projects.vercel.app` | `https://realestate-crm-jade-ten.vercel.app` (stale until main is populated) |
| **Deploy trigger** | Auto on push to `dev` | Auto on push to `main` (not triggered yet) |
| **Region** | us-west-2 | TBD |

**Currently the CRM has one real environment: dev.** A separate production project + environment is being set up later. Until then, do not assume anything in this repo is "live for real customers."

---

## Supabase

### The one project currently in use

- **Ref:** `qcohfohjihazivkforsj`
- **Display name:** "realtyaicontent" (legacy — should be renamed)
- **Region:** `us-west-2` (AWS)
- **Dashboard:** https://supabase.com/dashboard/project/qcohfohjihazivkforsj
- **SQL editor:** https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new
- **REST API base:** `https://qcohfohjihazivkforsj.supabase.co`

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
    dev branch ─────────────► Vercel Preview auto-deploy
                              URL: realestate-crm-git-dev-amandhindsas-projects.vercel.app
                              DB: qcohfohjihazivkforsj
                              env: Preview
                              Status: live for dev testing
         │
         ▼   (PR from dev → main, requires 1 approval)
         ▼
    main branch ────────────► Vercel Production auto-deploy
                              URL: realestate-crm-jade-ten.vercel.app
                              DB: qcohfohjihazivkforsj (same as dev, for now)
                              env: Production
                              Status: ⚠ nothing merged yet — prod is dormant
```

### Rules

1. **Never push directly to `dev` or `main`.** Always via PR. Branch protection is enforced.
2. **Feature branch → PR → dev → preview deploy → smoke test → PR dev → main → production deploy.** That's the only path code takes.
3. **Once production is really set up**, do not merge dev → main without running the full `/test` suite first. Prod data is prod data.
4. **Nothing is "prod" today.** The codebase is not yet serving real customers. Don't treat `main` like a sacred branch until it actually has live users.

---

## Other external services

None of these are affected by the dev/prod split. They're shared:

| Service | Purpose | Project / Account | Notes |
|---|---|---|---|
| Anthropic Claude | AI content + agent layer | Shared API key | Per `.env.local` → `ANTHROPIC_API_KEY` |
| Resend | Email sending | Shared API key | Per `.env.local` → `RESEND_API_KEY`, from address `onboarding@resend.dev` |
| Twilio | SMS + WhatsApp | Shared account | Per `.env.local` → `TWILIO_*` |
| Google Calendar / OAuth | Calendar sync + login | Shared client ID | Per `.env.local` → `GOOGLE_CLIENT_ID/SECRET` |
| Voyage AI | RAG embeddings | Shared API key | Per `.env.local` → `VOYAGE_API_KEY` (if configured) |
| Kling AI | Video/image generation | Shared API key | Per `.env.local` → `KLING_*` (if configured) |
| BC Geocoder | Address autocomplete | Free public API | No key required |
| Realtors360 Python form server | BCREA form rendering | Local only (`localhost:8767`) | Not deployed anywhere in Vercel |

**When you add a new external service**, decide up-front whether it needs separate dev vs prod credentials (e.g., Stripe test mode vs live mode) and set both env scopes accordingly.

---

## Quick reference for AI agents

If you're Claude Code or another agent working in this repo, here's what you need to know in one glance:

- **DB target:** Always `qcohfohjihazivkforsj` (Supabase). Never assume any other project ref.
- **Branch you're probably on:** `dev` (or a feature branch off it). Use `git branch --show-current` to confirm.
- **Where local dev talks to:** qcohfoh via `.env.local`. Run `cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL` to verify.
- **Where preview deploys talk to:** qcohfoh via Vercel Preview env vars.
- **Where production deploys talk to:** qcohfoh too (same DB, until prod is split). Via Vercel Production env vars.
- **Migration files:** `supabase/migrations/*.sql`. Never modify an applied migration — always create a new one.
- **Running SQL against the dev DB:** Use `scripts/apply-newsletter-migrations.mjs` (needs `SUPABASE_ACCESS_TOKEN`) or paste into the dashboard SQL editor.
- **Adding env vars:** Use `vercel env add <name> preview` AND `vercel env add <name> production` so both environments stay in sync. Also add to `.env.local.example` with a placeholder value.
- **Before any destructive operation:** back up via `scripts/apply-newsletter-migrations.mjs` (or similar) and wrap DELETE statements in `BEGIN; ... ROLLBACK;` for audit.
- **After the consolidation**, some code paths may reference features that were in ybgilju but dropped during the migration due to schema drift. If you hit a `column does not exist` error on `listings.current_phase` or similar, the column was stripped. Either add it back with a migration or update the code.

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
