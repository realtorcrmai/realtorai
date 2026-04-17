ALTER TABLE contact_journeys
  ADD COLUMN IF NOT EXISTS next_email_type_override text;

COMMENT ON COLUMN contact_journeys.next_email_type_override IS
  'Next-best-action override: if set, processJourneyQueue sends this email type next instead of the schedule default';
