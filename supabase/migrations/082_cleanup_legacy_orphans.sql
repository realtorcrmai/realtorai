-- 082_cleanup_legacy_orphans.sql
--
-- Data cleanup discovered during the 2026-04-09 QA audit:
--
-- 1. 50 rows in agent_learning_log with legacy string realtor_ids
--    ("demo", "demo@realestatecrm.com") that predate migration 062
--    (which moved realtor_id to UUID). These are stale historical logs
--    that can't be mapped to a real user and will fail any downstream
--    query that joins on users.id.
--
-- 2. 1 orphan contact_journey (id 129d7acf-c355-4ff8-8c47-eaa74d7bbfd1)
--    pointing at a deleted contact (id 296f4ffa-aafd-4665-9879-d962a2d42a21).
--    Likely a legacy test row from before cascade deletes were wired up.
--
-- Both are safe to delete. Idempotent — re-running is a no-op once the
-- rows are gone.

-- ── 1. Delete legacy string realtor_id rows from agent_learning_log ──
-- These rows store realtor_id as TEXT (the column is text for backwards
-- compat). Any value that doesn't look like a UUID is legacy.
DELETE FROM agent_learning_log
WHERE realtor_id IN ('demo', 'demo@realestatecrm.com')
   OR realtor_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- ── 2. Delete orphan contact_journeys ────────────────────────────
-- Any journey pointing at a contact that no longer exists.
DELETE FROM contact_journeys
WHERE NOT EXISTS (
  SELECT 1 FROM contacts WHERE contacts.id = contact_journeys.contact_id
);
