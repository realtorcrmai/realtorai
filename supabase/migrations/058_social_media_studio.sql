-- Migration 058: Social Media Content Studio
-- Creates tables for social media content generation, publishing, analytics, and brand management
-- Part of Realtors360 Social module

-- ============================================================
-- 1. Social Brand Kits (one per realtor)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner (use user_email since we don't have a realtor_profiles table yet)
  user_email text NOT NULL,

  -- Branding
  logo_url text,
  headshot_url text,
  primary_colour text DEFAULT '#4f35d2',
  secondary_colour text DEFAULT '#ff5c3a',
  accent_colour text DEFAULT '#00bfa5',
  heading_font text DEFAULT 'Playfair Display',
  body_font text DEFAULT 'Inter',

  -- Voice & Tone
  voice_tone text DEFAULT 'professional',  -- professional, friendly, luxury, bold, warm, custom
  voice_rules jsonb DEFAULT '[]',          -- learned from edits [{rule, source, created_at}]
  voice_custom_description text,           -- free-text if voice_tone = 'custom'

  -- Agent info (for content generation)
  agent_name text,
  brokerage_name text,
  brokerage_logo_url text,
  license_number text,                      -- compliance: required on all posts in some jurisdictions
  bio_text text,
  service_areas text[] DEFAULT '{}',
  phone text,
  email text,
  website_url text,

  -- Social defaults
  default_hashtags text[] DEFAULT '{}',
  default_cta text DEFAULT 'DM me for details!',
  emoji_preference text DEFAULT 'moderate', -- none, minimal, moderate, heavy

  -- Platform preferences
  preferred_platforms text[] DEFAULT '{facebook,instagram}',
  quiet_hours_start int DEFAULT 22,         -- 10 PM
  quiet_hours_end int DEFAULT 7,            -- 7 AM
  posting_days text[] DEFAULT '{monday,tuesday,wednesday,thursday,friday}',

  -- API key for standalone access
  api_key text UNIQUE,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sbk_email ON social_brand_kits(user_email);

-- ============================================================
-- 2. Social Accounts (connected platforms via OAuth)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES social_brand_kits(id) ON DELETE CASCADE,

  -- Platform identity
  platform text NOT NULL,                   -- facebook, instagram, tiktok, youtube, linkedin, pinterest, google_business
  platform_account_id text NOT NULL,        -- platform's unique account/page ID
  account_name text,                        -- display name (e.g. "Sarah's Realty Page")
  account_type text,                        -- page, profile, business, channel
  profile_url text,
  profile_image_url text,
  followers_count int DEFAULT 0,

  -- OAuth tokens (encrypted at rest via application-level AES-256-GCM)
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  token_scopes text[] DEFAULT '{}',         -- granted OAuth scopes

  -- Status
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  last_error text,                          -- last API error message
  connection_status text DEFAULT 'connected', -- connected, expiring, disconnected, error

  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sa_platform_account ON social_accounts(brand_kit_id, platform, platform_account_id);
CREATE INDEX IF NOT EXISTS idx_sa_brand_kit ON social_accounts(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_sa_status ON social_accounts(connection_status);

-- ============================================================
-- 3. Social Posts (drafts, scheduled, published)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES social_brand_kits(id) ON DELETE CASCADE,

  -- Content
  content_type text NOT NULL,               -- listing_alert, just_sold, just_listed, open_house, price_reduced,
                                            -- market_update, neighbourhood, testimonial, tips, holiday,
                                            -- milestone, coming_soon, custom
  caption text,
  caption_original text,                    -- original AI-generated (for voice learning diff)
  hashtags text[] DEFAULT '{}',
  media_urls text[] DEFAULT '{}',           -- Supabase Storage URLs (images/videos)
  media_type text DEFAULT 'image',          -- image, carousel, video, reel, story

  -- Template reference
  template_id uuid,

  -- Source trigger
  source_type text,                         -- listing, contact, testimonial, market_data, manual, ai_suggestion, trigger
  source_id text,                           -- listing UUID, contact UUID, etc.
  source_data jsonb DEFAULT '{}',           -- snapshot of source data at generation time

  -- Platform targeting
  target_platforms text[] DEFAULT '{}',     -- which platforms to publish to
  platform_variants jsonb DEFAULT '{}',     -- per-platform overrides: {facebook: {caption, hashtags}, instagram: {caption, hashtags, media_urls}}

  -- Scheduling
  status text DEFAULT 'draft',              -- draft, approved, scheduled, publishing, published, failed, cancelled, skipped
  scheduled_at timestamptz,
  published_at timestamptz,
  approved_at timestamptz,
  approved_by text,                         -- user email who approved

  -- AI metadata
  ai_generated boolean DEFAULT true,
  ai_model text,
  ai_prompt text,                           -- prompt used for generation
  ai_reasoning text,                        -- why AI chose this content type/approach
  content_score int CHECK (content_score >= 0 AND content_score <= 100),  -- predicted engagement 0-100
  content_score_breakdown jsonb DEFAULT '{}', -- {relevance, creativity, cta_clarity, brand_match, engagement_potential}

  -- Engagement (aggregated across platforms)
  total_impressions int DEFAULT 0,
  total_engagement int DEFAULT 0,           -- likes + comments + shares + saves
  total_clicks int DEFAULT 0,
  total_leads int DEFAULT 0,

  -- Attribution
  utm_source text,
  utm_medium text DEFAULT 'social',
  utm_campaign text,                        -- auto-generated: {content_type}-{source_id}-{date}

  -- Compliance
  includes_brokerage boolean DEFAULT false,  -- whether brokerage name is in content
  compliance_checked boolean DEFAULT false,
  compliance_notes text,

  -- Retry metadata
  retry_count int DEFAULT 0,
  last_error text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spost_brand ON social_posts(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_spost_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_spost_scheduled ON social_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_spost_type ON social_posts(content_type);
CREATE INDEX IF NOT EXISTS idx_spost_source ON social_posts(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_spost_created ON social_posts(created_at DESC);

-- ============================================================
-- 4. Social Post Publishes (one record per platform per post)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_post_publishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,

  -- Platform details
  platform text NOT NULL,
  platform_post_id text,                    -- ID returned by platform after publishing
  platform_url text,                        -- direct URL to the live post

  -- Status
  status text DEFAULT 'pending',            -- pending, publishing, published, failed, deleted
  error_message text,
  error_code text,                          -- platform error code for debugging

  -- Retry
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  next_retry_at timestamptz,

  -- Timing
  scheduled_at timestamptz,
  published_at timestamptz,

  -- Engagement (per-platform, synced periodically)
  impressions int DEFAULT 0,
  reach int DEFAULT 0,
  likes int DEFAULT 0,
  comments int DEFAULT 0,
  shares int DEFAULT 0,
  saves int DEFAULT 0,
  clicks int DEFAULT 0,
  video_views int DEFAULT 0,
  engagement_rate float DEFAULT 0,

  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spp_post ON social_post_publishes(post_id);
CREATE INDEX IF NOT EXISTS idx_spp_account ON social_post_publishes(account_id);
CREATE INDEX IF NOT EXISTS idx_spp_status ON social_post_publishes(status);
CREATE INDEX IF NOT EXISTS idx_spp_platform ON social_post_publishes(platform);
CREATE INDEX IF NOT EXISTS idx_spp_published ON social_post_publishes(published_at DESC);

-- ============================================================
-- 5. Social Templates (system + user-created)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  brand_kit_id uuid REFERENCES social_brand_kits(id) ON DELETE CASCADE,  -- NULL = system template

  -- Template info
  name text NOT NULL,
  category text NOT NULL,                   -- just_listed, just_sold, open_house, price_reduced, market_update,
                                            -- neighbourhood, testimonial, tips, holiday, milestone, coming_soon, custom
  description text,

  -- Content definition
  media_type text NOT NULL DEFAULT 'image', -- image, carousel, video
  supported_platforms text[] DEFAULT '{instagram,facebook}',

  -- Template data
  caption_template text NOT NULL,           -- with {{variables}}: {{address}}, {{price}}, {{beds}}, {{baths}}, etc.
  hashtag_suggestions text[] DEFAULT '{}',

  -- Image template (if applicable)
  layout_config jsonb DEFAULT '{}',         -- {slides: [{type, position, style}], dimensions, background}
  thumbnail_url text,

  -- Metadata
  is_system boolean DEFAULT true,           -- system templates can't be deleted by users
  is_active boolean DEFAULT true,
  usage_count int DEFAULT 0,
  avg_engagement float DEFAULT 0,           -- average engagement when this template is used

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_category ON social_templates(category);
CREATE INDEX IF NOT EXISTS idx_st_brand ON social_templates(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_st_system ON social_templates(is_system) WHERE is_system = true;

-- ============================================================
-- 6. Social Analytics Daily (aggregated metrics per platform per day)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES social_brand_kits(id) ON DELETE CASCADE,

  platform text NOT NULL,
  date date NOT NULL,

  -- Metrics
  followers int DEFAULT 0,
  followers_change int DEFAULT 0,
  impressions int DEFAULT 0,
  reach int DEFAULT 0,
  engagement int DEFAULT 0,
  clicks int DEFAULT 0,
  leads int DEFAULT 0,
  posts_count int DEFAULT 0,

  -- Best performer
  top_post_id uuid REFERENCES social_posts(id) ON DELETE SET NULL,

  -- Breakdown
  engagement_by_type jsonb DEFAULT '{}',    -- {likes, comments, shares, saves}
  content_type_performance jsonb DEFAULT '{}', -- {listing: {impressions, engagement}, market_update: {...}}

  metadata jsonb DEFAULT '{}',

  UNIQUE (brand_kit_id, platform, date)
);

-- ============================================================
-- 7. Social Hashtag Performance
-- ============================================================
CREATE TABLE IF NOT EXISTS social_hashtag_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES social_brand_kits(id) ON DELETE CASCADE,

  hashtag text NOT NULL,
  platform text NOT NULL,

  times_used int DEFAULT 0,
  avg_engagement float DEFAULT 0,
  avg_impressions float DEFAULT 0,
  best_post_id uuid REFERENCES social_posts(id) ON DELETE SET NULL,

  last_used_at timestamptz,

  UNIQUE (brand_kit_id, hashtag, platform)
);

-- ============================================================
-- 8. Social Usage Tracking (AI cost tracking per brand kit)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES social_brand_kits(id) ON DELETE CASCADE,

  month date NOT NULL,                      -- first of month (e.g. 2026-03-01)

  -- Generation counts
  captions_generated int DEFAULT 0,
  images_generated int DEFAULT 0,
  videos_generated int DEFAULT 0,
  scores_generated int DEFAULT 0,
  hashtag_suggestions int DEFAULT 0,

  -- Cost tracking
  estimated_ai_cost_cents int DEFAULT 0,    -- in cents to avoid float issues

  -- Limits (per tier)
  tier text DEFAULT 'free',                 -- free, pro, studio, team
  captions_limit int DEFAULT 15,            -- 3/week * ~5 weeks
  videos_limit int DEFAULT 0,

  UNIQUE (brand_kit_id, month)
);

-- ============================================================
-- 9. Social Audit Log (compliance + voice learning)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES social_brand_kits(id) ON DELETE CASCADE,
  post_id uuid REFERENCES social_posts(id) ON DELETE SET NULL,

  action text NOT NULL,                     -- generated, edited, approved, published, failed, skipped, regenerated, deleted
  actor text,                               -- user email or 'system' or 'ai'

  -- For voice learning: track edits
  original_caption text,
  edited_caption text,
  voice_rules_extracted jsonb,              -- rules learned from this edit

  -- For compliance: track what was checked
  compliance_result jsonb,                  -- {brokerage_present, no_guarantees, no_false_claims, passed}

  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sal_brand ON social_audit_log(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_sal_post ON social_audit_log(post_id);
CREATE INDEX IF NOT EXISTS idx_sal_action ON social_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_sal_created ON social_audit_log(created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE social_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_publishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_hashtag_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_audit_log ENABLE ROW LEVEL SECURITY;

-- Note: Using (true) for now (single-tenant).
-- TODO: Replace with proper user-scoped policies before multi-tenant launch.
-- Pattern: USING (user_email = auth.jwt() ->> 'email')
CREATE POLICY sbk_policy ON social_brand_kits FOR ALL USING (true);
CREATE POLICY sa_policy ON social_accounts FOR ALL USING (true);
CREATE POLICY sp_policy ON social_posts FOR ALL USING (true);
CREATE POLICY spp_policy ON social_post_publishes FOR ALL USING (true);
CREATE POLICY st_policy ON social_templates FOR ALL USING (true);
CREATE POLICY sad_policy ON social_analytics_daily FOR ALL USING (true);
CREATE POLICY shp_policy ON social_hashtag_performance FOR ALL USING (true);
CREATE POLICY sut_policy ON social_usage_tracking FOR ALL USING (true);
CREATE POLICY sal_policy ON social_audit_log FOR ALL USING (true);
