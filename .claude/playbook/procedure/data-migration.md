# DATA_MIGRATION Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 1 — Numbering**: `ls supabase/migrations/ | tail -5` — check highest number. Files 050-053 have duplicates.

**Phase 2 — Schema design**: RLS policy REQUIRED. FK constraints, CHECK constraints, indexes. JSONB for flexible data.

**Phase 3 — Idempotency**: `IF NOT EXISTS`, `DO $$` blocks, `ON CONFLICT DO NOTHING`. Safe to run twice.

**Phase 4 — Seed data realism (BC)**: V-prefix postal codes, 604/778/236/250 area codes, CAD pricing, Metro Vancouver cities, R2xxxxxxx MLS numbers.

**Phase 5 — Execute**: `SUPABASE_ACCESS_TOKEN=xxx npx supabase db query --linked -f <file>`

**Phase 6 — Verify**: Query affected tables. Test constraints.

**Phase 7 — Rollback plan**: Document reverse SQL BEFORE running forward migration.
