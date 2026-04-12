-- 110_lock_rls_policies.sql
--
-- P0 SECURITY: Rewrite all open USING(true) RLS policies on tables
-- with a realtor_id column to scope by realtor_id = auth.uid().
--
-- Before: 66+ tenant tables had USING(true) policies.
-- After: RLS enforces tenant isolation at the database level.

DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
  policy_name TEXT;
  col_type TEXT;
  exempt_tables TEXT[] := ARRAY[
    'newsletter_templates', 'email_template_registry', 'knowledge_articles',
    'neighbourhood_data', 'market_stats_cache', 'verification_tokens',
    'signup_events', 'signup_rate_limits', 'onboarding_checklist',
    'welcome_drip_log', 'team_invites', 'tutor_users', 'tutor_sessions',
    'tutor_messages', 'tutor_cefr_history'
  ];
BEGIN
  FOR tbl IN
    SELECT DISTINCT c.table_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'realtor_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name != ALL(exempt_tables)
    ORDER BY c.table_name
  LOOP
    -- Drop ALL existing policies
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl.table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl.table_name);
    END LOOP;

    -- Ensure RLS enabled
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.table_name);

    -- Create tenant-scoped policy (handle uuid vs text realtor_id)
    policy_name := 'tenant_isolation_' || tbl.table_name;

    IF tbl.data_type = 'uuid' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (realtor_id = auth.uid()::uuid) WITH CHECK (realtor_id = auth.uid()::uuid)',
        policy_name, tbl.table_name
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (realtor_id = auth.uid()::text) WITH CHECK (realtor_id = auth.uid()::text)',
        policy_name, tbl.table_name
      );
    END IF;

    RAISE NOTICE 'Locked: %', tbl.table_name;
  END LOOP;
END $$;
