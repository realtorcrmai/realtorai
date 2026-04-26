-- Rollback for migration 145
-- WARNING: Restoring the permissive policy re-opens the cross-tenant
-- exposure described in migration 145. Only run in a dev/test environment
-- to reproduce the original vulnerable state.

DROP POLICY IF EXISTS buyer_identities_tenant ON buyer_identities;

CREATE POLICY buyer_identities_tenant_policy ON buyer_identities
  FOR ALL USING (true);
