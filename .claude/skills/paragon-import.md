# Paragon PDF Import Skill — Realtors360 CRM

Run this skill to validate the Paragon Listing Detail Report PDF import flow end-to-end.

## What It Does

A realtor exports a "Listing Detail Report" PDF from Paragon (BC MLS), drops it into the Create Listing flow, and the CRM:

1. Uploads the PDF to private Supabase Storage bucket `paragon-imports/<realtor_id>/<uuid>.pdf` (15 MB cap, RLS-scoped)
2. Sends it to Claude Sonnet via `document` content type with a forced `tool_use` schema, extracting address, price, beds, baths, sqft, MLS#, photos, etc.
3. Returns parsed fields to the review step where the realtor can edit before saving
4. Offers "Try parsing again" (re-parse at temperature 0.4) without re-uploading
5. Auto-deletes uploaded PDFs after 7 days via Vercel cron

## Endpoints

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/listings/parse-paragon` | POST | NextAuth session | Upload + parse new PDF |
| `/api/listings/reparse-paragon` | POST | NextAuth session | Re-parse existing storagePath |
| `/api/cron/cleanup-paragon-pdfs` | GET | `Bearer CRON_SECRET` | TTL-7d cleanup |

## How To Use

### From the UI

1. Navigate to `/listings/new`
2. Choose "Import from Paragon" tab
3. Drag-drop a Paragon Listing Detail Report PDF (≤15 MB)
4. Wait ~5–10s for Claude vision parse
5. Review the auto-populated fields. Confidence indicators flag low-certainty values.
6. Click "Try parsing again" if extraction looks wrong (re-runs at higher temperature)
7. Edit any field manually, then submit to create the listing

### From a script (auth required)

```bash
# Upload + parse (must include NextAuth session cookie)
curl -X POST http://localhost:3000/api/listings/parse-paragon \
  -H "Cookie: next-auth.session-token=<token>" \
  -F "file=@/path/to/Listing-Detail-Report.pdf"
# → 200 { parsed: {...}, storagePath: "<uuid>/<uuid>.pdf" }

# Re-parse without re-uploading
curl -X POST http://localhost:3000/api/listings/reparse-paragon \
  -H "Cookie: next-auth.session-token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"storagePath":"<uuid>/<uuid>.pdf"}'
```

### Cron (cleanup)

```bash
curl http://localhost:3000/api/cron/cleanup-paragon-pdfs \
  -H "Authorization: Bearer ${CRON_SECRET}"
# → 200 { scanned: N, deleted: N, ttl_days: 7 }
```

Schedule: `vercel.json` → daily 03:00 UTC.

## How To Test

### Auth gates

```bash
bash scripts/test-suite.sh   # Section 5B + 5C cover all 3 paragon routes
```

Expected: parse-paragon (POST 401 unauth), reparse-paragon (POST 401 unauth), cleanup-paragon-pdfs (GET 401 without Bearer).

### Happy path (manual)

1. Sign in as demo realtor
2. Run a `parse-paragon` POST with a real Paragon PDF
3. Verify response contains `parsed.address`, `parsed.price`, `parsed.bedrooms`, `parsed.bathrooms`, `parsed.sqft`
4. Verify `storagePath` starts with your realtor UUID
5. Run `reparse-paragon` with that storagePath — should return new `parsed` payload
6. Verify the file exists in Supabase dashboard → Storage → `paragon-imports`

### Error paths

| Input | Expected |
|-------|----------|
| Non-PDF file | 400 "Only PDF files are supported" |
| File >15 MB | 413 "File too large (max 15 MB)" |
| 0-byte file | 400 "File is empty" |
| Corrupted/non-Paragon PDF | 422 with friendly message + uploaded PDF cleaned up |
| `reparse` with foreign realtor's path | 403 Forbidden (path-prefix tenant check) |
| `reparse` with expired/missing path | 404 "may have expired (we keep them for 7 days)" |

### Cleanup cron

1. Manually upload a file to `paragon-imports/<your-realtor-id>/test.pdf`
2. Set its `created_at` to >7 days ago (Supabase SQL: `UPDATE storage.objects SET created_at = now() - interval '8 days' WHERE name = '<realtor-id>/test.pdf'`)
3. `curl /api/cron/cleanup-paragon-pdfs -H "Authorization: Bearer $CRON_SECRET"`
4. Verify response shows `deleted: 1` and the object is gone

## Files

| File | Purpose |
|------|---------|
| `src/app/api/listings/parse-paragon/route.ts` | Upload + Claude vision parse |
| `src/app/api/listings/reparse-paragon/route.ts` | Re-parse stored PDF (tenant-scoped) |
| `src/app/api/cron/cleanup-paragon-pdfs/route.ts` | 7-day TTL sweep |
| `src/lib/paragon/` | Claude prompt + tool schema |
| `src/components/listings/create/ListingCreator.tsx` | UI: upload, review, rescan |
| `supabase/migrations/151_paragon_imports_bucket.sql` | Private bucket + RLS |
| `vercel.json` | Cron schedule (03:00 UTC daily) |

## Tenant Scoping

- Storage path is `<realtor_id>/<uuid>.pdf` — RLS allows access only when `auth.uid() = (storage.foldername(name))[1]::uuid`
- API routes use `tenantClient(realtorId).raw.storage` (not raw admin client) — see HC-12 lint rule
- `reparse-paragon` validates `storagePath.startsWith("${realtorId}/")` before any storage read → returns 403 on mismatch

## Test Plan

See `docs/TEST_PLAN_Listing_Property_Details.md` Section 9 (PP-01 through PP-16).
