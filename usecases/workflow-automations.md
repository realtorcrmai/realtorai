---
title: " Use Case: Workflow Automations"
slug: "workflow-automations"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
related_routes: ["/automations"]
changelog: []
---

# Use Case: Workflow Automations

## Problem Statement

Real estate agents lose clients to competitors not because of bad service but because of delayed follow-up. A new buyer lead that doesn't get a response within an hour is often already in conversation with another agent. A past client who never hears from their agent again stops referring business. Manually scheduling SMS check-ins, drip emails, and task reminders across a full contact database is impossible — agents either over-communicate with whoever is top of mind or under-communicate with everyone else.

Realtors360's Workflow Automation engine solves this with a visual workflow builder (React Flow), a step execution engine, contact segment-based bulk enrollment, and a cron-driven processor that runs every 1–2 minutes. Agents define sequences once and the system executes them reliably — sending the right message to the right contact at the right time.

---

## User Roles

| Role | Interaction |
|------|-------------|
| **Listing Agent** | Builds workflows in the visual editor; enrolls contacts or segments; monitors enrollment status |
| **Brokerage Admin** | Creates shared workflow templates; audits step execution logs |
| **Contact (Buyer or Seller)** | Receives automated messages; replies to opt out; progresses through journey phases |

---

## Existing System Context

- **Visual workflow builder:** `src/components/workflow-builder/WorkflowCanvas.tsx`, `WorkflowEditorClient.tsx` — React Flow canvas with drag-and-drop step nodes
- **Flow converter:** `src/lib/flow-converter.ts` — converts React Flow graph JSON (`flow_json`) to/from `workflow_steps` rows in Supabase
- **Workflow engine:** `src/lib/workflow-engine.ts` — core executor: resolves template variables, sends messages via Twilio or Resend, creates tasks, fires system actions, advances enrollments
- **Cron processor:** `POST /api/workflows/process` — protected by `CRON_SECRET`; calls `processWorkflowQueue()`; finds all `workflow_enrollments` where `next_run_at <= now` and executes the current step
- **Contact segments:** `src/actions/segments.ts` — rule-based dynamic audiences; `bulkEnroll(contactIds, workflowId)` enrolls all matching contacts
- **Segment builder UI:** `src/components/contacts/SegmentBuilder.tsx`
- **Send Governor:** `src/lib/send-governor.ts` — prevents over-messaging; blocks sends based on contact engagement score, journey phase, and send frequency
- **Exit on reply:** `checkExitOnReply(contactId)` — called on inbound messages; exits enrollment if current step has `exit_on_reply = true`
- **Pages:** `/automations` (workflow list), `/automations/templates` (template library), `/automations/workflows/[id]` (workflow editor)
- **API:** `POST /api/workflows/process`, `GET /api/workflows/process` (health check), `POST /api/workflows/reengagement`

### Step Action Types

| Action Type | Description |
|-------------|-------------|
| `auto_sms` | Sends SMS via Twilio with template variable resolution |
| `auto_whatsapp` | Sends WhatsApp message via Twilio |
| `auto_email` | Sends HTML email via Resend with Apple-quality template rendering |
| `manual_task` | Creates a task in the CRM for the agent to complete |
| `auto_alert` | Sends an in-app notification to the agent |
| `system_action` | Modifies contact data: change lead status, add/remove tag, change pipeline stage |
| `wait` | Inserts a delay before the next step (delay_minutes, delay_unit, delay_value) |

---

## Features

### 1. Visual Workflow Builder (React Flow)
Drag-and-drop canvas at `/automations/workflows/[id]`. Agents build sequences by:
- Dragging step nodes (email, SMS, WhatsApp, task, wait, system action, alert) onto the canvas
- Connecting nodes with edges to define execution order
- Configuring each node: message content or template, delay duration, exit-on-reply flag
- Saving — `flow_converter.ts` translates the React Flow graph to ordered `workflow_steps` rows

### 2. Template Variable Resolution
All message bodies support `{{variable}}` syntax resolved at send time:
- `{{contact_name}}`, `{{contact_first_name}}`, `{{contact_email}}`, `{{contact_phone}}`
- `{{agent_name}}`, `{{agent_phone}}`, `{{agent_email}}`
- `{{listing_address}}`, `{{listing_price}}`, `{{closing_date}}`
- `{{today_date}}`

### 3. AI-Powered Message Generation
Steps can optionally use `action_config.ai_template_intent` instead of a static template. Claude generates a contextually appropriate message for the contact's type, stage, and listing — then falls back to the static template if AI generation fails.

### 4. Send Governor
Before every message-type step, the send governor checks:
- Contact engagement score and trend (from `newsletter_intelligence`)
- Journey phase of the contact
- Recent send frequency
If the contact is over-messaged or unengaged, the step is suppressed and logged as `status: "suppressed"` in the `newsletters` table (visible in the AI Agent tab).

### 5. Contact Segment Bulk Enrollment
At `/contacts/segments`, agents define dynamic audiences with rule-based filters:
- `type = buyer`, `lead_status = active`, `tags contains "open-house-visitor"`, etc.
- Rules use AND/OR logic; contact count is live-evaluated
- "Enroll Segment in Workflow" calls `bulkEnroll(contactIds, workflowId)` — creates a `workflow_enrollments` row for every matching contact

### 6. Enrollment Lifecycle
Each enrollment tracks:
- `status`: active, paused, completed, exited
- `current_step`: current step order
- `next_run_at`: when the next step should execute
- `exit_reason`: populated when exited (e.g., "Contact replied")

### 7. Exit on Reply
If a step has `exit_on_reply = true` and the contact sends an inbound message, `checkExitOnReply()` marks the enrollment `exited` — preventing further automated messages to an engaged contact.

### 8. Step Execution Log
Every step execution creates a `workflow_step_logs` row with `status` (sent / failed / suppressed) and full `result` JSON. Agents can audit exactly what was sent, when, and whether it succeeded.

### 9. Drip Campaign Support
Sequences of wait → message → wait → message nodes create time-delayed drip campaigns. A "New Buyer Welcome" drip might:
- Immediately: Send welcome SMS
- After 3 days: Send "Are you pre-approved?" email
- After 7 days: Send market update email
- After 14 days: Create manual task "Call to discuss search criteria"

---

## End-to-End Scenarios

### Scenario 1: Create a New Buyer Welcome Drip Campaign
1. Agent navigates to `/automations` → clicks "New Workflow."
2. Names it "New Buyer Welcome Drip" and opens the React Flow canvas.
3. Drags 5 nodes onto the canvas:
   - Node 1: `auto_sms` — "Hi {{contact_first_name}}, this is {{agent_name}} from Realtors360 Realty! Excited to help you find your perfect home. I'll be in touch shortly."
   - Node 2: `wait` — 3 days
   - Node 3: `auto_email` — Subject: "Are you pre-approved?" — Body with link to mortgage broker partner
   - Node 4: `wait` — 4 days
   - Node 5: `manual_task` — "Call {{contact_name}} — discuss search criteria and schedule first showings"
4. Connects nodes in order, sets `exit_on_reply = true` on Node 1.
5. Clicks "Save" — `flow_converter.ts` writes 5 `workflow_steps` rows.

### Scenario 2: Enroll a Contact Segment
1. Agent creates a segment: `type = buyer AND lead_status = new`.
2. Segment evaluates to 23 matching contacts.
3. Agent clicks "Enroll in Workflow" → selects "New Buyer Welcome Drip."
4. `bulkEnroll(contactIds, workflowId)` creates 23 `workflow_enrollments` rows with `current_step = 1` and `next_run_at = now`.
5. Within 1–2 minutes the cron processor fires: all 23 contacts receive the welcome SMS simultaneously.

### Scenario 3: Cron Processor Executes Step and Advances Enrollment
1. Cron fires: `POST /api/workflows/process` with `Authorization: Bearer <CRON_SECRET>`.
2. `processWorkflowQueue()` queries `workflow_enrollments` where `status = active AND next_run_at <= now`.
3. For enrollment belonging to "James Park": current step is 3 (`auto_email`).
4. Engine fetches contact details, resolves `{{contact_first_name}}` to "James", `{{agent_name}}` to "Sarah Chen."
5. Send governor check passes — James is an active buyer with high engagement score.
6. Email is sent via Resend to `james.park@email.com`.
7. `workflow_step_logs` row created: `status = sent`.
8. Engine finds the next step (Node 4: `wait` — 4 days) → sets `next_run_at = now + 4 days`.
9. Enrollment `current_step` advanced to 5.

### Scenario 4: Contact Replies — Exit on Reply Triggered
1. Three days into the drip, James Park replies to the welcome SMS: "Thanks Sarah! Yes I'm pre-approved up to $1.2M."
2. Twilio inbound webhook fires.
3. `checkExitOnReply(jamesParkId)` runs — finds active enrollment with `exit_on_reply = true` on the current step.
4. Enrollment status updated to `exited`, `exit_reason = "Contact replied"`.
5. No further automated messages are sent to James.
6. Activity log records: "Exited workflow: contact replied."
7. An `auto_alert` notification is sent to the agent: "James Park replied to your drip — follow up now."

### Scenario 5: Pause and Resume an Enrollment
1. Agent learns that a buyer (Emma Torres) is going through a personal situation and wants to pause automated messages for 30 days.
2. Agent navigates to Emma's contact profile → "Active Workflows" tab → finds "New Buyer Welcome Drip" enrollment.
3. Agent clicks "Pause" → enrollment status updates to `paused`.
4. Cron processor skips paused enrollments.
5. 30 days later agent clicks "Resume" → status returns to `active` with `next_run_at = now`.
6. Voice agent alternative: "Pause Emma Torres's workflow" → calls `manage_enrollment` with `action: pause`.

### Scenario 6: Workflow with System Actions — Auto-Tag on Email Open
1. Agent builds a workflow for open house visitors:
   - Step 1: `auto_email` — Open house follow-up
   - Step 2: `wait` — 2 days
   - Step 3: `system_action` — `{ action: "add_tag", value: "open-house-followup-sent" }`
   - Step 4: `wait` — 5 days
   - Step 5: `auto_sms` — "Hi {{contact_first_name}}, did you have any questions about the property?"
2. All open house visitors are enrolled via segment: `tags contains "open-house-visitor"`.
3. After Step 1 sends, Step 3 auto-tags each contact with `"open-house-followup-sent"` — enabling further segment targeting later.

### Scenario 7: Voice Agent Enrolls a Contact in a Workflow
1. Agent is on a call and says: "Enroll David Kim in the new buyer welcome drip."
2. Voice agent calls `find_contact` with `name: "David Kim"` → returns contact ID.
3. Voice agent calls `get_workflows` → returns available workflows including "New Buyer Welcome Drip" with its workflow ID.
4. Voice agent calls `enroll_in_workflow` with `contact_id` and `workflow_id`.
5. Enrollment created. Response: "David Kim has been enrolled in the New Buyer Welcome Drip. The welcome SMS will go out in the next minute."

---

## Demo Script

**Setup:** "New Buyer Welcome Drip" workflow exists with 3 steps (SMS, 3-day wait, email). A contact "Rachel Wong" exists with `type = buyer`.

1. **Open `/automations`** → show workflow list with "New Buyer Welcome Drip"
2. **Click into workflow** → React Flow canvas opens — show nodes connected: SMS → Wait (3 days) → Email
3. **Click SMS node** → show message body with `{{contact_first_name}}` variable and `exit_on_reply = true`
4. **Click "Enroll Contact"** → search for Rachel Wong → confirm enrollment
5. **Show enrollment created** → `status: active`, `next_run_at: 1 minute from now`
6. **Wait for cron** (or manually trigger `POST /api/workflows/process`) → SMS sent
7. **Show `workflow_step_logs`** → row with `status: sent`, Twilio SID
8. **Show enrollment updated** → `current_step` advanced, `next_run_at: 3 days from now`
9. **Navigate to `/contacts/segments`** → create segment `type = buyer AND lead_status = new`
10. **Show matching count** → e.g., 8 contacts
11. **Click "Enroll in Workflow"** → 8 enrollments created simultaneously
12. **Voice demo** → "Check Rachel Wong's workflow status" → calls `get_enrollments` → "Rachel Wong is enrolled in New Buyer Welcome Drip, currently at step 2 (wait — 3 days). Next action in 2 days 14 hours."

---

## Data Model

### `workflows` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Workflow identifier |
| `name` | text | Display name |
| `description` | text | Agent-facing description |
| `status` | text | draft, active, archived |
| `flow_json` | jsonb | React Flow graph (nodes + edges) |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last saved timestamp |

### `workflow_steps` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Step identifier |
| `workflow_id` | uuid FK → workflows | Parent workflow |
| `step_order` | integer | Execution sequence (1, 2, 3…) |
| `name` | text | Step label |
| `action_type` | text | auto_sms, auto_whatsapp, auto_email, manual_task, auto_alert, system_action, wait |
| `delay_minutes` | integer | Delay before this step executes |
| `delay_unit` | text | minutes, hours, days |
| `delay_value` | integer | Numeric delay amount |
| `template_id` | uuid FK → message_templates | Optional linked template |
| `task_config` | jsonb | Task title, priority, category (for manual_task) |
| `action_config` | jsonb | System action config or AI template intent |
| `condition_config` | jsonb | Future: conditional branching |
| `exit_on_reply` | boolean | Exit enrollment if contact replies |

### `workflow_enrollments` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Enrollment identifier |
| `workflow_id` | uuid FK → workflows | Enrolled workflow |
| `contact_id` | uuid FK → contacts | Enrolled contact |
| `listing_id` | uuid FK → listings | Optional listing context |
| `status` | text | active, paused, completed, exited |
| `current_step` | integer | Current step order |
| `next_run_at` | timestamptz | When to execute next step |
| `exit_reason` | text | Populated on exit (e.g., "Contact replied") |
| `completed_at` | timestamptz | When workflow completed |
| `metadata` | jsonb | Arbitrary enrollment context |

### `workflow_step_logs` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Log entry identifier |
| `enrollment_id` | uuid FK → workflow_enrollments | Parent enrollment |
| `step_id` | uuid FK → workflow_steps | Executed step |
| `status` | text | sent, failed, suppressed |
| `result` | jsonb | Success detail (Twilio SID, Resend message ID, task ID) |
| `error_message` | text | Error detail if failed |
| `executed_at` | timestamptz | Execution timestamp |

### `contact_segments` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Segment identifier |
| `name` | text | Segment display name |
| `description` | text | Agent-facing description |
| `rules` | jsonb | Array of `{ field, operator, value }` rules |
| `rule_operator` | text | AND / OR |
| `contact_count` | integer | Last evaluated count |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last evaluated timestamp |

---

## Voice Agent Integration

### Voice Tools

**`get_workflows`**
Lists all available automation workflows.
```json
{ "name": "get_workflows", "parameters": {} }
```
Example: "What workflows do I have?" → returns list of workflow names and IDs.

**`enroll_in_workflow`**
Enrolls a specific contact in a workflow by ID.
```json
{
  "name": "enroll_in_workflow",
  "parameters": {
    "workflow_id": "uuid",
    "contact_id": "uuid"
  }
}
```
Example: "Enroll David Kim in the new buyer drip" → agent resolves contact ID via `find_contact`, then calls this tool.

**`get_enrollments`**
Returns all active workflow enrollments for a contact.
```json
{
  "name": "get_enrollments",
  "parameters": {
    "contact_id": "uuid"
  }
}
```
Example: "What workflows is Rachel Wong in?" → returns enrollment status, current step, and next run time.

**`manage_enrollment`**
Pauses, resumes, or exits a contact's workflow enrollment.
```json
{
  "name": "manage_enrollment",
  "parameters": {
    "enrollment_id": "uuid",
    "action": "pause | resume | exit"
  }
}
```
Example: "Pause Emma Torres's workflow" → agent calls `get_enrollments` to get the enrollment ID, then calls this with `action: "pause"`.

### Knowledge Base Entry (voice agent `get_crm_help`)
Topic: `automations` — "Automations (workflows) are visual email/SMS sequences built with the React Flow workflow builder at /automations. Each workflow has steps: auto_sms, auto_whatsapp, auto_email, manual_task, auto_alert, system_action, and wait. Contacts are enrolled individually or in bulk via contact segments. The cron processor runs every 1–2 minutes to execute pending steps. Enrollments can be paused, resumed, or exited. If a contact replies to a message and exit_on_reply is enabled, they are automatically removed from the workflow. Step execution is logged for full auditability."
