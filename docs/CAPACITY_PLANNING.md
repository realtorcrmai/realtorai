<!-- docs-audit-reviewed: 2026-04-24 -->
<!-- docs-audit: docs/ENVIRONMENTS.md, supabase/migrations/, src/lib/supabase/, package.json -->
# Capacity Planning — Realtors360

> Supabase limits, Vercel serverless limits, cost-per-realtor modelling, and scaling
> thresholds for each growth tier. Last updated: 2026-04-24.
> Current load: <50 realtors, <10K contacts, <1K listings.

---

## Current Infrastructure Baseline

| Service | Plan | Monthly Cost | Key Limit |
|---------|------|-------------|-----------|
| Supabase | Free | $0 | 500MB DB, 50K auth users, 2M edge invocations |
| Vercel CRM | Hobby | $0 | 100GB bandwidth, 100 serverless hours |
| Render Newsletter Agent | Starter ($7) | $7 | 512MB RAM, 0.1 CPU, shared |
| Resend (email) | Free | $0 | 3,000 emails/month, 100/day |
| Anthropic Claude | Pay-as-you-go | ~$10–30 | None (rate limits apply) |
| Twilio | Pay-as-you-go | ~$5–10 | None (credit balance) |
| **Total current** | | **~$22–47/mo** | |

---

## Supabase Limits by Plan

| Limit | Free | Pro ($25/mo) | Team ($599/mo) |
|-------|------|-------------|----------------|
| DB storage | 500MB | 8GB | Unlimited |
| File storage | 1GB | 100GB | Unlimited |
| Auth users | 50K | 100K | Unlimited |
| Edge function invocations | 2M/month | Unlimited | Unlimited |
| Connection pool size | 60 | 200 | Dedicated |
| Point-in-time recovery | 1 day | 7 days | 30 days |
| Read replicas | No | No | Yes |
| SLA | None | 99.9% | 99.99% |

**Current usage (estimated at <50 realtors):**
- DB storage: ~15MB (163 tables, sparse data)
- Auth users: <50 (well within free limit)
- Connections: <10 concurrent (Next.js serverless + Render agent)

**Free tier risk:** 500MB DB limit. At 163 tables with JSONB columns (enrichment, newsletter_intelligence, form data), DB size grows faster than row count suggests. Monitor monthly. Upgrade to Pro before hitting 400MB.

---

## Vercel Limits by Plan

| Limit | Hobby | Pro ($20/mo) | Enterprise |
|-------|-------|-------------|-----------|
| Bandwidth | 100GB/mo | 1TB/mo | Custom |
| Serverless function duration | 10s | 60s | 300s |
| Serverless concurrency | 10 | 1,000 | Custom |
| Build minutes | 100/mo | 6,000/mo | Custom |
| Cron jobs | 2 | 40 | Custom |
| Team members | 1 | Unlimited | Unlimited |

**Current Vercel crons registered (CRM):** `/api/cron/daily-digest`, `/api/cron/consent-expiry`. Both within Hobby limit.

**Note:** `FLAG_PROCESS_WORKFLOWS` cron is handled by Render (Newsletter Agent), NOT Vercel. Do not register it on Vercel to avoid double-processing. See `docs/ENVIRONMENTS.md`.

**Function timeout risk:** Several server actions (BCREA form generation, AI MLS remarks, Kling AI polling) can run >10 seconds. On Hobby plan, these will time out. Upgrade to Vercel Pro before launching to paying realtors.

---

## Render Newsletter Agent Limits

| Current Plan | RAM | CPU | Monthly Cost |
|-------------|-----|-----|-------------|
| Starter | 512MB | 0.1 | $7 |
| Standard | 2GB | 1.0 | $25 |
| Pro | 4GB | 2.0 | $85 |

The Newsletter Agent runs 12 crons and serves 19 tools. At <50 realtors, the Starter plan handles the load. Memory pressure will appear first (Node.js + Anthropic SDK + cron scheduler).

**Upgrade trigger:** If Render shows memory usage consistently >400MB (80% of 512MB), upgrade to Standard.

---

## Cost-Per-Realtor Model

Estimated monthly infrastructure cost per active realtor:

| Component | Cost Basis | Per-Realtor Estimate |
|-----------|-----------|---------------------|
| DB storage | ~5MB per realtor (contacts + listings + comms + enrichment JSONB) | ~$0.03 at Pro pricing |
| API calls | ~500 Vercel function invocations/day × 30 days | ~$0.15 (Pro bandwidth) |
| AI generation | ~50 Claude calls/month (newsletter blocks + MLS remarks + recommendations) | ~$0.50 |
| Email delivery | ~200 emails/month via Resend at $0.001/email | ~$0.20 |
| SMS (Twilio) | ~30 SMS/month at $0.0079/SMS | ~$0.24 |
| Render agent | Shared across all realtors; amortized | ~$0.14 at 50 realtors |
| **Total estimated** | | **~$1.26–2.50/month per active realtor** |

At Professional plan pricing ($49/mo), gross margin on infrastructure is ~95% per realtor. This holds up to ~500 realtors before infrastructure costs shift.

---

## Scaling Thresholds

### At 100 Realtors (~Q3 2026 target)

Actions required:
- Upgrade Supabase to Pro ($25/mo) — DB storage headroom + 7-day PITR for compliance
- Upgrade Vercel to Pro ($20/mo) — 60s function timeout + 40 crons
- Add Supabase connection pooling (PgBouncer) — configure `SUPABASE_POOLER_URL` in Vercel env vars
- Enable Resend paid plan (3K/day limit hit at ~15 active realtors sending daily)
- Estimated total infra cost: ~$150–200/month

### At 500 Realtors (~Q1 2027 target)

Actions required:
- Implement server-side pagination (TD-022) — contacts and listings tables will have 100K+ rows total; client-side 200-item cap becomes a liability
- Add DB indexes on `realtor_id, created_at` for all core tables (already RLS-scoped but explicit index helps query planner)
- Consider Supabase read replica for analytics queries (avoid contention with OLTP)
- Upgrade Render to Standard (2GB RAM) — cron concurrency increases
- Estimated total infra cost: ~$400–600/month

### At 1,000 Realtors (~Q2 2027 target)

Actions required:
- Supabase Team tier ($599/mo) — dedicated connection pooler, 99.99% SLA, 30-day PITR (PIPEDA retention requirement)
- CDN for listing images and AI-generated media assets (Cloudflare R2 or Supabase Storage CDN)
- Consider edge functions for auth middleware (reduce cold start latency in BC region)
- Dedicated Render service for AI crons vs. web traffic
- Estimated total infra cost: ~$1,200–1,800/month

### At 5,000 Realtors (~2028+)

Requires dedicated infrastructure evaluation:
- Self-hosted Supabase on AWS/GCP (cost optimisation beyond $599/mo tier)
- Separate read/write connection strings
- Job queue (BullMQ or Inngest) for AI generation tasks instead of cron-based processing
- Multi-region consideration if expanding to Alberta/Ontario markets
- Engage Supabase Enterprise sales for custom pricing

---

## Monthly Monitoring Checklist

Run on the first Monday of each month:

- [ ] Supabase Dashboard → Database → Size: below 80% of plan limit?
- [ ] Supabase Dashboard → Reports → API: connection count below 80% of pool size?
- [ ] Vercel Analytics: error rate below 1%? Bandwidth below 80% of plan limit?
- [ ] Render Dashboard → Memory graph: below 80% of plan limit?
- [ ] Resend: daily send volume below 80% of plan limit?
- [ ] Anthropic: spending within budget? Any 429 rate limit errors in Vercel logs?
- [ ] Twilio: credit balance sufficient for 30-day forward projection?

If any metric is above 80% of its limit, plan the upgrade for next sprint — not when it hits 100%.
