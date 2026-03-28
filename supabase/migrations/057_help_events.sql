-- Help Center Analytics & Feedback
-- Tracks page views, searches, tour events, feedback, and resolution metrics

CREATE TABLE IF NOT EXISTS help_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,           -- 'page_view', 'search', 'tour_start', 'tour_complete', 'feedback', 'session_resolution', etc.
  user_id UUID,
  user_role TEXT,                     -- 'agent', 'tc', 'admin'
  slug TEXT,                          -- help feature slug
  data JSONB DEFAULT '{}',            -- event-specific payload (query, rating, tags, tour_id, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_events_type ON help_events(event_type);
CREATE INDEX IF NOT EXISTS idx_help_events_slug ON help_events(slug);
CREATE INDEX IF NOT EXISTS idx_help_events_created ON help_events(created_at);
CREATE INDEX IF NOT EXISTS idx_help_events_user ON help_events(user_id);

-- Community tips from verified users
CREATE TABLE IF NOT EXISTS help_community_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,                 -- help feature slug
  section TEXT,                       -- optional: which section of the article
  author_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_credential TEXT,             -- "10yr agent", "Team Lead"
  content TEXT NOT NULL,              -- the tip (max 280 chars)
  upvotes INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_tips_slug ON help_community_tips(slug);
CREATE INDEX IF NOT EXISTS idx_help_tips_status ON help_community_tips(status);

-- RLS
ALTER TABLE help_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can insert help events" ON help_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read help events" ON help_events FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE help_community_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read approved tips" ON help_community_tips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert tips" ON help_community_tips FOR INSERT WITH CHECK (auth.role() = 'authenticated');
