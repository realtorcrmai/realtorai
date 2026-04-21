-- 144: Complete Task Management System
-- Adds: subtasks, templates, activity log, attachments, watchers, dependencies,
--        labels, start_date, recurrence, archive, position ordering
-- All tables are idempotent (IF NOT EXISTS) and include RLS + indexes.

-- ============================================================
-- 1. Extend tasks table with new columns
-- ============================================================

-- Start date for task scheduling (date range: start_date → due_date)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;

-- Estimated effort in hours
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2);

-- Archive support (soft delete)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Subtask hierarchy: parent_id self-references tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Recurrence rule (RFC 5545 RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO")
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;

-- Next occurrence date for recurring tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_next DATE;

-- Custom labels (JSONB array of strings, e.g. ["urgent-client","vip"])
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb;

-- Position for manual ordering within a status column (kanban)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Visibility for team sharing
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'team'));

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date) WHERE start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(status, position);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence_next) WHERE recurrence_next IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_visibility ON tasks(visibility);
CREATE INDEX IF NOT EXISTS idx_tasks_labels ON tasks USING gin(labels);

-- ============================================================
-- 2. Task Templates
-- ============================================================

CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  trigger_event TEXT, -- e.g. 'listing_created', 'contact_created', 'showing_confirmed'
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_templates_tenant" ON task_templates;
CREATE POLICY "task_templates_tenant" ON task_templates FOR ALL USING (
  realtor_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  OR is_shared = true
  OR current_setting('role', true) = 'service_role'
);

CREATE INDEX IF NOT EXISTS idx_task_templates_realtor ON task_templates(realtor_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_trigger ON task_templates(trigger_event) WHERE trigger_event IS NOT NULL;

-- ============================================================
-- 3. Task Template Items (checklist items within a template)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  category TEXT DEFAULT 'general',
  offset_days INTEGER DEFAULT 0, -- days after template trigger
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_template_items_via_template" ON task_template_items;
CREATE POLICY "task_template_items_via_template" ON task_template_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM task_templates t
    WHERE t.id = template_id
    AND (t.realtor_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
         OR t.is_shared = true
         OR current_setting('role', true) = 'service_role')
  )
);

CREATE INDEX IF NOT EXISTS idx_task_template_items_template ON task_template_items(template_id);

-- ============================================================
-- 4. Task Activity Log (audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created','status_changed','assigned','priority_changed','commented','completed','archived','unarchived','duplicated','subtask_added','attachment_added','watcher_added','dependency_added'
  field_name TEXT, -- which field changed (for edits)
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_activity_via_task" ON task_activity;
CREATE POLICY "task_activity_via_task" ON task_activity FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id
    AND (t.realtor_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
         OR t.assigned_to::text = (current_setting('request.jwt.claims', true)::json->>'sub')
         OR current_setting('role', true) = 'service_role')
  )
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_user ON task_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created ON task_activity(created_at DESC);

-- ============================================================
-- 5. Task Watchers (followers / subscribers)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_watchers_access" ON task_watchers;
CREATE POLICY "task_watchers_access" ON task_watchers FOR ALL USING (
  user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  OR current_setting('role', true) = 'service_role'
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_task ON task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user ON task_watchers(user_id);

-- ============================================================
-- 6. Task Dependencies (blocks / blocked by)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_deps_via_task" ON task_dependencies;
CREATE POLICY "task_deps_via_task" ON task_dependencies FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t WHERE (t.id = blocker_id OR t.id = blocked_id)
    AND (t.realtor_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
         OR current_setting('role', true) = 'service_role')
  )
);

CREATE INDEX IF NOT EXISTS idx_task_deps_blocker ON task_dependencies(blocker_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_blocked ON task_dependencies(blocked_id);

-- ============================================================
-- 7. Task Saved Filters (presets)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}', -- {status, priority, category, assignee, labels, date_range, search}
  is_default BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_saved_filters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_filters_tenant" ON task_saved_filters;
CREATE POLICY "task_filters_tenant" ON task_saved_filters FOR ALL USING (
  realtor_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  OR current_setting('role', true) = 'service_role'
);

CREATE INDEX IF NOT EXISTS idx_task_saved_filters_realtor ON task_saved_filters(realtor_id);

-- ============================================================
-- 8. Trigger: auto-update updated_at on task_templates
-- ============================================================

CREATE OR REPLACE FUNCTION update_task_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_templates_updated_at ON task_templates;
CREATE TRIGGER task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_task_templates_updated_at();
