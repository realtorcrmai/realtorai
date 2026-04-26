<!-- docs-audit-reviewed: 2026-04-25 --paragon-pdf-import -->
<!-- docs-audit: docs/ENVIRONMENTS.md, .github/workflows/*.yml -->

# Environment Separation Plan

**Current state (2026-04-21):** Single environment (dev). `main` branch reserved but unused.

**Target state:** dev → staging → production with migration safety gates.

---

## Current architecture

```
feature branch → PR → dev (Vercel Preview + Render) → [main unused]
                         ↓
                   Supabase (single project: qcohfohjihazivkforsj)
```

**Problem:** No staging environment. Migrations run directly against the live DB. Bad migrations = production data loss with no safety net except PITR.

---

## Proposed three-environment architecture

```
feature branch → PR → dev (Vercel Preview)     → PR → staging (Vercel Preview)  → PR → main (Vercel Production)
                         ↓                                  ↓                                ↓
                   Supabase Dev                      Supabase Staging               Supabase Production
                   (new project)                     (new project)                  (qcohfohjihazivkforsj)
```

### Environment details

| Environment | Branch | Supabase | Vercel | Purpose |
|-------------|--------|----------|--------|---------|
| **Dev** | `dev` | New project (TBD) | Preview deployment | Active development, frequent migrations |
| **Staging** | `staging` (new) | New project (TBD) | Preview deployment | Pre-production validation, migration dry-run |
| **Production** | `main` | `qcohfohjihazivkforsj` (current) | Production deployment | Live user data |

### Migration flow

```
1. Write migration SQL
2. Apply to Dev Supabase → verify
3. PR from dev → staging
4. Apply to Staging Supabase → verify with realistic data
5. PR from staging → main
6. Apply to Production Supabase → verify
```

**Each step must pass:**
- `bash scripts/test-suite.sh` against that environment's DB
- Row count sanity check (production only)
- Manual QA sign-off (staging → production only)

---

## Implementation steps

### Phase 1: Create staging environment (estimated: 1 day)

1. Create new Supabase project for staging
2. Apply all migrations to staging DB
3. Create `staging` branch from `main`
4. Configure Vercel to deploy `staging` branch to a preview URL
5. Set staging env vars in Vercel (separate from dev)
6. Update Render to only deploy from `main` (newsletter agent)

### Phase 2: Separate dev DB (estimated: 1 day)

1. Create new Supabase project for dev
2. Apply all migrations to dev DB
3. Seed with demo data: `node scripts/seed-demo.mjs`
4. Update Vercel dev preview env vars to point to dev DB
5. Current `qcohfohjihazivkforsj` becomes production-only

### Phase 3: CI gates (estimated: half day)

1. Add migration dry-run step to g2-review.yml (staging check)
2. Add migration apply step to g3-merge.yml (only for dev)
3. Add staging deploy step to new workflow triggered on staging branch push
4. Add production deploy step to g4-release.yml (only on main push)

---

## Cost impact

| Service | Current | After separation |
|---------|---------|-----------------|
| Supabase | 1 project (free/pro) | 3 projects (free tier for dev+staging, pro for prod) |
| Vercel | 1 preview | 3 previews (same plan) |
| Render | 1 service | 1 service (prod only) |

**Estimated additional cost:** $0 if dev+staging use Supabase free tier. Pro tier ($25/mo) recommended for staging if using PITR.

---

## Rollback

If separation causes issues, revert by:
1. Point all env vars back to `qcohfohjihazivkforsj`
2. Delete staging branch
3. Resume single-DB workflow

No data loss risk — separation only adds new DBs, doesn't modify production.

---

## Status

- [x] Plan documented
- [ ] Phase 1: Staging environment created
- [ ] Phase 2: Dev DB separated
- [ ] Phase 3: CI gates updated
