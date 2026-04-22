<!-- docs-audit: none --># PRD — Newsletter System Gaps
**Area A: 9 Gaps**  
**Date:** 2026-04-17  
**Status:** Approved for Sprint 1–2  
**Parent Plan:** [IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md](IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md)

---

## G-N01 — Column Name Mismatch in `/api/newsletters/edit`

### Problem
`POST /api/newsletters/edit` writes the edited email body to `html_content` (line 48 in `edit/route.ts`) but the actual Supabase column is named `html_body`. The edit silently succeeds (Supabase ignores unknown columns in `.update()`), but the content change is lost. Realtor edits to drafts never persist.

### User Impact
Any realtor who edits an AI-generated draft before approving it loses their changes on save. The email sends with the original AI content, not the edited version.

### Root Cause
Column was renamed during a migration but the API route was not updated.

### Acceptance Criteria
- [ ] `html_body` written correctly in `edit/route.ts`
- [ ] Edit action in `src/actions/newsletters.ts` (`editNewsletterDraft`) also uses `html_body`
- [ ] No other references to `html_content` exist in newsletter send paths
- [ ] Realtor edits a draft → approves → sent email contains edited content

### Implementation
```typescript
// src/app/api/newsletters/edit/route.ts — line 48
// Before:
.update({ html_content: editedBody, subject: editedSubject })
// After:
.update({ html_body: editedBody, subject: editedSubject })
```

Grep for all `html_content` references in newsletter paths and verify each one.

### Effort: 1 hour

---

## G-N02 — Deferred Newsletters Shown in Approval Queue

### Problem
`getApprovalQueue()` fetches newsletters with `status IN ('draft', 'deferred')`. Deferred newsletters were blocked by the send governor (e.g., contact has declining engagement or exceeded frequency cap). Showing them in the approval queue is misleading — they will be blocked again if approved.

### User Impact
Realtors see a queue full of items that, when approved, silently defer again. Creates confusion and wastes time.

### Root Cause
`getApprovalQueue()` includes `deferred` status without distinguishing the reason for deferral.

### Acceptance Criteria
- [ ] Approval queue shows only `draft` status newsletters
- [ ] Deferred newsletters appear in a separate "Held Back" section (already exists as `HeldBackList.tsx`)
- [ ] Each deferred item shows the reason (e.g., "Frequency cap: next send in 3 days", "Engagement score too low")
- [ ] Clicking "Retry" on a deferred item checks the governor again and either sends or shows updated block reason
- [ ] Queue count badge on nav reflects only true drafts

### Implementation

**`src/actions/newsletters.ts` — `getApprovalQueue()`:**
```typescript
// Change status filter
.in("status", ["draft"])  // Remove "deferred"
```

**New action `getDeferredNewsletters()`:**
```typescript
export async function getDeferredNewsletters() {
  return tc.from("newsletters")
    .select("*, contacts(name, email, newsletter_intelligence)")
    .eq("status", "deferred")
    .order("created_at", { ascending: false });
}
```

**`ApprovalQueueClient.tsx`:** Display deferred in separate collapsible section below main queue with deferral reason badge.

### Effort: 2 hours

---

## G-N03 — Missing Event Emissions in Generate, Send, and Webhook

### Problem
The newsletter service running on Render subscribes to `email_events` table for a full audit trail and engine processing. Three critical events are never emitted:

1. `generateAndQueueNewsletter()` — never emits `newsletter_generated`
2. `sendNewsletter()` — never emits `newsletter_sent`
3. Resend webhook — never emits `email_opened`, `email_clicked`

The newsletter engine on Render is blind to what the CRM is doing.

### User Impact
- Newsletter agent on Render can't learn from send history
- A/B testing can't track which variant was sent
- Cost tracking per generation run is incomplete
- DLQ (Dead Letter Queue) doesn't know about failed sends

### Root Cause
`emitNewsletterEvent()` in `src/lib/newsletter-events.ts` was built but never wired into the main action paths.

### Acceptance Criteria
- [ ] `generateAndQueueNewsletter()` emits `newsletter_generated` with `{ contact_id, email_type, journey_phase, newsletter_id }`
- [ ] `sendNewsletter()` emits `newsletter_sent` with `{ contact_id, newsletter_id, resend_message_id, email_type }`
- [ ] Resend webhook emits `email_opened` with `{ contact_id, newsletter_id, opened_at }`
- [ ] Resend webhook emits `email_clicked` with `{ contact_id, newsletter_id, link_type, score_impact }`
- [ ] All emissions are fire-and-forget (non-fatal if they fail — already the case in `emitNewsletterEvent`)
- [ ] Newsletter engine on Render receives and processes all 4 event types

### Implementation

**`src/actions/newsletters.ts` — after saving newsletter:**
```typescript
await emitNewsletterEvent(tc, {
  event_type: "newsletter_generated",
  contact_id: contactId,
  newsletter_id: newsletter.id,
  payload: { email_type: emailType, journey_phase: journeyPhase }
});
```

**`src/actions/newsletters.ts` — after successful Resend send:**
```typescript
await emitNewsletterEvent(tc, {
  event_type: "newsletter_sent",
  contact_id: contactId,
  newsletter_id: newsletterId,
  payload: { resend_message_id: messageId, email_type: newsletter.email_type }
});
```

**`src/app/api/webhooks/resend/route.ts` — in opened/clicked handlers:**
```typescript
await emitNewsletterEvent(supabase, {
  event_type: type === "email.opened" ? "email_opened" : "email_clicked",
  contact_id: contactId,
  newsletter_id: newsletterId,
  payload: { link_type: linkType, score_impact: scoreImpact }
});
```

### Effort: 3 hours

---

## G-N04 — Bulk Approve Risks Vercel 10s Timeout

### Problem
`bulkApproveNewsletters(ids)` processes newsletters in batches of 10. Each batch: generates content (Claude API ~1s) + text pipeline + quality pipeline (Claude ~1s) + Resend send (~200ms) = ~2–3s per email, 20–30s per batch. A 30-email campaign hits the Vercel 10-second timeout.

### User Impact
Large campaign approvals silently fail mid-batch. Some contacts get emails, others don't. No error shown to realtor.

### Root Cause
Server action processes synchronously within a single Vercel invocation.

### Acceptance Criteria
- [ ] Bulk approve initiates processing and returns immediately with a job ID
- [ ] Processing continues in background (queue-based or async)
- [ ] UI shows real-time progress: "14 / 30 sent", "2 failed"
- [ ] Failed sends are shown with reason (CASL blocked, quality too low, etc.)
- [ ] Realtor can retry failed items individually
- [ ] No timeout errors for campaigns up to 500 contacts

### Implementation

**Option A (Preferred): Supabase Edge Function queue**
1. `bulkApproveNewsletters()` inserts a `bulk_send_jobs` record with `{ newsletter_ids, status: 'queued' }`
2. Supabase cron (every 30s) picks up queued jobs and processes in batches
3. Job updates `processed_count`, `failed_count`, `status` as it runs
4. UI polls `GET /api/newsletters/bulk-job/[jobId]` every 5s for progress

**Option B (Simpler): Chunked server-sent events**
- Stream progress back to client via SSE
- Process 1 newsletter at a time, stream result after each

**Required DB migration:**
```sql
CREATE TABLE bulk_send_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'queued',
  processed_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  results JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Effort: 4 hours

---

## G-N05 — No CASL Consent Expiry Check

### Problem
CASL (Canada's Anti-Spam Legislation) allows express consent for a maximum of 2 years without renewal. `contacts.casl_consent_given` is a boolean with a `casl_consent_date` timestamp. The system never checks whether consent has expired. Contacts who gave consent 2+ years ago are still emailed, violating CASL.

### User Impact
**Legal risk**: CASL violations carry fines up to $10M CAD per violation for organizations. Every email sent to an expired-consent contact is a potential violation.

### Root Cause
`consent_expires_at` column was never added to the `contacts` table. `canSendToContact()` only checks `casl_consent_given` boolean.

### Acceptance Criteria
- [ ] `contacts` table has `casl_consent_expires_at TIMESTAMPTZ` column (nullable)
- [ ] On `casl_consent_date` set: automatically compute `casl_consent_expires_at = casl_consent_date + 2 years`
- [ ] `canSendToContact()` returns blocked if `casl_consent_expires_at < NOW()`
- [ ] `sendNewsletter()` CASL gate checks expiry before sending
- [ ] Cron job (weekly): identify contacts with consent expiring in 30 days → create agent recommendation to request renewal
- [ ] UI shows consent expiry date on contact detail page
- [ ] Contacts with expired consent show warning badge in approval queue ("Consent expired — cannot send")

### Implementation

**Migration:**
```sql
ALTER TABLE contacts 
  ADD COLUMN casl_consent_expires_at TIMESTAMPTZ;

-- Backfill existing consents
UPDATE contacts
SET casl_consent_expires_at = casl_consent_date + INTERVAL '2 years'
WHERE casl_consent_given = true AND casl_consent_date IS NOT NULL;

-- Trigger: auto-set expiry when consent date is set
CREATE OR REPLACE FUNCTION set_casl_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.casl_consent_date IS NOT NULL THEN
    NEW.casl_consent_expires_at := NEW.casl_consent_date + INTERVAL '2 years';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_casl_expiry
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_casl_expiry();
```

**`src/actions/newsletters.ts` — `canSendToContact()`:**
```typescript
if (contact.casl_consent_expires_at && new Date(contact.casl_consent_expires_at) < new Date()) {
  return { allowed: false, reason: "casl_expired" };
}
```

**New cron endpoint `GET /api/cron/casl-expiry-check`:**
```typescript
// Weekly: find contacts with consent expiring in 30 days
// Create agent_recommendations with action_type: "renew_casl_consent"
```

### Effort: 4 hours (includes migration + code + cron + UI badge)

---

## G-N06 — Incomplete Compliance Blocklist

### Problem
`src/lib/text-pipeline.ts` has 6 compliance regex rules. Real estate marketing in BC requires blocking additional deceptive or legally problematic language patterns. Current gaps leave the system vulnerable to regulatory issues and brand damage.

### Current Rules (6)
1. Price guarantees ("guaranteed to sell")
2. Return guarantees ("guaranteed return")
3. Competitor disparagement ("better than [competitor]")
4. Income guarantees ("guaranteed income")
5. Misleading urgency — partial ("only X left" patterns)
6. Discriminatory language — partial

### Missing Rules (6 additions needed)
7. False urgency ("Act now!", "Limited time only", "Expires tonight")
8. Unsubstantiated neighbourhood claims ("best neighbourhood", "safest area")
9. Fake social proof ("thousands of agents use", "most trusted")
10. Unverifiable superlatives ("lowest price in Vancouver", "#1 realtor")
11. Investment advice ("great investment", "guaranteed appreciation", "will go up")
12. Legal advice implications ("no legal issues", "clean title guaranteed")

### Acceptance Criteria
- [ ] All 6 new rules added to `text-pipeline.ts` compliance blocklist
- [ ] Each rule has: pattern (regex), violation category, suggested fix
- [ ] Blocked content causes `quality-pipeline` to return specific violation codes
- [ ] Approval queue shows which rule was triggered and suggested fix
- [ ] Realtor can flag a block as false positive (with audit log)

### Implementation

```typescript
// src/lib/text-pipeline.ts — add to COMPLIANCE_RULES array
{
  pattern: /\b(act now|limited time only|expires tonight|offer ends|don't wait|last chance)\b/gi,
  category: "false_urgency",
  suggestion: "Use specific, factual timelines instead of artificial urgency"
},
{
  pattern: /\b(best neighbourhood|safest area|most desirable|top rated area)\b/gi,
  category: "unsubstantiated_claim",
  suggestion: "Back claims with data (walk score, crime stats, school ratings)"
},
{
  pattern: /\b(thousands of|most trusted|everyone loves|all agents use)\b/gi,
  category: "fake_social_proof",
  suggestion: "Use specific, verifiable numbers"
},
{
  pattern: /\b(lowest price|#1 realtor|best realtor|top agent in)\b/gi,
  category: "unverifiable_superlative",
  suggestion: "Use verifiable claims with source (e.g., 'ranked in top 5% by REBGV')"
},
{
  pattern: /\b(great investment|will appreciate|prices will rise|guaranteed to go up)\b/gi,
  category: "investment_advice",
  suggestion: "Remove investment predictions — BCFSA prohibits unlicensed investment advice"
},
{
  pattern: /\b(clean title|no legal issues|guaranteed clear|no encumbrances)\b/gi,
  category: "legal_claim",
  suggestion: "Do not make legal title claims — this requires a lawyer"
},
```

### Effort: 2 hours

---

## G-N07 — A/B Testing Unimplemented

### Problem
`/newsletters/ab-testing` page exists (full route, navigation) but the underlying logic is entirely missing. No way to create variants, track opens/clicks by variant, or determine a winner.

### User Impact
Feature is promised in the UI (navigation link exists) but clicking it shows an empty page or placeholder. Reduces product credibility.

### Acceptance Criteria
- [ ] Realtor can create an A/B test: pick an email type, write 2 subject lines (variant A/B)
- [ ] System splits the contact list 50/50 (or configurable split)
- [ ] Each variant is sent as a separate newsletter record with `ab_test_id` and `ab_variant` ('A'|'B')
- [ ] After 24h (configurable), system auto-calculates winner by open rate
- [ ] Winner is flagged in analytics; loser stats still visible
- [ ] Realtor can manually pick winner early
- [ ] A/B test results shown in analytics dashboard

### Implementation

**New DB migration:**
```sql
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  subject_a TEXT NOT NULL,
  subject_b TEXT NOT NULL,
  split_pct INT DEFAULT 50,
  winner_variant TEXT,
  winner_criteria TEXT DEFAULT 'open_rate',
  status TEXT DEFAULT 'running',
  evaluate_after_hours INT DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE newsletters ADD COLUMN ab_test_id UUID REFERENCES ab_tests(id);
ALTER TABLE newsletters ADD COLUMN ab_variant TEXT CHECK (ab_variant IN ('A', 'B'));
```

**New server action `createAbTest(params)`:**
- Creates `ab_tests` record
- Splits contact list evenly
- Creates newsletter records for each recipient with correct variant
- Queues all for send

**New cron `GET /api/cron/evaluate-ab-tests`:**
- Runs daily
- For each `running` test past `evaluate_after_hours`:
  - Compute open rates for A and B
  - Set `winner_variant`, `status = 'complete'`

**A/B Test Page (`ab-testing/page.tsx`):**
- Form: email type, variant A subject, variant B subject, split %, evaluate after X hours
- Table: active tests with live A/B stats
- Winner badge when determined

### Effort: 8 hours

---

## G-N08 — No "Regenerate" Button in Approval Queue

### Problem
When the quality pipeline scores a draft as low-quality but still passable (score 5–6/10), it saves it as a draft rather than blocking it. Realtors see a mediocre draft with no easy way to get a better one without manually editing. There's no "Regenerate" button — the only option is to edit manually or skip.

### User Impact
Realtors either approve mediocre content or spend time manually editing AI drafts. The regeneration capability exists server-side but is inaccessible from the UI.

### Acceptance Criteria
- [ ] Each draft in the approval queue has a "Regenerate" button
- [ ] Clicking regenerate calls `regenerateNewsletter(newsletterId)` server action
- [ ] Action: deletes current draft → calls `generateAndQueueNewsletter()` with same params → new draft appears in queue
- [ ] Button shows loading spinner during regeneration (~3–5s)
- [ ] Previous quality score and reasoning shown below draft to explain why regeneration is suggested
- [ ] Max 3 regenerations per newsletter (prevents infinite loop on genuinely hard-to-generate content)
- [ ] Regeneration count badge shown ("1 of 3 regenerations used")

### Implementation

**New server action `regenerateNewsletter(newsletterId)`:**
```typescript
export async function regenerateNewsletter(newsletterId: string) {
  const newsletter = await tc.from("newsletters")
    .select("contact_id, email_type, journey_phase, journey_id, regeneration_count")
    .eq("id", newsletterId)
    .single();
  
  if ((newsletter.regeneration_count || 0) >= 3) {
    return { error: "Max regenerations reached" };
  }
  
  // Delete current draft
  await tc.from("newsletters").delete().eq("id", newsletterId);
  
  // Generate fresh
  await generateAndQueueNewsletter(
    newsletter.contact_id,
    newsletter.email_type,
    newsletter.journey_phase,
    newsletter.journey_id,
    "review"  // Always review mode for regeneration
  );
  
  revalidatePath("/newsletters/queue");
}
```

**New DB column:**
```sql
ALTER TABLE newsletters ADD COLUMN regeneration_count INT DEFAULT 0;
```

**`ApprovalQueueClient.tsx`:** Add regenerate button with loading state and count indicator.

### Effort: 3 hours

---

## G-N09 — No Error Monitoring on Critical Send Path

### Problem
`sendNewsletter()` and the Resend webhook handler are the two most critical paths in the system. If they throw unhandled errors, there is no alert, no retry tracking, no visibility. Errors are logged to console only.

### User Impact
Emails that fail to send go unnoticed. Realtors don't know. Contacts miss emails. The only way to discover failures is to manually check the database.

### Acceptance Criteria
- [ ] All unhandled errors in `sendNewsletter()` are captured with full context (contact_id, newsletter_id, error message, stack)
- [ ] All unhandled errors in the Resend webhook handler are captured
- [ ] Captured errors are written to a `send_errors` table for visibility in the admin UI
- [ ] Critical errors (send failure, webhook crash) create an `agent_recommendations` entry so realtor is notified
- [ ] (Optional) Sentry integration if `SENTRY_DSN` env var is set

### Implementation

**New DB table:**
```sql
CREATE TABLE send_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL, -- 'send_failure' | 'webhook_error' | 'generation_failure'
  newsletter_id UUID REFERENCES newsletters(id),
  contact_id UUID REFERENCES contacts(id),
  error_message TEXT,
  stack_trace TEXT,
  context JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`src/lib/resend.ts` — wrap send in try/catch with logging:**
```typescript
try {
  const result = await resend.emails.send(params);
  return { success: true, messageId: result.data?.id };
} catch (err) {
  await logSendError("send_failure", { newsletterId, contactId, error: err });
  throw err; // Re-throw for caller
}
```

**Error dashboard component:** Add "Errors" tab to `/newsletters/control` page showing unresolved send errors with retry button.

### Effort: 4 hours
