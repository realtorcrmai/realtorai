# Operations — Incidents, Secrets, Infrastructure

> **Module of:** `.claude/agent-playbook.md` (Sections 7-9)
> **Load when:** Handling incidents, rotating secrets, checking infrastructure

---

## 7. Production Incident Protocol

### 7.0 Monitoring Checklist

| Service | Health Check | Alert Trigger |
|---------|-------------|--------------|
| CRM (Next.js) | `curl -s localhost:3000` → 200 | Deploy fails, 5xx errors |
| Supabase | Dashboard → Health | Connection refused, RLS errors |
| Cron jobs | `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/process-workflows` | Cron returns non-200 |
| Resend (email) | resend.com/dashboard → Delivery | Bounce rate >5% |
| Voice Agent | `curl -s localhost:8768/api/health` | Health check fails |

### 7.0.1 Incident Response Steps

| Step | Action | SLA |
|------|--------|-----|
| 1 | **Detect** — Check monitoring dashboard or user report | — |
| 2 | **Triage** — Is it CRM, DB, external service, or infra? | 5 min |
| 3 | **Communicate** — Post in team channel: "Incident: [description], investigating" | 5 min |
| 4 | **Mitigate** — Rollback if possible | 15 min |
| 5 | **Fix** — Root cause fix on feature branch → PR → CI → merge | 30 min |
| 6 | **Verify** — Run `test-suite.sh`, check dashboards | 10 min |
| 7 | **Post-mortem** — Document: what happened, root cause, fix, prevention | 1 day |

### 7.0.2 Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]
**Date:** YYYY-MM-DD | **Duration:** X minutes | **Severity:** P0/P1/P2

## What happened
[1-2 sentences]

## Root cause
[Technical explanation]

## Timeline
- HH:MM — Incident detected
- HH:MM — Mitigation applied
- HH:MM — Fix deployed
- HH:MM — Verified resolved

## What we'll do differently
- [ ] Action item 1 (owner, due date)
- [ ] Action item 2 (owner, due date)
```

Save to `docs/incidents/YYYY-MM-DD_<title>.md`.

### 7.0.3 Rollback Procedures

| Component | Rollback Method | Time |
|-----------|----------------|------|
| CRM deploy | Netlify: redeploy previous build | 2 min |
| Migration | Run reverse SQL from `supabase/rollbacks/` | 5 min |
| Code change | `git revert <commit>` → PR → merge | 10 min |
| Cron job | Comment out in `vercel.json`, redeploy | 5 min |
| DB data | Supabase Dashboard → Backups → Point-in-time restore | 15 min |

---

## 7.1 Dev Branch Broken — Emergency Protocol

| Step | Action | Who |
|------|--------|-----|
| 1 | **Detect**: CI fails on dev, or developer reports build failing after pull | Anyone |
| 2 | **Alert**: Post "dev is broken — do NOT merge until fixed" | Whoever found it |
| 3 | **Identify**: `git log --oneline -5 dev` → find which merge broke it | Anyone |
| 4 | **Fix or revert** (within 30 min): Author pushes fix PR, or `git revert <merge-commit>` on a branch | PR author |
| 5 | **Verify**: CI passes on dev after fix/revert | Author |
| 6 | **All clear**: Post "dev is green again" | Whoever fixed it |

**Rules:** PR author is responsible. If unavailable, anyone can revert. Never force-push dev. 30-minute SLA.

---

## 7.2 Conflict Resolution Protocol

**Prevention:** Check `WIP.md` before starting. `git log --oneline -5 -- <file>`. If overlap → coordinate first.

**Resolution:**
1. Second PR (created later) resolves conflicts
2. `git checkout dev && git pull && git checkout <your-branch> && git rebase dev`
3. Both developers review merged result for shared files
4. If unreachable → resolve conservatively (keep both changes)

**Never:** Force-push over someone else's work. Delete their changes. Merge without testing after resolution.

---

## 8. Secret Rotation

1. Generate new key in provider dashboard (Anthropic, Resend, Twilio, Supabase)
2. `./scripts/vault.sh decrypt` → edit `.env.local` → `./scripts/vault.sh encrypt`
3. Update Netlify env vars (Settings → Environment Variables)
4. Update GitHub secrets: `gh secret set KEY_NAME --body "value"`
5. Redeploy
6. Revoke old key in provider dashboard

---

## 9. Infrastructure Map

| Component | Location | Purpose |
|-----------|----------|---------|
| CRM | `src/` | Next.js 16 App Router, Turbopack |
| Voice Agent | `voice_agent/server/` | Python aiohttp, 60 tools, 21 API routes |
| Form Server | external :8767 | Python BCREA form generation |
| Migrations | `supabase/migrations/` | 75 SQL files (001-065, some duplicates at 050-055) |
| Health Check | `scripts/health-check.sh` | Pre-session diagnostic |
| Test Suite | `scripts/test-suite.sh` | 73+ functional tests |
| Save State | `scripts/save-state.sh` | Snapshot before risky ops |
| Vault | `scripts/vault.sh` | Encrypt/decrypt secrets |
| CI/CD | `.github/workflows/deploy.yml` | Auto-deploy on push to main |
| Eval Scripts | `scripts/eval-*.mjs` | 8 eval suites |
| Playwright | `playwright.config.ts` + `tests/` | Browser e2e tests |
| RAG (TS) | `src/lib/rag/` | TypeScript RAG module |
| Content Gen | `content-generator/` | Separate package (excluded from build) |
| Agent Pipeline | `agent-pipeline/` | Research/build pipeline (excluded) |
