-- Conversion events: track email → action → close causality
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  newsletter_id uuid REFERENCES newsletters(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'showing_booked', 'cma_requested', 'valuation_requested',
    'offer_made', 'offer_accepted', 'deal_closed',
    'referral_given', 'listing_inquiry', 'seller_inquiry'
  )),
  email_type text,          -- which email type triggered this
  link_type text,           -- which link was clicked
  link_url text,
  metadata jsonb DEFAULT '{}',
  converted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversion_events_contact_id ON conversion_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_newsletter_id ON conversion_events(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_converted_at ON conversion_events(converted_at);

-- Enable RLS
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversion_events_auth" ON conversion_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE conversion_events IS 'Tracks email engagement → real-world conversion events for attribution analysis';
