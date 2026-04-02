# AGENTS.md — Realtors360 Real Estate CRM

> **Company BIBLE for ALL developers (human and AI).** Cross-tool instructions compatible with Claude Code, GitHub Copilot, Cursor, Windsurf, OpenAI Codex.
> Full playbook: `.claude/agent-playbook.md` | Quick reference: `.claude/quick-reference.md`

## MANDATORY — Before Every Task

1. **Read the playbook:** `.claude/agent-playbook.md`
2. **Classify the task** before making any changes (task type, tier, affected files)
3. **Follow the checklist** at `.claude/quick-reference.md`
4. **Verify your setup:** `bash scripts/verify-enforcement.sh`

## Hard Constraints (violation = automatic revert)

| # | Rule |
|---|------|
| HC-1 | No `any` type — define proper TypeScript types |
| HC-2 | No inline styles — use `lf-*` CSS classes |
| HC-3 | Server Actions for mutations — API routes only for GETs/webhooks |
| HC-4 | RLS + `realtor_id` on every new table |
| HC-5 | CASL consent check before every outbound message |
| HC-6 | FINTRAC PII fields non-nullable on `seller_identities` |
| HC-7 | Never push directly to `main` or `dev` — PRs only |
| HC-8 | Never `git push --force`, `git reset --hard`, `rm -rf /` |
| HC-9 | Never commit `.env.local` — use `scripts/vault.sh` |
| HC-10 | Zod v4 validation on all inputs |
| HC-11 | No PII in AI prompts |
| HC-12 | Multi-tenant: `getAuthenticatedTenantClient()` for all user data |
| HC-13 | Verify against code, not reports |
| HC-14 | Every new table MUST have `realtor_id` with index and RLS |
| HC-15 | Think before acting — read twice, consider alternatives, review output |

## Multi-Tenancy

```typescript
// ALWAYS use tenant client for user data:
const tc = await getAuthenticatedTenantClient();
const { data } = await tc.from("contacts").select("*");
// Auto-filters by realtor_id. Auto-injects on inserts.

// NEVER use raw admin client for user data:
// createAdminClient() bypasses tenant isolation — admin/crons only
```

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run typecheck    # tsc --noEmit
npm run test         # Full test suite (73+)
npm run test:quick   # Vitest unit tests
npm run lint         # ESLint
npm run preflight    # typecheck + lint + audit
bash scripts/verify-enforcement.sh  # Check your playbook setup
bash scripts/install-git-hooks.sh   # Install pre-commit hook
```

## Architecture

```
src/app/(dashboard)/   # Protected pages
src/app/api/           # API routes (webhooks, GETs, cron)
src/actions/           # Server actions (CRUD mutations)
src/components/        # React components
src/lib/               # Utilities (supabase, AI, integrations)
src/lib/agent/         # Unified AI agent (Vercel AI SDK)
src/lib/rag/           # RAG retrieval pipeline
src/hooks/             # React hooks
src/types/             # TypeScript types
supabase/migrations/   # SQL migrations (75 files)
voice_agent/server/    # Python voice service (STT/TTS)
.claude/               # Playbook, hooks, agents, rules
```

## Code Style

- TypeScript strict — no `any`, define proper types
- Server actions in `src/actions/` for mutations
- Zod v4 for validation (`.min(1)` not `.nonempty()`)
- Path alias: `@/` → `src/`
- CSS: `lf-*` classes — no inline styles
- `force-dynamic` on pages with live data
- `revalidatePath()` after every mutation

## Deliverables (every feature change)

| Task Type | Use-Case Doc | Tests | Run Tests |
|-----------|-------------|-------|-----------|
| CODING:feature | **REQUIRED** before coding | **REQUIRED** after | **REQUIRED** |
| CODING:bugfix | Update if exists | Regression test | **REQUIRED** |
| CODING:refactor | Update if exists | Verify no breaks | **REQUIRED** |

## Git

```
<developer>/<description> → PR → dev → PR → main
```

- Branch from `dev`, PR back to `dev` (0 approvals)
- Release: PR `dev` → `main` (1 approval)
- Conventional commits: `feat:` `fix:` `refactor:` `docs:` `test:` `chore:`
- PR template enforces playbook checklist (see `.github/pull_request_template.md`)

## Database

Every new table:
```sql
CREATE TABLE new_table (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_new_table_realtor ON new_table(realtor_id);
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_rls ON new_table FOR ALL USING (realtor_id = auth.uid()::uuid);
```

## Boundaries

**Always:** Tenant client for user data. CASL consent before messages. `revalidatePath()` after mutations.

**Never:** `.env.local` in git. Inline styles. PII in prompts. Skip RLS. `any` type. Push to protected branches. Hardcoded local paths.

**Ask first:** Schema migrations. RLS changes. Secret rotation. Bulk operations. Production deploys.

## Setup for New AI Tool Users

Your AI tool reads different config files:
| Tool | Config File | Status |
|------|------------|--------|
| Claude Code | `.claude/settings.json` + hooks | ✅ Full enforcement |
| Cursor | `.cursorrules` | ✅ Rules loaded |
| GitHub Copilot | `.github/copilot-instructions.md` | ✅ Instructions loaded |
| Windsurf | `.windsurfrules` | ✅ Rules loaded |

Run `bash scripts/verify-enforcement.sh` to check your setup is complete.
