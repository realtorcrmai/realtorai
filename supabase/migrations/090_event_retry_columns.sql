-- Migration 090: Add retry/dead-letter columns to email_events
-- Supports exponential backoff retry with dead-letter after 3 failures.
-- Idempotent: uses DO $$ block with IF NOT EXISTS checks.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_events' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE email_events ADD COLUMN retry_count int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_events' AND column_name = 'next_retry_at'
  ) THEN
    ALTER TABLE email_events ADD COLUMN next_retry_at timestamptz;
  END IF;
END $$;

-- Index for the retry cron query (failed events ready for retry)
CREATE INDEX IF NOT EXISTS idx_email_events_retry
  ON email_events(status, retry_count, next_retry_at)
  WHERE status IN ('failed', 'dead_letter');
