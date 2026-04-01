---
title: " Listing Workflow (8-Phase Pipeline)"
slug: "listing-workflow"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
related_routes: ["/listings"]
changelog: []
---

# Listing Workflow (8-Phase Pipeline)

## Problem Statement

BC realtors must shepherd a property listing through a legally mandated sequence of steps — FINTRAC identity verification, BCREA form completion, DocuSign routing, and MLS submission — before a listing can go live. This process involves at least 12 standard forms, data from 4 external sources (BC Geocoder, ParcelMap BC, LTSA, BC Assessment), AI-generated marketing content, and coordination across seller, agent, and regulatory systems. Without automation, agents manage this in disconnected tools: spreadsheets for tracking, email for forms, manual copy-paste into MLS. Errors cause compliance gaps and delayed listings.

Realtors360 collapses this into a single 9-step pipeline (8 active phases + post-listing) with status derived automatically from real data — form completions, MLS number presence, list price entry — rather than manual checkbox-ticking.

---

## User Roles

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full CRM access | Creates listings, advances phases, generates forms, inputs MLS data |
| **Transaction Coordinator** | Full CRM access | Manages workflow steps, uploads documents, tracks form status |
| **Seller (Contact)** | No CRM access | Receives SMS/WhatsApp confirmations, signs via DocuSign |
| **Voice Agent (Realtor Mode)** | API bridge to CRM | Looks up listings, updates status/price, adds notes via voice |

---

## Existing System Context

- **Route:** `/listings` redirects to `/listings/[id]` for the most recent active listing
- **Detail page:** `/listings/[id]` — `force-dynamic`, queries listings joined with `contacts!listings_seller_id_fkey`
- **Layout:** `src/app/(dashboard)/listings/layout.tsx` — shared sidebar + listing selector
- **Workflow UI component:** `src/components/listings/ListingWorkflow.tsx`
- **Step logic:** `src/components/listings/listingWorkflowUtils.ts` — `WORKFLOW_STEPS`, `deriveStepStatuses()`, `formatPrice()`
- **Server actions:** `src/actions/listings.ts` (CRUD, status, override), `src/actions/workflow.ts` (step data, mark complete, cascade reset)
- **Forms panel:** `src/components/listings/BCFormsPanel.tsx` — 8 BCREA forms rendered via Python server at `REALTORS360_URL`
- **Form readiness:** `src/components/listings/FormReadinessPanel.tsx`
- **Status override:** `src/components/listings/ManualStatusOverride.tsx`
- **RAG ingestion:** every `createListing` and `updateListing` call triggers `triggerIngest("listings", id)` for voice agent search

---

## Features

### Phase 1: Seller Intake

**Step ID:** `seller-intake`

Substeps: verify seller identity, confirm property address, discuss pricing expectations, sign DORTS.

`saveStepData` with `stepId = "seller-intake"` writes directly to two tables:
- `contacts`: `name`, `phone`, `email` (seller identity fields)
- `listings`: `address`, `lockbox_code`, `list_price`, `notes`

Extra fields (`seller_type`, etc.) that do not map to real columns are stored in `form_submissions` with `form_key = "step-seller-intake"`, `status = "draft"`.

The `deriveStepStatuses()` function treats `seller-intake` as always `completed` — once a listing exists (has a seller), intake is assumed started.

Required documents tracked: `FINTRAC`, `DORTS`, `PDS` (via `listing_documents.doc_type`).

**Status signal:** Always `completed` once listing exists.

---

### Phase 2: Data Enrichment

**Step ID:** `data-enrichment`

Substeps: property assessment data, tax records, title search, strata docs (if applicable).

Data fetched from:
- BC Geocoder — geographic coordinates from civic address
- ParcelMap BC — parcel identifier, legal description
- LTSA (manual upload) — title ownership records
- BC Assessment (manual upload) — assessed value

Step data stored in `form_submissions` with `form_key = "step-data-enrichment"`, `form_data` as JSONB.

**Status signal:** `completed` when `listings.list_price IS NOT NULL`. Transitions to `in-progress` automatically once seller intake is done.

Cascade: if step data is re-saved, all later steps (`cma`, `pricing-review`, `form-generation`, `e-signature`, `mls-prep`, `mls-submission`, `post-listing`) are reset via `cascadeResetLaterSteps()` — their `form_submissions` rows deleted and associated `listing_documents` with matching step prefixes removed from Supabase Storage.

---

### Phase 3: CMA Analysis

**Step ID:** `cma`

Substeps: pull comparable sales, analyze market trends, generate CMA report, present to seller.

Comparable market analysis fields stored in `form_submissions` with `form_key = "step-cma"`.

**Status signal:** `completed` when `listings.list_price IS NOT NULL` (price lock indicates CMA was accepted and pricing confirmed).

---

### Phase 4: Pricing & Review

**Step ID:** `pricing-review`

Substeps: confirm list price, set marketing strategy, review listing details, approve photos/descriptions.

Fields stored in `form_submissions` with `form_key = "step-pricing-review"`. List price is written to `listings.list_price` (NUMERIC 12,2).

`markStepComplete` for `pricing-review`: if `list_price` is null, sets it to `0` as a placeholder to unblock subsequent steps.

`overrideListingStatus` also syncs `contacts.stage_bar` → `under_contract` when status changes to `conditional`, and `closed` when status changes to `sold`.

**Status signal:** `completed` when `listings.list_price IS NOT NULL`.

---

### Phase 5: Form Generation

**Step ID:** `form-generation`

Substeps: fill FINTRAC, fill DORTS, fill PDS, fill MLC.

8 BCREA forms rendered by the Python Realtors360 server (`REALTORS360_URL`, default `http://127.0.0.1:8767`):

| Key | Label | Purpose |
|-----|-------|---------|
| `dorts` | DORTS | Disclosure of Representation in Trading Services |
| `mlc` | MLC | Multiple Listing Contract |
| `pds` | PDS | Property Disclosure Statement |
| `fintrac` | FINTRAC | Anti-money laundering identity verification |
| `privacy` | Privacy | Privacy notice acknowledgement |
| `c3` | C3 | Commission agreement |
| `drup` | DRUP | Disclosure of Remuneration to Unrepresented Party |
| `mls` | MLS | MLS data input form |

Each form is requested via `POST /api/forms/generate` → Python server `POST /api/form/html`. The server accepts a CDM payload (listing address, price, MLS number, seller name/phone/email, agent name, brokerage) and returns pre-filled HTML rendered in a new browser tab.

Form completion tracked in `form_submissions` (one row per form key, `status = "draft" | "completed"`).

`deriveStepStatuses` checks `requiredFormKeys = ["fintrac", "dorts", "pds", "mlc"]` — all four must be `completed` (or all three doc types `FINTRAC`, `DORTS`, `PDS` present in `listing_documents`) for this phase to show `completed`.

`markStepComplete` for `form-generation` or `e-signature`: upserts all four required forms with `status = "completed"` and `form_data = { _skipped: true }`.

**Status signal:** `completed` when all 4 required `form_submissions` rows have `status = "completed"`, OR when `listing_documents` contains FINTRAC + DORTS + PDS.

---

### Phase 6: E-Signature

**Step ID:** `e-signature`

Substeps: send docs to seller, seller signs, agent counter-signs, archive signed copies.

DocuSign routing UI exists (`listings.envelopes` JSONB field referenced in CLAUDE.md). API integration status is partial.

Signed document uploads tracked in `listing_documents` with appropriate `doc_type`.

**Status signal:** `completed` once all required forms are completed (same condition as Phase 5 — both phases share the form-completion gate).

---

### Phase 7: MLS Preparation

**Step ID:** `mls-prep`

Substeps: professional photos, property description, feature sheet, virtual tour.

Claude AI (Anthropic) generates:
- `prompts.mls_public` — MLS public remarks (max 500 chars), via `POST /api/mls-remarks`
- `prompts.mls_realtor` — MLS REALTOR-only remarks (max 500 chars)
- `prompts.ig_caption` — Instagram caption with hashtags
- `prompts.video_prompt` — Kling AI video generation prompt
- `prompts.image_prompt` — Kling AI image generation prompt

All stored in the `prompts` table (one row per listing, `UNIQUE(listing_id)`).

Hero images stored in Supabase Storage bucket `listing-documents`, paths in `listings.hero_image_url` and `listings.hero_image_storage_path`.

Media assets (video/image) tracked in `media_assets`: `kling_task_id`, `status` (pending / processing / completed / failed), `output_url`.

`NeighborhoodButton` fetches neighbourhood comparables from `GET /api/neighborhood`.

**Status signal:** `completed` when `listings.mls_number IS NOT NULL`. Transitions to `in-progress` once forms are complete.

---

### Phase 8: MLS Submission

**Step ID:** `mls-submission`

Substeps: enter MLS data, verify listing details, submit to board, confirm live on MLS.

MLS number entered manually (no Paragon API integration). Stored in `listings.mls_number` (TEXT).

`DDFSyncButton` component provides CREA DDF import functionality.

`markStepComplete` for `mls-prep` or `mls-submission`: if `mls_number` is null, sets it to `"PENDING"` as a placeholder.

`MLSIntegrationButtons` component at `src/components/listings/MLSIntegrationButtons.tsx` provides submission workflow actions.

**Status signal:** `completed` when `listings.mls_number IS NOT NULL`.

---

### Phase 9 (Post-Listing)

**Step ID:** `post-listing`

Substeps: schedule showings, review offers, negotiate terms, close transaction.

Showings managed via `appointments` table. Status lifecycle: `requested → confirmed → denied → cancelled`.

Offers tracked in `offers` table (added in migration 045). Under-contract workflow in migration 046.

Closing fields on `listings`: `sold_price` (NUMERIC), `buyer_id` (UUID → contacts), `closing_date` (DATE), `commission_rate` (NUMERIC, default 2.5%), `commission_amount` (NUMERIC — auto-calculated as `sold_price * commission_rate / 100` in `updateListing` server action).

`ConveyancingPackButton` generates a conveyancing document pack for the lawyer/notary.

**Status signal:** `in-progress` when listing status is `pending` or `mls_number` is set. `completed` (all steps marked done) when listing status is `sold`.

---

## Step Status Derivation

`deriveStepStatuses(listing, documents, formStatuses)` in `listingWorkflowUtils.ts` computes the status of all 9 steps as a pure function from three inputs:

| Input | Source |
|-------|--------|
| `listing.list_price` | `listings.list_price` |
| `listing.mls_number` | `listings.mls_number` |
| `listing.status` | `listings.status` |
| `documents` | `listing_documents` rows for the listing |
| `formStatuses` | `form_submissions` rows keyed by `form_key` |

Special case: if `listing.status === "sold"`, all 9 steps are forced to `completed`.

Sequential gate: a step cannot be `completed` or `in-progress` if the preceding step is `pending` — the function enforces this ordering in a second pass.

---

## Cascade Reset

When `saveStepData(listingId, stepId, data)` is called, `cascadeResetLaterSteps` deletes all downstream state:

1. Deletes `form_submissions` rows where `form_key IN (step-{laterStep}, ...)` for all steps after `stepId`
2. Deletes `listing_documents` rows where `file_name` starts with `step-{laterStep}_` prefix
3. Removes corresponding files from Supabase Storage bucket `listing-documents`

Step order for cascade: `seller-intake → data-enrichment → cma → pricing-review → form-generation → e-signature → mls-prep → mls-submission → post-listing`

---

## End-to-End Scenarios

### Scenario 1: Create Listing and Complete Phase 1 (Seller Intake)

1. Agent navigates to `/listings` (redirects to most recent, or shows empty state)
2. Agent clicks "New Listing" in `ListingSidebar` — `ListingForm` opens
3. Agent fills: `address` (required, TEXT), `seller_id` (UUID — must select existing contact), `lockbox_code` (required, TEXT), optional `list_price`, `mls_number`, `showing_window_start`, `showing_window_end`, `notes`
4. `createListing(formData)` server action validates via `listingSchema` (Zod), inserts into `listings`, calls `triggerIngest("listings", data.id)` for RAG
5. Page redirects to `/listings/[newId]`
6. Agent opens Phase 1 ("Seller Intake") in the workflow stepper
7. Fills `full_name`, `phone`, `email` → saves → `saveStepData("seller-intake", data)` writes to `contacts` + `listings` tables directly
8. Uploads signed DORTS PDF → stored in `listing_documents` with `doc_type = "DORTS"`
9. Phase 1 shows `completed` (always true once listing exists)

**Key fields written:** `contacts.name`, `contacts.phone`, `contacts.email`, `listings.address`, `listings.lockbox_code`, `listings.list_price`, `listings.notes`

---

### Scenario 2: Run Data Enrichment (Phase 2) — BC Geocoder + ParcelMap

1. Agent opens Phase 2 ("Data Enrichment") — shows `in-progress`
2. Agent enters address in BC Geocoder panel → API call to `https://geocoder.api.gov.bc.ca/` → returns `lat`, `lng`, `fullAddress`, `localityName`
3. Agent clicks "Fetch ParcelMap" → API call to ParcelMap BC → returns `pid`, `legalDescription`, `planNumber`
4. LTSA title search and BC Assessment data entered manually (no API)
5. Agent confirms list price → `saveStepData("data-enrichment", data)` upserts `form_submissions` with `form_key = "step-data-enrichment"`, `form_data` containing geocoder + parcel JSON
6. `listings.list_price` updated if entered here
7. Phase 2 moves to `completed`; Phases 3 and 4 unlock to `in-progress`

**Key fields:** `form_submissions.form_data` (JSONB: `{ geo: {...}, parcel: {...}, ltsa: {...}, assessment: {...} }`), `listings.list_price`

---

### Scenario 3: Generate BCREA Forms (Phase 5)

1. Agent opens Phase 5 ("Form Generation") — shows `in-progress` (price is set, forms not yet completed)
2. `BCFormsPanel` renders 8 form buttons: DORTS, MLC, PDS, FINTRAC, Privacy, C3, DRUP, MLS
3. Agent clicks "FINTRAC" → `openForm("fintrac")`:
   - Opens blank tab
   - `POST /api/forms/generate` with payload `{ formKey: "fintrac", listing: { propAddress, listPrice, mlsNumber, agentName, brokerage, sellers: [{ fullName, phone, email }] } }`
   - Next.js route proxies to Python server `POST /api/form/html` at `REALTORS360_URL`
   - Returns pre-filled HTML → written to new tab via `document.open()` + `document.write(html)`
4. Agent reviews, prints/saves, uploads signed copy to `listing_documents` with `doc_type = "FINTRAC"`
5. Agent repeats for DORTS (`doc_type = "DORTS"`) and PDS (`doc_type = "PDS"`)
6. `FormReadinessPanel` shows green checkmarks for all three required doc types
7. `deriveStepStatuses` detects `docTypes.has("FINTRAC") && docTypes.has("DORTS") && docTypes.has("PDS")` → Phase 5 and 6 become `completed`

**Alternatively:** If using `form_submissions` flow, agent marks each form completed → `form_submissions` rows with `form_key IN ("fintrac", "dorts", "pds", "mlc")` all have `status = "completed"` → same result.

**Skip option:** `SkipStepButton` calls `markStepComplete(listingId, "form-generation")` → upserts all 4 forms as `{ _skipped: true, status: "completed" }`.

---

### Scenario 4: Generate MLS Remarks with Claude AI (Phase 7)

1. Agent opens Phase 7 ("MLS Preparation") — `in-progress` (forms done, no MLS number yet)
2. Agent navigates to Content Engine at `/content` or uses inline MLS remarks button on listing detail
3. `POST /api/mls-remarks` with `{ listingId, address, beds, baths, sqft, features, propertyType }`
4. Claude Sonnet generates `mls_public` (≤500 chars) and `mls_realtor` (≤500 chars) via `src/lib/anthropic/creative-director.ts`
5. Results upserted to `prompts` table: `listing_id`, `mls_public`, `mls_realtor`, `ig_caption`, `video_prompt`, `image_prompt`
6. Agent optionally triggers Kling AI:
   - Image: `POST` to Kling Image API → async task → poll `GET /api/kling/status?taskId=...` → result stored in `media_assets` with `asset_type = "image"`, `status = "completed"`, `output_url`
   - Video: hero image → Kling video API → `media_assets` with `asset_type = "video"`
7. Agent clicks "Listing Blast" (`ListingBlastDialog`) to send new listing alerts to matched buyer contacts

**Key tables written:** `prompts` (one row per listing), `media_assets` (one row per generated asset)

---

### Scenario 5: Advance Listing Through All 8 Phases

Sequential progression driven by data conditions, not manual checkbox:

| Phase | What unlocks it | What to do |
|-------|-----------------|------------|
| 1 Seller Intake | Listing created | Collect seller details → auto-complete |
| 2 Data Enrichment | Phase 1 done | Enter/confirm list price |
| 3 CMA | Price set | Save CMA data in form step |
| 4 Pricing & Review | Price set | Confirm price, lock marketing tier |
| 5 Form Generation | Price set | Complete FINTRAC + DORTS + PDS + MLC |
| 6 E-Signature | Forms complete | Route via DocuSign, archive signed docs |
| 7 MLS Prep | Forms complete | Generate AI remarks, upload photos |
| 8 MLS Submission | MLS number entered | Enter `mls_number` in listing |
| Post-Listing | MLS number set | Manage showings, offers, close |

Agent can bypass any phase using `markStepComplete(listingId, stepId)` which writes the minimum data needed to satisfy `deriveStepStatuses` for that step.

---

### Scenario 6: Change Listing Status (Active → Conditional → Sold)

**Normal transition** (`updateListingStatus`):
- `active → pending` (offer accepted, subjects on)
- `pending → sold` (subjects removed, deal closed)
- Validated against `VALID_TRANSITIONS` map

**Manual override** (`overrideListingStatus`):
- Accepts: `active`, `pending`, `conditional`, `sold`, `cancelled`, `expired`, `withdrawn`
- Bypasses the sequential transition gate
- Used for out-of-band states the workflow never produces naturally (e.g., `conditional` after offer with subjects)
- Auto-syncs seller's `contacts.stage_bar`:
  - `conditional` → `stage_bar = "under_contract"`, `lead_status = "under_contract"`
  - `sold` → `stage_bar = "closed"`, `lead_status = "closed"` (only advances, never downgrades)

**When sold:** all 9 workflow steps show `completed` in `deriveStepStatuses`.

**Voice agent:** `update_listing_status` tool accepts `enum ["active", "pending", "sold", "conditional", "subject_removal", "withdrawn", "expired"]` → calls `PATCH /api/listings/[id]/status`.

---

## Demo Script

**Preconditions:** At least one seller contact exists in `contacts` table. Dev server running at `localhost:3000`. Python form server running at `localhost:8767`.

1. **Open listings** → navigate to `localhost:3000/listings` → redirects to most recent listing detail, or shows empty state card
2. **Create listing** → click "New Listing" in sidebar → fill: Address = "123 Main St, Vancouver, BC", select seller contact, Lockbox Code = "4821", click Save → new listing created, page refreshes to `/listings/[id]`
3. **Review workflow stepper** → Phase 1 already shows green "COMPLETE" badge. Phases 2–8 show gray "pending" or orange "IN PROGRESS"
4. **Enter list price** → click Phase 2 ("Data Enrichment") → enter List Price = "$1,299,000" → Save → Phases 2, 3, 4 flip to green "COMPLETE"; Phase 5 flips to orange "IN PROGRESS"
5. **Open FINTRAC form** → click Phase 5 → click FINTRAC button in BCFormsPanel → new tab opens with pre-filled form from Python server
6. **Skip forms** → click "Skip Step" on Phase 5 → `markStepComplete` fires → all 4 forms upserted as `_skipped: true, status: completed` → Phase 5 and 6 flip to green
7. **Generate AI remarks** → click Phase 7 ("MLS Prep") → click "Generate MLS Remarks" → Claude returns 2 descriptions in under 3 seconds → shown in text areas
8. **Enter MLS number** → type "R2948271" in MLS Number field → Save → Phase 7 and 8 flip to green; Post-Listing shows "IN PROGRESS"
9. **Override status to Conditional** → click "Status Override" chip → select "Conditional" → listing card updates; seller's stage bar advances to "Under Contract"
10. **Mark Sold** → override status to "Sold" → all 9 phases turn green "COMPLETE"

---

## Data Model

### `listings`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `address` | TEXT NOT NULL | Civic address |
| `seller_id` | UUID FK → contacts | Required, ON DELETE RESTRICT |
| `lockbox_code` | TEXT NOT NULL | Shown to buyer agents on confirmation |
| `status` | TEXT | `active`, `pending`, `conditional`, `sold`, `cancelled`, `expired`, `withdrawn` |
| `mls_number` | TEXT | NULL until Phase 8; drives Phase 7+8 completion |
| `list_price` | NUMERIC(12,2) | Drives Phase 2–6 completion |
| `sold_price` | NUMERIC | Set on closing |
| `buyer_id` | UUID FK → contacts | Linked buyer contact on sale |
| `closing_date` | DATE | Completion date |
| `commission_rate` | NUMERIC | Default 2.5 |
| `commission_amount` | NUMERIC | Auto-calculated: `sold_price * commission_rate / 100` |
| `showing_window_start` | TIME | Earliest allowed showing time |
| `showing_window_end` | TIME | Latest allowed showing time |
| `property_type` | TEXT | `Residential`, `Condo/Apartment`, `Townhouse`, `Land`, `Commercial`, `Multi-Family` |
| `hero_image_url` | TEXT | Supabase Storage public URL |
| `hero_image_storage_path` | TEXT | Storage bucket path |
| `notes` | TEXT | Internal agent notes |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auto-managed by trigger |

### `listing_documents`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `listing_id` | UUID FK → listings | ON DELETE CASCADE |
| `doc_type` | TEXT | `FINTRAC`, `DORTS`, `PDS`, `CONTRACT`, `TITLE`, `OTHER` |
| `file_name` | TEXT | Step-prefixed for cascade reset: `step-{stepId}_{name}` |
| `file_url` | TEXT | Supabase Storage public URL |
| `uploaded_at` | TIMESTAMPTZ | |
| UNIQUE | `(listing_id, doc_type)` | One doc per type per listing |

### `form_submissions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `listing_id` | UUID FK → listings | ON DELETE CASCADE |
| `form_key` | TEXT | `"fintrac"`, `"dorts"`, `"pds"`, `"mlc"`, `"step-seller-intake"`, `"step-data-enrichment"`, etc. |
| `form_data` | JSONB | Arbitrary field values; `{ _skipped: true }` for bypassed steps |
| `pdf_url` | TEXT | Generated PDF URL if applicable |
| `status` | TEXT | `draft` or `completed` |
| UNIQUE | `(listing_id, form_key)` | One submission per form per listing |

### `seller_identities`
Stores FINTRAC-required seller identity data (referenced in CLAUDE.md):
| Column | Type | Notes |
|--------|------|-------|
| `listing_id` | UUID FK → listings | |
| `full_name` | TEXT | |
| `dob` | DATE | Date of birth |
| `citizenship` | TEXT | |
| `id_type` | TEXT | Passport, driver's licence, etc. |
| `id_number` | TEXT | |
| `id_expiry` | DATE | |

### `prompts`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `listing_id` | UUID FK → listings | UNIQUE — one row per listing |
| `video_prompt` | TEXT | Kling video generation prompt |
| `image_prompt` | TEXT | Kling image generation prompt |
| `mls_public` | TEXT | Claude-generated public MLS remarks (≤500 chars) |
| `mls_realtor` | TEXT | Claude-generated REALTOR-only remarks (≤500 chars) |
| `ig_caption` | TEXT | Instagram caption with hashtags |

### `media_assets`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `listing_id` | UUID FK → listings | |
| `prompt_id` | UUID FK → prompts | ON DELETE SET NULL |
| `asset_type` | TEXT | `video` or `image` |
| `kling_task_id` | TEXT | For async polling via `GET /api/kling/status` |
| `status` | TEXT | `pending`, `processing`, `completed`, `failed` |
| `output_url` | TEXT | Public CDN URL of generated asset |
| `error_message` | TEXT | On failure |

### `form_templates`
| Column | Type | Notes |
|--------|------|-------|
| `form_key` | TEXT UNIQUE | e.g., `"dorts"`, `"fintrac"` |
| `form_name` | TEXT | Human-readable label |
| `organization` | TEXT | Default `"BCREA"` |
| `version` | TEXT | Form version |
| `pdf_url` | TEXT | Source PDF URL |
| `field_mapping` | JSONB | CRM field → PDF field mapping |
| `field_names` | JSONB | Array of field identifiers |

---

## Voice Agent Integration

The voice agent (Python, Realtor Mode) calls the Next.js API bridge at `src/app/api/`. All listing tools are defined in `voice_agent/server/tools/realtor_tools.py`.

### Listing Tools

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `search_properties` | Search active listings by price range or partial address | none (all optional: `min_price`, `max_price`, `address`, `status`) |
| `find_listing` | Look up listing by address, MLS number, or listing ID | none (match on `address`, `mls`, or `listing_id`) |
| `update_listing_status` | Change pipeline status | `listing_id`, `new_status` (enum) |
| `update_listing_price` | Update list price | `listing_id`, `new_price` (number) |
| `add_listing_note` | Append internal note to listing | `listing_id`, `note` |
| `navigate_to` | Open listing detail page in browser | `page = "listings"`, optional `id` |

### Valid Status Values (Voice Agent)
`active`, `pending`, `sold`, `conditional`, `subject_removal`, `withdrawn`, `expired`

### Example Voice Interactions

**"What's the status of 123 Main Street?"**
→ `find_listing({ address: "123 Main" })` → returns listing object with `status`, `list_price`, `mls_number`

**"Mark 456 Oak Avenue as conditional."**
→ `find_listing({ address: "456 Oak" })` → `update_listing_status({ listing_id: "...", new_status: "conditional" })`

**"Drop the price on the Oak Avenue listing to 1.1 million."**
→ `find_listing({ address: "Oak Avenue" })` → `update_listing_price({ listing_id: "...", new_price: 1100000 })`

**"Add a note to the Oak listing — seller wants a 60-day completion."**
→ `find_listing(...)` → `add_listing_note({ listing_id: "...", note: "Seller wants a 60-day completion." })`

**"Show me all active listings."**
→ `search_properties({ status: "active" })` → list of matching listings

**"Take me to the listing page."**
→ `navigate_to({ page: "listings" })`

### RAG Integration
Every `createListing` and `updateListing` call triggers `triggerIngest("listings", id)` which pushes the listing record into the RAG knowledge base (`src/lib/rag/realtime-ingest.ts`). The voice agent's semantic search queries this index to find listings by natural language (e.g., "the two-bed condo in Kitsilano under a million").
