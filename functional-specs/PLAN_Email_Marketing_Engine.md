# Realtors360 Email Marketing Engine — Deliverable Plan

## Context

Two overlapping email systems exist in the CRM:
1. **Workflow Engine** — 7 drip sequences, 103 steps, trigger-based enrollment, multi-channel (SMS/email/WhatsApp/tasks)
2. **Newsletter Engine** — AI-generated emails via Claude, 6 React Email templates, Resend delivery + webhook tracking, contact intelligence

**Goal:** Unify into one system, add visual editors (drag-drop email builder + workflow builder), make it self-serve for realtors.

**Approach:** 12 deliverables across 4 phases. Each deliverable is independently shippable, testable, and takes a developer 1-3 days.

---

## Phase 1 — Unify Engines (5 deliverables)

### Deliverable 1.1: Add `ai_email` Step Type
**Effort:** 1 day | **Risk:** Low | **Dependencies:** None

Add a new action type `ai_email` to the workflow engine so it can send AI-generated emails via Claude + Resend, just like the newsletter engine does.

**Files to modify:**
- `src/lib/workflow-engine.ts` — Add `ai_email` case in `executeStep()`:
  1. Read `step.config.email_type` (e.g., `new_listing_alert`)
  2. Call `generateNewsletterContent()` from `src/lib/newsletter-ai.ts`
  3. Render React Email template from `src/emails/`
  4. Send via `src/lib/resend.ts`
  5. Log to `newsletters` table + `workflow_step_logs`

**Step config shape:**
```json
{
  "action_type": "ai_email",
  "config": {
    "email_type": "new_listing_alert",
    "send_mode": "auto"
  }
}
```

**Test:** Create a test workflow with one `ai_email` step, enroll a contact, execute the step, verify email appears in `newsletters` table and is sent via Resend.

---

### Deliverable 1.2: Route All Workflow Emails Through Resend
**Effort:** 1 day | **Risk:** Medium | **Dependencies:** None

Currently `auto_email` steps use raw Gmail/SMTP. Change them to send through Resend so ALL emails get webhook tracking (opens/clicks/bounces).

**Files to modify:**
- `src/lib/workflow-engine.ts` — Update `auto_email` handler:
  1. Fetch template from `message_templates`
  2. Resolve `{{variables}}` in template body
  3. Send via `src/lib/resend.ts` (not Gmail)
  4. Log to `newsletters` table with `resend_message_id`

**Test:** Trigger a workflow with `auto_email` step, verify it sends through Resend (check Resend dashboard), verify `newsletter_events` table gets `delivered` event from webhook.

**Rollback:** Keep Gmail send as fallback if Resend fails (try/catch).

---

### Deliverable 1.3: Convert Journey Schedules to Workflows 8 & 9
**Effort:** 1 day | **Risk:** Low | **Dependencies:** 1.1

Convert the hard-coded `JOURNEY_SCHEDULES` from `journeys.ts` into two new workflow definitions that use `ai_email` steps.

**Files to create:**
- `src/lib/constants/journey-workflows.ts` — Define:
  - Workflow 8: `buyer_email_journey` — all buyer phases as sequential `ai_email` steps with delays
  - Workflow 9: `seller_email_journey` — all seller phases as sequential `ai_email` steps with delays

**Files to modify:**
- `src/lib/constants/workflows.ts` — Import and include new workflows
- `src/actions/workflows.ts` — Include in seed function

**Phase mapping (buyer example):**
| Phase | Emails | Delays |
|-------|--------|--------|
| Lead | welcome → neighbourhood_guide → new_listing_alert → market_update → new_listing_alert | 0h → 72h → 168h → 336h → 504h |
| Active | new_listing_alert → market_update | 168h → 504h |
| Under Contract | neighbourhood_guide | 48h |
| Past Client | home_anniversary → market_update → referral_ask → home_anniversary | 720h → 2160h → 4320h → 8760h |
| Dormant | reengagement → market_update | 0h → 336h |

**Test:** Seed workflows 8 & 9 to DB, verify steps are created correctly, manually execute first step of each.

---

### Deliverable 1.4: Unified Cron Processor
**Effort:** 1 day | **Risk:** Medium | **Dependencies:** 1.1, 1.2

Create a single cron endpoint that processes ALL workflow enrollments (replacing both the workflow processor and `processJourneyQueue()`).

**Files to create:**
- `src/app/api/cron/process-workflows/route.ts`

**Logic:**
```
GET /api/cron/process-workflows (protected by CRON_SECRET header)
1. Fetch up to 100 enrollments where next_run_at <= now AND status = 'active'
2. For each enrollment:
   a. Get the current step from workflow_steps
   b. Execute via workflow engine (handles all step types including ai_email)
   c. If ai_email with send_mode = 'review': save as draft, don't send
   d. Advance current_step, calculate next_run_at from next step's delay
   e. If no more steps: mark enrollment status = 'completed'
3. Return { processed: count }
```

**Environment:**
- Add `CRON_SECRET` to `.env.local`

**Test:** Enroll a contact in a workflow, set `next_run_at` to past, call the cron endpoint, verify step executed and enrollment advanced.

**Deprecate:** Add comment to `src/app/api/newsletters/process/route.ts` pointing to new endpoint.

---

### Deliverable 1.5: Merge Enrollment Tables + Update Dashboard
**Effort:** 2 days | **Risk:** High (data migration) | **Dependencies:** 1.3, 1.4

Migrate `contact_journeys` data into `workflow_enrollments` and update the newsletter dashboard to read from the unified table.

**Migration:** `supabase/migrations/011_unify_email_engine.sql`
```sql
-- Add journey-specific columns to workflow_enrollments
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS journey_phase TEXT DEFAULT 'lead';
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS emails_sent_in_phase INTEGER DEFAULT 0;
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS send_mode TEXT DEFAULT 'auto';

-- Migrate data (run in transaction)
BEGIN;
INSERT INTO workflow_enrollments (contact_id, workflow_id, status, current_step, next_run_at, metadata)
SELECT cj.contact_id, w.id,
  CASE WHEN cj.is_paused THEN 'paused' ELSE 'active' END,
  cj.emails_sent_in_phase, cj.next_email_at,
  jsonb_build_object('journey_phase', cj.current_phase, 'migrated_from', 'contact_journeys')
FROM contact_journeys cj
JOIN workflows w ON (
  (cj.journey_type = 'buyer' AND w.slug = 'buyer_email_journey') OR
  (cj.journey_type = 'seller' AND w.slug = 'seller_email_journey')
);
COMMIT;
```

**Files to modify:**
- `src/app/(dashboard)/newsletters/page.tsx` — Read pipeline from `workflow_enrollments` instead of `contact_journeys`
- `src/actions/journeys.ts` — Mark as deprecated, add redirects to workflow functions

**Test:** Run migration on dev DB, verify data migrated correctly, verify newsletter dashboard still shows pipeline + stats + activity feed.

**Safety:** Keep `contact_journeys` table (don't drop it). Stop writing to it.

---

## Phase 2 — Visual Email Template Builder (3 deliverables)

### Deliverable 2.1: Template Library Page + DB Schema
**Effort:** 1 day | **Risk:** Low | **Dependencies:** None (can run parallel to Phase 1)

Create the template library UI and extend the database.

**Install:** `npm install @usewaypoint/email-builder`

**Migration:** `supabase/migrations/012_email_template_builder.sql`
```sql
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS builder_json JSONB;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS html_preview TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'custom';
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS is_ai_template BOOLEAN DEFAULT false;

-- Seed the 6 React Email templates
INSERT INTO message_templates (name, channel, category, is_ai_template, body) VALUES
  ('New Listing Alert', 'email', 'listing', true, 'AI-generated'),
  ('Market Update', 'email', 'market', true, 'AI-generated'),
  ('Just Sold', 'email', 'lifecycle', true, 'AI-generated'),
  ('Open House Invite', 'email', 'event', true, 'AI-generated'),
  ('Neighbourhood Guide', 'email', 'nurture', true, 'AI-generated'),
  ('Home Anniversary', 'email', 'lifecycle', true, 'AI-generated')
ON CONFLICT DO NOTHING;
```

**Files to create:**
- `src/app/(dashboard)/automations/templates/page.tsx` — Grid of template cards with category filter, thumbnail preview, "New Template" button
- `src/actions/templates.ts` — `getTemplates()`, `createTemplate()`, `deleteTemplate()`, `duplicateTemplate()`

**Test:** Page loads, shows 6 AI defaults with badge, "New Template" button exists (links to editor in 2.2).

---

### Deliverable 2.2: Drag-and-Drop Email Editor
**Effort:** 2 days | **Risk:** Medium | **Dependencies:** 2.1

Full-page EmailBuilder.js editor with variable support.

**Files to create:**
- `src/app/(dashboard)/automations/templates/[id]/edit/page.tsx` — Editor page layout (sidebar + canvas + subject bar)
- `src/components/email-builder/EmailEditor.tsx` — EmailBuilder.js wrapper (lazy-loaded via `next/dynamic`)
- `src/components/email-builder/VariablePicker.tsx` — Sidebar listing all `{{variables}}` with click-to-insert

**Layout:**
```
┌──────────┬─────────────────────────┐
│ Blocks   │ EmailBuilder.js Canvas  │
│ ───────  │                         │
│ Text     │ [Drag blocks here]      │
│ Image    │                         │
│ Button   │                         │
│ Columns  │                         │
│ Divider  │                         │
│          │                         │
│ Variables│                         │
│ ──────── │                         │
│ {{name}} │                         │
│ {{email}}│                         │
│ {{price}}│                         │
├──────────┴─────────────────────────┤
│ Subject: _________________________ │
│ Preview: _________________________ │
│                    [Save] [Preview] │
└────────────────────────────────────┘
```

**Actions:**
- `src/actions/templates.ts` — Add `updateTemplate(id, { builder_json, subject, preview_text })`

**Test:** Create new template, drag text + image + button blocks, add `{{contact_name}}` variable, save, reload page, verify JSON persisted and editor reloads correctly.

---

### Deliverable 2.3: Template Rendering + Workflow Integration
**Effort:** 1 day | **Risk:** Medium | **Dependencies:** 2.2, 1.1

Connect custom templates to the workflow engine so `auto_email` steps can use EmailBuilder.js templates.

**Files to create:**
- `src/lib/email-renderer.ts` — `renderEmailBuilderJSON(builderJson, variables)`:
  1. Import EmailBuilder.js render function
  2. Substitute `{{variables}}` in all text blocks
  3. Return complete HTML string

**Files to modify:**
- `src/lib/workflow-engine.ts` — Update `auto_email` handler:
  ```
  if (template.builder_json) → renderEmailBuilderJSON() → send via Resend
  else → legacy {{variable}} replacement → send via Resend
  ```
- `src/actions/templates.ts` — Add `previewTemplate(id, sampleData)` for iframe preview
- `src/actions/templates.ts` — Add `sendTestEmail(id, recipientEmail)` for test sends

**Test:**
1. Create custom template in editor (2.2)
2. Create workflow with `auto_email` step pointing to this template
3. Enroll a contact, execute the step
4. Verify email received with variables substituted correctly

---

## Phase 3 — Visual Workflow Builder (3 deliverables)

### Deliverable 3.1: Workflow Library + DB Schema
**Effort:** 1 day | **Risk:** Low | **Dependencies:** None (can run parallel)

Enhanced workflow list page with stats and categories.

**Install:** `npm install @xyflow/react`

**Migration:** `supabase/migrations/013_visual_workflow_builder.sql`
```sql
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS flow_json JSONB;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'custom';

UPDATE workflows SET is_default = true WHERE slug IN (
  'speed_to_contact', 'buyer_nurture', 'post_close_buyer',
  'post_close_seller', 'lead_reengagement', 'open_house_followup',
  'referral_partner'
);
```

**Files to modify:**
- `src/app/(dashboard)/automations/page.tsx` — Redesign as workflow library:
  - Card per workflow: name, step count, trigger, duration, enrolled count, completed count
  - Category filter tabs
  - "Edit" button → links to editor (3.2)
  - "Duplicate" button → creates editable copy
  - "+ New Workflow" button
- `src/actions/workflows.ts` — Add `duplicateWorkflow(id)`, `getWorkflowStats()`

**Test:** Page loads, shows all 7+ workflows with stats, duplicate creates a new editable copy.

---

### Deliverable 3.2: React Flow Editor + Custom Nodes
**Effort:** 3 days | **Risk:** High (most complex deliverable) | **Dependencies:** 3.1

Visual drag-and-drop workflow editor using React Flow.

**Files to create:**
- `src/app/(dashboard)/automations/workflows/[id]/edit/page.tsx` — Editor page
- `src/components/workflow-builder/WorkflowCanvas.tsx` — React Flow wrapper (lazy-loaded)
- `src/components/workflow-builder/NodePalette.tsx` — Draggable sidebar with 8 node types
- `src/components/workflow-builder/NodeConfigPanel.tsx` — Config form when node is selected
- `src/components/workflow-builder/nodes/TriggerNode.tsx` — Blue, entry point
- `src/components/workflow-builder/nodes/EmailNode.tsx` — Purple, template picker dropdown
- `src/components/workflow-builder/nodes/SMSNode.tsx` — Green, message body textarea
- `src/components/workflow-builder/nodes/WaitNode.tsx` — Gray, number + unit inputs
- `src/components/workflow-builder/nodes/ConditionNode.tsx` — Orange, field/operator/value, two output handles (yes/no)
- `src/components/workflow-builder/nodes/TaskNode.tsx` — Yellow, description + priority
- `src/components/workflow-builder/nodes/ActionNode.tsx` — Red, action type dropdown (change_status, add_tag, etc.)

**Node type specs:**
| Node | Color | Inputs | Outputs | Config Panel |
|------|-------|--------|---------|-------------|
| Trigger | `#3b82f6` | none | 1 | trigger_type dropdown, contact_type dropdown |
| Email | `#8b5cf6` | 1 | 1 | template dropdown (from 2.1), email_type for AI, send_mode toggle |
| SMS | `#22c55e` | 1 | 1 | template dropdown or free-text body |
| WhatsApp | `#22c55e` | 1 | 1 | template dropdown or free-text body |
| Wait | `#6b7280` | 1 | 1 | delay_value number, delay_unit dropdown (min/hours/days) |
| Condition | `#f59e0b` | 1 | 2 (yes/no) | field dropdown, operator dropdown, value input |
| Task | `#eab308` | 1 | 1 | description textarea, priority dropdown |
| Action | `#ef4444` | 1 | 1 | action dropdown, params (tag name, new status, etc.) |

**Actions:**
- `src/actions/workflows.ts` — Add `saveWorkflowDraft(id, flowJson)`, `publishWorkflow(id)`

**Save:** Persists `flow_json` (nodes + edges JSON) to `workflows` table.

**Test:** Open editor, drag Trigger + Email + Wait + Email nodes, connect them, configure each, save draft, reload, verify flow restored correctly.

---

### Deliverable 3.3: Flow ↔ Steps Converter + Publish
**Effort:** 2 days | **Risk:** High | **Dependencies:** 3.2

Two-way converter so visual flows become executable workflow_steps, and existing workflows can be opened in the editor.

**Files to create:**
- `src/lib/flow-converter.ts`:

```typescript
// Publish: React Flow JSON → workflow_steps rows
function flowToSteps(flowJson): WorkflowStep[] {
  // 1. Topological sort nodes following edges
  // 2. Map each node type → action_type
  // 3. Extract delay from Wait nodes
  // 4. Handle Condition branches (true edge → step, false edge → step)
  // 5. Assign step_order sequentially
}

// Edit: workflow_steps → React Flow JSON (for opening existing workflows)
function stepsToFlow(steps): { nodes: Node[], edges: Edge[] } {
  // 1. Create node for each step
  // 2. Position vertically (y = step_order * 120)
  // 3. Create edges between consecutive steps
  // 4. Handle branches (condition steps → two edges)
}
```

**Files to modify:**
- `src/actions/workflows.ts` — `publishWorkflow(id)`:
  1. Read `flow_json` from `workflows`
  2. Convert via `flowToSteps()`
  3. Delete existing `workflow_steps` for this workflow
  4. Insert new steps
  5. Set `is_published = true`

- Editor page — On load, if `flow_json` is null but `workflow_steps` exist, call `stepsToFlow()` to populate the canvas (backward compat for the 7 pre-built workflows)

**Test:**
1. Open existing "Speed-to-Contact" workflow in editor → verify all 12 steps appear as nodes
2. Add a new node, publish, verify `workflow_steps` updated correctly
3. Enroll a contact, run cron, verify the modified workflow executes correctly

---

## Phase 4 — Segments & A/B Testing (2 deliverables)

### Deliverable 4.1: Contact Segments + Bulk Assignment
**Effort:** 2 days | **Risk:** Low | **Dependencies:** Phase 1 complete

**Migration:** `supabase/migrations/014_segments_ab_testing.sql`
```sql
CREATE TABLE contact_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL,
  contact_count INTEGER DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Files to create:**
- `src/app/(dashboard)/contacts/segments/page.tsx` — Segment list + builder
- `src/components/contacts/SegmentBuilder.tsx` — Visual rule rows:
  - Each row: field dropdown + operator dropdown + value input + remove button
  - "+ Add Rule" button
  - "AND" / "OR" toggle between rules
  - Live contact count preview
- `src/components/contacts/BulkActions.tsx` — Checkbox selection on contacts list + "Assign to Workflow" dropdown
- `src/actions/segments.ts` — `createSegment()`, `evaluateSegment()` (runs query, returns matching contact IDs + count), `bulkEnroll(contactIds, workflowId)`

**Supported fields:**
- `type` (buyer/seller), `stage_bar`, `tags`, `newsletter_unsubscribed`
- `newsletter_intelligence->engagement_score` (>, <, =)
- `newsletter_intelligence->areas` (contains)
- `created_at` (before/after date)

**Test:** Create segment "Active Buyers in Vancouver", verify count matches manual query, bulk-assign to Buyer Nurture workflow, verify enrollments created.

---

### Deliverable 4.2: A/B Testing on Email Steps
**Effort:** 2 days | **Risk:** Medium | **Dependencies:** 2.3 (template rendering), 1.4 (cron)

Add A/B variant support to email workflow steps.

**Files to modify:**
- `src/lib/workflow-engine.ts` — In `auto_email` / `ai_email` handler:
  1. Check if `step.config.variants` exists
  2. If yes: randomly select variant based on weight
  3. Track which variant was sent in `workflow_step_logs.metadata`
  4. Use selected variant's template_id / subject

- `src/components/workflow-builder/nodes/EmailNode.tsx` — Add "A/B Test" toggle:
  - Off: single template picker
  - On: two template pickers + weight sliders + winner metric dropdown

- `src/app/(dashboard)/automations/workflows/[id]/analytics/page.tsx` — **Create**:
  - Enrollment funnel (enrolled → active → completed)
  - Per-step metrics (sent, opened, clicked)
  - A/B comparison table (variant A vs B: open rate, click rate, winner badge)

**Step config with A/B:**
```json
{
  "action_type": "auto_email",
  "config": {
    "variants": [
      { "template_id": "abc", "subject": "New homes!", "weight": 50 },
      { "template_id": "def", "subject": "Your dream home awaits", "weight": 50 }
    ],
    "winner_metric": "click_rate",
    "winner_after": 100
  }
}
```

**Auto-winner:** After `winner_after` sends, compare metrics from `newsletter_events`, set losing variant weight to 0.

**Test:** Create workflow with A/B email step, enroll 10 contacts, run cron, verify ~50/50 split in `workflow_step_logs`, verify analytics page shows both variants.

---

## Deliverable Summary

| # | Deliverable | Effort | Risk | Dependencies | Can Parallel? |
|---|-------------|--------|------|-------------|--------------|
| **1.1** | `ai_email` step type | 1 day | Low | None | Yes |
| **1.2** | Route emails through Resend | 1 day | Med | None | Yes (with 1.1) |
| **1.3** | Journey → Workflows 8 & 9 | 1 day | Low | 1.1 | No |
| **1.4** | Unified cron processor | 1 day | Med | 1.1, 1.2 | No |
| **1.5** | Merge enrollment tables + dashboard | 2 days | High | 1.3, 1.4 | No |
| **2.1** | Template library + DB schema | 1 day | Low | None | Yes (with Phase 1) |
| **2.2** | Drag-drop email editor | 2 days | Med | 2.1 | No |
| **2.3** | Template rendering + workflow integration | 1 day | Med | 2.2, 1.1 | No |
| **3.1** | Workflow library + DB schema | 1 day | Low | None | Yes (with Phase 1-2) |
| **3.2** | React Flow editor + custom nodes | 3 days | High | 3.1 | No |
| **3.3** | Flow ↔ steps converter + publish | 2 days | High | 3.2 | No |
| **4.1** | Contact segments + bulk assign | 2 days | Low | Phase 1 | No |
| **4.2** | A/B testing on email steps | 2 days | Med | 2.3, 1.4 | No |

**Total: ~20 developer-days**

---

## Optimal Build Order (for one developer)

```
Week 1:  1.1 → 1.2 → 1.3 → 1.4 → 1.5
Week 2:  2.1 → 2.2
Week 3:  2.3 → 3.1 → 3.2 (start)
Week 4:  3.2 (finish) → 3.3
Week 5:  4.1 → 4.2
```

**For two developers in parallel:**
```
Dev A (engine):  1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 2.3 → 4.2
Dev B (UI):      2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 4.1
```
Cuts timeline from 5 weeks → 3 weeks.

---

## npm Packages

```bash
npm install @usewaypoint/email-builder   # Phase 2 (MIT, free)
npm install @xyflow/react                # Phase 3 (MIT, free)
```

## New Environment Variable

```
CRON_SECRET=<random-string>   # Protects /api/cron/process-workflows
```

## External Setup

1. **Cron:** Call `GET /api/cron/process-workflows` every 5 minutes (Vercel Crons / external scheduler)
2. **Resend webhook:** Verify `POST /api/webhooks/resend` is registered in Resend dashboard
3. **Resend domain:** Verify sender domain for deliverability

## Migrations

```
supabase/migrations/
├── 011_unify_email_engine.sql          # Deliverable 1.5
├── 012_email_template_builder.sql      # Deliverable 2.1
├── 013_visual_workflow_builder.sql     # Deliverable 3.1
└── 014_segments_ab_testing.sql         # Deliverable 4.1
```
