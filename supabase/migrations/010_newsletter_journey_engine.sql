-- ============================================================
-- 010: AI Newsletter & Journey Engine
-- ============================================================

-- Newsletter template registry (React Email templates)
CREATE TABLE IF NOT EXISTS newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'new_listing_alert', 'market_update', 'just_sold',
    'open_house_invite', 'neighbourhood_guide', 'home_anniversary',
    'welcome', 'reengagement', 'referral_ask', 'custom'
  )),
  default_subject TEXT,
  preview_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual newsletter emails (drafts + sent)
CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  template_slug TEXT REFERENCES newsletter_templates(slug),
  journey_id UUID,  -- FK added after contact_journeys created
  journey_phase TEXT,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  plain_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'sending', 'sent', 'failed', 'skipped'
  )),
  send_mode TEXT NOT NULL DEFAULT 'review' CHECK (send_mode IN ('auto', 'review')),
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,
  ai_context JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newsletter events (opens, clicks, bounces, unsubscribes)
CREATE TABLE IF NOT EXISTS newsletter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'opened', 'clicked', 'bounced', 'unsubscribed', 'complained', 'delivered'
  )),
  link_url TEXT,
  link_type TEXT CHECK (link_type IN (
    'listing', 'showing', 'market_report', 'school_info',
    'neighbourhood', 'cma', 'contact_agent', 'unsubscribe', 'other'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact journey enrollment and phase tracking
CREATE TABLE IF NOT EXISTS contact_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  journey_type TEXT NOT NULL CHECK (journey_type IN ('buyer', 'seller')),
  current_phase TEXT NOT NULL DEFAULT 'lead' CHECK (current_phase IN (
    'lead', 'active', 'under_contract', 'past_client', 'dormant'
  )),
  phase_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_email_at TIMESTAMPTZ,
  emails_sent_in_phase INT NOT NULL DEFAULT 0,
  send_mode TEXT NOT NULL DEFAULT 'review' CHECK (send_mode IN ('auto', 'review')),
  is_paused BOOLEAN NOT NULL DEFAULT false,
  pause_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contact_id, journey_type)
);

-- Add FK from newsletters to contact_journeys
ALTER TABLE newsletters
  ADD CONSTRAINT fk_newsletters_journey
  FOREIGN KEY (journey_id) REFERENCES contact_journeys(id) ON DELETE SET NULL;

-- Add newsletter intelligence to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS newsletter_intelligence JSONB DEFAULT '{}'::jsonb;

-- Add newsletter_unsubscribed flag
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS newsletter_unsubscribed BOOLEAN NOT NULL DEFAULT false;

-- Add newsletter_id to communications for attribution
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS newsletter_id UUID REFERENCES newsletters(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletters_contact ON newsletters(contact_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_sent_at ON newsletters(sent_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_newsletter ON newsletter_events(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_contact ON newsletter_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_type ON newsletter_events(event_type);
CREATE INDEX IF NOT EXISTS idx_contact_journeys_contact ON contact_journeys(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_journeys_next_email ON contact_journeys(next_email_at)
  WHERE is_paused = false AND next_email_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletters_journey ON newsletters(journey_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_contact_type_phase ON newsletters(contact_id, email_type, journey_phase);
CREATE INDEX IF NOT EXISTS idx_newsletters_created ON newsletters(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_journeys_type ON contact_journeys(journey_type);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_created ON newsletter_events(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_unsubscribed ON contacts(newsletter_unsubscribed) WHERE newsletter_unsubscribed = true;

-- RLS policies (single-tenant, all authenticated users)
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage newsletter_templates"
  ON newsletter_templates FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage newsletters"
  ON newsletters FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage newsletter_events"
  ON newsletter_events FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage contact_journeys"
  ON contact_journeys FOR ALL USING (true);

-- Seed default newsletter templates
INSERT INTO newsletter_templates (slug, name, description, email_type, default_subject) VALUES
  ('new-listing-alert', 'New Listing Alert', 'Property matching buyer preferences', 'new_listing_alert', 'New Home Alert: {{area}}'),
  ('market-update', 'Market Update', 'Monthly neighbourhood market stats', 'market_update', 'Your {{area}} Market Update — {{month}}'),
  ('just-sold', 'Just Sold', 'Celebration of a completed sale', 'just_sold', 'Just Sold: {{address}}'),
  ('open-house-invite', 'Open House Invite', 'Upcoming open house details', 'open_house_invite', 'Open House This {{day}}: {{address}}'),
  ('neighbourhood-guide', 'Neighbourhood Guide', 'Area lifestyle and amenities', 'neighbourhood_guide', 'Discover {{area}} — Your Neighbourhood Guide'),
  ('home-anniversary', 'Home Anniversary', 'Annual homeownership milestone', 'home_anniversary', 'Happy Home Anniversary, {{first_name}}!'),
  ('welcome', 'Welcome Email', 'First email to new contacts', 'welcome', 'Welcome, {{first_name}}!'),
  ('reengagement', 'Re-engagement', 'Win back dormant contacts', 'reengagement', 'We Miss You, {{first_name}} — The Market Has Changed'),
  ('referral-ask', 'Referral Ask', 'Gentle referral request to past clients', 'referral_ask', 'Know Anyone Looking to Buy or Sell?')
ON CONFLICT (slug) DO NOTHING;
