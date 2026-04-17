-- =============================================================================
-- Migration 117: Add confidence_score to editorial_voice_profiles
-- =============================================================================
-- confidence_score (0.0–1.0): grows as agent sends more editions.
-- At 0.75+, a profile qualifies for the autonomous send gate.
--
-- voice_version already exists from migration 113. The IF NOT EXISTS clause
-- on ADD COLUMN is a safe no-op if the column is already present.
-- =============================================================================

ALTER TABLE editorial_voice_profiles
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2) NOT NULL DEFAULT 0.0
    CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

-- voice_version was created in migration 113 — only add if missing
ALTER TABLE editorial_voice_profiles
  ADD COLUMN IF NOT EXISTS voice_version integer NOT NULL DEFAULT 1;

-- Index for finding profiles eligible for autonomous send (confidence >= 0.75)
CREATE INDEX IF NOT EXISTS idx_editorial_voice_confidence
  ON editorial_voice_profiles (realtor_id, confidence_score)
  WHERE confidence_score >= 0.75;
