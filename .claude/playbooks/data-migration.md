# DATA_MIGRATION Playbook

> Task type: `DATA_MIGRATION:schema`, `DATA_MIGRATION:seed`, `DATA_MIGRATION:bulk_fix`, `DATA_MIGRATION:rollback`

---

## Phase 1 — Numbering

- `ls supabase/migrations/ | tail -5` — check highest number
- ⚠️ Files 050-053 have duplicates — always verify uniqueness

## Phase 2 — Schema Design

- RLS policy REQUIRED for every new table
- FK constraints, CHECK constraints, indexes
- Use JSONB for flexible data, NOT NULL on required fields

## Phase 3 — Idempotency

- `IF NOT EXISTS`, `DO $$` blocks, `ON CONFLICT DO NOTHING`
- Migration must be safe to run twice

## Phase 4 — Seed Data Realism (BC)

- Postal codes: V-prefix (V6B 1A1, V5K 3E2)
- Phone area codes: 604, 778, 236, 250
- Prices: CAD $600K–$3M for detached, $400K–$1.2M for condos
- Cities: Metro Vancouver / Fraser Valley
- MLS numbers: R2xxxxxxx format

## Phase 5 — Execute

```bash
SUPABASE_ACCESS_TOKEN=xxx npx supabase db query --linked -f supabase/migrations/<file>.sql
```

## Phase 6 — Verify

- Query affected tables to confirm changes applied
- Test constraints are enforced (try invalid inserts)

## Phase 7 — Rollback Plan

- Document the reverse SQL BEFORE running forward migration
- For destructive migrations: export data first via Supabase SQL editor
