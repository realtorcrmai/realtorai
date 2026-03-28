---
title: "Contact Management"
slug: "contact-management"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: ["/contacts"]
changelog: []
---

# Contact Management

## Problem Statement

BC realtors manage dozens of buyers, sellers, agents, and partners at different lifecycle stages. Without a centralized system, leads fall through the cracks, follow-up is inconsistent, and referral networks go untapped. RealtorAI provides a unified profile per person — their pipeline stage, communication history, engagement score, household groupings, and relationship graph — so you can see the full picture and act immediately.

## Business Value

Every missed follow-up is a lost deal. Contact management centralizes all people in your business — buyers, sellers, agents, partners — with their full history, engagement data, and AI-scored readiness. The stage pipeline ensures no lead goes cold, while household grouping and relationship tracking reveal referral networks that drive repeat business.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Creates contacts, sends messages, tracks pipeline stages |
| **Transaction Coordinator** | Full access | Updates documents, manages task checklists per contact |
| **Admin** | Full access + merge | Can merge duplicates, bulk import, manage segments |

## Where to Find It

- Click **Contacts** in the top navigation bar
- The sidebar shows all contacts with type and stage filters
- Click any contact to open their full profile
- To add a contact: click the **+** button in the header and select **Contact**

## Preconditions

- You must be logged in
- To send SMS/WhatsApp: Twilio must be configured
- To send email: contact must have an email address
- To merge contacts: requires admin role

## Key Concepts

| Term | Definition |
|------|-----------|
| Contact Type | Buyer, Seller, Lead, Agent, or Partner — determines which journey and emails they receive |
| Lead Status | New, Warm, Hot, Cold, or Dormant — indicates how active this lead is |
| Stage Bar | Pipeline progress tracker: New → Qualified → Active Search → Under Contract → Closed |
| Engagement Score | AI-computed 0-100 score based on email opens, clicks, and interaction frequency |
| Household | Groups related contacts (e.g., spouses buying together) into a family unit |
| Preferred Channel | How this contact prefers to be reached: SMS, WhatsApp, Email, or Phone |
| Newsletter Intelligence | JSONB data tracking click history, inferred interests, price range, areas of interest |

## Core Workflow

1. Add a new contact (name, phone, email, type)
2. Contact appears in sidebar with their type badge
3. Click to open full profile — see communication history, tasks, properties
4. Send messages via SMS, WhatsApp, or email directly from the profile
5. Move contact through pipeline stages as relationship progresses
6. AI tracks engagement (email opens, clicks) and updates the engagement score
7. View hot leads on the email marketing dashboard for immediate follow-up

## End-to-End Scenarios

### Scenario: Add a new buyer lead

- **Role:** Agent
- **Goal:** Capture a new buyer's details from a phone inquiry
- **Navigation:** Click + button > Contact
- **Steps:**
  1. Click + and select Contact
  2. Enter name, phone number, and email
  3. Set type to "Buyer"
  4. Set lead status to "New"
  5. Set preferred channel (SMS or Email)
  6. Add notes about what they're looking for
  7. Click Save
- **Expected outcome:**
  - Contact appears in sidebar under Buyers filter
  - Stage bar shows "New" as first stage
  - AI auto-enrolls in buyer nurture journey
- **Edge cases:**
  - Duplicate phone/email detected — system warns before creating
- **Common mistakes:**
  - Setting wrong contact type (Seller instead of Buyer)
- **Recovery:**
  - Edit contact and change the type field

### Scenario: Send an SMS to a contact

- **Role:** Agent
- **Goal:** Quick follow-up message to a buyer after a showing
- **Navigation:** Contacts > [Contact Name] > Quick Action Bar
- **Steps:**
  1. Open the contact's profile
  2. Click "Text Message" in the quick action bar
  3. Type your message
  4. Click Send
  5. System sends via Twilio with automatic TCPA footer
- **Expected outcome:**
  - Message appears in Communication timeline
  - Contact receives SMS with "Reply STOP to opt out" footer
- **Edge cases:**
  - Contact has no phone number — SMS button disabled
  - Contact has opted out (STOP) — sending blocked
- **Common mistakes:**
  - Sending to wrong number (typo in phone field)
- **Recovery:**
  - Edit contact phone number, resend message

### Scenario: Merge duplicate contacts

- **Role:** Admin
- **Goal:** Combine two records for the same person
- **Navigation:** Contacts > Merge
- **Steps:**
  1. Navigate to /contacts/merge
  2. Search for the duplicate contacts
  3. Select which record to keep as primary
  4. Review merged data (communications, tasks, properties combine)
  5. Confirm merge
- **Expected outcome:**
  - Single contact record with all history from both
  - Duplicate removed
- **Edge cases:**
  - Contacts have different types (one buyer, one seller) — choose carefully
- **Common mistakes:**
  - Merging contacts that aren't actually the same person
- **Recovery:**
  - Merge cannot be undone — verify before confirming

### Scenario: Track a contact through the buyer pipeline

- **Role:** Agent
- **Goal:** Move a buyer from initial lead to closing
- **Navigation:** Contacts > [Contact] > Stage Bar
- **Steps:**
  1. Open contact profile
  2. View current stage in the stage bar (e.g., "New")
  3. Complete stage-specific tasks (qualify budget, schedule showing)
  4. Click to advance to next stage ("Qualified")
  5. Continue through: Active Search → Under Contract → Closed
- **Expected outcome:**
  - Stage bar updates with completion percentage per stage
  - Tasks auto-populate for each new stage
- **Edge cases:**
  - Contact goes cold — set lead status to "Cold" or "Dormant"
- **Common mistakes:**
  - Advancing stage before completing required tasks

### Scenario: View contact engagement intelligence

- **Role:** Agent
- **Goal:** Check how engaged a buyer is before calling
- **Navigation:** Contacts > [Contact] > Intelligence tab
- **Steps:**
  1. Open contact profile
  2. Click Intelligence tab
  3. View engagement score (0-100)
  4. Check recent email opens, clicks, and last interaction
  5. See inferred interests (property types, price range, neighborhoods)
- **Expected outcome:**
  - Clear picture of how active this contact is
  - Data to personalize your conversation
- **Edge cases:**
  - New contact with no email history — score is 0

## Step-by-Step Procedures

### Procedure: Create a new contact

**When to use this:** When you meet a new prospect, receive a referral, or get an inquiry.

**Starting point:** Any page > Click + button > Select Contact

**Steps:**
1. Click the + button in the header
2. Select "Contact" from the dropdown
3. Enter full name
4. Enter phone number (system auto-formats with +1 prefix)
5. Enter email address
6. Select contact type: Buyer, Seller, Lead, Agent, or Partner
7. Set preferred communication channel
8. Set lead status (default: New)
9. Add optional notes
10. Click Save

**System validations:**
- Name is required
- At least one contact method (phone or email) required
- System warns if phone or email already exists (duplicate detection)

**What happens next:**
- Contact appears in sidebar list
- Stage bar initializes at "New"
- If buyer/seller: auto-enrolled in nurture journey
- Voice agent can now find this contact by name

**Common mistakes:**
- Forgetting to set the contact type
- Not adding phone number (can't send SMS later)

**How to recover:**
- Edit contact anytime to add missing fields

### Procedure: Send a message from the contact profile

**When to use this:** When you need to follow up with a contact.

**Starting point:** Contacts > [Contact Name] > Quick Action Bar

**Steps:**
1. Open the contact's profile page
2. Click "Text Message" for SMS or "Call" for phone
3. For SMS: type your message in the composer
4. Click Send
5. Message appears in the Communication timeline below

**System validations:**
- SMS requires a phone number on the contact
- WhatsApp requires phone number and WhatsApp configured
- CASL/TCPA: automatic opt-out footer added to every SMS
- Opted-out contacts are blocked from receiving messages

**What happens next:**
- Message logged in Communications tab
- Twilio delivers SMS/WhatsApp
- Replies from contact appear in the timeline

**Common mistakes:**
- Sending to a contact who has opted out (blocked by system)
- Sending SMS when contact prefers email

**How to recover:**
- Check preferred channel on the contact profile before sending

### Procedure: Build a contact segment

**When to use this:** When you want to target a group of contacts for an email campaign.

**Starting point:** Contacts > Segments (/contacts/segments)

**Steps:**
1. Navigate to /contacts/segments
2. Click "New Segment"
3. Set filters: type (buyer/seller), stage, lead status, area, price range, behavior score
4. Preview matching contacts
5. Save segment with a name
6. Use segment as recipient list in email campaigns

**System validations:**
- At least one filter required
- Segment name must be unique

**What happens next:**
- Segment available as a recipient option in Newsletter campaigns
- Segment auto-updates as contacts match/unmatch filters

**Common mistakes:**
- Creating too narrow a segment (0 matches)

**How to recover:**
- Widen filters and preview again

## Validations and Rules

- Contact name is required for all contact types
- At least one contact method (phone or email) must be provided
- Phone numbers auto-formatted with +1 prefix and whitespace stripped
- Duplicate detection checks phone and email against existing contacts
- CASL consent must be tracked — all outbound messages check consent_status
- TCPA compliance: "Reply STOP to opt out" footer on every SMS/WhatsApp
- Stage advancement blocked if required stage tasks are incomplete
- Engagement score recalculated after every email event (open, click, bounce)

## Role Differences

| Role | Can View | Can Edit | Can Delete/Merge | Special Notes |
|------|----------|----------|------------------|---------------|
| Agent | Yes | Yes | Delete only | Can create, edit, message, track stages |
| TC | Yes | Limited | No | Can update documents and status items |
| Admin | Yes | Yes | Yes (merge + delete) | Can merge duplicates, bulk operations |

## Edge Cases

1. **Duplicate detected on create** — System warns but allows creation. Review before saving.
2. **Contact opts out via STOP** — Permanently blocked from SMS/WhatsApp. Must use email or phone.
3. **Contact has no email** — Cannot send newsletters. Email field needed for marketing.
4. **Merge two contacts of different types** — Choose which type to keep. All history combines.
5. **Contact in multiple households** — Only one household allowed per contact.
6. **Engagement score is 0** — Contact has no email interaction history yet. Normal for new contacts.
7. **Phone number format issues** — System adds +1 automatically. International numbers may need manual formatting.
8. **Contact deleted with active deals** — Deals referencing this contact will show "unknown contact."

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|-----------|-----------------|
| SMS not sending | No phone number or opted out | Check contact profile for phone and consent | Add phone number or use email instead | If Twilio is down |
| Duplicate warning on create | Phone/email matches existing contact | Search for the existing contact | Merge if same person, or ignore warning if different | If merge fails |
| Stage bar not advancing | Required tasks incomplete | Check task checklist for the current stage | Complete all stage tasks first | If tasks show complete but stage won't advance |
| Engagement score stuck at 0 | No emails sent to this contact | Check newsletter history for this contact | Enroll in a journey or send a campaign | If score doesn't update after emails sent |
| Contact not appearing in search | Name misspelled or filter active | Clear all sidebar filters, search by phone | Edit name spelling | If contact was accidentally deleted |
| Can't send WhatsApp | WhatsApp not configured | Check Twilio WhatsApp settings | Configure WhatsApp number in settings | If configuration fails |
| Household link broken | Contact removed from household | Check household page | Re-add contact to household | If household record is corrupted |

## FAQ

### How do I add a new contact?
Click the + button in the header and select Contact. Enter their name, phone, and email. Select their type (Buyer, Seller, etc.) and save.

### Can I send SMS directly from a contact profile?
Yes. Open the contact, click "Text Message" in the quick action bar, type your message, and send. The system automatically adds a TCPA opt-out footer.

### What does the engagement score mean?
It's a 0-100 score calculated from email opens, clicks, and interaction frequency. Higher means more engaged. Use it to prioritize follow-ups — call hot leads (score 60+) first.

### How do I merge duplicate contacts?
Go to /contacts/merge (requires admin role). Search for both contacts, select which to keep as primary, review the merged data, and confirm. This cannot be undone.

### What happens when a contact replies STOP?
They're permanently blocked from receiving SMS and WhatsApp messages. You can still email them or call them. The opt-out is tracked for CASL/TCPA compliance.

### How do I track a contact's pipeline stage?
The stage bar at the top of each contact profile shows their current position. Complete stage-specific tasks to advance them through: New → Qualified → Active Search → Under Contract → Closed.

### Can I import contacts from a spreadsheet?
Yes. Go to /import and upload an Excel file. Map columns to contact fields (name, phone, email, type). The system validates and creates contacts.

### What are contact segments?
Segments are dynamic groups of contacts based on filters (type, stage, area, price range, engagement score). Use them to target specific audiences for email campaigns.

### How do I see all communications with a contact?
Open the contact profile and look at the Communications tab. It shows all SMS, WhatsApp, email, and logged calls in chronological order.

### What's the difference between Lead Status and Stage?
Lead Status (New/Warm/Hot/Cold/Dormant) is your manual assessment of how active the lead is. Stage (New → Qualified → Under Contract → Closed) tracks where they are in the transaction pipeline. Both can be updated independently.

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| Listing Workflow | Sellers are linked as contacts to listings | Seller contact must exist before creating a listing |
| Showing Management | Buyer agents are contacts | Showing creates communication records |
| Deal Pipeline | Deals link to contacts as parties | Contact stage may update when deal advances |
| Email Marketing | Engagement data feeds from newsletters | Engagement score drives send decisions |
| FINTRAC Compliance | Identity verification stored on contact | FINTRAC section in contact profile |
| Voice Agent | Can search contacts by name via voice | "Find Sarah Mitchell" returns contact data |

## Escalation Guidance

**Fix yourself:** Edit contact details, send messages, create tasks, advance pipeline stages, build segments, import from Excel.

**Needs admin:** Merge duplicates, bulk delete, fix corrupted household records, override opt-out status (legal review required).

**Before escalating, gather:** Contact ID (from URL), what you were trying to do, error message or screenshot.

**How to escalate:** Click the ? button in the header and select "Still need help?", or contact your brokerage admin.
