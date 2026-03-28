# DEPLOY Playbook

> Task type: `DEPLOY:local`, `DEPLOY:production`, `DEPLOY:rollback`, `DEPLOY:migration_only`

---

## Phase 1 — Pre-deploy

- `bash scripts/health-check.sh` — all green
- Branch = `dev`, all changes committed
- `npm run build` passes

## Phase 2 — Migrations

- List pending: compare `supabase/migrations/` against last applied
- Run in order: `SUPABASE_ACCESS_TOKEN=xxx npx supabase db query --linked -f <file>`
- Verify each succeeded

## Phase 3 — Service Startup

1. Supabase (remote — always running)
2. Next.js CRM: `npm run dev` → :3000
3. Form Server (optional): Python → :8767
4. Voice Agent (optional): `python3 voice_agent/server/main.py` → :8768
5. Ollama (if voice agent uses it): `ollama serve` → :11434

## Phase 4 — Netlify Deploy

- Env vars must be set in Netlify dashboard (not just `.env.local`)
- Required: `CRON_SECRET`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_SECRET`, `DEMO_EMAIL`, `DEMO_PASSWORD`
- Deploy: push to `main` triggers GitHub Actions → Netlify auto-deploy
- Or manual: `npx netlify deploy --prod --dir=.next`

## Phase 5 — Post-deploy Validation

- `bash scripts/test-suite.sh`
- Check Netlify deploy URL responds
- `bash scripts/save-state.sh`

## Phase 6 — Rollback

- Netlify: redeploy previous deploy from dashboard
- Migration: run reverse SQL (must be prepared before running forward migration)
- Git: `git revert HEAD` → push
