-- G-N05: CASL consent expiry tracking
-- CASL (Canada's Anti-Spam Legislation) requires re-consent every 2 years
-- for implied consent. This migration adds a pre-computed expiry column and
-- a trigger that keeps it in sync whenever casl_consent_date changes.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS casl_consent_expires_at TIMESTAMPTZ;

-- Backfill existing rows that have explicit consent
UPDATE contacts
SET casl_consent_expires_at = casl_consent_date + INTERVAL '2 years'
WHERE casl_consent_given = true
  AND casl_consent_date IS NOT NULL
  AND casl_consent_expires_at IS NULL;

-- Trigger function: auto-compute expiry whenever consent date is set
CREATE OR REPLACE FUNCTION set_casl_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.casl_consent_date IS NOT NULL AND NEW.casl_consent_given = true THEN
    NEW.casl_consent_expires_at := NEW.casl_consent_date + INTERVAL '2 years';
  ELSIF NEW.casl_consent_given = false THEN
    -- Consent was revoked — clear the expiry
    NEW.casl_consent_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_casl_expiry ON contacts;
CREATE TRIGGER trg_casl_expiry
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_casl_expiry();

-- Index to support efficient queries for expiring consent (e.g. weekly cron)
CREATE INDEX IF NOT EXISTS idx_contacts_casl_expires_at
  ON contacts (casl_consent_expires_at)
  WHERE casl_consent_given = true AND casl_consent_expires_at IS NOT NULL;
