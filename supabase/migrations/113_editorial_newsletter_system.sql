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
