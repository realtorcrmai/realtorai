-- Migration: 061_multi_tenant_voice.sql
-- Purpose: Add multi-tenant isolation to voice agent system
-- PRD: docs/PRD_Multi_Tenant_Voice_Agent_External_Assistants.md (Phase 1, F0-F1)
-- Depends on: 060_voice_agent_system.sql
--
-- This migration:
--   1. Creates tenants + tenant_memberships tables (foundation)
--   2. Creates default tenant + backfills existing voice data
--   3. Adds tenant_id + source columns to voice_sessions, voice_calls, voice_notifications
--   4. Updates RLS policies for tenant isolation
--   5. Creates tenant_api_keys + tenant_audit_log tables
--   6. Creates voice_conversation_logs, voice_preferences, voice_notes, voice_reminders
--      (replaces Python SQLite tables)

-- ============================================================================
-- Step 1: Tenants — foundation for all multi-tenant isolation
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                                    -- brokerage name
    slug TEXT UNIQUE,                                      -- URL-friendly identifier (e.g., "westside-realty")
    plan TEXT NOT NULL DEFAULT 'standard'                   -- subscription tier
        CHECK (plan IN ('standard', 'professional', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active'                   -- lifecycle state
        CHECK (status IN ('active', 'suspended', 'cancelled')),
    owner_email TEXT NOT NULL,                              -- primary account owner
    billing_email TEXT,                                     -- billing contact
    max_agents INT DEFAULT 5,                               -- plan-based seat cap
    settings JSONB DEFAULT '{}'::jsonb,                     -- timezone, locale, branding overrides
    -- Voice configuration
    voice_rate_limit_per_minute INT DEFAULT 120,            -- configurable per tenant
    voice_rate_limit_per_hour INT DEFAULT 3000,
    llm_provider TEXT DEFAULT 'anthropic',                  -- default LLM for this tenant
    llm_api_key_encrypted TEXT,                             -- bring-your-own key (encrypted at rest)
    -- Lifecycle
    created_by TEXT,                                        -- provisioning actor
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,                               -- set when status -> cancelled
    delete_after TIMESTAMPTZ                                -- hard-delete date (cancelled_at + 30 days)
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_email);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- Admin-only access: tenants table accessed via service role, not user queries
CREATE POLICY tenants_service_policy ON tenants FOR ALL USING (true);

-- ============================================================================
-- Step 2: Tenant Memberships — RBAC for agents within tenants
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_email TEXT NOT NULL,                              -- matches NextAuth session email
    role TEXT NOT NULL DEFAULT 'agent'                      -- owner (1 per tenant), admin, agent
        CHECK (role IN ('owner', 'admin', 'agent')),
    permissions JSONB DEFAULT '["voice:read","voice:write","crm:read","crm:write"]'::jsonb,
    invited_by TEXT,                                        -- who invited this agent
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,                                 -- soft-delete for audit
    UNIQUE(tenant_id, agent_email)                          -- one membership per tenant per agent
);

CREATE INDEX IF NOT EXISTS idx_memberships_email ON tenant_memberships(agent_email) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON tenant_memberships(tenant_id, role) WHERE removed_at IS NULL;

ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_tenant_isolation ON tenant_memberships
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Step 3: Default tenant + backfill existing voice data
-- ============================================================================

-- Create a default tenant for existing single-tenant data
INSERT INTO tenants (id, name, slug, plan, status, owner_email, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Brokerage (Legacy)',
    'default',
    'standard',
    'active',
    'demo@realtorai.com',
    'system-migration'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 4: Add tenant_id + source to existing voice tables (nullable first)
-- ============================================================================

-- voice_sessions: add tenant_id + source
ALTER TABLE voice_sessions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE voice_sessions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'browser'
    CHECK (source IN ('browser', 'siri', 'google', 'alexa', 'cortana', 'teams', 'api'));

-- voice_calls: add tenant_id + source
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'browser'
    CHECK (source IN ('browser', 'siri', 'google', 'alexa', 'cortana', 'teams', 'api'));

-- voice_notifications: add tenant_id
ALTER TABLE voice_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Backfill existing rows with default tenant
UPDATE voice_sessions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE voice_calls SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE voice_notifications SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE voice_sessions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE voice_calls ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE voice_notifications ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================================
-- Step 5: Update indexes (tenant_id as leading column for query perf)
-- ============================================================================

-- Drop old single-tenant indexes
DROP INDEX IF EXISTS idx_voice_sessions_agent;
DROP INDEX IF EXISTS idx_voice_calls_session;
DROP INDEX IF EXISTS idx_voice_notif_agent;

-- Create tenant-scoped indexes
CREATE INDEX IF NOT EXISTS idx_voice_sessions_tenant_agent
    ON voice_sessions(tenant_id, agent_email, status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_tenant_source
    ON voice_sessions(tenant_id, source);

CREATE INDEX IF NOT EXISTS idx_voice_calls_tenant_session
    ON voice_calls(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_tenant_source
    ON voice_calls(tenant_id, source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_notif_tenant_agent
    ON voice_notifications(tenant_id, agent_email, notification_type);

-- ============================================================================
-- Step 6: Update RLS policies for tenant isolation
-- ============================================================================

-- voice_sessions
DROP POLICY IF EXISTS voice_sessions_policy ON voice_sessions;
CREATE POLICY voice_sessions_tenant_isolation ON voice_sessions
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- voice_calls
DROP POLICY IF EXISTS voice_calls_policy ON voice_calls;
CREATE POLICY voice_calls_tenant_isolation ON voice_calls
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- voice_notifications
DROP POLICY IF EXISTS voice_notifications_policy ON voice_notifications;
CREATE POLICY voice_notifications_tenant_isolation ON voice_notifications
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Step 7: Tenant API Keys — per-tenant auth for voice endpoints
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,                                 -- bcrypt hash of API key
    key_prefix TEXT NOT NULL,                               -- first 8 chars for display (e.g., "lf_voice_")
    name TEXT NOT NULL DEFAULT 'Default',                   -- human-readable label
    permissions JSONB DEFAULT '["voice:read","voice:write"]'::jsonb,
    rate_limit_per_minute INT DEFAULT 60,                   -- per-key rate limit
    last_used_at TIMESTAMPTZ,                               -- track activity
    expires_at TIMESTAMPTZ,                                 -- optional expiry
    revoked_at TIMESTAMPTZ,                                 -- soft delete for audit
    created_by TEXT NOT NULL,                               -- agent_email who created
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON tenant_api_keys(tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON tenant_api_keys(key_prefix);

ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_tenant_isolation ON tenant_api_keys
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Step 8: Tenant Audit Log — security-relevant events per tenant
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_email TEXT NOT NULL,                              -- who performed the action
    action TEXT NOT NULL,                                   -- key_created, key_revoked, auth_failed, etc.
    resource_type TEXT,                                     -- api_key, session, oauth_token
    resource_id TEXT,                                       -- ID of affected resource
    metadata JSONB,                                         -- additional context
    ip_address INET,                                        -- source IP
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON tenant_audit_log(tenant_id, action, created_at DESC);

ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_tenant_isolation ON tenant_audit_log
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Step 9: Voice Conversation Logs — replaces Python SQLite conversation_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES voice_sessions(id) ON DELETE SET NULL,
    agent_email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT,                                           -- message content
    tool_name TEXT,                                         -- tool invoked (if role = 'tool')
    tool_args JSONB,                                        -- tool arguments
    tool_result JSONB,                                      -- tool response
    source TEXT DEFAULT 'browser'                           -- platform source
        CHECK (source IN ('browser', 'siri', 'google', 'alexa', 'cortana', 'teams', 'api')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_logs_tenant_session
    ON voice_conversation_logs(tenant_id, session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_logs_tenant_agent
    ON voice_conversation_logs(tenant_id, agent_email, created_at DESC);

ALTER TABLE voice_conversation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY conv_logs_tenant_isolation ON voice_conversation_logs
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Step 10: Voice Preferences — replaces Python SQLite personalization table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_email TEXT NOT NULL,
    key TEXT NOT NULL,                                      -- preference key
    value JSONB NOT NULL,                                   -- preference value
    frequency INT DEFAULT 1,                                -- usage count
    last_used TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, agent_email, key)
);

CREATE INDEX IF NOT EXISTS idx_voice_prefs_tenant_agent
    ON voice_preferences(tenant_id, agent_email);

ALTER TABLE voice_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_prefs_tenant_isolation ON voice_preferences
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Step 11: Voice Notes — replaces Python SQLite notes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_email TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_notes_tenant_agent
    ON voice_notes(tenant_id, agent_email, created_at DESC);

ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_notes_tenant_isolation ON voice_notes
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- Step 12: Voice Reminders — replaces Python SQLite reminders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_email TEXT NOT NULL,
    message TEXT NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_reminders_tenant_pending
    ON voice_reminders(tenant_id, agent_email, remind_at)
    WHERE acknowledged = FALSE;

ALTER TABLE voice_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_reminders_tenant_isolation ON voice_reminders
    FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
