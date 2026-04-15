-- =============================================================================
-- Migration: 115_editorial_ab_and_analytics.sql
-- Description: A/B testing columns + editorial_analytics table
--   1. Add ab_test_sent_at, ab_winner to editorial_editions
--   2. Relax active_variant CHECK to allow 'ab_testing' state
--   3. Create editorial_analytics table with per-variant open/click tracking,
--      block-level click maps, CTA tracking, and high-intent click counting
-- Created: 2026-04-15
-- =============================================================================

-- =============================================================================
-- PART 1: editorial_editions — A/B testing columns
-- =============================================================================

ALTER TABLE editorial_editions
  ADD COLUMN IF NOT EXISTS ab_test_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS ab_winner        text CHECK (ab_winner IN ('a', 'b'));

-- Relax active_variant CHECK to allow 'ab_testing' alongside 'a' and 'b'.
-- PostgreSQL requires dropping and re-adding the constraint.
ALTER TABLE editorial_editions
  DROP CONSTRAINT IF EXISTS editorial_editions_active_variant_check;

ALTER TABLE editorial_editions
  ADD CONSTRAINT editorial_editions_active_variant_check
  CHECK (active_variant IN ('a', 'b', 'ab_testing'));

-- Index for cron: find editions in ab_testing state past their test window
CREATE INDEX IF NOT EXISTS idx_editorial_editions_ab_testing
  ON editorial_editions (active_variant, ab_test_sent_at)
  WHERE active_variant = 'ab_testing';

-- =============================================================================
-- PART 2: editorial_analytics table
-- =============================================================================

CREATE TABLE IF NOT EXISTS editorial_analytics (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id          uuid        NOT NULL REFERENCES editorial_editions(id) ON DELETE CASCADE,
  realtor_id          uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Overall delivery stats
  recipients          integer     NOT NULL DEFAULT 0,
  delivered           integer     NOT NULL DEFAULT 0,
  bounced             integer     NOT NULL DEFAULT 0,
  unsubscribed        integer     NOT NULL DEFAULT 0,

  -- Engagement (overall)
  opens               integer     NOT NULL DEFAULT 0,
  unique_opens        integer     NOT NULL DEFAULT 0,
  clicks              integer     NOT NULL DEFAULT 0,
  unique_clicks       integer     NOT NULL DEFAULT 0,
  open_rate           numeric(5,2) NOT NULL DEFAULT 0,
  click_rate          numeric(5,2) NOT NULL DEFAULT 0,

  -- Per-variant counts (A/B testing)
  variant_a_opens     integer     NOT NULL DEFAULT 0,
  variant_b_opens     integer     NOT NULL DEFAULT 0,
  variant_a_clicks    integer     NOT NULL DEFAULT 0,
  variant_b_clicks    integer     NOT NULL DEFAULT 0,
  winning_variant     text        CHECK (winning_variant IN ('a', 'b')),

  -- Block-level and CTA tracking (JSONB maps: key → count)
  block_clicks        jsonb       NOT NULL DEFAULT '{}',
  cta_clicks          jsonb       NOT NULL DEFAULT '{}',
  high_intent_clicks  integer     NOT NULL DEFAULT 0,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_editorial_analytics_edition UNIQUE (edition_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_editorial_analytics_edition_id
  ON editorial_analytics (edition_id);

CREATE INDEX IF NOT EXISTS idx_editorial_analytics_realtor_id
  ON editorial_analytics (realtor_id);

-- RLS
ALTER TABLE editorial_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_analytics_realtor_policy ON editorial_analytics;
CREATE POLICY editorial_analytics_realtor_policy
  ON editorial_analytics
  FOR ALL
  USING (realtor_id = auth.uid());

-- updated_at trigger (reuse the function from migration 113)
DROP TRIGGER IF EXISTS trg_editorial_analytics_updated_at ON editorial_analytics;
CREATE TRIGGER trg_editorial_analytics_updated_at
  BEFORE UPDATE ON editorial_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
