# DEPLOY Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 1 — Pre-deploy**
- `bash scripts/health-check.sh` — all green
- Branch = `dev`, all changes committed
- `npm run build` passes

**Phase 2 — Migrations**
- List pending: compare `supabase/migrations/` against last applied
- Run in order, verify each succeeded

**Phase 3 — Service startup**
1. Supabase (remote — always running)
2. Next.js CRM: `npm run dev` → :3000
3. Form Server (optional): Python → :8767
4. Voice Agent (optional): Python → :8768

**Phase 4 — Netlify deploy**
- Required env vars: `CRON_SECRET`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_SECRET`, `DEMO_EMAIL`, `DEMO_PASSWORD`
- Deploy: push to `main` triggers GitHub Actions → Netlify auto-deploy

**Phase 5 — Post-deploy validation**
- `bash scripts/test-suite.sh` + check deploy URL + `bash scripts/save-state.sh`

**Phase 6 — Rollback**
- Netlify: redeploy previous from dashboard
- Migration: run reverse SQL
- Git: `git revert HEAD` → push
