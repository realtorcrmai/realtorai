-- 127: Newsletter engine data integrity fixes

-- 1. Unique constraint on resend_message_id (C-21)
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletters_resend_message_id
  ON newsletters (resend_message_id)
  WHERE resend_message_id IS NOT NULL;

-- 2. Index for resend_message_id lookups
CREATE INDEX IF NOT EXISTS idx_newsletters_resend_message_id
  ON newsletters (resend_message_id)
  WHERE resend_message_id IS NOT NULL;

-- 3. sent_at required when status=sent (H-15)
DO $$
BEGIN
  ALTER TABLE newsletters
    ADD CONSTRAINT ck_sent_requires_timestamp
    CHECK (status != 'sent' OR sent_at IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Composite index for journey queue (H-22)
CREATE INDEX IF NOT EXISTS idx_contact_journeys_queue
  ON contact_journeys (next_email_at ASC, is_paused, contact_id)
  WHERE is_paused = false AND next_email_at IS NOT NULL;

-- 5. Composite index for newsletters dedup (H-23)
CREATE INDEX IF NOT EXISTS idx_newsletters_contact_status_sent
  ON newsletters (contact_id, status, sent_at DESC)
  WHERE status IN ('sent', 'sending');

-- 6. Index for journey dashboard (M-12)
CREATE INDEX IF NOT EXISTS idx_contact_journeys_type_paused
  ON contact_journeys (journey_type, is_paused);

-- 7. Auto-update updated_at trigger for contact_journeys (M-14)
CREATE OR REPLACE FUNCTION update_contact_journeys_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_journeys_updated ON contact_journeys;
CREATE TRIGGER trg_contact_journeys_updated
  BEFORE UPDATE ON contact_journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_journeys_timestamp();

-- 8. Newsletter status state machine (C-20)
CREATE OR REPLACE FUNCTION validate_newsletter_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('approved','sending','failed','skipped','deferred') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'approved' AND NEW.status NOT IN ('sending','draft','deferred','skipped') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'sending' AND NEW.status NOT IN ('sent','failed','draft') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'sent' AND NEW.status != 'sent' THEN
    RAISE EXCEPTION 'Cannot transition from sent status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_newsletter_status_machine ON newsletters;
CREATE TRIGGER trg_newsletter_status_machine
  BEFORE UPDATE ON newsletters
  FOR EACH ROW
  EXECUTE FUNCTION validate_newsletter_status_transition();

-- 9. Clean orphaned contact_journeys with no contact (M-13)
DELETE FROM contact_journeys WHERE contact_id IS NULL;

-- 10. Auto-clear stale NBA overrides after 1 day (M-15)
-- Add column if not exists
ALTER TABLE contact_journeys
  ADD COLUMN IF NOT EXISTS nba_override_set_at TIMESTAMPTZ;
