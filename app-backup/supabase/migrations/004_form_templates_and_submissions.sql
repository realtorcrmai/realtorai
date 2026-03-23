-- ============================================================
-- TABLE: form_templates
-- Stores PDF form templates (official BCREA, FINTRAC, etc.)
-- ============================================================
CREATE TABLE form_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_key      TEXT NOT NULL UNIQUE,
  form_name     TEXT NOT NULL,
  organization  TEXT NOT NULL DEFAULT 'BCREA',
  version       TEXT NOT NULL DEFAULT '1.0',
  pdf_url       TEXT NOT NULL,
  field_mapping JSONB NOT NULL DEFAULT '{}',
  field_names   JSONB NOT NULL DEFAULT '[]',
  is_public     BOOLEAN NOT NULL DEFAULT false,
  source_url    TEXT,
  last_checked  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: form_submissions (drafts + completed forms)
-- ============================================================
CREATE TABLE form_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  form_key      TEXT NOT NULL,
  form_data     JSONB NOT NULL DEFAULT '{}',
  pdf_url       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(listing_id, form_key)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_form_submissions_listing_id ON form_submissions(listing_id);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_templates_form_key ON form_templates(form_key);

-- ============================================================
-- TRIGGERS (reuse existing update_updated_at_column function)
-- ============================================================
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON form_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON form_submissions FOR ALL USING (auth.role() = 'authenticated');
