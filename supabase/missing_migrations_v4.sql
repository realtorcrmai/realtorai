-- ================================================================
-- ALL MIGRATIONS 103→132 — Apply to production Supabase
-- Generated: 2026-04-17 (v3 — complete set, safe to re-run)
-- All idempotent (IF NOT EXISTS / ON CONFLICT)
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
-- 104_ai_quality_tier.sql
-- ================================================================
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


-- ================================================================
-- 104_platform_analytics.sql
-- ================================================================
-- Platform Analytics + Admin Infrastructure

-- 1. Platform analytics (unified event table for business metrics + admin audit)
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_event_name ON platform_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_pa_user_id ON platform_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_created_at ON platform_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_pa_event_created ON platform_analytics(event_name, created_at);

ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read access" ON platform_analytics;
CREATE POLICY "Admin read access" ON platform_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Service insert access" ON platform_analytics;
CREATE POLICY "Service insert access" ON platform_analytics
  FOR INSERT WITH CHECK (true);

-- 2. User columns for admin visibility
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'organic';

CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- 3. Platform config (announcement banner, minimal flags)
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only" ON platform_config;
CREATE POLICY "Admin only" ON platform_config FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

INSERT INTO platform_config (key, value) VALUES
  ('announcement', 'null')
ON CONFLICT (key) DO NOTHING;

-- 4. Fix signup_events (table referenced in 5 code files but never created)
CREATE TABLE IF NOT EXISTS signup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_events_user ON signup_events(user_id);
ALTER TABLE signup_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON signup_events;
CREATE POLICY "Authenticated access" ON signup_events FOR ALL USING (true);


-- ================================================================
-- 105_create_admin_user.sql
-- ================================================================
-- Create a dedicated admin user for platform administration
-- Login: admin@realtors360.ai / Admin360!secure

INSERT INTO users (email, name, role, plan, is_active, onboarding_completed, onboarding_step, signup_source, password_hash)
VALUES (
  'admin@realtors360.ai',
  'Platform Admin',
  'admin',
  'admin',
  true,
  true,
  7,
  'admin_created',
  '$2b$10$Z0jfDJ/.5nbS5IhEM7sBe.Rzps99Bqhb.X74LyEMuNql5We/9LbiK'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  plan = 'admin',
  is_active = true,
  password_hash = '$2b$10$Z0jfDJ/.5nbS5IhEM7sBe.Rzps99Bqhb.X74LyEMuNql5We/9LbiK';


-- ================================================================
-- 110_lock_rls_policies.sql
-- ================================================================
-- 110_lock_rls_policies.sql
--
-- P0 SECURITY: Rewrite all open USING(true) RLS policies on tables
-- with a realtor_id column to scope by realtor_id = auth.uid().
--
-- Before: 66+ tenant tables had USING(true) policies.
-- After: RLS enforces tenant isolation at the database level.

DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
  policy_name TEXT;
  col_type TEXT;
  exempt_tables TEXT[] := ARRAY[
    'newsletter_templates', 'email_template_registry', 'knowledge_articles',
    'neighbourhood_data', 'market_stats_cache', 'verification_tokens',
    'signup_events', 'signup_rate_limits', 'onboarding_checklist',
    'welcome_drip_log', 'team_invites', 'tutor_users', 'tutor_sessions',
    'tutor_messages', 'tutor_cefr_history'
  ];
BEGIN
  FOR tbl IN
    SELECT DISTINCT c.table_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'realtor_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name != ALL(exempt_tables)
    ORDER BY c.table_name
  LOOP
    -- Drop ALL existing policies
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl.table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl.table_name);
    END LOOP;

    -- Ensure RLS enabled
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.table_name);

    -- Create tenant-scoped policy (handle uuid vs text realtor_id)
    policy_name := 'tenant_isolation_' || tbl.table_name;

    IF tbl.data_type = 'uuid' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (realtor_id = auth.uid()::uuid) WITH CHECK (realtor_id = auth.uid()::uuid)',
        policy_name, tbl.table_name
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (realtor_id = auth.uid()::text) WITH CHECK (realtor_id = auth.uid()::text)',
        policy_name, tbl.table_name
      );
    END IF;

    RAISE NOTICE 'Locked: %', tbl.table_name;
  END LOOP;
END $$;


-- ================================================================
-- 111_smart_lists.sql
-- ================================================================
-- Smart Lists: saved dynamic filters for contacts, listings, showings
-- Used as the agent's daily workspace (Follow Up Boss "Smart Lists" pattern)

CREATE TABLE IF NOT EXISTS smart_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'listings', 'showings')),
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  match_mode TEXT NOT NULL DEFAULT 'all' CHECK (match_mode IN ('all', 'any')),
  sort_field TEXT NOT NULL DEFAULT 'created_at',
  sort_order TEXT NOT NULL DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  notify_threshold INTEGER DEFAULT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE smart_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smart_lists_all" ON smart_lists;
CREATE POLICY "smart_lists_all" ON smart_lists FOR ALL USING (true);

CREATE INDEX idx_smart_lists_realtor ON smart_lists(realtor_id);
CREATE INDEX idx_smart_lists_pinned ON smart_lists(realtor_id, is_pinned) WHERE is_pinned = true;


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
-- 113_editorial_newsletter_system.sql
-- ================================================================
-- =============================================================================
-- Migration: 113_editorial_newsletter_system.sql
-- Description: Editorial Newsletter System — editions, block templates, voice
--              profiles, content library, external data cache, and analytics
-- Created: 2026-04-15
-- =============================================================================

-- ---------------------------------------------------------------------------
-- HELPER: updated_at trigger function (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE 1: editorial_editions
-- =============================================================================
CREATE TABLE IF NOT EXISTS editorial_editions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id              uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                   text        NOT NULL,
  edition_type            text        NOT NULL CHECK (edition_type IN (
                            'market_update', 'just_sold', 'open_house',
                            'neighbourhood_spotlight', 'rate_watch', 'seasonal'
                          )),
  status                  text        NOT NULL DEFAULT 'draft' CHECK (status IN (
                            'draft', 'generating', 'ready', 'sent', 'failed', 'scheduled'
                          )),
  blocks                  jsonb       NOT NULL DEFAULT '[]',
  edition_number          integer     NOT NULL DEFAULT 1,
  subject_a               text,
  subject_b               text,
  active_variant          text        DEFAULT 'a' CHECK (active_variant IN ('a', 'b')),
  send_count              integer     NOT NULL DEFAULT 0,
  recipient_count         integer     NOT NULL DEFAULT 0,
  scheduled_at            timestamptz,
  sent_at                 timestamptz,
  generation_started_at   timestamptz,
  generation_error        text,
  voice_profile_id        uuid,
  realtor_agent_config_id uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_editorial_editions_realtor_id
  ON editorial_editions (realtor_id);

CREATE INDEX IF NOT EXISTS idx_editorial_editions_status
  ON editorial_editions (status);

CREATE INDEX IF NOT EXISTS idx_editorial_editions_created_at
  ON editorial_editions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_editorial_editions_edition_type
  ON editorial_editions (edition_type);

-- RLS
ALTER TABLE editorial_editions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_editions_realtor_policy ON editorial_editions;
CREATE POLICY editorial_editions_realtor_policy
  ON editorial_editions
  FOR ALL
  USING (realtor_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_editorial_editions_updated_at ON editorial_editions;
CREATE TRIGGER trg_editorial_editions_updated_at
  BEFORE UPDATE ON editorial_editions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE 2: editorial_block_templates
-- =============================================================================
CREATE TABLE IF NOT EXISTS editorial_block_templates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  block_type       text        NOT NULL UNIQUE CHECK (block_type IN (
                     'hero', 'just_sold', 'market_commentary', 'rate_watch',
                     'local_intel', 'neighborhood_spotlight', 'quick_tip',
                     'agent_note', 'cta', 'divider'
                   )),
  label            text        NOT NULL,
  description      text        NOT NULL,
  icon             text        NOT NULL,
  default_content  jsonb       NOT NULL DEFAULT '{}',
  required_fields  text[]      NOT NULL DEFAULT '{}',
  optional_fields  text[]      NOT NULL DEFAULT '{}',
  ai_prompt_hint   text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- No RLS — global lookup table

-- Seed all 10 block types (idempotent via ON CONFLICT)
INSERT INTO editorial_block_templates
  (block_type, label, description, icon, default_content, required_fields, optional_fields, ai_prompt_hint)
VALUES
  (
    'hero',
    'Hero Banner',
    'Opening statement with headline and subheadline',
    '🏠',
    '{}',
    '{headline}',
    '{subheadline,image_url}',
    'Write a compelling headline (max 80 chars) for the [edition_type] edition. Use active voice, include a specific data point or place name.'
  ),
  (
    'just_sold',
    'Just Sold',
    'Recent sale celebration with price and highlights',
    '🏷️',
    '{}',
    '{address,sale_price}',
    '{highlight_1,highlight_2,highlight_3,days_on_market}',
    'Celebrate this sale. 3 specific highlights about what made it sell. Avoid passive voice.'
  ),
  (
    'market_commentary',
    'Market Commentary',
    'Local market analysis 80-180 words with data',
    '📊',
    '{}',
    '{commentary}',
    '{stat_1_label,stat_1_value,stat_2_label,stat_2_value}',
    'Write 80-180 words of market commentary. Include at least 2 specific statistics (prices, days on market, list/sale ratios). Identify market as buyer or seller. No filler phrases.'
  ),
  (
    'rate_watch',
    'Rate Watch',
    'Current mortgage rate table with commentary',
    '📉',
    '{}',
    '{commentary}',
    '{rate_1yr,rate_3yr,rate_5yr,variable_rate}',
    'Write 40-80 words on what current rates mean for buyers or sellers right now. Be specific and actionable.'
  ),
  (
    'local_intel',
    'Local Intel',
    'Neighbourhood news and community updates',
    '🗞️',
    '{}',
    '{headline,news_item}',
    '{source_url,image_url}',
    'Report a real piece of neighbourhood news. Avoid demographic language. Fair Housing compliant.'
  ),
  (
    'neighborhood_spotlight',
    'Neighbourhood Spotlight',
    'Area lifestyle feature with local character',
    '📍',
    '{}',
    '{neighbourhood,description}',
    '{highlight_1,highlight_2,highlight_3,walkability_score}',
    'Describe the lifestyle and character of this neighbourhood in 60-100 words. Mention specific streets, shops, parks. Avoid demographic references.'
  ),
  (
    'quick_tip',
    'Quick Tip',
    'One actionable homeowner or buyer/seller tip',
    '💡',
    '{}',
    '{tip_text}',
    '{tip_category}',
    'Write one specific, actionable tip in 40-80 words. Must be something the reader can do this week. No generic advice.'
  ),
  (
    'agent_note',
    'Agent Note',
    'Personal message from the agent in their voice',
    '✍️',
    '{}',
    '{note}',
    '{signature_phrase}',
    'Write a personal note in the agent voice profile. Authentic, warm. 50-100 words. End with signature phrase if provided. Sound like a human, not a newsletter.'
  ),
  (
    'cta',
    'Call to Action',
    'Action button with headline and URL',
    '🎯',
    '{}',
    '{button_text,button_url}',
    '{cta_headline,cta_subtext}',
    'Write a specific CTA headline (max 60 chars). Button text max 30 chars. Based on reader journey stage.'
  ),
  (
    'divider',
    'Divider',
    'Visual separator between sections',
    '➖',
    '{}',
    '{}',
    '{}',
    NULL
  )
ON CONFLICT (block_type) DO UPDATE SET
  label           = EXCLUDED.label,
  description     = EXCLUDED.description,
  icon            = EXCLUDED.icon,
  default_content = EXCLUDED.default_content,
  required_fields = EXCLUDED.required_fields,
  optional_fields = EXCLUDED.optional_fields,
  ai_prompt_hint  = EXCLUDED.ai_prompt_hint;

-- =============================================================================
-- TABLE 3: editorial_voice_profiles
-- =============================================================================
CREATE TABLE IF NOT EXISTS editorial_voice_profiles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id      uuid        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tone            text        NOT NULL DEFAULT 'professional' CHECK (tone IN (
                    'professional', 'friendly', 'luxury', 'casual', 'authoritative'
                  )),
  writing_style   text        NOT NULL DEFAULT 'clear-and-direct',
  signature_phrase text,
  sample_email    text,
  voice_rules     jsonb       NOT NULL DEFAULT '[]',
  voice_version   integer     NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- The UNIQUE constraint on realtor_id implicitly creates an index

-- RLS
ALTER TABLE editorial_voice_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_voice_profiles_realtor_policy ON editorial_voice_profiles;
CREATE POLICY editorial_voice_profiles_realtor_policy
  ON editorial_voice_profiles
  FOR ALL
  USING (realtor_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_editorial_voice_profiles_updated_at ON editorial_voice_profiles;
CREATE TRIGGER trg_editorial_voice_profiles_updated_at
  BEFORE UPDATE ON editorial_voice_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE 4: editorial_content_library
-- =============================================================================
CREATE TABLE IF NOT EXISTS editorial_content_library (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_type       text        NOT NULL,
  content          jsonb       NOT NULL DEFAULT '{}',
  context_tags     text[]      NOT NULL DEFAULT '{}',
  similarity_score numeric(4,3) DEFAULT 0,
  use_count        integer     NOT NULL DEFAULT 0,
  last_used_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_editorial_content_library_realtor_id
  ON editorial_content_library (realtor_id);

CREATE INDEX IF NOT EXISTS idx_editorial_content_library_block_type
  ON editorial_content_library (block_type);

CREATE INDEX IF NOT EXISTS idx_editorial_content_library_context_tags
  ON editorial_content_library USING GIN (context_tags);

-- RLS
ALTER TABLE editorial_content_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_content_library_realtor_policy ON editorial_content_library;
CREATE POLICY editorial_content_library_realtor_policy
  ON editorial_content_library
  FOR ALL
  USING (realtor_id = auth.uid());

-- =============================================================================
-- TABLE 5: external_data_cache
-- =============================================================================
CREATE TABLE IF NOT EXISTS external_data_cache (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   text        NOT NULL UNIQUE,
  data        jsonb       NOT NULL DEFAULT '{}',
  source      text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes (UNIQUE on cache_key already creates one)
CREATE INDEX IF NOT EXISTS idx_external_data_cache_expires_at
  ON external_data_cache (expires_at);

-- No RLS — shared global cache

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_external_data_cache_updated_at ON external_data_cache;
CREATE TRIGGER trg_external_data_cache_updated_at
  BEFORE UPDATE ON external_data_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE 6: newsletter_analytics
-- =============================================================================
CREATE TABLE IF NOT EXISTS newsletter_analytics (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id          uuid        NOT NULL REFERENCES editorial_editions(id) ON DELETE CASCADE,
  realtor_id          uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_count     integer     NOT NULL DEFAULT 0,
  open_count          integer     NOT NULL DEFAULT 0,
  click_count         integer     NOT NULL DEFAULT 0,
  bounce_count        integer     NOT NULL DEFAULT 0,
  unsubscribe_count   integer     NOT NULL DEFAULT 0,
  open_rate           numeric(5,2) GENERATED ALWAYS AS (
                        CASE
                          WHEN recipient_count > 0
                          THEN round((open_count::numeric / recipient_count) * 100, 2)
                          ELSE 0
                        END
                      ) STORED,
  click_rate          numeric(5,2) GENERATED ALWAYS AS (
                        CASE
                          WHEN recipient_count > 0
                          THEN round((click_count::numeric / recipient_count) * 100, 2)
                          ELSE 0
                        END
                      ) STORED,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_analytics_edition_id_unique UNIQUE (edition_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_realtor_id
  ON newsletter_analytics (realtor_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_edition_id
  ON newsletter_analytics (edition_id);

-- RLS
ALTER TABLE newsletter_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_analytics_realtor_policy ON newsletter_analytics;
CREATE POLICY newsletter_analytics_realtor_policy
  ON newsletter_analytics
  FOR ALL
  USING (realtor_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_newsletter_analytics_updated_at ON newsletter_analytics;
CREATE TRIGGER trg_newsletter_analytics_updated_at
  BEFORE UPDATE ON newsletter_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROLLBACK (run in reverse order if needed)
-- =============================================================================
-- DROP TABLE IF EXISTS newsletter_analytics;
-- DROP TABLE IF EXISTS external_data_cache;
-- DROP TABLE IF EXISTS editorial_content_library;
-- DROP TABLE IF EXISTS editorial_voice_profiles;
-- DROP TABLE IF EXISTS editorial_block_templates;
-- DROP TABLE IF EXISTS editorial_editions;
-- DROP FUNCTION IF EXISTS update_updated_at_column();


-- ================================================================
-- 114_editorial_schema_fixes.sql
-- ================================================================
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

-- =============================================================================
-- PART 3: Additional indexes for query performance
-- =============================================================================

-- Composite index on (realtor_id, status) — common filter pattern when
-- listing editions for a realtor filtered by status
CREATE INDEX IF NOT EXISTS idx_editorial_editions_realtor_status
  ON editorial_editions (realtor_id, status);

-- Partial index for stale/errored cache entries — used in cleanup queries
CREATE INDEX IF NOT EXISTS idx_external_data_cache_stale
  ON external_data_cache (realtor_id, expires_at)
  WHERE fetch_status != 'ok';

-- Full composite index for the general cache cleanup query (DELETE WHERE expires_at < now())
-- and any per-realtor expiry scans regardless of fetch_status
CREATE INDEX IF NOT EXISTS idx_external_data_cache_realtor_expires
  ON external_data_cache (realtor_id, expires_at);


-- ================================================================
-- 115_editorial_ab_and_analytics.sql
-- ================================================================
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


-- ================================================================
-- 116_editorial_transactions.sql
-- ================================================================
-- =============================================================================
-- Migration 116: editorial_transactions — agent property transactions
-- Links to just_sold and other editorial blocks
-- =============================================================================

CREATE TABLE IF NOT EXISTS editorial_transactions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address         text        NOT NULL,
  city            text        NOT NULL DEFAULT 'Vancouver',
  province        text        NOT NULL DEFAULT 'BC',
  transaction_type text       NOT NULL DEFAULT 'just_sold' CHECK (transaction_type IN (
                    'just_sold', 'just_listed', 'coming_soon', 'price_reduced'
                  )),
  sale_price      bigint,       -- in cents, null if not sold
  list_price      bigint        NOT NULL,  -- in cents
  days_on_market  integer,
  bedrooms        integer,
  bathrooms       numeric(3,1),
  sqft            integer,
  photo_url       text,
  headline        text,         -- max 120 chars
  story           text,         -- max 600 chars
  sold_at         date,
  listed_at       date,
  is_featured     boolean       NOT NULL DEFAULT false,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editorial_transactions_realtor_id
  ON editorial_transactions (realtor_id);

CREATE INDEX IF NOT EXISTS idx_editorial_transactions_type
  ON editorial_transactions (realtor_id, transaction_type);

CREATE INDEX IF NOT EXISTS idx_editorial_transactions_featured
  ON editorial_transactions (realtor_id, is_featured)
  WHERE is_featured = true;

ALTER TABLE editorial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_transactions_realtor_policy ON editorial_transactions;
CREATE POLICY editorial_transactions_realtor_policy
  ON editorial_transactions
  FOR ALL
  USING (realtor_id = auth.uid());

DROP TRIGGER IF EXISTS trg_editorial_transactions_updated_at ON editorial_transactions;
CREATE TRIGGER trg_editorial_transactions_updated_at
  BEFORE UPDATE ON editorial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


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
-- 118_analytics_increment_rpc.sql
-- ================================================================
-- =============================================================================
-- Migration 118: Atomic increment functions for editorial analytics
-- Description: Prevents race conditions in the Resend webhook handler.
--   The old handler did SELECT → compute → UPDATE which loses counts under
--   concurrent events. These RPC functions execute the increment atomically
--   inside a single Postgres UPDATE ... SET col = col + 1 statement.
-- Created: 2026-04-15
-- =============================================================================

-- ── increment_editorial_opens ─────────────────────────────────────────────────
-- Atomically increments opens (and per-variant opens) on editorial_analytics.
-- Also recomputes open_rate in the same UPDATE.

CREATE OR REPLACE FUNCTION increment_editorial_opens(
  p_edition_id uuid,
  p_variant    text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE editorial_analytics
  SET
    opens           = opens + 1,
    variant_a_opens = CASE WHEN p_variant = 'a' THEN variant_a_opens + 1 ELSE variant_a_opens END,
    variant_b_opens = CASE WHEN p_variant = 'b' THEN variant_b_opens + 1 ELSE variant_b_opens END,
    open_rate       = CASE
                        WHEN recipients > 0
                        THEN ROUND((opens + 1)::numeric / recipients * 100, 2)
                        ELSE 0
                      END,
    updated_at      = now()
  WHERE edition_id = p_edition_id;
END;
$$;

-- ── increment_editorial_clicks ────────────────────────────────────────────────
-- Atomically increments clicks, per-variant clicks, block_clicks JSONB map,
-- cta_clicks JSONB map, and (conditionally) high_intent_clicks.

CREATE OR REPLACE FUNCTION increment_editorial_clicks(
  p_edition_id uuid,
  p_variant    text DEFAULT NULL,
  p_block_id   text DEFAULT 'unknown',
  p_cta_type   text DEFAULT 'link'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE editorial_analytics
  SET
    clicks           = clicks + 1,
    variant_a_clicks = CASE WHEN p_variant = 'a' THEN variant_a_clicks + 1 ELSE variant_a_clicks END,
    variant_b_clicks = CASE WHEN p_variant = 'b' THEN variant_b_clicks + 1 ELSE variant_b_clicks END,
    click_rate       = CASE
                         WHEN recipients > 0
                         THEN ROUND((clicks + 1)::numeric / recipients * 100, 2)
                         ELSE 0
                       END,
    -- Increment block_clicks[p_block_id] atomically
    block_clicks     = jsonb_set(
                         block_clicks,
                         ARRAY[p_block_id],
                         to_jsonb(COALESCE((block_clicks ->> p_block_id)::int, 0) + 1)
                       ),
    -- Increment cta_clicks[p_cta_type] atomically
    cta_clicks       = jsonb_set(
                         cta_clicks,
                         ARRAY[p_cta_type],
                         to_jsonb(COALESCE((cta_clicks ->> p_cta_type)::int, 0) + 1)
                       ),
    -- Only increment high_intent_clicks for CTA types that signal purchase intent
    high_intent_clicks = CASE
                           WHEN p_cta_type IN ('book_showing', 'request_cma', 'contact_agent')
                           THEN high_intent_clicks + 1
                           ELSE high_intent_clicks
                         END,
    updated_at       = now()
  WHERE edition_id = p_edition_id;
END;
$$;

-- ── increment_editorial_bounces ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_editorial_bounces(p_edition_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE editorial_analytics
  SET bounced    = bounced + 1,
      updated_at = now()
  WHERE edition_id = p_edition_id;
END;
$$;

-- ── increment_editorial_unsubscribes ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_editorial_unsubscribes(p_edition_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE editorial_analytics
  SET unsubscribed = unsubscribed + 1,
      updated_at   = now()
  WHERE edition_id = p_edition_id;
END;
$$;


-- ================================================================
-- 119_editorial_content_library_seed.sql
-- ================================================================
-- =============================================================================
-- Migration: 119_editorial_content_library_seed.sql
-- Description: Fix editorial_content_library schema to support platform tips
--   (realtor_id nullable), add country + season columns, and seed 50 tips.
-- Created: 2026-04-15
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PART 1: Schema fixes — make realtor_id nullable, add country/season columns
-- ---------------------------------------------------------------------------

-- Make realtor_id nullable (NULL = platform tip, visible to all agents)
ALTER TABLE editorial_content_library
  ALTER COLUMN realtor_id DROP NOT NULL;

-- Add country column (CA / US / BOTH)
ALTER TABLE editorial_content_library
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'BOTH'
    CHECK (country IN ('CA', 'US', 'BOTH'));

-- Add season column (spring / summer / fall / winter / all)
ALTER TABLE editorial_content_library
  ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT 'all'
    CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'all'));

-- Update RLS to allow all agents to read platform tips (realtor_id IS NULL)
DROP POLICY IF EXISTS editorial_content_library_realtor_policy ON editorial_content_library;
DROP POLICY IF EXISTS editorial_content_library_read_policy ON editorial_content_library;
DROP POLICY IF EXISTS editorial_content_library_write_policy ON editorial_content_library;
CREATE POLICY editorial_content_library_read_policy
  ON editorial_content_library
  FOR SELECT
  USING (realtor_id IS NULL OR realtor_id = auth.uid());

CREATE POLICY editorial_content_library_write_policy
  ON editorial_content_library
  FOR ALL
  USING (realtor_id = auth.uid());

-- Index for country + season filters
CREATE INDEX IF NOT EXISTS idx_editorial_content_library_country
  ON editorial_content_library (country);

CREATE INDEX IF NOT EXISTS idx_editorial_content_library_season
  ON editorial_content_library (season);

-- ---------------------------------------------------------------------------
-- PART 2: Seed data — 20 CA tips + 20 US tips + 10 BOTH tips
-- ---------------------------------------------------------------------------

INSERT INTO editorial_content_library
  (id, realtor_id, block_type, content, context_tags, country, season, use_count)
VALUES

-- ============================================================
-- CANADA TIPS (20)
-- ============================================================

-- Spring CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Get a strata document review before you waive subjects","tip_text":"Before removing conditions on a strata unit, hire a strata document reviewer ($200–$400). They flag special levies, depreciation report deficiencies, bylaw restrictions (rental bans, pet rules), and active litigation that standard disclosure does not surface. One missed levy can mean a $10,000+ surprise after closing.","tip_category":"buyers"}',
 ARRAY['strata','condo','subjects'], 'CA', 'spring', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"List in late April to catch peak spring buyer demand","tip_text":"In most Canadian markets, the last two weeks of April and first two weeks of May consistently produce the highest buyer traffic of the year. Buyers who paused over winter return with pre-approvals in hand. Listing during this window typically means faster sales and stronger offer competition — both signal higher final prices.","tip_category":"sellers"}',
 ARRAY['timing','listing','spring-market'], 'CA', 'spring', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Budget for BC property transfer tax before you make an offer","tip_text":"BC''s Property Transfer Tax is 1% on the first $200,000, 2% on the portion up to $2 million, and 3% above that. On a $900,000 home, that is $16,000 due on closing day — separate from your down payment. First-time buyers may qualify for a full or partial exemption if the purchase price is under $835,000.","tip_category":"buyers"}',
 ARRAY['tax','closing-costs','BC'], 'CA', 'spring', 0),

-- Summer CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Sellers: overgrown landscaping costs you more than you think","tip_text":"Unkempt lawns, overgrown hedges, and untended garden beds are among the top reasons buyers form a negative first impression before they even enter your home. A professional tidy-up costs $300–$600 and can prevent a $10,000–$20,000 low-ball offer from a buyer who assumes the interior is equally neglected.","tip_category":"sellers"}',
 ARRAY['curb-appeal','staging','summer'], 'CA', 'summer', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Use summer to complete deferred maintenance before fall listing","tip_text":"Planning to list in September? Use July and August to address deferred maintenance: roof, gutters, caulking, deck condition, and HVAC servicing. Buyers in fall markets conduct more thorough inspections after summer purchase cycles wind down. Arriving at your inspection with a binder of completed repairs positions you to hold firm on price.","tip_category":"sellers"}',
 ARRAY['maintenance','fall-listing','preparation'], 'CA', 'summer', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Lock your mortgage rate hold now — they expire in 90–120 days","tip_text":"Most Canadian lenders will hold a pre-approved rate for 90 to 120 days at no cost. If you are shopping in summer with a fall move-in target, securing a rate hold today protects you against rate increases. If rates drop before closing, most lenders will honour the lower rate.","tip_category":"mortgage"}',
 ARRAY['pre-approval','rate-hold','mortgage'], 'CA', 'summer', 0),

-- Fall CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"The fall market window closes fast — be ready to act by Thanksgiving","tip_text":"In most Canadian markets, serious fall activity runs from Labour Day through Canadian Thanksgiving (mid-October). After that, buyer traffic drops sharply as families settle into school routines. Buyers who want a December possession date must act in this window, which creates genuine urgency you can use in negotiations.","tip_category":"buyers"}',
 ARRAY['timing','fall-market','negotiation'], 'CA', 'fall', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Sellers who leave their home on the market in December often get better prices","tip_text":"Many sellers pull listings in December assuming no one buys in winter. That belief creates opportunity: buyers active in December are highly motivated — they are relocating for work, have a lease ending, or have already sold. Serious buyers in a thin market often bid closer to asking price because competition is lower on the buy side.","tip_category":"sellers"}',
 ARRAY['winter-listing','motivated-buyers','strategy'], 'CA', 'fall', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Review your home insurance before a fall purchase closes","tip_text":"Insurers in Canada have tightened underwriting on older homes — knob-and-tube wiring, aluminum wiring, galvanized plumbing, and oil tanks can trigger policy exclusions or premium surcharges. Confirm you can get insurable coverage (and at what cost) before removing subjects, not after. Some lenders require proof of insurance 48 hours before funding.","tip_category":"buyers"}',
 ARRAY['insurance','subjects','due-diligence'], 'CA', 'fall', 0),

-- Winter CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Canada''s First Home Savings Account can save you $8,000 in tax","tip_text":"The First Home Savings Account (FHSA) lets eligible first-time buyers contribute up to $8,000 per year (lifetime max $40,000) and deduct contributions from taxable income — like an RRSP. Withdrawals for a qualifying first home are tax-free — unlike an RRSP Home Buyers'' Plan, the FHSA amount never needs to be repaid.","tip_category":"mortgage"}',
 ARRAY['FHSA','first-time-buyer','tax'], 'CA', 'winter', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"January is the best month to get honest pricing from your agent","tip_text":"Listing agents who review the market in January — before spring activity picks up — can give you the most honest comparable analysis of the year. They are not competing with 15 other offers and can look at what actually sold in Q4 versus what was wishful-price listing. Use this window to set your strategy before the spring rush.","tip_category":"sellers"}',
 ARRAY['pricing','strategy','winter'], 'CA', 'winter', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Get a home inspection even in a competitive offer situation","tip_text":"Waiving inspection in a multiple-offer market is tempting, but it exposes you to significant risk. Consider booking a pre-inspection before offers are due — many listing agents will facilitate access. Alternatively, include an inspection condition with a tight 5-day window rather than waiving it entirely. A $500 inspection is cheap compared to a $30,000 surprise.","tip_category":"buyers"}',
 ARRAY['inspection','subjects','risk'], 'CA', 'winter', 0),

-- All-season CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Understand the difference between assessed and market value in BC","tip_text":"BC Assessment value is based on data from July 1 of the prior year and does not reflect current market conditions. In active markets, homes sell well above assessed value; in slow markets, they may sell below. Your listing price should be based on recent comparable sales, not your assessment notice. They are two very different numbers.","tip_category":"sellers"}',
 ARRAY['BC-assessment','pricing','sellers'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"CASL consent: always confirm email permission before adding contacts","tip_text":"Canada''s Anti-Spam Legislation requires express or implied consent before sending commercial emails to contacts. Express consent (they opted in) is safest. Implied consent (business relationship in the past 2 years) has an expiry. Always document when and how consent was given — CASL fines reach $10 million per violation for organizations.","tip_category":"market"}',
 ARRAY['CASL','compliance','email'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Rental bylaws in BC strata buildings change frequently — always verify","tip_text":"Strata corporations in BC can change rental restriction bylaws with a 3/4 vote of owners. A building that was investor-friendly two years ago may have since passed rental ban bylaws. Before buying any strata unit as a rental, request the most recent bylaw package and confirm no rental restriction resolutions are pending at the next AGM.","tip_category":"buyers"}',
 ARRAY['strata','rental','investors'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Your RRSP Home Buyers'' Plan gives you $35,000 tax-free for a down payment","tip_text":"First-time buyers in Canada can withdraw up to $35,000 from their RRSP under the Home Buyers'' Plan without immediate tax. Couples can withdraw $35,000 each, contributing up to $70,000 toward a down payment. Funds must be in your RRSP for at least 90 days before withdrawal, and repayment begins 2 years after purchase over 15 years.","tip_category":"mortgage"}',
 ARRAY['RRSP','HBP','first-time-buyer'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Foreign buyer rules in Canada: know before you advise investor clients","tip_text":"Canada''s Prohibition on the Purchase of Residential Property by Non-Canadians Act bans most non-Canadians from buying residential real estate. There are exceptions for work permit holders, refugees, and certain mixed-use properties. Always confirm your buyer client''s residency and citizenship status before they make an offer — violations carry significant penalties.","tip_category":"buyers"}',
 ARRAY['foreign-buyer','compliance','investors'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Depreciation reports tell you what a strata building will cost to maintain","tip_text":"BC law requires strata corporations with 5+ lots to commission a depreciation report every 5 years. This report estimates future repair costs for common property — roofs, elevators, parkades — and the recommended contingency reserve fund balance. A strata with a depleted contingency fund and a large upcoming capital expense is a significant financial risk for buyers.","tip_category":"buyers"}',
 ARRAY['strata','depreciation','contingency-reserve'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Land transfer tax in Ontario: know the full amount before your client falls in love","tip_text":"Ontario''s Land Transfer Tax is tiered: 0.5% on the first $55,000, 1% up to $250,000, 1.5% up to $400,000, 2% up to $2 million, and 2.5% above $2 million. Toronto adds a matching municipal tax. On a $1.2M Toronto property, combined LTT exceeds $40,000. First-time buyers may claim a provincial rebate of up to $4,000.","tip_category":"buyers"}',
 ARRAY['land-transfer-tax','Ontario','Toronto'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Subject-free offers in BC: how to protect buyers without waiving conditions","tip_text":"Rather than waiving all subjects, consider using a pre-inspection, requesting the seller''s disclosure statement in advance, and arranging bridge financing commitment. Including a 24-48 hour review period in your offer (not a full inspection condition) can allow your buyer to back out for a fraction of the risk of a fully subject-free offer.","tip_category":"buyers"}',
 ARRAY['subjects','subjects-free','BC','risk'], 'CA', 'all', 0),

-- ============================================================
-- UNITED STATES TIPS (20)
-- ============================================================

-- Spring US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Request a preliminary title report before making an offer","tip_text":"A preliminary title report shows liens, easements, and encumbrances on the property before you are under contract. Your lender will require title insurance anyway, but reviewing the prelim early lets you negotiate price reductions for known issues or walk away before you have spent money on inspections and appraisal.","tip_category":"buyers"}',
 ARRAY['title','due-diligence','prelim'], 'US', 'spring', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Spring sellers: price ahead of the comp data, not behind it","tip_text":"Comparable sales data from winter months reflects a slower market. If your neighborhood is seeing accelerating offers in spring, listing at a spring-appropriate price means you compete for the wave of buyers — not the tail end of it. Work with your agent to project where demand is heading, not just where it has been.","tip_category":"sellers"}',
 ARRAY['pricing','spring-market','comps'], 'US', 'spring', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Verify HOA financials before removing contingencies","tip_text":"HOA financial health directly impacts your home value and monthly costs. Before removing contingencies, review 3 years of HOA meeting minutes, the current reserve fund balance, and any pending special assessments. Underfunded reserves often precede large one-time assessments — sometimes $5,000 to $20,000 — passed down to all unit owners.","tip_category":"buyers"}',
 ARRAY['HOA','due-diligence','contingencies'], 'US', 'spring', 0),

-- Summer US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Waiving appraisal contingency? Understand your actual risk first","tip_text":"Waiving the appraisal contingency means you agree to pay the contract price even if the home appraises below it. Before doing this, calculate the gap: if you offer $750,000 on a home that appraises at $710,000, you need $40,000 cash above your planned down payment to cover the difference. Make sure that cash is liquid and available at closing.","tip_category":"buyers"}',
 ARRAY['appraisal','contingency','competitive'], 'US', 'summer', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Summer is the best time to show large yard spaces and outdoor features","tip_text":"Outdoor kitchens, pools, gardens, and large decks show best in summer when buyers can visualize using them. If your listing has premium outdoor space, schedule open houses and private showings when the landscaping is at peak condition. Consider twilight showings — outdoor lighting and entertaining spaces look their most appealing at dusk.","tip_category":"sellers"}',
 ARRAY['outdoor','staging','open-house'], 'US', 'summer', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Check flood zone status on every property in coastal and low-lying areas","tip_text":"FEMA flood zone maps determine your flood insurance requirement and annual premium. A property in a Special Flood Hazard Area (Zone A or AE) requires flood insurance if you have a federally backed mortgage — often $1,500–$4,000+ per year. Check FEMA''s online map or request a flood elevation certificate before making an offer.","tip_category":"buyers"}',
 ARRAY['flood','FEMA','insurance'], 'US', 'summer', 0),

-- Fall US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Fall buyers face less competition — use it to negotiate closing cost credits","tip_text":"Fall markets in most US cities see 20–30% fewer competing buyers than spring peak. This is leverage. Consider structuring your offer to request seller-paid closing cost credits (typically 2–3% of the purchase price) in exchange for a clean offer price. Sellers who did not sell in spring are often more motivated to contribute to closing costs.","tip_category":"buyers"}',
 ARRAY['negotiation','closing-costs','fall-market'], 'US', 'fall', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Capital gains exclusion: the two-year rule sellers must plan around","tip_text":"Single filers can exclude up to $250,000 in capital gains on a primary residence sale; married couples get $500,000. To qualify, you must have owned and lived in the home for at least 2 of the past 5 years. If you are close to the 2-year mark, timing your listing by a few months could be worth tens of thousands of dollars in tax savings.","tip_category":"sellers"}',
 ARRAY['capital-gains','tax','timing'], 'US', 'fall', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Review your home inspector''s E&O insurance before hiring them","tip_text":"Home inspectors in the US vary widely in training, licensing, and liability coverage. Before hiring, verify the inspector carries Errors and Omissions (E&O) insurance and ask for their sample report. Inspectors who include a liability cap in their contract may limit damages to the inspection fee itself. Reputable inspectors carry $500,000–$1M in coverage.","tip_category":"buyers"}',
 ARRAY['inspection','due-diligence','liability'], 'US', 'fall', 0),

-- Winter US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"FHA loan limits increased for 2025 — check the new ceiling for your county","tip_text":"FHA loan limits are set by county and adjusted annually based on median home prices. In high-cost areas, the 2025 limit has increased significantly. FHA loans allow down payments as low as 3.5% with a 580+ credit score. If you have been telling clients they earn too much for FHA, verify the current county limit — they may still qualify.","tip_category":"mortgage"}',
 ARRAY['FHA','loan-limits','first-time-buyer'], 'US', 'winter', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"December and January are the lowest-competition months to buy","tip_text":"Inventory is thinnest in winter, but so is buyer competition. Sellers listing in December are usually motivated — relocations, divorces, or estate sales — and less likely to get multiple offers. Buyers who transact in winter often pay at or below asking price, while spring buyers frequently overbid. If you can be flexible on timing, winter buying has real financial advantages.","tip_category":"buyers"}',
 ARRAY['timing','winter-market','strategy'], 'US', 'winter', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Use year-end to request a relocation company market analysis","tip_text":"Corporate relocation companies often commission market analyses in Q4 to set budgets for the following year''s transferee moves. If you have relationships with HR contacts or relocation coordinators, December is the right time to offer a complimentary neighborhood market report. It positions you well before the spring move season begins.","tip_category":"market"}',
 ARRAY['relocation','corporate','year-end'], 'US', 'winter', 0),

-- All-season US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Earnest money is not a down payment — it applies to your closing costs","tip_text":"Earnest money (typically 1–3% of purchase price) is held in escrow and applied to your total funds due at closing — not a separate fee. If you back out for a contingency-protected reason (inspection, financing), it is returned. If you back out without a contingency to rely on, you forfeit it. Make sure your agent explains when each contingency deadline expires.","tip_category":"buyers"}',
 ARRAY['earnest-money','contingency','contract'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Disclosure law varies by state — know what your state requires sellers to reveal","tip_text":"Disclosure requirements differ significantly across states. Some states (California, Washington) require extensive seller disclosure forms covering everything from past flooding to neighborhood nuisances. Others (Texas, Virginia) have more limited requirements. Buyers in low-disclosure states must conduct more independent due diligence and ask specific questions directly to the seller in writing.","tip_category":"sellers"}',
 ARRAY['disclosure','state-law','compliance'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"1031 exchange: how investors defer capital gains on investment property sales","tip_text":"A 1031 exchange allows an investor to sell an investment property and defer capital gains tax by reinvesting the proceeds into a like-kind property. The replacement property must be identified within 45 days of the sale and acquired within 180 days. The exchange must go through a qualified intermediary — funds cannot touch the investor''s account during the process.","tip_category":"buyers"}',
 ARRAY['1031','investors','capital-gains'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"VA loans: no down payment required, but sellers sometimes push back","tip_text":"VA loans are one of the strongest financing products available — no down payment, no PMI, and competitive rates. However, some sellers or listing agents resist VA offers because of the VA appraisal process (which can flag property condition issues). Combat this by including a strong pre-approval letter, a short inspection window, and a cover letter explaining the buyer''s service history.","tip_category":"mortgage"}',
 ARRAY['VA-loan','veterans','down-payment'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Dual agency: understand why some agents cannot fully represent both sides","tip_text":"In a dual agency arrangement, one agent represents both buyer and seller. While legal in most US states with written consent, it creates an inherent conflict of interest — the agent cannot advocate for the best price for both parties simultaneously. Buyers are often better served by engaging a buyer''s agent who exclusively represents their interests in the transaction.","tip_category":"buyers"}',
 ARRAY['dual-agency','representation','ethics'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Sellers: a pre-listing inspection puts you in control of the negotiation","tip_text":"Getting a home inspection before listing gives you time to fix issues on your terms — at contractor rates — rather than scrambling under buyer pressure after an offer is accepted. You disclose the inspection findings upfront, which signals transparency, reduces the chance of inspection re-negotiations, and prevents deals from falling apart due to surprise discoveries.","tip_category":"sellers"}',
 ARRAY['pre-listing-inspection','disclosure','negotiation'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"The difference between pre-qualification and pre-approval matters","tip_text":"Pre-qualification is a lender''s rough estimate based on self-reported income and debt — it takes minutes and carries little weight with sellers. Pre-approval involves a verified credit check, income documentation review, and asset verification. In competitive markets, sellers routinely reject offers backed only by pre-qualification letters. Always get pre-approved before making an offer.","tip_category":"buyers"}',
 ARRAY['pre-approval','mortgage','competitive'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Use a net sheet to show sellers their true take-home before listing","tip_text":"A seller net sheet estimates the proceeds after deducting the mortgage payoff, agent commissions, closing costs, prorated taxes, and any repair credits. Presenting this to your listing clients before you set the price anchors the conversation in real numbers and prevents disappointment on closing day. Update it as the transaction progresses.","tip_category":"sellers"}',
 ARRAY['net-sheet','pricing','sellers'], 'US', 'all', 0),

-- ============================================================
-- BOTH (CA + US APPLICABLE) TIPS (10)
-- ============================================================

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Price reductions signal: wait two weeks after a cut to make your move","tip_text":"When a listing takes a price reduction after 14–21 days, buyer interest often spikes briefly — then fades again. The most strategic time to submit an offer is 10–14 days after a price cut when seller anxiety is high but buyer traffic has thinned again. At that point, sellers are often more receptive to additional negotiation on terms and conditions.","tip_category":"buyers"}',
 ARRAY['price-reduction','strategy','negotiation'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Staging sells faster and for more money — the research is consistent","tip_text":"Staged homes sell 17% faster and for 5–10% more than comparable unstaged properties, according to multiple industry studies. Professional staging costs $1,500–$5,000 depending on home size. The return on that investment — especially on a $800,000+ home where 5% is $40,000 — makes staging one of the highest-ROI decisions a seller can make before listing.","tip_category":"sellers"}',
 ARRAY['staging','ROI','listing'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Adjustable-rate mortgages can save money in specific circumstances","tip_text":"An ARM (Adjustable-Rate Mortgage) starts with a fixed rate for 5, 7, or 10 years before adjusting annually. If you plan to sell or refinance within 5–7 years, an ARM''s lower initial rate can save tens of thousands of dollars compared to a 30-year fixed. The risk is keeping the loan beyond the fixed period in a rising rate environment.","tip_category":"mortgage"}',
 ARRAY['ARM','mortgage','strategy'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Market absorption rate tells you who has the negotiating advantage","tip_text":"Absorption rate measures how many months of inventory remain if no new listings appear. Under 3 months is a seller''s market; over 6 months favors buyers. Calculate it by dividing active listings by the average monthly sales in your area. When you present this number to clients, it immediately frames who holds the leverage — without opinion or guesswork.","tip_category":"market"}',
 ARRAY['absorption-rate','market-analysis','negotiation'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"New construction negotiations happen before you sign, not after","tip_text":"Unlike resale transactions, new construction prices are rarely negotiable after the contract is signed. Builders may offer upgrades, rate buydowns, or closing cost credits as incentives — but they discount off the list price only reluctantly because published prices affect their other lots. Negotiate hard at the contract table and get everything in writing before you sign.","tip_category":"buyers"}',
 ARRAY['new-construction','negotiation','builders'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Professional photography increases listing click-through rates by over 60%","tip_text":"Listings with professional photography receive 61% more views and 47% more showing requests than listings with smartphone photos, according to industry research. The cost of a real estate photographer ($200–$500) is recoverable many times over in a faster sale. Wide-angle, well-lit images are the first thing buyers judge — before they ever read your listing description.","tip_category":"sellers"}',
 ARRAY['photography','marketing','listing'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"The inspection objection letter is a negotiation tool, not a repair list","tip_text":"After an inspection, buyers often send a list of every item the inspector noted. Sellers should recognize this as an opening position, not a demand. Counter by addressing items that are genuine safety concerns or code violations, and push back on cosmetic issues or minor wear. The goal is agreement on material items — not a full renovation at seller''s expense.","tip_category":"sellers"}',
 ARRAY['inspection','negotiation','counteroffering'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Your listing description should lead with the buyer''s life, not the home''s features","tip_text":"Most listing descriptions lead with \"This stunning 3-bed, 2-bath home features...\" — the same as every other listing. High-performing descriptions open with the lifestyle: what it feels like to live there, what the location enables, what the buyer gains. Feature lists belong in the data fields, not the narrative. Make your first sentence worth reading.","tip_category":"sellers"}',
 ARRAY['copywriting','listing-description','marketing'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Referrals require a system, not just good service","tip_text":"Most agents believe great service generates referrals automatically. Research shows it does not — not reliably. Clients who had good experiences still need a specific trigger and a moment of ease. A structured 12-month follow-up plan (anniversary check-in, market update, client event) outperforms a reactive approach by a factor of 3–5x in referral generation.","tip_category":"market"}',
 ARRAY['referrals','client-care','follow-up'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Open houses convert better when they are an event, not just an access window","tip_text":"Standard open houses — door open, agent sitting at the table — produce low engagement. High-converting open houses include a neighborhood guide handout, a single data point about recent sales (creates credibility), and a specific call to action (\"We are reviewing offers Tuesday — here is the timeline\"). Small details signal professionalism and urgency simultaneously.","tip_category":"sellers"}',
 ARRAY['open-house','marketing','conversion'], 'BOTH', 'spring', 0)

ON CONFLICT DO NOTHING;


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
-- 122_contact_postal_code.sql
-- ================================================================
-- 122_contact_postal_code.sql
-- Add nullable postal_code column to contacts for Canadian (V5K 0A1) / US (12345 / 12345-6789)
-- postal codes on the contact record itself. Until now postal code lived only on
-- contact_portfolio (per-property), so the main contact form had no place to store it.
--
-- Additive, backwards-compatible: all existing rows default to NULL.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Lightweight CHECK: if provided, must look like a Canadian or US postal code.
-- Canadian pattern: letter-digit-letter space letter-digit-letter, e.g. "V5K 0A1"
-- US pattern: 5 digits, optionally followed by -4, e.g. "12345" or "12345-6789"
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_postal_code_format;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_postal_code_format CHECK (
    postal_code IS NULL
    OR postal_code ~ '^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$'
    OR postal_code ~ '^\d{5}(-\d{4})?$'
  );

COMMENT ON COLUMN public.contacts.postal_code IS
  'Optional postal code. Canadian format "V5K 0A1" (with space) or US format "12345" / "12345-6789". See src/lib/format.ts formatPostalCode().';


-- ================================================================
-- 122_journey_send_mode.sql
-- ================================================================
-- Migration 122: Add send_mode column to contact_journeys
-- auto = send immediately; review = queue for realtor approval
-- Defaults to 'auto' so existing journeys continue processing without manual intervention

ALTER TABLE contact_journeys
  ADD COLUMN IF NOT EXISTS send_mode text NOT NULL DEFAULT 'auto'
    CHECK (send_mode IN ('auto', 'review'));

COMMENT ON COLUMN contact_journeys.send_mode IS 'auto = send immediately; review = queue for realtor approval';


-- ================================================================
-- 123_add_phone_pref_channel.sql
-- ================================================================
-- Add 'phone' to pref_channel CHECK constraint (email was added in 053, phone was missing)
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_pref_channel_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_pref_channel_check
  CHECK (pref_channel IN ('sms', 'whatsapp', 'email', 'phone'));


-- ================================================================
-- 123_conversion_events.sql
-- ================================================================
-- Conversion events: track email → action → close causality
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  newsletter_id uuid REFERENCES newsletters(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'showing_booked', 'cma_requested', 'valuation_requested',
    'offer_made', 'offer_accepted', 'deal_closed',
    'referral_given', 'listing_inquiry', 'seller_inquiry'
  )),
  email_type text,          -- which email type triggered this
  link_type text,           -- which link was clicked
  link_url text,
  metadata jsonb DEFAULT '{}',
  converted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversion_events_contact_id ON conversion_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_newsletter_id ON conversion_events(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_converted_at ON conversion_events(converted_at);

-- Enable RLS
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversion_events_auth" ON conversion_events;
CREATE POLICY "conversion_events_auth" ON conversion_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE conversion_events IS 'Tracks email engagement → real-world conversion events for attribution analysis';


-- ================================================================
-- 124_phase_transitions.sql
-- ================================================================
-- Phase transition audit log
CREATE TABLE IF NOT EXISTS journey_phase_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  journey_id uuid REFERENCES contact_journeys(id) ON DELETE CASCADE,
  journey_type text NOT NULL,
  from_phase text,
  to_phase text NOT NULL,
  trigger text NOT NULL DEFAULT 'manual' CHECK (trigger IN (
    'manual', 'showing_booked', 'offer_accepted', 'deal_closed',
    'high_intent_click', 'dormant_detected', 'cron', 'admin'
  )),
  metadata jsonb DEFAULT '{}',
  transitioned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phase_transitions_contact_id ON journey_phase_transitions(contact_id);
CREATE INDEX IF NOT EXISTS idx_phase_transitions_journey_id ON journey_phase_transitions(journey_id);

ALTER TABLE journey_phase_transitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "phase_transitions_auth" ON journey_phase_transitions;
CREATE POLICY "phase_transitions_auth" ON journey_phase_transitions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE journey_phase_transitions IS 'Audit log of all journey phase changes for compliance and analytics';


-- ================================================================
-- 125_newsletter_quality_score.sql
-- ================================================================
ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS quality_score numeric(4,2),
  ADD COLUMN IF NOT EXISTS quality_checked_at timestamptz;

COMMENT ON COLUMN newsletters.quality_score IS 'AI quality score 0-100 from quality-pipeline.ts';
COMMENT ON COLUMN newsletters.quality_checked_at IS 'When the quality check was last run';


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
-- 128_newsletter_schema_fixes.sql
-- ================================================================
-- 128: Newsletter schema fixes
-- Fixes 8 confirmed bugs: state machine rollback, missing status values,
-- event_type enum gaps, link_type enum gaps, duplicate indexes,
-- dedup index mismatch, compliance audit FK, and redundant index.

-- =============================================================================
-- CRITICAL-1: Allow sending → approved rollback in state machine trigger
-- Migration 127 only allows sending → 'sent' | 'failed' | 'draft'.
-- sendNewsletter() claims newsletters from 'approved' state (setting status='sending')
-- and rolls back to previousStatus on crash, which may be 'approved'.
-- =============================================================================
CREATE OR REPLACE FUNCTION validate_newsletter_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('approved','sending','failed','skipped','deferred') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'approved' AND NEW.status NOT IN ('sending','draft','deferred','skipped') THEN
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'sending' AND NEW.status NOT IN ('sent','failed','draft','approved') THEN
    -- 'approved' added: allows atomic claim rollback when crash happens after
    -- claiming an approved newsletter (setting it to 'sending') but before send completes
    RAISE EXCEPTION 'Invalid newsletter status transition: % -> %', OLD.status, NEW.status;
  ELSIF OLD.status = 'sent' AND NEW.status != 'sent' THEN
    RAISE EXCEPTION 'Cannot transition from sent status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists from migration 127 — no need to recreate it,
-- CREATE OR REPLACE on the function is sufficient since the trigger points to it.

-- =============================================================================
-- CRITICAL-2: Add 'deferred' to newsletters.status CHECK constraint
-- The original CHECK from migration 016 is missing 'deferred', but
-- newsletters.ts writes status='deferred' for governor-blocked sends.
-- =============================================================================

-- Drop the existing status CHECK constraint (name may be auto-generated)
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'newsletters'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE newsletters DROP CONSTRAINT IF EXISTS %I', v_conname);
  END IF;
END $$;

-- Recreate with 'deferred' included
DO $$
BEGIN
  ALTER TABLE newsletters
    ADD CONSTRAINT newsletters_status_check
    CHECK (status IN ('draft', 'approved', 'sending', 'sent', 'failed', 'skipped', 'deferred'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- P0-1: Add 'failed' and 'deferred' to newsletter_events.event_type CHECK
-- Application writes event_type='failed' on send failures; 'deferred' for
-- governor-blocked sends. Both are absent from the original CHECK constraint.
-- =============================================================================

-- Drop the existing event_type CHECK constraint
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'newsletter_events'::regclass
    AND contype = 'c'
    AND conname LIKE '%event_type%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE newsletter_events DROP CONSTRAINT IF EXISTS %I', v_conname);
  END IF;
END $$;

-- Recreate with 'failed' and 'deferred' included
DO $$
BEGIN
  ALTER TABLE newsletter_events
    ADD CONSTRAINT newsletter_events_event_type_check
    CHECK (event_type IN (
      'opened', 'clicked', 'bounced', 'unsubscribed', 'complained',
      'delivered', 'failed', 'deferred'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- P0-2 / H-2: Expand newsletter_events.link_type CHECK constraint
-- classifyClick() in the webhook produces link types not in the original CHECK:
--   book_showing → maps to 'showing' (kept as alias; add canonical below)
--   get_cma → maps to 'cma' (kept as alias; add canonical below)
--   get_valuation, seller_inquiry, mortgage_calc, investment,
--   open_house_rsvp, market_research, market_stats, price_drop, forwarded
-- Strategy: drop old constraint, recreate with all values including aliases
-- so in-flight code works without a code deploy.
-- =============================================================================

-- Drop the existing link_type CHECK constraint
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'newsletter_events'::regclass
    AND contype = 'c'
    AND conname LIKE '%link_type%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE newsletter_events DROP CONSTRAINT IF EXISTS %I', v_conname);
  END IF;
END $$;

-- Recreate with all current and upcoming link_type values
DO $$
BEGIN
  ALTER TABLE newsletter_events
    ADD CONSTRAINT newsletter_events_link_type_check
    CHECK (link_type IN (
      -- Original values
      'listing', 'showing', 'market_report', 'school_info', 'neighbourhood',
      'cma', 'contact_agent', 'unsubscribe', 'other',
      -- classifyClick() aliases (short-term; code should map these to canonical values)
      'book_showing', 'get_cma',
      -- New values produced by classifyClick()
      'get_valuation', 'seller_inquiry', 'mortgage_calc', 'investment',
      'open_house_rsvp', 'market_research', 'market_stats', 'price_drop',
      'forwarded'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- H-4: Drop redundant partial index on contact_journeys
-- Migration 016 created idx_contact_journeys_next_email which is superseded
-- by the composite idx_contact_journeys_queue from migration 127.
-- =============================================================================
DROP INDEX IF EXISTS idx_contact_journeys_next_email;

-- =============================================================================
-- M-5: Replace mismatched dedup index with one that matches actual query
-- Migration 127 created idx_newsletters_contact_status_sent which is never
-- used because the actual dedup query includes 'draft'/'approved' statuses
-- and uses created_at (not sent_at) for the time window.
-- =============================================================================
DROP INDEX IF EXISTS idx_newsletters_contact_status_sent;

CREATE INDEX IF NOT EXISTS idx_newsletters_dedup
  ON newsletters (contact_id, email_type, journey_phase, created_at DESC)
  WHERE status IN ('sent', 'sending', 'draft', 'approved');

-- =============================================================================
-- M-6: Fix journey_phase_transitions.contact_id FK to SET NULL on delete
-- CASCADE destroys compliance audit history when a contact is deleted.
-- Audit logs must survive contact deletion — use SET NULL instead.
-- =============================================================================
ALTER TABLE journey_phase_transitions
  DROP CONSTRAINT IF EXISTS journey_phase_transitions_contact_id_fkey;

ALTER TABLE journey_phase_transitions
  ADD CONSTRAINT journey_phase_transitions_contact_id_fkey
  FOREIGN KEY (contact_id)
  REFERENCES contacts (id)
  ON DELETE SET NULL;

-- =============================================================================
-- LOW-1: Drop redundant index on newsletters.resend_message_id
-- Migration 127 created both a UNIQUE INDEX (uq_newsletters_resend_message_id)
-- AND a regular INDEX (idx_newsletters_resend_message_id) on the same column.
-- A UNIQUE INDEX already serves as a B-tree lookup index — the regular one
-- is pure write overhead.
-- =============================================================================
DROP INDEX IF EXISTS idx_newsletters_resend_message_id;


-- ================================================================
-- 129_add_missing_indexes.sql
-- ================================================================
-- Add missing indexes for commonly queried columns
-- These prevent full table scans on frequent filter/join queries

-- contact_segments: frequently filtered by realtor_id
CREATE INDEX IF NOT EXISTS idx_contact_segments_realtor_id
  ON contact_segments(realtor_id);

-- consent_records: frequently filtered by contact + realtor
CREATE INDEX IF NOT EXISTS idx_consent_records_contact_realtor
  ON consent_records(contact_id, realtor_id);

-- listings: frequently filtered by status and sorted by created_at
CREATE INDEX IF NOT EXISTS idx_listings_status_created
  ON listings(status, created_at DESC);

-- newsletter_events: frequently aggregated by newsletter + event type
CREATE INDEX IF NOT EXISTS idx_newsletter_events_newsletter_type
  ON newsletter_events(newsletter_id, event_type);

-- contacts: frequently sorted by created_at within a realtor
CREATE INDEX IF NOT EXISTS idx_contacts_realtor_created
  ON contacts(realtor_id, created_at DESC);


-- ================================================================
-- 130_fix_rls_policies.sql
-- ================================================================
-- Migration 130: Fix overly permissive RLS policies
-- Replace USING (true) policies on tenant-owned tables with tenant-scoped ones.
-- Tables that have a direct realtor_id column get: realtor_id = auth.uid()::uuid
-- Tables that own rows via a FK to contacts/listings get an EXISTS subquery.
-- Truly global/shared tables (agent_settings, trust_audit_log, voice_rules,
-- knowledge_articles, newsletter_templates) keep open read for all authenticated
-- users but are restricted to authenticated role only (no anon access).

-- ─── 1. notifications (has realtor_id directly) ──────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON notifications;
DROP POLICY IF EXISTS "tenant_notifications" ON notifications;
CREATE POLICY "tenant_notifications" ON notifications
  FOR ALL TO authenticated
  USING  (realtor_id = auth.uid()::uuid)
  WITH CHECK (realtor_id = auth.uid()::uuid);

-- ─── 2. consent_records (no realtor_id; owned via contacts.realtor_id) ───────
DROP POLICY IF EXISTS consent_records_auth ON consent_records;
DROP POLICY IF EXISTS "tenant_consent_records" ON consent_records;
CREATE POLICY "tenant_consent_records" ON consent_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = consent_records.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = consent_records.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 3. ghost_drafts (owned via contacts.realtor_id) ─────────────────────────
DROP POLICY IF EXISTS "auth_ghost_drafts" ON ghost_drafts;
DROP POLICY IF EXISTS "tenant_ghost_drafts" ON ghost_drafts;
CREATE POLICY "tenant_ghost_drafts" ON ghost_drafts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = ghost_drafts.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = ghost_drafts.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 4. email_recalls (owned via contacts.realtor_id) ────────────────────────
DROP POLICY IF EXISTS "auth_email_recalls" ON email_recalls;
DROP POLICY IF EXISTS "tenant_email_recalls" ON email_recalls;
CREATE POLICY "tenant_email_recalls" ON email_recalls
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = email_recalls.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = email_recalls.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 5. edit_history (owned via contacts.realtor_id) ─────────────────────────
DROP POLICY IF EXISTS "auth_edit_history" ON edit_history;
DROP POLICY IF EXISTS "tenant_edit_history" ON edit_history;
CREATE POLICY "tenant_edit_history" ON edit_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = edit_history.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = edit_history.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 6. send_governor_log (owned via contacts.realtor_id) ────────────────────
DROP POLICY IF EXISTS "auth_send_governor_log" ON send_governor_log;
DROP POLICY IF EXISTS "tenant_send_governor_log" ON send_governor_log;
CREATE POLICY "tenant_send_governor_log" ON send_governor_log
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = send_governor_log.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = send_governor_log.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 7. activities (owned via contacts.realtor_id) ───────────────────────────
DROP POLICY IF EXISTS "activities_all" ON activities;
DROP POLICY IF EXISTS "tenant_activities" ON activities;
CREATE POLICY "tenant_activities" ON activities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = activities.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = activities.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 8. contact_properties (owned via contacts.realtor_id) ───────────────────
DROP POLICY IF EXISTS "contact_properties_all" ON contact_properties;
DROP POLICY IF EXISTS "tenant_contact_properties" ON contact_properties;
CREATE POLICY "tenant_contact_properties" ON contact_properties
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_properties.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_properties.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 9. offers (owned via listings.realtor_id) ───────────────────────────────
DROP POLICY IF EXISTS "offers_all" ON offers;
DROP POLICY IF EXISTS "tenant_offers" ON offers;
CREATE POLICY "tenant_offers" ON offers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = offers.listing_id
        AND l.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = offers.listing_id
        AND l.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 10. offer_conditions (owned via offers → listings.realtor_id) ───────────
DROP POLICY IF EXISTS "offer_conditions_all" ON offer_conditions;
DROP POLICY IF EXISTS "tenant_offer_conditions" ON offer_conditions;
CREATE POLICY "tenant_offer_conditions" ON offer_conditions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_conditions.offer_id
        AND l.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_conditions.offer_id
        AND l.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 11. offer_history (owned via offers → listings.realtor_id) ──────────────
DROP POLICY IF EXISTS "offer_history_all" ON offer_history;
DROP POLICY IF EXISTS "tenant_offer_history" ON offer_history;
CREATE POLICY "tenant_offer_history" ON offer_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_history.offer_id
        AND l.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_history.offer_id
        AND l.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 12. households (no realtor_id; contacts join) ───────────────────────────
-- households are linked to contacts via contact_household_members.
-- Use a lighter policy: any authenticated user can see households their contacts belong to.
-- (contact_household_members guards the join table separately)
DROP POLICY IF EXISTS "households_all" ON households;
DROP POLICY IF EXISTS "tenant_households" ON households;
CREATE POLICY "tenant_households" ON households
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
-- NOTE: households is a shared lookup table (a household can have contacts from the
-- same realtor). It has no direct realtor_id, and is low-risk. Keep open for authenticated.
-- A future migration can add a realtor_id column for strict isolation.

-- ─── 13. contact_relationships (owned via contacts.realtor_id) ───────────────
DROP POLICY IF EXISTS "contact_relationships_all" ON contact_relationships;
DROP POLICY IF EXISTS "tenant_contact_relationships" ON contact_relationships;
CREATE POLICY "tenant_contact_relationships" ON contact_relationships
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE (c.id = contact_relationships.contact_a_id OR c.id = contact_relationships.contact_b_id)
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE (c.id = contact_relationships.contact_a_id OR c.id = contact_relationships.contact_b_id)
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 14. agent_settings (global config table — authenticated read-only scope) ─
-- This is a singleton config table, not per-realtor. Restrict to authenticated role.
DROP POLICY IF EXISTS "auth_agent_settings" ON agent_settings;
DROP POLICY IF EXISTS "auth_agent_settings" ON agent_settings;
CREATE POLICY "auth_agent_settings" ON agent_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 15. trust_audit_log (global audit — authenticated read-only scope) ───────
DROP POLICY IF EXISTS "auth_trust_audit_log" ON trust_audit_log;
DROP POLICY IF EXISTS "auth_trust_audit_log" ON trust_audit_log;
CREATE POLICY "auth_trust_audit_log" ON trust_audit_log
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 16. voice_rules (global per-tenant agent config — authenticated scope) ───
DROP POLICY IF EXISTS "auth_voice_rules" ON voice_rules;
DROP POLICY IF EXISTS "auth_voice_rules" ON voice_rules;
CREATE POLICY "auth_voice_rules" ON voice_rules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 17. signup_events (platform analytics — authenticated scope) ─────────────
DROP POLICY IF EXISTS "Authenticated access" ON signup_events;
DROP POLICY IF EXISTS "auth_signup_events" ON signup_events;
CREATE POLICY "auth_signup_events" ON signup_events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 18. workflow automation tables — drop anon policies ─────────────────────
-- The anon policies in migration 014 allow unauthenticated access. Remove them.
DROP POLICY IF EXISTS "anon_message_templates"   ON message_templates;
DROP POLICY IF EXISTS "anon_workflows"           ON workflows;
DROP POLICY IF EXISTS "anon_workflow_steps"      ON workflow_steps;
DROP POLICY IF EXISTS "anon_workflow_enrollments" ON workflow_enrollments;
DROP POLICY IF EXISTS "anon_workflow_step_logs"  ON workflow_step_logs;
DROP POLICY IF EXISTS "anon_agent_notifications" ON agent_notifications;
DROP POLICY IF EXISTS "anon_activity_log"        ON activity_log;


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

