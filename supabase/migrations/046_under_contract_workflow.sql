-- ============================================================
-- Migration 022: Add Under Contract workflow
-- ============================================================
-- Covers the full closing countdown from offer acceptance to completion:
-- subject removal, inspection, financing, conveyancing, final walkthrough, closing

INSERT INTO workflows (slug, name, description, trigger_type, trigger_config, contact_type)
VALUES (
  'under_contract',
  'Under Contract — Closing Countdown',
  'Subject removal, inspection, financing & closing checklist from offer acceptance to completion',
  'listing_status_change',
  '{"listing_status": "pending"}',
  'any'
)
ON CONFLICT (slug) DO NOTHING;
