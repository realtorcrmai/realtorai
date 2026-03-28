---
title: " Use Case: BC Forms Generation (BCREA)"
slug: "bc-forms-generation"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
related_routes: ["/forms"]
changelog: []
---

# Use Case: BC Forms Generation (BCREA)

## Problem Statement

Every BC real estate listing requires a set of standardized BCREA forms that must be completed, signed, and retained as part of the transaction file. Manually filling these forms is repetitive and error-prone — the same address, seller name, agent details, and list price get typed into 12 different documents. One typo or outdated field can create legal exposure or delay a deal.

ListingFlow automates this entirely. By Phase 5, all listing and seller data is already in the CRM. The Python ListingFlow form server at port 8767 uses this data to generate all 12 BCREA forms pre-filled as editable HTML — ready for review and e-signature — in a single click.

---

## User Roles

| Role | Interaction |
|------|-------------|
| **Listing Agent** | Triggers form generation in Phase 5; reviews pre-filled forms; sends for e-signature |
| **Seller (Client)** | Reviews and signs forms via DocuSign envelope |
| **Brokerage Admin** | Accesses completed form packages for compliance records |

---

## Existing System Context

- **Python Form Server:** `LISTINGFLOW_URL` (default `http://127.0.0.1:8767`); endpoint `POST /api/form/html` — accepts CDM payload, returns pre-filled HTML form
- **CDM Mapper:** `src/lib/cdm-mapper.ts` — converts a listing record (with seller and agent data) into the Common Data Model payload consumed by the form server
- **Form Definitions:** `src/lib/forms/definitions.ts` — local TypeScript definitions for all 12 form schemas used for the in-app renderer fallback
- **Form Renderer:** `src/lib/forms/renderer.ts` — renders form definitions to HTML when the Python server is unavailable
- **API Routes:**
  - `POST /api/forms/generate` — accepts `{ listingId, formKey }`, calls CDM mapper, proxies to Python server, returns HTML
  - `GET /api/forms/templates` — lists all 12 available form templates
  - `GET /api/forms/templates/[formKey]/mapping` — returns the field mapping for a specific form
  - `POST /api/forms/save` — saves a form draft to `form_submissions`
  - `POST /api/forms/complete` — marks a form as complete
- **Pages:** `/forms` (form browser), `/forms/templates` (template library)
- **Listing workflow Phase 5:** `src/components/workflow/Phase5.tsx` — form generation step UI
- **Workflow action:** `src/actions/workflow.ts` — tracks `forms_status` JSONB on the `listings` table

### 12 BCREA Forms

| Key | Full Name | Purpose |
|-----|-----------|---------|
| `dorts` | Disclosure of Representation in Trading Services | Discloses agency relationship to client |
| `mlc` | Multiple Listing Contract | Exclusive seller listing agreement |
| `pds` | Property Disclosure Statement | Seller disclosure of property condition |
| `fintrac` | FINTRAC Individual Identification Information Record | AML identity verification |
| `privacy` | Privacy Notice & Consent | PIPA (BC) consent for data collection |
| `c3` | Working with a REALTOR® | Disclosure to unrepresented parties |
| `drup` | Disclosure of Remuneration | Disclosure of commission and referral fees |
| `mls` | MLS Listing Input Sheet | MLS data entry form with property details |
| `mktauth` | Marketing Authorization | Seller authorization for marketing activities |
| `agency` | Agency Relationships Disclosure | Duties under seller or buyer agency |
| `c3conf` | Confirmation of Representation | Agency confirmation at offer stage |
| `fairhsg` | Fair Housing Declaration | Equal opportunity in housing commitment |

---

## Features

### 1. One-Click Form Generation (Phase 5)
Agent clicks "Generate Forms" in Phase 5. The system loops through all 12 form keys, calls the CDM mapper to build the payload from listing data, and sends each to the Python form server. All 12 forms are returned as pre-filled, editable HTML in under 10 seconds.

### 2. CDM Mapper
`src/lib/cdm-mapper.ts` transforms the listing record into the Common Data Model:
- Pulls `address`, `list_price`, `mls_number`, `property_type` from `listings`
- Pulls `full_name`, `phone`, `email` from the seller contact via `seller_id`
- Pulls `full_name`, `dob`, `id_type`, `id_number`, `id_expiry` from `seller_identities`
- Pulls agent name, phone, email, and brokerage from `agent_settings` / environment config

### 3. In-App Form Viewer
Generated HTML forms open in a full-screen modal with:
- Editable fields (pre-filled from listing data)
- Signature blocks for client and agent
- Print / download as PDF button

### 4. Form Status Tracking
`listings.forms_status` JSONB tracks the status of all 12 forms:
```json
{
  "dorts": "complete",
  "mlc": "draft",
  "pds": "pending",
  ...
}
```
Phase 5 is considered complete when all forms are marked `complete`.

### 5. Form Template Library
`/forms/templates` lists all 12 form definitions with field counts, form numbers, and a preview button. Agents can browse forms outside the workflow context.

### 6. Fallback Renderer
If the Python form server is unavailable, `src/lib/forms/renderer.ts` renders the TypeScript form definitions directly as styled HTML — no server dependency for viewing pre-filled forms.

---

## End-to-End Scenarios

### Scenario 1: Agent Generates All 12 Forms in Phase 5
1. Listing "456 Maple St, Surrey" has completed Phases 1–4 (seller intake, enrichment, CMA, pricing).
2. Agent opens Phase 5 — Form Generation.
3. Agent clicks "Generate All Forms."
4. System calls CDM mapper → builds payload → sends to Python form server at `:8767`.
5. All 12 forms are returned pre-filled: seller name, address, list price, agent details, identity data — all populated.
6. Agent reviews each form in the in-app viewer, makes minor edits (e.g., adds commission split).
7. Agent clicks "Mark All Complete" → `forms_status` is updated → Phase 5 is marked done.

### Scenario 2: Generate a Single Form (DORTS)
1. Agent needs to regenerate just the DORTS after a seller name change.
2. Agent navigates to Phase 5 → clicks the DORTS row → "Regenerate."
3. `POST /api/forms/generate` is called with `{ listingId, formKey: "dorts" }`.
4. CDM mapper re-reads current listing data (with updated seller name).
5. Fresh pre-filled DORTS HTML is returned and opened in the viewer.
6. Agent saves draft → status updated to `draft` in `forms_status`.

### Scenario 3: Python Server Unavailable — Fallback Renderer
1. The Python form server at `:8767` is offline for maintenance.
2. Agent clicks "Generate Forms" in Phase 5.
3. The API route catches the connection error and falls back to the TypeScript form renderer.
4. All 12 forms are rendered from `src/lib/forms/definitions.ts` using live listing data.
5. Agent sees a notice: "Forms rendered locally — some advanced formatting may differ from the official PDF."
6. Agent reviews and saves drafts; can regenerate via server once it is back online.

### Scenario 4: Browse Form Templates Outside Workflow
1. New agent wants to understand what the MLC (Multiple Listing Contract) requires before a client meeting.
2. Agent navigates to `/forms/templates`.
3. All 12 forms are listed with name, subtitle, and field count.
4. Agent clicks "Preview" on MLC → a blank pre-formatted MLC opens in the viewer.
5. Agent can see all sections: Seller Information, Property Details, Listing Terms, Signatures.

### Scenario 5: Mark Individual Form Complete
1. Agent has reviewed and signed the PDS with the seller.
2. Agent opens Phase 5 → PDS row → "Mark Complete."
3. `POST /api/forms/complete` is called with `{ listingId, formKey: "pds" }`.
4. `forms_status.pds` is updated to `"complete"`.
5. The PDS row now shows a green done badge in the Phase 5 UI.
6. Once all 12 forms are complete, Phase 5 advances automatically.

### Scenario 6: Voice Agent Explains Forms
1. Agent is in a client meeting and asks the voice agent: "What forms do we sign today?"
2. Voice agent calls `get_crm_help` with topic `forms`.
3. Response: "ListingFlow generates 12 BCREA forms automatically from listing data: DORTS, MLC, PDS, FINTRAC, PRIVACY, C3, DRUP, MLS_INPUT, MKTAUTH, AGENCY, C3CONF, FAIRHSG. Forms are generated in Phase 5 via the Python ListingFlow server. Navigate to the listing workflow and reach Phase 5 to generate all forms."

---

## Demo Script

**Setup:** Listing "456 Maple St, Surrey" is at Phase 5 with all prior phases complete. Python form server is running at `:8767`.

1. **Open Phase 5** → show the 12 form rows, all with "pending" status badges
2. **Click "Generate All Forms"** → show loading spinner → 12 forms returned in ~5 seconds
3. **Open DORTS** → show pre-filled seller name, address, list price, agent details
4. **Open FINTRAC** → show identity fields pre-filled from `seller_identities`
5. **Open MLC** → show commission rate fields (blank — agent to fill)
6. **Edit a field** in MLC → click "Save Draft" → status badge updates to "draft"
7. **Mark PDS complete** → green badge appears on PDS row
8. **Navigate to `/forms/templates`** → show full template library with all 12 forms
9. **Voice demo** → "What forms are needed for a listing?" → voice agent describes all 12 forms

---

## Data Model

### `form_submissions` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row identifier |
| `listing_id` | uuid FK → listings | Associated listing |
| `form_key` | text | dorts, mlc, pds, fintrac, etc. |
| `status` | text | pending, draft, complete |
| `html_content` | text | Rendered HTML of the form |
| `field_values` | jsonb | Overridden field values from agent edits |
| `generated_at` | timestamptz | When the form was generated |
| `completed_at` | timestamptz | When the form was marked complete |

### `form_templates` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row identifier |
| `form_key` | text UNIQUE | Unique key: dorts, mlc, pds, etc. |
| `title` | text | Display name of the form |
| `subtitle` | text | Subtitle / regulatory context |
| `form_number` | text | BCREA form number (where applicable) |
| `sections` | jsonb | Section and field schema |
| `footer` | text | Legal footer text |
| `updated_at` | timestamptz | Last sync from form definitions |

### `listings.forms_status` JSONB
```json
{
  "dorts": "pending | draft | complete",
  "mlc": "pending | draft | complete",
  "pds": "pending | draft | complete",
  "fintrac": "pending | draft | complete",
  "privacy": "pending | draft | complete",
  "c3": "pending | draft | complete",
  "drup": "pending | draft | complete",
  "mls": "pending | draft | complete",
  "mktauth": "pending | draft | complete",
  "agency": "pending | draft | complete",
  "c3conf": "pending | draft | complete",
  "fairhsg": "pending | draft | complete"
}
```

---

## Voice Agent Integration

### Supported Queries
- "What forms do I need for a listing?" → `get_crm_help` with topic `forms` — describes all 12 BCREA forms
- "What is the status of forms for [address]?" → agent looks up `forms_status` JSONB on the listing
- "Generate forms for [listing]" → voice agent directs user to Phase 5 of the listing workflow
- "Explain what the DORTS form is" → `get_crm_help` returns description of the Disclosure of Representation in Trading Services
- "How do I mark a form complete?" → `get_crm_help` describes the Phase 5 form completion flow

### Knowledge Base Entry (voice agent `get_crm_help`)
Topic: `forms` — "ListingFlow generates 12 BCREA forms automatically from listing data: DORTS (Disclosure of Representation), MLC (Multiple Listing Contract), PDS (Property Disclosure Statement), FINTRAC (Identity Verification), PRIVACY (PIPA Consent), C3 (Working with a REALTOR), DRUP (Disclosure of Remuneration), MLS_INPUT (MLS Data Entry), MKTAUTH (Marketing Authorization), AGENCY (Agency Relationships), C3CONF (Confirmation of Representation), FAIRHSG (Fair Housing Declaration). Forms are generated in Phase 5 via the Python ListingFlow server at port 8767. Go to a listing's workflow, reach Phase 5, and click 'Generate Forms'. You can also browse form templates at /forms/templates."
