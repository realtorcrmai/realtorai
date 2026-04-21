<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- last-verified: 2026-04-20 -->
<!-- test-count: 47 -->
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
