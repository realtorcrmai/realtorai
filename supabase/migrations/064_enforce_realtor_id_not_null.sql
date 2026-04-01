-- Migration 064: Multi-Tenancy — Enforce NOT NULL on realtor_id
-- ONLY run after:
--   1. Migration 062 (add columns) is applied
--   2. Migration 063 (backfill) is applied and verified
--   3. All code updated to set realtor_id on inserts
--
-- Verify before running:
--   SELECT table_name, COUNT(*) as null_count
--   FROM information_schema.columns c
--   JOIN LATERAL (
--     SELECT COUNT(*) FROM (SELECT 1 FROM contacts WHERE realtor_id IS NULL LIMIT 1) x
--   ) ON true
--   WHERE column_name = 'realtor_id';

-- ============================================================
-- TIER 1: Core Data Tables
-- ============================================================

DO $$
BEGIN
  -- Only enforce NOT NULL if backfill was done (check contacts as canary)
  IF EXISTS (SELECT 1 FROM contacts WHERE realtor_id IS NOT NULL LIMIT 1) THEN

    ALTER TABLE contacts ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE listings ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE appointments ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE communications ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE listing_documents ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE tasks ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE activities ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE households ALTER COLUMN realtor_id SET NOT NULL;

    -- TIER 2: Contact Sub-Tables
    ALTER TABLE contact_journeys ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE contact_segments ALTER COLUMN realtor_id SET NOT NULL;

    -- TIER 3: Transactions
    ALTER TABLE deals ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE offers ALTER COLUMN realtor_id SET NOT NULL;

    -- TIER 4: Email
    ALTER TABLE newsletters ALTER COLUMN realtor_id SET NOT NULL;

    -- TIER 5: Workflows
    ALTER TABLE workflow_enrollments ALTER COLUMN realtor_id SET NOT NULL;

    -- TIER 6: Social
    ALTER TABLE social_posts ALTER COLUMN realtor_id SET NOT NULL;
    ALTER TABLE social_brand_kits ALTER COLUMN realtor_id SET NOT NULL;

    RAISE NOTICE 'NOT NULL constraints applied to core tables';
  ELSE
    RAISE NOTICE 'Skipping NOT NULL — backfill not yet applied (no contacts with realtor_id)';
  END IF;
END $$;
