-- Migration 053: Grant table access to authenticated/anon roles
-- Required for Supabase PostgREST to expose tables via REST API

GRANT ALL ON consent_records TO authenticated, anon;
GRANT ALL ON realtor_agent_config TO authenticated, anon;
GRANT ALL ON agent_learning_log TO authenticated, anon;
GRANT ALL ON contact_instructions TO authenticated, anon;
GRANT ALL ON contact_watchlist TO authenticated, anon;
GRANT ALL ON contact_context TO authenticated, anon;
GRANT ALL ON outcome_events TO authenticated, anon;
GRANT ALL ON email_feedback TO authenticated, anon;
GRANT ALL ON realtor_weekly_feedback TO authenticated, anon;
GRANT ALL ON showing_feedback TO authenticated, anon;
GRANT ALL ON platform_intelligence TO authenticated, anon;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
