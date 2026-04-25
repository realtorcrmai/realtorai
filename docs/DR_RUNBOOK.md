<!-- docs-audit-reviewed: 2026-04-25 --soc2-mfa-drift -->
<!-- docs-audit: docs/ENVIRONMENTS.md, supabase/migrations/*.sql -->

# Disaster Recovery & Backup Runbook

**Product:** Realtors360 CRM (PIPEDA/FINTRAC regulated, PII data)
**Last tested:** Not yet — schedule first drill within 30 days of this doc.

---

## Recovery objectives

| Metric | Target | Rationale |
|--------|--------|-----------|
| **RPO** (Recovery Point Objective) | 24 hours | Supabase Pro PITR provides continuous backup; free tier = daily snapshots |
| **RTO** (Recovery Time Objective) | 4 hours | Time to restore service from total failure |
| **MTTR** (Mean Time to Repair) | 2 hours | Typical partial outage (single service) |

---

## What we're protecting

| Data | Location | Backup method | PII? |
|------|----------|--------------|------|
| PostgreSQL (contacts, listings, users, FINTRAC identities) | Supabase `qcohfohjihazivkforsj` | Supabase PITR (continuous) + daily snapshots | Yes — PIPEDA regulated |
| Auth sessions (JWT) | Stateless (NextAuth) | No backup needed — regenerated | No |
| File uploads (documents, photos) | Supabase Storage | Included in Supabase backup | Some PII |
| Environment variables | Vercel dashboard + Render dashboard | `.env.vault` in git (encrypted) | Secrets |
| Code | GitHub `realtorcrmai/realtorai` | Git history | No |
| Newsletter event data | Same Supabase DB | Same PITR | Partial PII |

---

## Scenario 1: Database corruption or data loss

**Trigger:** Bad migration, accidental DELETE, ransomware, Supabase outage.

### Steps

1. **Assess scope** — which tables affected? Run `SELECT count(*) FROM <table>` on critical tables.
2. **Stop writes** — set app to maintenance mode (Vercel env var `MAINTENANCE_MODE=true`, redeploy).
3. **Restore from PITR** — Supabase Dashboard → Project → Settings → Database → Point in Time Recovery. Pick timestamp before incident.
4. **Verify** — Run `bash scripts/test-suite.sh` against restored DB. Check row counts match expected.
5. **Re-enable** — Remove `MAINTENANCE_MODE`, redeploy.
6. **Post-mortem** — Document in `docs/incidents/YYYY-MM-DD-<slug>.md`.

### If PITR is unavailable (free tier)

1. Restore from latest daily snapshot (Supabase Dashboard → Backups).
2. Re-apply migrations from snapshot point forward: check `supabase/migrations/` timestamps.
3. Accept data loss between snapshot and incident (up to 24 hours).

---

## Scenario 2: Complete rebuild from zero

**Trigger:** Account compromise, need to migrate to new Supabase project, catastrophic failure.

### Steps

1. **Create new Supabase project** — same region (us-east-1).
2. **Run all migrations in order:**
   ```bash
   ls supabase/migrations/*.sql | sort | while read f; do
     echo "Applying: $f"
     # Paste into Supabase SQL editor, or use supabase CLI:
     # supabase db push --linked
   done
   ```
3. **Seed essential data:**
   ```bash
   node scripts/seed-demo.mjs  # Demo data (29 contacts, etc.)
   ```
4. **Update environment variables:**
   - Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Render: Same Supabase keys + newsletter-specific vars
5. **Decrypt secrets:** `./scripts/vault.sh decrypt` (requires passphrase from team lead).
6. **Deploy:**
   - Vercel: push to `dev` branch triggers auto-deploy
   - Render: push to `dev` triggers newsletter agent deploy
7. **Verify:** Run full test suite: `bash scripts/test-suite.sh`
8. **Notify users** if data was lost (PIPEDA 72-hour breach notification requirement).

---

## Scenario 3: Service outage (Vercel/Render down)

**Trigger:** Platform outage, deployment failure, DNS issue.

### Steps

1. **Check status pages:** [Vercel Status](https://www.vercel-status.com/), [Render Status](https://status.render.com/), [Supabase Status](https://status.supabase.com/).
2. **If Vercel down:** Wait for recovery. No self-hosted fallback currently.
3. **If Render down (newsletter agent):** Newsletter processing pauses. No data loss — crons will catch up when service recovers.
4. **If Supabase down:** App degrades to read-only from cache. No write operations possible.

---

## Scenario 4: Secret compromise

**Trigger:** Leaked API key, compromised `.env.local`, suspicious API activity.

### Steps

1. **Rotate immediately:**
   - Supabase: Dashboard → Settings → API → Regenerate keys
   - Twilio: Console → Account → API Keys → Revoke + create new
   - Anthropic: Dashboard → API Keys → Revoke + create new
   - Resend: Dashboard → API Keys → same
2. **Update env vars** in Vercel + Render dashboards.
3. **Re-encrypt vault:** `./scripts/vault.sh encrypt` → commit `.env.vault` → push.
4. **Audit access logs** for unauthorized API calls during exposure window.
5. **PIPEDA notification** if PII was potentially accessed (72-hour deadline).

---

## Backup verification schedule

| Check | Frequency | How |
|-------|-----------|-----|
| Supabase PITR enabled | Monthly | Dashboard → Settings → Database |
| Test restore to temp project | Quarterly | Create temp project, restore, run test suite, delete |
| `.env.vault` decryptable | Monthly | `./scripts/vault.sh decrypt` on clean checkout |
| Migration replay | Quarterly | Fresh Supabase project, apply all migrations, verify |
| Contact/listing row counts | Weekly | `SELECT count(*) FROM contacts; SELECT count(*) FROM listings;` |

---

## PIPEDA breach notification

If PII is compromised (contacts, FINTRAC identities, user data):

1. **Within 72 hours:** Report to Office of the Privacy Commissioner of Canada
2. **Notify affected individuals** — describe what data was exposed, when, what we're doing
3. **Document** — retain records of the breach for at least 24 months
4. **Review** — update security controls to prevent recurrence

Reference: [PIPEDA breach notification](https://www.priv.gc.ca/en/privacy-topics/business-privacy/safeguards-and-breaches/privacy-breaches/respond-to-a-privacy-breach-at-your-business/)

---

## DR drill checklist

Run this quarterly to verify recovery capability:

- [ ] Create temporary Supabase project
- [ ] Restore from backup (PITR or snapshot)
- [ ] Apply any pending migrations
- [ ] Run `bash scripts/test-suite.sh` — all pass
- [ ] Verify row counts match production
- [ ] Delete temporary project
- [ ] Document drill results in `docs/incidents/drill-YYYY-MM-DD.md`
