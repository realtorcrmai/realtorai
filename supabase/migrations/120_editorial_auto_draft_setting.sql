-- =============================================================================
-- Migration: 120_editorial_auto_draft_setting.sql
-- Description: Add editorial_auto_draft opt-in flag and preferred_areas to
--              realtor_agent_config, enabling the Monday auto-draft cron.
-- Created: 2026-04-15
-- =============================================================================

ALTER TABLE realtor_agent_config
  ADD COLUMN IF NOT EXISTS editorial_auto_draft boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN realtor_agent_config.editorial_auto_draft IS
  'When true, the Monday 6 AM UTC cron creates a weekly draft edition automatically';

-- preferred_areas already exists in buyer_journeys; ensure it exists on
-- realtor_agent_config for city resolution in the generate route.
-- (If the column was added by an earlier migration this is a no-op.)
ALTER TABLE realtor_agent_config
  ADD COLUMN IF NOT EXISTS preferred_areas text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN realtor_agent_config.preferred_areas IS
  'List of cities/neighbourhoods the agent serves — first entry used as default city for editorial generation';

-- Index for the cron query (SELECT realtor_id WHERE editorial_auto_draft = true)
CREATE INDEX IF NOT EXISTS idx_realtor_agent_config_auto_draft
  ON realtor_agent_config (realtor_id)
  WHERE editorial_auto_draft = true;
