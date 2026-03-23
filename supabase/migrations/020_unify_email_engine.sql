-- ============================================================
-- 011: Unify Email Engine
-- Adds journey-specific columns to workflow_enrollments
-- so contact_journeys can be migrated into workflow_enrollments
-- ============================================================

-- Add journey tracking columns to workflow_enrollments
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS journey_phase TEXT DEFAULT 'lead';
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS emails_sent_in_phase INTEGER DEFAULT 0;
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS send_mode TEXT DEFAULT 'review';

-- Index for cron processor performance
CREATE INDEX IF NOT EXISTS idx_workflow_enrollments_active_due
  ON workflow_enrollments(next_run_at)
  WHERE status = 'active' AND next_run_at IS NOT NULL;

-- Migrate existing contact_journeys into workflow_enrollments
-- (only if both tables exist and buyer/seller workflows exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_journeys')
     AND EXISTS (SELECT 1 FROM workflows WHERE slug IN ('buyer_email_journey', 'seller_email_journey'))
  THEN
    INSERT INTO workflow_enrollments (contact_id, workflow_id, status, current_step, next_run_at, journey_phase, emails_sent_in_phase, send_mode, metadata)
    SELECT
      cj.contact_id,
      w.id,
      CASE WHEN cj.is_paused THEN 'paused' ELSE 'active' END,
      cj.emails_sent_in_phase,
      cj.next_email_at,
      cj.current_phase,
      cj.emails_sent_in_phase,
      cj.send_mode,
      jsonb_build_object('migrated_from', 'contact_journeys', 'original_id', cj.id)
    FROM contact_journeys cj
    JOIN workflows w ON (
      (cj.journey_type = 'buyer' AND w.slug = 'buyer_email_journey') OR
      (cj.journey_type = 'seller' AND w.slug = 'seller_email_journey')
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
