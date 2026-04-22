# Incident Post-Mortem — Realtors360 CRM

## Incident Summary

| Field | Value |
|-------|-------|
| **Incident ID** | INC-2026-001 |
| **Severity** | P1 (High — data integrity) |
| **Date Detected** | 2026-04-20 10:30 PST |
| **Date Resolved** | 2026-04-20 12:15 PST |
| **Duration** | 1h 45m |
| **Affected Service** | CRM (Next.js on Vercel) |
| **Affected Users** | All realtors (~50 active) |
| **On-Call** | [Name] |

---

## Timeline

| Time (PST) | Event |
|------------|-------|
| 10:30 | Alert: Supabase error rate spike (5xx on listings endpoint) |
| 10:35 | Investigated: `listings` table queries timing out |
| 10:42 | Root cause identified: missing index on `realtor_id` after migration 097 |
| 10:50 | Mitigation: added index via Supabase SQL editor |
| 11:00 | Verified: error rate returned to normal |
| 11:30 | Deployed fix: migration 098 with permanent index |
| 12:15 | Monitoring confirmed stable for 45 minutes — incident closed |

---

## Root Cause

Migration 097 added a new column to the `listings` table but dropped and recreated the `realtor_id` index as part of a constraint change. The new index was not included in the migration, causing full table scans on all tenant-scoped queries.

**Contributing factors:**
1. Migration was not tested against production-size dataset (only local with 10 rows)
2. No automated index coverage check in CI
3. No load test baseline to catch performance regression

---

## Impact

| Metric | Before | During | After |
|--------|--------|--------|-------|
| Listings API p95 | 180ms | 8,200ms | 175ms |
| Error rate | 0.1% | 12% | 0.1% |
| Users unable to load listings | 0 | ~50 | 0 |
| Data loss | None | None | None |

**User-facing impact:** All realtors experienced 8+ second load times on the listings page. Some received timeout errors. No data was lost or corrupted.

---

## Detection

- **How detected:** Supabase dashboard alert (query execution time > 5s)
- **Time to detect:** ~5 minutes after deployment
- **Could we have detected sooner?** Yes — a post-deploy smoke test checking response times would have caught this immediately.

---

## Resolution

1. **Immediate fix:** `CREATE INDEX idx_listings_realtor_id ON listings(realtor_id);` via SQL editor
2. **Permanent fix:** Migration 098 committed with index + CI check
3. **Verification:** Confirmed p95 < 200ms for 45 minutes post-fix

---

## Lessons Learned

### What went well
- Quick identification of root cause (12 minutes)
- Supabase SQL editor allowed immediate mitigation without deploy
- No data loss — read-only impact

### What went wrong
- Migration did not include index recreation
- No performance regression test in CI pipeline
- No post-deploy health check for response times

### Where we got lucky
- Happened during low-traffic period (morning)
- Only affected reads, not writes
- Supabase dashboard was accessible

---

## Action Items

| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | Add index coverage check to migration CI | Dev Lead | 2026-04-25 | TODO |
| 2 | Add post-deploy smoke test for p95 latency | QA Lead | 2026-04-27 | TODO |
| 3 | Create k6 load test baseline for critical endpoints | QA | 2026-04-30 | TODO |
| 4 | Add `EXPLAIN ANALYZE` step to migration review checklist | Dev Lead | 2026-04-22 | DONE |
| 5 | Document migration testing procedure in CONTRIBUTING.md | Tech Writer | 2026-04-25 | TODO |

---

## Prevention Measures

### New Checks Added
1. **Migration CI:** Script validates all tables with `realtor_id` have a corresponding index
2. **Post-deploy:** Automated smoke test hits `/api/listings` and asserts p95 < 500ms
3. **Review checklist:** PRs touching `supabase/migrations/` require EXPLAIN ANALYZE output

### Test Gaps Identified
| Gap | Test to Add | Priority |
|-----|------------|----------|
| Index coverage after migration | `db-helpers` assertion | P0 |
| Response time regression | k6 baseline comparison | P1 |
| Post-deploy health | Playwright smoke suite | P1 |

---

## Related Incidents
- None (first incident of this type)

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Incident Commander | | |
| Dev Lead | | |
| Product Owner | | |
