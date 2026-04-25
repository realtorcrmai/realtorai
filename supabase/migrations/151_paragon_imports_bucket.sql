-- Migration 151: Paragon PDF imports bucket
-- Stores uploaded Paragon Listing Detail Reports temporarily (max 7 days, enforced by cron).
-- Used by the Paragon-PDF listing import flow (parse → review → create listing).

-- ── Bucket ───────────────────────────────────────────────────────────
-- Private bucket; service role accesses via admin client.
-- 15 MB limit matches the API route guard.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'paragon-imports',
  'paragon-imports',
  false,
  15728640,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types= EXCLUDED.allowed_mime_types;

-- ── RLS — defense in depth ───────────────────────────────────────────
-- Object naming convention: <realtor_id>/<uuid>.pdf
-- Policy isolates per realtor for any future authenticated client access.
-- (Server uses admin client which bypasses RLS — these policies guard accidental
--  exposure if a client-side upload path is ever added.)
DROP POLICY IF EXISTS "paragon_imports_realtor_select" ON storage.objects;
DROP POLICY IF EXISTS "paragon_imports_realtor_insert" ON storage.objects;
DROP POLICY IF EXISTS "paragon_imports_realtor_delete" ON storage.objects;

CREATE POLICY "paragon_imports_realtor_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'paragon-imports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "paragon_imports_realtor_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'paragon-imports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "paragon_imports_realtor_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'paragon-imports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Comment for future operators
COMMENT ON TABLE storage.objects IS
  'Multi-feature storage. paragon-imports/<realtor_id>/<uuid>.pdf is auto-deleted after 7 days by /api/cron/cleanup-paragon-pdfs.';
