-- Migration 052: Contact extras — instructions, watchlist, context, outcomes, feedback
-- Sprint 1 + Sprint 2

-- Per-contact hard rules from realtor (override AI inference)
CREATE TABLE IF NOT EXISTS contact_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  instruction_text TEXT NOT NULL,
  instruction_type TEXT DEFAULT 'constraint', -- constraint, preference, context
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property watchlist per contact
CREATE TABLE IF NOT EXISTS contact_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  notes TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, listing_id)
);

-- Structured context / objections log
CREATE TABLE IF NOT EXISTS contact_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('objection', 'preference', 'concern', 'info', 'timeline')),
  text TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue attribution chain (email → showing → deal)
CREATE TABLE IF NOT EXISTS outcome_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- email_sent, email_opened, email_clicked, showing_booked, offer_submitted, deal_closed
  newsletter_id UUID REFERENCES newsletters(id),
  listing_id UUID REFERENCES listings(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email feedback from prospect + realtor
CREATE TABLE IF NOT EXISTS email_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  feedback_source TEXT NOT NULL, -- prospect_reaction, realtor_quick, realtor_rating, realtor_instruction, deal_survey
  rating INT,
  note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtor weekly quality feedback
CREATE TABLE IF NOT EXISTS realtor_weekly_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id TEXT NOT NULL,
  week TEXT NOT NULL,
  content_quality INT,
  tone_accuracy INT,
  listing_matching INT,
  timing_score INT,
  biggest_issue TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(realtor_id, week)
);

-- Post-showing feedback
CREATE TABLE IF NOT EXISTS showing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reaction TEXT CHECK (reaction IN ('loved', 'ok', 'not_for_me')),
  issues JSONB DEFAULT '[]',
  want_similar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform-wide intelligence (cross-realtor aggregate)
CREATE TABLE IF NOT EXISTS platform_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  week TEXT NOT NULL,
  optimal_defaults JSONB DEFAULT '{}',
  content_benchmarks JSONB DEFAULT '{}',
  trending_angles JSONB DEFAULT '[]',
  trending_subjects JSONB DEFAULT '[]',
  realtors_contributing INT DEFAULT 0,
  total_emails_analyzed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region, week)
);

-- RLS for all new tables
ALTER TABLE contact_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtor_weekly_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE showing_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS ci_auth ON contact_instructions FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS cw_auth ON contact_watchlist FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS cc_auth ON contact_context FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS oe_auth ON outcome_events FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS ef_auth ON email_feedback FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS rwf_auth ON realtor_weekly_feedback FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS sf_auth ON showing_feedback FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS pi_auth ON platform_intelligence FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ci_contact ON contact_instructions(contact_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cw_contact ON contact_watchlist(contact_id);
CREATE INDEX IF NOT EXISTS idx_cc_contact ON contact_context(contact_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_oe_contact ON outcome_events(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ef_newsletter ON email_feedback(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_sf_contact ON showing_feedback(contact_id);
