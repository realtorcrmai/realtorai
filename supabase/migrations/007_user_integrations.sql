-- 007: User Integrations - store customer API credentials for external services
-- Each user can configure their own DocuSign, MLS/IDX, and Email provider credentials

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'docusign', 'mls', 'email', 'twilio'
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  test_status TEXT, -- 'success', 'failed', null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_email, provider)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_integrations_email ON user_integrations(user_email);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON user_integrations(provider);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_full_access_user_integrations"
  ON user_integrations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_user_integrations"
  ON user_integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_user_integrations"
  ON user_integrations FOR ALL TO service_role USING (true) WITH CHECK (true);
