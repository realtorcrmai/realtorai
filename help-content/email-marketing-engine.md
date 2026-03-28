---
title: "Email Marketing Engine"
slug: "email-marketing-engine"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: ["/newsletters"]
changelog: []
---

# Email Marketing Engine

## Problem Statement

BC realtors know they should stay in touch with past clients, nurture warm leads, and keep their brand visible — but writing personalized emails for dozens of contacts at different lifecycle stages is a full-time job on its own. Generic mass emails get ignored, manual follow-ups are inconsistent, and there is no way to know which contacts are actually engaged versus tuning out. RealtorAI's AI-powered email marketing engine writes personalized emails automatically, queues them for your approval, sends them through a validated pipeline, and tracks every open, click, and bounce so you can focus on the contacts who are ready to act.

## Business Value

Consistent, personalized communication is the single biggest driver of repeat and referral business. The email marketing engine removes the writing burden entirely — AI generates drafts tailored to each contact's interests, engagement history, and lifecycle stage. Quality scoring ensures every email meets professional standards before it reaches your approval queue. Engagement tracking surfaces your hottest leads automatically, so you call the right person at the right time instead of guessing. Frequency caps and quiet hours protect your brand reputation by preventing over-sending.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Reviews and approves AI drafts, launches listing blasts, monitors engagement |
| **Transaction Coordinator** | View + approve | Reviews drafts, checks compliance settings |
| **Admin** | Full access + settings | Configures frequency caps, quiet hours, brand voice, master email switch |

## Where to Find It

- Click **Newsletters** in the top navigation bar to open the email marketing dashboard at /newsletters
- The page has 6 tabs across the top: Overview, AI Agent, Campaigns, Workflows, Automation, and Settings
- The Overview tab is the default landing view with stat pills and pipeline summary
- Click AI Agent tab to access the approval queue

## Preconditions

- You must be logged in
- Resend must be configured (RESEND_API_KEY, RESEND_FROM_EMAIL)
- Contacts must have email addresses on file
- For AI-generated content, the Anthropic API key must be configured
- Contact must have CASL consent to receive marketing emails

## Key Concepts

| Term | Definition |
|------|-----------|
| AI Draft | An email written by Claude AI based on the contact's profile, engagement history, and journey stage |
| Approval Queue | The list of AI-generated email drafts waiting for your review before sending |
| Quality Score | A 7-dimension score (1-10) assigned by AI to each draft, measuring personalization, relevance, tone, compliance, and more |
| Engagement Score | A per-contact score (0-100) based on email opens, clicks, and interaction frequency |
| Contact Journey | The lifecycle stage of a contact (Lead, Active, Under Contract, Past Client, Dormant) that determines which emails they receive |
| Frequency Cap | Maximum number of emails a contact can receive in a given time period, preventing over-sending |
| Quiet Hours | Time windows during which no emails are sent (e.g., evenings, weekends) |
| Listing Blast | A bulk email sent to multiple buyer agents or contacts about a specific listing |
| Hot Buyer/Seller | A contact whose engagement score or recent activity indicates high readiness to transact |
| Newsletter Intelligence | Per-contact data tracking click history, inferred interests, preferred property types, and price range |

## Core Workflow

1. A contact event triggers email generation (new listing matches preferences, journey phase advances, monthly schedule fires)
2. Claude AI writes a personalized draft using the contact's profile, engagement history, and inferred interests
3. The draft passes through the text pipeline (personalization, voice rules, compliance check)
4. HTML is assembled from modular email blocks (hero image, property details, agent card, CTA)
5. Quality scoring evaluates the draft across 7 dimensions — drafts scoring below 6 are regenerated
6. The approved-quality draft appears in your AI Agent approval queue
7. You review the draft and click Approve, Skip, or Bulk Approve
8. Approved emails are sent via Resend with full validation
9. Resend webhooks track opens, clicks, and bounces, updating the contact's engagement score
10. High-intent clicks (e.g., "Book a Showing") trigger an immediate alert to you

## End-to-End Scenarios

### Scenario: Review and approve AI-generated email drafts

- **Role:** Listing Agent
- **Goal:** Review the morning batch of AI drafts and approve the ones ready to send
- **Navigation:** Click Newsletters > AI Agent tab
- **Steps:**
  1. Open the AI Agent tab to see the approval queue
  2. Review each draft: subject line, body content, recipient, and quality score
  3. Click into a draft to see the full email preview
  4. If the content looks good, click Approve
  5. If it needs changes, edit the content inline before approving
  6. If a draft is not relevant, click Skip to remove it from the queue
  7. For batches where all drafts look good, use Bulk Approve to send them all at once
- **Expected outcome:** Approved emails are queued for immediate sending via Resend
- **Edge cases:** A draft has a low quality score and poor personalization; a contact has unsubscribed since the draft was generated
- **Common mistakes:** Approving without reading the full content, leading to irrelevant emails being sent
- **Recovery:** If an email was sent in error, note it for future AI tuning; you cannot recall a sent email

### Scenario: Launch a listing blast to buyer agents

- **Role:** Listing Agent
- **Goal:** Notify all buyer agents in your network about a new listing
- **Navigation:** Click Newsletters > Campaigns tab
- **Steps:**
  1. Click the Campaigns tab
  2. Select Listing Blast
  3. Choose the listing from the dropdown
  4. Select the target audience (all buyer agents, or a filtered segment)
  5. Review the auto-generated email with listing photos, price, and property details
  6. Click Send to distribute the blast
  7. Monitor delivery and engagement on the Analytics section
- **Expected outcome:** All selected buyer agents receive the listing alert email
- **Edge cases:** Some contacts do not have email addresses; the listing has no photos uploaded yet
- **Common mistakes:** Sending a blast for a listing that has not been approved for marketing yet
- **Recovery:** Cannot recall sent emails; update the listing details and send a follow-up correction if needed

### Scenario: Configure frequency caps and quiet hours

- **Role:** Admin
- **Goal:** Prevent over-sending and ensure emails only go out during business hours
- **Navigation:** Click Newsletters > Settings tab
- **Steps:**
  1. Open the Settings tab
  2. Set the frequency cap (e.g., maximum 2 emails per contact per week)
  3. Enable quiet hours and set the window (e.g., no sends between 8 PM and 8 AM)
  4. Toggle Skip Weekends on if you do not want emails sent on Saturday or Sunday
  5. Configure brand settings (sender name, reply-to address)
  6. Save the settings
- **Expected outcome:** The send governor enforces caps and quiet hours on all future email sends
- **Edge cases:** A time-sensitive listing blast needs to go out during quiet hours
- **Common mistakes:** Setting frequency caps too low, which delays important emails
- **Recovery:** Temporarily adjust the cap for urgent sends, then revert to normal

### Scenario: Monitor engagement and identify hot leads

- **Role:** Listing Agent
- **Goal:** Find the contacts most likely to transact based on email engagement
- **Navigation:** Click Newsletters > Overview tab
- **Steps:**
  1. Open the Overview tab
  2. Review the Hot Buyers and Hot Sellers sections
  3. Note contacts with high engagement scores and recent click activity
  4. Click through to a contact's profile to see their full newsletter intelligence
  5. Call or message the hottest leads immediately
- **Expected outcome:** You identify 3-5 contacts who are actively engaging and ready for personal outreach
- **Edge cases:** A contact has a high score but has not opened an email in weeks (score decay has not caught up)
- **Common mistakes:** Ignoring the hot leads section and treating all contacts equally
- **Recovery:** Set a daily reminder to check the Overview tab each morning

### Scenario: Track email performance and adjust strategy

- **Role:** Listing Agent
- **Goal:** Understand which email types perform best and refine the approach
- **Navigation:** Click Newsletters > Overview tab (stats) or check sent emails in AI Agent tab
- **Steps:**
  1. Review open rates and click rates across email types
  2. Compare performance of new listing alerts vs market updates vs neighbourhood guides
  3. Identify emails with low engagement
  4. Review the subject lines and content of low performers
  5. Adjust AI context or brand voice settings to improve future drafts
- **Expected outcome:** Clear understanding of what content resonates, with actionable changes to improve future emails
- **Edge cases:** Sample size is too small to draw conclusions; seasonal factors affect engagement
- **Common mistakes:** Making drastic changes based on a single low-performing email
- **Recovery:** Wait for at least 10-20 emails of each type before adjusting strategy

## Step-by-Step Procedures

### Procedure: Approve a single AI draft

- **When to use:** You have AI-generated drafts waiting in the approval queue
- **Starting point:** /newsletters > AI Agent tab
- **Steps:**
  1. Click the AI Agent tab
  2. Find the draft in the approval queue
  3. Click the draft to expand and preview the full email
  4. Review the subject line, body content, and recipient
  5. Check the quality score (should be 6 or above)
  6. If satisfied, click Approve
  7. The email is sent immediately via Resend
- **Validations:** Quality score must be 6+; recipient must have a valid email; recipient must have CASL consent
- **What happens next:** The email is delivered, and engagement tracking begins. Opens and clicks update the contact's engagement score.
- **Common mistakes:** Approving a draft intended for a contact who recently unsubscribed
- **Recovery:** Check the contact's consent status before approving; the system should flag unsubscribed contacts

### Procedure: Create and send a custom campaign

- **When to use:** You want to send a targeted email to a specific group that is not covered by automated journeys
- **Starting point:** /newsletters > Campaigns tab
- **Steps:**
  1. Click the Campaigns tab
  2. Select the campaign type or choose a template
  3. Define the audience (all contacts, a segment, or manual selection)
  4. Customize the email content if needed
  5. Preview the email
  6. Click Send to distribute
  7. Monitor delivery status and engagement
- **Validations:** At least one recipient must be selected; email content must not be empty; recipients must have CASL consent
- **What happens next:** Emails are sent in batches via Resend. Engagement data flows back through webhooks.
- **Common mistakes:** Sending to a segment that includes unsubscribed contacts
- **Recovery:** The system filters out unsubscribed contacts automatically; if an error occurs, check the segment definition

### Procedure: Adjust brand voice and AI settings

- **When to use:** The AI-generated content does not match your personal communication style
- **Starting point:** /newsletters > Settings tab
- **Steps:**
  1. Open the Settings tab
  2. Find the Brand Configuration section
  3. Update your preferred tone (professional, friendly, conversational)
  4. Add any specific phrases or words the AI should use or avoid
  5. Set your preferred sign-off style
  6. Save the settings
  7. New AI drafts will reflect the updated voice settings
- **Validations:** Settings must be saved before they take effect on new drafts
- **What happens next:** The next batch of AI-generated drafts uses the updated voice rules. Existing drafts in the queue are not affected.
- **Common mistakes:** Expecting voice changes to retroactively update drafts already in the queue
- **Recovery:** Skip existing drafts that do not match the new voice and let the AI regenerate fresh ones

## Validations and Rules

- Every email passes through a 7-dimension quality scoring pipeline before reaching the approval queue
- Drafts scoring below 4 are blocked entirely; drafts scoring between 4 and 6 are regenerated with adjusted parameters
- Recipients must have CASL consent on file to receive marketing emails
- Frequency caps are enforced per contact — the system will not send more emails than the configured maximum per time period
- Quiet hours prevent any email sends during the configured window
- Skip Weekends prevents Saturday and Sunday sends when enabled
- Every email includes a CASL-compliant unsubscribe link and physical address in the footer
- Engagement tracking (opens, clicks, bounces) updates the contact's newsletter intelligence automatically
- High-intent clicks (book showing, request CMA) trigger immediate realtor alerts
- The master email switch in Settings can disable all automated email sends instantly

## Role Differences

| Role | Can View | Can Edit | Special Notes |
|------|----------|----------|---------------|
| **Listing Agent** | All tabs, all drafts, all analytics | Approve/skip drafts, send campaigns, edit content | Primary user of the approval queue |
| **Transaction Coordinator** | All tabs, all drafts | Approve/skip drafts | Typically handles review during agent absences |
| **Admin** | All tabs, all drafts, settings | Full access including settings, frequency caps, master switch | Can enable/disable the entire email engine |

## Edge Cases

1. **Contact unsubscribes between draft generation and approval:** The system should flag the contact as unsubscribed. If you approve the draft, the send governor blocks delivery to unsubscribed contacts.
2. **AI generates a draft with inaccurate property details:** This can happen if listing data changed after the draft was created. Always review property details in the draft against the current listing before approving.
3. **Resend API is down or rate-limited:** Emails queue locally and retry with exponential backoff. Check the sent/pending status in the AI Agent tab. If the outage persists, emails will be held until service is restored.
4. **Contact has no engagement history (brand new):** The AI generates content based on the contact's type and basic profile. After the first few emails, engagement data builds and personalization improves.
5. **Two automated emails trigger for the same contact at the same time:** The frequency cap prevents double-sending. The system sends the higher-priority email and defers or suppresses the other.
6. **Email bounces due to invalid address:** The bounce is recorded via Resend webhook. The contact's email is flagged, and future sends to that address are suppressed until the email is updated.
7. **Listing blast sent to 500+ contacts:** Sends are batched to stay within Resend rate limits. Delivery may take several minutes for large blasts. Monitor progress in the Campaigns tab.

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|------------|-----------------|
| No drafts appearing in the approval queue | Cron job has not run, or no contacts are enrolled in journeys | Check if contacts have active journeys; verify the cron job is running | Enroll contacts in journeys; ensure the cron schedule is active | If cron jobs are configured correctly but drafts still do not generate |
| Email sent but contact says they did not receive it | Email went to spam, or the address is incorrect | Check the sent status in the AI Agent tab; check the contact's email address | Ask the contact to check spam/junk; verify the email address | If delivery failures are widespread (Resend service issue) |
| Open/click tracking not updating | Resend webhook is not configured or is failing | Check the webhook endpoint status in Resend dashboard | Reconfigure the webhook URL in Resend settings | If the webhook is configured correctly but events are not being received |
| Quality scores are consistently low | AI context is insufficient or brand voice settings are too restrictive | Review recent drafts and their quality dimension scores | Update brand voice settings; ensure contact profiles have sufficient data | If quality scores remain low after adjusting settings |
| Emails sending outside quiet hours | Quiet hours are not configured or the timezone is wrong | Check Settings tab for quiet hours configuration | Set correct quiet hours and verify the timezone | If quiet hours are set correctly but emails still send during restricted times |

## FAQ

### How does the AI decide what to write for each contact?

The AI reads the contact's full profile, including their type (buyer, seller, lead), lifecycle stage, engagement score, click history, inferred interests (areas, property types, price range), and any recent activity. It then selects the most appropriate email type (new listing, market update, neighbourhood guide, etc.) and writes personalized content. The more interaction data available, the more tailored the emails become.

### Can I edit an AI draft before approving it?

Yes. When you open a draft in the approval queue, you can edit the subject line and body content directly before clicking Approve. The email sends with your edits. The AI also learns from patterns in your edits over time to improve future drafts.

### What are the 6 email types?

The engine generates six types: New Listing Alert (property matches buyer preferences), Market Update (monthly area stats and trends), Just Sold (celebrating a completed sale), Open House Invite (showing event details), Neighbourhood Guide (local lifestyle content for new leads), and Home Anniversary (annual milestone for past buyers with current home value estimates).

### What happens when I click Skip on a draft?

Skipping removes the draft from your approval queue without sending it. The contact may receive a different email in the next generation cycle. Skip is useful for drafts that are not relevant or poorly timed.

### How do frequency caps work?

You set a maximum number of emails per contact per time period (e.g., 2 per week). The system tracks sends per contact and automatically defers any email that would exceed the cap. Deferred emails are sent in the next available window. This prevents contact fatigue and unsubscribes.

### Is the master email switch reversible?

Yes. The master switch in the Settings tab toggles all automated email sends on or off. When you turn it off, all pending and scheduled emails are paused. When you turn it back on, the system resumes from where it left off. No emails are lost.

### How do I know if a contact has unsubscribed?

Unsubscribe events are tracked via Resend webhooks. The contact's profile is updated to reflect their opt-out status, and they are automatically excluded from all future email sends. You can see their consent status on their contact profile page.

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| **Contact Management** | Contacts are the recipients; engagement scores and newsletter intelligence live on the contact profile | Contacts must have email addresses and CASL consent |
| **Listing Workflow** | New listings trigger listing alert emails; listing data populates email content | Listing details must be complete for accurate email content |
| **Deal Pipeline** | Deal stage changes can trigger lifecycle emails (congratulations, next steps) | Journey phase advancement tied to deal progression |
| **Showing Management** | Open house showings trigger Open House Invite emails | Showing must be created with a date and listing linked |
| **Workflow Automations** | Workflows define the sequences and triggers for automated emails | Workflow steps include email sends with templates and delays |

## Escalation Guidance

**Fix yourself:**
- Draft content is not quite right — edit it inline before approving
- Wrong frequency cap — adjust in Settings tab
- Contact missing from a campaign — check their email address and CASL consent
- Low quality scores — update brand voice settings and contact profiles

**Needs admin:**
- Resend API key is invalid or expired — requires environment variable update
- Webhook endpoint is not receiving events — requires server-side configuration
- Master email switch is off and you cannot re-enable it — requires admin access
- Cron jobs are not running — requires server or deployment platform investigation

**Information to gather before escalating:**
- The email or draft in question (subject line, recipient, date)
- The tab you were on when the issue occurred
- Any error messages displayed
- The contact's email address and consent status
- Screenshots of the Settings tab configuration
