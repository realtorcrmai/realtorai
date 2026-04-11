# Deployment Guide — Realtors360

> Centralized reference for deploying every component of the Realtors360 platform.
> Last updated: 2026-04-10. Read this before touching any deployment.

---

## Quick Reference

| Service | Port | Platform | Branch | Status |
|---------|------|----------|--------|--------|
| **CRM (Next.js)** | 3000 | Vercel | `dev` → Preview | **LIVE** |
| **Newsletter Agent** | 8080 | Render ($7/mo) | `dev` (root: `realtors360-newsletter`) | **LIVE** — all flags ON |
| **Website Agent** | 8768 | Local / Railway (planned) | — | Local only |
| **Form Server** | 8767 | Local | — | Local only |
| **Voice Agent** | 8768 | Local | — | Local only |

**Database:** Supabase project `qcohfohjihazivkforsj` — shared by CRM + Newsletter Agent.

**Repo:** `https://github.com/realtorcrmai/realtorai`

---

## 1. CRM (Next.js on Vercel)

### How it deploys
Push to `dev` → Vercel auto-deploys to Preview. Push to `main` → Vercel auto-deploys to Production. Both go through GitHub Actions CI first (typecheck, lint, build).

### Environment variables
Set in Vercel dashboard → Settings → Environment Variables. Pull locally with:
```bash
vercel env pull .env.local --environment=preview
```

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://qcohfohjihazivkforsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-jwt>
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>
NEXTAUTH_URL=<deployed-url>
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_APP_URL=<deployed-url>
DEMO_EMAIL=demo@realestatecrm.com
DEMO_PASSWORD=demo1234
CRON_SECRET=<openssl rand -hex 32>
ANTHROPIC_API_KEY=<from console.anthropic.com>
RESEND_API_KEY=<from resend.com>
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Optional (features disabled without):**
```
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   # Google OAuth + Calendar
TWILIO_ACCOUNT_SID / AUTH_TOKEN / PHONE   # SMS/WhatsApp
RESEND_WEBHOOK_SECRET                     # Email event tracking
VOYAGE_API_KEY                            # RAG embeddings
```

### Cron jobs (vercel.json)
7 scheduled jobs, all require `Authorization: Bearer $CRON_SECRET`:

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/process-workflows` | Daily 9 AM UTC | Workflow step processing (will be replaced by newsletter service M3-E) |
| `/api/cron/daily-digest` | Daily 8 AM UTC | Morning digest for realtors |
| `/api/cron/consent-expiry` | Mon 6 AM UTC | CASL consent expiry check |
| `/api/cron/weekly-learning` | Sun 3 AM UTC | Adaptive marketing learning |
| `/api/cron/agent-scoring` | Daily 7 AM UTC | Lead scoring |
| `/api/cron/agent-evaluate` | Daily 12 PM UTC | Agent evaluation |
| `/api/cron/agent-recommendations` | Daily 10 AM UTC | Next-best-action recommendations |

### Deploy steps (manual)
```bash
cd "/Users/bigbear/reality crm/realestate-crm"
git checkout dev && git pull
npm install && npm run build          # Verify build locally
# Push triggers auto-deploy:
git push origin dev                   # → Preview
# For production:
# Create PR dev → main, get 1 approval, merge → Production
```

### Validate after deploy
```bash
bash scripts/test-suite.sh            # 73+ tests
# Or use /test slash command
```

---

## 2. Newsletter Engine (Node.js on Render)

### Overview
Standalone service at `realtors360-newsletter/` inside the CRM repo. Express + node-cron + Claude agent. Handles long-running email workflows that time out on Vercel.

### Deploy to Render (first time)

1. **Go to** https://dashboard.render.com → New Web Service
2. **Connect** GitHub repo `realtorcrmai/realtorai`
3. **Settings:**
   - Root Directory: `realtors360-newsletter`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Starter ($7/mo)
   - Health Check Path: `/health`
   - Branch: `main`
4. **Set environment variables:**

```
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Database (same Supabase as CRM)
NEXT_PUBLIC_SUPABASE_URL=https://qcohfohjihazivkforsj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>

# AI
ANTHROPIC_API_KEY=<same key as CRM>
VOYAGE_API_KEY=<optional — for RAG>

# Email
RESEND_API_KEY=<same key as CRM>
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_WEBHOOK_SECRET=<webhook secret>

# SMS/WhatsApp (for workflow steps)
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=<number>
TWILIO_WHATSAPP_NUMBER=<whatsapp number>

# Inter-service auth
NEWSLETTER_SHARED_SECRET=<generate: openssl rand -hex 32>

# Canary
CANARY_TO_EMAIL=amandhindsa@outlook.com
DEMO_REALTOR_ID=7de22757-dd3a-4a4f-a088-c422746e88d4
```

5. **Deploy.** Render auto-builds on push to `main`.

### Feature flags (all default OFF — enable one at a time)

| Flag | Effect | Enable when |
|------|--------|------------|
| `FLAG_SAVED_SEARCH=on` | Saved search match emails every 15min | Default ON — safe |
| `FLAG_RAG_BACKFILL=on` | Weekly RAG embeddings backfill (Sun 3am) | After verifying Voyage API key works |
| `FLAG_WEEKLY_LEARNING=on` | Adaptive learning cycle (Mon 6am) | After 30+ emails sent |
| `FLAG_AGENT_SCORING=on` | Lead scoring every 15min | After verifying Anthropic key + testing |
| `FLAG_PROCESS_WORKFLOWS=on` | **THE critical flag.** Replaces CRM's Vercel cron. Every 2min. | After 24h monitoring of newsletter service health. **Disable CRM's vercel.json cron when enabling this.** |
| `FLAG_AGENT_TRIAGE=on` | Newsletter AI agent loop (hourly) | After all READ/DECIDE/WRITE tools tested |

### Rollout sequence (recommended)
```
Day 1: Deploy with all flags OFF. Verify /health returns 200.
Day 2: FLAG_SAVED_SEARCH=on (already on by default). Monitor logs.
Day 3: FLAG_RAG_BACKFILL=on. Verify Voyage costs acceptable.
Day 4: FLAG_AGENT_SCORING=on. Monitor Anthropic costs.
Day 5: FLAG_WEEKLY_LEARNING=on. Wait for Monday cycle.
Day 7: FLAG_PROCESS_WORKFLOWS=on. IMMEDIATELY disable CRM cron in vercel.json.
Day 14: FLAG_AGENT_TRIAGE=on. Monitor agent decisions via agent_runs table.
```

### 8 registered crons

| Cron | Schedule | Flag | Purpose |
|------|----------|------|---------|
| check-saved-searches | `*/15 * * * *` | Always on | Match new listings to saved buyer searches |
| check-birthdays | `0 8 * * *` Vancouver | Always on | Send birthday emails |
| rag-backfill | `0 3 * * 0` Vancouver | `FLAG_RAG_BACKFILL` | Embed all CRM data into RAG |
| weekly-learning | `0 6 * * 1` Vancouver | `FLAG_WEEKLY_LEARNING` | 30-day performance analysis |
| agent-scoring | `*/15 * * * *` Vancouver | `FLAG_AGENT_SCORING` | Lead scoring + recommendations |
| process-workflows | `*/2 * * * *` Vancouver | `FLAG_PROCESS_WORKFLOWS` | Workflow step execution (the critical port) |
| agent-triage | `0 * * * *` Vancouver | `FLAG_AGENT_TRIAGE` | AI agent hourly contact evaluation |

### Docker (alternative to Render native)
```bash
cd realtors360-newsletter
docker build -t realtors360-newsletter .
docker run -p 8080:8080 --env-file .env realtors360-newsletter
```

### Validate
```bash
# Health check
curl http://localhost:8080/health

# Metrics
curl http://localhost:8080/metrics

# Run tests
cd realtors360-newsletter && npx vitest run  # 116 tests
```

---

## 3. Database Migrations

### How to run migrations

Direct DB connection is blocked (IPv6-only DNS). Use the Supabase Management API runner:

```bash
# 1. Generate access token at https://supabase.com/dashboard/account/tokens
# 2. Run:
SUPABASE_ACCESS_TOKEN=sbp_... \
SUPABASE_PROJECT_REF=qcohfohjihazivkforsj \
  node scripts/apply-newsletter-migrations.mjs

# Dry run first:
SUPABASE_ACCESS_TOKEN=sbp_... \
SUPABASE_PROJECT_REF=qcohfohjihazivkforsj \
  node scripts/apply-newsletter-migrations.mjs --dry-run
```

### Alternatively, use the Supabase SQL Editor
1. Go to https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new
2. Paste migration SQL
3. Run (wrap destructive operations in `BEGIN; ... ROLLBACK;` first)

### Current migrations (87 files)
- 001-073: Core CRM + contact system
- 074: Newsletter Engine v3 schema (email_events, email_event_rules, saved_searches, market_stats_cache, neighbourhood_data, email_template_registry)
- 075: Newsletter Engine v3 M2 seeds
- 076: Property co-ownership
- 077: Agent recommendations unique index
- 078-085: Various feature migrations
- 086: Newsletter reliability (claim functions, retry columns, dedup indexes)
- 087: Newsletter Agent M5 (agent_runs, agent_decisions, agent_drafts, contact_trust_levels)

### Rollbacks
Located at `supabase/rollbacks/`. Each destructive migration has a matching rollback file.

---

## 4. Website Agent (Planned — not deployed)

### Local development
```bash
cd listingflow-agent
cp .env.example .env   # Edit with Anthropic key + Supabase creds
npm install
npm run dev            # Starts on port 8768
```

### Future deployment (Railway or Fly.io)
Needs Playwright/Chromium for screenshots. The Dockerfile installs Chromium:
```bash
docker build -t listingflow-agent .
docker run -p 8768:8768 --env-file .env listingflow-agent
```

### Environment variables
```
ANTHROPIC_API_KEY=<key>
SUPABASE_URL=https://qcohfohjihazivkforsj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>
PORT=8768
```

---

## 5. Form Server + Voice Agent (Python)

### Local only (no cloud deployment planned yet)
```bash
# Form server
cd voice_agent/server
pip install -r requirements.txt
python main.py                    # Port 8767

# Voice agent (same server, different routes)
# Requires: Python 3.12+, edge-tts, faster-whisper (optional)
```

### Environment variables
```
SUPABASE_URL=https://qcohfohjihazivkforsj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>
ANTHROPIC_API_KEY=<key>
```

---

## 6. CI/CD Pipeline

### GitHub Actions (automatic on every PR)

**Main CI** (`.github/workflows/ci.yml`):
- Runs on: PRs to `dev` or `main`
- Steps: branch policy check → typecheck → lint → build → python syntax check
- Must pass before merge

**Newsletter CI** (`.github/workflows/newsletter-ci.yml`):
- Runs on: PRs touching `realtors360-newsletter/**` or `supabase/migrations/**`
- Steps: typecheck → vitest (116 tests) → build

### Secrets required in GitHub Actions
Set at: https://github.com/realtorcrmai/realtorai/settings/secrets/actions

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_URL=https://realestate-crm-git-dev-amandhindsas-projects.vercel.app
NEXTAUTH_SECRET
ANTHROPIC_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=https://realestate-crm-git-dev-amandhindsas-projects.vercel.app
CRON_SECRET
DEMO_EMAIL=demo@realestatecrm.com
DEMO_PASSWORD=demo1234
```

---

## 7. Local Development (All Services)

### Quick start
```bash
cd "/Users/bigbear/reality crm/realestate-crm"

# 1. Pull + install
git checkout dev && git pull
npm install

# 2. Start CRM
npm run dev                          # Port 3000

# 3. Start newsletter service (separate terminal)
cd realtors360-newsletter
npm run dev                          # Port 8080

# 4. Optional: start other services
cd listingflow-agent && npm run dev  # Port 8768
python voice_agent/server/main.py   # Port 8767
```

### Health checks
```bash
curl localhost:3000                  # CRM
curl localhost:8080/health           # Newsletter
curl localhost:8768/api/health       # Website Agent
curl localhost:8767/health           # Form Server
```

### Run all tests
```bash
# CRM
bash scripts/test-suite.sh          # 73+ tests
npm run test:quick                  # Vitest only

# Newsletter
cd realtors360-newsletter && npx vitest run  # 116 tests
```

---

## 8. Production Checklist (When Ready)

- [ ] Create separate Supabase project for production
- [ ] Run all 87 migrations on prod DB
- [ ] Update Vercel Production env vars to point at prod Supabase
- [ ] Add prod Google OAuth redirect URI
- [ ] Deploy newsletter service to Render (connect to prod Supabase)
- [ ] Verify all crons fire correctly
- [ ] Enable feature flags one at a time (see §2 rollout sequence)
- [ ] Set up Resend production domain (replace `onboarding@resend.dev`)
- [ ] Configure Resend webhook endpoint for production URL
- [ ] Set up monitoring/alerting (Render logs + Supabase metrics)
- [ ] First merge `dev → main` to trigger production deploy
- [ ] Delete orphaned Supabase projects (`ybgiljuclpsuhbmdhust`, `rsfjescdjuubxadfjyxb`)
- [ ] Re-encrypt `.env.vault` with production values

---

## 9. Troubleshooting

**CRM build fails on Vercel:**
- Check GitHub Actions first — if CI passes but Vercel fails, it's usually a missing env var
- Run `vercel env pull .env.local` and build locally to reproduce

**Newsletter service won't start:**
- Check `config.ts` — Zod validates ALL env vars at startup. Missing required vars = instant crash with clear error message
- Check `/health` endpoint — reports DB + Redis connectivity

**Cron not firing:**
- CRM: verify `CRON_SECRET` is set in Vercel env vars
- Newsletter: check feature flag is `on` (not `off`)
- Test manually: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/<name>`

**Migrations fail:**
- Generate fresh `SUPABASE_ACCESS_TOKEN` at https://supabase.com/dashboard/account/tokens
- Use `--dry-run` first
- Check if migration was already applied (most are idempotent with `IF NOT EXISTS`)

**"Cannot connect to database":**
- Direct psql is blocked (IPv6-only DNS per 2026-04-02 compliance entries)
- Use Supabase Management API or SQL Editor in dashboard
- For local dev: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
