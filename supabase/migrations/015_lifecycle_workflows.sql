-- ============================================================
-- MIGRATION 010: Lifecycle Workflows
-- Adds workflow_type column, milestone action type, and
-- seeds Buyer + Seller Lifecycle workflows
-- ============================================================

-- ── 1. Add workflow_type column to distinguish drip vs lifecycle ──
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS workflow_type TEXT DEFAULT 'drip';

-- Add check constraint (handle if already exists)
DO $$
BEGIN
  ALTER TABLE workflows ADD CONSTRAINT workflows_workflow_type_check
    CHECK (workflow_type IN ('drip', 'lifecycle'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mark all existing workflows as 'drip'
UPDATE workflows SET workflow_type = 'drip' WHERE workflow_type IS NULL;

-- ── 2. Expand action_type CHECK to include 'milestone' ──
ALTER TABLE workflow_steps DROP CONSTRAINT IF EXISTS workflow_steps_action_type_check;
ALTER TABLE workflow_steps ADD CONSTRAINT workflow_steps_action_type_check
  CHECK (action_type IN (
    'auto_email', 'auto_sms', 'auto_whatsapp', 'manual_task',
    'auto_alert', 'system_action', 'wait', 'condition', 'milestone'
  ));

-- ── 3. Seed the two lifecycle workflows ──
INSERT INTO workflows (slug, name, description, trigger_type, trigger_config, contact_type, workflow_type) VALUES
  ('seller_lifecycle', 'Seller Lifecycle', 'Milestone-based seller journey from intake to closing', 'new_lead', '{}', 'seller', 'lifecycle'),
  ('buyer_lifecycle', 'Buyer Lifecycle', 'Milestone-based buyer journey from contact to purchase', 'new_lead', '{}', 'buyer', 'lifecycle')
ON CONFLICT (slug) DO NOTHING;
