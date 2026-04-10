-- Migration 092: Fix RLS policies on M5 agent tables
-- Migration 087 used USING (true) which grants unrestricted cross-tenant access.
-- This migration replaces those policies with proper realtor_id scoping.
-- Idempotent: DROP IF EXISTS + CREATE.

-- agent_runs
DROP POLICY IF EXISTS tenant_rls_agent_runs ON agent_runs;
CREATE POLICY tenant_rls_agent_runs ON agent_runs
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- agent_decisions
DROP POLICY IF EXISTS tenant_rls_agent_decisions ON agent_decisions;
CREATE POLICY tenant_rls_agent_decisions ON agent_decisions
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- agent_drafts
DROP POLICY IF EXISTS tenant_rls_agent_drafts ON agent_drafts;
CREATE POLICY tenant_rls_agent_drafts ON agent_drafts
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- contact_trust_levels
DROP POLICY IF EXISTS tenant_rls_contact_trust ON contact_trust_levels;
CREATE POLICY tenant_rls_contact_trust ON contact_trust_levels
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- agent_ab_tests (from migration 091)
DROP POLICY IF EXISTS tenant_rls_agent_ab_tests ON agent_ab_tests;
DO $$ BEGIN
  CREATE POLICY tenant_rls_agent_ab_tests ON agent_ab_tests
    FOR ALL USING (realtor_id = auth.uid()::uuid);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
