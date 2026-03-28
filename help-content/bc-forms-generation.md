---
title: "BC Forms Generation"
slug: "bc-forms-generation"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: ["/forms"]
changelog: []
---

# BC Forms Generation

## Problem Statement

Every BC real estate transaction requires a stack of standardized BCREA forms — disclosure statements, listing contracts, FINTRAC compliance documents, and more. Manually filling in property address, seller name, price, and dozens of other fields across 12 different forms is tedious, error-prone, and a major bottleneck at the listing stage. A single wrong address or misspelled name can delay a deal or trigger compliance issues. RealtorAI auto-fills all 12 BCREA forms from your listing data, opens them in a PDF editor for review, and lets you save drafts and download completed forms — turning hours of paperwork into minutes.

## Business Value

Form preparation is one of the least productive yet most legally critical tasks in a realtor's workflow. Auto-filling from listing data eliminates transcription errors across the 12 required BCREA forms, ensures consistency between documents (the address on the DORTS matches the MLC matches the PDS), and dramatically reduces the time from intake to signature-ready. Fewer errors means fewer delays, fewer compliance risks, and a more professional client experience.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Selects listing, generates forms, reviews and edits in PDF editor, downloads |
| **Transaction Coordinator** | Full access | Reviews form accuracy, manages draft versions, prepares for signature |
| **Admin** | Full access | Manages form templates, monitors completion across listings |

## Where to Find It

- Click **Forms** in the top navigation bar to open the forms page at /forms
- The page shows a listing selector dropdown at the top
- Below the selector, a grid displays all required and additional forms
- Click any form to open it in the built-in PDF editor
- To browse available templates, click the **Templates** tab at /forms/templates

## Preconditions

- You must be logged in
- The listing must exist with property details filled in (address, price, beds, baths, seller name at minimum)
- The form server must be running at the configured LISTINGFLOW_URL (default: http://127.0.0.1:8767)
- For FINTRAC forms, seller identity information must be collected in the listing workflow Phase 1

## Key Concepts

| Term | Definition |
|------|-----------|
| BCREA Form | A standardized form published by the BC Real Estate Association, required for real estate transactions in British Columbia |
| Auto-Fill | The process of populating form fields automatically from the listing record (address, price, seller name, property details) |
| PDF Editor | The built-in editor that opens pre-filled forms for review, manual edits, and annotations |
| Required Forms | The subset of 12 forms that must be completed for a standard listing transaction |
| Additional Forms | Supplementary forms that may be needed depending on the transaction type or property |
| Form Server | The backend Python service that accepts listing data and returns pre-filled HTML forms |
| CDM (Common Data Model) | The standardized data format that maps listing fields to form field positions |
| Draft | A saved version of a partially completed form that can be edited later |

## Core Workflow

1. Navigate to /forms and select a listing from the dropdown
2. The form grid displays all 12 BCREA forms with their completion status
3. Click a form to generate it — the system sends listing data to the form server
4. The form server returns the pre-filled form, which opens in the PDF editor
5. Review the auto-filled fields: address, price, beds, baths, seller name, and other listing details
6. Make any manual edits or additions in the PDF editor
7. Save the form as a draft for later revision
8. Download the completed PDF when ready for signature or submission

## End-to-End Scenarios

### Scenario: Generate all required forms for a new listing

- **Role:** Listing Agent
- **Goal:** Prepare the complete form package for a listing that just completed intake
- **Navigation:** Click Forms in the top nav
- **Steps:**
  1. Select the listing from the dropdown at the top of the page
  2. Review the form grid — all 12 forms show as available
  3. Click the DORTS (Disclosure of Representation in Trading Services) to generate it first
  4. Review the auto-filled fields: seller name, address, date
  5. Make any manual additions (e.g., specific representation terms)
  6. Save as draft
  7. Repeat for MLC (Multiple Listing Contract), PDS (Property Disclosure Statement), and all remaining forms
  8. Download each completed form as PDF
- **Expected outcome:** All 12 forms are generated, reviewed, and saved as drafts or downloaded
- **Edge cases:** Listing data is incomplete (missing seller name or address); form server is not running
- **Common mistakes:** Generating forms before all listing details are entered, resulting in blank fields
- **Recovery:** Complete the listing details in the listing workflow, then regenerate the forms

### Scenario: Edit a pre-filled form in the PDF editor

- **Role:** Transaction Coordinator
- **Goal:** Correct a seller's middle name that was auto-filled incorrectly
- **Navigation:** Click Forms, select the listing, click the specific form
- **Steps:**
  1. Select the listing from the dropdown
  2. Click the form that needs correction (e.g., FINTRAC Individual Identification)
  3. The form opens in the PDF editor with all fields pre-filled
  4. Locate the seller name field
  5. Click the field and edit the middle name
  6. Review other auto-filled fields while the form is open
  7. Save the draft
- **Expected outcome:** The form is updated with the correct seller name and saved
- **Edge cases:** The field is not editable in the PDF editor; changes do not save
- **Common mistakes:** Editing the form but forgetting to save before navigating away
- **Recovery:** Regenerate the form from the listing data and re-apply manual edits

### Scenario: Prepare FINTRAC compliance forms

- **Role:** Listing Agent
- **Goal:** Generate the FINTRAC identification form with seller identity details
- **Navigation:** Click Forms, select the listing
- **Steps:**
  1. Ensure the listing has FINTRAC identity data collected (from workflow Phase 1)
  2. Select the listing from the dropdown
  3. Click the FINTRAC form in the grid
  4. The form opens with seller identity fields pre-filled: full name, date of birth, citizenship, ID type, ID number, ID expiry date
  5. Verify all identity fields match the seller's government-issued ID
  6. Add any missing details (e.g., place of birth if required)
  7. Save and download
- **Expected outcome:** FINTRAC form is complete with accurate seller identity information
- **Edge cases:** Seller identity was not collected during intake; seller has multiple pieces of ID
- **Common mistakes:** Generating the FINTRAC form before collecting identity information in Phase 1
- **Recovery:** Return to the listing workflow Phase 1, complete FINTRAC identity collection, then regenerate the form

### Scenario: Download forms for signing

- **Role:** Listing Agent
- **Goal:** Get PDF copies of all completed forms to send to the seller for signature
- **Navigation:** Click Forms, select the listing
- **Steps:**
  1. Select the listing from the dropdown
  2. Review each form in the grid — confirm all required forms show as drafted or complete
  3. Click into each form and verify content
  4. Click Download PDF on each completed form
  5. Compile the downloaded PDFs into a package for the seller
- **Expected outcome:** All required forms downloaded as PDFs, ready for signing
- **Edge cases:** Some forms are still incomplete; the download fails
- **Common mistakes:** Downloading draft versions that have not been finalized
- **Recovery:** Open each form, finalize any remaining edits, save, then download again

### Scenario: Generate additional forms for a strata property

- **Role:** Listing Agent
- **Goal:** Add strata-specific forms beyond the standard 12 required forms
- **Navigation:** Click Forms, select the listing
- **Steps:**
  1. Select the strata listing from the dropdown
  2. Review the required forms grid
  3. Look for additional forms available below the required forms section
  4. Click on strata-related additional forms to generate them
  5. Review auto-filled data including strata lot, plan number, and strata fees if available
  6. Save and download as needed
- **Expected outcome:** Strata-specific forms are generated with available listing data
- **Edge cases:** Strata information is incomplete in the listing record
- **Common mistakes:** Forgetting to include strata-specific forms in the package
- **Recovery:** Return to the forms page and generate the missing strata forms

## Step-by-Step Procedures

### Procedure: Generate a single BCREA form

- **When to use:** You need to create or regenerate a specific form for a listing
- **Starting point:** /forms page
- **Steps:**
  1. Select the listing from the dropdown at the top of the page
  2. Locate the desired form in the grid (e.g., DORTS, MLC, PDS)
  3. Click the form to generate it
  4. The system sends the listing data to the form server via the CDM mapper
  5. The pre-filled form opens in the PDF editor
  6. Review all auto-filled fields
  7. Make any necessary edits
  8. Click Save Draft to save your work
  9. Click Download PDF when the form is complete
- **Validations:** Listing must be selected; the form server must be running; listing must have minimum required data (address, seller name)
- **What happens next:** The form is saved as a draft on the listing record. You can return to it later to continue editing or download it.
- **Common mistakes:** Clicking generate without selecting a listing first
- **Recovery:** Select the listing from the dropdown and try again

### Procedure: Review auto-filled data accuracy

- **When to use:** After generating any form, before saving or downloading
- **Starting point:** PDF editor with a newly generated form open
- **Steps:**
  1. Check the property address — verify street number, name, city, and postal code
  2. Check the seller name(s) — verify spelling matches government ID
  3. Check the list price — verify it matches the agreed price
  4. Check beds, baths, and square footage — verify against the listing record
  5. Check dates — verify listing date, expiry date, and any contract dates
  6. Check any legal descriptions (PID, lot, plan) if populated
  7. Correct any inaccuracies in the PDF editor
  8. Save the corrected form
- **Validations:** All critical fields must be present and accurate before downloading for signature
- **What happens next:** The corrected form is saved, ensuring consistency with the listing record
- **Common mistakes:** Assuming auto-filled data is always correct without reviewing
- **Recovery:** If an error is discovered after download, regenerate the form with corrected listing data

### Procedure: Browse available form templates

- **When to use:** You want to see which forms are available or check template versions
- **Starting point:** /forms/templates page
- **Steps:**
  1. Click the Templates tab on the forms page
  2. Browse the list of all available BCREA form templates
  3. Review the form name, description, and version
  4. Click a template to see a blank preview
  5. Return to the main forms page to generate filled versions
- **Validations:** Templates are read-only; you cannot edit the template itself
- **What happens next:** You can return to the main forms page with knowledge of which forms are available for your transaction
- **Common mistakes:** Trying to fill in a template directly instead of generating from a listing
- **Recovery:** Navigate back to /forms, select a listing, and generate the form properly

## Validations and Rules

- A listing must be selected before any form can be generated
- The listing must have at minimum: property address and seller name
- Forms auto-fill using the CDM mapper, which maps listing fields to form field positions
- The form server must be running and accessible for form generation to work
- PDF editor changes must be explicitly saved — navigating away without saving loses edits
- Downloaded PDFs are point-in-time snapshots — changes to listing data after download are not reflected in already-downloaded files
- FINTRAC forms require seller identity data (collected in listing workflow Phase 1)
- All 12 standard BCREA forms should be completed before proceeding to the e-signature phase (workflow Phase 6)

## Role Differences

| Role | Can View | Can Edit | Special Notes |
|------|----------|----------|---------------|
| **Listing Agent** | All forms for all listings | Generate, edit, save, download | Primary form preparer |
| **Transaction Coordinator** | All forms for all listings | Edit, save, download | Reviews for accuracy and completeness |
| **Admin** | All forms, templates | Full access including template management | Manages template versions and system configuration |

## Edge Cases

1. **Form server is not running:** Clicking a form to generate it will fail. The system displays an error. Start the form server (Python service on port 8767) before attempting to generate forms.
2. **Listing has no address:** The most critical auto-fill field is empty. Return to the listing and add the property address before generating forms.
3. **Seller name contains special characters or accents:** The CDM mapper passes the name as-is. Verify in the PDF editor that special characters render correctly in the form fields.
4. **Listing price changes after forms are generated:** Previously generated forms retain the old price. Regenerate any forms that include the price field to reflect the updated amount.
5. **Multiple sellers on one listing:** The system auto-fills the primary seller's information. Additional sellers must be added manually in the PDF editor for forms that require all parties.
6. **Form server returns an error for a specific form type:** This may indicate missing required data for that form type. Check which fields the form requires and ensure they are populated on the listing.

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|------------|-----------------|
| Form generation fails with an error | Form server is not running or unreachable | Check if the Python server is running on port 8767 | Start the form server; verify LISTINGFLOW_URL in environment | If the server is running but forms still fail to generate |
| Auto-filled fields are blank | Listing data is incomplete for the required fields | Open the listing and check that address, seller name, and price are filled | Complete the listing details and regenerate the form | If listing data is complete but fields still appear blank |
| PDF editor does not load | Browser compatibility issue or JavaScript error | Try a different browser; check the browser console | Clear cache and reload; use Chrome or Edge | If the PDF editor fails to load across all browsers |
| Downloaded PDF has corrupted formatting | Form server returned malformed HTML | Open the form in the PDF editor and check for visual issues | Regenerate the form; if the issue persists, report the form type and listing | If multiple form types produce corrupted output |
| Save Draft button does not respond | Network error or session timeout | Check your internet connection; verify you are still logged in | Refresh the page and try again; copy your edits before refreshing | If the save functionality is consistently broken |

## FAQ

### What are the 12 BCREA forms that RealtorAI supports?

RealtorAI supports: DORTS (Disclosure of Representation in Trading Services), MLC (Multiple Listing Contract), PDS (Property Disclosure Statement), FINTRAC (Individual Identification), PRIVACY (Privacy Notice and Consent), C3 (Contract of Purchase and Sale), DRUP (Disclosure to Unrepresented Parties), MLS_INPUT (MLS Data Input Form), MKTAUTH (Marketing Authorization), AGENCY (Agency Disclosure), C3CONF (Contract Confirmation), and FAIRHSG (Fair Housing Declaration).

### Can I generate forms for a listing that is still in the intake phase?

You can, but the auto-fill will only populate fields for which data exists. If the listing is still in Phase 1 (Seller Intake), critical fields like price or showing instructions may not yet be set. It is best to generate forms after at least Phases 1 through 4 are complete.

### Are the generated forms legally valid?

RealtorAI generates the standard BCREA form templates with your listing data pre-filled. The forms use the same templates prescribed by BCREA. However, you are responsible for reviewing all content for accuracy before obtaining signatures. The auto-fill is a convenience tool, not a replacement for professional review.

### Can I regenerate a form after making changes to the listing?

Yes. Regenerating a form pulls the latest listing data and creates a fresh pre-filled version. Note that any manual edits you made in the PDF editor on the previous version will not carry over — you would need to re-apply manual changes.

### What data does the system auto-fill?

The CDM mapper auto-fills: property address (street, city, postal code), list price, bedrooms, bathrooms, seller name(s), listing date, and any FINTRAC identity data (full name, DOB, citizenship, ID type, ID number, expiry). Additional fields may be populated depending on how complete your listing record is.

### Can I use the forms feature without the form server running?

No. The form server (Python service on port 8767) is required for form generation. Without it, clicking a form in the grid will produce an error. The server must be started separately from the main application.

### How do I handle forms for a dual-agency situation?

Generate the AGENCY (Agency Disclosure) form for the listing, which pre-fills your information and the property details. You will need to manually enter the buyer's details in the PDF editor for dual-agency disclosure requirements.

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| **Listing Workflow** | Forms generation is Phase 5 of the 8-phase listing workflow | Listing data from Phases 1-4 feeds into form auto-fill |
| **Contact Management** | Seller contact details populate form fields | Seller name, phone, and email flow into applicable forms |
| **FINTRAC Compliance** | Seller identity data from Phase 1 populates the FINTRAC form | Identity must be collected before the FINTRAC form can be fully generated |
| **Deal Pipeline** | Completed forms support deal progression toward e-signature | Forms must be complete before advancing to Phase 6 (E-Signature) |
| **Data Enrichment** | Property data from Phase 2 (geocoder, parcel, assessment) may enhance form content | Enrichment data provides legal descriptions and assessment values |

## Escalation Guidance

**Fix yourself:**
- Blank auto-fill fields — complete the listing record and regenerate
- PDF editor formatting issues — try a different browser or clear cache
- Wrong data on a form — edit in the PDF editor and save
- Form server connection error — verify the server is running on the correct port

**Needs admin:**
- Form server crashes on specific form types — requires server-side debugging
- CDM mapper is not correctly mapping a field — requires code-level investigation
- Form templates need updating to a new BCREA version — requires template update on the server
- PDF editor consistently fails to save — requires front-end investigation

**Information to gather before escalating:**
- The listing address and ID
- Which form type(s) are affected
- The exact error message or unexpected behavior
- Whether the form server is running (check terminal for the Python process)
- Screenshots of the form grid and any error states
