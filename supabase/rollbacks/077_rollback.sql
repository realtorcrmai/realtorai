-- Rollback for 077_agent_recommendations_unique_index.sql
--
-- Drops the partial unique index added in M3-D. Pre-existing duplicate
-- recommendations cannot be restored — the migration's DELETE step is
-- destructive and intentional. If a rollback is needed for some reason
-- other than the index itself (e.g. it interacts badly with another
-- migration), drop just the index and leave the deduplicated rows in place.

DROP INDEX IF EXISTS uq_agent_recs_pending_advance;
