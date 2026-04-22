---
paths:
  - "src/**/newsletters/**"
  - "src/actions/newsletters.ts"
  - "src/actions/journeys.ts"
  - "src/actions/editorial.ts"
  - "src/emails/**"
  - "src/lib/newsletter-ai.ts"
  - "src/lib/workflow-engine.ts"
  - "src/components/newsletters/**"
  - "src/components/email-builder/**"
  - "src/components/workflow-builder/**"
  - "src/app/(dashboard)/automations/**"
  - "src/app/api/webhooks/resend/**"
---

# Domain Rules: Email Engine MVP

## READ THIS BEFORE TOUCHING ANYTHING IN EMAIL/NEWSLETTER CODE

---

## 1. The Two Services

- **CRM** → Vercel (Next.js). Source of truth for contacts, listings, CRM events.
- **Newsletter Agent** → Render ($7/mo). Polls Supabase every 10s, generates + sends emails.
- **Shared DB** → Supabase `qcohfohjihazivkforsj`. Both services read/write it.

If you change a shared table in the CRM without updating the Render service, it silently breaks.

---

## 2. SHARED TABLE CONTRACT — Never Change These Alone

These tables are read/written by BOTH the CRM and the Render newsletter service.
**Any column rename, delete, or type change MUST update both services in the same PR.**

```
email_events          — Render polls this every 10s. Never rename columns.
email_event_rules     — Render resolves send rules from this.
contact_journeys      — Both sides read/write. Journey phase tracking.
newsletters           — Both sides write here. Main email ledger.
newsletter_events     — Render writes (open/click/bounce). CRM reads for analytics.
agent_drafts          — Render writes. CRM reads for approval queue.
realtor_agent_config  — Both sides read. AI agent settings + voice profile.
```

**Safe to change freely (CRM-only, Render never touches):**
```
editorial_editions, workflow_steps, workflow_enrollments,
communications, notifications, listing_enrichment,
contacts (adding columns only — never remove), listings (adding only)
```

Before any migration touching a shared table:
1. Check if Render SELECTs the column → update Render first
2. Check if Render INSERTs into the table → verify payload still matches
3. Never rename a column directly → add new, migrate, remove old
4. Never add NOT NULL without a DEFAULT or backfill

---

## 3. The 6 Email Systems (Know These Before Touching Anything)

| # | Name | Where it runs | Sends to | Rate limiter |
|---|------|--------------|----------|-------------|
| 1 | Journey Pipeline | Render cron every 2min | All contacts (lifecycle drip) | checkSendGovernor() — partial |
| 2 | Event Pipeline | Render polls every 10s | Affected contacts per event | resolveRuleForEvent() — best |
| 3 | Editorial | CRM (Vercel) | Segments / all contacts | None — CASL only |
| 4 | Workflow Engine | CRM + Render cron | Enrolled contacts (email+SMS+WA) | BROKEN — writes to wrong table |
| 5 | Drip Sequence | Render | New contacts | DUPLICATE of System 1 |
| 6 | AI Agent | Render | AI-selected contacts | Own cap — separate table |

**System 5 is a duplicate of System 1 and must be deleted.**
File to delete: `realtors360-newsletter/src/agent/drip/sequence-engine.ts`
Do NOT delete until you've confirmed System 1 is covering all contact types.

**System 4 (Workflow) has a bug:** `executeAutoMessage()` writes to `communications` table
but its rate limiter (`checkSendGovernor`) reads `newsletters` table.
Fix: make workflow emails write to `newsletters` table with `source: 'workflow'` column.
This is a shared-table change — update Render in the same PR.

---

## 4. MVP Target UI — 3 Tabs Only

The realtor UI must be simplified to 3 tabs. Do NOT add new pages or tabs beyond this.

```
/newsletters
  Tab 1: AI          — unified send feed + approval queue + pause toggle
  Tab 2: Campaigns   — editorial newsletters + template library
  Tab 3: Automations — greeting toggles + workflow builder
```

**Pages that exist but belong in Admin UI only (hide from realtor nav):**
- `/newsletters/engine` — internal observability tool
- `/newsletters/control` — trust levels, caps (admin sets these)
- `/newsletters/ghost` — AI quality monitoring
- `/newsletters/suppressions` — suppression log
- `/newsletters/learning` — voice rule approval
- `/newsletters/insights` — aggregate analytics
- `/newsletters/settings/sources` — data pipeline config
- `/newsletters/guide` — replace with empty state tooltips
- `/newsletters/editorial/upgrade` — orphaned paywall page

**Orphaned pages (no nav link — fix or remove):**
- `/newsletters/analytics/[emailId]` — surface inline in feed instead
- `/newsletters/analytics/contacts` — move to Admin UI
- `/newsletters/editorial/setup` — add link from editorial dashboard or remove
- `/newsletters/ab-testing` — summary card in Campaigns tab, full in Admin UI

---

## 5. Shared Table Risk Classification

Before every change, ask: **"Does this touch a shared table?"**

```
If NO  → ship freely, Render doesn't care, no extra testing needed
If YES → update both CRM + Render in same PR, run smoke test after
```

Risk levels:
- **Zero risk** — UI changes, tab moves, label renames, new read-only queries
- **Low risk** — Adding nullable columns to shared tables with defaults
- **High risk** — Renaming columns, changing write targets, deleting columns
- **Critical** — Changing `email_events` schema (Render polls this every 10s)

---

## 6. Before Any Backend Change — Smoke Test

Run after any migration or Render deploy that touches shared tables:

```bash
bash scripts/smoke-test-integration.sh
```

This validates:
1. CRM can write to `email_events`
2. Render processed an event in the last 60 seconds
3. `newsletters` table is writable
4. `contact_journeys` has no stuck rows (next_email_at in past > 1hr)
5. Render /health endpoint returns 200

If smoke test fails → rollback migration, do NOT proceed.

---

## 7. Content Generation — Which Model for Which System

| System | Model | Reason |
|--------|-------|--------|
| Journey Pipeline | Claude Haiku | High volume, cost-sensitive, routine nurture |
| Event Pipeline | Claude Sonnet | Time-sensitive, higher quality needed |
| AI Agent | Claude Sonnet/Opus | Complex decision-making |
| Editorial | Claude Sonnet | Human-approved, quality matters |
| Workflow | Template vars only | No AI — `{{contact_name}}` substitution |

Never upgrade Journey to Sonnet without cost analysis. At 1000 contacts × 4 emails = 4000 Haiku calls vs 4000 Sonnet calls is a 20x cost difference.

---

## 8. CASL Compliance — Always Check

Every send path MUST check `contacts.casl_consent_given = true` before sending.
Every email MUST include unsubscribe link.
Physical address in footer (Canadian CASL requirement).
Never bypass consent check — it's a legal requirement, not a feature.

---

## 9. Multi-Tenant Rule

Always use `getAuthenticatedTenantClient()` — never raw `createAdminClient()` for user data.
The tenant client auto-scopes all queries by `realtor_id`.
Using admin client accidentally exposes all tenants' data to each other. (HC-12)

---

## 10. The Unified Feed — How to Query It

The "What went out" feed must union across tables. Read-only — zero risk to Render:

```sql
-- Journey + Event sends
SELECT id, contact_id, subject, email_type, sent_at, 'ai_nurture' as source
FROM newsletters WHERE status = 'sent'

UNION ALL

-- Workflow sends
SELECT id, contact_id, body as subject, channel as email_type, created_at, 'workflow' as source
FROM communications WHERE channel = 'email'

UNION ALL

-- AI Agent sends
SELECT id, contact_id, subject, 'agent' as email_type, sent_at, 'ai_agent' as source
FROM agent_drafts WHERE status = 'sent'

ORDER BY sent_at DESC LIMIT 50
```

Editorial sends are per-edition (not per-recipient) — show edition-level stats separately.

---

## Implementation Plan Tracker

See `docs/EMAIL_MVP_PLAN.md` for the full checklist of what's done and what's remaining.
Always read that file at the start of any email-related session.
