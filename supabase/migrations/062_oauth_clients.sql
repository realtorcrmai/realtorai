-- Migration: 062_oauth_clients.sql
-- Purpose: OAuth2 client registration and token storage for external voice assistants
-- PRD: docs/PRD_Multi_Tenant_Voice_Agent_External_Assistants.md (Phase 1, F3)
-- Depends on: 061_multi_tenant_voice.sql (tenants table)

-- ============================================================================
-- OAuth Clients — registered applications (Siri, Google, Alexa, Cortana, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL UNIQUE,                        -- public client identifier
    client_secret_hash TEXT,                               -- bcrypt hash (null for public PKCE-only clients)
    client_name TEXT NOT NULL,                             -- "RealtorAI Siri", "RealtorAI Alexa"
    platform TEXT NOT NULL                                 -- which assistant platform
        CHECK (platform IN ('siri', 'google', 'alexa', 'cortana', 'teams', 'gemini', 'custom')),
    redirect_uris JSONB NOT NULL DEFAULT '[]'::jsonb,      -- allowed redirect URIs
    scopes JSONB DEFAULT '["voice:read","voice:write","crm:read"]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_tenant ON oauth_clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON oauth_clients(client_id);

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_clients_tenant_isolation ON oauth_clients
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- OAuth Authorization Codes — short-lived codes for token exchange
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_auth_codes (
    code TEXT PRIMARY KEY,                                 -- random 64-char code
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_email TEXT NOT NULL,                             -- authenticated user
    redirect_uri TEXT NOT NULL,                            -- must match registered URI
    scopes JSONB NOT NULL,
    state TEXT NOT NULL,                                   -- CSRF protection (RFC 6749 Section 10.12)
    code_challenge TEXT,                                   -- PKCE S256 challenge
    code_challenge_method TEXT DEFAULT 'S256',
    expires_at TIMESTAMPTZ NOT NULL,                       -- 10-minute expiry
    used_at TIMESTAMPTZ,                                   -- set on exchange (SELECT FOR UPDATE to prevent race)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_expiry ON oauth_auth_codes(expires_at);

-- No tenant RLS — codes are looked up by value, validated server-side

-- ============================================================================
-- OAuth Refresh Tokens — long-lived tokens for silent token refresh
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,                       -- bcrypt hash of refresh token
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_email TEXT NOT NULL,
    scopes JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,                       -- 30-day expiry
    revoked_at TIMESTAMPTZ,                                -- soft revocation
    replaced_by UUID REFERENCES oauth_refresh_tokens(id),  -- rotation tracking
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tenant
    ON oauth_refresh_tokens(tenant_id, agent_email);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_expiry
    ON oauth_refresh_tokens(expires_at)
    WHERE revoked_at IS NULL;

ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_refresh_tenant_isolation ON oauth_refresh_tokens
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- OAuth Consent Records — PIPEDA/PIPA compliance audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_email TEXT NOT NULL,
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    platform TEXT NOT NULL,                                -- siri, google, alexa, cortana
    scopes_granted JSONB NOT NULL,
    consent_text TEXT NOT NULL,                            -- exact text shown to user (PIPEDA requirement)
    ip_address INET,
    user_agent TEXT,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ                                 -- user can revoke consent at any time
);

CREATE INDEX IF NOT EXISTS idx_oauth_consent_tenant_agent
    ON oauth_consent_records(tenant_id, agent_email, platform);

ALTER TABLE oauth_consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_consent_tenant_isolation ON oauth_consent_records
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Supabase RPC: set_tenant_context — called before every tenant-scoped query
-- ============================================================================

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
