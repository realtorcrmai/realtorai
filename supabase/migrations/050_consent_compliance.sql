-- Migration 050: Consent tracking for CASL + CAN-SPAM compliance
-- Sprint 0 + Sprint 1

-- Consent records (CASL requires proof of consent)
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('express', 'implied')),
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ, -- NULL for express (never expires), set for implied
  source TEXT NOT NULL DEFAULT 'manual', -- website_form, open_house, inquiry, transaction, manual
  consent_text TEXT,
  country TEXT DEFAULT 'CA', -- CA or US
  ip_address TEXT,
  withdrawn BOOLEAN DEFAULT false,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add quality_score to newsletters (from quality scorer)
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS quality_score NUMERIC(3,1);

-- Add trust_level to contact_journeys (0=ghost, 1=copilot, 2=supervised, 3=autonomous)
ALTER TABLE contact_journeys ADD COLUMN IF NOT EXISTS trust_level INT DEFAULT 0;

-- Add triggered_by_newsletter_id to communications (attribution)
ALTER TABLE communications ADD COLUMN IF NOT EXISTS triggered_by_newsletter_id UUID;

-- RLS
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS consent_records_auth ON consent_records
  FOR ALL USING (true);

-- Index for consent lookups
CREATE INDEX IF NOT EXISTS idx_consent_contact ON consent_records(contact_id, withdrawn);
CREATE INDEX IF NOT EXISTS idx_consent_expiry ON consent_records(expiry_date) WHERE expiry_date IS NOT NULL AND withdrawn = false;
