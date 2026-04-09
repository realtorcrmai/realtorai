-- 085_dedupe_demo_realtors.sql
--
-- Merge the two demo realtor users into one canonical row.
--
-- Background (from 2026-04-09 QA audit):
-- The 2026-04-09 Supabase consolidation imported the legacy ybgilju
-- demo user (7de22757-dd3a-4a4f-a088-c422746e88d4 → demo@realestatecrm.com)
-- into the qcohfoh DB which already had its own demo user
-- (e044c0c6-5523-49bc-a7e4-9fc93bfa8c3a → demo@realestatecrm.com).
-- Because of the users_email_key UNIQUE constraint, the import had to
-- rename the legacy user to demo-legacy@realestatecrm.com to coexist.
-- 518 contacts and most other tenant data now point at the legacy
-- UUID, while the canonical demo points at e044c0c6.
--
-- This migration repoints every realtor_id reference from the legacy
-- UUID to the canonical UUID, then deletes the legacy user.
--
-- Approach: a DO block that iterates over every public table with a
-- realtor_id column and runs `UPDATE ... SET realtor_id = canonical
-- WHERE realtor_id = legacy`. Schema-driven, so any future tables
-- with realtor_id are picked up automatically without modifying this
-- migration.
--
-- Idempotent: re-running after the legacy user is deleted finds zero
-- rows to update + the user delete is conditional.

DO $$
DECLARE
  legacy_id    uuid := '7de22757-dd3a-4a4f-a088-c422746e88d4';
  canonical_id uuid := 'e044c0c6-5523-49bc-a7e4-9fc93bfa8c3a';
  rec          RECORD;
  total_updated bigint := 0;
  updated_in_table bigint;
BEGIN
  -- Step 1: every table with a realtor_id column gets repointed.
  -- agent_learning_log uses TEXT for realtor_id (legacy) — handled
  -- separately below.
  FOR rec IN
    SELECT table_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'realtor_id'
      AND data_type = 'uuid'
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'UPDATE %I SET realtor_id = $1 WHERE realtor_id = $2',
      rec.table_name
    ) USING canonical_id, legacy_id;

    GET DIAGNOSTICS updated_in_table = ROW_COUNT;
    IF updated_in_table > 0 THEN
      RAISE NOTICE 'Updated % rows in %', updated_in_table, rec.table_name;
      total_updated := total_updated + updated_in_table;
    END IF;
  END LOOP;

  RAISE NOTICE 'TOTAL: % rows repointed across all uuid realtor_id columns', total_updated;

  -- Step 2: legacy text-typed realtor_id columns (agent_learning_log).
  -- We already cleaned up the literal "demo" / "demo@realestatecrm.com"
  -- string values in migration 082, but if any UUID-shaped string
  -- references the legacy user, repoint those too.
  UPDATE agent_learning_log
  SET realtor_id = canonical_id::text
  WHERE realtor_id = legacy_id::text;

  -- Step 3: delete the legacy user. This runs only if no rows still
  -- reference it (the previous step should have repointed everything).
  -- If any table doesn't have a realtor_id column but still references
  -- the user via a different FK (e.g. created_by), the delete will
  -- fail and the migration will roll back — surfacing the missing
  -- table in the error.
  DELETE FROM users WHERE id = legacy_id;

  IF FOUND THEN
    RAISE NOTICE 'Deleted legacy demo user %', legacy_id;
  ELSE
    RAISE NOTICE 'Legacy demo user % was already removed (no-op)', legacy_id;
  END IF;
END $$;

-- Verify post-state
SELECT
  (SELECT count(*) FROM users WHERE id = '7de22757-dd3a-4a4f-a088-c422746e88d4') AS legacy_user_remaining,
  (SELECT count(*) FROM users WHERE email = 'demo@realestatecrm.com') AS canonical_demos,
  (SELECT count(*) FROM contacts WHERE realtor_id = 'e044c0c6-5523-49bc-a7e4-9fc93bfa8c3a') AS canonical_contacts;
