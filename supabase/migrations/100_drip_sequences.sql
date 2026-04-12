-- 100_drip_sequences.sql
-- Adds sequence tracking columns to email_events for drip sequence support.
-- Idempotent — safe to re-run.

DO $$
BEGIN
  -- Add sequence_type column if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_events'
      AND column_name = 'sequence_type'
  ) THEN
    ALTER TABLE public.email_events
      ADD COLUMN sequence_type text;
  END IF;

  -- Add sequence_step column if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_events'
      AND column_name = 'sequence_step'
  ) THEN
    ALTER TABLE public.email_events
      ADD COLUMN sequence_step integer;
  END IF;
END
$$;

-- Index for looking up active sequences per contact
CREATE INDEX IF NOT EXISTS idx_email_events_sequence
  ON public.email_events (contact_id, sequence_type)
  WHERE sequence_type IS NOT NULL;

COMMENT ON COLUMN public.email_events.sequence_type IS 'Drip sequence identifier (e.g. BUYER_WELCOME, SELLER_ONBOARD). NULL for non-sequence events.';
COMMENT ON COLUMN public.email_events.sequence_step IS 'Zero-based step index within the drip sequence. NULL for non-sequence events.';
