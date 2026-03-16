-- Migration 005: Content Engine
-- Adds AI content generation tables (prompts, media_assets)
-- and hero image columns to listings

-- ──────────────────────────────────────────────
-- TABLE: prompts
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  video_prompt    TEXT,
  image_prompt    TEXT,
  mls_public      TEXT,
  mls_realtor     TEXT,
  ig_caption      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(listing_id)
);

-- ──────────────────────────────────────────────
-- TABLE: media_assets
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  prompt_id       UUID REFERENCES prompts(id) ON DELETE SET NULL,
  asset_type      TEXT NOT NULL CHECK (asset_type IN ('video', 'image')),
  kling_task_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  output_url      TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- ALTER: listings — add hero image columns
-- ──────────────────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS hero_image_url          TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_storage_path TEXT;

-- ──────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prompts_listing_id ON prompts(listing_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_listing_id ON media_assets(listing_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_kling_task_id ON media_assets(kling_task_id);

-- ──────────────────────────────────────────────
-- TRIGGERS
-- ──────────────────────────────────────────────
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ──────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access on prompts" ON prompts
  FOR ALL USING (true);
CREATE POLICY "Authenticated users full access on media_assets" ON media_assets
  FOR ALL USING (true);
