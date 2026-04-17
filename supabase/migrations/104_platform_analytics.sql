-- Platform Analytics + Admin Infrastructure

-- 1. Platform analytics (unified event table for business metrics + admin audit)
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_event_name ON platform_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_pa_user_id ON platform_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_created_at ON platform_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_pa_event_created ON platform_analytics(event_name, created_at);

ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access" ON platform_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service insert access" ON platform_analytics
  FOR INSERT WITH CHECK (true);

-- 2. User columns for admin visibility
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'organic';

CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- 3. Platform config (announcement banner, minimal flags)
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only" ON platform_config FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

INSERT INTO platform_config (key, value) VALUES
  ('announcement', 'null')
ON CONFLICT (key) DO NOTHING;

-- 4. Fix signup_events (table referenced in 5 code files but never created)
CREATE TABLE IF NOT EXISTS signup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_events_user ON signup_events(user_id);
ALTER TABLE signup_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON signup_events FOR ALL USING (true);
