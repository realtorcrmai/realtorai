-- 096: Add family_info JSONB column to users table
-- Stores optional family details collected during onboarding (spouse name, kids count)

ALTER TABLE users ADD COLUMN IF NOT EXISTS family_info JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_team_invites JSONB;
