# Usecase: Showing Management

## Problem Statement

Coordinating property showings requires rapid communication between buyer agents, listing agents, and sellers. Without automation, a realtor must manually phone or text the seller for every showing request, wait for confirmation, then relay the lockbox code to the buyer agent — a process that can delay access by hours and create gaps in the audit trail. Missed or unconfirmed showings erode seller trust and cost deals.

ListingFlow automates this entire flow: showing requests are logged instantly, sellers are notified via their preferred channel (SMS or WhatsApp), their YES/NO reply is processed by webhook, Google Calendar is checked for conflicts, lockbox codes are delivered automatically on confirmation, and every exchange is recorded in the communications timeline.

---

## User Roles

| Role | Description |
|------|-------------|
| Listing Agent (Realtor) | Creates showing requests on behalf of buyer agents, monitors status, manually confirms or denies when seller is unreachable |
| Seller | Receives Twilio SMS/WhatsApp notification with showing details; replies YES to confirm or NO to deny |
| Buyer Agent | Submits showing request; receives lockbox code after confirmation |
| System (Webhook) | Processes inbound Twilio replies, updates `appointments.status`, triggers calendar event and lockbox delivery |

---

## Existing System Context

- **Table:** `appointments` — stores all showing requests with status lifecycle
- **Table:** `communications` — unified outbound/inbound message log per contact
- **Table:** `listings` — provides `lockbox_code`, `address`, and `seller_id` (FK to `contacts`)
- **Table:** `contacts` — provides `phone` and `pref_channel` (`sms` | `whatsapp`) for the seller
- **Table:** `google_tokens` — stores OAuth tokens for Google Calendar busy-block lookup
- **Server Action:** `src/actions/showings.ts` — `createShowingRequest()`, `updateShowingStatus()`
- **Twilio Library:** `src/lib/twilio.ts` — `sendShowingRequest()`, `sendShowingConfirmation()`, lockbox delivery
- **Google Calendar Library:** `src/lib/google-calendar.ts` — `fetchBusyBlocks()`, `isSlotAvailable()`
- **Webhook:** `src/app/api/webhooks/twilio/route.ts` — inbound SMS/WhatsApp handler
- **Voice API:** `src/app/api/voice-agent/showings/route.ts` — GET/POST for voice agent bridge
- **Pages:** `/showings` (list), `/showings/[id]` (detail), `/calendar` (Google Calendar view)
- **Components:** `src/components/showings/ShowingRequestForm.tsx`, `StatusBadge.tsx`, `StatusActions.tsx`

---

## Features

### 1. Showing Request Creation
- Realtor fills `ShowingRequestForm` with: `listingId`, `buyerAgentName`, `buyerAgentPhone`, `buyerAgentEmail`, `startTime`, `endTime`
- `createShowingRequest()` validates with Zod (`showingSchema`) before writing to Supabase
- Appointment inserted with `status: "requested"`, `twilio_message_sid` populated after send

### 2. Google Calendar Conflict Check
- Before creating the appointment, `fetchBusyBlocks()` is called against the agent's Google token
- `isSlotAvailable()` returns false if any busy block overlaps the requested slot
- Conflict returns an error: `"The requested time slot conflicts with an existing calendar event."`
- If no token is stored, the check is skipped with a `calendarWarning` flag on the response

### 3. Seller SMS/WhatsApp Notification
- `sendShowingRequest()` sends to `seller.phone` via `seller.pref_channel` (`sms` or `whatsapp`)
- Message includes property address, requested date/time, and buyer agent name
- Message SID stored in `appointments.twilio_message_sid`
- Outbound communication logged in `communications` (channel, direction: `"outbound"`, `related_id` = appointment ID)
- If Twilio fails, `appointments.notification_status` = `"failed"` with `notification_error` text

### 4. Seller Reply Processing (YES/NO Webhook)
- Inbound reply hits `POST /api/webhooks/twilio`
- Phone number matched to contact via `contacts.phone`
- Most recent `requested` appointment for that contact's listing is identified
- `"YES"` or `"Y"` → `appointments.status` = `"confirmed"`, Google Calendar event created, lockbox code sent to buyer agent
- `"NO"` → `appointments.status` = `"denied"`, buyer agent notified
- `workflow_triggers.fireTrigger({ type: "showing_completed" })` fires for buyer journey advancement when confirmed

### 5. Lockbox Code Delivery
- On `"YES"` reply, `listing.lockbox_code` is sent to `buyer_agent_phone` via SMS
- Google Calendar event created with description: `"Buyer's Agent: {name} ({phone})\nLockbox: {lockbox_code}"`
- Calendar event stored as `appointments.google_event_id`

### 6. Manual Override
- From `/showings/[id]`, realtor can use `StatusActions` component to manually call `updateShowingStatus(appointmentId, "confirmed" | "denied" | "cancelled")`
- Revalidates `/showings` and `/calendar` paths

### 7. Appointment Status Lifecycle
```
requested → confirmed | denied | cancelled
```
Fields: `id`, `listing_id`, `buyer_agent_name`, `buyer_agent_phone`, `buyer_agent_email`, `start_time`, `end_time`, `status`, `google_event_id`, `twilio_message_sid`, `notification_status`, `notification_error`, `lockbox_code`

---

## End-to-End Scenarios

### Scenario 1: Buyer Agent Requests Showing, Seller Confirms via SMS

1. Buyer agent calls listing agent and requests a showing for `2026-04-10T14:00` at `1234 Maple St`
2. Realtor opens `/showings`, clicks "New Showing Request"
3. `ShowingRequestForm` is submitted: `buyerAgentName: "Alex Reed"`, `buyerAgentPhone: "+16045550123"`, `startTime: "2026-04-10T14:00:00"`, `endTime: "2026-04-10T15:00:00"`
4. `createShowingRequest()` calls `fetchBusyBlocks()` — slot is free
5. Appointment inserted: `status: "requested"`
6. Twilio sends SMS to seller: `"Showing request for 1234 Maple St on Apr 10 at 2:00 PM from Alex Reed. Reply YES to confirm or NO to deny."`
7. Communication row logged in `communications`
8. Seller replies `"YES"` → webhook fires
9. `appointments.status` → `"confirmed"`
10. Google Calendar event created, `google_event_id` stored
11. Buyer agent receives SMS: `"Confirmed! Lockbox code: 4821"`
12. Realtor views `/showings/[id]` — full timeline shows request, notification, confirmation, lockbox delivery

### Scenario 2: Seller Denies Showing

1. Showing created for `2026-04-12T10:00`
2. Seller replies `"NO"` to Twilio message
3. `appointments.status` → `"denied"`
4. Buyer agent receives denial notification
5. Realtor sees `StatusBadge` showing "Denied" on `/showings` list
6. Realtor contacts buyer agent to propose alternate time

### Scenario 3: Calendar Conflict Detected

1. Realtor tries to book showing for `2026-04-10T14:00–15:00`
2. `fetchBusyBlocks()` finds agent has an existing event at that time
3. `createShowingRequest()` returns error: `"The requested time slot conflicts with an existing calendar event."`
4. Realtor opens `/calendar`, identifies a free slot at `16:00`, re-submits the form

### Scenario 4: Manual Confirmation When Seller Unreachable

1. Seller did not reply to SMS after 2 hours
2. Realtor phones seller directly, gets verbal confirmation
3. Realtor opens `/showings/[id]`, clicks "Confirm" in `StatusActions`
4. `updateShowingStatus(appointmentId, "confirmed")` called
5. `showing_completed` trigger fires for buyer contact journey
6. Realtor manually sends lockbox code to buyer agent via `/inbox`

### Scenario 5: Showing Cancelled After Confirmation

1. Confirmed showing for tomorrow at `10:00`
2. Buyer agent calls to cancel
3. Realtor opens `/showings/[id]`, clicks "Cancel" in `StatusActions`
4. `updateShowingStatus(appointmentId, "cancelled")` called
5. Google Calendar event remains (realtor deletes manually from calendar)
6. Communication note logged on seller's timeline

### Scenario 6: Voice Agent Creates Showing

1. Realtor says: "Book a showing for 1234 Maple Street tomorrow at 2pm for buyer agent Sarah Kim, phone 604-555-0199"
2. Voice agent calls `find_listing({ address: "1234 Maple" })` → resolves `listing_id`
3. Voice agent calls `create_showing({ listing_id, buyer_agent_name: "Sarah Kim", buyer_agent_phone: "604-555-0199", start_time: "2026-04-11T14:00:00", end_time: "2026-04-11T15:00:00" })`
4. POST to `/api/voice-agent/showings` → triggers same `createShowingRequest()` server action
5. Agent responds: "Done. Showing booked for 1234 Maple on April 11 at 2pm. Seller has been notified."

---

## Demo Script

**Setup:** Have a listing open with a seller contact who has `pref_channel: "sms"`. Google Calendar token is configured.

1. **Open `/showings`** — show empty or existing list
2. **Click "New Showing Request"** — fill in buyer agent details and time slot
3. **Submit** — observe success toast; appointment appears with `status: "requested"`
4. **Open `/showings/[id]`** — show communications timeline with outbound SMS logged
5. **Simulate seller reply** — POST to `/api/webhooks/twilio` with body `From=+1seller&Body=YES`
6. **Refresh `/showings/[id]`** — status is now "confirmed"; lockbox delivery message visible
7. **Open `/calendar`** — show the newly created Google Calendar event
8. **Voice demo:** Open voice widget, say "Show me today's confirmed showings" → `get_showings({ status: "confirmed", date: "today" })`

---

## Data Model

### `appointments` table
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `listing_id` | UUID | FK → `listings.id` |
| `buyer_agent_name` | TEXT | Buyer agent full name |
| `buyer_agent_phone` | TEXT | E.164 format (e.g. `+16045550123`) |
| `buyer_agent_email` | TEXT | Optional |
| `start_time` | TIMESTAMPTZ | Showing start |
| `end_time` | TIMESTAMPTZ | Showing end |
| `status` | TEXT | `requested` \| `confirmed` \| `denied` \| `cancelled` |
| `google_event_id` | TEXT | Google Calendar event ID after confirmation |
| `twilio_message_sid` | TEXT | Twilio message SID for outbound notification |
| `notification_status` | TEXT | `sent` \| `failed` |
| `notification_error` | TEXT | Error message if Twilio failed |
| `lockbox_code` | TEXT | Populated from `listings.lockbox_code` at confirmation |

### `communications` table (showing-related rows)
| Field | Type | Notes |
|-------|------|-------|
| `contact_id` | UUID | FK → `contacts.id` (seller) |
| `direction` | TEXT | `outbound` (CRM → seller) or `inbound` (seller → CRM) |
| `channel` | TEXT | `sms` or `whatsapp` |
| `body` | TEXT | Full message text |
| `related_id` | UUID | FK → `appointments.id` |

---

## Voice Agent Integration

### Available Tools (Realtor Mode)

| Tool | Parameters | Action |
|------|-----------|--------|
| `get_showings` | `listing_id`, `status`, `date`, `limit` | List showings with filters |
| `create_showing` | `listing_id`, `buyer_agent_name`, `buyer_agent_phone`, `start_time`, `end_time`, `buyer_agent_email`, `notes` | Create showing request + trigger Twilio notification |
| `confirm_showing` | `showing_id`, `action` (`confirm` \| `deny` \| `cancel`), `notes` | Manually update showing status |

### API Bridge
All three tools route through `/api/voice-agent/showings`:
- `GET /api/voice-agent/showings` — list with query params (`listing_id`, `status`, `date`)
- `POST /api/voice-agent/showings` — create showing request
- `PATCH /api/voice-agent/showings` — confirm/deny/cancel

### Example Voice Interactions
- "What showings do I have this week?" → `get_showings({ date: "this_week" })`
- "Confirm the showing for 1234 Maple tomorrow" → `get_showings` to find ID → `confirm_showing({ showing_id, action: "confirm" })`
- "Cancel Alex Reed's showing" → `get_showings` → `confirm_showing({ action: "cancel" })`
- "Book a showing for 456 Oak Street Friday at 3pm, buyer agent is Tom Chen, 604-555-0188" → `create_showing(...)`
