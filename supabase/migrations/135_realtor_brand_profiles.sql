-- Migration 135: realtor_brand_profiles
--
-- Dedicated branding table for newsletter/email identity.
-- Keeps email branding concerns separate from auth/user data.
-- Both the CRM and the Render newsletter agent read this table.
--
-- Fields map directly to BaseLayout.tsx RealtorBranding interface.
-- physicalAddress is required by CASL (Canadian anti-spam law).

CREATE TABLE IF NOT EXISTS realtor_brand_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id          text        NOT NULL UNIQUE,

  -- Identity shown in email footer
  display_name        text,                         -- e.g. "Jazz Grewal, PREC*" (overrides users.name)
  title               text,                         -- "REALTOR®", "PREC*", "Personal Real Estate Corporation"

  -- Photos
  headshot_url        text,                         -- shown in email footer agent card
  logo_url            text,                         -- shown in email header (team/personal logo)
  brokerage_logo_url  text,                         -- optional brokerage co-brand

  -- Contact (can differ from login email/phone)
  website_url         text,                         -- linked in footer
  phone               text,                         -- clickable tel: link in footer
  email               text,                         -- clickable mailto: link in footer

  -- CASL compliance — physically required in every commercial email footer
  physical_address    text,                         -- "123 Main St, Vancouver BC V6B 1A1"

  -- Email theme
  brand_color         text        DEFAULT '#4f35d2', -- primary accent color for email template

  -- Social links (shown as icons in footer)
  instagram_url       text,
  facebook_url        text,
  linkedin_url        text,
  twitter_url         text,

  -- Content context (used by AI to personalise copy)
  tagline             text,                         -- "Your trusted Vancouver REALTOR"
  service_areas       text[]      DEFAULT '{}',     -- ['Vancouver', 'Burnaby', 'Richmond']
  brokerage_name      text,                         -- denormalised for email rendering convenience

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE realtor_brand_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY realtor_brand_profiles_self ON realtor_brand_profiles
  FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rbp_realtor_id ON realtor_brand_profiles (realtor_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_realtor_brand_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rbp_updated_at ON realtor_brand_profiles;
CREATE TRIGGER trg_rbp_updated_at
  BEFORE UPDATE ON realtor_brand_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_realtor_brand_profile();
