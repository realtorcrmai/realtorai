# AGENTS.md — RealtorAI Real Estate CRM

> Cross-tool agent instructions (compatible with Claude Code, GitHub Copilot, Cursor, Windsurf, OpenAI Codex)

## Project

Next.js 16 App Router + Supabase + TypeScript real estate CRM for BC realtors. Manages listings, contacts, showings, 8-phase workflows, AI content, email marketing.

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check (run before every commit)
bash scripts/test-suite.sh   # Full test suite (73+ tests)
bash scripts/health-check.sh # Pre-flight health check
```

## Code Style

- TypeScript strict — no `any`, define proper types
- Server actions in `src/actions/` for mutations, API routes for GET/webhooks
- Zod v4 for all validation (use `.min(1)` not `.nonempty()`)
- Path alias: `@/` maps to `src/`
- CSS: use `lf-*` design system classes from `globals.css` — no inline styles
- Emoji icons on pages, Lucide only in `src/components/ui/`

## Architecture

```
src/app/(dashboard)/   # Protected pages (listings, contacts, showings, etc.)
src/app/api/           # API routes (webhooks, GET endpoints, cron)
src/actions/           # Server actions (CRUD mutations)
src/components/        # React components (shadcn/ui + custom)
src/lib/               # Utilities (supabase, twilio, resend, AI)
src/hooks/             # React hooks
src/types/             # TypeScript types (database.ts)
supabase/migrations/   # SQL migrations (001-056+)
```

## Database

Supabase (PostgreSQL) with RLS. Every new table needs:
1. `ENABLE ROW LEVEL SECURITY`
2. `CREATE POLICY` with appropriate scope
3. Indexes on FK columns and filter columns
4. Types updated in `src/types/database.ts`

## Git

Feature branch model: `<developer>/<description>` → PR → `dev` → PR → `main`. Never push directly to `dev` or `main`.

## Boundaries

**Always:** Check CASL consent before outbound messages. Use `supabaseAdmin` server-side. `revalidatePath()` after mutations.

**Never:** Commit `.env.local`. Use inline styles. Send PII to AI prompts. Skip RLS on new tables. Use `any` type. Push directly to protected branches.

**Ask first:** Schema migrations. RLS changes. Secret rotation. Bulk operations (>50 rows). Production deploys.
