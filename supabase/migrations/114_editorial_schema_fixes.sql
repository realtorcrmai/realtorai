-- =============================================================================
-- Migration: 114_editorial_schema_fixes.sql
-- Description: Fix multi-tenancy and schema mismatches introduced in 113:
--   1. external_data_cache — add realtor_id + payload column, change unique
--      constraint to (realtor_id, cache_key), add fetch metadata columns
--   2. editorial_voice_profiles — add columns that TypeScript types expect
--      but were missing from DB: name, style_description, avoid_phrases,
--      preferred_phrases, writing_examples, bio_snippet, default_sign_off,
--      focus_neighbourhoods, is_default
-- Created: 2026-04-15
-- =============================================================================

-- =============================================================================
-- PART 1: external_data_cache — per-tenant market data cache
-- =============================================================================

-- Drop the old global-unique constraint (cache_key alone) so we can rebuild it
-- as (realtor_id, cache_key). We must drop the table and recreate it because
-- the existing rows (if any) have no realtor_id and cannot be migrated cleanly.
-- The cache is purely ephemeral data — loss is safe; it gets regenerated on
-- next generation run.
DROP TABLE IF EXISTS external_data_cache CASCADE;

CREATE TABLE IF NOT EXISTS external_data_cache (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cache_key     text        NOT NULL,
  -- Flexible market data payload (replaces old 'data' column)
  payload       jsonb       NOT NULL DEFAULT '{}',
  -- Metadata columns consumed by generate route
  data_as_of    timestamptz,
  fetched_at    timestamptz,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  fetch_status  text        NOT NULL DEFAULT 'ok' CHECK (fetch_status IN ('ok', 'error', 'stale')),
  fetch_error   text,
  source_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_external_data_cache_realtor_key UNIQUE (realtor_id, cache_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_external_data_cache_realtor_id
  ON external_data_cache (realtor_id);

CREATE INDEX IF NOT EXISTS idx_external_data_cache_expires_at
  ON external_data_cache (expires_at);

-- RLS — each realtor can only see their own cache rows
ALTER TABLE external_data_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_data_cache_realtor_policy ON external_data_cache;
CREATE POLICY external_data_cache_realtor_policy
  ON external_data_cache
  FOR ALL
  USING (realtor_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_external_data_cache_updated_at ON external_data_cache;
CREATE TRIGGER trg_external_data_cache_updated_at
  BEFORE UPDATE ON external_data_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 2: editorial_voice_profiles — add missing columns
-- =============================================================================

-- Columns present in TypeScript type but missing from DB:
--   name, style_description, avoid_phrases, preferred_phrases,
--   writing_examples, bio_snippet, default_sign_off,
--   focus_neighbourhoods, is_default

ALTER TABLE editorial_voice_profiles
  ADD COLUMN IF NOT EXISTS name              text        NOT NULL DEFAULT 'My Voice Profile',
  ADD COLUMN IF NOT EXISTS style_description text,
  ADD COLUMN IF NOT EXISTS avoid_phrases     text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_phrases text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS writing_examples  text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bio_snippet       text,
  ADD COLUMN IF NOT EXISTS default_sign_off  text,
  ADD COLUMN IF NOT EXISTS focus_neighbourhoods text[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_default        boolean     NOT NULL DEFAULT false;

-- Migrate existing data: move voice_rules JSONB array into preferred_phrases
-- (voice_rules was a string[] stored as JSONB — cast each element to text)
UPDATE editorial_voice_profiles
SET preferred_phrases = ARRAY(
  SELECT jsonb_array_elements_text(voice_rules)
)
WHERE jsonb_array_length(voice_rules) > 0
  AND preferred_phrases = '{}';

-- Migrate existing data: move signature_phrase → default_sign_off
UPDATE editorial_voice_profiles
SET default_sign_off = signature_phrase
WHERE signature_phrase IS NOT NULL
  AND default_sign_off IS NULL;

-- Migrate existing data: move writing_style → style_description
UPDATE editorial_voice_profiles
SET style_description = writing_style
WHERE writing_style IS NOT NULL
  AND writing_style <> 'clear-and-direct'
  AND style_description IS NULL;

-- Keep is_default = true for the first (only) row per realtor
-- Since the old schema enforced UNIQUE(realtor_id) there's at most 1 row per realtor
UPDATE editorial_voice_profiles SET is_default = true;

-- Ensure at least one index on the new columns used in queries
CREATE INDEX IF NOT EXISTS idx_editorial_voice_profiles_realtor_default
  ON editorial_voice_profiles (realtor_id, is_default)
  WHERE is_default = true;
