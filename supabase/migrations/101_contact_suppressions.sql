-- 101_contact_suppressions.sql
-- Global suppression list for email sends.
-- Contacts in this table are blocked from receiving ANY email.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.contact_suppressions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'manual',
  suppressed_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  CONSTRAINT uq_contact_suppressions_contact UNIQUE (contact_id)
);

-- RLS
ALTER TABLE public.contact_suppressions ENABLE ROW LEVEL SECURITY;

-- Realtor-scoped access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_suppressions'
      AND policyname = 'contact_suppressions_realtor_scope'
  ) THEN
    CREATE POLICY contact_suppressions_realtor_scope
      ON public.contact_suppressions
      FOR ALL
      USING (realtor_id = auth.uid());
  END IF;
END
$$;

-- Service role bypass (for the newsletter service which uses service_role key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_suppressions'
      AND policyname = 'contact_suppressions_service_role'
  ) THEN
    CREATE POLICY contact_suppressions_service_role
      ON public.contact_suppressions
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_suppressions_realtor
  ON public.contact_suppressions (realtor_id);

CREATE INDEX IF NOT EXISTS idx_contact_suppressions_contact
  ON public.contact_suppressions (contact_id);

COMMENT ON TABLE public.contact_suppressions IS 'Global suppression list. Contacts here are blocked from all email sends. Auto-populated after 3 bounces.';
