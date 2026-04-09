# Realtors360 — Local Deployment Guide

**For developers pulling the latest changes and setting up locally.**

---

## Quick Start (5 minutes)

```bash
# 1. Clone or pull latest
git clone https://github.com/realtorcrmai/realtorai.git
cd realtorai

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env.local   # Then fill in the values below

# 4. Run database migrations
# See "Database Setup" section below

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

Create `.env.local` in the project root with these values:

```bash
# ═══════════════════════════════════════
# REQUIRED — App won't start without these
# ═══════════════════════════════════════

# Supabase (get from: supabase.com/dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://qcohfohjihazivkforsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-string>   # Generate: openssl rand -base64 32

# Demo Login
DEMO_EMAIL=demo@realestatecrm.com
DEMO_PASSWORD=demo1234

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ═══════════════════════════════════════
# EMAIL MARKETING (required for newsletters)
# ═══════════════════════════════════════

# Resend (get from: resend.com/api-keys)
RESEND_API_KEY=<your-resend-api-key>
RESEND_FROM_EMAIL=onboarding@resend.dev    # Use resend.dev for testing

# Anthropic Claude AI (get from: console.anthropic.com)
ANTHROPIC_API_KEY=<your-anthropic-key>

# Cron Protection
CRON_SECRET=<random-string>   # Protects /api/cron/* endpoints

# AI Agent (optional)
AI_SEND_ADVISOR=true           # Enable send/skip/swap advisor

# ═══════════════════════════════════════
# OPTIONAL — Features work without these
# ═══════════════════════════════════════

# Google OAuth (for Google login + Calendar)
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>

# Twilio (for SMS/WhatsApp showing notifications)
TWILIO_ACCOUNT_SID=<twilio-sid>
TWILIO_AUTH_TOKEN=<twilio-token>
TWILIO_PHONE_NUMBER=<twilio-phone>
TWILIO_WHATSAPP_NUMBER=whatsapp:<twilio-whatsapp>

# Resend Webhook (for click/open tracking)
RESEND_WEBHOOK_SECRET=<webhook-secret>   # From Resend dashboard → Webhooks

# Admin
ADMIN_EMAIL=demo@realestatecrm.com   # This email gets admin role on first login
```

---

## Database Setup

### Option 1: Supabase CLI (Recommended)

```bash
# Install Supabase CLI (if not installed)
npx supabase --version

# Generate an access token at: supabase.com/dashboard/account/tokens

# Link your project
SUPABASE_ACCESS_TOKEN=<your-token> npx supabase link --project-ref qcohfohjihazivkforsj

# Run ALL migrations
for f in supabase/migrations/*.sql; do
  echo "Running $(basename $f)..."
  SUPABASE_ACCESS_TOKEN=<your-token> npx supabase db query --linked -f "$f"
done
```

### Option 2: Supabase SQL Editor

1. Go to https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql
2. Open each migration file in `supabase/migrations/` (in numerical order)
3. Paste the SQL and click "Run"

### Migration Order

Run these in order (later ones depend on earlier ones):

```
001_initial_schema.sql          ← Core tables (contacts, listings, etc.)
002_add_tasks.sql               ← Tasks table
003_allow_anon_role.sql
004_form_templates_and_submissions.sql
005_content_engine.sql
006_users_and_features.sql
007_contact_enhancements.sql
008_deals_pipeline.sql
009_contact_lifecycle.sql
010_user_integrations.sql
011_contact_detail_features.sql
012_seed_sample_data.sql        ← Sample data
013_mortgages.sql
014_workflow_automation.sql     ← Workflow engine tables
015_lifecycle_workflows.sql
016_newsletter_journey_engine.sql  ← Newsletter tables
017_seed_mortgage_data.sql
018_stage_bar.sql
019_family_openhouse_stats.sql
020_unify_email_engine.sql      ← Merge journey into workflows
021_email_template_builder.sql
022_partner_contact_type.sql
023_seed_family_openhouse_data.sql
024_feature_overrides.sql
025_referrals_table.sql
026_visual_workflow_builder.sql
027_extension_tasks.sql
028_segments_ab_testing.sql     ← Contact segments
029_seller_preferences.sql
030_ai_agent.sql                ← AI scoring + recommendations
031_last_activity_date.sql
032_seed_buyer_completed_purchases.sql
033_fix_stage_bar_consistency.sql
034_seed_seller_completed_sales.sql
035_contact_intelligence.sql    ← Households, relationships
036_seed_mortgage_renewals_soon.sql
037_cleanup_relationship_types.sql
038_object_linking_improvements.sql
039_contact_consistency_trigger.sql
040_reset_seed_data.sql         ← Clean seed data reset
041_agent_event_pipeline.sql
042_enable_realtime.sql
043_lead_scoring_and_activities.sql
044_progressive_trust.sql
045_offers.sql
046_under_contract_workflow.sql
047_data_integrity_fixes.sql
048_drop_english_tutor.sql
```

---

## Health Check (Run This First!)

After pulling new changes, run the automated health check:

```bash
bash scripts/health-check.sh
```

This checks everything in ~20 seconds: git status, env vars, DB connectivity, build state, dev server, Netlify deploy, and migrations. Fix any ❌ items before starting work.

To save a snapshot of the current working state:
```bash
bash scripts/save-state.sh
```

---

## Verify Setup

### 1. Start the server
```bash
npm run dev
# Should see: ✓ Ready in ~1500ms
# Open: http://localhost:3000
```

### 2. Login
- Go to http://localhost:3000/login
- Email: `demo@realestatecrm.com`
- Password: `demo1234`

### 3. Check features
- Dashboard: http://localhost:3000
- Newsletters: http://localhost:3000/newsletters
- Newsletter Guide: http://localhost:3000/newsletters/guide
- Approval Queue: http://localhost:3000/newsletters/queue
- Templates: http://localhost:3000/automations/templates
- Segments: http://localhost:3000/contacts/segments

### 4. Run QA tests (optional)
```bash
RESEND_API_KEY=<key> \
ANTHROPIC_API_KEY=<key> \
CRON_SECRET=<secret> \
node scripts/qa-test-email-engine.mjs
```
Expected: 27/28 pass

---

## Services

| Service | Port | Purpose |
|---------|------|---------|
| CRM (Next.js) | 3000 | Main application |
| Voice Agent | 8768 | Python voice agent (`voice_agent/server/main.py`, optional) |
| Form Server | 8767 | BCREA form generation (Python, optional) |
| Website Agent | 8769 | AI website generator (`realtors360-agent/`, optional, separate service) |

### Start Voice Agent (optional)
```bash
source voice_agent/venv/bin/activate
python voice_agent/server/main.py
# → http://localhost:8768
```

### Start Website Agent (optional)
```bash
cd ./realtors360-agent
npm install
npm run dev
# → http://localhost:8769
```

---

## Cron Jobs

These endpoints need to be called periodically (via external scheduler or manual curl).

> **Note:** CI/CD deploys go through **Netlify** (not Vercel). The `vercel.json` file exists only for cron job configuration — it does not affect deployments. Do not use `vercel deploy`.

| Endpoint | Frequency | Purpose |
|----------|-----------|---------|
| `GET /api/cron/process-workflows` | Every 5 min | Execute due workflow steps |
| `GET /api/cron/agent-scoring` | Every 15 min | AI lead scoring |
| `GET /api/cron/agent-recommendations` | Every 1 hour | AI recommendations |

All require `Authorization: Bearer <CRON_SECRET>` header.

```bash
# Test manually
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/process-workflows
```

---

## Resend Webhook Setup

To enable click/open tracking for newsletters:

1. Go to https://resend.com/webhooks
2. Add webhook URL: `https://<your-domain>/api/webhooks/resend`
3. Select events: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
4. Copy the signing secret → set as `RESEND_WEBHOOK_SECRET` in `.env.local`

For local testing, use [ngrok](https://ngrok.com) or [localtunnel](https://localtunnel.me):
```bash
npx localtunnel --port 3000
# Use the generated URL as webhook endpoint
```

---

## Project Structure

```
realtorai/                      ← Git repo root
├── src/
│   ├── app/                    ← Next.js pages (App Router)
│   ├── actions/                ← Server actions (mutations)
│   ├── emails/                 ← React Email templates (6 types)
│   ├── components/             ← React components
│   ├── lib/                    ← Utilities, API wrappers, AI agent
│   ├── hooks/                  ← React hooks
│   └── types/                  ← TypeScript types
├── supabase/migrations/        ← Database migrations (40 files)
├── scripts/                    ← QA test runner
├── docs/functional-specs/      ← Technical documentation
├── realtors360-agent/          ← Website generator service
├── CLAUDE.md                   ← AI assistant instructions
├── deploy.md                   ← This file
├── evals.md                    ← 200 QA test cases
└── Plan.md                     ← Product roadmap
```

---

## Recent Breaking Changes (March 2026)

If you pulled and things broke, check these:

1. **Migrations renumbered (001→048)** — All migrations were renumbered with sequential unique prefixes. If you had local migration files with the old numbers (e.g. `019_reset_seed_data.sql`), they're now `040_reset_seed_data.sql`. Run any new ones in order.

2. **`app/` directory renamed to `app-backup/`** — The root `app/` folder was a duplicate project that broke the Next.js build. It's now `app-backup/`. If you recreated `app/`, remove it or rename it.

3. **Tabs component switched to Radix** — `src/components/ui/tabs.tsx` now uses `@radix-ui/react-tabs` instead of `@base-ui/react/tabs`. Run `npm install` to get the new dependency.

4. **Data integrity migration (047)** — Adds unique constraints, CHECK constraints, and triggers. If your DB doesn't have these, run: `supabase db query --linked -f supabase/migrations/047_data_integrity_fixes.sql`

5. **Cron endpoints require CRON_SECRET** — Both `/api/cron/agent-scoring` and `/api/cron/process-workflows` now return 500 if `CRON_SECRET` env var is not set. Make sure it's in your `.env.local`.

6. **Zod validation on 11 API routes** — POST endpoints for deals, parties, checklist, mortgages, family, dates, open-houses, forms/save, and voice-agent/contacts now validate input with Zod. Invalid payloads return 400.

---

## Troubleshooting

### "newsletters table missing"
Run migration `016_newsletter_journey_engine.sql` in Supabase.

### Cron endpoints return 401
Add `/api/cron` to middleware exemptions in `src/middleware.ts` (already done in latest code).

### "RESEND_API_KEY is not set"
Add `RESEND_API_KEY` to `.env.local`. Get a free key at resend.com.

### Build fails with type errors
```bash
npm run build
```
If you see errors from `realtors360-agent/` code, sync the agent files:
```bash
cp ../realtors360-agent/src/tools/screenshot.ts realtors360-agent/src/tools/screenshot.ts
```

### Turbopack workspace root warning
Harmless warning caused by multiple `package-lock.json` files. Fixed via `turbopack.root` in `next.config.ts`.

### Build picks up files from app-backup/ or agent-pipeline/
These directories are excluded in `tsconfig.json`. If you see errors from them, check that `"exclude"` in `tsconfig.json` includes: `["node_modules", "app", "app-backup", "agent-pipeline", "content-generator", "realtors360-agent"]`

### Contact tabs not switching (Intelligence, Activity, Deals)
The tabs component was upgraded from Base UI to Radix. Run `npm install` to get `@radix-ui/react-tabs`.

### After pulling: "Module not found" or missing types
```bash
rm -rf node_modules .next && npm install && npm run build
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | NextAuth v5 (JWT sessions) |
| Styling | Tailwind CSS v4 + Realtors360 design system |
| Email | Resend API + React Email templates |
| AI | Anthropic Claude SDK (content generation + lead scoring) |
| SMS/WhatsApp | Twilio |
| Calendar | Google Calendar API |
| Workflow Editor | React Flow (@xyflow/react) |
| Charts | Recharts |
