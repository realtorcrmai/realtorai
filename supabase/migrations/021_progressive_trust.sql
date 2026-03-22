-- Migration 021: Progressive Trust System
-- Phase 2 of AI Agent Email Marketing System

-- 1. Agent settings (global config)
CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO agent_settings (key, value) VALUES
  ('global_trust_level', '"ghost"'),
  ('trust_promotion_threshold', '{"min_emails": 20, "max_edit_rate": 0.15, "min_approval_rate": 0.50}'),
  ('send_governor', '{"weekly_cap": 3, "daily_cap": 1, "min_gap_hours": 24}')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_agent_settings" ON agent_settings;
CREATE POLICY "auth_agent_settings" ON agent_settings FOR ALL USING (true);

-- 2. Per-contact agent settings
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_trust_level TEXT
  CHECK (agent_trust_level IN ('ghost', 'copilot', 'supervised', 'autonomous', NULL));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_never_email BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_frequency_pref TEXT
  CHECK (agent_frequency_pref IN ('aggressive', 'normal', 'conservative', 'minimal', NULL));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agent_topic_avoid JSONB DEFAULT '[]'::jsonb;

-- 3. Ghost mode drafts
CREATE TABLE IF NOT EXISTS ghost_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES agent_decisions(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  ai_context JSONB DEFAULT '{}'::jsonb,
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ghost_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_ghost_drafts" ON ghost_drafts;
CREATE POLICY "auth_ghost_drafts" ON ghost_drafts FOR ALL USING (true);

-- 4. Email recall window (supervised mode)
CREATE TABLE IF NOT EXISTS email_recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  recalled BOOLEAN NOT NULL DEFAULT false,
  recalled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_recalls_active ON email_recalls(expires_at)
  WHERE recalled = false;

ALTER TABLE email_recalls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_email_recalls" ON email_recalls;
CREATE POLICY "auth_email_recalls" ON email_recalls FOR ALL USING (true);

-- 5. Trust audit log
CREATE TABLE IF NOT EXISTS trust_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_level TEXT NOT NULL,
  new_level TEXT NOT NULL,
  reason TEXT NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('auto_promotion', 'manual', 'demotion')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trust_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_trust_audit_log" ON trust_audit_log;
CREATE POLICY "auth_trust_audit_log" ON trust_audit_log FOR ALL USING (true);

-- 6. Edit tracking columns on newsletters
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS original_subject TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS original_html_body TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS edit_distance FLOAT;

-- 7. Edit history table
CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  original_subject TEXT NOT NULL,
  edited_subject TEXT NOT NULL,
  original_body_excerpt TEXT NOT NULL,
  edited_body_excerpt TEXT NOT NULL,
  edit_distance FLOAT NOT NULL,
  edit_type TEXT CHECK (edit_type IN ('minor_tweak', 'tone_change', 'content_change', 'major_rewrite')),
  extracted_rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_edit_history" ON edit_history;
CREATE POLICY "auth_edit_history" ON edit_history FOR ALL USING (true);

-- 8. Voice rules table
CREATE TABLE IF NOT EXISTS voice_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'tone', 'greeting', 'sign_off', 'vocabulary', 'structure',
    'subject_line', 'avoid', 'always_include'
  )),
  rule_text TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  source_count INT NOT NULL DEFAULT 1,
  examples JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE voice_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_voice_rules" ON voice_rules;
CREATE POLICY "auth_voice_rules" ON voice_rules FOR ALL USING (true);

-- 9. Send governor log
CREATE TABLE IF NOT EXISTS send_governor_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  newsletter_id UUID REFERENCES newsletters(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_number INT NOT NULL DEFAULT EXTRACT(WEEK FROM NOW())::INT,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT
);

CREATE INDEX IF NOT EXISTS idx_governor_contact_week ON send_governor_log(contact_id, year, week_number);

ALTER TABLE send_governor_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_send_governor_log" ON send_governor_log;
CREATE POLICY "auth_send_governor_log" ON send_governor_log FOR ALL USING (true);

-- 10. Auto-sunset columns
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS auto_sunset BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sunset_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sunset_reason TEXT;
