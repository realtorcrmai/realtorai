-- Migration 122: Add send_mode column to contact_journeys
-- auto = send immediately; review = queue for realtor approval
-- Defaults to 'auto' so existing journeys continue processing without manual intervention

ALTER TABLE contact_journeys
  ADD COLUMN IF NOT EXISTS send_mode text NOT NULL DEFAULT 'auto'
    CHECK (send_mode IN ('auto', 'review'));

COMMENT ON COLUMN contact_journeys.send_mode IS 'auto = send immediately; review = queue for realtor approval';
