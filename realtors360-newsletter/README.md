# Realtors360 Newsletter Engine v3

Long-running Node service that powers the Realtors360 AI newsletter pipeline.

Sibling to `realestate-crm/` (Next.js on Vercel) — runs the work that can't fit inside Vercel's 10s function timeout: AI orchestration, queue workers, scheduled scans, external scrapers.

**Status:** Milestone 1 — foundation + saved-search vertical slice.

## Architecture

```
CRM (Vercel) ──events──▶ Supabase email_events table ──poll──▶ Worker (this service)
                                                                  │
                                  ┌───────────────────────────────┘
                                  ▼
                       AI orchestrator (Claude tool_use + RAG)
                                  ▼
                       React Email render → Resend → Inbox
```

Full plan: [`/MASTER_NEWSLETTER_PLAN.md`](../MASTER_NEWSLETTER_PLAN.md)
Session context: [`.claude/projects/.../sessions/2026-04-07-newsletter-engine-v3.md`](#)

## Processes

| Entry | Command | Purpose |
|-------|---------|---------|
| `src/index.ts` | `npm start` | Express web server (`/health`, `/events`, `/webhooks`). M1 also runs the worker + cron in-process. |
| `src/worker.ts` | `npm run worker` | (M2+) standalone Bull worker process |
| `src/cron.ts` | `npm run cron` | (M2+) standalone node-cron process |

## Local development

```bash
cp .env.example .env
# fill in Supabase, Anthropic, Resend, Redis URLs
npm install
npm run dev
```

In another terminal, send a canary email to verify the full pipeline:

```bash
npm run seed:saved-search   # seeds a saved search for the test contact
npm run canary               # triggers the saved-search-match pipeline once
```

## Deployment

Deploys to Render automatically on push to `main` (see [`render.yaml`](./render.yaml)).

M1 ships a single web service ($7/mo, starter plan). M2+ adds a dedicated worker and Redis.

## Milestone status

- [x] M1 — foundation + saved-search slice (in progress)
- [ ] M2 — event bus + 5 email types
- [ ] M3 — pipeline migration off Vercel
- [ ] M4 — email type expansion (15 more)
- [ ] M5 — market data + scrapers + competitive intel

## Key conventions

- **TypeScript strict everywhere** — no `any` without comment
- **Pino structured logging** — never `console.log` in code paths
- **Service-role Supabase client** — bypasses RLS by design (server-only context)
- **Feature flags per pipeline** (`FLAG_SAVED_SEARCH=on|off`) for safe rollback
- **Canary first** — every new email type ships with a canary script before touching production
