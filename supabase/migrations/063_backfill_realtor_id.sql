-- Migration 063: Multi-Tenancy — Backfill realtor_id on all existing data
-- Assigns all existing rows to the first user in the users table
-- Safe: only updates rows where realtor_id IS NULL

DO $$
DECLARE
  v_realtor_id uuid;
BEGIN
  -- Get the first (and likely only) user
  SELECT id INTO v_realtor_id FROM users WHERE is_active = true ORDER BY created_at ASC LIMIT 1;

  IF v_realtor_id IS NULL THEN
    RAISE NOTICE 'No active user found — skipping backfill. Run this after first user signup.';
    RETURN;
  END IF;

  RAISE NOTICE 'Backfilling realtor_id = % on all tables', v_realtor_id;

  -- TIER 1: Core Data
  UPDATE contacts SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE listings SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE appointments SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE communications SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE listing_documents SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE listing_activities SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE seller_identities SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE prompts SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE media_assets SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE open_houses SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE open_house_visitors SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  -- TIER 2: Contact Sub-Tables
  UPDATE contact_dates SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_journeys SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_relationships SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_family_members SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_instructions SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_watchlist SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_context SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_properties SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_segments SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_consent SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE consent_records SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_important_dates SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE contact_documents SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE households SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  -- TIER 3: Transactions
  UPDATE deals SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE deal_parties SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE deal_checklist SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE offers SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE offer_conditions SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE offer_history SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE mortgages SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE referrals SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  -- TIER 4: Communication & Email
  UPDATE newsletters SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE newsletter_events SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE message_templates SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE email_feedback SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE email_recalls SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE form_submissions SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE outcome_events SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE ghost_drafts SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  -- TIER 5: Workflows & Automation
  UPDATE workflows SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE workflow_enrollments SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE workflow_step_logs SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE extension_tasks SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE tasks SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE activities SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE activity_log SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE showing_feedback SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  -- TIER 6: AI & Intelligence
  UPDATE agent_recommendations SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE agent_decisions SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE agent_notifications SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE agent_events SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE rag_embeddings SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE rag_sessions SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE rag_feedback SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE rag_audit_log SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE competitive_emails SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  -- TIER 7: Social Media
  UPDATE social_brand_kits SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE social_accounts SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE social_posts SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE social_post_publishes SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE social_analytics_daily SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE social_usage_tracking SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE social_audit_log SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE social_hashtag_performance SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  -- TIER 8: Website & Analytics
  UPDATE site_analytics_events SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE site_sessions SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE site_session_recordings SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  -- TIER 9: Config & Misc
  UPDATE google_tokens SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE user_integrations SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE feature_overrides SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE send_governor_log SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE trust_audit_log SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;
  UPDATE edit_history SET realtor_id = v_realtor_id WHERE realtor_id IS NULL;

  RAISE NOTICE 'Backfill complete for all tables';
END $$;
