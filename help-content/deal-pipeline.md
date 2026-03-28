---
title: "Deal Pipeline"
slug: "deal-pipeline"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: ["/pipeline"]
changelog: []
---

# Deal Pipeline

## Problem Statement

BC realtors juggle multiple active deals at once — some as the listing agent, others as the buyer agent — each at a different stage with different deadlines, parties, and document requirements. Without a visual system to track deal progression, critical milestones get missed: subject removal deadlines pass, mortgage conditions expire, and closing checklists remain incomplete. RealtorAI provides a Kanban-style pipeline that gives you an instant visual snapshot of every deal's stage, value, and next action, so nothing falls through the cracks.

## Business Value

A missed subject removal deadline can kill a deal worth hundreds of thousands of dollars. The deal pipeline centralizes every active transaction in one visual board, with stage-specific checklists that auto-populate so you always know what needs to happen next. Commission tracking and close date visibility let you forecast your income accurately, while the drag-and-drop interface means updating deal status takes seconds, not minutes of data entry.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Creates seller deals, tracks offers, manages closing checklist |
| **Buyer Agent** | Full access | Creates buyer deals, tracks showing-to-offer progression |
| **Transaction Coordinator** | Full access | Manages checklists, updates mortgage details, coordinates parties |
| **Admin** | Full access | Views pipeline-wide metrics, manages all deals |

## Where to Find It

- Click **Pipeline** in the top navigation bar
- The Kanban board displays all active deals as cards organized by stage
- Drag cards between stage columns to advance or move deals
- Click any deal card to open its detail page at `/pipeline/[id]`

## Preconditions

- You must be logged in
- To link a deal to a listing, the listing must already exist in the system
- To link a deal to a contact, the contact must already exist in the system
- Commission percentage requires a deal value to calculate the dollar amount

## Key Concepts

| Term | Definition |
|------|-----------|
| Deal Type | Either Buyer or Seller — determines which stage progression the deal follows |
| Stage | The current phase of the transaction, from initial lead through closing |
| Deal Card | A visual card on the Kanban board showing deal title, contact, value, and stage |
| Parties | The people involved in the deal: agents, lawyers, lenders, and other professionals |
| Checklist | A stage-specific list of tasks that auto-populates when a deal enters a new stage |
| Commission % | The agreed commission percentage, used with deal value to calculate your earnings |
| Close Date | The expected or actual closing date for the transaction |
| Deal Value | The transaction price or expected sale price of the property |

## Core Workflow

1. Navigate to /pipeline and click the button to create a new deal
2. Select the deal type: Buyer or Seller
3. Enter the deal title, link a contact and optionally a listing
4. Set the deal value, commission percentage, and expected close date
5. The deal appears as a card in the first stage column
6. Drag the card to the next stage as the deal progresses
7. Click the card to open the detail page, manage the checklist, and add parties
8. Complete stage checklists and update mortgage details as applicable
9. Move the deal to Closed when the transaction completes

## End-to-End Scenarios

### Scenario: Create and progress a buyer deal from lead to closing

- **Role:** Buyer Agent
- **Goal:** Track a new buyer from initial contact through to a closed purchase
- **Navigation:** Click Pipeline in the top nav
- **Steps:**
  1. Click Create Deal
  2. Select type: Buyer
  3. Enter title (e.g., "Chen Family — Burnaby Condo")
  4. Link the buyer contact from the dropdown
  5. Set estimated deal value and your commission percentage
  6. Set expected close date
  7. Deal appears in New Lead column
  8. After qualifying the buyer, drag the card to Qualified
  9. After booking showings, drag to Showing
  10. After submitting an offer, drag to Offer
  11. Continue through Conditional, Subject Removal, Closing, and finally Closed
- **Expected outcome:** Deal progresses across all 8 buyer stages with checklists completed at each stage
- **Edge cases:** Buyer backs out after offer; deal stalls in conditional stage
- **Common mistakes:** Forgetting to update the deal value when the actual offer amount differs from the estimate
- **Recovery:** Open the deal detail page and update the value and commission fields

### Scenario: Create a seller deal and track through to closing

- **Role:** Listing Agent
- **Goal:** Track a new seller listing from pre-listing through to closed sale
- **Navigation:** Click Pipeline in the top nav
- **Steps:**
  1. Click Create Deal
  2. Select type: Seller
  3. Enter title (e.g., "Park Residence — 456 Oak St")
  4. Link the seller contact and the listing
  5. Set list price as deal value and commission percentage
  6. Deal appears in Pre-Listing column
  7. After listing goes live, drag to Listed
  8. As showings occur, drag to Showing
  9. When an offer comes in, drag to Offer Received
  10. Move through Conditional, Subject Removal, Closing, and Closed
- **Expected outcome:** Seller deal tracks the full lifecycle with linked listing data
- **Edge cases:** Multiple offers received; listing expires without an offer
- **Common mistakes:** Not linking the listing to the deal, which means form data does not flow through
- **Recovery:** Edit the deal detail page and link the listing from the dropdown

### Scenario: Add parties to a deal

- **Role:** Transaction Coordinator
- **Goal:** Record all professionals involved in a transaction
- **Navigation:** Click Pipeline, then click a deal card to open the detail page
- **Steps:**
  1. Open the deal detail page
  2. Navigate to the Parties section
  3. Add the buyer's lawyer with name, firm, phone, and email
  4. Add the mortgage lender with name, institution, and contact details
  5. Add the cooperating agent if applicable
  6. Save the parties
- **Expected outcome:** All deal parties are recorded and accessible from the deal detail page
- **Edge cases:** A party changes mid-transaction (e.g., buyer switches lawyers)
- **Common mistakes:** Entering incomplete contact information for parties
- **Recovery:** Edit the party record and add the missing fields

### Scenario: Manage a deal checklist through subject removal

- **Role:** Listing Agent
- **Goal:** Ensure all conditions are met before subject removal deadline
- **Navigation:** Click Pipeline, click the deal card in the Conditional stage
- **Steps:**
  1. Open the deal detail page
  2. Review the auto-populated checklist for the Conditional stage
  3. Mark items as complete: home inspection done, financing confirmed, title search clear
  4. Update mortgage details with lender approval status
  5. Once all items are checked, drag the deal to Subject Removal
  6. Verify the subject removal date matches the contract
- **Expected outcome:** All checklist items completed, deal moves to Subject Removal with a clean record
- **Edge cases:** One condition is not met by the deadline; buyer requests an extension
- **Common mistakes:** Moving the deal to Subject Removal before all conditions are actually met
- **Recovery:** Drag the deal back to Conditional and address the outstanding items

### Scenario: Track commission and close date across multiple deals

- **Role:** Agent
- **Goal:** Forecast upcoming income from active deals
- **Navigation:** Click Pipeline in the top nav
- **Steps:**
  1. Review all deal cards on the Kanban board
  2. Note the deal value and commission percentage visible on each card
  3. Click into deals nearing their close date to verify status
  4. Confirm that deals in Closing stage have complete checklists
  5. Update close dates if any have shifted
- **Expected outcome:** Accurate view of upcoming closings and expected commission income
- **Edge cases:** A deal's close date changes after the original estimate; a deal falls through at the last stage
- **Common mistakes:** Not updating the close date when it changes, leading to inaccurate forecasting
- **Recovery:** Open each deal in Closing or Subject Removal stage and verify close dates match the contract

## Step-by-Step Procedures

### Procedure: Create a new deal

- **When to use:** You have a new buyer lead or seller listing to track through closing
- **Starting point:** /pipeline page
- **Steps:**
  1. Click the Create Deal button
  2. Select deal type: Buyer or Seller
  3. Enter a descriptive title (contact name + property or area)
  4. Select the initial stage from the dropdown
  5. Link a contact from the contacts dropdown
  6. Optionally link a listing from the listings dropdown
  7. Enter the deal value (purchase price or list price)
  8. Enter your commission percentage
  9. Set the expected close date
  10. Click Save
- **Validations:** Title is required; deal type must be selected; value must be a positive number; commission percentage must be between 0 and 100
- **What happens next:** The deal card appears in the selected stage column on the Kanban board. The stage checklist auto-populates.
- **Common mistakes:** Setting the wrong deal type (Buyer vs Seller), which assigns the wrong stage progression
- **Recovery:** Edit the deal and change the type, which will reset the available stages

### Procedure: Move a deal between stages

- **When to use:** A deal has progressed to the next milestone
- **Starting point:** /pipeline Kanban board
- **Steps:**
  1. Locate the deal card on the board
  2. Click and drag the card to the target stage column
  3. Drop the card in the new column
  4. The stage updates immediately and the new stage's checklist loads
- **Validations:** The stage must be a valid next step in the deal type's progression
- **What happens next:** The deal card moves to the new column. The checklist for the new stage auto-populates on the deal detail page.
- **Common mistakes:** Skipping stages (e.g., jumping from Qualified directly to Offer)
- **Recovery:** Drag the deal back to the correct stage and progress sequentially

### Procedure: Update mortgage details on a deal

- **When to use:** The buyer has mortgage pre-approval or the lender provides updated terms
- **Starting point:** /pipeline/[id] deal detail page
- **Steps:**
  1. Open the deal detail page by clicking the deal card
  2. Navigate to the Mortgage Details section
  3. Enter or update: lender name, pre-approval amount, interest rate, mortgage type
  4. Note any conditions from the lender
  5. Save the changes
- **Validations:** Pre-approval amount should not exceed deal value
- **What happens next:** Mortgage details are saved to the deal record and visible to anyone reviewing the deal
- **Common mistakes:** Not updating when the lender revises terms after the initial pre-approval
- **Recovery:** Edit the mortgage details section and update with the latest figures

## Validations and Rules

- Deal title is required and should be descriptive (include contact name or property address)
- Deal type (Buyer or Seller) determines the available stages and cannot be changed after creation without resetting stage progression
- Deal value must be a positive number
- Commission percentage must be between 0 and 100
- Close date should be in the future for active deals
- Buyer stage progression: New Lead → Qualified → Showing → Offer → Conditional → Subject Removal → Closing → Closed
- Seller stage progression: Pre-Listing → Listed → Showing → Offer Received → Conditional → Subject Removal → Closing → Closed
- Checklist items auto-populate when a deal enters a new stage
- A deal should not be moved to Closed until all checklist items in the final stage are complete

## Role Differences

| Role | Can View | Can Edit | Special Notes |
|------|----------|----------|---------------|
| **Listing Agent** | All deals | Full edit on their deals | Typically manages seller-side deals |
| **Buyer Agent** | All deals | Full edit on their deals | Typically manages buyer-side deals |
| **Transaction Coordinator** | All deals | Checklists, parties, mortgage details | Focuses on administrative completeness |
| **Admin** | All deals | Full edit on all deals | Can reassign deals between agents |

## Edge Cases

1. **Deal linked to a listing that gets deleted:** The deal remains but loses the listing reference. Relink to the correct listing or create a replacement listing.
2. **Commission percentage entered as a dollar amount instead of a percentage:** The system expects a percentage (e.g., 3.5, not 35000). Verify the commission field shows a reasonable percentage.
3. **Deal dragged to the wrong stage accidentally:** Drag it back to the correct stage immediately. The checklist will revert to the appropriate stage's items.
4. **Multiple deals for the same property:** This can happen legitimately (e.g., a buyer deal and a seller deal for the same listing). Both appear independently on the board. Ensure each is linked to the correct contact.
5. **Close date passes without the deal reaching Closed stage:** The deal card remains in its current stage. Update the close date or move the deal to Closed if the transaction has completed offline.
6. **Contact linked to the deal is deleted:** The deal remains but shows no linked contact. Re-link to a new or corrected contact record.

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|------------|-----------------|
| Deal card does not appear after creation | Page did not refresh, or deal was saved with an error | Refresh the /pipeline page; check if the deal exists at /pipeline/[id] | Refresh the page; if still missing, recreate the deal | If deals consistently fail to save |
| Drag and drop not working | Browser compatibility issue or JavaScript error | Try a different browser; check the browser console for errors | Clear browser cache and reload; use Chrome or Edge | If drag and drop fails across all browsers |
| Checklist not auto-populating | The deal was moved to a stage that does not have a predefined checklist | Check the deal detail page for the checklist section | Manually add checklist items; report the missing stage template | If no stages have auto-populated checklists |
| Commission calculation seems wrong | Percentage was entered incorrectly or deal value is outdated | Open deal detail and verify both the value and commission % fields | Correct the value or percentage and save | If the calculated amount does not match the formula (value x %) |
| Deal shows wrong stage after drag | Network lag caused the update to fail | Refresh the page and check the deal's current stage | Drag the deal to the correct stage again | If stage updates consistently fail to persist |

## FAQ

### Can I have both a buyer deal and a seller deal for the same property?

Yes. It is common to represent both sides of a transaction. Create a Buyer deal linked to the buyer contact and a Seller deal linked to the seller contact. Both can reference the same listing.

### What happens to the checklist when I move a deal backwards to a previous stage?

The checklist updates to show the items for the stage you moved to. Completed items from previously visited stages are retained in the deal history, but the active checklist reflects the current stage.

### Can I customize the stages for a deal?

The stage progressions (8 stages each for Buyer and Seller) are predefined to match the BC real estate transaction lifecycle. You cannot add or remove stages, but you can skip stages by dragging a deal past them if a particular stage does not apply.

### How is commission calculated?

Commission is calculated as the deal value multiplied by the commission percentage. For example, a $900,000 deal at 2.5% commission equals $22,500. This calculation updates automatically when you change either the value or the percentage.

### Can I delete a deal?

You can close or archive a deal, but deletion is permanent. If a deal falls through, move it to a final state and note the reason in the deal details rather than deleting it, so you retain the history for future reference.

### Is there a limit to how many deals I can have on the board?

There is no system limit. However, for visual clarity, the Kanban board works best with up to 30-40 active deals. Completed deals in the Closed stage can be filtered out to keep the board clean.

### Can I set reminders for deal milestones like subject removal deadlines?

Checklist items serve as your milestone tracker. When a deal enters the Conditional stage, the checklist includes items for each condition with their deadlines. Mark items complete as conditions are satisfied to track progress toward subject removal.

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| **Contact Management** | Deals are linked to buyer or seller contacts | Contact must exist to link to a deal |
| **Listing Workflow** | Seller deals can be linked to listings for data integration | Listing data flows into deal details |
| **Showing Management** | Showings advance buyer deals from the Showing stage | Confirmed showings feed into deal pipeline activity |
| **Email Marketing** | Deal stage changes can trigger automated emails (e.g., congratulations on closing) | Journey phase advancement is tied to deal progression |
| **BC Forms Generation** | Deal-linked listings can generate pre-filled BCREA forms | Forms pull data from both the listing and the deal record |

## Escalation Guidance

**Fix yourself:**
- Wrong deal value or commission — edit the deal detail page
- Deal in wrong stage — drag it to the correct column
- Missing contact or listing link — edit the deal and add the link
- Incomplete checklist — manually add missing items

**Needs admin:**
- Kanban board not loading or displaying incorrectly — may be a front-end rendering issue
- Deal data not persisting after edits — may be a database connection issue
- Stage progression logic seems incorrect — requires code-level investigation

**Information to gather before escalating:**
- The deal ID (from the URL: /pipeline/[id])
- The deal type (Buyer or Seller) and current stage
- What action you attempted and what happened instead
- Screenshots of the Kanban board and deal detail page
- Browser name and version
