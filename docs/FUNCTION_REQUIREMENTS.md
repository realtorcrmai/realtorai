<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: src/actions/*, src/app/api/* -->
# Function Requirements — Detailed Specifications

Every function that needs to be wired or built. Includes: purpose, inputs, outputs, error handling, edge cases, and database interactions.

---

## 1. validatedSend()

**File:** `src/lib/validated-send.ts` (EXISTS — needs to be CALLED)

**Purpose:** The ONLY function that should send emails to contacts. Wraps Resend with full 7-step validation pipeline.

**Input:**
```typescript
{
  newsletterId: string;        // UUID of the newsletter record
  contactId: string;           // UUID of the contact
  contactName: string;         // Contact's full name
  contactEmail: string;        // Recipient email address
  contactType: string;         // "buyer" | "seller" | "partner"
  preferredAreas: string[];    // From buyer_preferences, e.g., ["Kitsilano", "Point Grey"]
  budgetMin: number | null;    // Min budget in dollars, null if unknown
  budgetMax: number | null;    // Max budget in dollars, null if unknown
  subject: string;             // Email subject line
  htmlBody: string;            // Complete HTML email body
  emailType: string;           // "welcome" | "listing_alert" | "market_update" | "just_sold" | "open_house" | "neighbourhood_guide" | "home_anniversary"
  trustLevel: number;          // 0-3 (ghost/copilot/supervised/autonomous)
  voiceRules?: string[];       // Realtor's voice rules from agent config
  lastSubjects?: string[];     // Last 5 email subjects sent to this contact
  journeyPhase?: string;       // "lead" | "active" | "under_contract" | "past_client" | "dormant"
  skipQualityScore?: boolean;  // Skip Claude quality scorer for speed (bulk ops)
}
```

**Output:**
```typescript
{
  sent: boolean;               // Was the email actually delivered?
  action: "sent" | "queued" | "deferred" | "blocked" | "regenerate";
  messageId: string | null;    // Resend message ID if sent
  validationResult: {          // Full pipeline results
    passed: boolean;
    action: string;
    contentResult: { valid, errors[], warnings[] };
    designResult: { valid, errors[], warnings[] };
    complianceResult: { allowed, reason, defer, deferUntil };
    qualityScore: { average, personalization, relevance, tone, value, cta_clarity, length, uniqueness, issues[], pass, action } | null;
    allErrors: string[];
    allWarnings: string[];
  };
  error: string | null;        // Error message if not sent
}
```

**Database Interactions:**
- READS: `newsletters` (dedup check), `newsletter_events` (bounce check), `contacts` (unsubscribe check), `consent_records` (consent check), `contact_journeys` (trust level)
- WRITES: `newsletters` (update status, quality_score, resend_message_id, sent_at, ai_context), `outcome_events` (log email_sent event), `contact_journeys` (update next_email_at if deferred)

**Error Handling:**
- Resend API timeout → retry once after 5s, then mark failed
- Claude quality scorer timeout → skip quality score, send anyway (with warning)
- Supabase query failure → log warning, continue with available data
- Invalid email address → block immediately, don't attempt send
- Newsletter not found → return error, don't attempt send

**Edge Cases:**
- `contactEmail` is null → block (compliance gate catches this)
- `htmlBody` is empty → block (content validator catches this)
- `trustLevel` is undefined → default to 0 (queue for approval)
- `preferredAreas` is empty array → skip area validation check, still send
- Contact just unsubscribed between generation and send → block (compliance gate checks real-time)
- Resend returns 200 but no message ID → log warning, mark as sent
- Same newsletter ID sent twice → second call should be blocked (dedup check)

---

## 2. autoEnrollAndWelcome()

**File:** `src/actions/contacts.ts` (EXISTS at line 547 — called from createContact)

**Purpose:** When a new contact is created, automatically: (1) enroll them in a buyer/seller journey, (2) generate a personalized welcome email draft.

**Input:**
```typescript
contactId: string;     // UUID of the just-created contact
contactType: string;   // "buyer" | "seller"
name: string;          // Contact's full name
email: string | null;  // Contact's email (null = skip email, SMS only)
notes: string | null;  // Realtor's notes about the contact
```

**Output:** void (fire-and-forget, errors logged but don't fail contact creation)

**Database Interactions:**
- READS: `contact_journeys` (check if already enrolled — prevent duplicate)
- WRITES: `contact_journeys` (insert new journey), `newsletters` (insert welcome email draft)

**Business Logic:**
1. Check if contact already has a journey for this type → if yes, return (idempotent)
2. Insert journey: `journey_type` = buyer/seller, `current_phase` = "lead", `is_paused` = false, `next_email_at` = 3 days from now, `send_mode` = "review", `trust_level` = 0
3. If contact has no email → skip step 4 (journey still created for SMS tracking)
4. Parse notes to extract area and budget:
   - Area: regex match `in|near|around` + capitalized word(s) → "Kitsilano"
   - Budget: regex match `$X-$Y` pattern → min/max
5. Generate welcome email HTML using React Email blocks (NOT hardcoded HTML):
   - For buyers: mentions their area (if detected), budget (if detected), lists 4 value propositions (listing alerts, market updates, neighbourhood guides, expert advice)
   - For sellers: mentions their area, lists 4 seller propositions (CMA, marketing plan, weekly updates, negotiation)
   - Uses brand config from `realtor_agent_config` if available, otherwise defaults
   - Includes: unsubscribe link, physical address, brokerage name
6. Insert newsletter: `status` = "draft", `email_type` = "welcome", `ai_context` = { journey_phase, contact_type, auto_generated, area, budget }

**Error Handling:**
- Journey insert fails (constraint violation) → log and return (contact still created)
- Newsletter insert fails → log and return (journey still created)
- Notes is null → skip area/budget extraction, generate generic welcome
- Email is null → skip newsletter creation, only create journey

**Edge Cases:**
- Contact created with type "partner" or "agent" → do NOT enroll in journey (only buyer/seller)
- Contact created without phone AND email → create journey but no welcome (can't reach them)
- Notes contains multiple areas → use first one found
- Budget in different formats: "$800K", "$800,000", "800000", "800k-900k" → normalize all
- Realtor creates same contact twice (duplicate phone/email) → second call finds existing journey, returns early
- Very long notes (1000+ chars) → only pass first 500 chars to HTML generation

---

## 3. extractVoiceRules()

**File:** `src/lib/voice-learning.ts` (EXISTS — needs to be CALLED from approval queue)

**Purpose:** When a realtor edits an AI-drafted email, compare original vs edited version and extract specific writing rules.

**Input:**
```typescript
realtorId: string;          // Realtor's email or ID
originalSubject: string;     // AI-generated subject
originalBody: string;        // AI-generated HTML body
editedSubject: string;       // Realtor's edited subject
editedBody: string;          // Realtor's edited body
```

**Output:**
```typescript
string[]  // Array of new voice rules extracted, e.g.:
          // ["Never use exclamation marks in subjects",
          //  "Use street addresses instead of area names"]
          // Returns empty array if no meaningful changes detected
```

**Database Interactions:**
- READS: `realtor_agent_config.voice_rules` (existing rules, to avoid duplicates)
- WRITES: `realtor_agent_config.voice_rules` (append new rules), `agent_learning_log` (log the extraction)

**AI Call:**
- Model: `claude-haiku-4-5-20251001` (fast, cheap — $0.0005 per call)
- Prompt: compare original vs edited, extract rules, return JSON array
- Must tell Claude: "Don't repeat these existing rules: [list]"
- Parse response: extract JSON array from Claude's text response

**Error Handling:**
- Claude API timeout → return empty array (don't block the edit flow)
- Claude returns invalid JSON → return empty array
- Claude returns rules that duplicate existing → filter them out
- `realtor_agent_config` doesn't exist for this realtor → create it first (upsert)
- Original and edited are identical → return early, no API call needed

**Edge Cases:**
- Realtor only changed one word → Claude should still try to extract a rule
- Realtor rewrote the entire email → too many changes, may get noise — limit to 5 rules max
- Realtor changed HTML formatting but not text → strip HTML before comparing, skip if text is same
- Voice rules array grows very large (100+) → keep only last 50 most recent
- Multiple realtors → each has their own rules in `realtor_agent_config.realtor_id`

---

## 4. checkSendGovernor()

**File:** `src/lib/send-governor.ts` (EXISTS — needs to be CALLED from workflow engine)

**Purpose:** Advanced send gating beyond basic compliance. Handles engagement-based throttling, auto-sunset, weekend skip, master switch.

**Input:**
```typescript
{
  contactId: string;
  contactType: string;        // "buyer" | "seller"
  journeyPhase: string;       // "lead" | "active" | "under_contract" | "past_client" | "dormant"
  engagementScore: number;    // 0-100
  engagementTrend: string;    // "accelerating" | "stable" | "declining"
  realtorId?: string;         // To load realtor-specific config
}
```

**Output:**
```typescript
{
  allowed: boolean;            // Can we send right now?
  reason: string | null;       // Why not (if blocked)
  suggestedDelay: number | null; // Hours until next send window
  adjustments: string[];       // What was adjusted/checked
}
```

**Database Interactions:**
- READS: `realtor_agent_config` (frequency caps, skip_weekends, quiet_hours, sending_enabled, dormancy_days, auto_sunset_days), `newsletters` (count sent in period), `newsletter_events` (check for opens in sunset window), `contact_journeys` (to pause if auto-sunset triggered)
- WRITES: `contact_journeys` (set is_paused=true if auto-sunset triggered)

**Business Logic:**
1. Load realtor config (or use defaults if not found)
2. Check master switch: `sending_enabled` → if false, block all
3. Check weekend: if `skip_weekends` and today is Sat/Sun → defer to Monday
4. Check engagement throttling: if trend="declining" AND score<30 → max 1 email per 2 weeks
5. Check auto-sunset: if 5+ emails sent in last N days AND 0 opens → pause journey, block
6. Return result with all adjustments logged

**Error Handling:**
- `realtor_agent_config` not found → use hardcoded defaults, don't fail
- Supabase query fails → log warning, allow the send (fail open, not closed — better to send than silently block)

**Edge Cases:**
- New contact with 0 emails sent → allow (no frequency cap reached)
- Contact with `engagementScore` = 0 but `engagementTrend` = "accelerating" → allow (new contact engaging)
- realtor changes `skip_weekends` mid-day on Saturday → takes effect immediately
- Auto-sunset fires → journey paused, but realtor can manually resume anytime
- Multiple journeys for same contact (buyer + seller) → check frequency across ALL journeys combined

---

## 5. classifyClick()

**File:** `src/app/api/webhooks/resend/route.ts` (EXISTS — needs ENHANCED classification)

**Purpose:** Classify email link clicks into 12 categories for behavioral intelligence.

**Input:**
```typescript
url: string;  // The clicked URL, e.g., "https://realtors360.com/listings/kits-3br"
```

**Output:**
```typescript
{
  type: string;          // One of 12 categories
  score_impact: number;  // Points to add to engagement score
}
```

**Categories:**
| Category | URL Pattern | Score |
|---|---|---|
| book_showing | /book-showing, /schedule-viewing | +30 |
| get_cma | /cma, /home-value, /what-is-my-home-worth | +30 |
| listing | /listing, /property, /homes/ | +15 |
| school_info | /school, /education | +10 |
| market_stats | /market, /stats, /report | +10 |
| mortgage_calc | /mortgage, /calculator, /pre-approval | +20 |
| neighbourhood | /neighbourhood, /neighborhood, /area-guide | +10 |
| investment | /investment, /rental, /yield, /cap-rate | +15 |
| price_drop | /price-drop, /reduced | +10 |
| open_house_rsvp | /open-house, /rsvp | +15 |
| forwarded | /forward, /share | +5 |
| other | anything else | +5 |

**Side Effects:**
- Update `contacts.newsletter_intelligence.click_history` (append classified click)
- Update `contacts.newsletter_intelligence.engagement_score` (add score_impact)
- Update `contacts.newsletter_intelligence.inferred_interests` (if listing click, extract area/price)
- If score_impact >= 30 → create `agent_notifications` hot lead alert

**Edge Cases:**
- URL is null or empty → classify as "other"
- URL contains multiple matching patterns (e.g., "/listing/open-house") → use first match (highest priority)
- Same link clicked twice → log both, but only add score once per unique URL per day
- URL is a tracking redirect (e.g., Resend's click tracking proxy) → try to extract original URL from redirect

---

## 6. runLearningCycle()

**File:** `src/lib/learning-engine.ts` (EXISTS — called by weekly cron)

**Purpose:** Weekly analysis of email outcomes. Updates content rankings, timing defaults, and suggests changes.

**Input:**
```typescript
realtorId: string;  // Which realtor to analyze
```

**Output:**
```typescript
{
  realtorId: string;
  autoAdjustments: Array<{
    field: string;      // What was changed
    from: unknown;      // Old value
    to: unknown;        // New value
    reason: string;     // Why
  }>;
  suggestions: Array<{
    field: string;      // What to change
    suggested: unknown; // Recommended value
    reason: string;     // Why
    data: string;       // Supporting data
  }>;
  metrics: {
    emailsAnalyzed: number;
    avgOpenRate: number;
    avgClickRate: number;
    topContentType: string;
    worstContentType: string;
    bestSendDay: string;
    bestSendHour: number;
  };
}
```

**Database Interactions:**
- READS: `realtor_agent_config` (current settings), `newsletters` (last 30 days sent), `newsletter_events` (opens/clicks for those newsletters)
- WRITES: `realtor_agent_config` (update content_rankings, default_send_day/hour, total_emails_analyzed, last_learning_cycle, learning_confidence), `agent_learning_log` (log each auto-adjustment)

**Business Logic:**
1. Get all sent newsletters in last 30 days for this realtor's contacts
2. Get all events for those newsletters
3. Calculate: content type performance (open rate + click rate per type)
4. Calculate: best send day (open rate by day of week, need 3+ data points per day)
5. Calculate: best send hour (open rate by hour, need 3+ data points)
6. Auto-adjust: content_rankings (always safe to reorder)
7. Auto-adjust: default_send_day ONLY if new day beats current by >15%
8. Suggest (don't auto-apply): remove content type if <10% open rate across 5+ sends
9. Log everything to agent_learning_log

**Error Handling:**
- No newsletters in period → return empty metrics, no adjustments
- Less than 10 newsletters → set learning_confidence = "low", still analyze
- Supabase query fails → return error, don't partial-update config
- Division by zero (0 sent) → handle in all rate calculations

**Edge Cases:**
- Realtor just started, only 3 emails → analyze but flag as low confidence
- All email types have same performance → no ranking change needed
- Best day is "sunday" but realtor has skip_weekends=true → skip that day, use second best
- Multiple realtors calling at same time → each operates on their own config (no conflicts)

---

---

## declineInvite()

**File:** `src/actions/team.ts`

**Purpose:** Allows a user to decline a pending team invitation via its token.

**Input:** `token: string` — the invite token from the invitation link.

**Output:** `{ success: true } | { error: string }`

**Database Interactions:**
- READS: `team_invitations` (find pending invite by token)
- WRITES: `team_invitations` (update status to declined), `team_audit_log` (log decline action)

**Error Handling:**
- Token not found or already used → return `{ error }`, no DB changes
- User not authenticated → throw (server action guard)

**Edge Cases:**
- Token already accepted → return error, don't re-process
- Token expired → return error

---

*Created: 2026-03-24*
*Read this alongside TODO_WIRING_GUIDE.md for complete implementation instructions.*

<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->
