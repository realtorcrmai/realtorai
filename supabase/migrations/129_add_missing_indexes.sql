-- Add missing indexes for commonly queried columns
-- These prevent full table scans on frequent filter/join queries

-- contact_segments: frequently filtered by realtor_id
CREATE INDEX IF NOT EXISTS idx_contact_segments_realtor_id
  ON contact_segments(realtor_id);

-- consent_records: frequently filtered by contact + realtor
CREATE INDEX IF NOT EXISTS idx_consent_records_contact_realtor
  ON consent_records(contact_id, realtor_id);

-- listings: frequently filtered by status and sorted by created_at
CREATE INDEX IF NOT EXISTS idx_listings_status_created
  ON listings(status, created_at DESC);

-- newsletter_events: frequently aggregated by newsletter + event type
CREATE INDEX IF NOT EXISTS idx_newsletter_events_newsletter_type
  ON newsletter_events(newsletter_id, event_type);

-- contacts: frequently sorted by created_at within a realtor
CREATE INDEX IF NOT EXISTS idx_contacts_realtor_created
  ON contacts(realtor_id, created_at DESC);
