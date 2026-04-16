-- 128: Newsletter schema fixes
-- Fixes 8 confirmed bugs: state machine rollback, missing status values,
-- event_type enum gaps, link_type enum gaps, duplicate indexes,
-- dedup index mismatch, compliance audit FK, and redundant index.

-- =============================================================================
-- CRITICAL-1: Allow sending → approved rollback in state machine trigger
-- Migration 127 only allows sending → 'sent' | 'failed' | 'draft'.
-- sendNewsletter() claims newsletters from 'approved' state (setting status='sending')
-- and rolls back to previousStatus on crash, which may be 'approved'.
-- =============================================================================
CREATE OR REPLACE FUNCTION validate_newsletter_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('approved','sending','failed','skipped','deferred') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'approved' AND NEW.status NOT IN ('sending','draft','deferred','skipped') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'sending' AND NEW.status NOT IN ('sent','failed','draft','approved') THEN
    -- 'approved' added: allows atomic claim rollback when crash happens after
    -- claiming an approved newsletter (setting it to 'sending') but before send completes
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'sent' AND NEW.status != 'sent' THEN
    RAISE EXCEPTION 'Cannot transition from sent status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists from migration 127 — no need to recreate it,
-- CREATE OR REPLACE on the function is sufficient since the trigger points to it.

-- =============================================================================
-- CRITICAL-2: Add 'deferred' to newsletters.status CHECK constraint
-- The original CHECK from migration 016 is missing 'deferred', but
-- newsletters.ts writes status='deferred' for governor-blocked sends.
-- =============================================================================

-- Drop the existing status CHECK constraint (name may be auto-generated)
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'newsletters'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE newsletters DROP CONSTRAINT IF EXISTS %I', v_conname);
  END IF;
END $$;

-- Recreate with 'deferred' included
DO $$
BEGIN
  ALTER TABLE newsletters
    ADD CONSTRAINT newsletters_status_check
    CHECK (status IN ('draft', 'approved', 'sending', 'sent', 'failed', 'skipped', 'deferred'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- P0-1: Add 'failed' and 'deferred' to newsletter_events.event_type CHECK
-- Application writes event_type='failed' on send failures; 'deferred' for
-- governor-blocked sends. Both are absent from the original CHECK constraint.
-- =============================================================================

-- Drop the existing event_type CHECK constraint
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'newsletter_events'::regclass
    AND contype = 'c'
    AND conname LIKE '%event_type%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE newsletter_events DROP CONSTRAINT IF EXISTS %I', v_conname);
  END IF;
END $$;

-- Recreate with 'failed' and 'deferred' included
DO $$
BEGIN
  ALTER TABLE newsletter_events
    ADD CONSTRAINT newsletter_events_event_type_check
    CHECK (event_type IN (
      'opened', 'clicked', 'bounced', 'unsubscribed', 'complained',
      'delivered', 'failed', 'deferred'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- P0-2 / H-2: Expand newsletter_events.link_type CHECK constraint
-- classifyClick() in the webhook produces link types not in the original CHECK:
--   book_showing → maps to 'showing' (kept as alias; add canonical below)
--   get_cma → maps to 'cma' (kept as alias; add canonical below)
--   get_valuation, seller_inquiry, mortgage_calc, investment,
--   open_house_rsvp, market_research, market_stats, price_drop, forwarded
-- Strategy: drop old constraint, recreate with all values including aliases
-- so in-flight code works without a code deploy.
-- =============================================================================

-- Drop the existing link_type CHECK constraint
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'newsletter_events'::regclass
    AND contype = 'c'
    AND conname LIKE '%link_type%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE newsletter_events DROP CONSTRAINT IF EXISTS %I', v_conname);
  END IF;
END $$;

-- Recreate with all current and upcoming link_type values
DO $$
BEGIN
  ALTER TABLE newsletter_events
    ADD CONSTRAINT newsletter_events_link_type_check
    CHECK (link_type IN (
      -- Original values
      'listing', 'showing', 'market_report', 'school_info', 'neighbourhood',
      'cma', 'contact_agent', 'unsubscribe', 'other',
      -- classifyClick() aliases (short-term; code should map these to canonical values)
      'book_showing', 'get_cma',
      -- New values produced by classifyClick()
      'get_valuation', 'seller_inquiry', 'mortgage_calc', 'investment',
      'open_house_rsvp', 'market_research', 'market_stats', 'price_drop',
      'forwarded'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- H-4: Drop redundant partial index on contact_journeys
-- Migration 016 created idx_contact_journeys_next_email which is superseded
-- by the composite idx_contact_journeys_queue from migration 127.
-- =============================================================================
DROP INDEX IF EXISTS idx_contact_journeys_next_email;

-- =============================================================================
-- M-5: Replace mismatched dedup index with one that matches actual query
-- Migration 127 created idx_newsletters_contact_status_sent which is never
-- used because the actual dedup query includes 'draft'/'approved' statuses
-- and uses created_at (not sent_at) for the time window.
-- =============================================================================
DROP INDEX IF EXISTS idx_newsletters_contact_status_sent;

CREATE INDEX IF NOT EXISTS idx_newsletters_dedup
  ON newsletters (contact_id, email_type, journey_phase, created_at DESC)
  WHERE status IN ('sent', 'sending', 'draft', 'approved');

-- =============================================================================
-- M-6: Fix journey_phase_transitions.contact_id FK to SET NULL on delete
-- CASCADE destroys compliance audit history when a contact is deleted.
-- Audit logs must survive contact deletion — use SET NULL instead.
-- =============================================================================
ALTER TABLE journey_phase_transitions
  DROP CONSTRAINT IF EXISTS journey_phase_transitions_contact_id_fkey;

ALTER TABLE journey_phase_transitions
  ADD CONSTRAINT journey_phase_transitions_contact_id_fkey
  FOREIGN KEY (contact_id)
  REFERENCES contacts (id)
  ON DELETE SET NULL;

-- =============================================================================
-- LOW-1: Drop redundant index on newsletters.resend_message_id
-- Migration 127 created both a UNIQUE INDEX (uq_newsletters_resend_message_id)
-- AND a regular INDEX (idx_newsletters_resend_message_id) on the same column.
-- A UNIQUE INDEX already serves as a B-tree lookup index — the regular one
-- is pure write overhead.
-- =============================================================================
DROP INDEX IF EXISTS idx_newsletters_resend_message_id;
