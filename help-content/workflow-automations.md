---
title: "Workflow Automations"
slug: "workflow-automations"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: ["/automations"]
changelog: []
---

# Workflow Automations

## Problem Statement

Real estate follow-up is repetitive but critical — every new lead needs a welcome message, every showing needs a follow-up, every new listing needs a speed-to-contact sequence. When these tasks depend on a realtor remembering to send the right message at the right time, leads go cold, sellers feel neglected, and deals stall. The gap between knowing you should follow up and actually doing it consistently across 20+ active contacts is where business is lost. RealtorAI's workflow automations handle the repetitive sequences automatically — enrolling contacts, sending timed SMS and email messages, updating fields, and notifying you when human attention is needed.

## Business Value

Studies show that contacting a lead within 5 minutes increases conversion by 400%. But no human can maintain that speed across every lead, every day. Workflow automations guarantee consistent, timely follow-up for every contact at every stage. Pre-built workflows for buyer nurture, seller nurture, speed-to-contact, and greeting sequences mean you do not have to design communication plans from scratch. Pausing, resuming, and monitoring enrollments gives you full control without the manual effort.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Enables workflows, monitors enrollments, reviews notifications |
| **Transaction Coordinator** | Full access | Manages templates, reviews step completion, handles exceptions |
| **Admin** | Full access | Creates/edits workflows, manages notification rules, system configuration |

## Where to Find It

- Click **Automations** in the top navigation bar to open /automations
- The page has three tabs: **Workflows**, **Templates**, and **Notifications**
- The Workflows tab shows all available workflow cards with their status and enrollment counts
- Click a workflow card to open its detail view with steps and enrollments

## Preconditions

- You must be logged in
- For SMS steps: Twilio must be configured
- For email steps: Resend must be configured
- Contacts must be enrolled in a workflow for it to execute (manually or via triggers)
- Message templates must exist before they can be used in workflow steps

## Key Concepts

| Term | Definition |
|------|-----------|
| Workflow | A named sequence of automated steps (send SMS, send email, delay, update field) that executes when a contact is enrolled |
| Step | A single action within a workflow: send an SMS, send an email, wait for a delay period, or update a contact field |
| Enrollment | The act of placing a contact into a workflow, which starts executing the step sequence |
| Active Enrollments | The count of contacts currently progressing through a workflow |
| Workflow Status | Whether a workflow is enabled (actively processing) or paused (no new steps execute) |
| Message Template | A reusable message format with variable placeholders (e.g., {{first_name}}, {{listing_address}}) that can be used in workflow steps |
| Delay Step | A timed pause between workflow actions (e.g., wait 2 days before sending the next message) |
| Pre-built Workflow | A ready-to-use workflow provided by RealtorAI: buyer nurture, seller nurture, speed-to-contact, follow-up, greeting |
| Notification | An AI agent alert about workflow events that require your attention |

## Core Workflow

1. Navigate to /automations and click the Workflows tab
2. Review the available workflow cards — each shows name, description, step count, active enrollments, and status
3. Enable a workflow by toggling its status to active
4. Contacts are enrolled in the workflow (manually or via automated triggers)
5. The workflow executes its steps in sequence: send SMS, wait, send email, update field, etc.
6. Monitor active enrollments to see how many contacts are in each workflow
7. Check the Notifications tab for AI agent alerts about exceptions or completed sequences
8. Pause a workflow to stop new step executions while preserving enrollment positions

## End-to-End Scenarios

### Scenario: Enable the speed-to-contact workflow for new leads

- **Role:** Listing Agent
- **Goal:** Ensure every new lead receives an immediate welcome message within minutes
- **Navigation:** Click Automations > Workflows tab
- **Steps:**
  1. Find the Speed-to-Contact workflow card
  2. Review the steps: immediate SMS greeting, 5-minute delay, follow-up email with your intro
  3. Toggle the workflow status to Enabled
  4. When a new lead enters the system, they are enrolled automatically
  5. The workflow sends the first SMS immediately
  6. After the delay, the follow-up email is sent
  7. Monitor the active enrollments count to see leads progressing through the sequence
- **Expected outcome:** Every new lead receives a timely welcome message and follow-up without manual intervention
- **Edge cases:** Lead enters the system outside business hours; lead has no phone number (SMS step fails)
- **Common mistakes:** Enabling the workflow without reviewing the message templates first
- **Recovery:** Pause the workflow, update the templates, then re-enable

### Scenario: Set up a buyer nurture sequence

- **Role:** Listing Agent
- **Goal:** Keep warm buyer leads engaged with a multi-touch nurture campaign
- **Navigation:** Click Automations > Workflows tab
- **Steps:**
  1. Find the Buyer Nurture workflow card
  2. Click to open the detail view
  3. Review the step sequence: Day 1 welcome email, Day 3 SMS check-in, Day 7 neighbourhood guide, Day 14 market update, Day 30 re-engagement
  4. Ensure the message templates for each step are appropriate
  5. Enable the workflow
  6. Enroll specific buyer contacts or configure automatic enrollment for new buyer leads
  7. Monitor progress in the enrollments section
- **Expected outcome:** Buyer leads receive a timed series of personalized touchpoints over 30 days
- **Edge cases:** Buyer converts to a showing before the sequence completes; buyer unsubscribes mid-sequence
- **Common mistakes:** Enrolling contacts who are already under contract (they do not need nurture messages)
- **Recovery:** Remove the contact from the workflow enrollment manually

### Scenario: Create and use a message template

- **Role:** Transaction Coordinator
- **Goal:** Build a reusable message template with personalization variables
- **Navigation:** Click Automations > Templates tab
- **Steps:**
  1. Click the Templates tab
  2. Click Create Template
  3. Enter a template name (e.g., "Showing Follow-Up SMS")
  4. Write the message body with variables: "Hi {{first_name}}, thanks for visiting {{listing_address}} yesterday. What did you think? — {{agent_name}}"
  5. Save the template
  6. The template is now available to use in any workflow step
- **Expected outcome:** A reusable template that personalizes with contact and listing data at send time
- **Edge cases:** Variable name is misspelled in the template; referenced data is missing on the contact
- **Common mistakes:** Using variables that do not exist in the system (e.g., {{occupation}})
- **Recovery:** Edit the template to use only supported variables: {{first_name}}, {{last_name}}, {{listing_address}}, {{agent_name}}, etc.

### Scenario: Pause a workflow during a holiday period

- **Role:** Listing Agent
- **Goal:** Stop all automated messages from sending during the Christmas holiday week
- **Navigation:** Click Automations > Workflows tab
- **Steps:**
  1. Open the Workflows tab
  2. For each active workflow, toggle the status to Paused
  3. All step executions stop immediately — no new messages are sent
  4. Contacts remain enrolled at their current position in the sequence
  5. After the holiday, toggle each workflow back to Enabled
  6. Step execution resumes from where each contact left off
- **Expected outcome:** No automated messages during the pause period; normal execution resumes after
- **Edge cases:** A time-sensitive workflow (speed-to-contact) is paused, causing delayed lead response
- **Common mistakes:** Forgetting to re-enable workflows after the pause period ends
- **Recovery:** Set a calendar reminder to re-enable workflows on the return date

### Scenario: Review AI agent notifications for workflow exceptions

- **Role:** Listing Agent
- **Goal:** Handle contacts whose workflow steps failed or need human attention
- **Navigation:** Click Automations > Notifications tab
- **Steps:**
  1. Click the Notifications tab
  2. Review the list of AI agent notifications
  3. Check for delivery failures (SMS bounced, email invalid)
  4. Check for contacts who completed the entire sequence without responding
  5. For failed deliveries: verify the contact's phone/email and re-enroll or contact manually
  6. For completed non-responders: decide whether to enroll in a re-engagement workflow or reach out personally
- **Expected outcome:** All exceptions are identified and addressed, no contacts left in limbo
- **Edge cases:** High volume of notifications makes it hard to prioritize
- **Common mistakes:** Ignoring notifications, which lets failed contacts accumulate
- **Recovery:** Process notifications daily; prioritize delivery failures over completion notices

## Step-by-Step Procedures

### Procedure: Enable a pre-built workflow

- **When to use:** You want to activate one of the ready-made workflows (buyer nurture, seller nurture, speed-to-contact, follow-up, greeting)
- **Starting point:** /automations > Workflows tab
- **Steps:**
  1. Browse the workflow cards to find the one you want to enable
  2. Review the card: name, description, number of steps, current active enrollments
  3. Click the workflow card to see the step details
  4. Review each step: type (SMS, email, delay, update field), content/template, and timing
  5. Verify the message templates are appropriate for your brand and voice
  6. Return to the card view
  7. Toggle the workflow status to Enabled
- **Validations:** Twilio must be configured for SMS steps; Resend must be configured for email steps; templates must exist for template-based steps
- **What happens next:** The workflow begins processing enrollments. Newly enrolled contacts start at step 1 and progress through the sequence based on the defined delays and triggers.
- **Common mistakes:** Enabling a workflow without reviewing the message content, which may not match your brand voice
- **Recovery:** Pause the workflow immediately, update the templates, then re-enable

### Procedure: Monitor workflow enrollments

- **When to use:** You want to check how contacts are progressing through a workflow
- **Starting point:** /automations > Workflows tab, click a workflow card
- **Steps:**
  1. Click the workflow card to open the detail view
  2. Review the Enrollments section
  3. See which contacts are enrolled and their current step
  4. Identify contacts who are stuck or have completed the sequence
  5. For stuck contacts: check if a step failed (notification should exist)
  6. For completed contacts: decide on next action (enroll in another workflow, manual outreach)
- **Validations:** Enrollments are only visible for enabled workflows
- **What happens next:** You have full visibility into each contact's position within the workflow and can take action on exceptions.
- **Common mistakes:** Not checking enrollments regularly, leading to stale contacts in paused or failed states
- **Recovery:** Review enrollments weekly; set up a recurring reminder

### Procedure: Edit a message template

- **When to use:** You need to update the content of a message used in workflow steps
- **Starting point:** /automations > Templates tab
- **Steps:**
  1. Click the Templates tab
  2. Find the template you want to edit
  3. Click to open the template editor
  4. Modify the message body, adjusting tone, content, or variables
  5. Preview the template with sample data to verify personalization
  6. Save the changes
- **Validations:** Variable syntax must be correct (double curly braces: {{variable_name}}); template must have a name
- **What happens next:** All workflow steps using this template will use the updated content for future sends. Messages already sent are not affected.
- **Common mistakes:** Accidentally removing a variable that is needed for personalization
- **Recovery:** Check the template for correct variable names; test by previewing with sample data

## Validations and Rules

- Workflows must be enabled to process new step executions
- Pausing a workflow stops all new step executions but preserves enrollment positions
- Contacts can be enrolled in multiple workflows simultaneously
- Each workflow step executes in sequence — a step does not run until the previous step (including delays) completes
- SMS steps require the contact to have a valid phone number
- Email steps require the contact to have a valid email address and CASL consent
- Delay steps pause execution for the specified duration (minutes, hours, or days)
- Update field steps modify a contact's record automatically (e.g., change lead status)
- Message templates support variable substitution at send time: {{first_name}}, {{last_name}}, {{listing_address}}, {{agent_name}}
- Every SMS includes a TCPA-compliant opt-out footer
- Every email includes a CASL-compliant unsubscribe link

## Role Differences

| Role | Can View | Can Edit | Special Notes |
|------|----------|----------|---------------|
| **Listing Agent** | All workflows, templates, notifications | Enable/pause workflows, manage enrollments | Day-to-day workflow operator |
| **Transaction Coordinator** | All workflows, templates, notifications | Edit templates, manage enrollments, handle exceptions | Ensures templates are accurate and professional |
| **Admin** | All workflows, templates, notifications, system config | Full access including workflow creation and step editing | Creates new workflows and configures system-level automation rules |

## Edge Cases

1. **Contact has no phone number and the first step is SMS:** The SMS step fails and a notification is generated. The workflow may stall at that step. Verify the contact has a phone number or adjust the workflow to start with email.
2. **Contact is enrolled in two workflows that send messages on the same day:** Both messages will be sent, which could overwhelm the contact. Use frequency caps in the email marketing settings to throttle sends.
3. **Workflow is paused while contacts are mid-sequence:** Enrolled contacts freeze at their current step. When the workflow is re-enabled, execution resumes from the paused position — it does not restart from the beginning.
4. **A delay step spans a holiday or weekend:** The delay counts calendar time, not business days. A 3-day delay starting Friday will complete on Monday. Consider this when designing delay durations.
5. **Contact unsubscribes while enrolled in a workflow:** The system should suppress future sends to that contact. The enrollment may remain but message steps will be skipped.
6. **Template is deleted while a workflow references it:** Steps using the deleted template will fail. A notification is generated. Assign a replacement template to the affected workflow steps.
7. **Multiple contacts enrolled at the same time hit a delay step together:** All contacts in the delay are processed when the delay expires. Large batches may cause a brief spike in outbound messages.

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|------------|-----------------|
| Workflow is enabled but no messages are sending | No contacts are enrolled, or all enrolled contacts are past the final step | Check the enrollment count on the workflow card; open detail to see active enrollments | Enroll contacts manually or verify the enrollment trigger is active | If contacts are enrolled but steps are not executing |
| SMS step fails for a specific contact | Contact's phone number is missing or invalid | Open the contact profile and check the phone field | Add or correct the phone number; the workflow may need the contact re-enrolled | If phone numbers are correct but SMS still fails (Twilio issue) |
| Email step sends but contact does not receive | Email went to spam or the email address is incorrect | Check the sent status in the workflow detail; verify the contact's email | Ask the contact to check spam; correct the email address if wrong | If emails are consistently undelivered (Resend deliverability issue) |
| Workflow shows as Enabled but status toggle does not respond | Browser state is stale or there was a network error | Refresh the page and check the workflow status | Refresh and toggle again; clear browser cache if needed | If the toggle consistently fails to persist the state change |
| Notifications tab shows many delivery failures | Bulk enrollment of contacts with missing data | Review the failed contacts — check for missing phone/email | Clean up contact data before enrolling in workflows; use segments to filter contacts with valid data | If failures are not related to missing contact data |

## FAQ

### What are the pre-built workflows available?

RealtorAI includes five pre-built workflows: Buyer Nurture (multi-week engagement sequence for buyer leads), Seller Nurture (touchpoint sequence for seller leads), Speed-to-Contact (immediate response for new leads within minutes), Follow-Up (post-showing or post-meeting check-in sequence), and Greeting (welcome sequence for newly added contacts). Each can be enabled as-is or customized through the template system.

### Can I create my own custom workflows?

Custom workflow creation is available to admin users. You can define the step sequence (SMS, email, delay, update field), assign templates, and set timing. The workflow detail page allows adding, removing, and reordering steps.

### What happens if I disable a workflow that has active enrollments?

Pausing (disabling) a workflow stops all new step executions immediately. Contacts remain enrolled at their current position. When you re-enable the workflow, execution resumes from where each contact was paused — nothing is lost or restarted.

### Can a contact be in multiple workflows at the same time?

Yes. A contact can be enrolled in several workflows simultaneously (e.g., buyer nurture and a greeting sequence). Be mindful of message frequency — multiple workflows sending to the same contact can lead to over-communication. Use the frequency caps in email marketing settings to prevent this.

### How do delay steps work?

A delay step pauses the workflow for the specified duration before executing the next step. Delays are measured in calendar time (minutes, hours, or days), not business days. A 2-day delay means exactly 48 hours from the previous step's execution, regardless of weekends or holidays.

### Can I remove a contact from a workflow?

Yes. Open the workflow detail page, find the contact in the enrollments section, and remove them. The contact will not receive any further messages from that workflow. This does not affect their enrollment in other workflows.

### Are workflow messages tracked for engagement?

Email messages sent through workflows are tracked for opens, clicks, and bounces via Resend webhooks, just like all other emails in the system. SMS delivery is tracked via Twilio. Engagement data updates the contact's engagement score and newsletter intelligence.

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| **Contact Management** | Contacts are enrolled in workflows; contact data provides personalization variables | Contact phone and email must be valid for workflow steps to execute |
| **Email Marketing Engine** | Workflow email steps use the same Resend infrastructure and engagement tracking | Frequency caps and quiet hours apply to workflow emails |
| **Showing Management** | Showing events can trigger follow-up workflow enrollments | Post-showing follow-up workflows depend on showing data |
| **Deal Pipeline** | Deal stage changes can trigger workflow enrollments (e.g., congratulations on closing) | Deal progression feeds into lifecycle-appropriate automations |
| **Voice Agent** | Voice can navigate to the automations page | Navigation only — workflow management requires the UI |

## Escalation Guidance

**Fix yourself:**
- Workflow not sending — check that it is enabled and has active enrollments
- SMS failed for a contact — verify the contact's phone number
- Wrong message content — edit the template in the Templates tab
- Too many messages to one contact — adjust frequency caps in email marketing settings
- Contact should not be in a workflow — remove them from the enrollment list

**Needs admin:**
- Need to create a new custom workflow — requires admin access to the workflow builder
- Workflow steps are executing out of order — requires investigation of the workflow engine
- Twilio or Resend is not configured — requires environment variable setup
- Bulk enrollment failed — requires server-side log review

**Information to gather before escalating:**
- The workflow name and ID
- The contact name and ID who is affected
- Which step in the workflow failed or behaved unexpectedly
- The exact error message or notification text
- Screenshots of the workflow detail page and enrollment list
