# Realtors360 — Production Deployment Guide

> **Last Updated:** April 1, 2026
> **Current Release:** R1 (CRM + Email Marketing)
> **Deploy Target:** Vercel + Supabase
> **Read by:** Any Claude client or developer deploying this app

---

## Quick Reference

```bash
# Build and verify locally
npm run build                    # must pass with 0 errors
node scripts/test-multi-tenancy.mjs  # 61 tests must pass
node scripts/test-social-media.mjs   # 194 tests must pass

# Deploy
git push origin dev              # CI runs automatically
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

## 2. Environment Variables

### Required for R1 (App Breaks Without These)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ybgiljuclpsuhbmdhust.supabase.co
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

## 3. Database Migrations

### Supabase Access

```bash
# Project ref: ybgiljuclpsuhbmdhust
# Dashboard: https://supabase.com/dashboard/project/ybgiljuclpsuhbmdhust
# SQL Editor: https://supabase.com/dashboard/project/ybgiljuclpsuhbmdhust/sql/new
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

## 4. Cron Jobs

Configured in `vercel.json`. These run automatically on Vercel.

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

---

## 5. Pre-Deployment Checklist

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

---

## 6. Deploy Steps

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

## 7. Rolling Out Features to Production

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

## 8. Monitoring & Troubleshooting

### Key URLs

| Service | URL |
|---------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Supabase Dashboard | https://supabase.com/dashboard/project/ybgiljuclpsuhbmdhust |
| Resend Dashboard | https://resend.com/dashboard |
| Supabase SQL Editor | https://supabase.com/dashboard/project/ybgiljuclpsuhbmdhust/sql/new |

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

## 9. Security Checklist

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

## 10. Architecture Overview

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

*Production Deployment Guide v2.0 — April 1, 2026*
