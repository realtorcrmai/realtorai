-- ============================================================
-- 012: Email Template Builder
-- Extends message_templates for visual email editor
-- ============================================================

ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS builder_json JSONB;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS html_preview TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS is_ai_template BOOLEAN DEFAULT false;

-- Seed the 6 AI email templates as entries
INSERT INTO message_templates (name, channel, category, is_ai_template, is_active, body, subject)
VALUES
  ('New Listing Alert', 'email', 'listing', true, true, 'AI-generated listing alert', 'New Homes in {{area}}'),
  ('Market Update', 'email', 'market', true, true, 'AI-generated market update', '{{area}} Market Update'),
  ('Just Sold', 'email', 'lifecycle', true, true, 'AI-generated just sold announcement', 'Just Sold: {{address}}'),
  ('Open House Invite', 'email', 'event', true, true, 'AI-generated open house invite', 'Open House: {{address}}'),
  ('Neighbourhood Guide', 'email', 'nurture', true, true, 'AI-generated neighbourhood guide', 'Discover {{area}}'),
  ('Home Anniversary', 'email', 'lifecycle', true, true, 'AI-generated home anniversary', 'Happy Home Anniversary, {{contact_first_name}}!')
ON CONFLICT DO NOTHING;
