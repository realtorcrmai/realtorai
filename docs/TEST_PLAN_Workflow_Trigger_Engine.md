<!-- docs-audit: src/lib/workflow-engine.ts, src/actions/workflows.ts -->
# Test Plan: Workflow Trigger Engine + Email Journey System

**Total User Stories:** 1000+
**Test Types:** Unit, Integration, E2E Browser, Real-time Journey
**Automation:** `scripts/eval-trigger-engine.mjs`

---

## SECTION 1: CONTACT CREATION TRIGGERS (Stories 1-100)

### 1.1 Buyer Contact Creation (1-25)

**US-001: New buyer contact auto-enrolls in journey**
- Given: No contacts exist
- When: I create a buyer contact with name "Test Buyer" and phone "+16045550001"
- Then: A contact_journey record is created with journey_type="buyer", current_phase="lead"
- AC: Journey has is_paused=false, send_mode="review", trust_level=0
- Test: Query contact_journeys WHERE contact_id = new_id → assert 1 row

**US-002: New buyer triggers "Speed to Contact" workflow enrollment**
- Given: "Speed to Contact" workflow exists with trigger_type="new_lead"
- When: I create a buyer contact
- Then: A workflow_enrollment is created for "Speed to Contact"
- AC: Enrollment has status="active", current_step=0
- Test: Query workflow_enrollments WHERE contact_id AND workflow.slug="speed_to_contact" → assert 1 row

**US-003: New buyer triggers "Buyer Lifecycle" workflow enrollment**
- Given: "Buyer Lifecycle" workflow exists with trigger_type="new_lead", contact_type="buyer"
- When: I create a buyer contact
- Then: A workflow_enrollment is created for "Buyer Lifecycle"
- AC: Enrollment status="active"
- Test: Query workflow_enrollments WHERE workflow.slug="buyer_lifecycle" → assert 1 row

**US-004: New buyer does NOT trigger seller workflows**
- Given: "Seller Lifecycle" workflow exists with contact_type="seller"
- When: I create a buyer contact
- Then: NO enrollment in "Seller Lifecycle"
- Test: Query workflow_enrollments WHERE workflow.slug="seller_lifecycle" AND contact_id → assert 0 rows

**US-005: Welcome email draft created from Speed to Contact workflow, NOT auto-enroll**
- Given: Contact created
- When: Trigger engine runs
- Then: Exactly 1 welcome email draft in newsletters table (from workflow, not autoEnrollAndWelcome)
- AC: newsletters WHERE contact_id AND email_type="welcome" AND status="draft" → assert exactly 1 row
- Test: Verify no duplicate welcome emails

**US-006: Welcome email has Apple-quality HTML**
- Given: Welcome email draft created
- When: I read the html_body
- Then: HTML contains "Realtors360" header, gradient hero, pill CTA button, agent card, unsubscribe footer
- AC: html_body.length > 3000 bytes, contains "border-radius:980px" (pill button), contains "Unsubscribe"
- Test: Parse HTML, assert key elements

**US-007: Welcome email uses dynamic brand config**
- Given: realtor_agent_config has brand_config.name = "TestAgent"
- When: Welcome email is generated
- Then: HTML contains "TestAgent" not "Kunal"
- Test: Check html_body includes brand name from DB

**US-008: Welcome email passes text pipeline**
- Given: Contact notes contain "Looking for 3BR in Kitsilano"
- When: Welcome email is generated
- Then: Email intro mentions Kitsilano (personalization)
- AC: No unresolved tokens ({first_name} etc.), no compliance violations
- Test: Check html_body for contact-specific content

**US-009: Welcome email passes quality check**
- Given: Welcome email generated
- When: Quality scorer runs
- Then: Score ≥ 6/10 (acceptable quality)
- AC: quality_score field is set on newsletter record
- Test: Query newsletter WHERE quality_score IS NOT NULL

**US-010: Duplicate contact creation doesn't duplicate journey**
- Given: Contact "Test Buyer" already exists with a journey
- When: I try to create another contact with same email
- Then: No duplicate journey enrollment
- Test: Count contact_journeys for this email → assert 1

**US-011: Contact with no email still gets journey but no welcome email**
- Given: Contact has phone but no email
- When: Contact created
- Then: Journey created (for SMS nurture), no newsletter draft
- Test: Journey exists, newsletters count = 0 for this contact

**US-012: Contact with no type defaults to buyer**
- Given: Contact type not specified
- When: Contact created
- Then: Journey type = "buyer" by default
- Test: contact_journeys.journey_type = "buyer"

**US-013: Multiple contacts created rapidly don't cause race conditions**
- Given: System is idle
- When: 5 contacts created within 1 second
- Then: Each gets exactly 1 journey and 1 welcome email
- Test: Create 5 contacts in parallel, verify 5 journeys, 5 welcome drafts, 0 duplicates

**US-014: Contact creation fires webhook for engagement tracking setup**
- Given: Resend webhook configured
- When: Welcome email is eventually sent
- Then: newsletter record has tags for tracking (newsletter_id, contact_id)
- Test: Check AI Agent tab shows the draft with correct contact info

**US-015: Agent/partner type contact does NOT get journey or welcome**
- Given: Contact type = "partner"
- When: Contact created
- Then: No journey enrollment, no welcome email
- Test: contact_journeys count = 0, newsletters count = 0

**US-016: Contact with buyer_preferences gets personalized welcome**
- Given: buyer_preferences = { areas: ["Kitsilano"], budget_min: 800000, budget_max: 1200000 }
- When: Welcome email generated
- Then: Email mentions Kitsilano and budget range
- Test: html_body contains "Kitsilano" or "800"

**US-017: Contact notes parsed for area extraction**
- Given: notes = "Looking for a condo in East Vancouver near transit"
- When: Welcome email generated
- Then: Area "East Vancouver" extracted and used in personalization
- Test: Email intro mentions East Vancouver

**US-018: next_email_at set to 3-7 days from now on journey creation**
- Given: Contact created
- When: Journey enrolled
- Then: next_email_at is between 3-7 days in future
- Test: Parse date, assert range

**US-019: Journey created_at matches contact created_at (same timestamp)**
- Given: Contact created at time T
- When: Journey auto-enrolled
- Then: Journey created_at ≈ T (within 5 seconds)
- Test: Compare timestamps

**US-020: Contact in AI Agent queue shows correct info**
- Given: Contact created with welcome draft
- When: I open /newsletters → AI Agent tab
- Then: Draft shows contact name, subject, email type badge, approve/skip buttons
- Test: Playwright — navigate to tab, verify content

**US-021: Approving welcome email sends via Resend**
- Given: Welcome draft in queue
- When: Click "Approve & Send"
- Then: Email sent, status changes to "sent", resend_message_id populated
- Test: Check newsletter status + resend_message_id NOT NULL

**US-022: Skipping welcome email marks as "skipped"**
- Given: Welcome draft in queue
- When: Click "Skip"
- Then: Status = "skipped", no email sent
- Test: Newsletter status = "skipped"

**US-023: Welcome email preview shows correctly in modal**
- Given: Welcome draft exists
- When: Click "Preview" button
- Then: Modal opens with rendered HTML in iframe
- Test: Playwright — click preview, verify iframe visible

**US-024: Contact appears in Buyer Pipeline "New Leads" count**
- Given: Buyer contact created
- When: I open /newsletters → Overview tab
- Then: Buyer Pipeline shows +1 in "New Leads" row
- Test: Playwright — verify pipeline count

**US-025: Contact appears in Journeys tab with "lead" phase**
- Given: Buyer contact created
- When: I open /newsletters → Journeys tab → search by name
- Then: Contact shows with 🟢 lead phase badge
- Test: Playwright — search and verify

### 1.2 Seller Contact Creation (26-50)

**US-026: New seller auto-enrolls in seller journey**
- AC: journey_type="seller", current_phase="lead"
- Test: Query contact_journeys

**US-027: Seller triggers "Seller Lifecycle" workflow**
- AC: workflow_enrollment for seller_lifecycle created
- Test: Query workflow_enrollments

**US-028: Seller does NOT trigger buyer workflows**
- AC: No enrollment in buyer_lifecycle
- Test: Assert 0 rows

**US-029: Seller welcome email has selling-specific content**
- AC: Email mentions "sell" or "listing" or "CMA", not "find your home"
- Test: Check html_body content

**US-030: Seller with property address gets address in welcome**
- AC: Email mentions the property address from notes
- Test: Check html_body

**US-031: Seller appears in Seller Pipeline "New Leads"**
- Test: Playwright — verify pipeline count

**US-032: Seller welcome uses seller_report or cma_preview template blocks**
- AC: Email type appropriate for sellers
- Test: Check email_type field

**US-033-050: [Repeat US-005 through US-025 patterns for sellers]**
- Same tests as buyers but with seller-specific assertions
- Different workflow matches, different email content, different pipeline counts

### 1.3 Edge Cases (51-75)

**US-051: Contact with type "other" gets journey but generic welcome**
- AC: Journey created, welcome email generic (no buyer/seller specific)
- Test: Verify

**US-052: Contact with very long notes (>5000 chars) doesn't break**
- AC: Contact created, email generated, no errors
- Test: Create contact with 5000 char notes

**US-053: Contact with special characters in name (O'Brien, José)**
- AC: Email correctly shows O'Brien, not HTML-escaped
- Test: Check html_body

**US-054: Contact with emoji in notes doesn't break**
- AC: System handles gracefully
- Test: Create contact with emoji notes

**US-055: Contact with no phone number**
- AC: Journey created, call buttons disabled in UI
- Test: Verify

**US-056: Contact with international phone (+44, +91)**
- AC: Phone formatted correctly, no errors
- Test: Create and verify

**US-057: Contact with email but no phone**
- AC: Welcome email sent, SMS workflows skipped
- Test: Verify

**US-058: Contact with budget as text "$800K" not number**
- AC: Budget parsed or handled gracefully in email
- Test: Check html_body

**US-059: Contact with multiple preferred areas**
- AC: Email mentions primary area, others used for matching
- Test: Check html_body

**US-060: Contact created via API endpoint (not UI)**
- AC: Same triggers fire as UI creation
- Test: POST to /api/contacts, verify journey + workflow enrollment

**US-061: Contact created with lead_status = "qualified"**
- AC: Journey still starts at "lead" phase (lead_status ≠ journey phase)
- Test: Verify current_phase = "lead"

**US-062: Rapid creation of 50 contacts in 10 seconds**
- AC: All 50 get journeys, no duplicates, no timeouts
- Test: Parallel creation, count assertions

**US-063: Contact deleted immediately after creation**
- AC: Journey and newsletter cleaned up (or orphaned gracefully)
- Test: Delete contact, check for orphaned records

**US-064: Contact updated (name change) after welcome email drafted**
- AC: Draft still valid, shows old name (not re-generated)
- Test: Update contact, check draft unchanged

**US-065: Contact type changed from buyer to seller after creation**
- AC: New seller journey created, buyer journey paused or removed
- Test: Verify journeys

**US-066-075: [Additional edge cases for contact fields, validation errors, concurrent access]**

### 1.4 UI Verification (76-100)

**US-076: Overview tab stat pills update after contact creation**
- Test: Playwright — create contact, refresh, verify pill counts change

**US-077: Hot Buyers card shows contact if score ≥ 60**
- Test: Playwright — create contact with high score, verify in hot buyers

**US-078: AI Agent tab shows new draft after contact creation**
- Test: Playwright — create contact, switch to AI Agent tab, verify draft

**US-079: Journeys tab shows new enrollment**
- Test: Playwright — switch to Journeys, search, verify

**US-080: Campaigns tab listing blast shows active listings**
- Test: Playwright — verify listings appear

**US-081: Analytics tab updates email counts**
- Test: Playwright — verify sent/draft counts

**US-082: Settings tab toggles work**
- Test: Playwright — toggle switches, verify state changes

**US-083: Pipeline drilldown shows new contact in phase**
- Test: Playwright — click phase count, verify contact in expanded list

**US-084: Approval queue badge count updates**
- Test: Playwright — verify tab badge shows correct pending count

**US-085: Contact detail page shows journey progress bar**
- Test: Playwright — navigate to contact, verify progress bar

**US-086: Contact detail shows email history**
- Test: Playwright — verify welcome draft in history

**US-087: Contact detail shows intelligence panel**
- Test: Playwright — verify engagement score, interests

**US-088: Contact search finds new contact**
- Test: Playwright — type name in search, verify result

**US-089: Mobile responsive — all tabs work at 375px**
- Test: Playwright — set viewport 375px, navigate all tabs

**US-090: Dark mode — emails render correctly**
- Test: Playwright — force dark mode, check email preview

**US-091: Page scroll works on all tabs**
- Test: Playwright — verify scrollHeight > clientHeight on each tab

**US-092: No JS errors on any page**
- Test: Playwright — listen for page errors, assert 0

**US-093: No horizontal overflow on any page**
- Test: Playwright — verify no horizontal scrollbar

**US-094-100: [Additional UI tests for responsiveness, loading states, error states]**

---

## SECTION 2: PHASE TRANSITIONS (Stories 101-250)

### 2.1 Lead → Active (101-130)

**US-101: Booking a showing advances buyer from lead to active**
- Given: Buyer in "lead" phase
- When: Showing booked for this buyer
- Then: Journey phase = "active"
- AC: contact_journeys.current_phase = "active", phase_entered_at updated
- Test: Create showing, query journey

**US-102: Phase change to active triggers "Buyer Nurture" workflow**
- Given: Buyer just moved to "active"
- When: Trigger engine fires
- Then: Enrolled in "Buyer Nurture" workflow
- Test: Query workflow_enrollments

**US-103: Phase change pauses "Speed to Contact" if still running**
- Given: Buyer was in "Speed to Contact" workflow
- When: Phase changes to "active"
- Then: Speed to Contact enrollment paused
- Test: workflow_enrollment.status = "paused" or "completed"

**US-104: Active buyer gets listing alerts (not welcome/neighbourhood)**
- Given: Buyer in active phase
- When: Cron processes next email
- Then: Email type is "listing_alert" not "welcome"
- Test: Check next newsletter.email_type

**US-105: First showing feedback triggers post-showing email**
- Given: Showing completed
- When: Feedback logged
- Then: Post-showing follow-up email drafted
- Test: Newsletter with email_type related to showing

**US-106-130: [Phase transition variations, multiple showings, cancelled showings, seller equivalent transitions]**

### 2.2 Active → Under Contract (131-160)

**US-131: Offer accepted advances to under_contract**
- Given: Buyer in "active" phase
- When: Offer status changed to "accepted"
- Then: Phase = "under_contract"
- Test: Query journey

**US-132: Under contract triggers closing preparation workflow**
- AC: Enrolled in post-close prep workflow
- Test: Query enrollments

**US-133: Active workflows paused on contract**
- AC: Buyer Nurture paused, listing alerts stop
- Test: Verify enrollment status

**US-134: Contract emails are milestone-based (not time-based)**
- AC: Emails trigger on: inspection date, subject removal, closing date
- Test: Check workflow steps

**US-135-160: [Offer rejected goes back to active, multiple offers, seller under contract, conditional offers, subject removal]**

### 2.3 Under Contract → Past Client (161-190)

**US-161: Deal closing advances to past_client**
- Given: Under contract
- When: Deal status = "closed"
- Then: Phase = "past_client"
- Test: Query journey

**US-162: Congratulations email drafted**
- AC: Email type = "just_sold" or congratulations
- Test: Check newsletters

**US-163: Post-close buyer workflow enrolled**
- AC: Enrolled in "Post-Close Buyer"
- Test: Query enrollments

**US-164: All active/contract workflows paused**
- AC: No more listing alerts or showing follow-ups
- Test: Verify

**US-165: Home anniversary scheduled for 1 year from close**
- AC: Workflow step scheduled for ~365 days
- Test: Check next_run_at

**US-166-190: [Seller post-close, deal falls through (back to active), referral request timing, quarterly check-in scheduling]**

### 2.4 Any → Dormant (191-220)

**US-191: 60 days no engagement moves to dormant**
- Given: Contact with no opens/clicks in 60 days
- When: Daily cron runs
- Then: Phase = "dormant"
- Test: Query journey

**US-192: Dormant triggers "Lead Re-Engagement" workflow**
- AC: Enrolled in re-engagement
- Test: Query enrollments

**US-193: All other workflows paused on dormancy**
- AC: Active workflows stopped
- Test: Verify

**US-194: Re-engagement email has different content (not listing alert)**
- AC: Email type = "re_engagement" with "market changed" angle
- Test: Check newsletter

**US-195: Contact re-engages (opens email) → back to active**
- Given: Dormant contact
- When: Opens re-engagement email
- Then: Phase changes back to previous phase or "active"
- Test: Simulate open event, check journey

**US-196-220: [90-day auto-sunset, CASL re-confirmation before sunset, re-engagement click triggers, multiple re-engagement attempts, permanent dormancy]**

### 2.5 Dormant → Reactivated (221-250)

**US-221: Click on re-engagement email reactivates contact**
- AC: Phase back to "lead" or "active", engagement score reset
- Test: Simulate click, verify phase

**US-222: Reactivated contact gets fresh workflow enrollment**
- AC: New buyer/seller lifecycle enrollment
- Test: Query enrollments

**US-223: No duplicate welcome email on reactivation**
- AC: Workflow skips welcome step for known contacts
- Test: Count welcome emails total ≤ 1

**US-224-250: [Reactivation from different phases, score rebuild, workflow step resumption, manual reactivation by realtor]**

---

## SECTION 3: WORKFLOW EXECUTION (Stories 251-450)

### 3.1 Step Execution (251-300)

**US-251: Workflow step with delay executes after delay**
- Given: Step with delay_minutes=4320 (3 days)
- When: Cron runs 3 days after enrollment
- Then: Step executes
- Test: Mock time, run cron, verify

**US-252: Email step creates draft in approval queue**
- Given: Workflow step action_type="auto_email"
- When: Step executes
- Then: Newsletter draft created with status="draft"
- Test: Check newsletters table

**US-253: Email step uses Apple-quality block template**
- AC: html_body from assembleEmail(), not plain text
- Test: Check html_body contains block markers

**US-254: Email step runs text pipeline**
- AC: Personalization applied, compliance checked
- Test: Check for pipeline corrections in ai_context

**US-255: Email step runs quality scoring**
- AC: quality_score set on newsletter
- Test: Check quality_score field

**US-256: Low quality email (<6) stays as draft for review**
- AC: Status remains "draft", not auto-sent
- Test: Verify status

**US-257: SMS step sends via Twilio**
- Given: Step action_type="auto_sms"
- When: Step executes
- Then: SMS sent, communication logged
- Test: Check communications table

**US-258: Wait step doesn't send anything**
- Given: Step action_type="wait"
- When: Step executes
- Then: next_run_at updated, no email/SMS
- Test: Verify no new newsletter

**US-259: Manual task step creates task for realtor**
- Given: Step action_type="manual_task"
- When: Step executes
- Then: Task created in tasks table
- Test: Query tasks

**US-260: Steps execute in order (step_order)**
- Given: 5 steps in sequence
- When: Cron runs repeatedly
- Then: Steps fire in order 1,2,3,4,5
- Test: Verify step progression

**US-261-300: [Step conditions, exit_on_reply, step failure handling, step retry, concurrent steps, step skip conditions, template_id resolution, action_config parsing]**

### 3.2 Send Governor (301-350)

**US-301: Frequency cap blocks 4th email in a week (cap=3)**
- Given: 3 emails sent this week
- When: 4th email tries to send
- Then: Blocked with reason "frequency cap"
- AC: Suppressed record created in newsletters table
- Test: Send 4 emails, verify 4th blocked

**US-302: Suppressed email visible in AI Agent "Held Back" section**
- AC: Shows in UI with suppression reason
- Test: Playwright — verify

**US-303: Minimum gap (18h) between emails**
- Given: Email sent 10 hours ago
- When: Another email tries to send
- Then: Deferred with suggested_delay
- Test: Verify deferral

**US-304: Engagement-declining contact gets reduced frequency**
- Given: Score declining, < 30
- When: Email tries to send
- Then: Reduced to 1 per 2 weeks
- Test: Verify

**US-305: Auto-sunset after 5 emails with 0 opens in 90 days**
- Given: 5 sent, 0 opens, 90+ days
- When: Governor checks
- Then: Journey paused, email blocked
- Test: Verify pause

**US-306: Weekend sending blocked when disabled**
- Given: skip_weekends = true
- When: Email scheduled for Saturday
- Then: Deferred to Monday
- Test: Verify deferral

**US-307: Master switch OFF blocks all sends**
- Given: sending_enabled = false
- When: Any email tries to send
- Then: All blocked
- Test: Verify

**US-308-350: [Per-phase caps, quiet hours, engagement recovery, governor override by realtor, cap reset on new week, concurrent governor checks]**

### 3.3 Approval Queue (351-400)

**US-351: Approve & Send button calls sendNewsletter**
- AC: Email status changes to "sent"
- Test: Playwright — click, verify status

**US-352: Skip button marks as "skipped"**
- AC: Status = "skipped"
- Test: Playwright — click, verify

**US-353: Edit button opens inline editor**
- AC: Subject input visible, save/cancel buttons
- Test: Playwright — click edit, verify input

**US-354: Preview button opens modal with rendered HTML**
- AC: Modal with iframe showing email
- Test: Playwright — click, verify iframe

**US-355: Bulk Approve sends all pending**
- AC: All drafts become "sent"
- Test: Playwright — click, verify all statuses

**US-356: "Why this email?" shows AI reasoning**
- AC: Expandable section with reasoning text
- Test: Playwright — expand, verify content

**US-357: Sent email shows in "Sent by AI" section with engagement**
- AC: After approve, email moves to sent section with open/click counts
- Test: Playwright — verify after send

**US-358: Held Back section shows suppressed with reasons**
- AC: Suppressed emails with categories (frequency, engagement, weekend, sunset)
- Test: Playwright — verify suppressed emails visible

**US-359-400: [Loading states, error handling, concurrent approvals, approval after edit, re-queue skipped, batch operations, undo approve]**

### 3.4 Click Tracking (401-450)

**US-401: Email open event logged**
- Given: Email sent
- When: Resend fires email.opened webhook
- Then: newsletter_events record created with event_type="opened"
- Test: POST to webhook, verify event

**US-402: Click classified into correct category**
- Given: Link URL contains "/listing"
- When: Click webhook fires
- Then: link_type = "listing", score_impact = 15
- Test: POST webhook with listing URL

**US-403: High-intent click (book_showing) fires hot lead alert**
- Given: Click on book-showing link
- When: Webhook processes
- Then: agent_notifications record created with type="urgent"
- Test: Verify notification

**US-404: Contact intelligence updated on click**
- Given: Contact clicks listing
- When: Webhook processes
- Then: newsletter_intelligence.engagement_score increases, click_history appended
- Test: Check intelligence JSONB

**US-405: 12 click categories all classified correctly**
- Given: URLs for each category
- When: Classify each
- Then: Correct type + score_impact
- Test: Unit test classifyClick() with 12 URLs

**US-406: Bounce event pauses journey**
- Given: Email bounces
- When: Webhook fires
- Then: Journey paused, newsletter_unsubscribed = true
- Test: Verify

**US-407: Complaint event unsubscribes contact**
- AC: Journey paused, all future sends blocked
- Test: Verify

**US-408: Duplicate event within 60s deduplicated**
- Given: Same open event fires twice in 30s
- When: Both processed
- Then: Only 1 event recorded
- Test: POST twice, verify 1 record

**US-409-450: [Multiple clicks same email, click velocity detection, score calculation accuracy, intelligence persistence, concurrent webhooks, invalid webhook signature rejected]**

---

## SECTION 4: EMAIL QUALITY (Stories 451-550)

### 4.1 Text Pipeline (451-500)

**US-451: Token personalization replaces {first_name}**
- Test: Input with {first_name} → output has actual name

**US-452: Unresolved tokens block the email**
- Test: Input with {unknown_token} → blocked = true

**US-453: Exclamation marks removed from subject (voice rule)**
- Test: "Amazing listing!" → "Amazing listing"

**US-454: Compliance blocks price guarantee**
- Test: "guaranteed to appreciate" → blocked

**US-455: Compliance blocks competitor disparagement**
- Test: "better than RE/MAX" → blocked

**US-456: Subject dedup warns on same subject in 14 days**
- Test: Same subject sent recently → warning

**US-457: Length check warns if too long**
- Test: 300 word listing alert → warning "too long"

**US-458: Length check warns if too short**
- Test: 20 word welcome → warning "too short"

**US-459: Contact name appears in email**
- Test: Email without first name → warning "may feel impersonal"

**US-460: Empty subject blocks**
- Test: subject="" → blocked

**US-461-500: [Voice rule combinations, multiple violations, partial corrections, pipeline performance (<100ms), concurrent pipeline runs, special character handling]**

### 4.2 Quality Scoring (501-550)

**US-501: Quality scorer returns 7 dimensions**
- Test: Call scoreEmailQuality → response has all 7 fields

**US-502: Score < 4 blocks the email**
- Test: Very bad email → decision = "block"

**US-503: Score 4-6 marks for regeneration**
- Test: Mediocre email → decision = "regenerate", kept as draft

**US-504: Score ≥ 6 allows sending**
- Test: Good email → decision = "send"

**US-505: Quality feedback loop correlates scores with engagement**
- Test: Run analyzeQualityOutcomes → returns avg scores for opened/clicked/ignored

**US-506: Score stored on newsletter record**
- Test: After scoring, newsletter.quality_score is set

**US-507: Dimensions stored in ai_context**
- Test: ai_context.quality_dimensions has all 7 values

**US-508: Suggestions included in response**
- Test: qualityScore.suggestions is non-empty array

**US-509: Fallback score (6) if Claude API fails**
- Test: Mock API failure → score = 6, no block

**US-510-550: [Scoring performance, concurrent scoring, dimension correlation analysis, threshold auto-adjustment, per-email-type benchmarks]**

---

## SECTION 5: CAMPAIGN & BLAST (Stories 551-650)

### 5.1 Listing Blast (551-600)

**US-551: Blast sends to all agent contacts**
- Test: POST /api/listings/blast → emails sent to all type="partner" contacts

**US-552: Blast uses Apple-quality template**
- Test: HTML contains block system elements

**US-553: Blast runs text pipeline**
- Test: Content checked before sending

**US-554: Blast tracks each send in newsletters table**
- Test: Newsletter records created per recipient

**US-555: Blast history shows in Campaigns tab**
- Test: Playwright — verify blast appears in history

**US-556: Blast engagement tracked (opens/clicks)**
- Test: Webhook events linked to blast newsletters

**US-557-600: [Batch send limits, failed individual sends, re-send blast, blast to filtered agents, blast with open house, blast with photos, auto-blast on new listing]**

### 5.2 Custom Campaign (601-650)

**US-601: Custom campaign selects template**
- Test: Playwright — wizard step 1, select template

**US-602: Custom campaign selects contacts/segment**
- Test: Playwright — wizard step 2, choose "All buyers"

**US-603: Custom campaign customizes subject/body**
- Test: Playwright — wizard step 3, edit fields

**US-604: Custom campaign sends immediately**
- Test: Playwright — choose "Send Now", verify sent

**US-605: Custom campaign schedules for later**
- Test: Playwright — choose "Schedule", pick date, verify scheduled

**US-606-650: [Campaign history, campaign analytics, campaign duplicate, campaign cancel, A/B variant]**

---

## SECTION 6: UI/UX (Stories 651-800)

### 6.1 Overview Tab (651-700)

**US-651: Stat pills show correct counts**
**US-652: Hot Buyers card shows buyers with score ≥ 60**
**US-653: Hot Sellers card shows sellers with score ≥ 60**
**US-654: "ACT NOW" badge on urgent contacts**
**US-655: "Call Now" button has tel: link**
**US-656: Pipeline shows correct phase counts**
**US-657: Pipeline drilldown expands on click**
**US-658: AI Activity feed shows recent events**
**US-659: No horizontal scroll**
**US-660: All content above fold (no scroll needed for key info)**
**US-661-700: [Mobile responsive, dark mode, loading states, empty states, error states, refresh behavior]**

### 6.2 AI Agent Tab (701-730)
**US-701-730: [All approve/skip/edit/preview/bulk/reasoning/sent/held back tests from Section 3.3]**

### 6.3 Other Tabs (731-800)
**US-731-750: Campaigns tab wizard flows**
**US-751-770: Journeys tab search/filter/expand/pause**
**US-771-790: Analytics tab stats/scores/insights**
**US-791-800: Settings tab toggles/saves**

---

## SECTION 7: INTEGRATION & E2E (Stories 801-900)

### 7.1 Full Journey E2E (801-850)

**US-801: Complete buyer journey — lead to closed**
- Create buyer → welcome email → approve → showing booked → active → listing alerts → offer → under contract → close → past client → anniversary
- Test: Multi-step Playwright flow with DB assertions at each step

**US-802: Complete seller journey — lead to sold**
- Create seller → CMA email → listing created → weekly reports → showings → offer → close → just sold → post-close
- Test: Multi-step

**US-803: Dormancy cycle — active → dormant → re-engaged → active**
- Test: Simulate 60 days inactivity, verify dormancy, simulate click, verify reactivation

**US-804: Multi-workflow enrollment — contact in 3 workflows simultaneously**
- Test: Verify no conflicts, correct step progression per workflow

**US-805: Real email delivery to amandhindsa@outlook.com**
- Test: Approve welcome draft, verify Resend API returns success

**US-806-850: [Cross-contact workflows, referral chain, listing blast + buyer alert same listing, concurrent phase changes, data integrity under load]**

### 7.2 API Endpoint Testing (851-900)

**US-851: POST /api/cron/process-workflows returns 200**
**US-852: POST /api/cron/daily-digest returns 200**
**US-853: POST /api/cron/consent-expiry returns 200**
**US-854: POST /api/cron/weekly-learning returns 200**
**US-855: Cron rejects missing auth header (401)**
**US-856: Cron rejects wrong auth token (401)**
**US-857: POST /api/webhooks/resend processes open event**
**US-858: POST /api/webhooks/resend processes click event**
**US-859: POST /api/webhooks/resend rejects invalid signature**
**US-860: GET /api/templates/preview returns valid HTML**
**US-861-900: [All API endpoints tested with valid/invalid inputs, error handling, rate limiting, concurrent requests]**

---

## SECTION 8: DATA INTEGRITY (Stories 901-950)

**US-901: No orphaned newsletter_events (FK to newsletters)**
**US-902: No orphaned workflow_enrollments (FK to contacts)**
**US-903: No orphaned contact_journeys (FK to contacts)**
**US-904: No duplicate journeys per contact**
**US-905: No duplicate workflow enrollments (same contact + workflow)**
**US-906: Newsletter status only valid values (draft/sent/failed/skipped/suppressed)**
**US-907: Journey phase only valid values (lead/active/under_contract/past_client/dormant)**
**US-908: Engagement score between 0-100**
**US-909: quality_score between 0-10**
**US-910: All timestamps are valid ISO strings**
**US-911-950: [Cascade deletes, RLS policy verification, JSONB schema consistency, index performance, query optimization]**

---

## SECTION 9: PERFORMANCE & SCALE (Stories 951-1000)

**US-951: Page load < 3s for /newsletters**
**US-952: Page load < 3s for /contacts**
**US-953: API response < 500ms for /api/cron/process-workflows**
**US-954: Webhook processing < 200ms per event**
**US-955: Email generation < 5s (including AI)**
**US-956: Quality scoring < 3s**
**US-957: 50 concurrent contact creations complete without error**
**US-958: 100 newsletter records query in < 1s**
**US-959: 500 contacts with journeys load in < 2s**
**US-960: Seed script completes in < 60s**
**US-961-1000: [Memory usage, connection pool limits, Supabase rate limits, Resend rate limits, concurrent cron safety, large HTML email rendering, image loading performance]**

---

## EXECUTION PLAN

### Automated Test Script: `scripts/eval-trigger-engine.mjs`

Runs all testable stories automatically:
1. Setup: seed demo data
2. Phase 1: Contact creation triggers (US-001 through US-025)
3. Phase 2: Phase transitions (US-101 through US-105)
4. Phase 3: Workflow execution (US-251 through US-260)
5. Phase 4: Send governor (US-301 through US-307)
6. Phase 5: Click tracking (US-401 through US-408)
7. Phase 6: Text pipeline (US-451 through US-460)
8. Phase 7: Quality scoring (US-501 through US-509)
9. Phase 8: API endpoints (US-851 through US-860)
10. Phase 9: Data integrity (US-901 through US-910)
11. Cleanup: remove test data

### Browser Tests: `scripts/eval-browser.mjs`
- Playwright tests for all UI stories (US-076 through US-100, US-651 through US-800)

### Manual Tests
- Real email delivery (US-805)
- Mobile device testing
- Dark mode verification
