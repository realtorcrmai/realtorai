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
--   Partial unique index over (contact_id, action_config->>'new_stage')
--   scoped to PENDING rows of action_type='advance_stage' only. The narrow
--   predicate is intentional — we want to dedupe stage-advance suggestions
--   without accidentally constraining other recommendation kinds (e.g.
--   `next-best-action.ts` inserts mixed action_types from a single Claude
--   call, and we don't want migration 076 to start blocking those just
--   because one of them happens to be an advance_stage).
--
--   Combined with `INSERT ... catch SQLSTATE 23505` in both inserters
--   (lead-scorer port + next-best-action), this guarantees at most one
--   pending advance_stage recommendation per (contact, target_stage)
--   tuple. Once a recommendation is accepted / dismissed / expired the
--   partial index releases that slot, so the next scoring run can write
--   a fresh suggestion if the score still warrants one.
--
-- Why not `.upsert({onConflict})`?
--   PostgREST `on_conflict` only accepts plain column lists. It cannot
--   target an expression-based partial index (it would need to emit
--   `ON CONFLICT (contact_id, (action_config->>'new_stage')) WHERE ...`
--   which PostgREST does not generate). The catch-23505 pattern is the
--   functional equivalent and is portable across both inserters.
--
-- Idempotency:
--   IF NOT EXISTS so re-running the migration is safe. Pre-existing
--   duplicate pending rows would block index creation, so the DELETE
--   below collapses each duplicate group down to the most recent row
--   before the index is added. The DELETE is also idempotent (no-op if
--   there are no duplicates).
--
-- Rollback: see supabase/rollbacks/076_rollback.sql

-- 1. Collapse pre-existing duplicates to the most recent pending row per
--    (contact_id, new_stage) tuple, scoped to advance_stage rows. We keep
--    the newest because its reasoning string reflects the most recent
--    scoring context.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY contact_id, (action_config->>'new_stage')
      ORDER BY created_at DESC
    ) AS rn
  FROM agent_recommendations
  WHERE status = 'pending'
    AND action_type = 'advance_stage'
    AND (action_config->>'new_stage') IS NOT NULL
)
DELETE FROM agent_recommendations
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Partial unique index, narrowed to pending advance_stage rows so it
--    cannot accidentally constrain other action types.
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_recs_pending_advance
  ON agent_recommendations (
    contact_id,
    (action_config->>'new_stage')
  )
  WHERE status = 'pending'
    AND action_type = 'advance_stage';
