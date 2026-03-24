-- Migration 051: Per-realtor AI agent configuration
-- Sprint 0 + Sprint 1

CREATE TABLE IF NOT EXISTS realtor_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id TEXT NOT NULL UNIQUE,

  -- Voice rules (extracted from edits by voice learning engine)
  voice_rules JSONB DEFAULT '[]',
  voice_examples JSONB DEFAULT '{}',

  -- Optimal email sequences (learned over time)
  buyer_sequence JSONB DEFAULT '["welcome","listing_alert","neighbourhood_guide","market_update"]',
  seller_sequence JSONB DEFAULT '["welcome","cma_preview","market_update","listing_strategy"]',

  -- Escalation thresholds (adjusted by learning engine)
  escalation_thresholds JSONB DEFAULT '{"soft_alert":40,"hot_lead":60,"urgent":80}',
  dormancy_days INT DEFAULT 60,
  auto_sunset_days INT DEFAULT 90,
  re_engagement_attempts INT DEFAULT 2,

  -- Frequency caps per journey phase
  frequency_caps JSONB DEFAULT '{"lead":{"per_week":2,"min_gap_hours":48},"active":{"per_week":3,"min_gap_hours":18},"under_contract":{"per_week":1,"min_gap_hours":72},"past_client":{"per_month":2,"min_gap_hours":168},"dormant":{"per_month":1,"min_gap_hours":336}}',

  -- Send settings
  sending_enabled BOOLEAN DEFAULT true,
  skip_weekends BOOLEAN DEFAULT false,
  quiet_hours JSONB DEFAULT '{"start":"20:00","end":"07:00"}',
  default_send_day TEXT DEFAULT 'tuesday',
  default_send_hour INT DEFAULT 9,

  -- Content effectiveness rankings (learned)
  content_rankings JSONB DEFAULT '[]',

  -- Brand config (logo, colors, fonts, signature)
  brand_config JSONB DEFAULT '{}',

  -- Learning metadata
  total_emails_analyzed INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  learning_confidence TEXT DEFAULT 'low',
  last_learning_cycle TIMESTAMPTZ,

  -- Competitive intelligence
  competitive_intel JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent learning audit trail
CREATE TABLE IF NOT EXISTS agent_learning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id TEXT NOT NULL,
  change_type TEXT NOT NULL, -- threshold, sequence, frequency, voice_rule, content_ranking, timing
  field_changed TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  auto_applied BOOLEAN DEFAULT false,
  approved BOOLEAN, -- NULL if pending
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE realtor_agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS rac_auth ON realtor_agent_config FOR ALL USING (true);

ALTER TABLE agent_learning_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS all_auth ON agent_learning_log FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_realtor ON agent_learning_log(realtor_id, created_at DESC);
