-- ============================================================
-- TABLE: tasks (daily task management for realtors)
-- ============================================================
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category      TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'follow_up', 'showing', 'document', 'listing',
    'marketing', 'inspection', 'closing', 'general'
  )),
  due_date      DATE,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  listing_id    UUID REFERENCES listings(id) ON DELETE SET NULL,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX idx_tasks_listing_id ON tasks(listing_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON tasks FOR ALL USING (auth.role() = 'authenticated');

-- Grant service_role access (for API routes using service role key)
CREATE POLICY "Service role full access" ON tasks FOR ALL USING (auth.role() = 'service_role');
