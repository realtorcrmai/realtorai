-- Phase transition audit log
CREATE TABLE IF NOT EXISTS journey_phase_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  journey_id uuid REFERENCES contact_journeys(id) ON DELETE CASCADE,
  journey_type text NOT NULL,
  from_phase text,
  to_phase text NOT NULL,
  trigger text NOT NULL DEFAULT 'manual' CHECK (trigger IN (
    'manual', 'showing_booked', 'offer_accepted', 'deal_closed',
    'high_intent_click', 'dormant_detected', 'cron', 'admin'
  )),
  metadata jsonb DEFAULT '{}',
  transitioned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phase_transitions_contact_id ON journey_phase_transitions(contact_id);
CREATE INDEX IF NOT EXISTS idx_phase_transitions_journey_id ON journey_phase_transitions(journey_id);

ALTER TABLE journey_phase_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase_transitions_auth" ON journey_phase_transitions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE journey_phase_transitions IS 'Audit log of all journey phase changes for compliance and analytics';
