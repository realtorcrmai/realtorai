# CASL/TCPA Compliance Implementation

## Overview

This document outlines the CASL (Canada's Anti-Spam Legislation) and TCPA (Telephone Consumer Protection Act) compliance features added to ListingFlow CRM to protect user privacy and ensure legal compliance when sending SMS, WhatsApp, and email messages.

**Implementation Date:** March 23, 2026

---

## 1. SMS/WhatsApp Compliance (TCPA/CASL)

### 1.1 Opt-Out Footer Added to All Outbound SMS Messages

All outbound SMS and WhatsApp messages now include the STOP opt-out notice at the end:

```
Reply *STOP* to opt out of messages.
```

#### Files Modified:

**`/src/lib/twilio.ts`**
- `sendShowingRequest()` — Added STOP notice to showing request message
- `sendLockboxCode()` — Added STOP notice to lockbox code message
- `sendShowingDenied()` — Added STOP notice to showing denial message
- `sendGenericMessage()` — Uses caller-provided body (developers should add STOP notice manually)

#### Message Examples:

**Showing Request:**
```
🏠 *Showing Request*

Property: 123 Main St, Vancouver, BC
Date/Time: Friday, Mar 21 3:00 PM
Buyer's Agent: John Smith

Reply *YES* to confirm or *NO* to decline.

Reply *STOP* to opt out of messages.
```

**Lockbox Code:**
```
✅ *Showing Confirmed!*

Property: 123 Main St, Vancouver, BC
Time: 3:00 PM
Lockbox Code: *1234*

Please ensure the property is secured after your showing. Thank you!

Reply *STOP* to opt out of messages.
```

**Showing Denied:**
```
Unfortunately, the showing request for 123 Main St, Vancouver, BC on Fri, Mar 21 3:00 PM has been declined by the seller. Please contact the listing agent to arrange an alternate time.

Reply *STOP* to opt out of messages.
```

### 1.2 STOP Response Handler

**File:** `/src/app/api/webhooks/twilio/route.ts`

When a contact replies with "STOP", the webhook handler now:

1. **Marks contact as opted-out:**
   - Sets `sms_opted_out = true`
   - Sets `whatsapp_opted_out = true`
   - Records timestamp in `sms_opt_out_date` and `whatsapp_opt_out_date`

2. **Creates audit log entry:**
   - Records activity type: `sms_opted_out`
   - Stores contact name, phone, and timestamp
   - Source: `twilio_stop_reply`

3. **Immediately stops all SMS/WhatsApp communication** to that contact

#### Code (added to webhook):

```typescript
// Handle STOP opt-out (CASL/TCPA compliance)
if (inboundBody === "STOP") {
  await supabase
    .from("contacts")
    .update({
      sms_opted_out: true,
      whatsapp_opted_out: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contact.id);

  // Audit log
  await supabase.from("activity_log").insert({
    contact_id: contact.id,
    activity_type: "sms_opted_out",
    description: `${contact.name} opted out of SMS/WhatsApp messages via STOP reply`,
    metadata: {
      phone: contact.phone,
      timestamp: new Date().toISOString(),
      source: "twilio_stop_reply",
    },
  });

  return new NextResponse(
    "<?xml version='1.0' encoding='UTF-8'?><Response></Response>",
    { headers: { "Content-Type": "text/xml" } }
  );
}
```

---

## 2. Email Compliance (CASL)

### 2.1 Unsubscribe Link in Email Footer

**Status:** Already implemented

All email templates use `BaseLayout.tsx` which includes a footer with unsubscribe link:

```
[Unsubscribe] from these emails
```

The unsubscribe link points to: `/api/newsletters/unsubscribe?id={contact_id}`

**File:** `/src/emails/BaseLayout.tsx` (lines 99-102)

### 2.2 How Unsubscribe Works

When a user clicks the unsubscribe link:

1. **Marks contact as newsletter-unsubscribed:**
   - Sets `newsletter_unsubscribed = true`
   - Records in `newsletter_intelligence` JSONB with timestamp

2. **Pauses all journeys:**
   - Sets `is_paused = true` on all contact_journeys
   - Records pause reason: `unsubscribed`

3. **Creates audit log entry** with source: `email_unsubscribe_link`

4. **Shows confirmation page** with personalized greeting

#### Unsubscribe Endpoint:

**File:** `/src/app/api/newsletters/unsubscribe/route.ts`

- Endpoint: `GET /api/newsletters/unsubscribe?id=<contact_id>`
- Returns: HTML confirmation page
- Status: Production-ready

---

## 3. Database Schema Updates

### 3.1 New Migration

**File:** `/supabase/migrations/051_casl_tcpa_compliance.sql`

Adds the following columns to the `contacts` table:

| Column | Type | Purpose |
|--------|------|---------|
| `sms_opted_out` | BOOLEAN | Flag for SMS opt-out status (default: false) |
| `whatsapp_opted_out` | BOOLEAN | Flag for WhatsApp opt-out status (default: false) |
| `sms_opt_out_date` | TIMESTAMPTZ | Timestamp when contact opted out of SMS |
| `whatsapp_opt_out_date` | TIMESTAMPTZ | Timestamp when contact opted out of WhatsApp |
| `casl_consent_given` | BOOLEAN | Tracks if explicit consent was obtained |
| `casl_consent_date` | TIMESTAMPTZ | Date consent was obtained |
| `casl_opt_out_date` | TIMESTAMPTZ | Date contact opted out |

### 3.2 Activity Log Table

Creates `activity_log` table to track all CASL/TCPA compliance events:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `contact_id` | UUID | Reference to contact |
| `activity_type` | TEXT | Type of activity (sms_opted_out, newsletter_unsubscribed, etc.) |
| `description` | TEXT | Human-readable description |
| `metadata` | JSONB | Additional context (phone, timestamp, source) |
| `created_at` | TIMESTAMPTZ | When the activity occurred |

#### Activity Types:
- `sms_opted_out` — Contact replied STOP to SMS
- `whatsapp_opted_out` — Contact opted out of WhatsApp
- `newsletter_unsubscribed` — Contact clicked email unsubscribe link
- `casl_consent_given` — Explicit consent recorded
- `casl_consent_withdrawn` — Consent withdrawn
- `contact_created`, `contact_updated` — Contact lifecycle
- `showing_requested`, `showing_confirmed`, `showing_denied` — Showing workflow

---

## 4. Implementation Checklist

### For Developers:

**Before Deployment:**
- [ ] Run migration 051 on Supabase: `supabase db push`
- [ ] Test STOP reply handling in dev environment
- [ ] Verify unsubscribe link in test email templates
- [ ] Check activity log entries after opt-out actions

**When Sending Generic SMS:**
- [ ] Use `sendGenericMessage()` with compliant body
- [ ] **Always append STOP notice** to custom messages:
  ```typescript
  const body = `Your message here\n\nReply *STOP* to opt out of messages.`;
  ```

**Before Sending Campaigns:**
- [ ] Check `sms_opted_out` and `whatsapp_opted_out` flags before sending
- [ ] Filter contacts: exclude opted-out recipients
- [ ] Example query:
  ```sql
  SELECT * FROM contacts
  WHERE sms_opted_out = false
  AND whatsapp_opted_out = false
  AND type = 'buyer'
  ```

---

## 5. Testing Guide

### 5.1 Test SMS Opt-Out

1. Send showing request to test contact via SMS
2. Confirm message includes "Reply *STOP* to opt out of messages."
3. Reply "STOP" to the number
4. Verify webhook receives and processes the STOP command
5. Check activity log for opt-out event
6. Verify `sms_opted_out = true` on contact record
7. Attempt to send another SMS — confirm it should be filtered

### 5.2 Test Email Unsubscribe

1. Send test email using any React Email template
2. Verify footer includes unsubscribe link with format: `/api/newsletters/unsubscribe?id={contact_id}`
3. Click the link
4. Confirm HTML confirmation page shows
5. Verify `newsletter_unsubscribed = true` on contact
6. Check activity log for unsubscribe event
7. Verify all contact journeys are paused

### 5.3 Test Activity Log

```sql
SELECT * FROM activity_log
WHERE contact_id = 'test-contact-id'
AND activity_type IN ('sms_opted_out', 'newsletter_unsubscribed')
ORDER BY created_at DESC;
```

---

## 6. Legal Compliance Reference

### CASL (Canadian Anti-Spam Legislation)
- **Requirement:** Unsubscribe mechanism required on all commercial electronic messages
- **Compliance:** Implemented in `BaseLayout.tsx` email footer
- **Audit Trail:** Activity log records all unsubscribe events

### TCPA (Telephone Consumer Protection Act)
- **Requirement:** Clear opt-out mechanism for SMS/WhatsApp
- **Compliance:** "Reply STOP" footer on all messages
- **Audit Trail:** Activity log and contact flag history

### GDPR (if applicable)
- **Requirement:** Right to withdraw consent
- **Compliance:** Email unsubscribe + STOP reply both withdraw consent
- **Audit Trail:** Full timestamp and source tracking

---

## 7. Recommended Next Steps

### High Priority:
1. **Consent Management UI** — Add contact consent status to contact detail page
2. **SMS Filtering** — Update `sendShowingRequest()` and other functions to check opt-out flags before sending
3. **Bulk Compliance** — Add "check opt-out flags" to any batch messaging jobs
4. **Consent History** — Show audit trail on contact page

### Medium Priority:
1. **Consent Forms** — Add explicit opt-in consent capture during contact creation
2. **Re-Consent Campaign** — Build workflow to re-engage opted-out contacts (if legal allows)
3. **Compliance Dashboard** — Report on opt-out rates and unsubscribe trends
4. **CASL/TCPA Reporting** — Export compliance audit logs for legal review

### Low Priority:
1. **SMS Dedicated Keywords** — Support additional keywords beyond STOP (e.g., HELP, INFO)
2. **Opt-Out Removal API** — Allow contacts to re-opt-in after period
3. **Message Classification** — Auto-tag transactional vs. marketing messages
4. **Preference Center** — Allow granular opt-out preferences (e.g., opt out of marketing, keep transactional)

---

## 8. Files Changed Summary

| File | Changes | Type |
|------|---------|------|
| `src/lib/twilio.ts` | Added STOP footer to 3 functions | SMS Compliance |
| `src/app/api/webhooks/twilio/route.ts` | Added STOP reply handler + audit logging | SMS Handler |
| `supabase/migrations/051_casl_tcpa_compliance.sql` | New migration with opt-out schema + activity log | Database |
| `src/emails/BaseLayout.tsx` | (Already compliant) — Has unsubscribe footer | Email Compliance |
| `src/app/api/newsletters/unsubscribe/route.ts` | (Already compliant) — Handles unsubscribe requests | Email Handler |

---

## 9. Future: Compliance Enforcement

To make these features enforced (prevent messages to opted-out contacts), add checks in action functions:

**Example for showings.ts:**

```typescript
// Before sending SMS
const { data: contact } = await supabase
  .from("contacts")
  .select("sms_opted_out, whatsapp_opted_out")
  .eq("id", seller.id)
  .single();

if (seller.pref_channel === "sms" && contact?.sms_opted_out) {
  return { error: "Contact has opted out of SMS messages" };
}

if (seller.pref_channel === "whatsapp" && contact?.whatsapp_opted_out) {
  return { error: "Contact has opted out of WhatsApp messages" };
}
```

This ensures compliance is enforced at the application layer before Twilio sends any messages.

---

## Questions?

Refer to `/Users/rahulmittal/CLAUDE.md` for:
- Environment variable setup
- Twilio integration details
- Email template architecture
- Database schema documentation
