-- Rollback for 095_onboarding_overhaul.sql
BEGIN;

DROP TABLE IF EXISTS lead_forwarding_addresses CASCADE;
DROP TABLE IF EXISTS team_invites CASCADE;
DROP TABLE IF EXISTS onboarding_checklist CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS trial_ends_at;
ALTER TABLE users DROP COLUMN IF EXISTS trial_plan;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_persona;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_market;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_focus;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_team_size;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_experience;
ALTER TABLE users DROP COLUMN IF EXISTS personalization_completed;
ALTER TABLE users DROP COLUMN IF EXISTS dashboard_preset;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_briefing;
ALTER TABLE users DROP COLUMN IF EXISTS drip_unsubscribed;
ALTER TABLE users DROP COLUMN IF EXISTS twilio_number;

DROP INDEX IF EXISTS idx_users_trial;
DROP INDEX IF EXISTS idx_users_personalization;
DROP INDEX IF EXISTS idx_users_onboarding;

COMMIT;
