<!-- docs-audit: none --># Test Plan — Newsletter, Journey & Email Quality Gap Fixes
**Date:** 2026-04-17  
**Coverage:** All 25 gaps from IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md  
**Test Types:** Unit | Integration | Browser (Playwright) | Email Delivery | Journey Flow  
**Parent Plan:** [IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md](IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md)

---

## Test Conventions

- **TC-GN-XXX** = Newsletter system gap test case
- **TC-GJ-XXX** = Journey & intelligence gap test case
- **TC-GE-XXX** = Email quality/design gap test case
- **[UNIT]** = Vitest / Jest unit test
- **[INTEGRATION]** = API or DB-level integration test
- **[BROWSER]** = Playwright browser automation test
- **[EMAIL]** = Live email delivery test (Resend test mode or inbox verification)
- **[JOURNEY]** = End-to-end journey simulation test

---

## Section 1 — Newsletter System Gap Tests (G-N01 through G-N09)

---

### G-N01: Column Name Fix Tests

**TC-GN-001** [UNIT] Edit endpoint writes to correct column  
*Setup:* Mock Supabase client. POST to `/api/newsletters/edit` with `{ editedBody: "new content", editedSubject: "new subject" }`  
*Expected:* Supabase `.update()` called with `{ html_body: "new content", subject: "new subject" }` — NOT `html_content`  
*Pass:* No `html_content` key in the update call

**TC-GN-002** [UNIT] `editNewsletterDraft()` action uses `html_body`  
*Setup:* Call `editNewsletterDraft(id, oldSubject, oldBody, newSubject, newBody)`  
*Expected:* DB update includes `html_body: newBody`  
*Pass:* Column name confirmed correct

**TC-GN-003** [INTEGRATION] Edit persists through full cycle  
*Setup:* Create draft newsletter with body "Original content". Call edit with "Edited content". Fetch newsletter by ID.  
*Expected:* `newsletter.html_body === "Edited content"`  
*Pass:* Edit is durable in DB

**TC-GN-004** [BROWSER] Realtor edits draft and approves — email contains edited content  
*Setup:* Navigate to `/newsletters/queue`. Find a draft. Click "Edit". Change subject line to "EDITED SUBJECT". Save. Approve.  
*Expected:* Newsletter status changes to `sent`. Query DB: `newsletter.subject === "EDITED SUBJECT"`  
*Pass:* Playwright confirms status badge changes to "Sent"

---

### G-N02: Deferred Queue Separation Tests

**TC-GN-005** [UNIT] `getApprovalQueue()` excludes deferred  
*Setup:* Insert newsletters with status `draft` (3), `deferred` (2), `sent` (1)  
*Expected:* `getApprovalQueue()` returns exactly 3 records (draft only)  
*Pass:* Array length === 3, all statuses === "draft"

**TC-GN-006** [UNIT] `getDeferredNewsletters()` returns only deferred  
*Expected:* Returns 2 records with status `deferred`

**TC-GN-007** [BROWSER] Approval queue UI shows only draft items  
*Setup:* Seed DB with 3 draft + 2 deferred newsletters for same realtor  
*Expected:* Navigate to `/newsletters/queue`. Queue count badge shows "3". Deferred items visible in separate "Held Back" section below  
*Pass:* Playwright counts queue items === 3

**TC-GN-008** [BROWSER] Deferred item shows block reason  
*Expected:* Deferred item in "Held Back" section shows badge text like "Frequency cap" or "Low engagement"  
*Pass:* Badge element visible and non-empty

**TC-GN-009** [BROWSER] "Retry" on deferred item re-evaluates governor  
*Setup:* Deferred contact now has sufficient engagement. Click "Retry" on deferred item.  
*Expected:* Item moves to approved/sent, or shows new deferral reason if still blocked  
*Pass:* Item is no longer in deferred section

---

### G-N03: Event Emission Tests

**TC-GN-010** [UNIT] `generateAndQueueNewsletter()` emits `newsletter_generated`  
*Setup:* Mock `emitNewsletterEvent`. Call `generateAndQueueNewsletter(contactId, "listing_alert", "lead")`.  
*Expected:* `emitNewsletterEvent` called with `event_type: "newsletter_generated"`  
*Pass:* Mock was called exactly once with correct event type

**TC-GN-011** [UNIT] `sendNewsletter()` emits `newsletter_sent` on success  
*Setup:* Mock Resend send (success). Mock `emitNewsletterEvent`. Call `sendNewsletter(newsletterId)`.  
*Expected:* `emitNewsletterEvent` called with `event_type: "newsletter_sent"` including `resend_message_id`  
*Pass:* Mock called, payload contains message ID

**TC-GN-012** [UNIT] `sendNewsletter()` does NOT emit `newsletter_sent` on failure  
*Setup:* Mock Resend send (throws error). Call `sendNewsletter(newsletterId)`.  
*Expected:* `emitNewsletterEvent` NOT called with `newsletter_sent`  
*Pass:* Mock not called, error propagated

**TC-GN-013** [UNIT] Webhook emits `email_opened` on open event  
*Setup:* Mock `emitNewsletterEvent`. POST webhook with `type: "email.opened"` payload.  
*Expected:* `emitNewsletterEvent` called with `event_type: "email_opened"`  
*Pass:* Mock called once

**TC-GN-014** [UNIT] Webhook emits `email_clicked` on click event  
*Setup:* POST webhook with `type: "email.clicked"` payload including link URL.  
*Expected:* `emitNewsletterEvent` called with `event_type: "email_clicked"` and `link_type` classified  
*Pass:* Mock called, payload has `score_impact` value

**TC-GN-015** [INTEGRATION] Events are durable in `email_events` table  
*Setup:* Run `generateAndQueueNewsletter()` in test env. Query `email_events` table.  
*Expected:* Row exists with `event_type: "newsletter_generated"`, correct `contact_id`  
*Pass:* Row count === 1

---

### G-N04: Bulk Approve Timeout Tests

**TC-GN-016** [UNIT] Bulk approve creates job record, returns immediately  
*Setup:* Call `bulkApproveNewsletters([id1, id2, ..., id30])`.  
*Expected:* Returns `{ jobId: UUID }` within 500ms (no processing done synchronously)  
*Pass:* Response time < 500ms, job exists in `bulk_send_jobs` table

**TC-GN-017** [INTEGRATION] Bulk job processes all newsletters to completion  
*Setup:* Create bulk_send_job with 10 valid draft newsletter IDs. Run job processor.  
*Expected:* All 10 newsletters status = `sent`. Job `processed_count = 10`, `status = complete`  
*Pass:* DB state confirmed

**TC-GN-018** [BROWSER] Bulk approve UI shows progress  
*Setup:* Select 15 drafts in queue. Click "Bulk Approve". Watch progress.  
*Expected:* Progress indicator appears: "5 / 15 sent". Updates as processing continues. Completes with success message.  
*Pass:* Playwright observes counter incrementing

**TC-GN-019** [BROWSER] Failed sends shown in bulk results  
*Setup:* Include 1 newsletter for a CASL-blocked contact in bulk job.  
*Expected:* Results show "14 sent, 1 failed" with CASL reason shown on failure  
*Pass:* Failure row visible with "CASL blocked" badge

---

### G-N05: CASL Consent Expiry Tests

**TC-GN-020** [UNIT] `canSendToContact()` blocks expired consent  
*Setup:* Contact with `casl_consent_date = 3 years ago`, `casl_consent_expires_at = 1 year ago`  
*Expected:* `canSendToContact(contact)` returns `{ allowed: false, reason: "casl_expired" }`  
*Pass:* Correct return value

**TC-GN-021** [UNIT] `canSendToContact()` allows valid consent  
*Setup:* Contact with `casl_consent_date = 1 year ago`, `casl_consent_expires_at = 1 year from now`  
*Expected:* `canSendToContact(contact)` returns `{ allowed: true }`  
*Pass:* Returns allowed

**TC-GN-022** [UNIT] DB trigger auto-sets `casl_consent_expires_at` on consent date set  
*Setup:* Insert contact with `casl_consent_given: true, casl_consent_date: "2025-01-01"`  
*Expected:* `casl_consent_expires_at = "2027-01-01"` (exactly 2 years later)  
*Pass:* Column auto-populated

**TC-GN-023** [INTEGRATION] `sendNewsletter()` blocked for expired consent contact  
*Setup:* Create newsletter for contact with expired consent. Call `sendNewsletter()`.  
*Expected:* Returns `{ error: "casl_expired" }`. Newsletter status NOT updated to "sent". Resend NOT called.  
*Pass:* No email delivered, status stays "draft"

**TC-GN-024** [UNIT] CASL expiry cron creates renewal recommendations  
*Setup:* 3 contacts with consent expiring in 25 days. Run cron.  
*Expected:* 3 rows in `agent_recommendations` with `action_type: "renew_casl_consent"`  
*Pass:* Count === 3

**TC-GN-025** [BROWSER] Expired consent contact shows warning badge in queue  
*Setup:* Draft newsletter for expired-consent contact.  
*Expected:* Queue item shows "Consent expired" red badge. Approve button disabled.  
*Pass:* Badge visible, button disabled attribute set

---

### G-N06: Compliance Blocklist Tests

**TC-GN-026** [UNIT] False urgency pattern blocked  
*Setup:* Call text pipeline with body containing "Act now! Offer expires tonight."  
*Expected:* Compliance check returns `{ passed: false, violation: "false_urgency" }`  
*Pass:* Violation detected

**TC-GN-027** [UNIT] Investment advice pattern blocked  
*Setup:* Body contains "This property is a great investment and will definitely appreciate."  
*Expected:* Violation `investment_advice` detected  
*Pass:* Correct violation category

**TC-GN-028** [UNIT] Legal claim pattern blocked  
*Setup:* Body contains "Clean title guaranteed, no legal issues."  
*Expected:* Violation `legal_claim` detected  
*Pass:* Correct category

**TC-GN-029** [UNIT] Legitimate urgency passes  
*Setup:* Body contains "Offer deadline is Friday, April 19 at 5 PM."  
*Expected:* No violation — specific date is not false urgency  
*Pass:* `passed: true`

**TC-GN-030** [UNIT] Unsubstantiated neighbourhood claim blocked  
*Setup:* "This is the best neighbourhood in Vancouver."  
*Expected:* Violation `unsubstantiated_claim` detected  
*Pass:* Correct category

---

### G-N07: A/B Testing Tests

**TC-GN-031** [UNIT] `createAbTest()` splits contacts 50/50  
*Setup:* 100 eligible contacts. Create A/B test (subject A, subject B, 50/50 split)  
*Expected:* 50 newsletters created with `ab_variant: "A"`, 50 with `ab_variant: "B"`  
*Pass:* Counts confirmed

**TC-GN-032** [UNIT] A/B winner determined by open rate  
*Setup:* Variant A: 40% open rate. Variant B: 62% open rate. Run evaluator after 24h.  
*Expected:* `ab_tests.winner_variant = "B"`, `status = "complete"`  
*Pass:* Correct winner set

**TC-GN-033** [BROWSER] A/B test creation form works  
*Setup:* Navigate to `/newsletters/ab-testing`. Fill form: subject A, subject B, 50/50 split, 24h evaluation.  
*Expected:* Form submits, new test appears in active tests table with status "Running"  
*Pass:* Table row visible with correct subjects

**TC-GN-034** [BROWSER] Winner badge appears after evaluation  
*Setup:* Create test with seeded data showing B winning. Navigate to test detail.  
*Expected:* "Winner: B ✓" badge shown next to variant B row  
*Pass:* Badge element visible

---

### G-N08: Regenerate Button Tests

**TC-GN-035** [UNIT] `regenerateNewsletter()` deletes old draft and creates new  
*Setup:* Create draft newsletter. Call `regenerateNewsletter(newsletterId)`.  
*Expected:* Old newsletter deleted from DB. New newsletter with same contact_id, email_type created.  
*Pass:* Old ID not found, new record exists

**TC-GN-036** [UNIT] Max 3 regenerations enforced  
*Setup:* Newsletter with `regeneration_count: 3`. Call `regenerateNewsletter()`.  
*Expected:* Returns `{ error: "Max regenerations reached" }`. No deletion occurs.  
*Pass:* Error returned, count stays 3

**TC-GN-037** [BROWSER] Regenerate button visible on draft items  
*Setup:* Navigate to `/newsletters/queue`. Find draft.  
*Expected:* "Regenerate" button visible. Shows regeneration count "0 of 3 used".  
*Pass:* Button rendered

**TC-GN-038** [BROWSER] Clicking regenerate shows spinner then new draft  
*Setup:* Click "Regenerate" on a draft.  
*Expected:* Button shows loading spinner. After 3–5s, new draft appears in queue (new subject visible). Count shows "1 of 3 used".  
*Pass:* Playwright waits for queue to refresh, verifies new subject

---

### G-N09: Error Monitoring Tests

**TC-GN-039** [UNIT] Send failure logs to `send_errors` table  
*Setup:* Mock Resend to throw error. Call `sendNewsletter(newsletterId)`.  
*Expected:* Row in `send_errors` with `error_type: "send_failure"`, `newsletter_id`, `error_message`  
*Pass:* Row exists

**TC-GN-040** [UNIT] Webhook crash logs to `send_errors`  
*Setup:* Mock webhook handler to throw mid-processing. POST webhook event.  
*Expected:* Row in `send_errors` with `error_type: "webhook_error"`  
*Pass:* Row exists, request returns 200 (graceful)

**TC-GN-041** [BROWSER] Errors visible in control panel  
*Setup:* Seed 2 send_errors. Navigate to `/newsletters/control`.  
*Expected:* "Errors" tab shows count badge "2". Table shows both errors with retry button.  
*Pass:* Error rows visible

---

## Section 2 — Journey & Intelligence Gap Tests (G-J01 through G-J06)

---

### G-J01: Listing Status → Journey Phase Tests

**TC-GJ-001** [UNIT] Listing → conditional advances seller to `under_contract`  
*Setup:* Seller contact enrolled in `active` journey. Update listing status to "conditional".  
*Expected:* `contact_journeys.current_phase = "under_contract"` for seller contact  
*Pass:* Phase verified in DB

**TC-GJ-002** [UNIT] Listing → sold advances seller to `past_client`  
*Setup:* Same seller. Update listing status to "sold".  
*Expected:* `contact_journeys.current_phase = "past_client"`  
*Pass:* Phase updated

**TC-GJ-003** [UNIT] Listing → sold advances linked buyer to `past_client`  
*Setup:* Listing with linked buyer appointment. Mark listing sold.  
*Expected:* Buyer contact's journey also advances to `past_client`  
*Pass:* Both seller and buyer updated

**TC-GJ-004** [UNIT] No buyer linked — only seller advanced, no error  
*Setup:* Listing with no buyer appointment. Mark sold.  
*Expected:* Seller advanced. No error thrown. Buyer journey unchanged.  
*Pass:* No exception, seller phase = `past_client`

**TC-GJ-005** [UNIT] Phase advance resets `emails_sent_in_phase` to 0  
*Expected:* After phase advance, `emails_sent_in_phase = 0`  
*Pass:* Counter reset confirmed

**TC-GJ-006** [UNIT] Phase advance schedules `next_email_at = NOW()`  
*Expected:* `next_email_at` is within 5 seconds of `Date.now()` after phase advance  
*Pass:* Timestamp confirmed

**TC-GJ-007** [INTEGRATION] Full flow: listing sold → closing email sent  
*Setup:* Create listing with active seller journey. Mark listing sold. Run queue processor.  
*Expected:* Queue processes seller journey, generates "closing_checklist" email, sends via Resend (test mode)  
*Pass:* Newsletter record with `email_type: closing_checklist` and `status: sent`

**TC-GJ-008** [JOURNEY] Full lifecycle: lead → active → under_contract → past_client  
*Setup:* Create contact, enroll in buyer journey. Simulate: (1) click book_showing, (2) listing → conditional, (3) listing → sold.  
*Expected:* Phase sequence correct at each step. Correct email types queued per phase.  
*Pass:* All 4 phase transitions verified, email types match schedule

**TC-GJ-009** [BROWSER] Listing status change UI triggers phase advance  
*Setup:* Open listing detail page. Change status dropdown from "Active" to "Sold". Confirm.  
*Expected:* No error. Navigate to contact detail — journey phase shows "Past Client".  
*Pass:* Playwright verifies phase badge on contact page

---

### G-J02: Send Governor Tests

**TC-GJ-010** [UNIT] Queue skips contact when governor defers  
*Setup:* Contact with `engagement_score: 15`, `engagement_trend: declining`. Active journey due.  
*Expected:* `processJourneyQueue()` skips send. `next_email_at` updated to `now + suggestedDelay`  
*Pass:* `generateAndQueueNewsletter` never called, `next_email_at` updated

**TC-GJ-011** [UNIT] Queue pauses journey when governor auto-sunsets  
*Setup:* Contact with 0 opens in 120 days. Journey due.  
*Expected:* Journey paused with `is_paused: true`, `pause_reason: "auto_sunset"`. Agent recommendation created.  
*Pass:* Journey paused, recommendation in DB

**TC-GJ-012** [UNIT] Queue sends normally when governor allows  
*Setup:* Contact with `engagement_score: 65`, within frequency cap.  
*Expected:* `generateAndQueueNewsletter` called once  
*Pass:* Function called

**TC-GJ-013** [UNIT] Realtor config frequency override respected  
*Setup:* Realtor config has `frequency_caps.active = "1/week"` (overrides default 1/2 days). Contact in active phase, sent 3 days ago.  
*Expected:* Governor defers (3 days < 7 days for weekly cap)  
*Pass:* Send skipped

**TC-GJ-014** [INTEGRATION] Queue run with mixed contacts respects governor  
*Setup:* 5 contacts: 2 low engagement (should defer), 1 auto-sunset, 2 normal (should send)  
*Expected:* `processed: 2`, `skipped_governor: 3` (1 paused + 2 deferred)  
*Pass:* Counts match

---

### G-J03: Phase Exhaustion Tests

**TC-GJ-015** [UNIT] Exhausted lead phase with engaged contact advances to active  
*Setup:* Contact in lead phase, `emails_sent_in_phase = 5` (schedule length = 5), `engagement_score = 65`.  
*Expected:* Phase advances to `active`, `emails_sent_in_phase = 0`, `next_email_at` set  
*Pass:* Active phase confirmed

**TC-GJ-016** [UNIT] Exhausted lead phase with unengaged contact moves to dormant  
*Setup:* `emails_sent_in_phase = 5`, `engagement_score = 25`  
*Expected:* Phase moves to `dormant`, dormant re-engagement sequence starts  
*Pass:* Dormant phase confirmed

**TC-GJ-017** [UNIT] `past_client` phase loops (resets counter, doesn't advance)  
*Setup:* Contact in `past_client` phase, `emails_sent_in_phase = 5` (schedule length = 5)  
*Expected:* `emails_sent_in_phase = 0`. `next_email_at` = 1 year from now. Phase stays `past_client`.  
*Pass:* Annual loop confirmed

**TC-GJ-018** [UNIT] No contact has `next_email_at = NULL` after queue run  
*Setup:* Run queue with 10 contacts, some phase-exhausted.  
*Expected:* Zero contacts with `is_paused = false AND next_email_at IS NULL` after queue run  
*Pass:* Query returns 0 rows

**TC-GJ-019** [INTEGRATION] Phase exhaustion audit log entry created  
*Expected:* `journey_events` table has entry with `event_type: "phase_exhausted"`, correct `from_phase`, `to_phase`, `reason`  
*Pass:* Row verified

---

### G-J04: Lead Scoring Cron Tests

**TC-GJ-020** [UNIT] `score-contacts` cron prioritizes contacts with emails due today  
*Setup:* 10 contacts with `next_email_at` today, 40 with stale scores  
*Expected:* Cron scores the 10 due-today contacts first (within first batch)  
*Pass:* First 10 scored contacts match due contacts

**TC-GJ-021** [UNIT] Cron updates `ai_lead_score_updated_at`  
*Expected:* After scoring, `contacts.ai_lead_score_updated_at` within 5s of `Date.now()`  
*Pass:* Timestamp updated

**TC-GJ-022** [UNIT] Stale contacts (score > 24h old) included in batch  
*Setup:* Contact with `ai_lead_score_updated_at = 30 hours ago`  
*Expected:* Contact included in scoring batch  
*Pass:* Contact scored

**TC-GJ-023** [INTEGRATION] Lead score personalization hints populated  
*Setup:* Contact with click history (3 Kitsilano clicks, 2 market_stats). Run scorer.  
*Expected:* `ai_lead_score.personalization_hints.interests` contains "Kitsilano"  
*Pass:* Field populated

**TC-GJ-024** [INTEGRATION] Stage advancement recommendation created for high-readiness contact  
*Setup:* Contact with `buying_readiness: 85` from scorer. Run scorer.  
*Expected:* `agent_recommendations` row with `action_type: "advance_stage"`  
*Pass:* Recommendation exists

---

### G-J05: Bounce Intelligence Decay Tests

**TC-GJ-025** [UNIT] Hard bounce decays engagement score by 30  
*Setup:* Contact with `engagement_score: 75`. Receive hard bounce webhook event.  
*Expected:* `engagement_score = 45`, `bounce_count = 1`, `last_bounce_type = "hard"`  
*Pass:* Values confirmed

**TC-GJ-026** [UNIT] Soft bounce decays score by 10 only  
*Setup:* Contact with `engagement_score: 75`. Receive soft bounce.  
*Expected:* `engagement_score = 65`, journey NOT paused  
*Pass:* Soft bounce handled differently

**TC-GJ-027** [UNIT] Score cannot go below 0 on bounce  
*Setup:* Contact with `engagement_score: 5`. Hard bounce.  
*Expected:* `engagement_score = 0` (not -25)  
*Pass:* Floor respected

**TC-GJ-028** [UNIT] Agent recommendation created on hard bounce  
*Expected:* `agent_recommendations` row with `action_type: "verify_email"`, `priority: "high"`  
*Pass:* Recommendation exists

**TC-GJ-029** [INTEGRATION] 3 consecutive soft bounces trigger hard-bounce treatment  
*Setup:* Contact receives 3 soft bounces. Check state.  
*Expected:* Journey paused (as if hard bounce), score decayed as hard bounce  
*Pass:* Journey paused after 3rd soft bounce

---

### G-J06: Complaint vs Unsubscribe Tests

**TC-GJ-030** [UNIT] Unsubscribe sets `unsubscribe_reason = "user_request"`  
*Setup:* POST webhook with `type: "email.unsubscribed"`  
*Expected:* `contacts.unsubscribe_reason = "user_request"`. No complaint fields set.  
*Pass:* Correct field set

**TC-GJ-031** [UNIT] Complaint sets `complaint_count++` and `last_complaint_at`  
*Setup:* POST webhook with `type: "email.complained"`  
*Expected:* `complaint_count = 1`, `last_complaint_at` within 5s of now, `unsubscribe_reason = "spam_complaint"`  
*Pass:* All fields correct

**TC-GJ-032** [UNIT] Complained contact cannot be re-enrolled  
*Setup:* Contact with `complaint_count: 1`. Call `enrollInJourney()`.  
*Expected:* Enrollment rejected: `{ error: "Contact has spam complaints" }`  
*Pass:* Error returned, no journey created

**TC-GJ-033** [UNIT] Urgent agent recommendation created on complaint  
*Expected:* `agent_recommendations` row with `action_type: "review_targeting"`, `priority: "urgent"`  
*Pass:* Recommendation exists with urgent priority

**TC-GJ-034** [BROWSER] Complained contact shows warning badge in contacts list  
*Setup:* Seed contact with `complaint_count: 1`. Navigate to `/contacts`.  
*Expected:* Contact row shows "Spam Complaint" red warning badge  
*Pass:* Playwright finds badge element

**TC-GJ-035** [BROWSER] Complained contact blocked in approval queue  
*Setup:* Draft newsletter for complained contact. Navigate to queue.  
*Expected:* Item shows "Spam Complaint — Cannot Send" warning. Approve button disabled.  
*Pass:* Button disabled attribute confirmed

---

## Section 3 — Email Quality & Design Gap Tests (G-E01 through G-E10)

---

### G-E01 & G-E02: Design System & Token Tests

**TC-GE-001** [UNIT] `email-design-tokens.ts` exports three valid theme objects  
*Expected:* `STANDARD_THEME`, `LUXURY_THEME`, `EDITORIAL_THEME` all have required fields: colors, typography, spacing, radius, shadow  
*Pass:* No TypeScript errors, all fields present

**TC-GE-002** [UNIT] `assembleEmail()` uses tokens from correct theme  
*Setup:* Call `assembleEmail("listing_alert", data, "luxury")`. Parse returned HTML.  
*Expected:* Background color in HTML matches `LUXURY_THEME.colors.bg` (#ffffff). Accent color matches `LUXURY_THEME.colors.accent` (#1a1a1a).  
*Pass:* Correct hex values in output HTML

**TC-GE-003** [UNIT] No hardcoded hex values remain in `email-blocks.ts`  
*Setup:* Read `email-blocks.ts`. Search for hex color patterns `#[0-9a-fA-F]{3,6}`.  
*Expected:* Zero matches (all replaced with token references)  
*Pass:* Zero regex matches

**TC-GE-004** [UNIT] Default theme for listing_alert is `luxury`  
*Expected:* `getDefaultTheme("listing_alert") === "luxury"`  
*Pass:* Correct value returned

**TC-GE-005** [UNIT] Default theme for market_update is `editorial`  
*Expected:* `getDefaultTheme("market_update") === "editorial"`  
*Pass:* Correct value returned

**TC-GE-006** [UNIT] Default theme for welcome_drip is `standard`  
*Expected:* `getDefaultTheme("welcome") === "standard"`  
*Pass:* Correct value returned

---

### G-E03 & G-E04: Typography & Spacing Tests

**TC-GE-007** [UNIT] Only allowed font sizes appear in output HTML  
*Setup:* Generate any email template with luxury theme. Parse HTML for `font-size` values.  
*Expected:* All font sizes match the scale: 11px, 13px, 15px, 17px, 20px, 24px, 32px  
*Pass:* No other values found

**TC-GE-008** [UNIT] Only 8px-grid spacing values in output HTML (luxury theme)  
*Setup:* Generate listing_alert email. Parse HTML for padding and margin values.  
*Expected:* All values are multiples of 8 (8, 16, 24, 32, 40, 48) or 4px  
*Pass:* No other spacing values found

**TC-GE-009** [UNIT] Single font family in luxury theme output  
*Expected:* All `font-family` values match `LUXURY_THEME.typography.fontFamily`  
*Pass:* No Georgia or serif fonts in luxury theme output

---

### G-E05: Journey-Aware Layout Tests

**TC-GE-010** [UNIT] `lead` phase listing_alert uses full showcase blocks  
*Setup:* `assembleEmail("listing_alert", data, "luxury", "lead", 30)`.  
*Expected:* Output HTML contains blocks: header, heroImage, priceBar, personalNote, photoGallery  
*Pass:* All expected blocks present in output

**TC-GE-011** [UNIT] `dormant` phase listing_alert uses simplified 3-block layout  
*Setup:* `assembleEmail("listing_alert", data, "luxury", "dormant", 10)`.  
*Expected:* Output HTML contains: header, heroImage, personalNote, cta, agentCard, footer only. NO priceBar, NO photoGallery (reduced layout).  
*Pass:* Expected blocks present, unexpected blocks absent

**TC-GE-012** [UNIT] `active` phase listing_alert includes openHouse block  
*Setup:* Data includes `openHouseDate`. Phase = "active".  
*Expected:* Output HTML contains openHouse block  
*Pass:* Open house block found

**TC-GE-013** [UNIT] High engagement score (≥ 70) injects priority booking banner  
*Setup:* `assembleEmail("listing_alert", data, "luxury", "lead", 75)` with `data.booking_url` set.  
*Expected:* First content block after header is `priorityBookingBanner`  
*Pass:* Priority banner HTML found at correct position

**TC-GE-014** [INTEGRATION] `generateAndQueueNewsletter()` passes journey phase to `assembleEmail()`  
*Setup:* Contact in `dormant` phase. Generate newsletter.  
*Expected:* Saved newsletter's `html_body` contains simplified dormant layout (no photoGallery block)  
*Pass:* photoGallery block NOT found in saved HTML

**TC-GE-015** [EMAIL] Luxury listing email renders correctly in Gmail preview  
*Setup:* Generate luxury listing_alert email for active buyer. Send to test inbox.  
*Expected:* Open in Gmail: full-bleed hero, text metrics bar, clean photo grid, minimal agent card  
*Pass:* Visual matches EVVancouver reference pattern (manual verification)

---

### G-E06: priceBar Redesign Tests

**TC-GE-016** [UNIT] Luxury theme priceBar renders as text, not boxes  
*Setup:* `priceBar(data, LUXURY_THEME)`. Parse HTML.  
*Expected:* No `background` color on metric cells. Price in 32px, dark text. Metrics in a single text line with separators.  
*Pass:* No background-color on cells, correct font size

**TC-GE-017** [UNIT] Standard theme priceBar still renders box widgets  
*Setup:* `priceBar(data, STANDARD_THEME)`.  
*Expected:* Background color present on metric cells (existing behavior preserved)  
*Pass:* Background-color found

**TC-GE-018** [UNIT] Missing price value degrades gracefully  
*Setup:* `priceBar({ price: null, beds: 3, baths: 2 }, LUXURY_THEME)`  
*Expected:* Metrics line renders ("3 Beds · 2 Baths"), price line omitted  
*Pass:* No error, partial output

---

### G-E07: openHouse Redesign Tests

**TC-GE-019** [UNIT] Luxury theme openHouse renders as bordered box (no gradient)  
*Setup:* `openHouse(data, LUXURY_THEME)`. Parse HTML.  
*Expected:* No `background:linear-gradient`. Border present. No emoji in output.  
*Pass:* Gradient pattern not found, emoji pattern not found

**TC-GE-020** [UNIT] Standard theme openHouse retains gradient  
*Expected:* Gradient present in standard theme output (legacy behavior preserved)  
*Pass:* Gradient found

**TC-GE-021** [UNIT] Multiple open house slots render correctly  
*Setup:* Data has 2 open house slots (Sat + Sun).  
*Expected:* Both slots visible in single bordered box, separated by `<br>` or separate lines  
*Pass:* Both date strings found in output

---

### G-E08: Luxury Listing Template Tests

**TC-GE-022** [UNIT] `luxury_listing` template has exactly 8 blocks  
*Expected:* `TEMPLATE_BLOCKS.luxury_listing.default.length === 8`  
*Pass:* Block count matches spec

**TC-GE-023** [UNIT] Luxury listing auto-selected for high-priced listings  
*Setup:* Listing with `price: 1200000` (> $800K threshold).  
*Expected:* `getEmailType(listing)` returns `luxury_listing`  
*Pass:* Correct type selected

**TC-GE-024** [UNIT] Hero image in luxury template is full-width (no padding)  
*Setup:* Generate `luxury_listing` email. Parse hero block HTML.  
*Expected:* `<img>` wrapper `<td>` has `padding: 0`  
*Pass:* Zero padding on hero

**TC-GE-025** [UNIT] Agent card in luxury theme has no avatar circle  
*Setup:* `agentCard(data, LUXURY_THEME)`. Parse HTML.  
*Expected:* No element with `border-radius: 50%` or `border-radius: 9999px`  
*Pass:* No circle element found

**TC-GE-026** [EMAIL] Luxury listing email sent to test inbox matches reference quality  
*Setup:* Generate luxury_listing email with high-quality listing data (photos, address, price). Send to test inbox.  
*Expected:* Email renders premium, minimal, clean — similar to EVVancouver reference. No widget boxes, no gradient CTAs.  
*Pass:* Manual visual verification

---

### G-E09: Photo Grid Tests

**TC-GE-027** [UNIT] Photos constrained to fixed height (160px)  
*Setup:* `photoGallery({ photos: [url1, url2, url3] }, LUXURY_THEME)`. Parse HTML.  
*Expected:* All `<img>` tags have `height="160"` attribute  
*Pass:* Height attribute confirmed

**TC-GE-028** [UNIT] Maximum 10 photos rendered  
*Setup:* Data with 15 photos.  
*Expected:* Only 10 `<img>` tags in output. "View all 15 photos" link present.  
*Pass:* Img count <= 10, link found

**TC-GE-029** [UNIT] Alt text set correctly on each photo  
*Setup:* 3 photos, `address: "123 Main St"`.  
*Expected:* Alt texts: "Photo 1 of 123 Main St", "Photo 2 of 123 Main St", "Photo 3 of 123 Main St"  
*Pass:* Alt text pattern matched

**TC-GE-030** [UNIT] Empty photos array returns empty string (no error)  
*Setup:* `photoGallery({ photos: [] }, LUXURY_THEME)`  
*Expected:* Returns `""` without throwing  
*Pass:* Empty string returned

---

### G-E10: CTA Button Tests

**TC-GE-031** [UNIT] Luxury theme CTA button has no gradient  
*Setup:* `cta({ ctaText: "Book", ctaUrl: "https://..." }, LUXURY_THEME)`. Parse HTML.  
*Expected:* No `linear-gradient` in output  
*Pass:* Gradient pattern not found

**TC-GE-032** [UNIT] Luxury theme CTA button is dark (#1a1a1a)  
*Expected:* `background:#1a1a1a` or equivalent dark color found on button element  
*Pass:* Color matched

**TC-GE-033** [UNIT] Button padding meets minimum touch target  
*Expected:* Top+bottom padding = 28px total (14px each). Confirmed in output.  
*Pass:* Padding values correct

**TC-GE-034** [UNIT] Standard theme CTA retains accent color  
*Expected:* Standard theme CTA uses `STANDARD_THEME.colors.accent` (#4f35d2)  
*Pass:* Accent color found

---

## Browser Test Scenarios (Full Flows)

---

**TC-GE-B01** [BROWSER] Generate and preview luxury listing email  
*Steps:*
1. Navigate to `/newsletters/queue`
2. Find a draft listing_alert for an active buyer
3. Click "Preview"
4. Preview iframe opens at `/api/newsletters/preview/[id]`
5. Inspect email content

*Expected:*
- Full-bleed hero image visible at top
- Property metrics as text (not boxes)
- Photo grid: 2 columns, tight
- Clean minimal agent card
- No gradients, no emoji, no widget boxes
- CTA button: dark, no gradient

*Pass:* Playwright screenshot taken. Visual diff against reference spec.

---

**TC-GE-B02** [BROWSER] Journey phase visible on contact detail and matches email received  
*Steps:*
1. Navigate to `/contacts/[id]`
2. Note current journey phase (e.g., "Active")
3. Open listing for this contact, mark as "Conditional"
4. Return to contact detail

*Expected:*
- Journey phase badge now shows "Under Contract"
- Queue shows new "Closing Checklist" email draft for this contact

*Pass:* Phase badge updated, draft email queued.

---

**TC-GE-B03** [BROWSER] Approval queue shows correct count after deferred separation  
*Steps:*
1. Navigate to `/newsletters/queue`
2. Count items in main queue vs "Held Back" section

*Expected:*
- Main queue shows only `draft` status
- "Held Back" section shows `deferred` with reason
- Nav badge count matches main queue count only

*Pass:* Counts verified via Playwright element count

---

## Email Delivery Tests

---

**TC-EMAIL-001** Live send: luxury listing email to test inbox  
*Setup:* Staging environment. Real contact (test email). Generate luxury_listing email.  
*Expected:* Email received. Subject contains property address. Gmail renders: hero image, clean metrics, photo grid, minimal agent card.  
*Pass:* Inbox received, visual verification against reference

**TC-EMAIL-002** Live send: CASL expired contact blocked  
*Setup:* Test contact with expired consent. Attempt send.  
*Expected:* No email received. DB shows `status: blocked`, error reason: `casl_expired`.  
*Pass:* No email in inbox

**TC-EMAIL-003** Live send: Unsubscribe link works  
*Setup:* Send email to test inbox. Click unsubscribe link.  
*Expected:* Redirected to confirmation page. Contact's `newsletter_unsubscribed = true` in DB. Journey paused.  
*Pass:* Unsubscribe confirmed in DB, journey paused

**TC-EMAIL-004** Live send: Edit draft body → approve → correct content received  
*Setup:* Draft generated with subject "Original". Edit to "EDITED". Approve.  
*Expected:* Email received with subject "EDITED".  
*Pass:* Subject confirmed in inbox

**TC-EMAIL-005** Live send: A/B test — both variants delivered to split list  
*Setup:* Create A/B test, 10 test contacts. Approve both variants.  
*Expected:* 5 emails with subject A received, 5 with subject B  
*Pass:* Subject counts verified across test inboxes

---

## Journey Flow Tests

---

**TC-JOURNEY-001** [JOURNEY] Complete buyer lifecycle: lead → active → under_contract → past_client  

*Steps:*
1. Create buyer contact, enroll in `buyer` journey (starts in `lead`)
2. Simulate email click with `score_impact: 30` (book_showing) via webhook
3. Verify phase advances to `active`
4. Create listing, link buyer. Mark listing `conditional`.
5. Verify phase advances to `under_contract`
6. Mark listing `sold`
7. Verify phase advances to `past_client`
8. Run queue processor
9. Verify correct email types queued per phase

*Expected at each step:*
- Step 2: Phase = `active`, NBA override = `open_house_invite`
- Step 4: Phase = `under_contract`, `closing_checklist` email queued
- Step 6: Phase = `past_client`, `home_anniversary` email scheduled in 30 days
- Step 8: Queue generates correct email type for current phase

*Pass:* All 4 phase transitions correct, 3 email types generated correctly

---

**TC-JOURNEY-002** [JOURNEY] Phase exhaustion → dormant → re-engagement  

*Steps:*
1. Contact in `lead` phase with `engagement_score: 20`
2. Send all 5 lead emails (set `emails_sent_in_phase = 5`)
3. Run queue processor
4. Verify moved to `dormant`
5. Simulate click (any link)
6. Verify moved back to `lead`
7. Run queue processor
8. Verify `reengagement` email queued

*Expected:*
- Step 3: Phase = `dormant`, re-engagement sequence starts
- Step 6: Journey unpaused, phase = `lead`
- Step 8: Email type = `reengagement`

*Pass:* Full re-engagement cycle confirmed

---

**TC-JOURNEY-003** [JOURNEY] Send governor blocks over-emailing during queue  

*Steps:*
1. Contact in `active` phase, last email sent 1 day ago (cap = 2 days)
2. Journey due (`next_email_at = now`)
3. Run queue processor
4. Check result

*Expected:*
- Queue skips this contact (governor defers)
- `next_email_at` updated to `now + 24h` (1 more day)
- `generateAndQueueNewsletter` never called

*Pass:* Skip confirmed, delay applied

---

## Test Tracking

All test cases must be added to `TEST_PLAN_1000.md` under the relevant section:

| Section | Test IDs to Add |
|---------|----------------|
| Section 8: Newsletter Engine | TC-GN-001 through TC-GN-041 |
| Section 11: Journey Engine | TC-GJ-001 through TC-GJ-035 |
| Section 14: Email Quality | TC-GE-001 through TC-GE-034 |
| Section 15: Email Delivery | TC-EMAIL-001 through TC-EMAIL-005 |
| Section 16: Journey Flows | TC-JOURNEY-001 through TC-JOURNEY-003 |

**Total new test cases: 118**  
**Running total after merge into TEST_PLAN_1000.md: 1,288**
