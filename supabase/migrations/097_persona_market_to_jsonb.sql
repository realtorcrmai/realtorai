-- 097: Convert onboarding_persona and onboarding_market from TEXT to JSONB
-- These columns now support multi-select (arrays) in the personalization wizard

-- Drop defaults first (can't auto-cast TEXT default to JSONB)
ALTER TABLE users ALTER COLUMN onboarding_persona DROP DEFAULT;
ALTER TABLE users ALTER COLUMN onboarding_market DROP DEFAULT;

-- Convert existing TEXT values to JSONB arrays
-- e.g. "solo_agent" → ["solo_agent"], NULL → NULL
ALTER TABLE users
  ALTER COLUMN onboarding_persona TYPE JSONB
  USING CASE
    WHEN onboarding_persona IS NULL THEN NULL
    ELSE to_jsonb(ARRAY[onboarding_persona])
  END;

ALTER TABLE users
  ALTER COLUMN onboarding_market TYPE JSONB
  USING CASE
    WHEN onboarding_market IS NULL THEN NULL
    ELSE to_jsonb(ARRAY[onboarding_market])
  END;

-- Re-add defaults as JSONB arrays
ALTER TABLE users ALTER COLUMN onboarding_persona SET DEFAULT '["solo_agent"]'::jsonb;
ALTER TABLE users ALTER COLUMN onboarding_market SET DEFAULT '["residential"]'::jsonb;
