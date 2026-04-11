-- Fix RLS policies on property_deals and property_deal_partners.
-- The original policies used auth.uid() which only works with Supabase Auth,
-- but this app uses NextAuth with service-role key. App-level tenancy is
-- enforced by getAuthenticatedTenantClient() which injects realtor_id filters.

DROP POLICY IF EXISTS "realtor_owns_deals" ON property_deals;
DROP POLICY IF EXISTS "realtor_owns_deal_partners" ON property_deal_partners;

CREATE POLICY "allow_all_property_deals" ON property_deals FOR ALL USING (true);
CREATE POLICY "allow_all_property_deal_partners" ON property_deal_partners FOR ALL USING (true);
