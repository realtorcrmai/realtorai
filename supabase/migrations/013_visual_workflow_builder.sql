-- ============================================================
-- 013: Visual Workflow Builder
-- Adds flow_json for React Flow visual editor
-- ============================================================

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS flow_json JSONB;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Mark built-in workflows as defaults
UPDATE workflows SET is_default = true WHERE slug IN (
  'speed_to_contact', 'buyer_nurture', 'post_close_buyer',
  'post_close_seller', 'lead_reengagement', 'open_house_followup',
  'referral_partner', 'buyer_email_journey', 'seller_email_journey'
);
