# Realtors360 CRM — Production Deployment Guide

## Pre-Deployment Checklist

### Critical Blockers (Must Fix Before Production)

**MULTI-TENANCY (P0 — Launch Blocker, found 2026-03-30):**
- [ ] **Add `realtor_id` column** to ALL core tables (contacts, listings, appointments, communications, newsletters, contact_journeys, tasks, deals, etc.)
- [ ] **Rewrite ALL RLS policies** — change `auth.role() = 'authenticated'` → `auth.uid() = realtor_id` on every table
- [ ] **Remove anon access** — DROP all policies from migration 003 (anon full access on contacts, listings, appointments, communications, listing_documents)
- [ ] **Remove `USING (true)` policies** on: agent_events, agent_decisions, contact_instructions, rag_embeddings, competitive_emails
- [ ] **Without these fixes:** Realtor A can see all of Realtor B's contacts, listings, emails, and data

**API SECURITY (P0):**
- [ ] **Unauthenticated API Routes**: Add auth checks to these middleware-bypassed routes that have write access:
  - `POST /api/contacts/log-interaction` — writes to communications + activity_log
  - `POST /api/contacts/context` — modifies contact records
  - `POST /api/contacts/instructions` — modifies handling instructions
  - `POST /api/contacts/watchlist` — modifies watchlist
  - `POST /api/contacts/journey` — modifies journey data
  - `POST /api/newsletters/edit` — modifies newsletters
  - `POST /api/listings/blast` — sends bulk emails to any address
- [ ] **Remove hardcoded CRON secret** from `src/components/dashboard/DailyDigestCard.tsx` — fallback `"listingflow-cron-secret-2026"` is exposed in client JS
- [ ] **Remove hardcoded demo credentials** from `src/lib/auth.ts` — fallback `demo@realestatecrm.com / demo1234`
- [ ] **HMAC-signed unsubscribe links** — current implementation uses plain contact UUID (enumeration risk)

**ENVIRONMENT:**
- [ ] **Set `NEXT_PUBLIC_APP_URL`**: Without this, all email links point to `http://localhost:3000`
- [ ] **Remove test endpoint**: Delete or gate `src/app/api/test/generate-newsletter/route.ts`

**PRIVACY/COMPLIANCE (P1):**
- [ ] **Cookie consent banner** — PIPEDA/CASL requires consent before tracking
- [ ] **Data deletion endpoint** — PIPEDA right-to-erasure requirement
- [ ] **CASL consent expiry** — cron exists but logic incomplete

### High Priority

- [ ] **Fix duplicate migration numbers**: 050, 051, 052, 053 each have two files
- [ ] **Add missing crons to vercel.json**: `agent-evaluate`, `agent-recommendations`, `agent-scoring`
- [ ] **Implement consent re-confirmation**: `api/cron/consent-expiry` finds expiring consents but TODO at line 49 means it never sends re-confirmation emails (CASL compliance gap)
- [ ] **Configure `next.config.ts`**: Add security headers (CSP, HSTS, X-Frame-Options), image domain allowlist, CORS

### Medium Priority

- [ ] **Remove `moment.js`** from package.json (unused, adds ~300KB)
- [ ] **Remove `@netlify/plugin-nextjs`** from devDependencies (deploying to Vercel)
- [ ] **Remove console.log statements** from production paths (10 instances, including `src/lib/email/send.ts` which logs full email payloads)
- [ ] **Pin next-auth version**: v5.0.0-beta.30 — beta releases can break between versions

---

## Environment Variables

### Required (App Breaks Without These)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# App URL (CRITICAL — used in all email links)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Required for Features

```bash
# Google OAuth + Calendar + Gmail
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Twilio (SMS + WhatsApp)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+1xxx

# Anthropic (AI content generation)
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Resend (Email engine)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=hello@yourdomain.com
RESEND_WEBHOOK_SECRET=whsec_xxx

# Cron Authentication
CRON_SECRET=<generate a strong random string>

# Kling AI (Video/Image generation)
KLING_API_BASE_URL=https://xxx
KLING_IMAGE_API_BASE_URL=https://xxx

# Demo Auth (override defaults)
DEMO_EMAIL=demo@yourcompany.com
DEMO_PASSWORD=<strong password>
```

### Optional

```bash
# Email monitoring (BCC all outgoing emails)
EMAIL_MONITOR_BCC=admin@yourcompany.com

# AI Agent features
AI_SEND_ADVISOR=true
AI_SCORING_MODEL=claude-sonnet-4-20250514

# External services
CONTENT_GENERATOR_URL=https://your-content-service.com
NEXT_PUBLIC_VOICE_AGENT_URL=https://your-voice-agent.com
REALTORS360_URL=https://your-form-server.com
```

---

## External Services Setup

### 1. Supabase
- Create project at supabase.com
- Run all migrations in `supabase/migrations/` (fix duplicate numbers first)
- **Fix RLS policies** before going live
- Enable realtime for `newsletters`, `newsletter_events`, `agent_notifications` tables

### 2. Vercel
- Connect GitHub repo
- Set all environment variables in Vercel dashboard
- Cron jobs auto-configure from `vercel.json`:
  - `process-workflows` — daily 9 AM
  - `daily-digest` — daily 8 AM
  - `consent-expiry` — weekly Monday 6 AM
  - `weekly-learning` — weekly Sunday 3 AM
- Add missing crons: `agent-evaluate`, `agent-recommendations`, `agent-scoring`

### 3. Resend
- Verify sending domain (DNS records)
- Configure webhook in Resend dashboard:
  - URL: `https://your-app.vercel.app/api/webhooks/resend`
  - Events: `email.opened`, `email.clicked`, `email.bounced`, `email.delivered`, `email.complained`
- Set `RESEND_WEBHOOK_SECRET` from Resend dashboard

### 4. Google Cloud
- Create OAuth 2.0 credentials (Web application)
- Add redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
- Enable APIs: Google Calendar API, Gmail API
- Scopes needed: `calendar.readonly`, `calendar.events`, `gmail.send`, `gmail.readonly`

### 5. Twilio
- Get Account SID + Auth Token from Twilio console
- Buy a phone number for SMS
- Configure WhatsApp sandbox or approved sender
- Set webhook URL: `https://your-app.vercel.app/api/webhooks/twilio`

### 6. Anthropic
- Get API key from console.anthropic.com
- Ensure billing is set up (AI content generation costs ~$0.01-0.05 per email)

---

## Database Migrations

```bash
# From realestate-crm/ directory
npx supabase db push

# Or manually in Supabase SQL editor, run in order:
# 001_initial_schema.sql through 053_*.sql
# IMPORTANT: Fix duplicate numbers (050, 051, 052, 053) before running
```

### Seed Data

```bash
# Seed demo data (29 contacts, 84 emails, 129 events)
node scripts/seed-demo.mjs

# Seed workflow steps (108 steps across 7 workflows)
# Already seeded if scripts/test-workflow-emails.mjs was run

# Seed newsletter templates
# Handled by migration 016_newsletter_journey_engine.sql
```

---

## Deployment Steps

```bash
# 1. Fix critical blockers (RLS, auth, env vars)

# 2. Build locally to verify
npm run build

# 3. Run test suite
node scripts/test-email-marketing-ui.mjs

# 4. Deploy to Vercel
vercel --prod

# 5. Set env vars in Vercel dashboard
# (from vault: ./scripts/vault.sh status)

# 6. Run migrations on production Supabase
npx supabase db push --linked

# 7. Seed production data
node scripts/seed-demo.mjs  # only for demo/staging

# 8. Configure Resend webhook (URL above)

# 9. Verify cron jobs fire at scheduled times

# 10. Test email flow end-to-end:
#   - Create contact → journey auto-enrolls
#   - Cron fires → AI generates draft
#   - Review in queue → Approve → Resend sends
#   - Open email → webhook fires → intelligence updates
```

---

## Tech Debt Summary

| Category | Count | Severity | Root Cause |
|----------|-------|----------|------------|
| `as any` type casts | 100+ | High | `database.ts` missing types for 30+ tables |
| Unauthenticated API routes | 10 | Critical | Middleware bypass list too broad |
| RLS anon full access | All tables | Critical | Migration 003 + pattern repeated |
| Duplicate migration numbers | 4 pairs | High | Manual file naming |
| Console.log in prod | 10 | Medium | No lint rule enforcing removal |
| Hardcoded localhost URLs | 8 | High | Missing env var fallbacks |
| Unused dependencies | 2 | Low | moment.js, @netlify/plugin-nextjs |
| Missing cron schedules | 3 | High | Not in vercel.json |
| TODO comments | 8 | Medium | Incomplete implementations |
| force-dynamic on all pages | 34 | Medium | No static optimization |

### Priority Fix Order
1. RLS policies (security blocker)
2. API route authentication (security blocker)
3. `NEXT_PUBLIC_APP_URL` enforcement (email links broken without it)
4. Duplicate migrations (data integrity)
5. Missing crons in vercel.json (features don't run)
6. `database.ts` type coverage (enables fixing 100+ `as any`)
7. Security headers in next.config.ts
8. Console.log removal
9. Unused dependency cleanup
10. Static optimization where possible

---

## Monitoring

### Health Checks
- `GET /api/auth/session` — auth working
- `GET /api/cron/process-workflows` with Bearer token — cron accessible

### Key Metrics to Watch
- Email delivery rate (Resend dashboard)
- Open/click rates (newsletter_events table)
- Queue backlog (newsletters with status=draft)
- Error rate (newsletters with status=failed)
- Contact intelligence scores (trending up = AI working)

### Alerts to Set Up
- Email bounce rate > 5%
- Cron job failure (Vercel dashboard)
- Supabase connection errors
- Anthropic API credit exhaustion
