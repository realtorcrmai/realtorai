-- 137: Task comments — timestamped comment thread per task
-- Supports multiple comments per task with author tracking.

CREATE TABLE IF NOT EXISTS task_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  realtor_id  text        NOT NULL,
  body        text        NOT NULL CHECK (char_length(body) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_realtor_id ON task_comments(realtor_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON task_comments(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_task_comment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_comment_updated ON task_comments;
CREATE TRIGGER trg_task_comment_updated
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION touch_task_comment();

-- RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_comments_all ON task_comments FOR ALL USING (true);
