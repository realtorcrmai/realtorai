---
title: "Listing Workflow"
slug: "listing-workflow"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: ["/listings"]
changelog:
  - date: "2026-03-27"
    change: "Initial help article"
    type: new_content
---

# Listing Workflow (8-Phase Pipeline)

## Problem Statement

Every BC property listing must go through a legally mandated sequence — FINTRAC identity verification, BCREA form completion, e-signatures, and MLS submission — before it can go live. Without RealtorAI, agents manage this across disconnected tools: spreadsheets for tracking, email for forms, manual copy-paste into MLS. This causes compliance gaps, delayed listings, and errors that risk regulatory violations.

RealtorAI collapses this into a single 8-phase pipeline where status is derived automatically from real data — form completions, price entry, MLS number — rather than manual checkbox-ticking.

## Business Value

The listing workflow automates the legally mandated sequence that every BC realtor must complete before a property goes live on MLS. It reduces a typical 4-6 hour manual process to under 30 minutes by automating data collection, cross-referencing enrichment sources, and generating pre-filled forms. The workflow also provides a full audit trail for brokerage compliance reviews, ensuring FINTRAC and BCREA requirements are always met.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Creates listings, advances phases, generates forms, inputs MLS data |
| **Transaction Coordinator** | Full access | Manages workflow steps, uploads documents, tracks form status |
| **Admin** | Full access + overrides | Can override phase locks, force-advance, unlock prices |
| **Voice Agent** | API access (read/write) | Updates status, price, and notes via voice commands |

## Where to Find It

- Click **Listings** in the top navigation bar
- Click any listing to see its detail page with the workflow stepper
- The workflow stepper shows all 8 phases with completion status
- To create a new listing: click the **+** button and select **Listing**

## Preconditions

- You must be logged in with agent or admin role
- At least one seller contact must exist (or be created during intake)
- Property address must be a valid BC location
- For FINTRAC: seller must have two government-issued IDs available
- For form generation: the form server must be running
- For AI content: Anthropic API key must be configured

## Key Concepts

| Term | Definition |
|------|-----------|
| Phase | One of 8 sequential steps. Must be completed in order — you cannot skip phases. |
| forms_status | Tracks which of the 12 BCREA forms have been generated for this listing |
| Price Lock | Once confirmed in Phase 4, the price cannot be changed without explicit unlock. Unlocking resets forms. |
| CDM | Common Data Model — maps your listing data to each BCREA form's required fields |
| Enrichment | Property data pulled from 4 BC government APIs during Phase 2 |
| Subject Clauses | Conditions in the Contract of Purchase and Sale that must be satisfied before the deal is firm |
| DORTS | Disclosure of Representation — given to all parties at first contact |
| PDS | Property Disclosure Statement — seller's written disclosure of known defects |

## Core Workflow

1. Create a new listing and link it to a seller contact
2. Complete seller intake: FINTRAC identity, property details, commissions
3. Run data enrichment from BC government sources
4. Perform CMA analysis with comparable sales
5. Confirm and lock the list price
6. Generate all 12 BCREA forms
7. Send forms for e-signature
8. Generate AI marketing content (MLS remarks, social media)
9. Submit to MLS (manual step)

## End-to-End Scenarios

### Scenario: Create a new detached home listing

- **Role:** Listing Agent
- **Goal:** Set up a new listing from scratch for a detached home
- **Preconditions:**
  - Seller contact exists in RealtorAI
  - Seller has two government IDs for FINTRAC
- **Navigation:** Listings > + button > Listing
- **Steps:**
  1. Click + and select Listing
  2. Search for and select the seller contact
  3. Enter the property address
  4. Select property type: Detached
  5. Enter initial asking price
  6. Save — listing is created in Phase 1
- **Expected outcome:**
  - Draft listing appears in your listings with Phase 1 active
- **Edge cases:**
  - Seller not yet in system — create contact first
  - Address not found by geocoder — enter manually
- **Common mistakes:**
  - Entering incomplete address (missing postal code)
- **Recovery:**
  - Edit the listing to correct the address before running Phase 2

### Scenario: Run data enrichment (Phase 2)

- **Role:** Listing Agent
- **Goal:** Pull property data from BC government sources
- **Preconditions:**
  - Phase 1 complete
  - Valid BC address entered
- **Navigation:** Listing detail > Workflow > Phase 2
- **Steps:**
  1. Click Phase 2 in the workflow stepper
  2. Click "Run Enrichment"
  3. Wait for BC Geocoder, ParcelMap results
  4. Review and verify LTSA data (may need manual entry)
  5. Review BC Assessment data
- **Expected outcome:**
  - All four enrichment sources show green checkmarks
- **Edge cases:**
  - ParcelMap returns no data for rural properties
- **Common mistakes:**
  - Skipping LTSA review
- **Recovery:**
  - Enter LTSA data manually in the enrichment panel

### Scenario: Generate BCREA forms (Phase 5)

- **Role:** Listing Agent or TC
- **Goal:** Auto-generate all 12 pre-filled BCREA forms
- **Preconditions:**
  - Price locked in Phase 4
  - FINTRAC identity complete
  - Form server running
- **Navigation:** Listing detail > Workflow > Phase 5, or Forms page
- **Steps:**
  1. Navigate to Phase 5 or the Forms page
  2. Select forms to generate (or "Generate All 12")
  3. Review each generated form for accuracy
  4. Download or print as needed
- **Expected outcome:**
  - All 12 forms generated and stored
- **Edge cases:**
  - Form server not running — connection error
- **Common mistakes:**
  - Trying to generate before locking price
- **Recovery:**
  - Go back to Phase 4 and lock the price first

### Scenario: Handle a price change after forms are generated

- **Role:** Agent (needs Admin for unlock)
- **Goal:** Change the price after Phase 4 lock
- **Preconditions:**
  - Price currently locked
  - Forms already generated in Phase 5
- **Steps:**
  1. Request price unlock from Admin
  2. Admin unlocks price in Phase 4
  3. Enter new price
  4. Re-lock the price
  5. Phase 5 resets — regenerate all 12 forms with new price
- **Expected outcome:**
  - New price reflected in all forms
- **Edge cases:**
  - Signed envelopes in Phase 6 also need re-sending
- **Common mistakes:**
  - Forgetting to regenerate forms after price change

### Scenario: Listing expires before MLS submission

- **Role:** Agent
- **Goal:** Handle an expired listing
- **Steps:**
  1. Change listing status to "Expired"
  2. Discuss with seller about re-listing
  3. If re-listing: create a NEW listing (new MLC required)
  4. Reference old listing data when setting up the new one
- **Expected outcome:**
  - Old listing marked expired, new listing created if needed
- **Edge cases:**
  - Seller wants to keep same price and terms — still needs new agreement

## Step-by-Step Procedures

### Procedure: Create a new listing

**When to use this:** Starting a new seller engagement.

**Starting point:** Any page > Click + button > Select Listing

**Steps:**
1. Click the + button in the header
2. Select "Listing" from the dropdown
3. Search for the seller contact by name
4. Enter the property address in full (e.g., "1234 Maple St, Vancouver, BC V6K 2A1")
5. Select property type from the dropdown
6. Enter initial asking price
7. Click Save

**System validations:**
- Seller contact is required
- Address cannot be empty
- Property type must be selected
- Price must be a positive number

**What happens next:**
- Draft listing created with Phase 1 active
- Workflow stepper appears
- Listing shows in your listings list

**Common mistakes:**
- Creating listing before adding seller as contact
- Incomplete address causes enrichment failure later

**How to recover:**
- Edit listing to change seller or fix address

### Procedure: Complete FINTRAC identity (Phase 1)

**When to use this:** During seller intake to satisfy FINTRAC requirements.

**Starting point:** Listing detail > Workflow > Phase 1 > FINTRAC section

**Steps:**
1. Open the FINTRAC section in Phase 1
2. Enter seller's full legal name
3. Enter date of birth
4. Enter citizenship status
5. Add first government ID (must be photo ID — passport or driver's license)
6. Add second government ID (can be non-photo — utility bill, bank statement)
7. Enter ID numbers, issue dates, and expiry dates
8. Enter occupation and employer
9. Save

**System validations:**
- Full name, DOB, and citizenship are required
- Two IDs required — at least one must be photo ID
- ID expiry dates must be in the future
- All fields are non-nullable in the database

**What happens next:**
- FINTRAC section shows complete
- Phase 1 can advance once all sections are done

**Common mistakes:**
- Only providing one ID instead of two
- Using expired ID documents

**How to recover:**
- Add the missing second ID
- Request updated ID from seller

### Procedure: Generate AI MLS remarks (Phase 7)

**When to use this:** After forms and signatures are complete, to create listing descriptions.

**Starting point:** Listing detail > Workflow > Phase 7

**Steps:**
1. Navigate to Phase 7 in the workflow
2. Click "Generate Public Remarks"
3. Review the AI-generated description (max 500 characters)
4. Edit if needed — adjust tone, add key selling points
5. Click "Generate REALTOR Remarks" for agent-to-agent notes
6. Review and edit agent remarks
7. Optionally generate social media captions and video prompts

**System validations:**
- Public remarks limited to 500 characters
- REALTOR remarks limited to 500 characters

**What happens next:**
- Remarks saved to listing record
- Ready for Phase 8 (MLS submission)

**Common mistakes:**
- Not editing AI-generated content before submitting to MLS

**How to recover:**
- Regenerate remarks or edit manually at any time before MLS submission

## Validations and Rules

- Listing address is required and cannot be empty
- Seller contact must be linked before any phase advances
- Phases must be completed sequentially — no skipping
- Price lock prevents changes without explicit admin unlock
- Unlocking price resets Phase 5 (forms must be regenerated)
- FINTRAC requires two government-issued IDs — one photo ID
- All 12 BCREA forms must be generated before Phase 6
- MLS remarks have 500-character maximum
- Status changes are logged with timestamps for audit

## Role Differences

| Role | Can View | Can Edit | Can Approve | Special Notes |
|------|----------|----------|-------------|---------------|
| Listing Agent | Yes | Yes (all phases) | No | Creates and advances listings |
| Transaction Coordinator | Yes | Yes (docs/status) | No | Manages documents and signatures |
| Admin | Yes | Yes | Yes | Can override locks and force-advance |
| Voice Agent | Yes | Yes (status/price/notes) | No | Voice commands via API bridge |

## Edge Cases

1. **Seller has no photo ID** — FINTRAC blocks Phase 1. Must obtain photo ID first.
2. **ParcelMap returns no data** — Rural property. Enter parcel data manually.
3. **Price change after forms generated** — Unlock resets Phase 5. All 12 forms regenerated.
4. **Form server down** — Phase 5 shows connection error. Wait and retry.
5. **Duplicate listing for same address** — Warning shown but not blocked. Verify intentional.
6. **Seller refuses to sign** — DocuSign envelope stays "Delivered." Follow up or withdraw.
7. **MLS remarks exceed 500 chars** — AI truncates. Edit before submitting.
8. **Listing expires** — Must create new listing with new MLC agreement.

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|-----------|-----------------|
| Phase 2 enrichment fails | Invalid address | Check address format | Correct address, re-run | If BC Geocoder API is down |
| Forms won't generate | Form server not running | Check localhost:8767 | Start the form server | If server crashes repeatedly |
| Phase won't advance | Previous phase incomplete | Check stepper for red items | Complete required fields | If stepper shows complete but blocked |
| Price lock button missing | Haven't reached Phase 4 | Check current phase | Complete Phases 1-3 | If phase tracking is wrong |
| DocuSign envelope stuck | Seller hasn't opened email | Check envelope status | Resend envelope | If envelope shows "Declined" |
| AI remarks empty | API key missing | Check configuration | Add Anthropic API key | If API returns errors |
| Listing not in search | Index not updated | Check voice agent search | Update listing to trigger re-index | If RAG service is down |
| Wrong phase showing | Database sync issue | Check listing record | Admin force-updates phase | If manual fix doesn't work |

## FAQ

### How do I create a new listing?
Click the + button in the header and select Listing. You'll need a seller contact and property address. The listing starts as a draft in Phase 1.

### Can I skip a phase?
No. Phases are sequential — each builds on the previous one. Phase 5 needs the locked price from Phase 4, which needs CMA data from Phase 3.

### What happens if I change the price after forms are generated?
The price must be unlocked (requires Admin), which resets Phase 5. All 12 forms must be regenerated with the new price.

### How many BCREA forms are generated?
12 forms: DORTS, MLC, PDS, FINTRAC, PRIVACY, C3, DRUP, MLS_INPUT, MKTAUTH, AGENCY, C3CONF, and FAIRHSG.

### What is the form server?
A Python application on port 8767 that converts listing data into pre-filled BCREA form HTML. If it's not running, Phase 5 shows a connection error.

### Can I edit AI-generated MLS remarks?
Yes. Phase 7 generates drafts using AI, but you can edit before MLS submission. Both public and REALTOR remarks are limited to 500 characters.

### What does Subject Removal mean?
All conditions in the Contract of Purchase and Sale have been waived. The deal is firm — backing out typically forfeits the deposit.

### How do I handle an expired listing?
Create a new listing. The old one stays as "Expired." You'll need a new MLC agreement, but can reference old listing data.

### Who can override a locked price?
Only Admin users. Agents can request an unlock, which resets Phase 5.

### What enrichment sources are used in Phase 2?
BC Geocoder (address/PID), ParcelMap BC (parcel boundaries), LTSA (title/charges), and BC Assessment (assessed value).

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| Contact Management | Seller must exist before listing | Cannot create listing without seller |
| FINTRAC Compliance | Identity verification in Phase 1 | Blocks advancement if incomplete |
| BC Forms Generation | Phase 5 generates forms | Requires form server |
| Showing Management | Showings linked to listings | Lockbox code set in Phase 1 |
| Deal Pipeline | Deals reference listings | Status affects deal stage |
| AI Content Engine | Phase 7 uses AI for remarks | Requires Anthropic API key |

## Escalation Guidance

**Fix yourself:** Address corrections, price changes, re-running enrichment, regenerating forms, editing remarks, re-sending envelopes.

**Needs admin:** Force-advancing a stuck phase, overriding a price lock, correcting phase tracking.

**Before escalating, gather:** Listing ID (from URL), current phase number, error message or screenshot, what you were trying to do.

**How to escalate:** Click the ? button and select "Still need help?", or contact your brokerage admin with the listing ID.
