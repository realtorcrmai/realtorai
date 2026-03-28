---
title: "Showing Management"
slug: "showing-management"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: ["/showings"]
changelog: []
---

# Showing Management

## Problem Statement

Coordinating property showings is one of the most time-consuming parts of a BC realtor's day. A single listing can generate dozens of showing requests from different buyer agents, each requiring seller approval, schedule conflict checks, and lockbox code distribution. When this process relies on phone calls, texts, and sticky notes, showings get double-booked, sellers are interrupted unnecessarily, and buyer agents wait hours for confirmation. RealtorAI automates the entire showing lifecycle — from request through confirmation — so you spend less time coordinating and more time closing deals.

## Business Value

Every hour spent chasing seller approvals and checking calendars is an hour not spent prospecting or negotiating. Automated showing management reduces your coordination overhead to near zero: requests go out to sellers via SMS, confirmations trigger lockbox code delivery automatically, and your Google Calendar stays in sync without manual entry. Faster response times to buyer agents mean more showings booked and a stronger reputation in the market.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Schedules showings, monitors statuses, manages lockbox codes |
| **Seller** | SMS only | Receives showing requests via text, replies YES or NO |
| **Buyer Agent** | View confirmation | Receives lockbox code on confirmation |
| **Transaction Coordinator** | Full access | Reviews showing history, resolves scheduling conflicts |

## Where to Find It

- Click **Showings** in the top navigation bar to see all showings
- The sidebar contains a form to schedule a new showing request
- Click any showing in the list to open its detail page at `/showings/[id]`
- Showings also appear on your Google Calendar if calendar sync is enabled

## Preconditions

- You must be logged in
- The listing must exist in the system with a valid seller contact
- The seller must have a phone number on file (for SMS approval)
- Twilio must be configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- Google Calendar must be connected to enable conflict checking

## Key Concepts

| Term | Definition |
|------|-----------|
| Showing Request | A proposed time for a buyer agent to view a property, pending seller approval |
| Status | Current state of the showing: Requested, Confirmed, Denied, or Cancelled |
| Lockbox Code | The property access code automatically sent to the buyer agent upon seller confirmation |
| Conflict Check | Automatic comparison against your Google Calendar to flag overlapping appointments |
| Seller Approval | SMS-based confirmation flow where the seller replies YES or NO to a text message |
| TCPA Footer | Legally required opt-out text appended to every SMS: "Reply STOP to opt out" |
| Buyer Agent | The agent representing the buyer, whose name, phone, and email are captured on the showing request |

## Core Workflow

1. Navigate to /showings and fill out the sidebar form: select a listing, enter the date and time, and add the buyer agent's name, phone, and email
2. RealtorAI checks your Google Calendar for conflicts at the proposed time
3. If no conflict, the system sends an SMS to the seller: "Reply YES to confirm or NO to decline"
4. The seller replies via text message
5. If YES: status changes to Confirmed, and the lockbox code is automatically sent to the buyer agent via SMS
6. If NO: status changes to Denied, and you can reschedule
7. The showing appears on your calendar and in the showings list with its current status

## End-to-End Scenarios

### Scenario: Schedule and confirm a standard showing

- **Role:** Listing Agent
- **Goal:** Book a showing for a buyer agent who called in
- **Navigation:** Click Showings in the top nav
- **Steps:**
  1. In the sidebar form, select the listing from the dropdown
  2. Enter the proposed date and time
  3. Enter the buyer agent's name, phone number, and email
  4. Click Submit to create the showing request
  5. The system sends an SMS to the seller asking for confirmation
  6. The seller replies YES
  7. The system sends the lockbox code to the buyer agent
- **Expected outcome:** Showing status is Confirmed, buyer agent has the lockbox code, event appears on calendar
- **Edge cases:** Seller does not reply within a reasonable time; buyer agent phone number is invalid
- **Common mistakes:** Entering the wrong phone number for the buyer agent, which means they never receive the lockbox code
- **Recovery:** Edit the showing detail page to correct the buyer agent phone number and resend the lockbox code manually

### Scenario: Seller declines a showing request

- **Role:** Listing Agent
- **Goal:** Handle a declined showing and propose a new time
- **Navigation:** Click Showings in the top nav, find the showing with Denied status
- **Steps:**
  1. Open the denied showing from the list
  2. Review the seller's response
  3. Contact the buyer agent with alternative times
  4. Create a new showing request with the revised time
  5. Wait for seller confirmation on the new request
- **Expected outcome:** New showing request created and pending seller approval
- **Edge cases:** Seller declines multiple times; buyer agent loses interest
- **Common mistakes:** Not following up with the buyer agent after a denial
- **Recovery:** Use the communication timeline to track all messages and ensure follow-up

### Scenario: Calendar conflict detected

- **Role:** Listing Agent
- **Goal:** Book a showing at a time when you already have an appointment
- **Navigation:** Click Showings in the top nav
- **Steps:**
  1. Fill in the sidebar form with the desired listing and time
  2. The system checks Google Calendar and flags a conflict
  3. Review the conflicting appointment
  4. Adjust the proposed time to an open slot
  5. Resubmit the showing request
- **Expected outcome:** Showing created at a non-conflicting time, SMS sent to seller
- **Edge cases:** Google Calendar is not connected; calendar sync is delayed
- **Common mistakes:** Ignoring the conflict warning and double-booking
- **Recovery:** Cancel the conflicting showing and contact both buyer agents to reschedule

### Scenario: Manage multiple showings for one listing in a single day

- **Role:** Listing Agent
- **Goal:** Coordinate four back-to-back showings on a Saturday
- **Navigation:** Click Showings in the top nav
- **Steps:**
  1. Create showing requests for each buyer agent at staggered times (e.g., 10:00, 11:00, 12:00, 1:00)
  2. Each request triggers a separate SMS to the seller
  3. The seller confirms or declines each individually
  4. Confirmed showings deliver lockbox codes to each buyer agent
  5. Review the full day's schedule in the showings list filtered by date
- **Expected outcome:** All four showings appear in the list with their respective statuses
- **Edge cases:** Seller confirms some and declines others; two showings accidentally overlap
- **Common mistakes:** Not leaving enough buffer time between showings
- **Recovery:** Cancel the overlapping showing and reschedule with a 30-minute gap

### Scenario: Cancel a confirmed showing

- **Role:** Listing Agent
- **Goal:** Cancel a showing because the buyer agent pulled out
- **Navigation:** Click Showings, then click the confirmed showing to open its detail page
- **Steps:**
  1. Open the showing detail page
  2. Change the status to Cancelled
  3. The system records the cancellation
  4. Optionally notify the seller that the showing is no longer happening
- **Expected outcome:** Showing status is Cancelled, calendar event is updated
- **Edge cases:** Cancelling after the lockbox code has already been sent
- **Common mistakes:** Forgetting to notify the seller about the cancellation
- **Recovery:** Send a manual SMS to the seller from the contact profile

## Step-by-Step Procedures

### Procedure: Create a new showing request

- **When to use:** A buyer agent contacts you to book a property viewing
- **Starting point:** /showings page
- **Steps:**
  1. In the sidebar form, select the listing from the dropdown
  2. Choose the date using the date picker
  3. Enter the start time
  4. Enter the buyer agent's full name
  5. Enter the buyer agent's phone number (include area code)
  6. Enter the buyer agent's email address
  7. Click Submit
- **Validations:** Listing must be selected; date must be in the future; phone number must be valid; Google Calendar is checked for conflicts
- **What happens next:** An SMS is sent to the seller with the showing details and a YES/NO prompt. The showing appears in the list with status Requested.
- **Common mistakes:** Entering a past date; omitting the buyer agent's phone number
- **Recovery:** Delete the invalid showing and create a new one with corrected information

### Procedure: Review showing details and history

- **When to use:** You need to check the status of a showing or review communication history
- **Starting point:** /showings page
- **Steps:**
  1. Find the showing in the list (filter by listing, status, or date)
  2. Click the showing to open /showings/[id]
  3. Review: property address, buyer agent details, date/time, current status
  4. Check the notes section for any special instructions
  5. Review the communication log to see all SMS messages sent and received
- **Validations:** Showing must exist in the system
- **What happens next:** You have full context to follow up with the buyer agent or seller as needed
- **Common mistakes:** Looking at the wrong showing when a listing has multiple requests
- **Recovery:** Use the listing filter to narrow results to the specific property

### Procedure: Handle a seller non-response

- **When to use:** The seller has not replied to the showing SMS within several hours
- **Starting point:** /showings page, find the showing with status Requested
- **Steps:**
  1. Open the showing detail page
  2. Confirm the seller's phone number is correct on their contact profile
  3. Call the seller directly to get verbal confirmation
  4. If confirmed verbally, note the approval in the showing record
  5. Manually send the lockbox code to the buyer agent if the automated flow did not trigger
- **Validations:** Seller phone number must be correct and active
- **What happens next:** The showing proceeds as confirmed once the seller responds or you handle it manually
- **Common mistakes:** Waiting too long before following up; sending duplicate SMS requests
- **Recovery:** Contact the buyer agent to apologize for the delay and confirm the showing time still works

## Validations and Rules

- A listing must be selected before submitting a showing request
- The showing date must be in the future
- The buyer agent phone number must be a valid phone number
- Google Calendar is automatically checked for time conflicts before the request is created
- Only the seller can confirm or deny a showing via SMS reply
- The lockbox code is only sent after the seller replies YES
- Every SMS includes a TCPA-compliant footer: "Reply STOP to opt out"
- Showing statuses follow a strict flow: Requested → Confirmed or Denied; Confirmed → Cancelled
- A cancelled showing cannot be reactivated — create a new request instead

## Role Differences

| Role | Can View | Can Edit | Special Notes |
|------|----------|----------|---------------|
| **Listing Agent** | All showings | Create, cancel, edit notes | Primary coordinator for all showings |
| **Transaction Coordinator** | All showings | Edit notes, update status | Cannot create new requests for listings they do not manage |
| **Seller** | Their own (via SMS) | Confirm or deny (via SMS reply) | No login required — interaction is entirely SMS-based |
| **Buyer Agent** | Their own (via SMS) | None | Receives lockbox code and confirmation via SMS |

## Edge Cases

1. **Seller has no phone number:** The system cannot send the SMS confirmation. Add a phone number to the seller's contact profile before creating the showing request.
2. **Google Calendar is not connected:** Conflict checking is skipped. The showing request proceeds but you risk double-booking. Connect Google Calendar from the calendar settings page.
3. **Buyer agent provides a landline:** SMS delivery may fail for landline numbers. Verify the buyer agent has a mobile number that can receive texts.
4. **Seller replies with something other than YES or NO:** The webhook only processes YES and NO responses. Any other reply is ignored, and the showing remains in Requested status until a valid reply is received.
5. **Multiple showings requested at the exact same time:** Each request is processed independently. The conflict check catches overlaps with your calendar but does not prevent two showing requests for the same listing at the same time. Review the showings list to spot duplicates.
6. **SMS delivery fails due to Twilio outage:** The showing is created but the seller never receives the notification. Check the communication log for delivery errors and resend manually or call the seller.
7. **Seller accidentally replies YES to the wrong showing text:** Each SMS is tied to a specific showing. Contact the seller to clarify and cancel the incorrect confirmation if needed.

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|------------|-----------------|
| Seller never receives SMS | Phone number is wrong or Twilio is misconfigured | Check the seller's contact profile for correct phone number; check Twilio dashboard for delivery status | Correct the phone number and resend, or verify Twilio credentials in environment variables | If Twilio dashboard shows persistent delivery failures |
| Lockbox code not sent after confirmation | Automated flow did not trigger, or lockbox code is not set on the listing | Check the showing status (should be Confirmed); check the listing for a lockbox code value | Manually send the lockbox code from the showing detail page | If the automation consistently fails across multiple showings |
| Google Calendar conflict check not working | Google Calendar is not connected or token expired | Go to Calendar settings and check connection status | Reconnect Google Calendar and re-authorize | If re-authorization fails repeatedly |
| Showing stuck in Requested status | Seller has not replied, or reply was not YES/NO | Check communication log for the outbound SMS and any inbound replies | Call the seller for verbal confirmation; update status manually | If the webhook is not processing inbound messages at all |
| Duplicate showings for same time | Two requests were submitted before the first was processed | Filter showings by listing and date to find duplicates | Cancel the duplicate and notify the buyer agent | If duplicates are being created by the system automatically |

## FAQ

### Can I schedule a showing without sending an SMS to the seller?

No. The core workflow requires seller approval via SMS. Every showing request triggers an automatic text to the seller. If you need to bypass this for a specific situation, you would need to create the showing and then manually confirm it, but the SMS will still be sent.

### What happens if the seller replies STOP to the SMS?

If the seller replies STOP, Twilio will automatically unsubscribe them from future messages as required by TCPA regulations. You will need to get re-consent from the seller before the system can send them any further SMS notifications. Contact the seller by phone to discuss re-opting in.

### Can buyer agents see the showing status in RealtorAI?

Buyer agents do not have login access to RealtorAI. They receive showing confirmations and lockbox codes via SMS only. If a buyer agent needs a status update, they should contact you directly.

### How far in advance can I schedule a showing?

There is no hard limit on how far in advance you can schedule. The date must be in the future, but you can book showings weeks or months ahead. Keep in mind that very early bookings may need to be reconfirmed closer to the date.

### Does the system handle showing feedback from buyers?

The current system tracks the logistics of showings (scheduling, confirmation, access) but does not have a built-in feedback form for buyer impressions after the showing. You can add notes to the showing detail page manually after receiving feedback.

### Can I reschedule a confirmed showing?

There is no reschedule button. To change the time, cancel the existing showing and create a new request with the updated date and time. The seller will receive a new SMS for the revised time.

### What phone number format should I use for buyer agents?

Enter the full phone number including area code (e.g., 604-555-1234). The system automatically adds the +1 country prefix and strips any whitespace or formatting characters before sending via Twilio.

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| **Contact Management** | Seller contact provides the phone number for SMS approval | Missing or incorrect seller phone prevents showing confirmation |
| **Listing Workflow** | Showings are linked to listings; showing instructions come from Phase 1 intake | Listing must exist before creating a showing |
| **Google Calendar** | Calendar integration enables conflict checking and event creation | Disconnected calendar means no conflict detection |
| **Deal Pipeline** | Confirmed showings can advance a buyer deal from Showing stage | Showing activity feeds into deal progression |
| **Voice Agent** | Ask "show me upcoming showings" or navigate via voice command | Quick access to showing information hands-free |

## Escalation Guidance

**Fix yourself:**
- Incorrect buyer agent phone number — edit the showing detail and correct it
- Seller did not respond — call the seller and update the showing status manually
- Calendar conflict — adjust the showing time and resubmit
- Duplicate showings — cancel the duplicate from the showings list

**Needs admin:**
- Twilio credentials are invalid or expired — requires environment variable update
- Google Calendar authorization consistently fails — requires OAuth reconfiguration
- SMS webhook is not processing inbound messages — requires server-side investigation

**Information to gather before escalating:**
- The showing ID (from the URL: /showings/[id])
- The listing address and seller name
- The exact error message or unexpected behavior
- Screenshots of the showing detail page and communication log
- Twilio delivery status from the Twilio dashboard (if accessible)
