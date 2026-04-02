# Realtors360 CRM — GitHub Copilot Instructions
# Source of truth: .claude/agent-playbook.md + AGENTS.md

## MANDATORY
- Read `.claude/agent-playbook.md` before making changes
- Classify every task (task type, tier, affected files) before coding
- Follow the playbook — no shortcuts

## Hard Constraints
- No `any` type — define proper TypeScript types
- No inline styles — use `lf-*` CSS classes
- Server Actions for mutations (`src/actions/`), API routes for GETs/webhooks
- RLS + `realtor_id` on every new table
- Multi-tenant: `getAuthenticatedTenantClient()` for user data
- Zod v4 validation on all inputs
- Never push to `main` or `dev` directly — PRs only
- Never commit `.env.local`
- No PII in AI prompts
- Verify against code, not reports

## Architecture
- Next.js 16 App Router + Supabase + TypeScript
- Path alias: `@/` → `src/`
- `force-dynamic` on live data pages
- `revalidatePath()` after mutations

## Deliverables
- Feature → use-case doc + tests + PR with classification
- Bug fix → regression test + PR
- Every change → run `npm run typecheck` before commit
