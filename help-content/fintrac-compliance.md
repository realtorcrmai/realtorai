---
title: "FINTRAC Compliance"
slug: "fintrac-compliance"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: ["/contacts"]
changelog: []
---

# FINTRAC Compliance & Identity Verification

## Problem Statement

Canadian anti-money laundering law (Proceeds of Crime Act) requires every real estate agent to verify the identity of ALL clients — buyers and sellers — before providing trading services. This means collecting two government-issued IDs, recording occupation and source of funds, and retaining records for five years. Failure to comply risks fines up to $2 million and criminal prosecution. Without automation, agents track FINTRAC requirements on paper or spreadsheets, miss required fields, and lack an audit trail for compliance reviews.

RealtorAI embeds FINTRAC identity verification directly into the listing workflow (Phase 1) and contact profiles, ensuring every required field is captured, validated, and permanently stored with timestamps.

## Business Value

FINTRAC compliance is not optional — it's federal law. Every brokerage faces regulatory audits where they must demonstrate they collected proper identity for every transaction. RealtorAI automates the collection, validates completeness (two IDs, photo ID requirement), and creates a permanent audit trail. This eliminates the #1 compliance risk for BC realtors: incomplete or missing identity records.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Collects seller identity during listing intake (Phase 1) |
| **Buyer's Agent** | Full access | Collects buyer identity before showing properties |
| **Admin** | Full access + audit | Reviews compliance records, runs audit reports |
| **Transaction Coordinator** | View + limited edit | Verifies documents are complete, flags missing items |

## Where to Find It

- During listing creation: **Listings** > Create Listing > **Phase 1 (Seller Intake)** > FINTRAC section
- On any contact profile: **Contacts** > [Contact Name] > FINTRAC tab
- The FINTRAC form is one of the 12 BCREA forms generated in Phase 5

## Preconditions

- Seller or buyer contact must exist in RealtorAI
- Two government-issued IDs must be available from the client
- At least one ID must be a photo ID (passport or driver's license)
- ID documents must not be expired

## Key Concepts

| Term | Definition |
|------|-----------|
| FINTRAC | Financial Transactions and Reports Analysis Centre of Canada — the federal AML regulator |
| Two-ID Rule | Every client requires two government-issued IDs. One must be a photo ID. |
| Photo ID | Passport, driver's license, or provincial photo ID card |
| Secondary ID | Birth certificate, citizenship card, utility bill with address, or bank statement |
| Source of Funds | Documentation of where the money for the transaction is coming from |
| Beneficial Ownership | For corporations: identifying all individuals who own 25%+ of the entity |
| STR | Suspicious Transaction Report — filed with FINTRAC if money laundering is suspected |
| LCTR | Large Cash Transaction Report — required for cash transactions of $10,000+ |
| PEP | Politically Exposed Person — requires enhanced due diligence |
| Record Retention | All FINTRAC records must be kept for minimum 5 years from transaction date |

## Core Workflow

1. Create or open a contact (buyer or seller)
2. Navigate to FINTRAC section (Phase 1 for listings, or contact profile)
3. Enter client's full legal name and date of birth
4. Enter citizenship status (Canadian or non-resident)
5. Add first ID: photo ID (passport or driver's license) with number and expiry
6. Add second ID: secondary source with number and expiry
7. Enter occupation and employer
8. If corporate client: verify entity and list all beneficial owners (25%+)
9. If cash transaction: document source of funds
10. Save — system validates completeness and timestamps the record

## End-to-End Scenarios

### Scenario: Complete FINTRAC for a Canadian seller

- **Role:** Listing Agent
- **Goal:** Verify seller identity during Phase 1 intake
- **Navigation:** Listings > [Listing] > Workflow > Phase 1 > FINTRAC section
- **Steps:**
  1. Open listing workflow, click Phase 1
  2. Scroll to FINTRAC Identity section
  3. Enter seller's full legal name
  4. Enter date of birth
  5. Select citizenship: Canadian
  6. Add photo ID: driver's license, number BC1234567, expiry 2028-06-15
  7. Add second ID: passport, number AB123456, expiry 2030-01-20
  8. Enter occupation: "Software Engineer" at "Tech Corp"
  9. Save
- **Expected outcome:** FINTRAC section shows green checkmark, Phase 1 can advance
- **Edge cases:** Seller has expired driver's license — must use another valid photo ID
- **Common mistakes:** Only providing one ID instead of two
- **Recovery:** Go back and add the missing second ID

### Scenario: FINTRAC for a corporate buyer

- **Role:** Buyer's Agent
- **Goal:** Verify identity for a numbered company purchasing property
- **Navigation:** Contacts > [Corporation Contact] > FINTRAC tab
- **Steps:**
  1. Open the corporate contact profile
  2. Navigate to FINTRAC section
  3. Enter corporation legal name and registration number
  4. Add articles of incorporation document
  5. List all beneficial owners (25%+ ownership)
  6. For each beneficial owner: full name, DOB, two IDs, occupation
  7. If any owner is a PEP: flag for enhanced due diligence
  8. Save
- **Expected outcome:** Corporate identity verified with all beneficial owners documented
- **Edge cases:** Beneficial ownership structure is complex (holding companies)
- **Common mistakes:** Not identifying ALL beneficial owners over 25%
- **Recovery:** Request corporate structure chart from buyer's lawyer

### Scenario: Handle a suspicious transaction

- **Role:** Agent
- **Goal:** File a Suspicious Transaction Report when red flags appear
- **Steps:**
  1. Identify suspicious indicators (cash-heavy purchase, reluctance to provide ID, inconsistent occupation/price)
  2. Do NOT tip off the client
  3. Document your observations in the FINTRAC notes section
  4. Contact your brokerage compliance officer immediately
  5. Compliance officer files STR with FINTRAC within 30 days
- **Expected outcome:** STR filed, documented in audit trail
- **Edge cases:** Client becomes hostile when asked for documentation
- **Common mistakes:** Telling the client you're filing an STR (this is illegal — "tipping off")
- **Recovery:** If in doubt, always file — it's safer to over-report than under-report

### Scenario: Non-resident buyer

- **Role:** Agent
- **Goal:** Complete FINTRAC for a non-Canadian buyer
- **Steps:**
  1. Open contact profile > FINTRAC section
  2. Set citizenship to "Non-Resident"
  3. Add passport as primary photo ID
  4. Add secondary ID from home country
  5. Document source of funds (wire transfer from foreign bank, etc.)
  6. Note any additional PTT implications (non-resident surcharge)
- **Expected outcome:** Identity verified with non-resident flag
- **Edge cases:** Foreign IDs may not have the same format as Canadian ones
- **Common mistakes:** Not documenting source of funds for international transfers

### Scenario: Audit preparation

- **Role:** Admin
- **Goal:** Prepare for a FINTRAC compliance audit
- **Steps:**
  1. Review all transactions from the audit period
  2. Check each listing's Phase 1 FINTRAC section for completeness
  3. Verify two IDs on file for every seller
  4. Check that all records are within the 5-year retention window
  5. Export compliance report
- **Expected outcome:** All records complete and available for auditor
- **Edge cases:** Records from before RealtorAI adoption may be missing
- **Common mistakes:** Not checking expiry dates on stored IDs

## Step-by-Step Procedures

### Procedure: Add FINTRAC identity to a listing

**When to use this:** During seller intake in Phase 1 of the listing workflow.

**Starting point:** Listings > [Listing] > Workflow > Phase 1 > FINTRAC section

**Steps:**
1. Open the listing's workflow page
2. Click Phase 1 (Seller Intake)
3. Find the FINTRAC Identity section
4. Enter full legal name exactly as it appears on ID
5. Enter date of birth (YYYY-MM-DD format)
6. Select citizenship (Canadian / Non-Resident)
7. Click "Add ID" and select ID type (Passport, Driver's License, etc.)
8. Enter ID number and expiry date
9. Repeat for second ID
10. Enter occupation and employer name
11. Click Save

**System validations:**
- Full name is required (non-nullable)
- Date of birth is required (non-nullable)
- Citizenship is required (non-nullable)
- Two IDs required — system blocks save with only one
- At least one ID must be a photo ID type
- ID expiry dates must be in the future
- All FINTRAC fields are non-nullable in the database

**What happens next:**
- FINTRAC section shows green checkmark
- Phase 1 progress bar updates
- Data stored permanently with timestamp for 5-year retention
- FINTRAC form auto-fills with this data in Phase 5

**Common mistakes:**
- Entering a nickname instead of legal name (must match ID exactly)
- Using expired IDs
- Only providing one ID

**How to recover:**
- Edit the FINTRAC section to correct name or add missing ID
- Request updated ID documents from seller

### Procedure: Verify a corporate entity

**When to use this:** When the buyer or seller is a corporation, not an individual.

**Starting point:** Contacts > [Corporate Contact] > FINTRAC tab

**Steps:**
1. Open the corporation's contact profile
2. Navigate to FINTRAC section
3. Enter corporation legal name and business number
4. Upload or reference articles of incorporation
5. Click "Add Beneficial Owner"
6. For each person with 25%+ ownership: enter name, DOB, two IDs, occupation
7. If any owner is a PEP or HIO: check the flag and document
8. Save

**System validations:**
- Corporation name and registration required
- At least one beneficial owner required
- Each beneficial owner needs the same two-ID verification as individuals

**What happens next:**
- Corporate identity verified
- All beneficial owners documented
- PEP flags trigger enhanced due diligence requirement

**Common mistakes:**
- Missing beneficial owners (not all 25%+ shareholders identified)
- Not checking for PEP status

**How to recover:**
- Request complete shareholder registry from the corporation's lawyer

### Procedure: Document source of funds

**When to use this:** When a transaction involves cash, or funds appear inconsistent with the client's stated occupation.

**Starting point:** Contact FINTRAC section > Source of Funds

**Steps:**
1. Open the contact's FINTRAC section
2. Navigate to Source of Funds
3. Select fund source type (employment income, investment, inheritance, sale of property, gift, other)
4. Enter description of fund origin
5. For cash $10,000+: note that LCTR is required
6. Add supporting documentation if available
7. Save

**System validations:**
- Source type is required for all transactions
- Description required if "other" selected

**What happens next:**
- Fund source documented in permanent record
- Available for compliance audit review

**Common mistakes:**
- Not asking about source of funds at all
- Accepting vague answers ("personal savings") without follow-up

**How to recover:**
- Follow up with client for more specific documentation

## Validations and Rules

- Full name, DOB, and citizenship are required — database fields are non-nullable
- Two government-issued IDs required per person
- At least one ID must be a photo ID (passport or driver's license)
- ID expiry dates must be in the future at time of entry
- Source of funds must be documented for cash transactions
- Large cash transactions ($10,000+) require LCTR filing
- All records retained for minimum 5 years from transaction date
- STRs must be filed within 30 days of suspicion
- PEPs require enhanced due diligence and senior management approval
- Beneficial ownership verification required for entities with 25%+ owners
- FINTRAC identity blocks Phase 1 completion if incomplete

## Role Differences

| Role | Can View | Can Edit | Special Notes |
|------|----------|----------|---------------|
| Listing Agent | Yes | Yes | Collects identity during Phase 1 |
| Buyer's Agent | Yes | Yes | Collects buyer identity before services |
| Admin | Yes | Yes | Can audit all records, run compliance reports |
| TC | Yes | Limited | Can verify completeness, flag missing items |

## Edge Cases

1. **Seller has no photo ID** — Cannot complete FINTRAC. Must obtain valid photo ID before proceeding.
2. **Expired ID provided** — System rejects. Client must provide current, unexpired ID.
3. **Corporate buyer with complex ownership** — May require legal counsel to determine beneficial owners.
4. **Client refuses to provide ID** — Cannot provide trading services. Must decline the engagement.
5. **PEP identified** — Requires enhanced due diligence and senior management approval before proceeding.
6. **Non-Canadian IDs** — Accepted but may need translation. Note the issuing country.
7. **Cash transaction over $10,000** — LCTR must be filed. Document in FINTRAC section.

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|-----------|-----------------|
| Phase 1 won't advance | FINTRAC section incomplete | Check for red/missing fields | Complete all required fields | If fields show complete but still blocked |
| Can't save FINTRAC data | Required field empty | Look for red validation errors | Fill in all non-nullable fields | If save fails with no visible error |
| ID expiry warning | ID will expire soon | Check expiry date on ID | Request renewed ID from client | If client cannot provide valid ID |
| Corporate verification stuck | Missing beneficial owners | Review shareholder list | Add all 25%+ owners | If ownership structure is unclear |
| FINTRAC form blank in Phase 5 | Phase 1 data not saved | Go back to Phase 1, check saved data | Re-enter and save FINTRAC data | If data was saved but form is still blank |

## FAQ

### What IDs are acceptable for FINTRAC?
Photo IDs: passport, driver's license, provincial photo ID card. Secondary IDs: birth certificate, citizenship card, permanent resident card, utility bill showing address, bank statement.

### Do I need FINTRAC for both buyer and seller?
Yes. Every client — buyer and seller — requires identity verification before you provide any trading services.

### How long must I keep FINTRAC records?
Minimum 5 years from the date of the transaction. RealtorAI stores these permanently with timestamps.

### What if a client refuses to provide ID?
You cannot provide trading services. You must decline the engagement. This is not negotiable under federal law.

### When do I file a Suspicious Transaction Report?
When you have reasonable grounds to suspect money laundering or terrorist financing. File within 30 days. Do NOT tell the client you're filing — "tipping off" is illegal.

### What's a PEP and why does it matter?
Politically Exposed Person — a current or former senior political figure, or their family/close associates. PEPs require enhanced due diligence and senior management approval before you can provide services.

### Do non-resident buyers need different documentation?
Same two-ID requirement, but IDs can be from their home country. You must also document source of funds, especially for international wire transfers. Note additional PTT implications for non-residents.

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| Listing Workflow | FINTRAC is Phase 1 of listing setup | Blocks phase advancement if incomplete |
| Contact Management | Identity stored on contact profile | Available across all listings for this contact |
| BC Forms Generation | FINTRAC form auto-fills from Phase 1 data | One of the 12 generated forms |

## Escalation Guidance

**Fix yourself:** Enter or correct FINTRAC identity data, add missing IDs, update expiry dates.

**Needs compliance officer:** Suspicious Transaction Reports, PEP enhanced due diligence, complex corporate ownership structures, client refusals.

**Before escalating, gather:** Client name, what IDs were provided, specific concern or red flag, listing ID if applicable.

**How to escalate:** Contact your brokerage compliance officer directly. For STRs, do NOT discuss with the client first.
