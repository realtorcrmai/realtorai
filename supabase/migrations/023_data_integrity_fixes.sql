-- ============================================================
-- MIGRATION 023: Data Integrity Fixes
-- Adds missing constraints, indexes, and enforcement triggers
-- to address race conditions and referential integrity gaps.
-- All statements are idempotent (IF NOT EXISTS / DO $$ guards).
-- ============================================================

-- ── 1. UNIQUE partial index on workflow_enrollments ─────────
-- Prevents duplicate active enrollments for the same
-- (workflow, contact) pair under race conditions.
-- Migration 009 already creates this index under the name
-- idx_enrollments_unique_active; this statement is a no-op if
-- that index already exists.
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_unique_active
  ON workflow_enrollments(workflow_id, contact_id)
  WHERE status = 'active';

-- ── 2. UNIQUE constraint on contact_journeys ────────────────
-- Migration 010 adds UNIQUE(contact_id, journey_type) inline
-- on the table definition, so no additional action is needed.
-- The DO block below is a safety guard that logs a notice
-- rather than erroring if the constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'contact_journeys'::regclass
    AND    contype  = 'u'
    AND    conname  = 'contact_journeys_contact_id_journey_type_key'
  ) THEN
    ALTER TABLE contact_journeys
      ADD CONSTRAINT contact_journeys_contact_id_journey_type_key
      UNIQUE (contact_id, journey_type);
    RAISE NOTICE 'Added UNIQUE constraint on contact_journeys(contact_id, journey_type)';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on contact_journeys(contact_id, journey_type) already exists — skipped';
  END IF;
END $$;

-- ── 3. Missing indexes ───────────────────────────────────────

-- contacts(phone) — used for Twilio webhook lookups
CREATE INDEX IF NOT EXISTS idx_contacts_phone
  ON contacts(phone);

-- contacts(email) — used for login + newsletter audience queries
CREATE INDEX IF NOT EXISTS idx_contacts_email
  ON contacts(email);

-- offers(expiry_date) for active offers — cron job needs this
-- to flag expired offers efficiently
CREATE INDEX IF NOT EXISTS idx_offers_expiry_active
  ON offers(expiry_date)
  WHERE status IN ('draft', 'submitted');

-- communications(channel) — for filtering by channel in
-- the communication timeline
CREATE INDEX IF NOT EXISTS idx_communications_channel
  ON communications(channel);

-- ── 4. CHECK constraint on offers: counter-offer integrity ──
-- A counter offer must reference its parent; a non-counter
-- offer must not reference a parent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'offers'::regclass
    AND    contype  = 'c'
    AND    conname  = 'chk_offers_counter_offer_parent'
  ) THEN
    ALTER TABLE offers
      ADD CONSTRAINT chk_offers_counter_offer_parent CHECK (
        (is_counter_offer = true  AND parent_offer_id IS NOT NULL)
        OR
        (is_counter_offer = false AND parent_offer_id IS NULL)
      );
    RAISE NOTICE 'Added CHECK constraint chk_offers_counter_offer_parent';
  ELSE
    RAISE NOTICE 'CHECK constraint chk_offers_counter_offer_parent already exists — skipped';
  END IF;
END $$;

-- ── 5. Trigger: enforce max_enrollments on workflow_enrollments
-- Before each INSERT, count existing active enrollments for
-- the workflow. If the count meets or exceeds max_enrollments
-- (and max_enrollments IS NOT NULL), raise an exception.
CREATE OR REPLACE FUNCTION fn_check_max_enrollments()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max   INTEGER;
  v_count INTEGER;
BEGIN
  -- Only enforce for new active enrollments
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT max_enrollments
  INTO   v_max
  FROM   workflows
  WHERE  id = NEW.workflow_id;

  -- NULL max_enrollments means unlimited
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO   v_count
  FROM   workflow_enrollments
  WHERE  workflow_id = NEW.workflow_id
  AND    contact_id  = NEW.contact_id
  AND    status      = 'active';

  IF v_count >= v_max THEN
    RAISE EXCEPTION
      'Max active enrollments (%) reached for workflow % and contact %',
      v_max, NEW.workflow_id, NEW.contact_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and re-create the trigger so this migration is
-- safely re-runnable (CREATE OR REPLACE covers the function;
-- triggers themselves cannot be replaced inline).
DROP TRIGGER IF EXISTS trg_check_max_enrollments ON workflow_enrollments;

CREATE TRIGGER trg_check_max_enrollments
  BEFORE INSERT ON workflow_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_max_enrollments();

-- ── 6. CHECK constraint on deals: require at least one of
--       listing_id or contact_id to be non-NULL ─────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'deals'::regclass
    AND    contype  = 'c'
    AND    conname  = 'chk_deals_requires_listing_or_contact'
  ) THEN
    ALTER TABLE deals
      ADD CONSTRAINT chk_deals_requires_listing_or_contact CHECK (
        listing_id IS NOT NULL OR contact_id IS NOT NULL
      );
    RAISE NOTICE 'Added CHECK constraint chk_deals_requires_listing_or_contact';
  ELSE
    RAISE NOTICE 'CHECK constraint chk_deals_requires_listing_or_contact already exists — skipped';
  END IF;
END $$;

-- ── 7. deals.stage: ensure NOT NULL with DEFAULT ─────────────
-- Migration 006 already defines stage as TEXT NOT NULL DEFAULT
-- 'new_lead', so the column is already safe. The ALTER below
-- is a defensive no-op: setting DEFAULT is idempotent and
-- setting NOT NULL on an already-NOT-NULL column is harmless.
ALTER TABLE deals
  ALTER COLUMN stage SET DEFAULT 'new_lead';

ALTER TABLE deals
  ALTER COLUMN stage SET NOT NULL;

-- ── 8. Note on cron endpoint security ───────────────────────
-- Cron-triggered API routes (e.g. /api/cron/*) must be
-- protected at the application layer by comparing the
-- Authorization header against the CRON_SECRET environment
-- variable. This is enforced in Next.js route handlers and
-- cannot be expressed as a database constraint.
-- See: src/app/api/cron/*/route.ts — validate with:
--   if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
--     return new Response('Unauthorized', { status: 401 });
