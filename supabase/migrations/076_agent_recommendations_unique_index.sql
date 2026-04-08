-- 076_agent_recommendations_unique_index.sql
--
-- M3-D — fix duplicate-recommendation bug per MASTER_NEWSLETTER_PLAN.md §6.4 #2.
--
-- Background:
--   The agent-scoring cron (every 15 min) inserts a new row into
--   agent_recommendations every time a contact's AI lead score recommends
--   advancing the stage. There is no UNIQUE constraint, so the same
--   "advance to <stage>" recommendation accumulates duplicate pending rows
--   for the same contact across runs until the realtor accepts or dismisses
--   one. In the worst case the queue UI shows the same suggestion 4×/hour.
--
-- Fix:
--   Partial unique index over (contact_id, action_type, new_stage) scoped to
--   pending rows only. Combined with ON CONFLICT DO NOTHING in the inserter
--   (see realtors360-newsletter/src/shared/ai-agent/lead-scorer.ts), this
--   guarantees at most one pending recommendation per (contact, action,
--   target_stage) tuple. Once a recommendation is accepted/dismissed/expired
--   the partial index releases that slot, so the next scoring run can write
--   a fresh suggestion if the score still warrants one.
--
-- Idempotency:
--   IF NOT EXISTS so re-running the migration is safe. Pre-existing duplicate
--   pending rows would block index creation, so the DELETE below collapses
--   each duplicate group down to the most recent row before the index is
--   added. The DELETE is also idempotent (no-op if there are no duplicates).
--
-- Rollback: see supabase/rollbacks/076_rollback.sql

-- 1. Collapse pre-existing duplicates to the most recent pending row per
--    (contact_id, action_type, new_stage) tuple. We keep the newest because
--    its reasoning string reflects the most recent scoring context.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY contact_id, action_type, (action_config->>'new_stage')
      ORDER BY created_at DESC
    ) AS rn
  FROM agent_recommendations
  WHERE status = 'pending'
    AND action_type = 'advance_stage'
    AND action_config ? 'new_stage'
)
DELETE FROM agent_recommendations
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Partial unique index. Postgres requires the same WHERE clause shape on
--    inserts that want to use ON CONFLICT against this index. The ai-agent
--    lead-scorer port uses .upsert({ ..., onConflict: 'uq_agent_recs_pending',
--    ignoreDuplicates: true }).
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_recs_pending
  ON agent_recommendations (
    contact_id,
    action_type,
    (action_config->>'new_stage')
  )
  WHERE status = 'pending';
