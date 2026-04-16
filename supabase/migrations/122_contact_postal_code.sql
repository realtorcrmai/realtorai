-- 122_contact_postal_code.sql
-- Add nullable postal_code column to contacts for Canadian (V5K 0A1) / US (12345 / 12345-6789)
-- postal codes on the contact record itself. Until now postal code lived only on
-- contact_portfolio (per-property), so the main contact form had no place to store it.
--
-- Additive, backwards-compatible: all existing rows default to NULL.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Lightweight CHECK: if provided, must look like a Canadian or US postal code.
-- Canadian pattern: letter-digit-letter space letter-digit-letter, e.g. "V5K 0A1"
-- US pattern: 5 digits, optionally followed by -4, e.g. "12345" or "12345-6789"
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_postal_code_format;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_postal_code_format CHECK (
    postal_code IS NULL
    OR postal_code ~ '^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$'
    OR postal_code ~ '^\d{5}(-\d{4})?$'
  );

COMMENT ON COLUMN public.contacts.postal_code IS
  'Optional postal code. Canadian format "V5K 0A1" (with space) or US format "12345" / "12345-6789". See src/lib/format.ts formatPostalCode().';
