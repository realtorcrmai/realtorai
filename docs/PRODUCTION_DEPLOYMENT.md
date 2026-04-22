<!-- docs-audit-reviewed: 2026-04-21 --task-mgmt -->
<!-- docs-audit: vercel.json, .github/workflows/*, docs/ENVIRONMENTS.md -->
# Realtors360 — Production Deployment Guide

> **Last Updated:** April 11, 2026
> **Current Release:** R1 (CRM + Email Marketing)
> **Deploy Target:** Vercel (CRM) + Render (Newsletter Agent) + Supabase (database)
> **Read by:** Any Claude client or developer deploying this app

---

## Environment Separation

| Service | Dev | Production | Shared? |
|---------|-----|-----------|---------|
| **Supabase DB** | `qcohfohjihazivkforsj` (current) | NEW — separate project | NO — isolated |
| **Vercel (CRM)** | localhost:3000 / Preview auto-deploy from `dev` | Production auto-deploy from `main` | NO — isolated |
| **Render (Newsletter)** | Local / Preview auto-deploy from `dev` | Production from `main` | NO — isolated |
| **Resend (email)** | Same API key | Same API key | YES |
| **Twilio (SMS)** | Same account | Same account | YES |
| **Anthropic (Claude)** | Same API key | Same API key | YES |
| **Google OAuth** | Same client ID (add prod redirect URI) | Same client ID | YES |
| **Kling AI** | Same API key | Same API key | YES |

### Why Separate DB?
- Dev has demo/test data (517 contacts, seed data) — must not appear in production
- Schema changes tested on dev first, then migrated to prod
- Prod DB can have stricter RLS, connection limits, and backups

### Why Shared API Services?
- Resend, Twilio, Anthropic charge per usage — no cost benefit to separate accounts
- Google OAuth supports multiple redirect URIs on one client ID
- Keeps management simple — one dashboard per service

---

## Setting Up Production Supabase

### Step 1: Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `realtors360-prod`
4. Region: `ca-central-1` (same as dev, closest to BC)
5. Generate a strong database password — save it securely
6. Wait for project to be ready (~2 min)

### Step 2: Get Production Credentials
From the new project dashboard → Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://<new-project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` = the `service_role` key (keep secret)

### Step 3: Run All Migrations on Production DB
The combined migration file is at: `Desktop/PROD_DB_FULL_SCHEMA.sql` (7,753 lines)

**Option A: Via Supabase CLI**
```bash
SUPABASE_ACCESS_TOKEN=<prod-token> npx supabase db query \
  --project-ref <new-project-ref> \
  -f PROD_DB_FULL_SCHEMA.sql
```

**Option B: Via SQL Editor**
1. Open: `https://supabase.com/dashboard/project/<new-project-ref>/sql/new`
2. Paste contents of `PROD_DB_FULL_SCHEMA.sql`
3. Click Run
4. Note: May need to run in chunks if file is too large for editor

### Step 4: Verify Production DB
Run in SQL Editor:
```sql
-- Should return 70+ tables
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';

-- Should return 65+ (realtor_id columns)
SELECT COUNT(*) FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'realtor_id';

-- Should return 0 (no data yet — clean prod)
SELECT COUNT(*) FROM contacts;
```

### Step 5: Update Vercel Environment Variables
In Vercel dashboard → Settings → Environment Variables:

Set these to the **PRODUCTION** Supabase values:
```
NEXT_PUBLIC_SUPABASE_URL=https://<prod-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod anon key>
SUPABASE_SERVICE_ROLE_KEY=<prod service role key>
```

Keep these the same (shared services):
```
RESEND_API_KEY=<same as dev>
ANTHROPIC_API_KEY=<same as dev>
TWILIO_ACCOUNT_SID=<same as dev>
TWILIO_AUTH_TOKEN=<same as dev>
# ... etc
```

### Step 6: Add Production Google OAuth Redirect
1. Go to https://console.cloud.google.com → Credentials → your OAuth client
2. Add redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
3. Save

### Step 7: Redeploy on Vercel
Trigger a redeploy in Vercel dashboard (or push to `main`) so it picks up the new env vars.

### Step 8: Verify Production
```bash
# Login page loads
curl -s -o /dev/null -w "%{http_code}" https://your-app.vercel.app/login
# Should return 200

# API requires auth
curl -s -o /dev/null -w "%{http_code}" https://your-app.vercel.app/api/contacts
# Should return 401
```

---

## Quick Reference

```bash
# Build and verify locally (uses DEV Supabase via .env.local)
npm run build                    # must pass with 0 errors
bash scripts/test-suite.sh       # 73+ tests must pass

# Deploy to production (uses PROD Supabase via Vercel env vars)
git push origin dev              # CI runs on dev → Vercel Preview deploy
# Create PR: dev → main
# Merge → Vercel auto-deploys from main
```

---

## 1. Release Feature Gating

Features are controlled by `src/lib/features.ts`. The constant `CURRENT_RELEASE_FEATURES` determines what new users see.

### Current Release: R1

```typescript
// R1: CRM + Email Marketing only
export const CURRENT_RELEASE_FEATURES = R1_FEATURES;
// = ["listings", "contacts", "showings", "calendar", "tasks", "forms", "newsletters", "automations"]
```

### To Roll Out Next Release

Edit `src/lib/features.ts` and change:

```typescript
// R2: Add Social Media
export const CURRENT_RELEASE_FEATURES = R2_FEATURES;

// R3: Add Website + Content
export const CURRENT_RELEASE_FEATURES = R3_FEATURES;

// R4: Add Voice Agent + RAG
export const CURRENT_RELEASE_FEATURES = R4_FEATURES;

// Full release: Everything
export const CURRENT_RELEASE_FEATURES = ALL_FEATURES;
```

**Existing users keep their current features.** Only NEW signups get `CURRENT_RELEASE_FEATURES`. To upgrade existing users, update their `enabled_features` in the `users` table via Supabase SQL Editor.

### How Feature Gating Works
1. `src/lib/auth.ts` → sets `enabledFeatures` on JWT token at login (defaults to `CURRENT_RELEASE_FEATURES` for new users)
2. `src/components/layout/AppHeader.tsx` → filters nav items by `enabledFeatures`
3. `src/app/(dashboard)/page.tsx` → filters dashboard tiles by `enabledFeatures`
4. Pages still exist but are invisible in nav. Direct URL access shows the page (no server-side block — the data queries use tenant isolation regardless).

### To Enable a Feature for a Specific User

```sql
-- In Supabase SQL Editor:
UPDATE users
SET enabled_features = enabled_features || '["social"]'::jsonb
WHERE email = 'realtor@example.com';
```

---

## 2. Static Assets — Logo System

The logo system uses **pure HTML/CSS/JS files** served from `public/`. They are loaded at runtime via `<iframe>` by the `LogoVideo` React component. These files **must be present** in the deployed `public/` directory.

### Required files

| File | Path | Loaded by |
|------|------|-----------|
| `logo-animated.html` | `public/logo-animated.html` | Login page logo (size > 100px) |
| `logo-sidebar.html` | `public/logo-sidebar.html` | Sidebar logo (size ≤ 100px) |
| `favicon.svg` | `public/favicon.svg` | Browser tab favicon |

These files are committed to git under `public/` and deploy automatically with every Vercel build. No additional deployment steps are required.

### No extra dependencies

The logo system is **pure HTML/CSS/JS** with no npm packages. No new environment variables are needed. No build step is required.

### Middleware whitelist

`src/middleware.ts` already whitelists all `/logo-*` paths to prevent auth redirects when iframes request these files:

```typescript
pathname.startsWith("/logo-") ||     // catches /logo-animated.html, /logo-sidebar.html, etc.
```

The `config.matcher` in `middleware.ts` also excludes `logo-*.html`, `logo-*.mp4`, and `logo-*.svg` patterns from the middleware entirely. No changes to middleware are needed.

---

## 3. Environment Variables

### Required for R1 (App Breaks Without These)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qcohfohjihazivkforsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app     # MUST match deployed URL
NEXTAUTH_SECRET=<openssl rand -base64 32>

# App URL (CRITICAL — used in all email links, unsubscribe URLs)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Cron Auth
CRON_SECRET=<strong random string, min 32 chars>

# Demo Login
DEMO_EMAIL=<demo account email>
DEMO_PASSWORD=<demo account password>

# Email (Resend)
RESEND_API_KEY=<from resend.com dashboard>
RESEND_FROM_EMAIL=hello@yourdomain.com
RESEND_WEBHOOK_SECRET=<from resend webhook config>

# AI (Claude)
ANTHROPIC_API_KEY=<from console.anthropic.com>
```

### Required for Specific Features

```bash
# Google OAuth + Calendar (R1 — for Google login + calendar sync)
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Twilio SMS/WhatsApp (R1 — for showing notifications)
TWILIO_ACCOUNT_SID=<from twilio.com>
TWILIO_AUTH_TOKEN=<from twilio.com>
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
TWILIO_WHATSAPP_NUMBER=whatsapp:+1XXXXXXXXXX

# Social Media (R2+)
META_APP_ID=<from Meta developer console>
META_APP_SECRET=<from Meta developer console>
SOCIAL_ENCRYPTION_KEY=<32-char random string for token encryption>
NEXT_PUBLIC_META_APP_ID=<same as META_APP_ID>

# Kling AI Video (R3+)
KLING_API_BASE_URL=<kling API endpoint>
KLING_IMAGE_API_BASE_URL=<kling image endpoint>

# Vault (if using encrypted secrets)
# Run: bash scripts/vault.sh decrypt
```

### Setting Env Vars in Vercel

1. Go to https://vercel.com → your project → Settings → Environment Variables
2. Add each variable above
3. Set scope to "Production" (and optionally "Preview")
4. Redeploy after adding/changing env vars

---

## 4. Database Migrations

### Supabase Access

```bash
# Project ref: qcohfohjihazivkforsj
# Dashboard: https://supabase.com/dashboard/project/qcohfohjihazivkforsj
# SQL Editor: https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new
```

### Running Migrations

**Option A: Via CLI (if access token available)**
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase db query --linked -f supabase/migrations/<file>.sql
```

**Option B: Via Dashboard**
1. Open SQL Editor (link above)
2. Paste migration SQL
3. Click Run

### Migration Status

All migrations through 065 should be applied. Verify:
```sql
SELECT COUNT(*) FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'realtor_id';
-- Should return 65+ (one per table that has realtor_id)
```

---

## 5. Cron Jobs

Configured in `vercel.json`. Vercel runs them automatically on the configured schedule.

### R1 Crons (Active)

| Cron | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/process-workflows` | Daily 9 AM UTC | Process journey workflows, generate email drafts |
| `/api/cron/daily-digest` | Daily 8 AM UTC | Send realtor overnight summary email |
| `/api/cron/consent-expiry` | Weekly Mon 6 AM | Check CASL consent expiry |
| `/api/cron/weekly-learning` | Weekly Sun 3 AM | AI learning cycle — analyse outcomes |
| `/api/cron/agent-scoring` | Every 15 min | Lead scoring updates |
| `/api/cron/agent-evaluate` | Every 10 min | Contact evaluation |
| `/api/cron/agent-recommendations` | Hourly | Next-best-action recommendations |

### R2+ Crons (Add when releasing)

```json
// Add to vercel.json for R2 (Social):
{ "path": "/api/cron/social-publish", "schedule": "*/5 * * * *" }

// Add for R3 (Sites):
{ "path": "/api/cron/rag-backfill", "schedule": "0 2 * * *" }
```

All crons require `Authorization: Bearer $CRON_SECRET` header. Vercel sends this automatically.

> **Note:** `FLAG_PROCESS_WORKFLOWS` must be ON on the Newsletter Agent (Render) for workflow step processing. When that flag is ON, disable the `/api/cron/process-workflows` Vercel cron in `vercel.json` to avoid double-processing. See `docs/DEPLOYMENT_GUIDE.md` §2 for the full rollout sequence.

---

## 6. Pre-Deployment Checklist

### Before Every Deploy

- [ ] `npm run build` passes with 0 errors
- [ ] `node scripts/test-multi-tenancy.mjs` — 61/61 pass
- [ ] `node scripts/test-social-media.mjs` — 194/194 pass
- [ ] `git status` — clean working tree
- [ ] No hardcoded secrets in code (`grep -r "sk-\|sbp_\|eyJ" src/` returns nothing)

### First-Time Production Deploy

- [ ] All env vars set in Vercel dashboard
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain (NOT localhost)
- [ ] `CRON_SECRET` set (strong random string)
- [ ] Supabase migrations applied (through 065)
- [ ] Backfill verified: `SELECT COUNT(*) FROM contacts WHERE realtor_id IS NOT NULL`
- [ ] Delete test endpoint: `rm src/app/api/test/generate-newsletter/route.ts`
- [ ] Resend webhook configured: URL = `https://your-app.vercel.app/api/webhooks/resend`
- [ ] Twilio webhook configured: URL = `https://your-app.vercel.app/api/webhooks/twilio`
- [ ] Google OAuth redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
- [ ] Demo login tested

### After Deploy

- [ ] Login page loads at production URL
- [ ] Demo login works
- [ ] Can create a contact
- [ ] Can create a listing
- [ ] Newsletter page loads
- [ ] Cron jobs running (check Vercel dashboard → Cron Jobs tab)
- [ ] Logo animation loads on login page (iframe at `/logo-animated.html`)
- [ ] Sidebar logo loads (iframe at `/logo-sidebar.html`)

---

## 7. Deploy Steps

### Standard Deploy (dev → main)

```bash
# 1. Ensure on dev branch with latest
git checkout dev && git pull origin dev

# 2. Build and test locally
npm run build
node scripts/test-multi-tenancy.mjs
node scripts/test-social-media.mjs

# 3. Push to dev (if not already)
git push origin dev

# 4. Create PR: dev → main
gh pr create --base main --title "Release: <description>" --body "..."

# 5. Merge PR (triggers Vercel auto-deploy)
gh pr merge <number> --merge

# 6. Verify production
curl -s -o /dev/null -w "%{http_code}" https://your-app.vercel.app/login
# Should return 200
```

### Hotfix Deploy

```bash
# 1. Branch from main
git checkout main && git pull origin main
git checkout -b hotfix/<description>

# 2. Fix, build, test
# ... make changes ...
npm run build

# 3. PR directly to main
gh pr create --base main --title "hotfix: <description>"
gh pr merge <number> --merge

# 4. Backport to dev
git checkout dev && git merge main && git push origin dev
```

---

## 8. Rolling Out Features to Production

### Enabling a Module for All New Users

1. Edit `src/lib/features.ts`
2. Change `CURRENT_RELEASE_FEATURES` to the next release constant
3. Commit, push, deploy

```typescript
// Example: Enable Social Media for all new users
export const CURRENT_RELEASE_FEATURES = R2_FEATURES;
```

### Enabling a Module for Specific Users (Beta)

```sql
-- Enable social for one specific realtor
UPDATE users
SET enabled_features = '["listings","contacts","showings","calendar","tasks","forms","newsletters","automations","social"]'::jsonb
WHERE email = 'beta-tester@example.com';
```

### Adding New Crons for a Module

1. Add cron entry to `vercel.json`
2. Commit and deploy
3. Verify in Vercel dashboard → Cron Jobs

### Adding New Env Vars for a Module

1. Add to Vercel dashboard → Settings → Environment Variables
2. Redeploy (Vercel requires redeploy to pick up new env vars)

---

## 9. Monitoring & Troubleshooting

### Key URLs

| Service | URL |
|---------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Supabase Dashboard | https://supabase.com/dashboard/project/qcohfohjihazivkforsj |
| Resend Dashboard | https://resend.com/dashboard |
| Supabase SQL Editor | https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new |

### Common Issues

**Build fails with TypeScript errors:**
- Run `npm run build` locally to see errors
- Most common: implicit `any` types from tenant client — add `: any` annotation

**Cron jobs not running:**
- Check Vercel dashboard → Cron Jobs tab
- Verify `CRON_SECRET` env var is set
- Test manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/process-workflows`

**Email links point to localhost:**
- Set `NEXT_PUBLIC_APP_URL` in Vercel env vars
- Redeploy

**Logo animation blank or broken:**
- Verify `public/logo-animated.html` and `public/logo-sidebar.html` are committed to git
- Check browser console for iframe load errors — the files must be served at `/logo-animated.html` and `/logo-sidebar.html`
- Confirm `src/middleware.ts` has `pathname.startsWith("/logo-")` in the public routes list (it does by default)

**User can't see a feature:**
- Check their `enabled_features` in users table
- Update via SQL if needed

**Data not showing after login:**
- Check `realtor_id` is set on the user's data
- Verify tenant client is being used (not raw admin client)

### Rollback

1. Vercel: Redeploy previous deployment from Vercel dashboard → Deployments → click "..." → "Redeploy"
2. Database: Migrations are additive — no rollback needed for column additions
3. Code: `git revert HEAD && git push origin main`

---

## 10. Security Checklist

- [x] Multi-tenancy: `realtor_id` on all tables, tenant client auto-filters
- [x] No hardcoded secrets in source code
- [x] Cron endpoints require `CRON_SECRET`
- [x] OAuth tokens encrypted (AES-256-GCM)
- [x] Webhook signatures validated (Twilio, Resend)
- [x] Demo credentials from env vars only (no fallback)
- [ ] HMAC-signed unsubscribe links (P1 — plain UUID for now)
- [ ] Cookie consent banner (P1)
- [ ] Rate limiting on auth endpoints (P2)

---

## 11. Architecture Overview

```
Browser → Vercel (Next.js 16) → Supabase (PostgreSQL)
                ↓                       ↓
           Server Actions          RLS Policies
           (tenant-scoped)        (defense-in-depth)
                ↓
         External Services:
         ├── Anthropic (Claude AI)
         ├── Resend (email delivery)
         ├── Twilio (SMS/WhatsApp)
         ├── Google (OAuth + Calendar)
         └── Meta (Facebook/Instagram — R2+)
```

### Multi-Tenancy
- Every query uses `getAuthenticatedTenantClient()` which auto-injects `.eq("realtor_id", id)`
- Every insert auto-adds `realtor_id`
- Trigger prevents `realtor_id` modification
- RLS policies as defense-in-depth

### Feature Gating
- `features.ts` defines `CURRENT_RELEASE_FEATURES`
- `auth.ts` assigns features to new users
- `AppHeader.tsx` filters nav by features
- `page.tsx` (dashboard) filters tiles by features

---

## 12. Onboarding System

### Database Migration

**Migration 103** (`supabase/migrations/103_onboarding_sample_data.sql`) must be applied. It adds:
- `is_sample` boolean column on `contacts`, `listings`, `appointments`, and `newsletters` tables (defaults to `false`)
- `onboarding_nps` table for storing Net Promoter Score survey responses

Run via SQL Editor or CLI before deploying the onboarding feature:
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase db query --linked -f supabase/migrations/103_onboarding_sample_data.sql
```

### Welcome Drip Cron

The 7-email welcome drip sequence is triggered by the `/api/cron/welcome-drip` endpoint. It requires:
- `RESEND_API_KEY` set in environment (Vercel or Render)
- `RESEND_FROM_EMAIL` set to verified sender domain
- `CRON_SECRET` for authorization header

Add to `vercel.json` if not already present:
```json
{ "path": "/api/cron/welcome-drip", "schedule": "0 9 * * *" }
```

### NPS Endpoint

`POST /api/onboarding/nps` accepts NPS survey responses after onboarding checklist completion. No additional env vars required beyond standard Supabase credentials.

### Sample Data Seeding

When a new user completes onboarding, sample data is seeded automatically:
- 5 contacts (diverse types: buyer, seller, investor, referral, past client)
- 3 listings (different statuses and property types)
- 2 showings (upcoming and completed)
- 1 newsletter (draft with sample content)

All sample records have `is_sample = true` so they can be identified and cleaned up later.

---

## 13. Bulk Operations & Print Styles (2026-04-12)

### Bulk Contact Operations
Three new server actions (NOT API routes) in `src/actions/contacts.ts`:
- **bulkUpdateContactStage** — validates stage against allowlist + per-contact type validation via `validateStageForType()`. Skips incompatible types.
- **bulkDeleteContacts** — checks for active/pending/conditional listings before allowing delete. Multi-tenant safe.
- **bulkExportContacts** — CSV export with formula injection protection (escapes `=`, `+`, `@`, `-` prefixes). Export happens client-side via Blob URL.

**No new API routes, no new migrations, no new env vars required.**

### Print Styles
`@media print` rules in `globals.css` hide nav/sidebar/fixed elements and reset backgrounds to white. No deployment impact.

### Color Contrast Fix
`--muted-foreground` changed from `#516f90` to `#476380` (5.2:1 ratio on `#f5f8fa` background). Passes WCAG AA.

---

*Production Deployment Guide v2.3 — April 12, 2026*

<!-- Last reviewed: 2026-04-21 -->


<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->
