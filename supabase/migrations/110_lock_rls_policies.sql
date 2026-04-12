-- 110_lock_rls_policies.sql
--
-- P0 SECURITY: Rewrite all open USING(true) RLS policies on tables
-- with a realtor_id column to scope by realtor_id = auth.uid()::uuid.
--
-- Before: 66 tenant tables had USING(true) policies — any authenticated
-- user could read/write ANY realtor's data. The app-layer tenant client
-- (getAuthenticatedTenantClient) added .eq('realtor_id', ...) on queries,
-- but a direct Supabase REST call bypassed it entirely.
--
-- After: RLS enforces tenant isolation at the database level. Even if
-- the app layer is bypassed (e.g., REST API, Supabase Studio), rows
-- are only visible to the owning realtor.
--
-- Exceptions (kept as USING(true)):
--   - newsletter_templates (global, shared across realtors)
--   - email_template_registry (global reference data)
--   - knowledge_articles (global, public knowledge base)
--   - neighbourhood_data (shared market data)
--   - market_stats_cache (shared, realtor_id nullable)
--   - verification_tokens (no realtor_id, keyed by user_id)
--   - signup_events, signup_rate_limits (pre-auth, no realtor_id)
--
-- The migration uses a DO block that iterates every public table with
-- realtor_id, drops ALL existing policies, and creates a new tenant
-- policy. Schema-driven, so future tables with realtor_id are NOT
-- auto-covered (they need their own migration with CREATE POLICY).
--
-- Service role bypasses RLS by default, so admin operations,
-- cron jobs, and the newsletter service continue to work.

DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
  policy_name TEXT;
  -- Tables that should remain open (global/shared data)
  exempt_tables TEXT[] := ARRAY[
    'newsletter_templates',
    'email_template_registry',
    'knowledge_articles',
    'neighbourhood_data',
    'market_stats_cache',
    'verification_tokens',
    'signup_events',
    'signup_rate_limits',
    'onboarding_checklist',
    'welcome_drip_log',
    'team_invites',
    'tutor_users',
    'tutor_sessions',
    'tutor_messages',
    'tutor_cefr_history'
  ];
BEGIN
  -- Iterate every public table that has a realtor_id column
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'realtor_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name != ALL(exempt_tables)
    ORDER BY c.table_name
  LOOP
    -- Drop ALL existing policies on this table
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl.table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl.table_name);
    END LOOP;

    -- Ensure RLS is enabled
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.table_name);

    -- Create tenant-scoped policy for authenticated users
    policy_name := 'tenant_isolation_' || tbl.table_name;
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (realtor_id = auth.uid()::uuid) WITH CHECK (realtor_id = auth.uid()::uuid)',
      policy_name, tbl.table_name
    );

    RAISE NOTICE 'Locked: % → %', tbl.table_name, policy_name;
  END LOOP;
END $$;
