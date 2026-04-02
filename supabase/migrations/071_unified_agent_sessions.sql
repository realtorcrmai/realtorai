-- ============================================================================
-- Unified Agent Sessions — Single table for text + voice conversations
--
-- Replaces separate rag_sessions (text) and voice sessions (Python).
-- Supports seamless text ↔ voice mode switching within same conversation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS unified_agent_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL REFERENCES auth.users(id),
  session_type text NOT NULL DEFAULT 'text' CHECK (session_type IN ('text', 'voice', 'unified')),
  current_mode text NOT NULL DEFAULT 'text' CHECK (current_mode IN ('text', 'voice')),
  ui_context jsonb DEFAULT '{}',
  tone_preference text DEFAULT 'professional',
  messages jsonb DEFAULT '[]',
  summary text,
  tools_used text[] DEFAULT '{}',
  total_tokens_in int DEFAULT 0,
  total_tokens_out int DEFAULT 0,
  total_cost_usd numeric(8,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uas_realtor ON unified_agent_sessions(realtor_id);
CREATE INDEX IF NOT EXISTS idx_uas_activity ON unified_agent_sessions(last_activity_at);

ALTER TABLE unified_agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_rls_uas ON unified_agent_sessions
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- Immutability trigger
CREATE TRIGGER trg_uas_realtor_immutable
  BEFORE UPDATE ON unified_agent_sessions FOR EACH ROW
  EXECUTE FUNCTION prevent_rag_realtor_id_change();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_uas_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_uas_updated
  BEFORE UPDATE ON unified_agent_sessions FOR EACH ROW
  EXECUTE FUNCTION update_uas_timestamp();
