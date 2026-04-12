-- Smart Lists: saved dynamic filters for contacts, listings, showings
-- Used as the agent's daily workspace (Follow Up Boss "Smart Lists" pattern)

CREATE TABLE IF NOT EXISTS smart_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'listings', 'showings')),
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  match_mode TEXT NOT NULL DEFAULT 'all' CHECK (match_mode IN ('all', 'any')),
  sort_field TEXT NOT NULL DEFAULT 'created_at',
  sort_order TEXT NOT NULL DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  notify_threshold INTEGER DEFAULT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE smart_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smart_lists_all" ON smart_lists FOR ALL USING (true);

CREATE INDEX idx_smart_lists_realtor ON smart_lists(realtor_id);
CREATE INDEX idx_smart_lists_pinned ON smart_lists(realtor_id, is_pinned) WHERE is_pinned = true;
