-- Migration 020: Agent Event Pipeline + Decisions
-- Phase 1 of AI Agent Email Marketing System

-- 1. Agent Events table (unified event log)
CREATE TABLE IF NOT EXISTS agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'listing_created', 'listing_updated', 'listing_sold', 'listing_price_change',
    'showing_requested', 'showing_confirmed', 'showing_cancelled',
    'contact_created', 'contact_stage_changed', 'contact_tag_added',
    'email_sent', 'email_opened', 'email_clicked', 'email_bounced',
    'high_intent_click', 'engagement_spike',
    'journey_phase_changed', 'manual_note_added'
  )),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_unprocessed ON agent_events(created_at)
  WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_agent_events_contact ON agent_events(contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_events_listing ON agent_events(listing_id)
  WHERE listing_id IS NOT NULL;

ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_agent_events" ON agent_events;
CREATE POLICY "auth_agent_events" ON agent_events FOR ALL USING (true);

-- 2. Agent Decisions table
CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_id UUID REFERENCES agent_events(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('send', 'skip', 'defer', 'suppress')),
  email_type TEXT,
  reasoning TEXT NOT NULL,
  relevance_score FLOAT,
  confidence FLOAT,
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  outcome TEXT CHECK (outcome IN (
    'draft_created', 'sent', 'approved', 'edited', 'skipped_by_user',
    'suppressed', 'ghost_stored', 'recalled', NULL
  )),
  newsletter_id UUID REFERENCES newsletters(id) ON DELETE SET NULL,
  trust_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_contact ON agent_decisions(contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_outcome ON agent_decisions(outcome);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_decision ON agent_decisions(decision, created_at);

ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_agent_decisions" ON agent_decisions;
CREATE POLICY "auth_agent_decisions" ON agent_decisions FOR ALL USING (true);

-- 3. Agent mode on contact journeys (schedule vs agent_driven)
ALTER TABLE contact_journeys ADD COLUMN IF NOT EXISTS
  agent_mode TEXT NOT NULL DEFAULT 'schedule'
  CHECK (agent_mode IN ('schedule', 'agent_driven'));
