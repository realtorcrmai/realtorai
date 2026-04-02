-- Migration 072: Per-Tenant API Keys for Voice Agent
-- Replaces single shared VOICE_AGENT_API_KEY with per-tenant keys.
-- Each tenant can have multiple keys (e.g., production + staging).

-- ============================================================
-- Create table
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL REFERENCES auth.users(id),
  key_hash text NOT NULL,
  key_prefix text NOT NULL,          -- first 8 chars for display (e.g., "va-prod-...")
  label text NOT NULL DEFAULT 'default',
  scopes text[] NOT NULL DEFAULT ARRAY['voice-agent'],  -- future: 'rag', 'webhooks', etc.
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,            -- NULL = never expires
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_realtor ON tenant_api_keys(realtor_id);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_hash ON tenant_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_active ON tenant_api_keys(is_active) WHERE is_active = true;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_rls_api_keys ON tenant_api_keys
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- ============================================================
-- Immutability trigger on realtor_id
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_realtor_id_change_api_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.realtor_id IS DISTINCT FROM NEW.realtor_id THEN
    RAISE EXCEPTION 'Cannot change realtor_id after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_immutable_realtor_api_keys
  BEFORE UPDATE ON tenant_api_keys
  FOR EACH ROW EXECUTE FUNCTION prevent_realtor_id_change_api_keys();

-- ============================================================
-- Updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_api_keys_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_api_keys_timestamp
  BEFORE UPDATE ON tenant_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_keys_timestamp();

-- ============================================================
-- Rate limiting table (in-memory would be better, but DB works for MVP)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL REFERENCES auth.users(id),
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(realtor_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_realtor ON api_rate_limits(realtor_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON api_rate_limits(window_start);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_rls_rate_limits ON api_rate_limits
  FOR ALL USING (realtor_id = auth.uid()::uuid);
