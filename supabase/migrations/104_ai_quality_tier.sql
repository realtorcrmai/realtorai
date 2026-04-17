-- 104: Add configurable AI quality tier to realtor_agent_config
-- Allows realtors to choose between standard (Haiku), professional (Haiku+Sonnet), premium (Sonnet+Opus)

ALTER TABLE realtor_agent_config
ADD COLUMN IF NOT EXISTS ai_quality_tier TEXT DEFAULT 'professional';

-- Add CHECK constraint (idempotent — skips if already exists)
DO $$ BEGIN
  ALTER TABLE realtor_agent_config
  ADD CONSTRAINT realtor_agent_config_ai_quality_tier_check
  CHECK (ai_quality_tier IN ('standard', 'professional', 'premium'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
