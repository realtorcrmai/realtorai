# Email System Audit Playbook
**Version:** 1.0 — 2026-04-22  
**Purpose:** Manual test + quality audit of all 6 email engines in production  
**Run with:** Both tester and developer present. Use magnate360.com + er.amndeep@gmail.com as test recipient.

---

## PRE-FLIGHT CHECKLIST

Before starting any test:

- [ ] Logged into magnate360.com as `demo@magnate360.com` / `demo1234`
- [ ] Gmail open at `er.amndeep@gmail.com` to receive test emails
- [ ] Supabase dashboard open: https://supabase.com/dashboard/project/opbrqlmhhqvfomevvkon
- [ ] Resend dashboard open: https://resend.com/emails (check delivery logs)
- [ ] Note the time you started — use it to filter logs

**Expected from address on all emails:** `hello@magnate360.com`  
**Expected sender name:** Agent's name (Jordan Lee) or "Magnate"

---

## SYSTEM 1 — JOURNEY PIPELINE (Lifecycle Drips)

**What it does:** Automatically sends nurture emails to contacts as they progress through buyer/seller stages.  
**Runs on:** Render (cron every 2 min + daily 9 AM UTC)

### 1A — New Contact Welcome Email

**Trigger:** Enroll a contact in a journey  
**Steps:**
1. Go to Contacts → click any buyer contact (e.g. Michael Chen)
2. Look for "Journey" section or "Enroll in journey" action
3. Enroll in Buyer Journey
4. Check Supabase → `contact_journeys` table → confirm row inserted with `status: active`

**Check in email (Gmail):**
- [ ] Email arrives within 5 minutes
- [ ] From: `hello@magnate360.com`
- [ ] Subject contains "Welcome" or personalised greeting
- [ ] Contact's first name used in body
- [ ] Unsubscribe link present in footer
- [ ] Physical address in footer
- [ ] No broken images
- [ ] Mobile rendering looks correct

**Check in Supabase:**
```sql
SELECT * FROM contact_journeys WHERE contact_id = '<michael_chen_id>' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM newsletters WHERE contact_id = '<michael_chen_id>' ORDER BY sent_at DESC LIMIT 5;
```

**Pass criteria:** Email delivered, correct branding, personalisation, unsubscribe link.

---

### 1B — Neighbourhood Guide (72h delay)

**Trigger:** Journey auto-advances after welcome email  
**Steps:**
1. In Supabase, manually set `next_email_at = NOW()` on Michael Chen's journey row to simulate the 72h passing:
```sql
UPDATE contact_journeys SET next_email_at = NOW() WHERE contact_id = '<id>' AND current_phase = 'lead';
```
2. Wait up to 3 minutes for Render cron to pick it up
3. Check Gmail

**Check in email:**
- [ ] Subject mentions "neighbourhood" or area
- [ ] Content relevant to buyer (not seller language)
- [ ] Listing cards or area highlights present
- [ ] CTA button links to a showing or contact page
- [ ] Footer consistent with welcome email

---

### 1C — Seller Journey Email

**Steps:**
1. Enroll Emily Torres (seller) in Seller Journey
2. Confirm `contact_journeys` row created
3. Wait for welcome email

**Check in email:**
- [ ] Seller-appropriate language (not "find your dream home")
- [ ] Market stats or valuation content
- [ ] Realtor contact info visible

---

## SYSTEM 2 — EVENT PIPELINE (Click/Open Reactions)

**What it does:** Tracks opens, clicks, bounces via Resend webhooks and adapts next email.  
**Status:** Partially implemented — webhooks captured, auto-reply not yet live.

### 2A — Open/Click Tracking

**Steps:**
1. Open any journey email received in Gmail
2. Click a link inside it
3. Check Supabase → `newsletter_events` table:
```sql
SELECT * FROM newsletter_events ORDER BY created_at DESC LIMIT 10;
```

**Check:**
- [ ] `opened` event row appears (within 2 min)
- [ ] `clicked` event row appears with link URL recorded
- [ ] `contacts.newsletter_intelligence` JSONB updated:
```sql
SELECT newsletter_intelligence FROM contacts WHERE email = 'er.amndeep@gmail.com';
```
- [ ] `engagement_score` went up
- [ ] Click history recorded

**Pass criteria:** Events captured in DB, intelligence updated.

---

### 2B — Bounce Handling

**Steps:**
1. Send a test email to a known bad address (e.g. `bounce-test@simulator.amazonses.com` if Resend supports it — otherwise use a nonexistent domain)
2. Check Supabase → `newsletter_events` for `bounced` event
3. Check `contacts` table — contact should be flagged

**Check:**
- [ ] Bounce event recorded
- [ ] Contact not re-queued for future sends (check `contact_journeys.status`)

---

## SYSTEM 3 — EDITORIAL / CAMPAIGNS (Manual Newsletters)

**What it does:** Realtor manually creates and sends newsletters to all contacts or a segment.  
**Runs on:** Vercel (CRM)

### 3A — Send a Market Update Campaign

**Steps:**
1. Go to Newsletters → Campaigns tab
2. Click "New Campaign" or "Create Editorial"
3. Select type: **Market Update**
4. Add at least one content block (market stats, neighbourhood spotlight)
5. Set subject line A (and optionally B for A/B test)
6. Click **Send Test** — enter `er.amndeep@gmail.com`
7. Check Gmail

**Check in email:**
- [ ] From: `hello@magnate360.com`
- [ ] Subject line matches what was typed
- [ ] Blocks render correctly (no raw HTML visible)
- [ ] Stats/numbers formatted (not NaN or undefined)
- [ ] Agent name + photo (if set) in header
- [ ] Unsubscribe link works → leads to confirmation page
- [ ] Physical address in footer
- [ ] No "onboarding@resend.dev" anywhere

**Then send to full list:**
8. Click **Send to All** (or select segment)
9. Confirm send in Resend dashboard → check delivery rate

**Check in Resend dashboard:**
- [ ] Batch delivered (not just queued)
- [ ] Open rate starts populating within 1 hour
- [ ] No spam complaints

---

### 3B — A/B Subject Test

**Steps:**
1. Create a new campaign
2. Fill both Subject A and Subject B fields
3. Send to segment or full list
4. In Resend dashboard, check that ~50% of sends used each subject
5. After 24h, check `newsletters` table for open rate split:
```sql
SELECT subject, COUNT(*) as sends,
  SUM(CASE WHEN status='opened' THEN 1 ELSE 0 END) as opens
FROM newsletters
WHERE campaign_id = '<id>'
GROUP BY subject;
```

**Check:**
- [ ] Both subjects used roughly equally
- [ ] UI shows winner when one subject has >20% higher open rate
- [ ] Can manually pick winner

---

### 3C — AI-Generated Content Quality

**Steps:**
1. Create campaign → click "Generate with AI" (if available)
2. Review generated copy

**Quality checklist:**
- [ ] Tone is professional, not robotic
- [ ] No hallucinated stats (no percentages without source)
- [ ] BC/Vancouver-specific language used
- [ ] No Lorem Ipsum or placeholder text
- [ ] Call-to-action is specific (not "click here")
- [ ] Reading level appropriate for homeowners
- [ ] No spelling or grammar errors

---

## SYSTEM 4 — WORKFLOW ENGINE (Multi-Step Automated Sequences)

**What it does:** Enrolls contacts in multi-step workflows with emails + SMS + delays.

### 4A — Enroll a Contact in a Workflow

**Steps:**
1. Go to Contacts → Michael Chen
2. Find "Workflows" or "Automations" section
3. Enroll in "Buyer Nurture" workflow
4. Confirm enrollment in Supabase:
```sql
SELECT * FROM workflow_enrollments WHERE contact_id = '<id>' ORDER BY created_at DESC LIMIT 1;
```

**Check:**
- [ ] Enrollment row created
- [ ] First step scheduled (`next_step_at` set)
- [ ] No immediate email fired (first step might have a delay)

---

### 4B — Workflow Email Delivery

**Steps:**
1. Trigger first workflow step manually (set `next_step_at = NOW()` in Supabase)
2. Wait for cron to process

**Check in email:**
- [ ] Template variables substituted (not `{{contact_name}}` literally)
- [ ] From address correct
- [ ] Style consistent with campaign emails

**Known bug to watch:** Frequency cap may not apply to workflow emails (BUG-04). Verify the contact didn't already receive a journey email in the last 24h — if so and they still got the workflow email, the bug is confirmed.

---

### 4C — Variable Substitution Test

**Check these variables all resolve correctly:**
- [ ] `{{contact_name}}` → "Michael Chen"
- [ ] `{{contact_first_name}}` → "Michael"
- [ ] `{{agent_name}}` → "Jordan Lee"
- [ ] `{{listing_address}}` → actual address (if listing linked)
- [ ] No literal `{{` or `}}` visible in email

---

## SYSTEM 5 — WELCOME DRIP (New User Onboarding)

**What it does:** 7-email sequence sent to newly signed-up realtors over 12 days.  
**Note:** This is for the REALTOR (you), not for your contacts.

### 5A — Day 0 Welcome Email

**Steps:**
1. Create a new account at magnate360.com/signup
2. Use a test email (e.g. a Gmail alias)
3. Check inbox for welcome email

**Check:**
- [ ] Arrives within 10 minutes
- [ ] From: `hello@magnate360.com`
- [ ] Subject: "Welcome to Magnate — here's your first win"
- [ ] CTA button works (links to dashboard or onboarding)
- [ ] Branding consistent

---

### 5B — Day 1 (Import Contacts)

**Steps:**
1. Do NOT import any contacts on the test account
2. Wait 24h (or manually advance `welcome_drip_log.day` in DB)
3. Check for Day 1 email

**Check:**
- [ ] Subject: "Import your contacts in 60 seconds"
- [ ] CTA links to contacts import page
- [ ] Not sent if account already has contacts (skip logic working)

---

### 5C — Day 7 Trial Email

**Steps:**
1. Advance drip to day 7 in DB
2. Check for trial expiry email

**Check:**
- [ ] Subject mentions "7 days left"
- [ ] Upgrade CTA prominent
- [ ] Not sent if user already upgraded (skip logic)

---

## SYSTEM 6 — MANUAL LISTING BLAST

**What it does:** One-click email to all agent/partner contacts announcing a new listing.

### 6A — Full Blast Flow

**Steps:**
1. Go to Newsletters → Campaigns tab
2. Click "Manual Listing Blast"
3. Step 1: Select a listing (e.g. 412 W 8th Ave)
4. Step 2: Choose what to include (photos, open house, commission, floor plan)
5. Step 3: Confirm recipient count shows live number (not hardcoded "5")
6. Step 4: Review recipient list — scroll through all contacts shown
7. Click "Send to X Agents"

**Check in email (after sending):**
- [ ] From: `hello@magnate360.com` (NOT `onboarding@resend.dev`)
- [ ] Subject: `NEW LISTING: [address] — $[price]`
- [ ] Listing address correct
- [ ] Price formatted with $ and commas
- [ ] Photos included (if selected in step 2)
- [ ] Agent contact info in footer
- [ ] No broken image placeholders
- [ ] Mobile layout intact

**Check in Supabase:**
```sql
SELECT * FROM newsletters WHERE email_type = 'listing_blast' ORDER BY created_at DESC LIMIT 5;
```
- [ ] Row inserted with correct `listing_id`
- [ ] `status` = `sent`

---

### 6B — Recipient Count Accuracy

**Steps:**
1. In Supabase, count agent/partner contacts with email:
```sql
SELECT COUNT(*) FROM contacts 
WHERE realtor_id = '190bd6c1-f9dd-4be6-816e-74944c400e74'
AND type IN ('agent', 'partner') 
AND email IS NOT NULL;
```
2. Compare to number shown in Step 3 of the wizard

**Check:**
- [ ] UI count matches DB count exactly

---

## CROSS-SYSTEM AUDIT CHECKS

### C1 — From Address Consistency

Send one email from each system and verify from address:

| System | Expected From | Actual From | Pass/Fail |
|--------|--------------|-------------|-----------|
| 1 Journey | hello@magnate360.com | | |
| 2 Event | hello@magnate360.com | | |
| 3 Editorial | hello@magnate360.com | | |
| 4 Workflow | hello@magnate360.com | | |
| 5 Drip | hello@magnate360.com | | |
| 6 Blast | hello@magnate360.com | | |

---

### C2 — Unsubscribe Flow

**Steps:**
1. Click unsubscribe in any received email
2. Confirm landing page loads (not 404)
3. Click confirm unsubscribe
4. Check Supabase:
```sql
SELECT newsletter_unsubscribed, casl_consent_given FROM contacts WHERE email = 'er.amndeep@gmail.com';
```
5. Try to trigger another email send to same contact
6. Confirm email NOT sent

**Check:**
- [ ] Unsubscribe page loads cleanly
- [ ] Confirmation message shown
- [ ] DB flag set correctly
- [ ] Future sends skipped (CASL gate working)

---

### C3 — CASL Consent Gate

**Steps:**
1. In Supabase, set `casl_consent_given = false` on a contact
2. Try to send any email to that contact
3. Confirm email NOT sent and no error thrown to user

```sql
UPDATE contacts SET casl_consent_given = false WHERE email = 'test@example.com';
```

---

### C4 — Duplicate Send Prevention

**Steps:**
1. Note the last email sent to a contact (check `newsletters` table)
2. Manually trigger the same journey step again
3. Confirm it does NOT send a second email within 24h

**Check:**
- [ ] `checkSendGovernor()` blocked the send
- [ ] Log entry shows "frequency cap hit" (check Render logs)

---

### C5 — Email Quality Rubric

For every email received, score on these dimensions:

| Dimension | Score 1-5 | Notes |
|-----------|-----------|-------|
| Subject line clarity | | Does it tell you what's inside? |
| Personalisation | | Is the name/property used? |
| Relevance | | Is it appropriate for this contact's stage? |
| Tone | | Professional + warm? Not robotic? |
| Visual design | | Clean layout, consistent branding? |
| CTA clarity | | One clear action, button visible? |
| Mobile rendering | | No overflow, readable fonts? |
| Footer compliance | | Unsubscribe + address present? |

**Minimum passing score:** 4/5 on all dimensions to ship to live contacts.

---

### C6 — Content Freshness Check

**Steps:**
1. Receive a "Market Update" email
2. Check all stats and numbers mentioned

**Check:**
- [ ] No dates from prior year (2025 or earlier)
- [ ] Prices in CAD, not USD
- [ ] Area references match BC/Vancouver market
- [ ] No test/placeholder content ("Lorem ipsum", "test contact", "YOUR NAME HERE")

---

## RESEND DASHBOARD AUDIT

Log into Resend at https://resend.com and check:

### Delivery Health
- [ ] Delivery rate > 95%
- [ ] Bounce rate < 2%
- [ ] Spam complaint rate < 0.1%
- [ ] No domain authentication warnings (SPF, DKIM, DMARC)

### Domain Authentication
- [ ] `magnate360.com` shows "Verified" in Resend domains
- [ ] DKIM record active
- [ ] No "deliverability issues" banner

### Recent Sends
- [ ] All sends show `hello@magnate360.com` as sender (not `onboarding@resend.dev`)
- [ ] No sends to suppressed/bounced addresses
- [ ] Webhook events populating (opens, clicks visible)

---

## KNOWN ISSUES TO WATCH FOR

| Issue | What to look for | Workaround |
|-------|-----------------|------------|
| BUG-04: Workflow frequency cap broken | Contact gets 2+ emails in 24h from workflow | Enroll only in journeys until fixed |
| System 5 duplicates System 1 | New contact gets 2 welcome emails | Check `newsletters` table for duplicates |
| Production Supabase different from dev | Data visible locally not visible on magnate360.com | Always check `opbrqlmhhqvfomevvkon` project |
| Deployment quota | Deploy fails with "100/day" error | Wait 24h for quota reset, env vars take effect on next deploy |
| Editorial personalization cap | Only 50 contacts get AI-personalised blocks | Remaining contacts get base template (still correct) |

---

## SIGN-OFF CRITERIA

The email system is production-ready when all of the following pass:

- [ ] All 6 systems sent at least one email successfully
- [ ] All emails sent from `hello@magnate360.com`
- [ ] All emails have unsubscribe links
- [ ] All emails have physical address in footer
- [ ] No template variables visible as `{{literal}}` in any email
- [ ] Unsubscribe flow works end-to-end
- [ ] CASL gate blocks send to opted-out contacts
- [ ] Quality score ≥ 4/5 on all dimensions for AI-generated content
- [ ] Resend delivery rate > 95%
- [ ] No `onboarding@resend.dev` in any email header
