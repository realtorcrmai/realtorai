<!-- docs-audit: realtors360-newsletter/**, src/actions/newsletters.ts -->
# MASTER IMPLEMENTATION PLAN — Newsletter Engine v3

**Status:** Planning approved, scaffolding not started
**Target service:** `realestate-crm/realtors360-newsletter/` (new module inside the realestate-crm monorepo)
**Deployment:** Render (web + worker + cron + redis)
**Owner:** Realtors360
**Start date:** 2026-04-07
**Planning doc version:** 1.0

---

## 0. Why This Plan Exists

The CRM (Vercel/Next.js) cannot host the full newsletter engine because:
- Vercel serverless functions cap at 10s (workflow processing already fails at ~20 enrollments).
- 50+ email types, external scrapers, multi-step Claude orchestration, and queue-based sends all exceed that budget.
- Workflow/Journey cron, agent-scoring, weekly-learning, rag-backfill are all already at or past the limit.

Solution: a dedicated long-running Node service on Render with a worker + cron + queue, sharing Supabase and the React Email templates. The CRM stays thin and UI-focused; the newsletter service owns heavy work.

This plan is deliberately **phased so each milestone ships a working vertical slice**. We do NOT build all 50 email types in one push.

---

## 1. Goals & Non-Goals

### Goals
1. Stand up `realtors360-newsletter` on Render with web + worker + cron + redis.
2. Publish/consume events from CRM via Supabase `email_events` table (pull model first, HTTP push later).
3. Reuse existing AI agent + RAG (not a separate stack).
4. Move timeout-prone pipelines out of the CRM (`process-workflows`, `rag-backfill`, `weekly-learning`, `agent-scoring`).
5. Ship 50+ email types progressively across 5 milestones.
6. Every pipeline has: validation gate → canary test → production monitor → alert.
7. Every PR includes tests + test-plan updates.

### Non-Goals (explicit)
- No new AI framework (Claude tool_use only — matches existing `project_ai_agent_architecture.md`).
- No Mailchimp at runtime (templates were extracted but are blank shells).
- No separate RAG service (extend `realtors360-rag/` or reuse existing `lib/rag/`).
- No rewrite of existing email templates in Milestone 1 — copy as-is and iterate.
- No vendor lock-in beyond Render + Supabase + Anthropic + Resend + Voyage (already committed).
- No direct Vercel → Render auth token handoff in v1 — service trusts a shared secret + RLS.

---

## 2. Architecture (Final)

```
┌──────────────────────────────┐        ┌────────────────────────────────┐
│  realestate-crm (Vercel)     │        │  realtors360-newsletter (Render)│
│  ── Next.js App Router       │ POST   │  ── Express web service ($7)   │
│  ── Emits events via:        │───────▶│     /health /events /webhooks  │
│     (a) insert email_events  │        │                                │
│     (b) POST /events         │◀──────│  ── Worker process ($7)        │
│  ── Reads status via table   │ webhook│     Bull queue consumer        │
│  ── Owns UI: queue/approval  │        │                                │
└──────────────────────────────┘        │  ── Cron jobs (free)           │
              │                          │     check-saved-searches       │
              │                          │     check-price-drops          │
              │                          │     check-birthdays            │
              │                          │     scrape-market-stats        │
              │                          │     weekly-learning            │
              │                          │     rag-backfill               │
              │                          │     process-workflows          │
              │                          └────────────────────────────────┘
              │                                   │              │
              ▼                                   ▼              ▼
  ┌─────────────────────────┐         ┌────────────────┐ ┌──────────────┐
  │  Supabase (shared)      │         │ Render Redis   │ │ Anthropic +  │
  │  existing tables +      │         │ Bull queue     │ │ Voyage +     │
  │  email_events           │         │ (free tier)    │ │ Resend APIs  │
  │  email_event_rules      │         └────────────────┘ └──────────────┘
  │  saved_searches         │
  │  market_stats_cache     │
  │  neighbourhood_data     │
  │  email_template_registry│
  └─────────────────────────┘
```

### Process boundaries
| Service | Responsibility | Timeout budget |
|---------|----------------|----------------|
| CRM (Vercel) | UI, quick reads, RLS'd mutations, emits events, shows queue | 10s |
| Newsletter Web (Render) | HTTP API, webhooks, publish to queue, quick reads | 30s soft |
| Newsletter Worker (Render) | Bull consumer, AI orchestration, render, send | Minutes |
| Newsletter Cron (Render) | Scheduled scans (hourly/daily/weekly) | Minutes |
| Supabase | Source of truth | — |
| Redis (Render) | Bull queue storage | — |

---

## 3. Milestones (High-Level)

> **Status as of 2026-04-07 (PR #106 open):** M1, M2, M2-B, M3-A batch 1, M3-B, M3-C all shipped on `feat/newsletter-engine-v3`. PR #106 has 5 commits, ~80 files, 52 passing tests. Migrations 074 + 075 still need to be applied to staging via `scripts/apply-newsletter-migrations.mjs`. M3-D and M3-E remain.

| M | Name | Ships | Approx size | Status |
|---|------|-------|-------------|--------|
| **M1** | Foundation + Saved Search vertical slice | Scaffold + 1 working email type end-to-end | ~1 PR | ✅ in PR #106 |
| **M2** | Event bus & rules engine | CRM emits 5 event types; service consumes | ~2 PRs | ✅ in PR #106 (M2 + M2-B) |
| **M3** | Pipeline migration | Extract 15 shared helpers, then port 4 crons off Vercel with integration tests + fix 2 pre-existing bugs | 6 PRs (M3-A through M3-F) | 🟡 M3-A batch 1, M3-B, M3-C done in PR #106; M3-D, M3-E, M3-F remain |
| **M4** | Email type expansion | 15 more email types across 4 categories | ~3-4 PRs | not started |
| **M5** | Market data + scrapers + competitive intel | REBGV, BoC, weekly Claude competitive analyzer | ~3 PRs |

Each milestone is a reviewable PR (or small set), has tests, updates `TEST_PLAN_1000.md`, and has a production canary run before the next starts.

---

## 4. Milestone 1 — Foundation + Saved Search Slice

**Goal:** One email type works end-to-end on Render, provably, from cron to inbox.

### 4.1 Pre-flight cleanup (Phase 0)
- Commit or stash uncommitted white-background fixes (6 files) on a tiny prep PR: `fix/email-white-bg`.
- Create working branch from dev: `feat/newsletter-engine-v3`.
- Verify Render account, GitHub repo access, Supabase connection string handy.

### 4.2 Scaffold `realtors360-newsletter/`

Directory layout:
```
realtors360-newsletter/
├── package.json
├── tsconfig.json
├── render.yaml
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── index.ts                # Express entry (web)
│   ├── worker.ts               # Bull consumer entry
│   ├── cron.ts                 # node-cron entry
│   ├── server.ts               # Express app factory
│   ├── config.ts               # env loader + zod validation
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── redis.ts
│   │   ├── queue.ts            # Bull queues: events, sends, crons
│   │   ├── anthropic.ts
│   │   ├── resend.ts
│   │   ├── voyage.ts
│   │   ├── rag.ts              # thin wrapper calling shared retriever
│   │   └── logger.ts           # pino
│   ├── routes/
│   │   ├── health.ts
│   │   ├── events.ts
│   │   └── webhooks.ts
│   ├── orchestrator/
│   │   ├── index.ts            # main entry: generateEmail(event)
│   │   ├── tools.ts            # Claude tool definitions
│   │   ├── prompts.ts          # persona + task prompts
│   │   └── validators.ts       # output sanity checks
│   ├── pipelines/
│   │   └── saved-search-match.ts
│   ├── emails/                 # COPY from CRM, kept in sync
│   │   ├── BaseLayout.tsx
│   │   ├── PremiumListingShowcase.tsx
│   │   └── ...
│   ├── crons/
│   │   ├── index.ts
│   │   └── check-saved-searches.ts
│   └── workers/
│       ├── index.ts
│       └── process-event.ts
├── tests/
│   ├── unit/
│   └── integration/
└── scripts/
    ├── send-canary.ts          # send 1 email to test contact
    └── seed-saved-search.ts
```

### 4.3 Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.78",
    "@react-email/components": "latest",
    "@react-email/render": "latest",
    "@supabase/supabase-js": "^2",
    "bullmq": "^5",
    "dotenv": "^16",
    "express": "^4",
    "ioredis": "^5",
    "node-cron": "^3",
    "pino": "^9",
    "pino-pretty": "^11",
    "react": "19.2.3",
    "resend": "^4",
    "voyageai": "latest",
    "zod": "^4"
  },
  "devDependencies": {
    "@types/express": "^4",
    "@types/node": "^22",
    "tsx": "^4",
    "typescript": "^5",
    "vitest": "^2"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "worker:dev": "tsx watch src/worker.ts",
    "cron:dev": "tsx watch src/cron.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "worker": "node dist/worker.js",
    "cron": "node dist/cron.js",
    "test": "vitest"
  }
}
```

### 4.4 Database migration `058_newsletter_engine_v3.sql`

Placed in `realestate-crm/supabase/migrations/` (schema lives with the CRM for a single migration history).

Tables (full DDL in session file `sessions/2026-04-07-newsletter-engine-v3.md`, section "Detailed Schema Spec"):
1. `email_events` — event log, consumed by worker.
2. `email_event_rules` — per-realtor event→email type mapping, send mode (review|auto), caps.
3. `saved_searches` — buyer criteria for match alerts.
4. `market_stats_cache` — external data cache.
5. `neighbourhood_data` — curated content.
6. `email_template_registry` — email_type → component metadata.

All tables:
- `realtor_id uuid` + RLS policy: `auth.uid() = realtor_id` (service-role bypasses for worker).
- `created_at`, `updated_at` columns on mutable tables.
- Indexes: `(realtor_id, status)`, `(realtor_id, event_type)`, `(contact_id)`.

Seed data:
- 10 default `email_event_rules` for demo realtor `7de22757-dd3a-4a4f-a088-c422746e88d4`.
- 1 `email_template_registry` entry: `saved_search_match → PremiumListingShowcase`.

### 4.5 Vertical slice — Saved Search Alert

**Flow:**
1. Seed saved search for Test Buyer (`0922c152-09a4-4430-93c2-bba05ebda674`).
2. Cron `check-saved-searches` runs every 15 min:
   - For each enabled saved search, SELECT listings where status='active' AND created_at > last_match_check AND criteria match.
   - Insert `email_events` row with `event_type='listing_matched_search'`.
   - Update `saved_searches.last_match_check`.
3. Worker picks up event from queue (or polls `email_events` where status='pending' for v1):
   - Load event + contact + listing + realtor.
   - Apply rules from `email_event_rules` to resolve email_type + send_mode.
   - Check frequency cap.
   - Call orchestrator.
4. Orchestrator (`generateEmail`):
   - Load RAG context: recent communications, click history, preferences.
   - Build Claude tool_use loop with tools: `get_contact`, `get_listing`, `search_comms`, `rag_retrieve`.
   - Generate subject + preview + content JSON matching `PremiumListingShowcase` props.
   - Run validators: word count, forbidden phrases, has_cta, required vars.
5. Render: `@react-email/render` → HTML + text.
6. Send:
   - `send_mode='review'` → insert into `newsletters` table with `status='pending_review'`.
   - `send_mode='auto'` → call Resend, record `newsletter_events` row, update `email_events.status='processed'`.
7. Resend webhook → `/webhooks/resend` (CRM already handles this; newsletter service also subscribes for events it originated).

### 4.6 Testing & validation
- Unit: orchestrator validators, frequency cap, rule matcher.
- Integration: seed → cron → event → worker → render → Resend sandbox (use Resend test mode).
- Canary script `scripts/send-canary.ts`:
  - Sends 1 email to `amandhindsa@outlook.com` and verifies via Resend GET /emails/{id}.
- Manual: confirm white background, mobile render, link tracking works.

### 4.7 Deployment
- Push branch, create PR into dev, wait for approval.
- Merge dev → main for Vercel (no effect on newsletter).
- Render auto-deploys on commit to main from `rootDir: realtors360-newsletter`.
- Set env vars in Render dashboard (not checked in).
- Post-deploy: run `/health`, trigger `/events` test, verify Outlook delivery.

### 4.8 Definition of Done for M1
- [ ] `realtors360-newsletter/` scaffolded and running locally (web + worker + cron).
- [ ] Migration 058 applied to Supabase.
- [ ] Saved search alert works locally and on Render.
- [ ] Canary script passes (email lands in Outlook, validated via Resend API).
- [ ] Test cases added to `docs/TEST_PLAN_1000.md`.
- [ ] PR merged to dev; Render deploy green.
- [ ] Memory updated: `project_newsletter_engine_v3.md` flipped from "NOT scaffolded" → "M1 complete".

---

## 5. Milestone 2 — Event Bus & Rules Engine

**Goal:** CRM can publish 5 event types; service processes all 5 with different email types.

### 5.1 Event types (M2 scope)
| Event | Emitted by (CRM) | Default email type |
|-------|------------------|---------------------|
| `listing_matched_search` | cron (M1 already) | `saved_search_match` |
| `listing_price_dropped` | `actions/listings.ts` updatePrice | `premium_price_drop_alert` |
| `showing_booked` | `actions/showings.ts` createShowing | `premium_open_house_invite` |
| `listing_sold` | `actions/listings.ts` updateStatus | `premium_just_sold_spotlight` |
| `contact_birthday` | cron daily | `premium_birthday_card` |

### 5.2 CRM → service contract

Option A (chosen for M2): **CRM inserts into `email_events` table.**
- Pros: RLS-enforced, no auth plumbing, idempotent, survives Render downtime.
- Cons: polling latency (mitigated by 30s poll or Supabase Realtime).

Option B (M3+): **CRM POSTs to `/events` with shared secret.**
- Faster, but needs retry + circuit breaker.

M2 ships Option A only. Worker polls `email_events WHERE status='pending'` every 10s.

### 5.3 Rules engine
- `email_event_rules` drives mapping.
- Priority resolution: highest priority rule wins if multiple match.
- Frequency cap: `COUNT(newsletters) WHERE contact_id=X AND sent_at > now() - INTERVAL '7 days'` ≤ `frequency_cap_per_week`.
- Min hours between sends to same contact: check `last_sent_at` on `contact_journeys` table (exists).
- Quiet hours: respect `realtor.notification_hours` (if set) else default 8am–8pm local.
- All rule resolution logic in `src/orchestrator/rules.ts` with unit tests.

### 5.4 Email types built in M2
Each one needs a React Email component + template registry entry + unit test:
- `PremiumPriceDropAlert.tsx`
- `PremiumOpenHouseInvite.tsx` (upgrade existing)
- `PremiumJustSoldSpotlight.tsx`
- `PremiumBirthdayCard.tsx`
- Plus M1's `PremiumListingShowcase.tsx` already exists.

### 5.5 DoD for M2
- [ ] 5 event types emit from CRM without breaking existing flows.
- [ ] Worker processes all 5 and sends distinct emails to canary contact.
- [ ] Rules engine unit tests cover: priority, caps, quiet hours, disabled rules.
- [ ] Dashboard query added to `/newsletters/queue` showing pending `email_events`.

---

## 6. Milestone 3 — Pipeline Migration Off Vercel

**Goal:** Move the 4 timeout-prone CRM crons into Render with identical behaviour, zero double-sends, and integration tests for each.

> **Background:** A detailed dependency + data-flow map was generated by an Explore agent on 2026-04-07 and saved at [`reference_m3_cron_map.md`](.claude/projects/-Users-bigbear-reality-crm/memory/reference_m3_cron_map.md). It is the source of truth for tables read/written, helpers used, env vars, idempotency gotchas, and known issues to fix while porting. **Read it before starting M3** — it saves a re-discovery pass.

### 6.1 Crons to move
| # | Cron (CRM) | Schedule | Reason | Port complexity |
|---|------------|----------|--------|-----------------|
| 1 | `/api/cron/rag-backfill` | Weekly | 50-doc batch >30s | **Lowest** — pure batch, content-hash dedup makes re-runs safe |
| 2 | `/api/cron/weekly-learning` | Mon 6am | Multi-step DB analysis | Low — zero external APIs |
| 3 | `/api/cron/agent-scoring` | Every 15 min | Long Claude + optional Voyage | Medium — rate-limited per contact |
| 4 | `/api/cron/process-workflows` | Every 2-5 min | Fails at ~20 enrollments | **Highest** — multi-channel, send governor, no distributed lock today |

### 6.2 Phase 0 — Shared helper extraction (NEW, do this BEFORE porting any cron)

The Explore agent identified **15 helper modules** that 2+ of these crons share. Porting them in-place during each cron's PR would duplicate work and create drift. Extract them first into `realtors360-newsletter/src/shared/`:

| Helper | From | To | Used by |
|--------|------|----|---------|
| `createWithRetry` | `lib/anthropic/retry` | `shared/anthropic-retry.ts` | process-workflows, agent-scoring |
| `generateMessageContent` | `lib/anthropic/message-generator` | `shared/ai/message-generator.ts` | process-workflows |
| `validateStageForType`, `syncLeadStatusAndStage`, `filterInvalidTags` | `lib/contact-consistency` | `shared/contacts/consistency.ts` | process-workflows |
| `checkSendGovernor` | `lib/send-governor` | `shared/email/send-governor.ts` | process-workflows |
| `assembleEmail`, `runPreSendChecks` | `lib/email-blocks` | `shared/email/email-blocks.ts` | process-workflows |
| `sendGenericMessage` (SMS/WhatsApp) | `lib/twilio` | `shared/sms/twilio.ts` | process-workflows |
| `retrieveContext` | `lib/rag/retriever` | `shared/rag/retriever.ts` | agent-scoring |
| `backfillAll`, `ingestRecord` | `lib/rag/ingestion` | `shared/rag/ingestion.ts` | rag-backfill |
| `embedText`, `embedBatch` | `lib/rag/embeddings` | `shared/rag/voyage.ts` (replaces M1 stub) | rag-backfill |
| `chunkRecord` | `lib/rag/chunker` | `shared/rag/chunker.ts` | rag-backfill |
| `runLearningCycle`, `updateContactIntelligence` | `lib/learning-engine` | `shared/learning/engine.ts` | weekly-learning |
| `processWorkflowQueue` | `lib/workflow-engine` | `shared/workflows/engine.ts` | process-workflows |
| `checkInactivity` | `lib/trigger-engine` | `shared/workflows/triggers.ts` | process-workflows |

Notes for the extraction PR:
- Each helper gets at least one unit test (none exist today — see §6.5).
- Keep types in `shared/types/` so cron files don't pull from `@/types/database` indirectly.
- The existing `lib/supabase.ts`, `lib/resend.ts`, `lib/voyage.ts` (M1) already cover the Supabase/Resend/Voyage clients — extend them, don't duplicate.

### 6.3 Migration pattern per cron (after Phase 0)
1. Copy logic from `realestate-crm/src/app/api/cron/*/route.ts` into `realtors360-newsletter/src/crons/*.ts`.
2. Replace Next.js-specific APIs:
   - `NextRequest`/`NextResponse` → drop (cron is invoked from `node-cron`, not HTTP)
   - `export const maxDuration` → drop entirely (Vercel-only directive)
   - `req.nextUrl.searchParams` → function args
   - Dynamic `await import()` → top-level imports
3. Replace direct `@/lib/...` imports with the extracted `shared/` modules.
4. Register with `node-cron` using the same schedule (see `crons/index.ts`).
5. Add an integration test (see §6.5).
6. Add a feature flag per cron: `FLAG_CRON_PROCESS_WORKFLOWS=on|off` etc.
7. Run BOTH in parallel for 48h (`CRM_CRON_ENABLED=true` keeps the CRM cron alive while the Render cron runs in shadow mode — Render writes to a `_shadow` table or logs only).
8. Once Render version is proven over the parallel window, flip `CRM_CRON_ENABLED=false`, delete the CRM cron in a follow-up PR.

### 6.4 Issues to fix while porting (NOT just lift-and-shift)

Identified by the Explore agent — these are pre-existing bugs that should be fixed during the port, not after:

1. **`process-workflows` double-execution risk** — no distributed lock, only `next_run_at` gating. If cron interval < step duration, the same step can run twice. **Fix:** add a Redis-based lock keyed on enrollment id (Bull queue jobs already give us this for free if we route via the queue).
2. **`agent-scoring` duplicate recommendations** — no UNIQUE constraint on `(contact_id, action_type, new_stage)` in `agent_recommendations`. **Fix:** add a partial unique index in the M3 migration: `CREATE UNIQUE INDEX ON agent_recommendations (contact_id, action_type, (action_config->>'new_stage')) WHERE status = 'pending';` and use `ON CONFLICT DO NOTHING` on insert.
3. **`weekly-learning` N+1** — per-contact intelligence updates loop one query per contact. **Fix:** batch newsletter query by `contact_id IN (...)` then group in-app.
4. **`rag-backfill` insert not batched** — deletes/inserts run per record. **Fix:** combine into a single delete + multi-row insert per source table per batch.
5. **`rag-backfill` is POST while the others are GET** — easy porting trap. **Fix:** crons in the new service are not HTTP-invoked at all, so this disappears, but the test harness needs to know.

### 6.5 Testing — MANDATORY for M3

> **Critical finding from the Explore agent: zero existing tests for any of the 4 crons today.** M3 establishes the testing baseline for the entire newsletter service.

Each cron requires:
- **Unit tests** for the extracted shared helpers (Phase 0 PR)
- **Integration test** that runs the cron end-to-end against a mocked Supabase + mocked external APIs (Anthropic, Resend, Twilio, Voyage). Use vitest + msw or `nock`.
- **Smoke test** that runs against the real staging Supabase (read-only or write-to-isolated-realtor) before flipping the feature flag.
- **Canary contact rule:** every M3 cron must skip writes for the test contact unless `CANARY_MODE=enabled` so we can run shadow mode safely.

The test plan in `docs/TEST_PLAN_1000.md` adds a new section for each cron with at minimum:
- happy path
- one external API failure (rate limit, 5xx)
- one Supabase failure
- idempotency: run twice, verify no duplicate side effects

### 6.6 Recommended PR sequence (lowest risk first)

| PR | Scope | Why this order |
|----|-------|----------------|
| M3-A | ✅ Phase 0 — extract 15 shared helpers + unit tests | Foundation for all subsequent PRs; no behaviour change |
| M3-B | ✅ Port `rag-backfill` + integration test | Lowest porting risk; content-hash dedup makes parallel run safe |
| M3-C | ✅ Port `weekly-learning` + integration test + N+1 fix | No external APIs; easy to validate |
| M3-D | ✅ Port `agent-scoring` + duplicate-recommendation fix (migration 076) | Adds Anthropic failure modes |
| M3-E | Port `process-workflows` + integration test + distributed lock | Highest risk; lands last with the most validation behind it |
| M3-F | Cleanup — delete CRM cron routes after parallel-run window passes | One PR, all 4 deletions |

> **M3-D status (2026-04-08):** lead-scorer + cron + stub retriever + 15 unit tests + migration 076 landed on `claude/newsletter-m3-d-agent-scoring`. RAG retriever is intentionally stubbed (returns empty context) — full hybrid retriever port is deferred to M4 because it requires HyDE expansion, `rag_search` RPC wiring, and FTS fallback that don't exist in the newsletter service yet. Lead scorer's call site is a drop-in for the M4 replacement.
>
> **Pre-existing bugs fixed during the M3-D port (per §6.4 #2 + §6.4 missing-tenant policy from M3-C):**
> 1. Migration 076: partial unique index `uq_agent_recs_pending` on `(contact_id, action_type, action_config->>new_stage) WHERE status='pending'`. Combined with `INSERT … catch 23505` in the ported `lead-scorer.ts`, eliminates the duplicate "advance to <stage>" recommendations the CRM cron has been creating every 15 min for the same contact since 2026-03.
> 2. The recommendation insert now writes `realtor_id` explicitly so RLS stays consistent (HC-14). The CRM original relied on admin-client RLS bypass and would have leaked rows once the tenant policies tightened.
>
> **Out of scope (deliberately):** the cross-tenant bug we caught in M3-C still exists in the CRM `lib/learning-engine.ts` original — it's a separate small CRM-side cleanup PR, not bundled into M3-D.

### 6.7 DoD for M3
- [x] All 15 shared helpers extracted with unit tests (M3-A) — *only 4 of 15 done so far; remaining 11 will land in M3-A batches 2-4 and the M3-E port*
- [ ] Four crons run on Render with identical behaviour (M3-B ✅, M3-C ✅, M3-D ✅ landed; M3-E pending)
- [ ] Integration tests for each cron passing (mocked + smoke)
- [ ] 48-hour parallel run logs show zero drift for each cron before its CRM counterpart is disabled
- [ ] CRM cron routes deleted in M3-F (not just commented — `git revert` is the rollback path)
- [ ] Distributed lock on `process-workflows` enrollments (no double-execution)
- [x] Unique constraint on `agent_recommendations` to prevent duplicates — *migration 076 (M3-D)*
- [ ] Alerts: if `process-workflows` takes >60s, page Slack
- [ ] Performance gain measurable: process-workflows handles ≥100 enrollments/run, agent-scoring ≥100 contacts/run, rag-backfill ≥200 records/table — *M3-D keeps the CRM 50-contact cap; raised in M4*

---

## 7. Milestone 4 — Email Type Expansion

**Goal:** Grow from 5 → 20 email types across the 10 categories.

### 7.1 Batch plan (3-4 per PR)
| Batch | Category | Email types |
|-------|----------|-------------|
| 4a | Workflow triggers | inspection_reminder, possession_reminder, closing_reminder |
| 4b | Social proof | closed_deals_roundup, client_testimonial_spotlight, year_in_review |
| 4c | Education | buyer_guide, seller_timeline, mortgage_checklist |
| 4d | Personalized | home_value_update, equity_growth, mortgage_renewal_alert |
| 4e | Lifestyle | neighbourhood_spotlight, local_biz_feature, community_event |

Each email type requires:
- React Email component
- Template registry row
- Event type + rule seed
- Unit test for props validation
- Canary test
- Entry in TEST_PLAN_1000.md

### 7.2 Reuse via blocks
Build shared block components once:
- `HeroPhotoBlock`, `PropertyCard`, `StatBox`, `TestimonialBlock`, `CTAButton`, `SocialFooter`, `BioBlock`, `PhotoGalleryBlock`, `MapBlock`, `TimelineBlock`, `PriceTrendBlock`.
All templates compose from these — matches `project_email_templates_extended.md`.

---

## 8. Milestone 5 — Market Data + Scrapers + Competitive Intel

**Goal:** AI agent has real market data to reference.

### 8.1 Scrapers
| Source | Cron | Target |
|--------|------|--------|
| REBGV monthly stats | 1st of month | `market_stats_cache` |
| Bank of Canada rates | Daily 9am | `market_stats_cache` |
| Mortgage rate aggregator (RateHub) | Daily 9am | `market_stats_cache` |
| Top-performing realtor emails (competitive) | Weekly Sun 2am | `competitor_emails` (exists) |

All scrapers use `dangerouslyDisableSandbox: true` equivalent in prod (Render has open network) and include:
- User-agent rotation
- Rate limit backoff
- HTML change detection → alert
- Dry-run flag

### 8.2 Competitive intel agent
Weekly Claude job:
1. Load last 7 days of `competitor_emails`.
2. Ask Claude: "What new patterns, subject lines, CTAs are being used?"
3. Store insights in `agent_knowledge` table (exists).
4. Next email generation pulls top 3 insights via RAG.

### 8.3 AI smart insights
With real market data cached, enable:
- `market_timing_alert`
- `comparable_sale_alert`
- `predictive_alert`
- `opportunity_alert`

---

## 9. Cross-Cutting Concerns

### 9.1 Testing strategy
- **Unit:** every validator, rule resolver, template prop builder.
- **Integration:** per pipeline, seeded contact, verified via Resend API.
- **Canary:** per email type, runs in staging before production.
- **Production monitor:** `cron/health-check` every 5 min — pages Slack on failure.
- **Quality scorer:** see `project_production_testing.md` — scores every generated email; <7/10 held for review.

### 9.2 Observability
- Pino structured logs → Render logs + optional shipping to Axiom/Logtail.
- `/health` endpoint with: queue depth, last cron success, worker uptime, Redis ping.
- Supabase table `newsletter_engine_health` with rolling status snapshot every minute.
- Dashboard widget in CRM pulls from that table.

### 9.3 Security
- Render env vars only — nothing checked in.
- Supabase service-role key used by worker; never exposed to CRM client.
- `/events` and `/webhooks` validate shared secret (HMAC).
- Resend webhook signature verified via `RESEND_WEBHOOK_SECRET`.
- RLS on all new tables; worker bypasses with service role intentionally.

### 9.4 Failure modes
| Failure | Response |
|---------|----------|
| Worker crash | Render auto-restart; Bull retries job (3x exponential) |
| Redis down | Queue pauses, cron falls back to DB polling |
| Claude rate limit | Exponential backoff, emit alert after 3 failures |
| Resend 4xx | Move event to `failed`, surface in CRM queue for retry |
| Supabase outage | Circuit breaker; health endpoint returns 503 |

### 9.5 Rollback
- All migrations include a `DOWN` section commented out (Supabase doesn't auto-run, but documented).
- Feature flag per pipeline (`FLAG_SAVED_SEARCH=on|off`) to disable individually.
- CRM cron routes kept for 1 full milestone after migration before deletion.

### 9.6 Compliance
- All sends check `contacts.consent_status` + `contacts.unsubscribed_at`.
- CASL: CRM already enforces — mirror the check in worker as defence-in-depth.
- Every email includes unsubscribe link (BaseLayout already does).
- See `project_compliance.md`.

---

## 10. File-by-File Manifest for Milestone 1

| File | New? | Purpose |
|------|------|---------|
| `realtors360-newsletter/package.json` | new | deps + scripts |
| `realtors360-newsletter/tsconfig.json` | new | strict TS |
| `realtors360-newsletter/render.yaml` | new | web + worker + cron + redis |
| `realtors360-newsletter/.env.example` | new | required env vars |
| `realtors360-newsletter/.gitignore` | new | node_modules, dist, .env |
| `realtors360-newsletter/README.md` | new | setup + run instructions |
| `realtors360-newsletter/src/index.ts` | new | Express entry |
| `realtors360-newsletter/src/server.ts` | new | app factory |
| `realtors360-newsletter/src/config.ts` | new | zod env validator |
| `realtors360-newsletter/src/lib/supabase.ts` | new | service-role client |
| `realtors360-newsletter/src/lib/redis.ts` | new | ioredis connection |
| `realtors360-newsletter/src/lib/queue.ts` | new | Bull queues |
| `realtors360-newsletter/src/lib/anthropic.ts` | new | Claude client |
| `realtors360-newsletter/src/lib/resend.ts` | new | Resend client |
| `realtors360-newsletter/src/lib/voyage.ts` | new | embeddings |
| `realtors360-newsletter/src/lib/rag.ts` | new | retriever wrapper |
| `realtors360-newsletter/src/lib/logger.ts` | new | pino |
| `realtors360-newsletter/src/routes/health.ts` | new | GET /health |
| `realtors360-newsletter/src/routes/events.ts` | new | POST /events |
| `realtors360-newsletter/src/routes/webhooks.ts` | new | Resend webhook |
| `realtors360-newsletter/src/orchestrator/index.ts` | new | generateEmail entry |
| `realtors360-newsletter/src/orchestrator/tools.ts` | new | Claude tool defs |
| `realtors360-newsletter/src/orchestrator/prompts.ts` | new | persona prompts |
| `realtors360-newsletter/src/orchestrator/validators.ts` | new | output checks |
| `realtors360-newsletter/src/orchestrator/rules.ts` | new | rule resolver |
| `realtors360-newsletter/src/pipelines/saved-search-match.ts` | new | vertical slice |
| `realtors360-newsletter/src/emails/*.tsx` | copy | from CRM src/emails |
| `realtors360-newsletter/src/crons/index.ts` | new | node-cron registry |
| `realtors360-newsletter/src/crons/check-saved-searches.ts` | new | M1 cron |
| `realtors360-newsletter/src/workers/index.ts` | new | Bull consumer |
| `realtors360-newsletter/src/workers/process-event.ts` | new | event handler |
| `realtors360-newsletter/src/worker.ts` | new | worker entry |
| `realtors360-newsletter/src/cron.ts` | new | cron entry |
| `realtors360-newsletter/scripts/send-canary.ts` | new | canary test |
| `realtors360-newsletter/scripts/seed-saved-search.ts` | new | seed helper |
| `realtors360-newsletter/tests/unit/rules.test.ts` | new | rule unit tests |
| `realtors360-newsletter/tests/integration/saved-search.test.ts` | new | e2e test |
| `realestate-crm/supabase/migrations/058_newsletter_engine_v3.sql` | new | 6 tables + seed |
| `realestate-crm/CLAUDE.md` | edit | add newsletter service section |
| `PRD_Newsletter_Engine_v3.md` | new | full PRD at repo root |
| `docs/TEST_PLAN_1000.md` | edit | add M1 test cases |

---

## 11. Environment Variables

`.env.example` for `realtors360-newsletter/`:
```
NODE_ENV=development
PORT=8080

# Supabase (shared with CRM)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Redis (Render internal)
REDIS_URL=redis://localhost:6379

# AI
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_WEBHOOK_SECRET=

# Inter-service auth
NEWSLETTER_SHARED_SECRET=

# Feature flags
FLAG_SAVED_SEARCH=on
CRM_CRON_ENABLED=true   # M3: parallel-run safety flag

# Observability
LOG_LEVEL=info
```

---

## 12. Risks & Open Questions

| Risk | Mitigation | Open? |
|------|------------|-------|
| Render cold start on web service | Keep-alive ping from cron | Low risk |
| Bull queue needs Redis persistence | Use Render Redis paid tier if free tier evicts | Open |
| React Email templates drift between CRM and service | Single-source via symlink or npm workspace — decide in M1 | **OPEN** |
| Supabase realtime vs polling for events | Start with polling, upgrade in M2 if latency hurts | Open |
| Sandbox blocks external APIs locally | Use `dangerouslyDisableSandbox: true` for tests | Known |
| Resend from-domain still `onboarding@resend.dev` | **Decision (2026-04-07): stay on `onboarding@resend.dev` for now.** All M1-M3 canary sends restricted to `amandhindsa@outlook.com`. Re-raise domain verification before M4 when broader sends are required. | Deferred |
| Double-sends during M3 parallel run | Feature flag + idempotency key on `email_events` | Plan in place |
| Cost overrun on Render | Monitor; start with $7 web only; add worker only if queue backlog | Acceptable |

### Decisions needed from user BEFORE starting M1
1. **Template sharing strategy:** symlink `realtors360-newsletter/src/emails → ../realestate-crm/src/emails`, or copy + CI sync check, or npm workspace? → **Recommended: npm workspace with a `@realtors360/emails` package.** This needs user sign-off.
2. **Render plan:** start with web-only ($7) and run worker as in-process for M1, or provision worker from day one ($14)? → **Recommended: web-only for M1, add worker in M2.**
3. **Redis:** Render free Redis (may evict) or Upstash free tier? → **Recommended: Upstash for predictability.**
4. ~~**Domain verification for Resend**~~ → **Decided 2026-04-07: stay on `onboarding@resend.dev`.** Sends restricted to `amandhindsa@outlook.com` for M1-M3. Revisit before M4.

---

## 13. Rollout Timeline (no calendar dates — effort-based)

- **M1** — foundation + saved search: 1 focused session.
- **M2** — event bus + 5 types: 2 sessions.
- **M3** — cron migration: 2 sessions (spread across 48h parallel run).
- **M4** — email type expansion: 4-5 sessions (3 PRs per batch).
- **M5** — market data + scrapers + competitive intel: 3 sessions.

Each milestone ends with: PR merged, Render deploy green, canary passing, memory updated.

---

## 14. Definition of Done (Project-Level)

Newsletter Engine v3 is "done" (v1.0) when:
- [ ] All 5 milestones shipped and in production.
- [ ] 20+ email types live (M4 complete), 50+ target for v1.1.
- [ ] All timeout-prone CRM crons moved to Render.
- [ ] Production monitor dashboard live in CRM.
- [ ] Zero duplicate sends in 30-day window.
- [ ] Canary email per type passes weekly.
- [ ] PRD + master plan + CLAUDE.md all reflect shipped architecture.
- [ ] `TEST_PLAN_1000.md` contains test cases for every pipeline.
- [ ] Memory files updated with final architecture and gotchas.

---

## 15. References

- Session file: `sessions/2026-04-07-newsletter-engine-v3.md` (full context + quotes)
- Memory: `project_newsletter_engine_v3.md`
- Memory: `project_email_marketing_v2.md`
- Memory: `project_ai_agent_architecture.md`
- Memory: `project_production_testing.md`
- Memory: `project_competitive_intelligence.md`
- Memory: `project_compliance.md`
- Memory: `feedback_pr_workflow.md`
- Memory: `feedback_deploy_from_main.md`
- Existing PRD: `PRD_Newsletter_Journey_Engine.md` (v1)
- Existing plan: `PLAN_Email_Marketing_Engine.md`
- CLAUDE.md: `realestate-crm/CLAUDE.md`
