ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS quality_score numeric(4,2),
  ADD COLUMN IF NOT EXISTS quality_checked_at timestamptz;

COMMENT ON COLUMN newsletters.quality_score IS 'AI quality score 0-100 from quality-pipeline.ts';
COMMENT ON COLUMN newsletters.quality_checked_at IS 'When the quality check was last run';
