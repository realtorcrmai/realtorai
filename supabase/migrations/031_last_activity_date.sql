-- 015: Add last_activity_date to contacts for fast inactivity detection
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ;

-- Backfill from latest communication
UPDATE contacts c SET last_activity_date = sub.latest
FROM (
  SELECT contact_id, MAX(created_at) AS latest
  FROM communications
  GROUP BY contact_id
) sub
WHERE c.id = sub.contact_id AND c.last_activity_date IS NULL;

-- For contacts with no communications, use created_at
UPDATE contacts SET last_activity_date = created_at WHERE last_activity_date IS NULL;

-- Index for inactivity queries
CREATE INDEX IF NOT EXISTS idx_contacts_last_activity ON contacts(last_activity_date) WHERE last_activity_date IS NOT NULL;
