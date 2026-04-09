-- 083_legacy_email_template_registry.sql
--
-- Unify the email_template_registry with the legacy email_type naming
-- used by 117 pre-existing newsletters.
--
-- Background (from 2026-04-09 QA audit):
-- The newsletter engine v3 introduced a new template registry with 5
-- email_types: contact_birthday, listing_price_drop, listing_sold,
-- saved_search_match, showing_confirmed.
--
-- But 117 legacy newsletters from before v3 use 9 DIFFERENT email_type
-- values: home_anniversary, just_sold, listing_alert, market_update,
-- neighbourhood_guide, new_listing_alert, open_house_invite,
-- premium_listing_showcase, welcome.
--
-- These legacy types have zero overlap with the v3 registry, so every
-- legacy newsletter currently fails registry lookup. Any UI or analytics
-- that joins newsletters.email_type → email_template_registry.email_type
-- shows "unknown template" for 117 rows.
--
-- Fix: add the 9 legacy types to the registry, mapping each to the
-- corresponding React Email component that already exists in
-- src/emails/. Going forward, BOTH legacy and v3 types resolve cleanly.
--
-- Idempotent: ON CONFLICT (email_type) DO NOTHING, so re-running is safe.
--
-- Future cleanup: consider migrating the 117 newsletters to use the v3
-- naming (listing_sold instead of just_sold, etc.) in a separate data
-- migration. That's higher-risk because it touches real rows.

INSERT INTO email_template_registry
  (email_type, template_component, description, category, required_data_fields)
VALUES
  ('new_listing_alert', 'NewListingAlert',
   'Sent to a buyer when a new active listing matches their saved search (legacy v1 naming)',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id']),

  ('listing_alert', 'NewListingAlert',
   'Alias for new_listing_alert — used by some legacy data (renders the same component)',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id']),

  ('just_sold', 'JustSold',
   'Sent to past clients + neighbours when a listing transitions to sold (legacy v1 naming)',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id']),

  ('market_update', 'MarketUpdate',
   'Periodic market statistics email for a neighbourhood or city (monthly/quarterly)',
   'scheduled',
   ARRAY['contact_id', 'area']),

  ('neighbourhood_guide', 'NeighbourhoodGuide',
   'Onboarding guide for new leads with neighbourhood info (schools, amenities, lifestyle)',
   'lifecycle',
   ARRAY['contact_id', 'area']),

  ('open_house_invite', 'OpenHouseInvite',
   'Invitation to an open house event at a specific listing',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id', 'event_time']),

  ('home_anniversary', 'HomeAnniversary',
   'Annual anniversary email to past clients on the date of closing',
   'lifecycle',
   ARRAY['contact_id']),

  ('premium_listing_showcase', 'PremiumListingShowcase',
   'High-design luxury listing showcase email (legacy, recently re-added)',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id']),

  ('welcome', 'BaseLayout',
   'Welcome email for brand-new contacts. Renders a minimal BaseLayout with realtor intro copy.',
   'lifecycle',
   ARRAY['contact_id'])
ON CONFLICT (email_type) DO NOTHING;
