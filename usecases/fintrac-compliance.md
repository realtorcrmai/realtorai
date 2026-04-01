---
title: " Use Case: FINTRAC Compliance & Seller Identity Verification"
slug: "fintrac-compliance"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
related_routes: ["/contacts", "/listings"]
changelog: []
---

# Use Case: FINTRAC Compliance & Seller Identity Verification

## Problem Statement

BC realtors are legally required under the *Proceeds of Crime (Money Laundering) and Terrorist Financing Act* to verify the identity of every seller client before a transaction proceeds. Failure to collect, record, and retain FINTRAC identity information exposes the agent and brokerage to regulatory fines, licence suspension, and criminal liability. Manually managing this paperwork — collecting government IDs, tracking expiry dates, flagging missing fields — is error-prone and creates compliance gaps that surface at audit time.

Realtors360 solves this by embedding FINTRAC identity collection directly into Phase 1 (Seller Intake) of the listing workflow, making it impossible to advance without a complete identity record, and surfacing compliance status at a glance on the listing dashboard.

---

## User Roles

| Role | Interaction |
|------|-------------|
| **Listing Agent** | Collects identity during seller intake meeting; reviews compliance status before advancing to Phase 2 |
| **Brokerage Compliance Officer** | Audits identity records across all listings; ensures 5-year retention |
| **Seller (Client)** | Provides government-issued ID and personal details during intake; signs FINTRAC form |

---

## Existing System Context

- **Table:** `seller_identities` — stores `listing_id`, `full_name`, `dob`, `citizenship`, `id_type`, `id_number`, `id_expiry`, `created_at`, `updated_at`
- **Table:** `contacts` — stores the seller contact record linked to the listing via `seller_id`
- **Table:** `listings` — `current_phase` (1–8) controls workflow advancement; Phase 1 includes FINTRAC collection
- **Form:** FINTRAC form (key: `fintrac`) is one of the 12 BCREA forms auto-generated in Phase 5 from `seller_identities` data
- **Workflow Phase 1 component:** `src/components/workflow/Phase1.tsx` — renders the seller intake form including the identity section
- **Server action:** `src/actions/listings.ts` — saves listing and seller identity data
- **FINTRAC form definition:** `src/lib/forms/definitions.ts` — pre-fills identity fields from `seller_identities` when generating the FINTRAC form in Phase 5
- **Known gap:** FINTRAC collection is only implemented for sellers; buyer identity verification is not yet built

---

## Features

### 1. Identity Collection Form (Phase 1)
Embedded in the Phase 1 Seller Intake step. Fields collected:
- Full legal name
- Date of birth
- Citizenship / country of origin
- ID type (Driver's Licence, Passport, Permanent Resident Card, etc.)
- ID number
- ID expiry date

### 2. Completeness Validation
The Phase 1 form validates all FINTRAC fields are present before allowing submission. Missing fields are highlighted with error states using `lf-input` error styling.

### 3. Compliance Status on Listing Dashboard
Listings display a FINTRAC badge:
- Green (`lf-badge-done`): All identity fields collected and ID is not expired
- Amber (`lf-badge-pending`): Identity record exists but ID is expiring within 30 days
- Red (`lf-badge-blocked`): Identity not collected or ID already expired

### 4. Auto-Population of FINTRAC Form
When the agent generates the 12 BCREA forms in Phase 5, the FINTRAC Individual Identification Information Record is pre-filled from the `seller_identities` table — no re-entry required.

### 5. 5-Year Retention Flag
The `seller_identities` record is never deleted. A `retention_until` computed field (transaction date + 5 years) is displayed on the compliance audit view.

### 6. Voice Agent Support
The realtor can ask the voice agent to look up compliance status, flag missing identity data, or navigate to the seller intake form for a specific listing.

---

## End-to-End Scenarios

### Scenario 1: Agent Collects Seller Identity at Listing Appointment
1. Agent creates a new listing for "456 Maple St, Surrey" and enters Phase 1 — Seller Intake.
2. The identity section appears within the Phase 1 form.
3. Agent enters seller full name "Margaret Chen", DOB "1968-04-12", citizenship "Canadian", ID type "Passport", ID number "PA123456", expiry "2028-09-01".
4. Agent submits Phase 1. The `seller_identities` record is created linked to the listing.
5. The listing card now shows a green FINTRAC badge.

### Scenario 2: Agent Tries to Advance Phase Without Identity Data
1. Agent creates a listing and fills in all Phase 1 property fields but skips the identity section.
2. Agent clicks "Complete Phase 1".
3. Form validation fires: "FINTRAC identity fields are required — Full Name, Date of Birth, ID Type, ID Number, and Expiry Date must all be provided."
4. The form scrolls to the identity section with all missing fields highlighted in red.
5. Agent must fill identity fields before Phase 1 can be marked complete.

### Scenario 3: Expired ID Detected
1. Listing "789 Oak Ave" was created 6 years ago and the seller's driver's licence expired last month.
2. The listing dashboard shows a red FINTRAC badge: "ID Expired — re-verify required."
3. Agent is prompted to collect updated ID from the seller and update `id_number` and `id_expiry` in the identity record.

### Scenario 4: FINTRAC Form Auto-Filled in Phase 5
1. Agent advances listing "456 Maple St" through to Phase 5 — Form Generation.
2. Agent clicks "Generate Forms."
3. The FINTRAC Individual Identification Information Record is returned pre-filled:
   - Full Legal Name: "Margaret Chen"
   - Date of Birth: pre-filled from `dob`
   - ID Type / Number / Expiry: pre-filled from `id_type`, `id_number`, `id_expiry`
   - Property Address and Transaction Amount auto-populated from the listing
4. Agent reviews the form and sends for e-signature.

### Scenario 5: Compliance Officer Audits All Listings
1. Compliance officer opens the listings view filtered to `current_phase >= 2`.
2. Three listings are flagged: two with red FINTRAC badges (identity not collected), one with amber (ID expiring in 22 days).
3. Officer exports a compliance summary report listing the affected properties and assigned agents.
4. Officers contacts agents to resolve the gaps before the quarterly audit.

### Scenario 6: Voice Agent Flags Missing FINTRAC
1. Agent says: "What listings are missing FINTRAC?"
2. Voice agent calls `get_crm_help` with topic `fintrac` and cross-references listings in Phase 1 without a corresponding `seller_identities` record.
3. Agent responds: "You have 2 listings missing FINTRAC identity data: 123 Pine St (Phase 1) and 88 Cedar Cres (Phase 1). Would you like me to navigate to either listing?"

---

## Demo Script

**Setup:** A listing exists in Phase 1 with property details filled but identity section blank.

1. **Open listing workflow** → Phase 1 Seller Intake → scroll to "Seller Identity (FINTRAC)" section
2. **Show empty state** — all identity fields blank; FINTRAC badge on listing card is red
3. **Attempt to advance** → click "Complete Phase 1" → show validation error highlighting all FINTRAC fields
4. **Fill identity fields** → Full Name: "Margaret Chen", DOB: 1968-04-12, Citizenship: Canadian, ID Type: Passport, ID Number: PA123456, Expiry: 2028-09-01
5. **Submit Phase 1** → listing card badge turns green — "FINTRAC Collected"
6. **Advance to Phase 5** → Generate Forms → show FINTRAC form pre-filled with identity data
7. **Voice demo** → say "What is the FINTRAC status for Margaret Chen's listing?" → voice agent responds with status and ID expiry date

---

## Data Model

### `seller_identities` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row identifier |
| `listing_id` | uuid FK → listings | Associated listing |
| `full_name` | text NOT NULL | Full legal name of seller |
| `dob` | date | Date of birth |
| `citizenship` | text | Country of citizenship |
| `id_type` | text | Driver's Licence, Passport, etc. |
| `id_number` | text | Government ID number |
| `id_expiry` | date | ID expiry date |
| `created_at` | timestamptz | Record creation timestamp |
| `updated_at` | timestamptz | Last modified timestamp |

### `contacts` Table (relevant fields)
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Contact identifier |
| `name` | text | Contact full name |
| `phone` | text | Phone number |
| `email` | text | Email address |
| `type` | text | buyer, seller, partner, other |

### Computed Compliance Status Logic
```
if seller_identities record missing → status = "blocked" (red)
if id_expiry < today → status = "expired" (red)
if id_expiry < today + 30 days → status = "expiring" (amber)
else → status = "compliant" (green)
```

---

## Voice Agent Integration

### Supported Queries
- "What listings are missing FINTRAC?" → voice agent queries listings without `seller_identities` records
- "Is FINTRAC collected for [seller name]'s listing?" → looks up identity record by listing
- "Explain FINTRAC requirements" → `get_crm_help` with topic `fintrac`
- "Navigate to FINTRAC section for 456 Maple St" → directs agent to Phase 1 of the listing
- "When does [seller name]'s ID expire?" → returns `id_expiry` from `seller_identities`

### Knowledge Base Entry (voice agent `get_crm_help`)
Topic: `fintrac` — "FINTRAC identity verification is collected for sellers during Phase 1 — Seller Intake. Required fields: full legal name, date of birth, citizenship, ID type (passport/driver's licence/etc.), ID number, and expiry date. This data is stored in the seller_identities table. Records must be retained for 5 years after transaction completion. Buyer FINTRAC collection is not yet implemented."

Topic: `compliance` — "FINTRAC identity verification is collected for sellers in Phase 1 (full name, DOB, citizenship, ID type/number/expiry). CASL consent is tracked as a form field on contacts. Note: FINTRAC for buyers, Receipt of Funds reports, and Suspicious Transaction reports are not yet implemented. Record retention policies are not yet enforced in the system."
