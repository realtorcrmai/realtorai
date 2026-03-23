-- ============================================================
-- 051: CASL/TCPA Compliance — SMS & WhatsApp Opt-Out
-- ============================================================

-- Add SMS and WhatsApp opt-out fields to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS sms_opted_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_opt_out_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_date TIMESTAMPTZ;

-- Add CASL consent and opt-out tracking to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS casl_consent_given BOOLEAN,
  ADD COLUMN IF NOT EXISTS casl_consent_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS casl_opt_out_date TIMESTAMPTZ;

-- Create activity_log table if it doesn't exist (for audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'sms_opted_out',
    'whatsapp_opted_out',
    'newsletter_unsubscribed',
    'casl_consent_given',
    'casl_consent_withdrawn',
    'contact_created',
    'contact_updated',
    'showing_requested',
    'showing_confirmed',
    'showing_denied',
    'other'
  )),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient activity lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_contact ON activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- Enable RLS on activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON activity_log FOR ALL USING (auth.role() = 'authenticated');
