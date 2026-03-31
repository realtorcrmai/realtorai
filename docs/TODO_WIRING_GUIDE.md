# TODO: Wire Everything Together — Detailed Implementation Guide

## Status: 42 files built but NOT connected to the app

Every task below includes: WHAT to change, WHERE (exact file path + line area), HOW (code pattern), and TEST (how to verify it works end-to-end in the browser).

---

## TASK 1: Wire Validation Pipeline Into Email Sending

### What
The 4 validators (`content-validator.ts`, `design-validator.ts`, `compliance-gate.ts`, `quality-scorer.ts`) and the pipeline orchestrator (`validators/index.ts`) exist but NO email send actually calls them. The `validated-send.ts` wrapper exists but nothing uses it.

### Where to Change
**File:** `src/actions/newsletters.ts`
- Find the function that sends newsletters (likely `sendNewsletter` or `approveNewsletter`)
- Currently it calls `sendEmail` from `src/lib/resend.ts` directly
- Replace with `validatedSend` from `src/lib/validated-send.ts`

**File:** `src/lib/workflow-engine.ts`
- Find where it sends `ai_email` or `auto_email` step types (around line 207-239)
- Currently calls `sendEmail` from `src/lib/gmail.ts` or direct Resend
- Replace with `validatedSend` from `src/lib/validated-send.ts`

### How
```typescript
// BEFORE (in newsletters.ts):
import { sendEmail } from "@/lib/resend";
await sendEmail({ to: contact.email, subject, html: htmlBody });

// AFTER:
import { validatedSend } from "@/lib/validated-send";
const result = await validatedSend({
  newsletterId: newsletter.id,
  contactId: contact.id,
  contactName: contact.name,
  contactEmail: contact.email,
  contactType: contact.type,
  preferredAreas: contact.buyer_preferences?.areas || [],
  budgetMin: contact.buyer_preferences?.min_budget || null,
  budgetMax: contact.buyer_preferences?.max_budget || null,
  subject,
  htmlBody,
  emailType: newsletter.email_type,
  trustLevel: journey?.trust_level || 0,
});
// result.action is: "sent" | "queued" | "deferred" | "blocked" | "regenerate"
```

### Test
1. Create a contact with email `delivered@resend.dev`
2. Generate a welcome email draft (should auto-happen on contact create)
3. Go to `/newsletters/queue` → approve the email
4. Check: did `validated-send` run? Look at newsletter record — should have `quality_score` populated
5. Check: did the email actually arrive at Resend? Check `resend_message_id` on newsletter record
6. Check: if you create a contact with NO email → should the send be blocked? (compliance gate: no email)
7. Check: if you send 4 emails to same contact in one week → 4th should be deferred (frequency cap)

---

## TASK 2: Wire Prospect 360 Components Into Contact Detail Page

### What
6 components built but not imported into the contact detail page:
- `JourneyProgressBar.tsx`
- `EmailHistoryTimeline.tsx`
- `IntelligencePanel.tsx`
- `ProspectControls.tsx`
- `ContextLog.tsx`
- `QuickLogForm.tsx`

### Where to Change
**File:** `src/app/(dashboard)/contacts/[id]/page.tsx`

This file needs to:
1. Query `contact_journeys` for this contact (to get journey phase, trust level)
2. Query `newsletters` + `newsletter_events` for this contact (email history)
3. Query `contact_context` for this contact (objections/preferences)
4. Import and render all 6 components in the appropriate tabs

### How
```typescript
// Add to the server component data fetching:
const { data: journey } = await supabase
  .from("contact_journeys")
  .select("*")
  .eq("contact_id", contact.id)
  .single();

const { data: newsletters } = await supabase
  .from("newsletters")
  .select("id, subject, email_type, status, html_body, sent_at, created_at, quality_score, ai_context")
  .eq("contact_id", contact.id)
  .order("created_at", { ascending: false });

// For each newsletter, get events
const newsletterIds = newsletters?.map(n => n.id) || [];
const { data: events } = await supabase
  .from("newsletter_events")
  .select("*")
  .in("newsletter_id", newsletterIds);

// Merge events into newsletters
const newslettersWithEvents = newsletters?.map(nl => ({
  ...nl,
  events: events?.filter(e => e.newsletter_id === nl.id) || [],
})) || [];

const { data: contextEntries } = await supabase
  .from("contact_context")
  .select("*")
  .eq("contact_id", contact.id)
  .order("created_at", { ascending: false });

// Then render in the JSX:
<JourneyProgressBar
  contactType={contact.type}
  currentPhase={journey?.current_phase || null}
  engagementScore={intel?.engagement_score || 0}
  phaseEnteredAt={journey?.phase_entered_at}
  enrolledAt={journey?.created_at}
/>

// In tabs:
// Tab 1: <EmailHistoryTimeline newsletters={newslettersWithEvents} />
// Tab 2: <IntelligencePanel intelligence={contact.newsletter_intelligence} totalEmails={newsletters?.length || 0} />
// Tab 3: <ProspectControls contactId={contact.id} contactName={contact.name} journey={journey} />
// Tab 4: <ContextLog contactId={contact.id} entries={contextEntries || []} />
```

### Test
1. Navigate to `/contacts` → click on a contact that has journey data (seeded contacts)
2. Verify: Journey Progress Bar shows at top of page with correct phase
3. Verify: Email History tab shows sent emails with open/click details
4. Verify: Click "expand" on an email → see click details inline
5. Verify: Click "Preview" → email HTML renders in iframe
6. Verify: Intelligence tab shows engagement score, interests, content preferences
7. Verify: Controls tab shows journey toggle, frequency selector, notes textarea
8. Verify: Save notes in Controls → refresh page → notes persisted
9. Verify: Pause journey in Controls → refresh → journey shows paused
10. Verify: Context Log → add an objection → see it appear → mark resolved → see strikethrough
11. Verify: QuickLogForm → log a call → see it in the timeline
12. Verify: page scrolls properly (no overflow hidden issues)

---

## TASK 3: Wire Voice Learning Into Approval Queue

### What
`voice-learning.ts` has `extractVoiceRules()` function but the approval queue (`ApprovalQueueClient.tsx`) doesn't call it when a realtor edits an email.

### Where to Change
**File:** `src/components/newsletters/ApprovalQueueClient.tsx`

Currently has approve/skip buttons. Needs:
1. "Edit" button that opens inline editor
2. On save after edit → call `extractVoiceRules(realtorId, originalSubject, originalBody, editedSubject, editedBody)`
3. Save edited email as draft → then send
4. Show extracted rules to realtor: "AI learned: No exclamation marks"

**File:** `src/actions/newsletters.ts`
- Add a `editAndApproveNewsletter(id, editedSubject, editedBody)` function
- This function: saves edited version → calls voice learning → sends

### How
```typescript
// In ApprovalQueueClient.tsx, add edit state:
const [editingId, setEditingId] = useState<string | null>(null);
const [editedSubject, setEditedSubject] = useState("");
const [editedBody, setEditedBody] = useState("");

// Edit button:
<Button onClick={() => {
  setEditingId(nl.id);
  setEditedSubject(nl.subject);
  setEditedBody(nl.html_body);
}}>Edit</Button>

// Save edit + extract voice rules:
async function handleSaveEdit(nlId: string, originalSubject: string, originalBody: string) {
  const res = await fetch("/api/newsletters/edit", {
    method: "POST",
    body: JSON.stringify({
      newsletterId: nlId,
      editedSubject,
      editedBody,
      originalSubject,
      originalBody,
      realtorId: "demo@realestatecrm.com", // from session
    }),
  });
  // Show toast with extracted rules
}
```

**New API route needed:** `src/app/api/newsletters/edit/route.ts`
- Receives: newsletterId, edited content, original content, realtorId
- Calls: `extractVoiceRules()` from `src/lib/voice-learning.ts`
- Updates: newsletter with edited content
- Returns: extracted rules (if any)

### Test
1. Go to `/newsletters/queue`
2. Click "Edit" on a pending email
3. Change the subject: remove exclamation mark, change wording
4. Save
5. Check: `realtor_agent_config` table → `voice_rules` array has new rule
6. Check: `agent_learning_log` table → entry with change_type "voice_rule"
7. Check: Generate a NEW email → it should follow the extracted rule (no exclamation marks)
8. Check: Approve the edited email → it sends with the edited content, not original

---

## TASK 4: Wire Send Governor Into Workflow Engine

### What
`send-governor.ts` has `checkSendGovernor()` but the workflow engine doesn't call it.

### Where to Change
**File:** `src/lib/workflow-engine.ts`
- Before sending any email (around the `executeAutoEmail` function), call `checkSendGovernor`
- If governor says no → defer the email, don't send

### How
```typescript
// In workflow-engine.ts, before sending:
import { checkSendGovernor } from "@/lib/send-governor";

// Before the send:
const governorResult = await checkSendGovernor({
  contactId: contact.id,
  contactType: contact.type,
  journeyPhase: enrollment.current_phase || "lead",
  engagementScore: intel?.engagement_score || 0,
  engagementTrend: intel?.engagement_trend || "stable",
});

if (!governorResult.allowed) {
  // Defer or block
  await supabase.from("workflow_step_logs").insert({
    enrollment_id: enrollmentId,
    step_id: step.id,
    status: "deferred",
    result: { governor_reason: governorResult.reason },
  });
  return { success: false, error: governorResult.reason };
}
```

### Test
1. Create a contact with journey enrolled
2. Send 3 emails to them manually (or via seed data)
3. Trigger the workflow engine (via cron or manually)
4. Check: 4th email should be DEFERRED, not sent
5. Check: workflow_step_logs shows "deferred" with governor reason
6. Test auto-sunset: create contact with 5 sent emails, 0 opens in 90 days → journey should pause
7. Test weekend skip: set skip_weekends=true in realtor config → emails should defer on Saturday/Sunday
8. Test master switch: set sending_enabled=false → ALL emails should be blocked

---

## TASK 5: Wire Email Blocks Into Email Generation

### What
7 React Email blocks exist in `src/emails/blocks/` but email generation in `newsletter-ai.ts` and `autoEnrollAndWelcome` in `contacts.ts` use hardcoded HTML strings instead.

### Where to Change
**File:** `src/actions/contacts.ts` → `autoEnrollAndWelcome()` function (around line 547)
- Currently builds HTML string manually
- Should use React Email blocks: HeroImage, PropertyCard, CTAButton, Signature, UnsubscribeFooter

**File:** `src/lib/newsletter-ai.ts` (if it exists, or wherever AI email generation happens)
- Should assemble blocks based on email type
- Use `@react-email/render` to convert React components to HTML

### How
```typescript
import { render } from "@react-email/render";
import { Html, Body, Container } from "@react-email/components";
import { CTAButtonBlock } from "@/emails/blocks/CTAButton";
import { SignatureBlock } from "@/emails/blocks/Signature";
import { UnsubscribeFooter } from "@/emails/blocks/UnsubscribeFooter";

// Build email from blocks:
function WelcomeEmail({ firstName, area, ctaUrl }) {
  return (
    <Html>
      <Body style={{ background: "#f6f5ff", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 12 }}>
          {/* Header */}
          <Section style={{ padding: "28px 32px", textAlign: "center" }}>
            <Heading style={{ color: "#4f35d2" }}>Realtors360</Heading>
          </Section>
          {/* Body */}
          <Section style={{ padding: "0 32px 24px" }}>
            <Text>Hi {firstName}, welcome! Looking forward to helping you find your home in {area}.</Text>
          </Section>
          <CTAButtonBlock href={ctaUrl} text="View Listings" />
          <SignatureBlock name="Amanda Chen" title="REALTOR®" brokerage="RE/MAX City Realty" phone="604-555-0123" />
          <UnsubscribeFooter unsubscribeUrl="/api/newsletters/unsubscribe" brokerageName="RE/MAX City Realty" brokerageAddress="123 Main St, Vancouver, BC" />
        </Container>
      </Body>
    </Html>
  );
}

const html = await render(<WelcomeEmail firstName="Sarah" area="Kitsilano" ctaUrl="#" />);
```

### Test
1. Create a new contact → welcome email should be generated using blocks
2. Go to queue → preview the email → verify it has: header, body text, CTA button, signature, unsubscribe footer
3. Check: unsubscribe link is present (CASL compliance)
4. Check: physical address in footer
5. Check: renders correctly on mobile (600px width)
6. Check: dark mode CSS is included
7. Approve and send → check email arrives at delivered@resend.dev → looks correct

---

## TASK 6: Wire Click Classification (12 Categories) Into Webhook

### What
The Resend webhook handler at `src/app/api/webhooks/resend/route.ts` tracks clicks but only classifies them basically. Should classify into 12 categories from the Prospect Journey spec.

### Where to Change
**File:** `src/app/api/webhooks/resend/route.ts`

### How
```typescript
function classifyClick(url: string): { type: string; score_impact: number } {
  const u = url.toLowerCase();

  if (u.includes("book-showing") || u.includes("schedule-viewing"))
    return { type: "book_showing", score_impact: 30 }; // HOT
  if (u.includes("cma") || u.includes("home-value") || u.includes("what-is-my-home-worth"))
    return { type: "get_cma", score_impact: 30 }; // HOT
  if (u.includes("listing") || u.includes("property") || u.includes("/homes/"))
    return { type: "listing", score_impact: 15 };
  if (u.includes("school") || u.includes("education"))
    return { type: "school_info", score_impact: 10 };
  if (u.includes("market") || u.includes("stats") || u.includes("report"))
    return { type: "market_stats", score_impact: 10 };
  if (u.includes("mortgage") || u.includes("calculator") || u.includes("pre-approval"))
    return { type: "mortgage_calc", score_impact: 20 };
  if (u.includes("neighbourhood") || u.includes("neighborhood") || u.includes("area-guide"))
    return { type: "neighbourhood", score_impact: 10 };
  if (u.includes("investment") || u.includes("rental") || u.includes("yield") || u.includes("cap-rate"))
    return { type: "investment", score_impact: 15 };
  if (u.includes("price-drop") || u.includes("reduced"))
    return { type: "price_drop", score_impact: 10 };
  if (u.includes("open-house") || u.includes("rsvp"))
    return { type: "open_house_rsvp", score_impact: 15 };
  if (u.includes("forward") || u.includes("share"))
    return { type: "forwarded", score_impact: 5 };

  return { type: "other", score_impact: 5 };
}

// In the click handler:
const classification = classifyClick(clickedUrl);

// Update intelligence with classified click
const intel = contact.newsletter_intelligence || {};
const history = intel.click_history || [];
history.push({
  type: classification.type,
  url: clickedUrl,
  timestamp: new Date().toISOString(),
  newsletter_id: newsletterId,
});

// Update engagement score
const newScore = Math.min(100, (intel.engagement_score || 0) + classification.score_impact);

await supabase.from("contacts").update({
  newsletter_intelligence: {
    ...intel,
    engagement_score: newScore,
    click_history: history.slice(-50), // keep last 50
    last_clicked: new Date().toISOString(),
  },
}).eq("id", contactId);

// If HOT click (book_showing or get_cma), create notification
if (classification.score_impact >= 30) {
  await supabase.from("agent_notifications").insert({
    title: "🔥 Hot Lead Action",
    body: `${contact.name} clicked "${classification.type}" — act now`,
    type: "hot_lead",
    contact_id: contactId,
    action_url: `/contacts/${contactId}`,
  });
}
```

### Test
1. Send an email with a link containing "book-showing" in the URL
2. Simulate a click event via Resend webhook (or use the webhook test endpoint)
3. Check: `newsletter_events` has event with metadata containing `type: "book_showing"`
4. Check: `contacts.newsletter_intelligence.engagement_score` increased by 30
5. Check: `contacts.newsletter_intelligence.click_history` has the classified click
6. Check: `agent_notifications` has a hot lead notification
7. Test each of the 12 categories with different URLs
8. Test: click a generic URL → classified as "other" with score +5

---

## TASK 7: Wire Daily Digest Into Actual Email Delivery

### What
The daily digest cron at `src/app/api/cron/daily-digest/route.ts` generates digest DATA but doesn't actually SEND an email to the realtor.

### Where to Change
**File:** `src/app/api/cron/daily-digest/route.ts`

### How
After generating the digest data, render it as HTML and send via Resend:

```typescript
import { sendEmail } from "@/lib/resend";

// After building the digest object:
const digestHtml = buildDigestHtml(digest);

await sendEmail({
  to: "demo@realestatecrm.com", // realtor's email
  subject: `Realtors360 Daily: ${digest.emails_sent} emails sent, ${digest.hot_leads.length} hot leads`,
  html: digestHtml,
});

function buildDigestHtml(digest) {
  return `<!DOCTYPE html><html>...
    <h2>Your AI Email Summary</h2>
    <p>${digest.emails_sent} emails sent · ${digest.open_rate}% open rate</p>
    ${digest.hot_leads.length > 0 ? `
      <h3>🔥 Hot Leads — Act Today</h3>
      ${digest.hot_leads.map(l => `<p><strong>${l.name}</strong> (${l.type}) — Score: ${l.score}</p>`).join("")}
    ` : ""}
    ${digest.pending_drafts > 0 ? `
      <p>${digest.pending_drafts} emails pending your review → <a href="...">Review now</a></p>
    ` : ""}
  ...</html>`;
}
```

### Test
1. Call the cron endpoint: `curl http://localhost:3000/api/cron/daily-digest -H "Authorization: Bearer realtors360-cron-secret-2026"`
2. Check: response includes digest data
3. Check: email sent to realtor's email (check Resend dashboard or use delivered@resend.dev)
4. Check: email contains correct stats (sent count, open rate, hot leads)
5. Check: hot leads section only shows if there are hot leads
6. Check: pending drafts link goes to `/newsletters/queue`

---

## TASK 8: Wire Learning Engine Outputs Into Visible UI

### What
The weekly learning cron runs and updates `realtor_agent_config` and per-contact intelligence, but there's no UI showing what was learned or changed.

### Where to Change
Need a new page or section: `/newsletters/weekly-report` or a section in `/newsletters/analytics`

### How
1. Query `agent_learning_log` for recent entries
2. Query `realtor_agent_config` for current settings
3. Display: what was auto-adjusted, what's suggested, performance metrics

### Test
1. Run the weekly learning cron
2. Navigate to the report page
3. Check: shows auto-adjustments made (e.g., "Send day changed from Tuesday to Wednesday")
4. Check: shows suggestions needing approval (e.g., "Stop sending market updates?")
5. Check: approve a suggestion → config updates
6. Check: shows metrics (emails analyzed, open rate, click rate, top/worst content)

---

## TASK 9: Wire DailyDigestCard Into Main Dashboard

### What
`DailyDigestCard.tsx` component exists but is NOT imported into the dashboard page.

### Where to Change
**File:** `src/app/(dashboard)/page.tsx`

### How
```typescript
import { DailyDigestCard } from "@/components/dashboard/DailyDigestCard";

// Add to the dashboard layout, prominently near the top:
<DailyDigestCard />
```

### Test
1. Navigate to `/` (dashboard)
2. Check: DailyDigestCard shows with real data (emails sent, opens, clicks, rate)
3. Check: hot leads section shows contacts with score > 60
4. Check: pending drafts count links to `/newsletters/queue`
5. Check: card loads without error even when no data exists (empty state)

---

## TASK 10: Build Demo Seed Data

### What
Create a comprehensive seed script that populates the CRM with realistic demo data for presenting to realtors.

### Requirements
- 30 contacts across all journey phases (15 buyers, 10 sellers, 5 agents)
- One contact uses `amandhindsa@outlook.com` — receives REAL emails
- Real Vancouver MLS listings (6+ with real addresses, prices, photos)
- 55 newsletters with open/click events
- Realtor agent config with voice rules and learned settings
- Context entries, instructions, and direct contact logs
- Demo login: `demo@realtors360.com` / `demo2026`

### Test
1. Run seed script
2. Login as demo user
3. Dashboard shows: overnight summary with real stats
4. Click Sarah Chen → full Prospect 360 view with 6 emails, score 78, journey at "hot"
5. Queue shows 8 pending drafts
6. Analytics shows real open/click rates
7. Send a REAL email to amandhindsa@outlook.com → verify it arrives
8. Walk through the full 5-minute demo script without errors

---

## EXECUTION ORDER

Do these in order. Each task depends on the previous:

1. **TASK 9** — DailyDigestCard on dashboard (smallest, quick win, builds confidence)
2. **TASK 2** — Prospect 360 on contact page (biggest visual impact)
3. **TASK 6** — Click classification in webhook (data foundation)
4. **TASK 1** — Validation pipeline in send flow (safety)
5. **TASK 4** — Send governor in workflow engine (frequency control)
6. **TASK 5** — Email blocks in generation (template quality)
7. **TASK 3** — Voice learning in approval queue (AI learning)
8. **TASK 7** — Daily digest email delivery (realtor communication)
9. **TASK 8** — Learning report UI (transparency)
10. **TASK 10** — Demo seed data (sales readiness)

After EACH task: run eval, test in browser, verify data flows end-to-end.

---

*Created: 2026-03-24*
*This file is the source of truth for what needs to be wired together.*
*Do NOT skip the test steps. Do NOT say "done" without browser verification.*
