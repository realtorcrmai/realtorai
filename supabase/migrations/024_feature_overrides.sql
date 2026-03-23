-- Feature overrides table for runtime feature flag management.
-- Config-file defaults live in src/lib/constants/features.ts;
-- rows here override those defaults per feature.

CREATE TABLE IF NOT EXISTS feature_overrides (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id TEXT NOT NULL UNIQUE,          -- matches key in FEATURES config
  enabled    BOOLEAN NOT NULL,              -- runtime override value
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by feature_id
CREATE INDEX IF NOT EXISTS idx_feature_overrides_feature_id ON feature_overrides (feature_id);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_feature_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feature_overrides_updated_at
  BEFORE UPDATE ON feature_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_overrides_updated_at();

-- Allow anon role access (single-tenant CRM; RLS not enforced)
GRANT ALL ON feature_overrides TO anon;
