-- Add social_profiles JSONB to contacts
-- Stores platform handles: {"instagram": "handle", "linkedin": "handle", ...}
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}';

-- Index for querying contacts by social handle presence
CREATE INDEX IF NOT EXISTS idx_contacts_social_profiles ON contacts USING gin(social_profiles) WHERE social_profiles IS NOT NULL AND social_profiles != '{}';
