-- Migration 089: Add cost tracking columns to agent_runs
-- Tracks token usage and estimated cost per agent run.
-- Idempotent: uses DO $$ block with IF NOT EXISTS checks.

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
