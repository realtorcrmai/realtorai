-- 086_newsletter_reliability.sql
--
-- Bundle of reliability improvements for the Newsletter Engine v3 service.
-- All changes are additive (new columns, new indexes) — no data modification.
-- Idempotent via IF NOT EXISTS.
--
-- References: review report items N1, N2, N6, N7, P12

-- ──────────────────────────────────────────────────────────────────
-- N1 + P12: Worker claim lock + retry budget on email_events
-- ──────────────────────────────────────────────────────────────────
-- The worker polling loop needs to atomically claim rows so two
-- processes can't process the same event. `claimed_by` holds the
-- worker instance id, `claimed_at` holds the claim timestamp (for
-- stale-claim recovery), `retry_count` tracks how many times a
-- failed event has been retried.

ALTER TABLE email_events
  ADD COLUMN IF NOT EXISTS claimed_by   text,
  ADD COLUMN IF NOT EXISTS claimed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS retry_count  integer NOT NULL DEFAULT 0;

-- Index for the stale-claim recovery query (find events stuck in
-- 'processing' state for > 5 minutes).
CREATE INDEX IF NOT EXISTS idx_email_events_claimed
  ON email_events (claimed_at)
  WHERE claimed_by IS NOT NULL AND status = 'processing';

-- Add 'processing' to the status CHECK constraint. The original
-- constraint from migration 074 only allows pending/processed/failed/
-- ignored. We need to add 'processing' for the claim pattern.
-- Postgres doesn't support ALTER CHECK, so we drop + recreate.
DO $$
BEGIN
  -- Only drop if the old constraint exists (idempotent on re-run)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'email_events'::regclass
      AND conname = 'email_events_status_check'
  ) THEN
    ALTER TABLE email_events DROP CONSTRAINT email_events_status_check;
  END IF;
END $$;

ALTER TABLE email_events
  ADD CONSTRAINT email_events_status_check
  CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'ignored'));

-- ──────────────────────────────────────────────────────────────────
-- N1: claim_events function — atomic claim via FOR UPDATE SKIP LOCKED
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_email_events(
  p_worker_id text,
  p_batch_size integer DEFAULT 5
)
RETURNS SETOF email_events
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT id
    FROM email_events
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE email_events e
  SET
    status = 'processing',
    claimed_by = p_worker_id,
    claimed_at = now()
  FROM claimable c
  WHERE e.id = c.id
  RETURNING e.*;
END;
$$;

-- ──────────────────────────────────────────────────────────────────
-- N1: recover_stale_claims function — reset events stuck > 5 min
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recover_stale_claims(
  p_stale_after interval DEFAULT interval '5 minutes'
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  recovered integer;
BEGIN
  WITH stale AS (
    SELECT id
    FROM email_events
    WHERE status = 'processing'
      AND claimed_at < now() - p_stale_after
    FOR UPDATE SKIP LOCKED
  )
  UPDATE email_events e
  SET
    status = 'pending',
    claimed_by = NULL,
    claimed_at = NULL,
    retry_count = retry_count + 1
  FROM stale s
  WHERE e.id = s.id;

  GET DIAGNOSTICS recovered = ROW_COUNT;
  RETURN recovered;
END;
$$;

-- ──────────────────────────────────────────────────────────────────
-- N2: Idempotency key on newsletters for crash-safe send
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletters_idempotency
  ON newsletters (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────
-- N7: Birthday dedup index (prevents duplicate birthday events per
-- contact per year even under concurrent cron runs)
-- ──────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_events_birthday_year
  ON email_events (
    contact_id,
    (event_data->>'year')
  )
  WHERE event_type = 'contact_birthday';

-- ──────────────────────────────────────────────────────────────────
-- N6: Saved-search dedup index (prevents duplicate match events for
-- the same contact + listing in the same search run)
-- ──────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_events_search_match
  ON email_events (
    contact_id,
    listing_id,
    (event_data->>'saved_search_id')
  )
  WHERE event_type = 'listing_matched_search';
