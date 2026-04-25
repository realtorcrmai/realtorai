<!-- docs-audit: none --><!-- docs-audit-reviewed: 2026-04-25 -->
<!-- last-verified: 2026-04-25 -->
<!-- test-count: 68 -->
# Test Plan: Listing Property Details, Pagination, Soft Delete, Buyer FINTRAC & CMA

## Overview
Tests for the listing enhancement PR: property detail columns, server-side pagination, soft delete, buyer FINTRAC identity, receipt of funds form, CMA report generation, and workflow refactor.

---

## 1. Property Detail Columns (src/actions/listings.ts, src/components/listings/ListingWorkflow.tsx)

| ID | Scenario | Expected |
|----|----------|----------|
| PD-01 | Save bedrooms via Phase 1 editable panel | Value persists in DB, shows on reload |
| PD-02 | Save bathrooms as decimal (2.5) | Stored as NUMERIC(3,1), displays correctly |
| PD-03 | Save total_sqft as integer | Stored, displayed with locale formatting |
| PD-04 | Save flooring as comma-separated | Stored as TEXT[] array in DB |
| PD-05 | Save features as comma-separated | Stored as TEXT[] array in DB |
| PD-06 | Clear a numeric field (set to empty) | Stored as NULL, displays "—" |
| PD-07 | Edit multiple fields at once in a section | All values save correctly |
| PD-08 | Filter listings by bedrooms via SQL | Partial index used, correct results |

## 2. Server-Side Pagination (src/app/(dashboard)/listings/page.tsx)

| ID | Scenario | Expected |
|----|----------|----------|
| PG-01 | Page 1 loads with ≤50 listings | Shows first 50, "Page 1 of N" |
| PG-02 | Click "Next" button | Navigates to ?page=2, shows next batch |
| PG-03 | Click "Previous" on page 2 | Returns to page 1 |
| PG-04 | "Previous" disabled on page 1 | Button has disabled state |
| PG-05 | "Next" disabled on last page | Button has disabled state |
| PG-06 | Total count shows correct number | Matches actual listing count |
| PG-07 | API /api/listings?page=2&limit=10 | Returns correct range + pagination envelope |
| PG-08 | API response backwards-compatible | json.data contains array, json.pagination has metadata |

## 3. Soft Delete (src/actions/listings.ts)

| ID | Scenario | Expected |
|----|----------|----------|
| SD-01 | Call deleteListing(id) | Sets deleted_at, listing disappears from list |
| SD-02 | Deleted listing not in API response | /api/listings filters deleted_at IS NULL |
| SD-03 | Deleted listing not in page query | Listings page excludes soft-deleted |
| SD-04 | Call restoreListing(id) | Clears deleted_at, listing reappears |
| SD-05 | Delete already-deleted listing | No error (idempotent via IS NULL filter) |

## 4. Buyer FINTRAC Identity (src/actions/buyer-identities.ts, src/components/listings/BuyerIdentitiesPanel.tsx)

| ID | Scenario | Expected |
|----|----------|----------|
| BF-01 | Create buyer identity with all fields | Row created in buyer_identities table |
| BF-02 | Create buyer identity with only required field (full_name) | Succeeds, optional fields NULL |
| BF-03 | Create buyer identity with invalid email | Validation error returned |
| BF-04 | Delete buyer identity | Row removed from table |
| BF-05 | Panel shows on listing detail page | Visible in desktop sidebar and mobile collapsible |
| BF-06 | Panel shows "+ Add Buyer" button | Clicking opens inline form |
| BF-07 | Multiple buyer identities for same listing | All display in list |
| BF-08 | Buyer identity scoped by realtor_id | Other realtors cannot see/modify |

## 5. CMA Report (src/actions/cma-report.ts)

| ID | Scenario | Expected |
|----|----------|----------|
| CMA-01 | saveCMAReport with 3 comparables | form_submissions row created with form_key="cma_report" |
| CMA-02 | saveCMAReport updates listing cma_low/cma_high | Listing columns updated |
| CMA-03 | getCMAReport returns saved data | Returns form_data + status + updated_at |
| CMA-04 | getCMAReport for non-existent listing | Returns null |
| CMA-05 | generateCMAHTML produces valid HTML | Contains table, price formatting, address |
| CMA-06 | generateCMAHTML with 0 comparables | Renders empty table, no crash |
| CMA-07 | saveCMAReport upserts (idempotent) | Second call updates, doesn't create duplicate |

## 6. Receipt of Funds Form (src/lib/forms/definitions.ts, src/lib/forms/constants.ts)

| ID | Scenario | Expected |
|----|----------|----------|
| RF-01 | receipt_of_funds in BC_FORMS constant | Key exists, icon "💵", required: false |
| RF-02 | Form definition has 4 sections | Transaction Details, Payor Info, Deposit Account, Verification |
| RF-03 | "select" field type renders correctly | Options available in form UI |
| RF-04 | Large cash threshold field defaults to "No" | Field present with correct default |
| RF-05 | Form can be saved to form_submissions | form_key="receipt_of_funds" stored |

## 7. Workflow Refactor (src/components/listings/workflow/)

| ID | Scenario | Expected |
|----|----------|----------|
| WR-01 | ListingWorkflow renders with all phases | Same visual output as before refactor |
| WR-02 | Phase expansion/collapse works | Toggle via click, keyboard accessible |
| WR-03 | Status derivation matches pre-refactor | Same statuses for identical data |
| WR-04 | SkipStepButton still functional | Skipping advances phase correctly |
| WR-05 | Editable fields in completed phases work | Save triggers updateListing/updateContact |
| WR-06 | TypeScript compiles clean | npx tsc --noEmit passes |

## 8. MLS Import from realtor.ca (src/actions/mls-scraper.ts)

| ID | Scenario | Expected |
|----|----------|----------|
| MLS-01 | scrapeRealtorCa with valid realtor.ca URL | Returns parsed listing payload (address, price, beds, baths, sqft, photos) |
| MLS-02 | scrapeRealtorCa with non-realtor.ca URL | Returns `{ error }` — rejects SSRF-class hosts |
| MLS-03 | scrapeRealtorCa called by unauthenticated user | Returns `{ error: "Unauthorized" }` |
| MLS-04 | scrapeRealtorCa with malformed/404 URL | Returns `{ error }`, no unhandled exception |
| MLS-05 | Imported listing fields auto-populate Create Listing form | Address, price, photos visible without manual entry |

## 9. Paragon PDF Import (src/app/api/listings/parse-paragon, reparse-paragon, cron/cleanup-paragon-pdfs)

| ID | Scenario | Expected |
|----|----------|----------|
| PP-01 | POST /api/listings/parse-paragon with valid Paragon Listing Detail Report PDF | Returns `{ parsed, storagePath }` — fields auto-populate review step |
| PP-02 | POST /api/listings/parse-paragon unauthenticated | Returns 401 Unauthorized |
| PP-03 | POST /api/listings/parse-paragon with non-PDF file | Returns 400 "Only PDF files are supported" |
| PP-04 | POST /api/listings/parse-paragon with file >15 MB | Returns 413 "File too large (max 15 MB)" |
| PP-05 | POST /api/listings/parse-paragon with 0-byte file | Returns 400 "File is empty" |
| PP-06 | POST /api/listings/parse-paragon with corrupted/non-Paragon PDF | Returns 422 with friendly message; uploaded PDF cleaned up |
| PP-07 | Storage path follows `<realtor_id>/<uuid>.pdf` convention | Object listed under correct realtor folder |
| PP-08 | POST /api/listings/reparse-paragon with valid storagePath | Returns `{ parsed, storagePath }` with re-parsed fields (temperature 0.4) |
| PP-09 | POST /api/listings/reparse-paragon with foreign realtor's path | Returns 403 Forbidden — tenant scope enforced |
| PP-10 | POST /api/listings/reparse-paragon with expired/missing path | Returns 404 with "may have expired (we keep them for 7 days)" message |
| PP-11 | POST /api/listings/reparse-paragon unauthenticated | Returns 401 Unauthorized |
| PP-12 | GET /api/cron/cleanup-paragon-pdfs without Bearer CRON_SECRET | Returns 401 Unauthorized |
| PP-13 | GET /api/cron/cleanup-paragon-pdfs with valid Bearer token | Returns `{ scanned, deleted, ttl_days: 7 }` |
| PP-14 | Cron deletes objects older than 7 days, keeps fresh ones | `deleted` count matches expired objects, fresh remain in bucket |
| PP-15 | Realtor uploads PDF, sees parsed fields, clicks "Try parsing again" | Re-parse triggered; new fields shown without re-uploading |
| PP-16 | Realtor's session cannot read another realtor's paragon-imports object via direct path | RLS denies; storage returns no row |
