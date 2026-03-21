-- ============================================================
-- 014: Contact Segments & A/B Testing
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  rule_operator TEXT NOT NULL DEFAULT 'AND' CHECK (rule_operator IN ('AND', 'OR')),
  contact_count INTEGER DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage contact_segments"
  ON contact_segments FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_contact_segments_name ON contact_segments(name);
