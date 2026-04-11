-- 091: A/B test tracking for agent subject line optimization
-- Multi-tenant per HC-14: all rows scoped by realtor_id

CREATE TABLE IF NOT EXISTS agent_ab_tests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id    uuid NOT NULL,
  draft_id      uuid NOT NULL,
  variant_a_subject text NOT NULL,
  variant_b_subject text NOT NULL,
  selected_variant  text NOT NULL CHECK (selected_variant IN ('a', 'b')),
  selection_reason  text,
  open_result       jsonb,               -- populated after send: which variant got opened, timing, etc.
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_ab_tests_realtor ON agent_ab_tests(realtor_id);
CREATE INDEX IF NOT EXISTS idx_agent_ab_tests_draft   ON agent_ab_tests(draft_id);
CREATE INDEX IF NOT EXISTS idx_agent_ab_tests_contact ON agent_ab_tests(contact_id);

-- RLS
ALTER TABLE agent_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_ab_tests_tenant ON agent_ab_tests
  FOR ALL USING (realtor_id = auth.uid());

-- Add metadata column to agent_drafts if it doesn't exist (stores A/B variant info)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_drafts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE agent_drafts ADD COLUMN metadata jsonb;
  END IF;
END $$;
