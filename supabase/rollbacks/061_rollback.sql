-- Rollback: 061_multi_tenant_voice.sql
-- WARNING: Only safe to run BEFORE real multi-tenant data exists.
-- After multiple tenants have data, rolling back will lose tenant isolation.

-- Drop new tables (reverse order of creation)
DROP TABLE IF EXISTS voice_reminders CASCADE;
DROP TABLE IF EXISTS voice_notes CASCADE;
DROP TABLE IF EXISTS voice_preferences CASCADE;
DROP TABLE IF EXISTS voice_conversation_logs CASCADE;
DROP TABLE IF EXISTS tenant_audit_log CASCADE;
DROP TABLE IF EXISTS tenant_api_keys CASCADE;

-- Remove tenant_id + source from voice tables
ALTER TABLE voice_notifications DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE voice_calls DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE voice_calls DROP COLUMN IF EXISTS source;
ALTER TABLE voice_sessions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE voice_sessions DROP COLUMN IF EXISTS source;

-- Restore original indexes
DROP INDEX IF EXISTS idx_voice_sessions_tenant_agent;
DROP INDEX IF EXISTS idx_voice_sessions_tenant_source;
DROP INDEX IF EXISTS idx_voice_calls_tenant_session;
DROP INDEX IF EXISTS idx_voice_calls_tenant_source;
DROP INDEX IF EXISTS idx_voice_notif_tenant_agent;

CREATE INDEX IF NOT EXISTS idx_voice_sessions_agent ON voice_sessions(agent_email, status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_session ON voice_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_notif_agent ON voice_notifications(agent_email, read_at) WHERE read_at IS NULL;

-- Restore original RLS policies
DROP POLICY IF EXISTS voice_sessions_tenant_isolation ON voice_sessions;
CREATE POLICY voice_sessions_policy ON voice_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS voice_calls_tenant_isolation ON voice_calls;
CREATE POLICY voice_calls_policy ON voice_calls FOR ALL USING (true);

DROP POLICY IF EXISTS voice_notifications_tenant_isolation ON voice_notifications;
CREATE POLICY voice_notifications_policy ON voice_notifications FOR ALL USING (true);

-- Drop tenant tables last (FK dependencies)
DROP TABLE IF EXISTS tenant_memberships CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
