-- Add 'phone' to pref_channel CHECK constraint (email was added in 053, phone was missing)
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_pref_channel_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_pref_channel_check
  CHECK (pref_channel IN ('sms', 'whatsapp', 'email', 'phone'));
