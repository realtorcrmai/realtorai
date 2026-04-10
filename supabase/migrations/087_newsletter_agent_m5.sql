-- Migration 087: Newsletter Agent M5 tables
-- Creates agent_runs, agent_decisions, agent_drafts, contact_trust_levels
-- All multi-tenant per HC-12/14: realtor_id NOT NULL, indexed, RLS scoped.
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.

-- 1. agent_runs — each agent loop invocation
CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL,
  trigger_type text NOT NULL DEFAULT 'scheduled',  -- scheduled, event, manual
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  contact_ids_evaluated uuid[] DEFAULT '{}',
  decisions_made int DEFAULT 0,
  status text DEFAULT 'running',  -- running, completed, failed, cancelled
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_realtor ON agent_runs(realtor_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_rls_agent_runs ON agent_runs FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. agent_decisions — per-decision audit trail
CREATE TABLE IF NOT EXISTS agent_decisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES agent_runs(id) ON DELETE CASCADE,
  realtor_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  decision_type text NOT NULL,  -- send_email, skip, defer, queue_approval
  reasoning text,
  tool_calls jsonb DEFAULT '[]',
  outcome text,  -- sent, approved, rejected, expired
  override_by_realtor boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_realtor ON agent_decisions(realtor_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_run ON agent_decisions(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_contact ON agent_decisions(contact_id);
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_rls_agent_decisions ON agent_decisions FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. agent_drafts — drafts pending approval / send
CREATE TABLE IF NOT EXISTS agent_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  decision_id uuid REFERENCES agent_decisions(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  content_hash text,
  idempotency_key text,
  status text DEFAULT 'pending_review',  -- pending_review, approved, sent, rejected, expired
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  resend_message_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_drafts_realtor ON agent_drafts(realtor_id);
CREATE INDEX IF NOT EXISTS idx_agent_drafts_contact ON agent_drafts(contact_id);
CREATE INDEX IF NOT EXISTS idx_agent_drafts_status ON agent_drafts(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_drafts_idempotency ON agent_drafts(idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE agent_drafts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_rls_agent_drafts ON agent_drafts FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. contact_trust_levels — L0-L3 per contact
CREATE TABLE IF NOT EXISTS contact_trust_levels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL,
  contact_id uuid NOT NULL UNIQUE,
  level int DEFAULT 0 CHECK (level >= 0 AND level <= 3),  -- L0=new, L1=proven, L2=engaged, L3=deal
  last_promoted_at timestamptz,
  positive_signals int DEFAULT 0,  -- opens, clicks, replies
  negative_signals int DEFAULT 0,  -- unsubscribes, complaints, bounces
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_trust_realtor ON contact_trust_levels(realtor_id);
CREATE INDEX IF NOT EXISTS idx_contact_trust_level ON contact_trust_levels(level);
ALTER TABLE contact_trust_levels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_rls_contact_trust ON contact_trust_levels FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
