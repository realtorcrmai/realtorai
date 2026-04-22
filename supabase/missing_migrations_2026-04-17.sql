-- ================================================================
-- MISSING MIGRATIONS — Apply to production Supabase
-- Generated: 2026-04-17
-- Migrations: 103, 112, 117, 120, 121, 126, 127, 131, 132
-- All statements are idempotent (IF NOT EXISTS / DO $$ ... END $$)
-- ================================================================


-- ================================================================
-- 103_is_sample_columns.sql
-- ================================================================
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


-- ================================================================
-- 112_code_review_fixes.sql
-- ================================================================
-- 112_code_review_fixes.sql
--
-- Code review fixes: RLS hardening, type correction, and missing indexes.
-- All statements are idempotent (IF NOT EXISTS / DROP IF EXISTS).

-- ============================================================================
-- 1. Fix smart_lists: change realtor_id from TEXT to UUID with FK,
--    and replace the permissive USING(true) RLS policy with tenant scoping.
-- ============================================================================

-- 1a. Drop the open RLS policy that allows cross-tenant access.
DROP POLICY IF EXISTS "smart_lists_all" ON smart_lists;
DROP POLICY IF EXISTS "tenant_isolation_smart_lists" ON smart_lists;

-- 1b. Convert realtor_id from TEXT to UUID and add FK to auth.users.
-- ALTER TYPE is idempotent-safe: if already UUID this is a no-op cast.
ALTER TABLE smart_lists
  ALTER COLUMN realtor_id SET DATA TYPE UUID USING realtor_id::uuid;

-- Add FK constraint (skip if it already exists).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'smart_lists_realtor_id_fkey'
      AND table_name = 'smart_lists'
  ) THEN
    ALTER TABLE smart_lists
      ADD CONSTRAINT smart_lists_realtor_id_fkey
      FOREIGN KEY (realtor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1c. Recreate RLS policy with proper tenant isolation.
CREATE POLICY "tenant_isolation_smart_lists"
  ON smart_lists
  FOR ALL
  TO authenticated
  USING (realtor_id = auth.uid()::uuid)
  WITH CHECK (realtor_id = auth.uid()::uuid);

-- ============================================================================
-- 2. Add missing indexes on frequently queried columns.
--    All use IF NOT EXISTS for safe re-runs.
-- ============================================================================

-- 2a. contacts(realtor_id, lifecycle_stage) — used by smart list filters
--     and the contacts list page stage grouping.
CREATE INDEX IF NOT EXISTS idx_contacts_realtor_lifecycle
  ON contacts(realtor_id, lifecycle_stage);

-- 2b. appointments(realtor_id, buyer_agent_email) — used by showing
--     lookups when matching inbound buyer-agent emails.
CREATE INDEX IF NOT EXISTS idx_appointments_realtor_buyer_email
  ON appointments(realtor_id, buyer_agent_email);

-- 2c. newsletter_events(event_type) — used by analytics queries that
--     aggregate events by type (open, click, bounce, etc.).
CREATE INDEX IF NOT EXISTS idx_newsletter_events_event_type
  ON newsletter_events(event_type);

-- 2d. Composite (realtor_id, created_at DESC) on contacts — used by
--     default sort order on the contacts list page.
CREATE INDEX IF NOT EXISTS idx_contacts_realtor_created
  ON contacts(realtor_id, created_at DESC);

-- 2e. Composite (realtor_id, created_at DESC) on listings — used by
--     default sort order on the listings list page.
CREATE INDEX IF NOT EXISTS idx_listings_realtor_created
  ON listings(realtor_id, created_at DESC);

-- ============================================================================
-- 3. Add explicit RLS policies on global/shared tables that are
--    intentionally public but currently rely on implicit defaults.
--    Explicit FOR SELECT USING (true) documents the intent and prevents
--    accidental lockouts if RLS gets enabled later.
-- ============================================================================

-- 3a. newsletter_templates — shared templates visible to all authenticated users.
ALTER TABLE IF EXISTS newsletter_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_templates_public_read" ON newsletter_templates;
CREATE POLICY "newsletter_templates_public_read"
  ON newsletter_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- 3b. email_template_registry — shared template registry.
ALTER TABLE IF EXISTS email_template_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_template_registry_public_read" ON email_template_registry;
CREATE POLICY "email_template_registry_public_read"
  ON email_template_registry
  FOR SELECT
  TO authenticated
  USING (true);

-- 3c. knowledge_articles — shared knowledge base for RAG.
ALTER TABLE IF EXISTS knowledge_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge_articles_public_read" ON knowledge_articles;
CREATE POLICY "knowledge_articles_public_read"
  ON knowledge_articles
  FOR SELECT
  TO authenticated
  USING (true);

-- 3d. neighbourhood_data — shared neighbourhood reference data.
ALTER TABLE IF EXISTS neighbourhood_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "neighbourhood_data_public_read" ON neighbourhood_data;
CREATE POLICY "neighbourhood_data_public_read"
  ON neighbourhood_data
  FOR SELECT
  TO authenticated
  USING (true);

-- 3e. market_stats_cache — shared market statistics cache.
ALTER TABLE IF EXISTS market_stats_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_stats_cache_public_read" ON market_stats_cache;
CREATE POLICY "market_stats_cache_public_read"
  ON market_stats_cache
  FOR SELECT
  TO authenticated
  USING (true);


-- ================================================================
-- 117_voice_confidence_score.sql
-- ================================================================
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


-- ================================================================
-- 120_editorial_auto_draft_setting.sql
-- ================================================================
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


-- ================================================================
-- 121_editorial_billing.sql
-- ================================================================
-- =============================================================================
-- Migration: 121_editorial_billing.sql
-- Description: Add editorial billing tier enforcement fields to the users table.
--              Supports Starter (2 editions/mo free) and Pro ($79/mo unlimited).
-- Created: 2026-04-15
-- =============================================================================

-- ── Tier column ───────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS editorial_tier text NOT NULL DEFAULT 'starter'
    CHECK (editorial_tier IN ('starter', 'pro', 'pro_plus'));

COMMENT ON COLUMN users.editorial_tier IS
  'Editorial newsletter billing tier: starter (2/mo free), pro ($79/mo unlimited), pro_plus (unlimited + priority)';

-- ── Monthly edition counter ───────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS editorial_editions_this_month integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.editorial_editions_this_month IS
  'Rolling count of editorial editions created in the current calendar month. Reset by cron on 1st of each month.';

-- ── Trial window ──────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS editorial_trial_ends_at timestamptz NULL;

COMMENT ON COLUMN users.editorial_trial_ends_at IS
  'When the Pro trial expires. NULL means no active trial.';

-- ── Stripe identifiers ────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id text NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text NULL;

COMMENT ON COLUMN users.stripe_customer_id IS
  'Stripe customer ID for billing management';

COMMENT ON COLUMN users.stripe_subscription_id IS
  'Active Stripe subscription ID. NULL = free tier.';

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_editorial_tier
  ON users (editorial_tier);

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;


-- ================================================================
-- 126_journey_nba_override.sql
-- ================================================================
ALTER TABLE contact_journeys
  ADD COLUMN IF NOT EXISTS next_email_type_override text;

COMMENT ON COLUMN contact_journeys.next_email_type_override IS
  'Next-best-action override: if set, processJourneyQueue sends this email type next instead of the schedule default';


-- ================================================================
-- 127_newsletter_integrity.sql
-- ================================================================
-- 127: Newsletter engine data integrity fixes

-- 1. Unique constraint on resend_message_id (C-21)
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletters_resend_message_id
  ON newsletters (resend_message_id)
  WHERE resend_message_id IS NOT NULL;

-- 2. Index for resend_message_id lookups
CREATE INDEX IF NOT EXISTS idx_newsletters_resend_message_id
  ON newsletters (resend_message_id)
  WHERE resend_message_id IS NOT NULL;

-- 3. sent_at required when status=sent (H-15)
DO $$
BEGIN
  ALTER TABLE newsletters
    ADD CONSTRAINT ck_sent_requires_timestamp
    CHECK (status != 'sent' OR sent_at IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Composite index for journey queue (H-22)
CREATE INDEX IF NOT EXISTS idx_contact_journeys_queue
  ON contact_journeys (next_email_at ASC, is_paused, contact_id)
  WHERE is_paused = false AND next_email_at IS NOT NULL;

-- 5. Composite index for newsletters dedup (H-23)
CREATE INDEX IF NOT EXISTS idx_newsletters_contact_status_sent
  ON newsletters (contact_id, status, sent_at DESC)
  WHERE status IN ('sent', 'sending');

-- 6. Index for journey dashboard (M-12)
CREATE INDEX IF NOT EXISTS idx_contact_journeys_type_paused
  ON contact_journeys (journey_type, is_paused);

-- 7. Auto-update updated_at trigger for contact_journeys (M-14)
CREATE OR REPLACE FUNCTION update_contact_journeys_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_journeys_updated ON contact_journeys;
CREATE TRIGGER trg_contact_journeys_updated
  BEFORE UPDATE ON contact_journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_journeys_timestamp();

-- 8. Newsletter status state machine (C-20)
CREATE OR REPLACE FUNCTION validate_newsletter_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('approved','sending','failed','skipped','deferred') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'approved' AND NEW.status NOT IN ('sending','draft','deferred','skipped') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'sending' AND NEW.status NOT IN ('sent','failed','draft') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'sent' AND NEW.status != 'sent' THEN
    RAISE EXCEPTION 'Cannot transition from sent status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_newsletter_status_machine ON newsletters;
CREATE TRIGGER trg_newsletter_status_machine
  BEFORE UPDATE ON newsletters
  FOR EACH ROW
  EXECUTE FUNCTION validate_newsletter_status_transition();

-- 9. Clean orphaned contact_journeys with no contact (M-13)
DELETE FROM contact_journeys WHERE contact_id IS NULL;

-- 10. Auto-clear stale NBA overrides after 1 day (M-15)
-- Add column if not exists
ALTER TABLE contact_journeys
  ADD COLUMN IF NOT EXISTS nba_override_set_at TIMESTAMPTZ;


-- ================================================================
-- 131_newsletter_regeneration.sql
-- ================================================================
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS regeneration_count INT DEFAULT 0;


-- ================================================================
-- 132_newsletter_regen_not_null.sql
-- ================================================================
-- L4: Enforce NOT NULL on regeneration_count — migration 131 added the column
-- without NOT NULL, allowing old code paths to insert NULL values.
-- Backfill any NULLs first, then apply the constraint.
UPDATE newsletters SET regeneration_count = 0 WHERE regeneration_count IS NULL;
ALTER TABLE newsletters ALTER COLUMN regeneration_count SET DEFAULT 0;
ALTER TABLE newsletters ALTER COLUMN regeneration_count SET NOT NULL;

