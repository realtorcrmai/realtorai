-- ============================================================
-- 002: AI Website Generation tables
-- ============================================================

-- Create update_updated_at function if not exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- A generation run (one click of "Generate My Website")
CREATE TABLE site_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES realtor_sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'started'
    CHECK (status IN ('started','researching','generating','previewing','completed','failed')),
  reference_scrapes JSONB,       -- array of { url, design_patterns } (hidden from user)
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_generations_site ON site_generations(site_id);
CREATE INDEX idx_site_generations_status ON site_generations(status);

-- Each variant within a generation (3 per generation)
CREATE TABLE site_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES site_generations(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,      -- 'dark_luxury', 'light_modern', 'bold_warm'
  site_config JSONB NOT NULL,    -- the full SiteConfig JSON
  preview_url TEXT,              -- Cloudflare preview deployment URL
  screenshots JSONB,            -- { desktop: "base64...", mobile: "base64..." }
  is_selected BOOLEAN NOT NULL DEFAULT false,
  cloudflare_project_name TEXT,
  live_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_variants_generation ON site_variants(generation_id);

-- Add generation tracking columns to realtor_sites
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS live_url TEXT;
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS active_variant_id UUID REFERENCES site_variants(id);

-- Update trigger (reuse existing function from 001)
CREATE TRIGGER set_site_generations_updated
  BEFORE UPDATE ON site_generations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE site_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on site_generations" ON site_generations
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE site_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on site_variants" ON site_variants
  FOR ALL USING (true) WITH CHECK (true);
