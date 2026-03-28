-- 055_website_integrations.sql
-- Website Integration Platform: API keys, domain whitelist, analytics events, sessions

-- API key and integration config on realtor_sites
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS api_key text UNIQUE;
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS allowed_domains text[] DEFAULT '{}';
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS chatbot_config jsonb DEFAULT '{}';
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS integrations_enabled jsonb
  DEFAULT '{"chat":true,"newsletter":true,"analytics":true,"listings":true,"recording":false}';

-- Analytics events from website visitors
CREATE TABLE IF NOT EXISTS site_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES realtor_sites(id),
  session_id text NOT NULL,
  event_type text NOT NULL,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sae_site ON site_analytics_events(site_id);
CREATE INDEX IF NOT EXISTS idx_sae_created ON site_analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sae_session ON site_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sae_type ON site_analytics_events(event_type);

-- Visitor sessions
CREATE TABLE IF NOT EXISTS site_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES realtor_sites(id),
  session_id text UNIQUE NOT NULL,
  contact_id uuid REFERENCES contacts(id),
  device_type text,
  referrer text,
  utm_source text,
  pages_visited text[] DEFAULT '{}',
  duration_seconds int,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  is_converted boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'
);

-- Session recordings (rrweb chunks)
CREATE TABLE IF NOT EXISTS site_session_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  chunk_index int NOT NULL,
  events jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ssr_session ON site_session_recordings(session_id);

-- RLS policies (allow all for authenticated — single-tenant)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'site_analytics_events_all' AND tablename = 'site_analytics_events') THEN
    CREATE POLICY site_analytics_events_all ON site_analytics_events FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'site_sessions_all' AND tablename = 'site_sessions') THEN
    CREATE POLICY site_sessions_all ON site_sessions FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'site_session_recordings_all' AND tablename = 'site_session_recordings') THEN
    CREATE POLICY site_session_recordings_all ON site_session_recordings FOR ALL USING (true);
  END IF;
END $$;
