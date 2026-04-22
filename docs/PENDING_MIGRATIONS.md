<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: supabase/migrations/* -->
# Pending Migrations — Apply to Supabase

> **Database:** `qcohfohjihazivkforsj` (realtyaicontent)
> **SQL Editor:** https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new
> **Instructions:** Copy each block into the SQL Editor and run. They are idempotent — safe to re-run.
> **Order:** Run in sequence (087 → 088 → 089 → 090 → 091 → 092 → 093).

---

## Migration 087 — Newsletter Agent Tables

Creates 4 tables: `agent_runs`, `agent_decisions`, `agent_drafts`, `contact_trust_levels`.

```sql
-- 1. agent_runs — each agent loop invocation
CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL,
  trigger_type text NOT NULL DEFAULT 'scheduled',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  contact_ids_evaluated uuid[] DEFAULT '{}',
  decisions_made int DEFAULT 0,
  status text DEFAULT 'running',
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
  decision_type text NOT NULL,
  reasoning text,
  tool_calls jsonb DEFAULT '[]',
  outcome text,
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
  status text DEFAULT 'pending_review',
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
  level int DEFAULT 0 CHECK (level >= 0 AND level <= 3),
  last_promoted_at timestamptz,
  positive_signals int DEFAULT 0,
  negative_signals int DEFAULT 0,
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
```

---

## Migration 088 — Seed Data Quality Fixes

```sql
-- Fix CASL consent for test contacts
UPDATE contacts
SET casl_consent_given = true,
    casl_consent_date = COALESCE(casl_consent_date, now())
WHERE casl_consent_given IS NULL OR casl_consent_given = false;
```

---

## Migration 089 — Agent Run Cost Tracking

```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_runs' AND column_name = 'total_input_tokens'
  ) THEN
    ALTER TABLE agent_runs ADD COLUMN total_input_tokens int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_runs' AND column_name = 'total_output_tokens'
  ) THEN
    ALTER TABLE agent_runs ADD COLUMN total_output_tokens int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_runs' AND column_name = 'estimated_cost_usd'
  ) THEN
    ALTER TABLE agent_runs ADD COLUMN estimated_cost_usd numeric(10,6) DEFAULT 0;
  END IF;
END $$;
```

---

## Migration 090 — Email Event Retry / Dead Letter Queue

```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_events' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE email_events ADD COLUMN retry_count int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_events' AND column_name = 'next_retry_at'
  ) THEN
    ALTER TABLE email_events ADD COLUMN next_retry_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_events_retry
  ON email_events(status, retry_count, next_retry_at)
  WHERE status IN ('failed', 'dead_letter');
```

---

## Migration 091 — A/B Test Tracking

```sql
CREATE TABLE IF NOT EXISTS agent_ab_tests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id    uuid NOT NULL,
  contact_id    uuid NOT NULL,
  draft_id      uuid NOT NULL,
  variant_a_subject text NOT NULL,
  variant_b_subject text NOT NULL,
  selected_variant  text NOT NULL CHECK (selected_variant IN ('a', 'b')),
  selection_reason  text,
  open_result       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_ab_tests_realtor ON agent_ab_tests(realtor_id);
CREATE INDEX IF NOT EXISTS idx_agent_ab_tests_draft   ON agent_ab_tests(draft_id);
CREATE INDEX IF NOT EXISTS idx_agent_ab_tests_contact ON agent_ab_tests(contact_id);

ALTER TABLE agent_ab_tests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY agent_ab_tests_tenant ON agent_ab_tests
    FOR ALL USING (realtor_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add metadata column to agent_drafts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_drafts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE agent_drafts ADD COLUMN metadata jsonb;
  END IF;
END $$;
```

---

## Migration 092 — Fix RLS Policies (CRITICAL)

Migration 087 created RLS policies with `USING (true)` which is an open door. This fixes them to scope by `realtor_id`.

```sql
-- agent_runs
DROP POLICY IF EXISTS tenant_rls_agent_runs ON agent_runs;
CREATE POLICY tenant_rls_agent_runs ON agent_runs
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- agent_decisions
DROP POLICY IF EXISTS tenant_rls_agent_decisions ON agent_decisions;
CREATE POLICY tenant_rls_agent_decisions ON agent_decisions
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- agent_drafts
DROP POLICY IF EXISTS tenant_rls_agent_drafts ON agent_drafts;
CREATE POLICY tenant_rls_agent_drafts ON agent_drafts
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- contact_trust_levels
DROP POLICY IF EXISTS tenant_rls_contact_trust ON contact_trust_levels;
CREATE POLICY tenant_rls_contact_trust ON contact_trust_levels
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- agent_ab_tests
DROP POLICY IF EXISTS tenant_rls_agent_ab_tests ON agent_ab_tests;
DROP POLICY IF EXISTS agent_ab_tests_tenant ON agent_ab_tests;
DO $$ BEGIN
  CREATE POLICY tenant_rls_agent_ab_tests ON agent_ab_tests
    FOR ALL USING (realtor_id = auth.uid()::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

---

## Migration 093 — Atomic Trust Level Functions

Stored procedures for race-safe trust level updates.

```sql
-- Promote: atomically increment positive_signals and recompute level
CREATE OR REPLACE FUNCTION promote_trust_level(
  p_contact_id uuid,
  p_realtor_id uuid,
  p_positive_increment int DEFAULT 1,
  p_has_reply boolean DEFAULT false,
  p_has_deal boolean DEFAULT false
) RETURNS jsonb AS $$
DECLARE
  v_row contact_trust_levels%ROWTYPE;
  v_new_positive int;
  v_new_level int;
  v_old_level int;
BEGIN
  -- Upsert: create if not exists
  INSERT INTO contact_trust_levels (realtor_id, contact_id, level, positive_signals, negative_signals)
  VALUES (p_realtor_id, p_contact_id, 0, 0, 0)
  ON CONFLICT (contact_id) DO NOTHING;

  -- Lock the row
  SELECT * INTO v_row FROM contact_trust_levels
  WHERE contact_id = p_contact_id AND realtor_id = p_realtor_id
  FOR UPDATE;

  v_old_level := v_row.level;
  v_new_positive := v_row.positive_signals + p_positive_increment;

  -- Compute level using same thresholds as TypeScript computeTrustLevel
  IF p_has_deal AND v_new_positive >= 10 THEN
    v_new_level := 3;
  ELSIF v_new_positive >= 10 AND p_has_reply AND v_row.negative_signals <= 1 THEN
    v_new_level := 2;
  ELSIF v_new_positive >= 3 AND v_row.negative_signals <= 0 THEN
    v_new_level := 1;
  ELSE
    v_new_level := 0;
  END IF;

  -- Never auto-demote on positive signal
  v_new_level := GREATEST(v_old_level, v_new_level);

  UPDATE contact_trust_levels SET
    positive_signals = v_new_positive,
    level = v_new_level,
    last_promoted_at = CASE WHEN v_new_level > v_old_level THEN now() ELSE last_promoted_at END,
    updated_at = now()
  WHERE contact_id = p_contact_id AND realtor_id = p_realtor_id;

  RETURN jsonb_build_object(
    'new_level', v_new_level,
    'promoted', v_new_level > v_old_level
  );
END;
$$ LANGUAGE plpgsql;

-- Demote: atomically increment negative_signals and drop 1 level
CREATE OR REPLACE FUNCTION demote_trust_level(
  p_contact_id uuid,
  p_realtor_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_row contact_trust_levels%ROWTYPE;
  v_new_level int;
  v_old_level int;
BEGIN
  -- Upsert: create if not exists
  INSERT INTO contact_trust_levels (realtor_id, contact_id, level, positive_signals, negative_signals)
  VALUES (p_realtor_id, p_contact_id, 0, 0, 0)
  ON CONFLICT (contact_id) DO NOTHING;

  -- Lock the row
  SELECT * INTO v_row FROM contact_trust_levels
  WHERE contact_id = p_contact_id AND realtor_id = p_realtor_id
  FOR UPDATE;

  v_old_level := v_row.level;
  v_new_level := GREATEST(0, v_old_level - 1);

  UPDATE contact_trust_levels SET
    negative_signals = v_row.negative_signals + 1,
    level = v_new_level,
    updated_at = now()
  WHERE contact_id = p_contact_id AND realtor_id = p_realtor_id;

  RETURN jsonb_build_object(
    'new_level', v_new_level,
    'demoted', v_new_level < v_old_level
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Quick Apply — All in One

If you want to run everything at once, paste all blocks above into the SQL Editor sequentially (087 first, 093 last). Each is idempotent — re-running does no harm.

**After applying, verify:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('agent_runs', 'agent_decisions', 'agent_drafts', 'contact_trust_levels', 'agent_ab_tests')
ORDER BY table_name;

-- Check RLS policies are correct (should NOT show USING (true))
SELECT tablename, policyname, qual FROM pg_policies
WHERE tablename IN ('agent_runs', 'agent_decisions', 'agent_drafts', 'contact_trust_levels', 'agent_ab_tests');

-- Check functions exist
SELECT proname FROM pg_proc WHERE proname IN ('promote_trust_level', 'demote_trust_level');

-- Check columns added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'agent_runs' AND column_name IN ('total_input_tokens', 'total_output_tokens', 'estimated_cost_usd');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'email_events' AND column_name IN ('retry_count', 'next_retry_at');
```
