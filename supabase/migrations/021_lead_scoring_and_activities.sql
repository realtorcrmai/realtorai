-- ============================================================
-- MIGRATION 021: Lead Scoring, Activities, Contact-Properties
-- Foundation tables for lead intelligence and activity tracking
-- ============================================================

-- ── 1. Lead scoring fields on contacts ──────────────────────
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS behavior_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_probability NUMERIC(4,3) DEFAULT 0.000;

CREATE INDEX IF NOT EXISTS idx_contacts_behavior_score ON contacts(behavior_score DESC) WHERE behavior_score > 0;
CREATE INDEX IF NOT EXISTS idx_contacts_conversion_prob ON contacts(conversion_probability DESC) WHERE conversion_probability > 0;

-- ── 2. Activities table (comprehensive interaction logging) ──
CREATE TABLE IF NOT EXISTS activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id      UUID REFERENCES listings(id) ON DELETE SET NULL,
  activity_type   TEXT NOT NULL CHECK (activity_type IN (
    'call', 'email', 'sms', 'whatsapp', 'meeting', 'note',
    'property_showing', 'open_house', 'website_visit',
    'email_open', 'link_click', 'form_submission',
    'document_signed', 'offer_submitted', 'offer_received'
  )),
  subject         TEXT,
  description     TEXT,
  outcome         TEXT CHECK (outcome IS NULL OR outcome IN (
    'completed', 'no_answer', 'voicemail', 'callback_requested',
    'interested', 'not_interested', 'follow_up_needed', 'cancelled'
  )),
  direction       TEXT CHECK (direction IS NULL OR direction IN ('inbound', 'outbound')),
  duration_minutes INTEGER,
  follow_up_date  TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_follow_up ON activities(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_listing ON activities(listing_id) WHERE listing_id IS NOT NULL;

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_all" ON activities FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── 3. Contact-Properties junction (property interest tracking) ──
CREATE TABLE IF NOT EXISTS contact_properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  interest_level  TEXT CHECK (interest_level IS NULL OR interest_level IN (
    'saved', 'viewed', 'showing_scheduled', 'showing_completed',
    'offer_made', 'offer_accepted', 'purchased', 'not_interested'
  )) DEFAULT 'viewed',
  notes           TEXT,
  viewed_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_properties_contact ON contact_properties(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_properties_listing ON contact_properties(listing_id);

ALTER TABLE contact_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_properties_all" ON contact_properties FOR ALL USING (true) WITH CHECK (true);

-- ── 4. Performance indexes for contact search ───────────────
CREATE INDEX IF NOT EXISTS idx_contacts_name_search ON contacts USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_contacts_type_stage ON contacts(type, stage_bar);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON contacts(lead_status) WHERE lead_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
