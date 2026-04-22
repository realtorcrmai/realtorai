-- L4: Enforce NOT NULL on regeneration_count — migration 131 added the column
-- without NOT NULL, allowing old code paths to insert NULL values.
-- Backfill any NULLs first, then apply the constraint.
UPDATE newsletters SET regeneration_count = 0 WHERE regeneration_count IS NULL;
ALTER TABLE newsletters ALTER COLUMN regeneration_count SET DEFAULT 0;
ALTER TABLE newsletters ALTER COLUMN regeneration_count SET NOT NULL;
