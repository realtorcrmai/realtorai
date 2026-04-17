# PRD — Journey & Contact Intelligence Gaps
**Area B: 6 Gaps**  
**Date:** 2026-04-17  
**Status:** Approved for Sprint 1–2  
**Parent Plan:** [IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md](IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md)

---

## G-J01 — Listing Status Never Triggers Journey Phase Advancement

### Priority: P0 — CRITICAL

### Problem
The lifecycle journey defines 5 phases: `lead → active → under_contract → past_client → dormant`. The `under_contract` and `past_client` phases have complete email schedules (closing checklist, inspection reminder, home anniversary, referral ask) but are **completely unreachable**. No code anywhere advances a contact's journey when a listing status changes to `conditional` or `sold`.

This means:
- Every contact stays in `active` phase permanently
- `under_contract` email sequence never fires (closing checklist, inspection reminder)
- `past_client` email sequence never fires (home anniversary, referral ask)
- Post-transaction relationship management is completely broken

### Root Cause
`src/actions/listings.ts` handles listing status updates but contains no calls to `advanceJourneyPhase()`. The journey system and the listing system are completely disconnected.

### User Impact
**Revenue impact**: Referral emails from past clients are worth $0 because they never send. The highest-value emails in a realtor's toolkit (staying in touch post-closing, anniversary check-ins, referral asks) are all dead code.

### Acceptance Criteria
- [ ] When a listing's `status` changes to `conditional` → advance seller's journey to `under_contract`
- [ ] When a listing's `status` changes to `conditional` AND a buyer contact is linked → advance buyer's journey to `under_contract`
- [ ] When a listing's `status` changes to `sold` → advance seller's journey to `past_client`
- [ ] When a listing's `status` changes to `sold` AND a buyer contact is linked → advance buyer's journey to `past_client`
- [ ] Phase advance creates a phase_changed audit log entry
- [ ] Phase advance schedules first email of new phase immediately (`next_email_at = NOW()`)
- [ ] `emails_sent_in_phase` resets to 0 on phase advance
- [ ] If no active journey exists for the contact, create one in the correct phase
- [ ] Handles edge cases: contact has no email, contact is unsubscribed (skip phase advance silently)

### Implementation

**`src/actions/listings.ts` — in the status update path:**

```typescript
// After updating listing status
if (newStatus !== oldStatus) {
  const phaseMap: Record<string, JourneyPhase> = {
    conditional: "under_contract",
    sold: "past_client",
  };
  const newPhase = phaseMap[newStatus];
  
  if (newPhase) {
    // Advance seller's journey
    const sellerId = listing.seller_id;
    if (sellerId) {
      await advanceOrEnrollJourney(sellerId, "seller", newPhase);
    }
    
    // Advance buyer's journey (from linked appointment / contact)
    const buyerContact = await getBuyerContactForListing(listing.id);
    if (buyerContact) {
      await advanceOrEnrollJourney(buyerContact.id, "buyer", newPhase);
    }
  }
}
```

**New helper `advanceOrEnrollJourney()` in `src/actions/journeys.ts`:**
```typescript
export async function advanceOrEnrollJourney(
  contactId: string,
  journeyType: JourneyType,
  newPhase: JourneyPhase
) {
  const existing = await tc
    .from("contact_journeys")
    .select("id")
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType)
    .single();
  
  if (existing.data) {
    await advanceJourneyPhase(contactId, journeyType, newPhase);
  } else {
    // No journey exists — enroll directly in the new phase
    await enrollInJourney(contactId, journeyType, newPhase);
  }
}
```

**Buyer contact lookup:**
The buyer contact must be identified from `appointments` table (buyer_agent_name/email fields). If buyer is stored as flat text (known debt), create contact record first, then enroll.

### Testing Requirements
- Unit: Mock listing status change to `conditional` → verify `advanceJourneyPhase` called with `under_contract`
- Unit: Mock listing status change to `sold` → verify both seller and buyer advanced to `past_client`
- Integration: Full flow — create listing → mark sold → verify contact_journeys updated → verify `under_contract` email queued
- Edge: Listing sold with no buyer linked → only seller advanced, no error thrown

### Effort: 6 hours

---

## G-J02 — Send Governor Completely Bypassed in Journey Queue

### Priority: P1 — HIGH

### Problem
`processJourneyQueue()` checks CASL consent (`canSendToContact()`) before sending but **never calls `checkSendGovernor()`**. The send governor — which enforces phase-based frequency caps, engagement-based throttling, and auto-sunset — exists and is well-written but is wired to the manual send path only.

Consequence: The journey queue sends emails:
- Every 48h to active contacts, regardless of whether they've opened a single email
- To contacts with engagement score of 5/100 (governor would block, queue doesn't check)
- Past the auto-sunset threshold (0 opens in 90 days → should pause, queue ignores this)
- Without consulting realtor config frequency overrides

This is the primary cause of potential CASL complaints and unsubscribes from over-emailing.

### Root Cause
`processJourneyQueue()` was written before `checkSendGovernor()` was implemented. The governor was added later as a standalone utility but never backfilled into the queue.

### Acceptance Criteria
- [ ] `processJourneyQueue()` calls `checkSendGovernor()` for every contact before sending
- [ ] If governor says `defer`: update `next_email_at` to `suggestedDelay` and skip
- [ ] If governor says `block` (auto-sunset): pause journey with `pause_reason = 'auto_sunset'`
- [ ] If governor says `send`: proceed as before
- [ ] Governor check respects realtor config overrides from `realtor_agent_config.frequency_caps`
- [ ] Deferred contacts are logged for visibility (count shown in dashboard)
- [ ] Auto-sunsetted contacts create an agent recommendation: "Re-engage [name] manually"

### Implementation

**`src/actions/journeys.ts` — inside `processJourneyQueue()` loop, after CASL check:**

```typescript
// After: if (!sendCheck.allowed) { continue; }
// Add:
const governorCheck = await checkSendGovernor({
  contactId: contact.id,
  contactType: contact.type,
  journeyPhase: journey.current_phase,
  journeyType: journey.journey_type,
  engagementScore: contact.newsletter_intelligence?.engagement_score ?? 0,
  engagementTrend: contact.newsletter_intelligence?.engagement_trend ?? "stable",
  realtorId: journey.realtor_id,
});

if (!governorCheck.allowed) {
  if (governorCheck.action === "auto_sunset") {
    // Pause permanently — contact needs manual re-engagement
    await tc.from("contact_journeys")
      .update({ is_paused: true, pause_reason: "auto_sunset" })
      .eq("id", journey.id);
    
    await createAgentRecommendation(contact.id, {
      action_type: "manual_reengage",
      reasoning: `Auto-sunsetted: 0 opens in 90+ days. Engagement score: ${governorCheck.engagementScore}.`,
      priority: "low",
    });
  } else if (governorCheck.suggestedDelay) {
    // Defer — check again later
    await tc.from("contact_journeys")
      .update({ 
        next_email_at: new Date(Date.now() + governorCheck.suggestedDelay * 3600000).toISOString(),
        status: "deferred"
      })
      .eq("id", journey.id);
  }
  skippedGovernor++;
  continue;
}
```

### Testing Requirements
- Unit: Contact with engagement score 10, declining trend → governor defers → queue skips + sets `next_email_at`
- Unit: Contact with 0 opens in 90d → governor auto-sunsets → journey paused
- Unit: Contact within frequency cap → governor allows → queue sends
- Integration: Run queue with mix of contacts → verify governor decisions applied correctly

### Effort: 4 hours

---

## G-J03 — Phase Exhaustion Freezes Journey

### Priority: P1 — HIGH

### Problem
When all emails in a phase's schedule have been sent, `processJourneyQueue()` sets `next_email_at = NULL` and stops processing the contact. The contact is effectively frozen — no more emails, no phase advance, no notification to the realtor.

The `resumeJourney()` server action handles this correctly (detects exhausted schedules and advances phases) but is never called automatically. A realtor would need to manually know to click "Resume Journey" for each frozen contact — which never happens in practice.

### Example Failure Scenario
1. Contact enrolled in `lead` phase (5-email schedule)
2. All 5 lead emails sent over 3 weeks
3. Contact hasn't clicked → no automatic lead → active advance
4. `next_email_at = NULL` → contact frozen forever
5. Contact is lost. No re-engagement, no nurturing.

### Acceptance Criteria
- [ ] When `emails_sent_in_phase >= schedule.length`, the queue auto-handles the exhausted phase
- [ ] If contact has shown engagement (score > 40): advance to next natural phase (lead → active)
- [ ] If contact has shown no engagement (score ≤ 40): move to dormant phase immediately
- [ ] Dormant phase sends re-engagement sequence (already defined in JOURNEY_SCHEDULES.buyer.dormant)
- [ ] Phase advance on exhaustion creates audit log entry with reason: "schedule_exhausted"
- [ ] No contact should ever have `next_email_at = NULL` unless they are fully paused or unsubscribed

### Implementation

**`src/actions/journeys.ts` — in `processJourneyQueue()`, replace the early-return on exhaustion:**

```typescript
// Before (broken):
if (emailIndex >= schedule.length) {
  await tc.from("contact_journeys").update({ next_email_at: null }).eq("id", journey.id);
  continue;
}

// After (fixed):
if (emailIndex >= schedule.length) {
  const engagementScore = journey.contacts?.newsletter_intelligence?.engagement_score ?? 0;
  const isEngaged = engagementScore > 40;
  
  const PHASE_PROGRESSION: Record<string, JourneyPhase> = {
    lead: isEngaged ? "active" : "dormant",
    active: isEngaged ? "active" : "dormant",    // Stay active if engaged, else dormant
    dormant: "dormant",                            // Already dormant, just reset counter
    past_client: "past_client",                    // Stay — annual emails loop
  };
  
  const nextPhase = PHASE_PROGRESSION[journey.current_phase] ?? "dormant";
  
  await advanceJourneyPhase(journey.contact_id, journey.journey_type, nextPhase);
  
  // Log
  await logJourneyEvent(journey.id, "phase_exhausted", {
    from: journey.current_phase,
    to: nextPhase,
    reason: "schedule_exhausted",
    engagement_score: engagementScore,
  });
  
  phaseAdvanced++;
  continue;
}
```

**Special case: `past_client` phase**
The past_client schedule has annual emails that should repeat forever. On exhaustion, reset `emails_sent_in_phase = 0` and set `next_email_at` to 1 year from now rather than advancing phase.

### Testing Requirements
- Unit: Lead phase fully exhausted, contact engagement score 70 → advances to active
- Unit: Lead phase fully exhausted, contact engagement score 20 → moves to dormant
- Unit: Past_client phase exhausted → resets counter, schedules next email in 12 months
- Integration: Simulate 5 lead emails sent → run queue → verify contact in active or dormant phase

### Effort: 3 hours

---

## G-J04 — Lead Scoring Has No Daily Cron

### Priority: P1 — HIGH

### Problem
`scoreBatch()` in `src/lib/ai-agent/lead-scorer.ts` contains a well-implemented AI scoring pipeline (Claude Sonnet) that generates `personalization_hints` — the tone, interests, price anchor, hot topics, and avoid topics that directly feed into email content generation. However, there is no scheduled cron endpoint that calls this function.

Lead scores are only generated when explicitly triggered, which in practice never happens automatically. Contacts that clicked a "book showing" link last week still have lead scores from months ago. The AI personalization hints in the email generation prompt are stale — potentially recommending topics the contact no longer cares about.

### User Impact
- AI-generated emails use outdated personalization
- Contacts who escalated intent (clicked book_showing) don't get urgency-appropriate content until score is manually refreshed
- `stage_recommendation: "advance"` recommendations are never surfaced because scoring never runs

### Acceptance Criteria
- [ ] New cron endpoint `GET /api/cron/score-contacts` runs daily at 6 AM UTC
- [ ] Scores the top N contacts by recent activity (configurable, default: 50 per run)
- [ ] Priority order: contacts with `next_email_at` in next 24h scored first (fresh hints for today's sends)
- [ ] Scoring runs on contacts where `ai_lead_score_updated_at < 24h ago`
- [ ] Rate-limited to avoid Claude API overload (max 10 concurrent scoring requests)
- [ ] Results: `contacts.ai_lead_score` JSONB updated, `ai_lead_score_updated_at` timestamp set
- [ ] Stage advancement recommendations written to `agent_recommendations` table
- [ ] Dashboard shows "last scored" timestamp per contact

### Implementation

**New cron endpoint `src/app/api/cron/score-contacts/route.ts`:**
```typescript
export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  
  const supabase = createAdminClient();
  
  // Priority: contacts with emails due in next 24h
  const { data: dueContacts } = await supabase
    .from("contact_journeys")
    .select("contact_id")
    .lte("next_email_at", new Date(Date.now() + 24 * 3600000).toISOString())
    .gte("next_email_at", new Date().toISOString())
    .eq("is_paused", false)
    .limit(50);
  
  const contactIds = dueContacts?.map(j => j.contact_id) ?? [];
  
  // Also include contacts not scored in 24h
  if (contactIds.length < 50) {
    const { data: staleContacts } = await supabase
      .from("contacts")
      .select("id")
      .lt("ai_lead_score_updated_at", new Date(Date.now() - 24 * 3600000).toISOString())
      .limit(50 - contactIds.length);
    
    contactIds.push(...(staleContacts?.map(c => c.id) ?? []));
  }
  
  // Score in batches of 10 (parallel)
  const results = await scoreBatch(contactIds);
  
  return Response.json({ scored: results.length });
}
```

**Vercel cron config (`vercel.json`):**
```json
{
  "crons": [
    { "path": "/api/cron/score-contacts", "schedule": "0 6 * * *" }
  ]
}
```

**New DB column:**
```sql
ALTER TABLE contacts ADD COLUMN ai_lead_score_updated_at TIMESTAMPTZ;
```

### Testing Requirements
- Unit: `scoreBatch([id1, id2])` → verify `ai_lead_score` updated for both contacts
- Unit: Stale contact (score 24h old) → verify included in next batch
- Unit: Contact with `next_email_at` in 2h → verify scored first (priority ordering)
- Integration: Run cron → verify at least 10 contacts scored → verify personalization hints populated
- E2E: Contact clicks link → score updated via webhook → cron includes in next batch → email generated with fresh hints

### Effort: 3 hours

---

## G-J05 — Hard Bounce Does Not Decay Engagement Score

### Priority: P2 — MEDIUM

### Problem
When an email hard-bounces (invalid address, mailbox full, domain not found), the Resend webhook handler correctly:
- Sets `contacts.newsletter_unsubscribed = true`
- Pauses all journeys with `pause_reason = 'bounced'`

But it **does not update `newsletter_intelligence`**. The contact's engagement score remains at whatever it was before — potentially 75/100 for an active buyer whose email just became unreachable. The lead scorer then rates this contact as high-value and generates recommendations to follow up, wasting realtor time.

### Acceptance Criteria
- [ ] Hard bounce event: `newsletter_intelligence.engagement_score` reduced by 30 points (min 0)
- [ ] Hard bounce event: `newsletter_intelligence.bounce_count` incremented
- [ ] Soft bounce (mailbox full): reduce score by 10 points only (address may be temporarily unavailable)
- [ ] 3 consecutive soft bounces = treat as hard bounce (pause journeys)
- [ ] Contact detail page shows bounce count and last bounce date
- [ ] Agent recommendation created: "Verify email address for [name] — email bounced"

### Implementation

**`src/app/api/webhooks/resend/route.ts` — in the bounce handler:**
```typescript
if (type === "email.bounced") {
  const isHardBounce = payload.data?.bounce?.type === "hard";
  const scoreDecay = isHardBounce ? 30 : 10;
  
  // Update newsletter_intelligence
  const { data: contact } = await supabase
    .from("contacts")
    .select("newsletter_intelligence")
    .eq("id", contactId)
    .single();
  
  const intel = contact?.newsletter_intelligence || {};
  const updatedIntel = {
    ...intel,
    engagement_score: Math.max(0, (intel.engagement_score || 0) - scoreDecay),
    bounce_count: (intel.bounce_count || 0) + 1,
    last_bounced_at: new Date().toISOString(),
    last_bounce_type: isHardBounce ? "hard" : "soft",
  };
  
  await supabase.from("contacts")
    .update({ 
      newsletter_intelligence: updatedIntel,
      newsletter_unsubscribed: isHardBounce ? true : undefined,
    })
    .eq("id", contactId);
  
  // Create recommendation
  await createAgentRecommendation(contactId, {
    action_type: "verify_email",
    reasoning: `Email ${isHardBounce ? "hard" : "soft"} bounced. Engagement score reduced. Verify email address.`,
    priority: isHardBounce ? "high" : "medium",
  });
}
```

### Effort: 2 hours

---

## G-J06 — Complaint and Unsubscribe Handled Identically

### Priority: P2 — MEDIUM

### Problem
Resend sends two distinct event types:
- `email.unsubscribed` — user clicked unsubscribe link (voluntary, soft opt-out)
- `email.complained` — user marked the email as spam (involuntary, strong signal)

The current webhook handler processes both identically: mark unsubscribed, pause journeys. This is legally and operationally incorrect:

1. **CASL/CAN-SPAM**: A spam complaint is a signal that you violated their expectations. It requires a review of targeting and content. It should NOT be re-engageable via the same mechanisms as an unsubscribe.
2. **Complaint tracking**: Resend tracks complaint rates. High complaint rates cause domain blacklisting. Complaints need a separate counter.
3. **Re-engagement**: An unsubscribed contact can theoretically re-subscribe. A complained contact should never receive marketing email again without explicit fresh consent.

### Acceptance Criteria
- [ ] `email.unsubscribed` → sets `newsletter_unsubscribed = true`, `unsubscribe_reason = 'user_request'`, pauses journeys
- [ ] `email.complained` → sets `newsletter_unsubscribed = true`, `complaint_count++`, `last_complaint_at = now`, pauses journeys with `pause_reason = 'spam_complaint'`
- [ ] Complained contacts cannot be re-enrolled via any journey action
- [ ] Complained contacts show a "Spam Complaint" warning badge in the contacts list
- [ ] Agent is notified immediately via agent_recommendations: "Spam complaint from [name] — review targeting"
- [ ] Complaint rate dashboard: show % complaints in last 30 days (target: < 0.1%)
- [ ] `contacts` table has separate `complaint_count INT DEFAULT 0` and `last_complaint_at TIMESTAMPTZ` columns

### Implementation

**New migration:**
```sql
ALTER TABLE contacts 
  ADD COLUMN complaint_count INT DEFAULT 0,
  ADD COLUMN last_complaint_at TIMESTAMPTZ,
  ADD COLUMN unsubscribe_reason TEXT; -- 'user_request' | 'spam_complaint' | 'bounced' | 'admin'
```

**`src/app/api/webhooks/resend/route.ts` — split the handler:**
```typescript
if (type === "email.unsubscribed") {
  await supabase.from("contacts").update({
    newsletter_unsubscribed: true,
    unsubscribe_reason: "user_request",
  }).eq("id", contactId);
  
  await pauseAllJourneys(contactId, "unsubscribed");
  await logAuditEvent(contactId, "unsubscribed", "user_request");
}

if (type === "email.complained") {
  const { data: contact } = await supabase
    .from("contacts").select("complaint_count").eq("id", contactId).single();
  
  await supabase.from("contacts").update({
    newsletter_unsubscribed: true,
    unsubscribe_reason: "spam_complaint",
    complaint_count: (contact?.complaint_count || 0) + 1,
    last_complaint_at: new Date().toISOString(),
  }).eq("id", contactId);
  
  await pauseAllJourneys(contactId, "spam_complaint");
  await logAuditEvent(contactId, "complained", "spam_complaint");
  
  // Immediate notification to realtor
  await createAgentRecommendation(contactId, {
    action_type: "review_targeting",
    reasoning: "Contact marked email as spam. Review why this contact was targeted and adjust segment criteria.",
    priority: "urgent",
  });
}
```

### Effort: 2 hours
