-- 053: Allow 'email' as preferred channel for contacts
-- Previously only 'sms' and 'whatsapp' were valid.

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_pref_channel_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_pref_channel_check
  CHECK (pref_channel IN ('sms', 'whatsapp', 'email'));
