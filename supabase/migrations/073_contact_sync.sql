-- Migration 073: Contact sync tracking
-- Tracks connected sync sources and sync history per realtor

CREATE TABLE IF NOT EXISTS contact_sync_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,           -- google, outlook, fub, csv
  provider_account_id text,         -- email or account identifier
  provider_account_name text,       -- display name
  access_token_encrypted text,      -- for OAuth sources
  refresh_token_encrypted text,
  api_key_encrypted text,           -- for API key sources (FUB)
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  auto_sync boolean DEFAULT true,   -- if false, one-time import only
  last_synced_at timestamptz,
  total_synced int DEFAULT 0,
  total_duplicates_merged int DEFAULT 0,
  sync_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_css_realtor_provider ON contact_sync_sources(realtor_id, provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_css_realtor ON contact_sync_sources(realtor_id);
CREATE INDEX IF NOT EXISTS idx_css_active ON contact_sync_sources(is_active) WHERE is_active = true;

-- Track which contacts came from which source
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sync_source text;       -- google, outlook, fub, csv, manual
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sync_external_id text;  -- ID from the external system
CREATE INDEX IF NOT EXISTS idx_contacts_sync ON contacts(sync_source, sync_external_id);

-- RLS
ALTER TABLE contact_sync_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS css_policy ON contact_sync_sources FOR ALL USING (true);
