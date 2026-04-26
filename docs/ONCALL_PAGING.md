<!-- docs-audit-reviewed: 2026-04-25 --paragon-pdf-import -->
<!-- docs-audit: scripts/health-check.sh, docs/ENVIRONMENTS.md, docs/DR_RUNBOOK.md, docs/SLO_DEFINITIONS.md -->
# On-Call & Paging Policy — Realtors360

> Defines who responds to production incidents, how fast, and what actions to take.
> Last updated: 2026-04-21. Current team: 1-2 people. Scales to 5.

---

## Services Covered

| Service | Platform | Monitoring URL | Owner |
|---------|----------|---------------|-------|
| CRM (Next.js) | Vercel | vercel.com/realtors360/deployments | On-call primary |
| Newsletter Agent | Render ($7/mo) | dashboard.render.com → realtors360-newsletter | On-call primary |
| Supabase DB | `qcohfohjihazivkforsj` | supabase.com/dashboard/project/qcohfohjihazivkforsj | On-call primary |
| DNS / Domain | Vercel Domains | vercel.com/domains | Product owner |

---

## Severity Levels & Response Times

### P0 — Total Outage (30-minute response)

Definition: CRM returns 5xx for >50% of requests, OR Supabase DB connection refused, OR Newsletter Agent down and crons are missed.

Trigger conditions:
- Vercel deployment fails and production is serving an error page
- Supabase DB shows >100ms connection queue or `FATAL: remaining connection slots reserved`
- Newsletter Agent cron (`/api/cron/process-workflows`) missed two consecutive runs
- Auth endpoint (`/api/auth/[...nextauth]`) returns 5xx — all realtors locked out
- Data breach suspected (unexpected RLS bypass, unusual query volume in Supabase logs)

Response: Page primary on-call immediately. Acknowledge within 30 minutes. Begin DR_RUNBOOK.md checklist. Notify product owner if not first responder.

### P1 — Major Degradation (2-hour response)

Definition: Core feature broken for >25% of users, but service is partially available.

Trigger conditions:
- AI features failing (Anthropic API 429 or 500) — MLS remarks + content generation broken
- Twilio SMS delivery failing — showing confirmations not reaching sellers
- Resend email delivery failing — newsletters not sending (check bounce rates in Resend dashboard)
- Google Calendar sync failing for >3 realtors (token refresh loop)
- Any FINTRAC or CASL compliance feature returning errors (regulatory risk)

Response: Respond within 2 hours during business hours. After-hours: next morning unless FINTRAC/CASL affected (escalate to P0).

### P2 — Partial Degradation (Next Business Day)

Definition: Non-critical feature degraded, workaround exists, no data loss.

Trigger conditions:
- Kling AI video/image generation slow or erroring (cosmetic, not blocking)
- Command palette search returning stale results
- Contact preview sheet loading slowly
- BC Geocoder or ParcelMap enrichment timing out (manual fallback exists)
- Vercel preview deployment failures (not production)

Response: Create GitHub Issue with `bug` + `p2` labels. Address in next sprint planning.

---

## Current Monitoring Stack (Team ≤ 2)

**What exists today:**

| Tool | What It Monitors | How to Check |
|------|-----------------|--------------|
| `scripts/health-check.sh` | App availability, Supabase connectivity, env vars | Run manually at session start |
| Vercel Analytics | Request volume, error rate, Web Vitals | vercel.com → Analytics tab |
| Supabase Dashboard | DB size, connection count, slow queries, RLS | supabase.com → Reports |
| Render Dashboard | Newsletter Agent uptime, cron execution logs | dashboard.render.com |

**Immediate gap:** No automated alerting. Outages are only detected reactively (user reports or manual check).

**Recommended additions (implement in priority order):**

1. **UptimeRobot (free tier)** — Monitor `https://[vercel-url]/api/health` every 5 minutes. Alert via email for P0. Takes 15 minutes to set up. Do this first.
2. **Sentry (free tier)** — Add `@sentry/nextjs` to catch unhandled exceptions, track error rates, and alert on error spikes. Especially valuable for catching RLS bypass attempts.
3. **PagerDuty (when team ≥ 3)** — Route UptimeRobot + Sentry alerts to PagerDuty. Use escalation policy: primary → secondary → product owner (each with 15-minute escalation window).

---

## Escalation Path

```
Incident detected
       │
       ▼
Primary on-call (Rahul Mittal)
  • Acknowledge within response SLO
  • Triage: confirm severity, check Vercel/Render/Supabase dashboards
  • Attempt fix using DR_RUNBOOK.md
       │
       │ (not resolved in 45 min for P0, or unavailable)
       ▼
Secondary on-call (designated backup)
  • Takes over full incident ownership
  • Documents all actions in GitHub Issue
       │
       │ (data breach, regulatory impact, or >2hr P0)
       ▼
Product Owner (Rahul Mittal / business lead)
  • Customer communication decision
  • Regulatory notification if PIPEDA/FINTRAC affected
  • Post-mortem scheduling
```

At team size 1-2, primary and product owner are the same person. Secondary is an explicit backup (contractor, co-founder, or trusted developer) who must be designated before any planned absence.

---

## Rotation Policy

**Team size 1-2 (current):** No rotation. Primary is always on-call. Explicit backup must be named before vacations, travel, or planned unavailability. Backup must have access to Vercel, Render, Supabase, and GitHub before the absence begins.

**Team size 3-4:** Weekly rotation, Sunday midnight to Sunday midnight. Rotation schedule tracked in shared calendar. Handoff includes: open incidents, recent deploy status, any pending migrations.

**Team size 5+:** Use PagerDuty schedules. Primary + secondary layers. Primary handles P0/P1. Secondary auto-escalates if primary doesn't acknowledge within SLO.

---

## After-Hours Policy

**What pages after hours (P0 only):**
- CRM total outage (all users locked out)
- Supabase DB unreachable
- Newsletter Agent down during a scheduled send window (8 AM – 10 AM PT daily)
- Any suspected data breach

**What does NOT page after hours:**
- P1 degradation (respond next business day)
- P2 issues
- Vercel preview failures
- Kling AI errors
- Enrichment API timeouts

Business hours definition: Mon–Fri, 8 AM – 6 PM Pacific Time.

---

## Runbook Cross-References

| Incident Type | Primary Runbook |
|--------------|----------------|
| DB unreachable / RLS failure | `docs/DR_RUNBOOK.md` — Section: Database Recovery |
| Vercel deploy failure | `docs/ENVIRONMENTS.md` — Section: CRM Deploy Flow |
| Newsletter Agent down | `docs/ENVIRONMENTS.md` — Section: Render Deploy |
| Auth broken | `docs/DR_RUNBOOK.md` — Section: NextAuth Recovery |
| Cron missed | `docs/ENVIRONMENTS.md` — Section: Cron Verification |
| PIPEDA breach suspected | `docs/DR_RUNBOOK.md` — Section: Incident Communication |

---

## Incident Log

All P0 and P1 incidents must be documented in GitHub Issues with label `incident`. Include: timeline, root cause, fix applied, follow-up tasks. Link the issue in `.claude/compliance-log.md`.

<!-- Last reviewed: 2026-04-21 — team WIP -->
