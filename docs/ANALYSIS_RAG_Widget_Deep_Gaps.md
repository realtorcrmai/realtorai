# Deep Gap Analysis: Universal RAG Chat Widget PRD

> **Date:** March 30, 2026
> **Version:** 2.0 — 5-pass iterative analysis
> **Scope:** Thorough analysis of every gap in `docs/PRD_Universal_RAG_Chat_Widget.md`, going beyond surface-level feature lists into behavioral, architectural, and scenario-level issues
> **Method:** Agent pipeline market research (10 CRMs) + codebase deep dive (line-by-line verification) + competitive analysis (HubSpot, kvCORE, FUB, Linear, Notion, Salesforce, Intercom, Drift, GitHub Copilot) + first-principles reasoning
>
> **Pass history:**
> - Pass 1: Initial gap analysis — 10 gaps found, then 7 more via code verification (17 total)
> - Pass 2: Competitive market comparison — 8 new gaps found from best-in-market analysis
> - Pass 3: Code-level claim verification — 4 Pass 1 claims corrected (2 already fixed, 2 factually wrong)
> - Pass 4: Depth check — 3 sections expanded from bullet points to implementable specs
> - Pass 5: Final read — cross-references verified, priority matrix recalibrated, formatting cleaned

---

## PASS 1 CORRECTIONS (Verified in Pass 3)

Before presenting the full analysis, these corrections to the original Pass 1 output must be noted:

| Original Claim | Verdict | Evidence |
|----------------|---------|----------|
| **Gap 7: RLS `USING (true)` on rag_sessions** | **ALREADY FIXED** | Migration `059_rag_security_and_compliance.sql:8-10` replaced with proper email-scoped policy |
| **Gap 11: Session ownership not validated** | **ALREADY FIXED** | `conversation.ts:59` has `if (userEmail && session.user_email !== userEmail) { return null; }` + RLS fix in 059 |
| **PRD: ContextBanner never receives actual page context** | **WRONG** | `ContextBanner.tsx:10` receives and displays `uiContext` (contact_name, listing_address, etc.) |
| **PRD: `tone_preference` in `realtor_agent_config`** | **WRONG LOCATION** | `tone_preference` is per-session in `rag_sessions` table, not per-realtor in `realtor_agent_config` |
| **Gap 12: Cross-contact leakage** | **PARTIALLY TRUE** | `conversation.ts:94-104` injects system message on context switch, but history NOT trimmed — old contact data remains |
| **Gap 15: Double-send race condition** | **PARTIALLY TRUE** | `ChatWidget.tsx:126` disables input while loading, but no server-side deduplication |

**Gaps 7 and 11 are removed from the active gap list.** Their original P0 priority was based on incorrect information.

---

## CONFIRMED GAPS (Pass 1, verified in Pass 3)

### GAP 1: Session Activity Trail — The AI Has No Memory of What You Just Did

**Severity: HIGH | Effort: 3-4 days | Priority: P2**

**What the PRD says:** `usePageContext()` extracts the current page entity. That's a snapshot, not a journey.

**What's actually needed:** When a realtor opens the chat widget on a listing page, the AI should know not just "you're on listing 123 Main St" but the **entire sequence of actions** that led here. Intent is inferred from patterns, not snapshots.

**Real scenarios the PRD misses:**

- **Comparing listings:** Realtor visits listing A ($750K), then B ($820K), then C ($680K) — all East Vancouver 3BR. AI should infer: "You've been comparing 3 East Vancouver properties. Want a comparison table?"
- **Pre-meeting prep:** Realtor opens Sarah Chen → showing history → listing she saw → chat. AI should connect: "Sarah viewed this property yesterday. Draft a follow-up?"
- **Workflow debugging:** Realtor bounces Phase 4 ↔ Phase 5 repeatedly. AI should infer: "You seem stuck between pricing and forms. Is there a price mismatch?"

**What to build:**

1. **Session Activity Store** — in-memory ring buffer of last 20 page visits:
   ```typescript
   interface SessionEvent {
     page: string;
     entity_type: 'listing' | 'contact' | 'showing' | 'newsletter' | 'other';
     entity_id?: string;
     entity_label?: string;
     timestamp: number;
     duration_ms?: number;
   }
   ```

2. **Pattern Detection** — before sending to planner:
   - Same entity type 3+ times → "comparing" intent
   - Contact → Listing sequence → "matching buyer to property"
   - Rapid back-and-forth → "confused/stuck"
   - Single long visit (>5 min) → "deep reading" → suggest articles

3. **Trail injection into Tier 1 planner:**
   ```
   UI Context: Page: /listings/abc | Listing: 123 Main St
   Session trail (last 10 min):
   1. Contact: Sarah Chen (buyer) — 2 min
   2. Showing history for Sarah Chen — 1 min
   3. [Current] Listing: 123 Main St — viewing now
   Detected pattern: buyer-to-listing matching
   ```

**Competitive benchmark:** kvCORE tracks user journeys in `user_journey` table. HubSpot shows "Recently viewed" but doesn't feed it into AI context. This would be a genuine differentiator.

---

### GAP 2: Context Freshness — The AI Can Serve Stale Data

**Severity: CRITICAL | Effort: 2-3 days | Priority: P1 — trust issue**

**Code verification:** CONFIRMED. `retriever.ts` fetches results but never compares `source_created_at` (which exists in schema at `055_rag_system.sql:42`) against the actual record's `updated_at`. No freshness check, no live data supplement, no staleness disclaimer.

**What breaks:**
- Price updated from $899K to $849K → ingest fails silently → AI says "$899,000"
- Showing confirmed via Twilio webhook → embedded data still says "requested"
- Contact notes updated by teammate → chat doesn't know

**What to build:**

1. **Freshness check on retrieval:** Compare `source_created_at` on embedding vs record's `updated_at`. If record was updated after embedding, fetch live record instead.
2. **Live data supplement:** For the entity on the current page, always fetch fresh data from DB directly. Use RAG only for historical context (communications, activities).
3. **Context staleness indicator:** If retrieved data >24h old for a frequently-changing record, add disclaimer: "Note: This information was last indexed 2 days ago."

**Competitive benchmark:** Salesforce Einstein uses `context_last_updated` timestamps and 24-hour TTL. kvCORE uses `context_expires_at`. We have neither.

---

### GAP 3: Conversation Handoff When Context Changes

**Severity: HIGH | Effort: 1-2 days | Priority: P1**

**Code verification:** PARTIALLY ADDRESSED. `conversation.ts:94-104` injects a system message `[Context switch: contact changed from X to Y. Previous context cleared for privacy.]` but the old messages about Contact A **remain in the messages array**. The synthesizer (`synthesizer.ts:131`) sends last `MAX_HISTORY_TURNS` to Claude — if Contact A data was discussed recently, it leaks into Contact B's response.

**What to build:**

1. **History trimming on context change:** When `contact_id` changes, truncate conversation history to only include messages from the new context. Store old messages in a separate `prior_context` field for explicit "compare with previous" queries.
2. **Pronoun resolution directive in planner prompt:**
   ```
   IMPORTANT: "this", "here", "current" always refer to the CURRENT UI context.
   "previous", "the other one", "before" refer to the prior context.
   ```
3. **Dual-context mode:** Both old and new context available to planner when user explicitly references "the previous contact/listing."

---

### GAP 4: Degraded Mode — What Happens When the AI Breaks

**Severity: HIGH | Effort: 2-3 days | Priority: P1**

**What the PRD specifies:** Nothing. Zero degradation strategy.

**What breaks:** Claude outage (2-3x/month, 5-15 min) kills both planner and synthesizer. Voyage outage kills retrieval. Supabase slowness kills session management.

**What to build:**

1. **Tiered fallback chain:**
   ```
   Full pipeline (plan → retrieve → synthesize)
   ↓ if retrieval fails
   Direct generation with page context only (no RAG, just Claude + ui_context)
   ↓ if Claude fails
   Cached response templates based on detected intent
   ↓ if everything fails
   Static "service unavailable" message with ETA
   ```

2. **Timeout handling:**
   - 10s timeout on Tier 1 (Haiku) → skip planning, use fallback plan
   - 15s timeout on Tier 3 (Sonnet/Opus) → return partial response
   - Client-side: typing indicator at 0s, "Still thinking..." at 10s, cancel option at 20s

3. **Health check endpoint:** `/api/rag/health` checking Voyage, Claude, and Supabase. Widget shows subtle indicator if degraded.

**Competitive benchmark:** Intercom Fin auto-hands off to humans when confidence is low. GitHub Copilot falls back to local IntelliSense. Drift falls back to scripted playbooks. The PRD needs at least one fallback tier.

---

### GAP 5: The Feedback Loop Is Broken

**Severity: MEDIUM | Effort: 3-4 days | Priority: P2**

Thumbs down → `rag_feedback` table → nothing happens. No analysis, no dashboard, no adaptive behavior.

**What to build:**

1. **Structured negative feedback:** Not just thumbs down — ask WHY: (a) Irrelevant (b) Wrong facts (c) Missing info (d) Tone issue. "Wrong facts" flags the source embedding. "Irrelevant" creates a negative training example.
2. **Feedback dashboard:** Positive/negative ratio per intent type per week.
3. **Auto-escalation:** 3+ thumbs down in a session → switch to Opus model.
4. **Feedback-informed reranking:** Queries that got negative feedback → push down sources cited in bad responses.

---

### GAP 6: Privacy & Compliance — Chat Logs Contain Sensitive CRM Data

**Severity: CRITICAL | Effort: 5-7 days | Priority: P0 — legal**

**Code verification:** CONFIRMED. `rag_sessions.messages` stores unencrypted JSONB (`055_rag_system.sql:111`). Messages contain PII (names, phones, emails), property prices, FINTRAC status, lockbox codes, commission amounts.

**Compliance gaps:**
- **PIPEDA:** No data export endpoint, no chat deletion endpoint, no retention policy
- **FINTRAC:** `rag_cleanup_sessions` auto-deletes after 7 days — but FINTRAC records must be retained 5 years. Contradiction.
- **Audit trail:** `rag_audit_log` stores query/response text but doesn't log WHICH entity's data was accessed

**What to build:**

1. **Data access logging:** `{ user, accessed_entity, accessed_fields, timestamp }` on every RAG retrieval
2. **Chat export endpoint:** `/api/rag/sessions/export?user_email=X` (PIPEDA)
3. **Chat deletion endpoint:** `/api/rag/sessions/purge?user_email=X` (right to be forgotten)
4. **Retention policy separation:**
   - Normal sessions: 30-day retention (not 7 days)
   - Sessions accessing FINTRAC data: 5-year retention (auto-flagged)
   - Audit logs: 2-year minimum
5. **PII detection in responses:** Scan for SIN numbers, credit card numbers, bank accounts before returning

---

### GAP 8: CRM Action Integration — The AI Is Read-Only

**Severity: HIGH | Effort: 7-10 days | Priority: P2**

The PRD treats the chat as Q&A only. Every major competitor supports actions:

**Actions the AI should trigger (but can't):**
- "Schedule a showing for Sarah at 123 Main St Thursday 2pm" → `createShowingRequest()`
- "Send Sarah a follow-up email" → draft and queue newsletter
- "Move this listing to Phase 7" → `advanceWorkflowPhase()`
- "Add a note that the buyer loved the kitchen" → insert into communications
- "What's my calendar look like tomorrow?" → query Google Calendar

**What to build:** Claude tool-use integration with confirmation before execution:
- `create_showing(listing_id, contact_id, date, time)`
- `draft_email(contact_id, subject, body)`
- `advance_phase(listing_id)`
- `log_note(contact_id, note_text)`
- `search_calendar(date_range)`

**Competitive benchmark:** HubSpot Breeze creates records from Copilot. Salesforce Agentforce chains multi-step actions autonomously. Notion AI agents execute workflows. The PRD's read-only design is behind all three.

---

### GAP 9: Empty State Problem — New Users Have Nothing to Chat About

**Severity: HIGH | Effort: 1-2 days | Priority: P1**

New realtor, 0 contacts, 0 listings. RAG returns nothing. AI says "I don't have enough data" for every question. **Worst possible first impression.**

**What to build:**
1. **Onboarding mode:** If <10 CRM records, switch to guided mode with proactive suggestions
2. **Knowledge-first fallback:** When RAG returns no CRM results, always fall back to knowledge base articles
3. **Demo mode:** "Want to see what I can do? Try: 'Draft a follow-up for a buyer who saw a $600K condo'"

---

### GAP 10: Search Doesn't Understand Real Estate Language

**Severity: MEDIUM | Effort: 3-4 days | Priority: P2**

Cmd+K uses `ILIKE '%query%'` — pure text matching. "Sarah's listings", "showings this week", "East Van condos under 700" all return nothing.

**What to build:**
1. **NLP query parser:** Haiku parses "East Van condos under 700" → `{ area: 'East Vancouver', property_type: 'condo', max_price: 700000 }`
2. **Relational search:** "Sarah's listings" → JOIN contacts to listings by seller_id
3. **Date-aware search:** "this week", "yesterday" → date range resolution
4. **Hybrid search:** ILIKE first (fast), RAG semantic fallback if no results

---

### GAP 12: Cross-Contact Data Leakage in Conversation History

**Severity: HIGH | Effort: 1 day | Priority: P1 (downgraded from P0)**

**Code verification:** PARTIALLY TRUE. `conversation.ts:94-104` injects a system message flagging the context switch, but history is NOT trimmed. If Contact A's FINTRAC data was discussed in the last 10 turns, it leaks into Contact B's response via the synthesizer.

**Fix:** Truncate history to messages from current context on contact_id change. Store prior context separately.

---

### GAP 13: No Streaming UX for Long Responses

**Severity: HIGH | Effort: 2-3 days | Priority: P1 (upgraded from P2)**

**Code verification:** CONFIRMED. `chat/route.ts:164` returns `NextResponse.json(response)` — synchronous full payload. No `ReadableStream`, no SSE.

**Competitive benchmark:** Intercom streams. Notion streams. GitHub Copilot streams. HubSpot appears to stream. **Streaming is table stakes in 2026.** Opus responses take 5-15 seconds — staring at a spinner that long is unacceptable.

**What to build:**
1. Server: Replace `NextResponse.json()` with `ReadableStream` using SSE (`text/event-stream`)
2. Client: Progressive rendering — tokens appear as they arrive
3. Typing indicator immediately on send, streaming text replaces it

---

### GAP 14: Accessibility (WCAG 2.1 AA) Not Met

**Severity: MEDIUM | Effort: 2-3 days | Priority: P2**

**Code verification:** CONFIRMED.
- `ChatMessage.tsx:17-26` — no `role="article"`, no `aria-label` for sender
- `ChatInput.tsx:32-41` — textarea has no `<label>` or `aria-label`
- `FeedbackButtons.tsx:50-51` — buttons have `title` but no `aria-label`
- Loading states not in `aria-live="polite"` regions
- No keyboard trap prevention in chat panel

---

### GAP 15: Double-Send Race Condition

**Severity: MEDIUM | Effort: 4 hours | Priority: P1 (downgraded from original)**

**Code verification:** PARTIALLY TRUE. Client-side protection exists (`ChatWidget.tsx:126` disables input while loading), but rapid double-clicks can queue two requests. No server-side deduplication.

**Fix:** Server-side: Check if last message in session is `role: 'user'` with no assistant response yet → reject duplicate.

---

### GAP 16: Inconsistent Error Responses

**Severity: LOW | Effort: 1 day | Priority: P2**

All RAG endpoints return generic `{ error: 'Internal server error' }`. Frontend can't distinguish Voyage down vs Claude timeout vs rate limit.

**Fix:** Structured errors: `{ error: 'voyage_unavailable', message: '...', retry_after_ms: 5000 }`

---

### GAP 17: No Request Timeout Protection

**Severity: HIGH | Effort: 4 hours | Priority: P1**

**Code verification:** CONFIRMED. Neither `query-planner.ts:59-64` nor `synthesizer.ts:51-56` set `AbortController` timeouts on Claude API calls. Requests hang until Vercel's 30s function timeout kills them.

**Fix:** `AbortController` with 10s timeout on Haiku, 20s on Sonnet/Opus. Return partial response or fallback on timeout.

---

## NEW GAPS FROM PASS 2 (Competitive Market Analysis)

These gaps were NOT identified in Pass 1. They come from comparing the PRD against best-in-market implementations across 8 competitors.

### GAP 18: No Hierarchical Context Scoping

**Severity: MEDIUM | Effort: 2-3 days | Priority: P2**

**What the PRD has:** Flat page-level context — the AI knows you're on `/listings/abc` and gets listing_id, address, price.

**What best-in-market does:** GitHub Copilot supports `#editor` (current selection) < `#file` (current file) < `@workspace` (entire project). Salesforce Agentforce accesses record-level AND Data Cloud-level context. This maps to:

- **Selection level:** If the user highlights a specific field value on the page (e.g., a commission rate), the AI should know about that selection
- **Record level:** Current listing/contact (what the PRD covers)
- **Global CRM level:** Cross-entity queries ("which of my listings have the most showings this month?")

**What to add to PRD:** Define context hierarchy. The chat route should accept an optional `selection_context` parameter for page-level selections, and the planner should understand when to scope retrieval to the current record vs. querying globally.

---

### GAP 19: No Explicit Context References (@-Mentions)

**Severity: MEDIUM | Effort: 3-4 days | Priority: P2**

**What the PRD has:** Context comes from the current page only. If you're on listing A's page and want to ask about listing B, you have to navigate to listing B first.

**What best-in-market does:** Notion supports `@page` mentions to pull in context from other pages. GitHub Copilot supports `#file:path` to reference specific files. HubSpot's CRM command line lets you reference records by name.

**What to add to PRD:** Support `@contact:Sarah Chen` and `@listing:123 Main St` syntax in chat input. When detected:
1. Fuzzy-match the mention against CRM records
2. Show autocomplete dropdown with matching records
3. Inject the referenced entity's data into the RAG context alongside the current page context

**Why this matters:** A realtor on Sarah Chen's contact page wants to ask "Compare @listing:123 Main St with @listing:456 Oak Ave" — they shouldn't have to navigate away from the contact page.

---

### GAP 20: Cmd+K Is Search-Only — No Actions from Palette

**Severity: HIGH | Effort: 3-4 days | Priority: P1**

**What the PRD has:** Cmd+K searches contacts, listings, and knowledge articles. Click navigates to detail page. That's it.

**What best-in-market does:** Linear's Cmd+K is the gold standard — selecting a record opens a **nested action menu** (assign, change status, label, move). HubSpot's CRM command line creates records directly. Salesforce's command palette triggers flows.

**What to add to PRD:**
1. **Quick actions on search results:** Select a contact → sub-menu: "View", "Draft email", "Log call", "Create showing"
2. **Global actions (no record needed):** "Create contact", "Add listing", "New newsletter"
3. **Nested sub-menus:** Record selection → action selection → confirmation. All without leaving the palette.
4. **Passive shortcut learning:** Show keyboard shortcuts next to each action (Superhuman/Linear pattern). Over time, users graduate from palette to direct shortcuts.

**Why this matters:** Cmd+K that only searches is a glorified address bar. The power is in actions.

---

### GAP 21: No Rich Media in Chat Responses

**Severity: MEDIUM | Effort: 2-3 days | Priority: P2**

**What the PRD has:** Chat responses are plain text (markdown at best).

**What best-in-market does:** Drift renders images, buttons, and cards in chat. Intercom Fin shows product cards with images. Slack renders rich blocks (images, tables, buttons).

**What to add to PRD:** When the AI responds about a listing, render a **listing card** inline:
- Property photo thumbnail
- Address, price, beds/baths
- Status badge
- "Open listing" button

When comparing contacts, render a **comparison table**. When suggesting a showing time, render a **calendar card** with one-click confirm.

The existing `lf-card` design system classes should be reused inside the chat panel.

---

### GAP 22: No Confidence/Resolution Limits

**Severity: MEDIUM | Effort: 1-2 days | Priority: P2**

**What the PRD has:** The AI always responds. No concept of "I'm not confident enough to answer this."

**What best-in-market does:** Intercom Fin has configurable resolution limits — stops AI and escalates to human when confidence drops below threshold. Salesforce Agentforce Topics define boundaries for what the AI can/cannot do.

**What to add to PRD:**
1. **Confidence scoring on responses:** If the synthesizer's response relies on low-similarity embeddings (all <0.3), flag with: "I'm not fully confident in this answer. Consider verifying directly."
2. **Topic boundaries:** Define what the AI should NOT answer (legal advice, tax calculations, specific commission negotiations) and return a redirect instead: "That's a question for your broker. Here's their contact info."
3. **Escalation path:** If 2+ "I don't know" responses in a row, suggest: "Would you like me to flag this question for your team lead?"

---

### GAP 23: No Playbooks for Common Real Estate Workflows

**Severity: MEDIUM | Effort: 3-4 days | Priority: P3**

**What the PRD has:** Free-form Q&A only. No guided conversation flows.

**What best-in-market does:** Drift has **Playbooks** — scripted multi-step conversations for common workflows (lead qualification, meeting booking). Intercom has **Procedures** — natural-language workflow definitions.

**What to add to PRD:** Define conversation playbooks for common real estate scenarios:
- **Showing request flow:** "I'd like to schedule a showing" → AI asks for listing, date/time preference, buyer info → creates showing request
- **Listing inquiry flow:** "Tell me about this listing" → AI presents key facts, neighborhood data, CMA summary → offers to schedule showing
- **Follow-up assistant flow:** "Help me follow up after yesterday's showing" → AI pulls showing details, buyer feedback → drafts personalized email

Playbooks would be stored as knowledge articles with a `type: 'playbook'` flag, making them editable by the realtor.

---

### GAP 24: No Communication Summarization on Demand

**Severity: HIGH | Effort: 2-3 days | Priority: P1**

**What the PRD has:** The chat widget can retrieve communications via RAG. But there's no explicit "summarize this contact's entire history" capability.

**What best-in-market does:** Follow Up Boss auto-summarizes calls. HubSpot Breeze generates meeting prep with full contact history. Salesforce Einstein summarizes case history.

**What to add to PRD:** When the user asks "summarize interactions with Sarah" or opens the chat on a contact page, offer a one-click **"Contact Brief"** that:
1. Pulls ALL communications (not just RAG top-k) for that contact
2. Groups by channel (email, SMS, WhatsApp, showing feedback)
3. Produces a chronological narrative: "Sarah first reached out Jan 15 about East Van condos. She viewed 3 properties. She loved 456 Oak Ave but was concerned about the strata fees. Last contact was March 25 — she asked about the price reduction."
4. Highlights action items: "No follow-up since March 25 (5 days ago)"

This is different from RAG search (which returns top-k similar chunks). This is a **full-history synthesis** — every communication, ordered, summarized.

---

### GAP 25: Deterministic vs. AI Speed Not Separated in Cmd+K

**Severity: MEDIUM | Effort: 1 day | Priority: P1**

**What the PRD has:** Cmd+K searches and shows "Ask AI" as a fallback when no results match.

**What best-in-market does:** Linear's Cmd+K responds in **sub-50ms** because it's purely deterministic fuzzy search with no AI dependency. The AI chat widget is separate. Users expect Cmd+K to be instant.

**What the PRD should clarify:**
1. Cmd+K search is **always deterministic** — SQL ILIKE + fuzzy matching, no AI API calls. Results in <100ms.
2. "Ask AI" is a handoff to the chat widget — it opens the widget with the query pre-filled. The user knows they're switching to a slower AI-powered mode.
3. Never mix AI latency into the Cmd+K results. No "AI-enhanced search" in the palette. Keep them separate.

This is already implied in the PRD but never explicitly stated. It needs to be a hard requirement to prevent future scope creep where someone adds AI search to Cmd+K and kills the speed.

---

## FINAL PRIORITY MATRIX (All 22 Active Gaps)

### P0 — Fix before ANY implementation (Legal)

| # | Gap | Why P0 | Effort |
|---|-----|--------|--------|
| **6** | Privacy & Compliance | PIPEDA/FINTRAC legal liability, no data export/delete, no PII detection | 5-7 days |

### P1 — Fix during Phase 1 implementation (Trust + Usability)

| # | Gap | Why P1 | Effort |
|---|-----|--------|--------|
| **2** | Context Freshness | AI gives wrong price/status if embedding stale — trust destroyer | 2-3 days |
| **3** | Conversation Handoff | Context switch causes confusion and potential data leakage | 1-2 days |
| **4** | Degraded Mode | Claude/Voyage outage = complete failure, no fallback | 2-3 days |
| **9** | Empty State / Onboarding | New users bounce on first interaction — onboarding failure | 1-2 days |
| **12** | Cross-Contact Leakage | Contact A's data leaks into Contact B's response via history | 1 day |
| **13** | Streaming UX | 5-15s spinner is unacceptable in 2026 — streaming is table stakes | 2-3 days |
| **15** | Double-Send Race | Server-side deduplication missing | 4 hours |
| **17** | Request Timeouts | Requests hang indefinitely on Claude slowness | 4 hours |
| **20** | Cmd+K Actions | Search-only palette is a glorified address bar — need actions | 3-4 days |
| **24** | Communication Summarization | Full-history synthesis is the #1 use case for contact pages | 2-3 days |
| **25** | Deterministic vs AI Speed | Cmd+K must be instant (<100ms), separated from AI latency | 1 day |

### P2 — Fix during Phase 2-3 (Enhancement)

| # | Gap | Why P2 | Effort |
|---|-----|--------|--------|
| **1** | Session Activity Trail | AI can't infer intent from navigation patterns — differentiator | 3-4 days |
| **5** | Feedback Loop | Thumbs down goes nowhere, AI never improves | 3-4 days |
| **8** | CRM Actions (Tool Use) | AI is read-only, can't schedule/email/advance — all competitors do this | 7-10 days |
| **10** | Search Language | Cmd+K can't parse "showings this week" or "Sarah's listings" | 3-4 days |
| **14** | Accessibility (WCAG 2.1) | Screen reader users can't use chat | 2-3 days |
| **16** | Structured Errors | Frontend can't distinguish error types for proper UX | 1 day |
| **18** | Hierarchical Context | No selection-level or global CRM-level context scoping | 2-3 days |
| **19** | @-Mention References | Can't reference entities other than the current page | 3-4 days |
| **21** | Rich Media in Chat | No listing cards, photos, tables in responses | 2-3 days |
| **22** | Confidence/Resolution Limits | AI always responds even when uncertain — no escalation | 1-2 days |

### P3 — Future enhancement

| # | Gap | Why P3 | Effort |
|---|-----|--------|--------|
| **23** | Playbooks for Workflows | Guided conversation flows for showing requests, follow-ups | 3-4 days |

---

## EFFORT SUMMARY

| Priority | Gap Count | Total Effort |
|----------|-----------|-------------|
| P0 | 1 | 5-7 days |
| P1 | 11 | 17-24 days |
| P2 | 10 | 28-38 days |
| P3 | 1 | 3-4 days |
| **Total** | **22** | **53-73 days** |

**Critical path:** P0 (privacy/compliance) must complete before any implementation. P1 items should be integrated into the PRD's 4-phase plan. P2/P3 items are enhancements for post-launch.

---

## RECOMMENDATIONS FOR PRD v2

1. **Rewrite Phase 1** to include gaps 2, 3, 4, 9, 12, 13, 15, 17 as core requirements (not afterthoughts). These are trust and usability issues that determine whether realtors will use the widget at all.

2. **Add Phase 0** — a pre-implementation sprint for gap 6 (privacy/compliance). This addresses legal exposure in the existing RAG system, regardless of the widget.

3. **Redefine Cmd+K** (Phase 2) to include actions (gap 20), speed separation (gap 25), and communication summarization (gap 24). Search-only Cmd+K is insufficient.

4. **Add a Degraded Mode section** to the Technical Design. Every API call needs a fallback. Define the tiered fallback chain (gap 4) and timeout handling (gap 17) in the architecture diagram.

5. **Add a Privacy & Compliance section** between Technical Design and Implementation Phases. Define retention policies, export/deletion endpoints, and data access logging.

6. **Revise timeline.** Current PRD estimates 20 working days. With P0+P1 gaps integrated, realistic estimate is 30-35 working days for a production-ready implementation.

---

**Bottom line:** The PRD is a solid feature spec that correctly identifies WHAT to build and WHERE to put it. This analysis adds HOW it should behave in real scenarios (context switching, stale data, API outages, empty states), WHAT competitors do that we don't (streaming, actions, summarization, @-mentions), and WHY realtors will trust it (or won't — privacy, freshness, confidence limits). The 22 gaps don't invalidate the PRD — they strengthen it into an implementable plan.
