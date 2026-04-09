-- Migration: 075_newsletter_engine_v3_m2.sql
-- Purpose:   Newsletter Engine v3 — Milestone 2 seed data
--            Adds template registry entries and default rules for the 4 new
--            event types the newsletter service handles in M2.
--
-- Depends on: 074_newsletter_engine_v3.sql (which created the tables)
-- See: MASTER_NEWSLETTER_PLAN.md §5
--
-- Tables touched (no schema changes — seeds only):
--   - email_template_registry  (4 new rows)
--   - email_event_rules        (4 new default rules for the demo realtor)
--
-- All inserts are idempotent (ON CONFLICT DO NOTHING).

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Template registry entries
--    All M2 types reuse the BasicEmail component. M4 will introduce
--    Premium* variants and update template_component column accordingly.
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO email_template_registry
  (email_type, template_component, description, category, required_data_fields)
VALUES
  ('listing_price_drop', 'BasicEmail',
   'Sent to the seller when their listing price is adjusted',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id']),
  ('listing_sold', 'BasicEmail',
   'Sent to the seller when their listing transitions to sold',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id']),
  ('showing_confirmed', 'BasicEmail',
   'Sent to the seller when a showing on their listing is confirmed',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id']),
  ('contact_birthday', 'BasicEmail',
   'Sent to a contact on their birthday — short, sincere, no real estate pitch',
   'lifecycle',
   ARRAY['contact_id'])
ON CONFLICT (email_type) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Default rules for the demo realtor
--    Defaults to send_mode='auto' so the M1 canary pipeline still works
--    end-to-end without manual approval. Production realtors can switch to
--    'review' via the rules editor (M2-B follow-up).
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO email_event_rules
  (realtor_id, event_type, email_type, template_id, send_mode,
   frequency_cap_per_week, min_hours_between_sends, priority)
VALUES
  -- Price drop: seller-facing, capped at 1 per week per contact, 7-day spacing
  ('7de22757-dd3a-4a4f-a088-c422746e88d4',
   'listing_price_dropped', 'listing_price_drop', 'BasicEmail',
   'auto', 1, 168, 70),

  -- Listing sold: high priority, no cap (one-shot moment), 24h min
  ('7de22757-dd3a-4a4f-a088-c422746e88d4',
   'listing_sold', 'listing_sold', 'BasicEmail',
   'auto', 5, 24, 95),

  -- Showing confirmed: capped at 5/week (an active listing has many showings)
  ('7de22757-dd3a-4a4f-a088-c422746e88d4',
   'showing_confirmed', 'showing_confirmed', 'BasicEmail',
   'auto', 5, 4, 75),

  -- Birthday: once a year is the cap; 168h spacing is a no-op for this type
  ('7de22757-dd3a-4a4f-a088-c422746e88d4',
   'contact_birthday', 'contact_birthday', 'BasicEmail',
   'auto', 1, 168, 60)
ON CONFLICT (realtor_id, event_type, email_type) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- DOWN (manual rollback only)
-- ──────────────────────────────────────────────────────────────────────────
-- DELETE FROM email_event_rules
--   WHERE realtor_id = '7de22757-dd3a-4a4f-a088-c422746e88d4'
--     AND event_type IN ('listing_price_dropped', 'listing_sold', 'showing_confirmed', 'contact_birthday');
-- DELETE FROM email_template_registry
--   WHERE email_type IN ('listing_price_drop', 'listing_sold', 'showing_confirmed', 'contact_birthday');
