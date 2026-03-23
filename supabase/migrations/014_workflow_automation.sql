-- ============================================================
-- MIGRATION 009: Workflow Automation Engine
-- Message templates, workflow definitions, steps, enrollments,
-- agent notifications, and activity log
-- ============================================================

-- ============================================================
-- TABLE: message_templates
-- Reusable SMS/Email/WhatsApp templates with variable support
-- ============================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  channel       TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'whatsapp', 'email')),
  subject       TEXT,                                    -- email subject line
  body          TEXT NOT NULL,                            -- template body with {{variable}} placeholders
  variables     JSONB DEFAULT '[]'::jsonb,               -- list of variable names used
  category      TEXT DEFAULT 'general',                  -- e.g. nurture, post_close, follow_up
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_message_templates_channel ON message_templates(channel);
CREATE INDEX idx_message_templates_category ON message_templates(category);

-- ============================================================
-- TABLE: workflows
-- Defines the 7 automation workflows
-- ============================================================
CREATE TABLE IF NOT EXISTS workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,                    -- e.g. 'buyer_nurture', 'post_close_buyer'
  name          TEXT NOT NULL,
  description   TEXT,
  trigger_type  TEXT NOT NULL CHECK (trigger_type IN (
    'lead_status_change',   -- when lead_status transitions
    'listing_status_change',-- when listing sold/closed
    'manual',               -- agent enrolls manually
    'inactivity',           -- no activity for X days
    'showing_completed',    -- after showing/open house
    'new_lead',             -- speed-to-contact on new lead
    'tag_added'             -- when specific tag added
  )),
  trigger_config JSONB DEFAULT '{}'::jsonb,             -- e.g. { "from_status": "new", "to_status": "contacted" }
  contact_type  TEXT CHECK (contact_type IN ('buyer', 'seller', 'any')),
  is_active     BOOLEAN DEFAULT true,
  max_enrollments INTEGER DEFAULT 1,                    -- max concurrent enrollments per contact
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: workflow_steps
-- Ordered steps within a workflow
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order    INTEGER NOT NULL,                        -- execution order (1-based)
  name          TEXT NOT NULL,
  action_type   TEXT NOT NULL CHECK (action_type IN (
    'auto_email',     -- system sends email
    'auto_sms',       -- system sends SMS
    'auto_whatsapp',  -- system sends WhatsApp
    'manual_task',    -- creates task for agent
    'auto_alert',     -- push/in-app notification
    'system_action',  -- tag update, stage change, workflow switch
    'wait',           -- delay before next step
    'condition'       -- branch based on condition
  )),
  delay_minutes INTEGER DEFAULT 0,                       -- wait time before executing this step
  delay_unit    TEXT DEFAULT 'minutes' CHECK (delay_unit IN ('minutes', 'hours', 'days')),
  delay_value   INTEGER DEFAULT 0,                       -- human-readable delay (e.g. 2 days)
  template_id   UUID REFERENCES message_templates(id),   -- for auto_email/sms/whatsapp
  task_config   JSONB DEFAULT '{}'::jsonb,               -- for manual_task: { title, priority, category }
  action_config JSONB DEFAULT '{}'::jsonb,               -- for system_action: { action: "change_stage", value: "qualified" }
  condition_config JSONB DEFAULT '{}'::jsonb,             -- for condition: { field, operator, value, true_step, false_step }
  exit_on_reply BOOLEAN DEFAULT false,                   -- exit workflow if contact replies
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id, step_order);

-- ============================================================
-- TABLE: workflow_enrollments
-- Tracks a contact's progress through a workflow
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id    UUID REFERENCES listings(id) ON DELETE SET NULL,  -- optional context (e.g. which listing triggered)
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'exited', 'failed')),
  current_step  INTEGER DEFAULT 1,                       -- current step_order
  next_run_at   TIMESTAMPTZ,                             -- when the next step should execute
  started_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  exit_reason   TEXT,                                    -- why enrollment ended early
  metadata      JSONB DEFAULT '{}'::jsonb,               -- extra context per enrollment
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enrollments_workflow ON workflow_enrollments(workflow_id);
CREATE INDEX idx_enrollments_contact ON workflow_enrollments(contact_id);
CREATE INDEX idx_enrollments_status ON workflow_enrollments(status);
CREATE INDEX idx_enrollments_next_run ON workflow_enrollments(next_run_at) WHERE status = 'active';
CREATE UNIQUE INDEX idx_enrollments_unique_active ON workflow_enrollments(workflow_id, contact_id) WHERE status = 'active';

-- ============================================================
-- TABLE: workflow_step_logs
-- Audit trail of every step execution
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_step_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   UUID NOT NULL REFERENCES workflow_enrollments(id) ON DELETE CASCADE,
  step_id         UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  result          JSONB DEFAULT '{}'::jsonb,             -- e.g. { "twilio_sid": "...", "task_id": "..." }
  error_message   TEXT,
  executed_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_step_logs_enrollment ON workflow_step_logs(enrollment_id);

-- ============================================================
-- TABLE: agent_notifications
-- In-app notifications for the realtor
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  body          TEXT,
  type          TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'task', 'workflow')),
  contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id    UUID REFERENCES listings(id) ON DELETE SET NULL,
  action_url    TEXT,                                    -- deep link, e.g. /contacts/uuid
  is_read       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_read ON agent_notifications(is_read, created_at DESC);
CREATE INDEX idx_notifications_contact ON agent_notifications(contact_id);

-- ============================================================
-- TABLE: activity_log
-- Unified activity tracking across the CRM
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id    UUID REFERENCES listings(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,                           -- e.g. 'email_sent', 'sms_received', 'task_completed', 'showing_booked'
  description   TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_contact ON activity_log(contact_id, created_at DESC);
CREATE INDEX idx_activity_type ON activity_log(activity_type);

-- ============================================================
-- ROW LEVEL SECURITY — all tables
-- ============================================================
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Authenticated access
CREATE POLICY "auth_message_templates" ON message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_workflows" ON workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_workflow_steps" ON workflow_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_workflow_enrollments" ON workflow_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_workflow_step_logs" ON workflow_step_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_agent_notifications" ON agent_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_activity_log" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon access (for service role / admin client)
CREATE POLICY "anon_message_templates" ON message_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_workflows" ON workflows FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_workflow_steps" ON workflow_steps FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_workflow_enrollments" ON workflow_enrollments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_workflow_step_logs" ON workflow_step_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_agent_notifications" ON agent_notifications FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_activity_log" ON activity_log FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workflow_enrollments_updated_at
  BEFORE UPDATE ON workflow_enrollments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- SEED: Default 7 Workflows
-- ============================================================
INSERT INTO workflows (slug, name, description, trigger_type, trigger_config, contact_type) VALUES
  ('buyer_nurture', 'Buyer Nurture Plan', '7-stage multi-day drip sequence for new buyer leads', 'lead_status_change', '{"to_status": "qualified"}', 'buyer'),
  ('post_close_buyer', 'Post-Close Buyer Workflow', 'Timed touchpoints from closing day through annual follow-up', 'listing_status_change', '{"to_status": "sold"}', 'buyer'),
  ('post_close_seller', 'Post-Close Seller Workflow', 'Timed touchpoints from closing day through annual follow-up', 'listing_status_change', '{"to_status": "sold"}', 'seller'),
  ('lead_reengagement', 'Lead Re-Engagement', 'Triggered after 60-90 days of inactivity', 'inactivity', '{"days": 60}', 'any'),
  ('open_house_followup', 'Open House / Showing Follow-Up', 'Immediate to 7-day follow-up after showing', 'showing_completed', '{}', 'buyer'),
  ('speed_to_contact', 'Lead Speed-to-Contact', '0-1 min to 24-hour escalation for new leads', 'new_lead', '{}', 'any'),
  ('referral_partner', 'Referral Partner Workflow', 'Ongoing relationship nurture for referral sources', 'tag_added', '{"tag": "referral_partner"}', 'any')
ON CONFLICT (slug) DO NOTHING;
