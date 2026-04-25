-- Migration 145: Fix buyer_identities RLS policy (SOC 2 CC6.3)
--
-- Migration 143 created buyer_identities with FOR ALL USING (true),
-- which allows ANY authenticated user to read ANY buyer's FINTRAC KYC
-- records (government IDs, DOBs, citizenship). This is a critical
-- cross-tenant data exposure that must be fixed before production.
--
-- Table contains no production data yet, so we can safely drop the
-- permissive policy and replace it with strict tenant-scoped access.

-- Drop the permissive policy from migration 143
DROP POLICY IF EXISTS buyer_identities_tenant_policy ON buyer_identities;

-- Strict tenant-scoped policy (mirrors seller_identities pattern)
CREATE POLICY buyer_identities_tenant ON buyer_identities
  FOR ALL
  USING (realtor_id = auth.uid()::uuid)
  WITH CHECK (realtor_id = auth.uid()::uuid);

COMMENT ON POLICY buyer_identities_tenant ON buyer_identities IS
  'SOC 2 CC6.3: Row-level access control scoped to the authenticated realtor. FINTRAC KYC data must never cross tenant boundaries.';
