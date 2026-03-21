-- ============================================================
-- 015: AI Agent Layer
-- Lead scoring, recommendations, send advisor audit trail
-- ============================================================

-- AI lead score on contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_lead_score JSONB DEFAULT '{}'::jsonb;

-- Add ai_email to workflow_steps action_type constraint
ALTER TABLE workflow_steps DROP CONSTRAINT IF EXISTS workflow_steps_action_type_check;
ALTER TABLE workflow_steps ADD CONSTRAINT workflow_steps_action_type_check
  CHECK (action_type IN (
    'auto_email', 'auto_sms', 'auto_whatsapp', 'manual_task',
    'auto_alert', 'system_action', 'wait', 'condition', 'milestone', 'ai_email'
  ));

-- AI decision audit trail on workflow step logs
ALTER TABLE workflow_step_logs ADD COLUMN IF NOT EXISTS ai_decision JSONB;

-- Agent recommendations table
CREATE TABLE IF NOT EXISTS agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'call', 'send_email', 'send_sms', 'enroll_workflow',
    'advance_stage', 'add_tag', 'create_task', 'reengage'
  )),
  action_config JSONB DEFAULT '{}'::jsonb,
  reasoning TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('hot', 'warm', 'info')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_status ON agent_recommendations(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_contact ON agent_recommendations(contact_id);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_expires ON agent_recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_contacts_ai_lead_score ON contacts(id) WHERE ai_lead_score IS NOT NULL AND ai_lead_score != '{}'::jsonb;

-- RLS
ALTER TABLE agent_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage agent_recommendations"
  ON agent_recommendations FOR ALL USING (true);
