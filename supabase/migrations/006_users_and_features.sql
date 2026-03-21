-- ============================================================
-- TABLE: users (admin & realtor accounts with feature toggles)
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  image           TEXT,
  role            TEXT NOT NULL DEFAULT 'realtor' CHECK (role IN ('admin', 'realtor')),
  enabled_features JSONB NOT NULL DEFAULT '["listings","contacts","tasks","showings","calendar","content","search","workflow","import","forms","website","newsletters"]'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- TRIGGER
-- ============================================================
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Anon users full access" ON users FOR ALL USING (auth.role() = 'anon');
