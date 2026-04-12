-- Add is_sample column to listings, appointments, and newsletters
-- so sample data seeded during onboarding can be identified and cleaned up

ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;

-- Contacts may already have is_sample — add IF NOT EXISTS for safety
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_listings_is_sample ON listings(realtor_id) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_appointments_is_sample ON appointments(realtor_id) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_newsletters_is_sample ON newsletters(realtor_id) WHERE is_sample = true;

-- NPS score for onboarding satisfaction tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_nps INTEGER CHECK (onboarding_nps >= 1 AND onboarding_nps <= 5);
