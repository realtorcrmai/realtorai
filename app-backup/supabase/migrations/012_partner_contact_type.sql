-- 012_partner_contact_type.sql
-- Add partner and other contact types, plus partner-specific columns

-- 1. Expand the type CHECK constraint to allow 'partner' and 'other'
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_type_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_type_check
  CHECK (type IN ('buyer', 'seller', 'partner', 'other'));

-- 2. Add partner-specific columns
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS partner_type TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS typical_client_profile TEXT,
  ADD COLUMN IF NOT EXISTS referral_agreement_terms TEXT,
  ADD COLUMN IF NOT EXISTS partner_active BOOLEAN DEFAULT true;

-- 3. Add CHECK constraint for partner_type values
ALTER TABLE contacts ADD CONSTRAINT contacts_partner_type_check
  CHECK (partner_type IS NULL OR partner_type IN (
    'mortgage_broker', 'lawyer', 'inspector', 'agent', 'financial_advisor', 'other'
  ));

-- 4. Index for filtering active partners
CREATE INDEX IF NOT EXISTS idx_contacts_partner_type ON contacts (partner_type)
  WHERE type = 'partner';
