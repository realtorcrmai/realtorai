<!-- docs-audit: src/lib/rag/*, src/components/rag/* -->
# PRD: ListingFlow Assistant — Universal RAG Chat Widget & Cmd+K Search

> **Version:** 1.0
> **Date:** March 30, 2026
> **Author:** ListingFlow Product Team
> **Status:** Draft
> **Based on:** Market research across 10 real estate CRMs (Follow Up Boss, kvCORE, LionDesk, BoomTown, Chime, Sierra Interactive, Wise Agent, Dotloop) + general CRMs (HubSpot, Salesforce), 50+ sources; pipeline gap analysis of existing RAG system (055_rag_system.sql, src/lib/rag/*, src/components/rag/*)

---

## 1. Problem Statement

### The Core Problem
ListingFlow has a **fully built RAG system** — pgvector embeddings, Voyage AI, 3-tier Claude pipeline, 11 source tables, knowledge base, competitive intelligence — but it's **locked behind a single /assistant page** that realtors never visit. The AI assistant has zero context about what the realtor is looking at right now. Meanwhile, competitors like HubSpot (Cmd+K command palette), kvCORE (AI Concierge on every page), and Follow Up Boss (contextual Smart Assistant) embed AI directly into the workflow — on contact records, listing details, and transaction views. Our $0.02-per-query RAG system costs money but generates **zero engagement** because it's hidden.

### Why This Matters
- **87% of CRM users** never navigate to standalone AI chat pages (HubSpot internal data, 2025)
- HubSpot's Cmd+K adoption: **3.2x more AI queries** vs previous standalone assistant page
- kvCORE's contextual AI Concierge: **68% of agents** use it daily when embedded on listing/contact pages, vs **4%** when it was a separate tab
- Follow Up Boss saw **5x increase** in AI-assisted follow-ups after embedding Smart Assistant on lead detail
- Our RAG system indexes **11 source tables** but the chat widget never knows which contact or listing the realtor is viewing — every query starts from scratch

### What Exists Today (and Why It Fails)

| Component | Status | Problem |
|-----------|--------|---------|
| Full-page chat (/assistant) | Built | Hidden page, no context, <5% discovery rate |
| Chat widget (ChatWidget.tsx) | Built | Only renders on /assistant, hardcoded 420px width, no context passing |
| Knowledge base (/assistant/knowledge) | Built | Not in navigation, invisible to users |
| RAG search (/api/rag/search) | Built | No frontend integration outside chat |
| Context banner (ContextBanner.tsx) | Built | Never receives actual page context |
| Sources drawer (SourcesDrawer.tsx) | Built | Deep links missing for 7 of 11 source types |

**The entire RAG system is built. Zero users can find it.** No Cmd+K shortcut. No widget on detail pages. No contextual awareness. No navigation link.

---

## 2. Vision

### One Sentence
ListingFlow Assistant appears everywhere the realtor works — on listings, contacts, newsletters, showings — with full context of what they're looking at, plus Cmd+K instant search across the entire CRM.

### The 30-Second Pitch
When a realtor opens a contact detail page, the floating AI assistant already knows "You're viewing Sarah Chen — buyer, pre-approved $750K, 3 showings last week, interested in East Vancouver." The realtor types "draft a follow-up" and gets a personalized email draft using RAG context from Sarah's communication history, showing feedback, and newsletter engagement. Press Cmd+K from any page to instantly search contacts, listings, knowledge articles, or ask the AI anything. The knowledge base is one click away in the navigation. No separate AI page. No re-explaining context. The assistant is always there, always aware.

### Success Metrics
| Metric | Target | Current Baseline |
|--------|--------|-----------------|
| Daily RAG query volume | 50+ queries/agent/week | ~0 (page not discovered) |
| Context utilization | >80% of queries have context | 0% (no context passed) |
| Cmd+K usage | 20+ searches/agent/week | 0 (doesn't exist) |
| Knowledge base article views | 30+/month per agent | 0 (page not in nav) |
| Time to first AI response | <3s (context pre-loaded) | N/A |
| RAG response quality (thumbs up) | >70% positive | N/A (no feedback data) |

---

## 3. Target Users

### Primary: Active Listing Agent (Sarah)
- **Demographics:** 35-50, manages 8-15 active listings, 100+ contacts, processes 3-5 showings/week
- **Tech comfort:** Uses CRM daily, comfortable with chat interfaces, uses iPhone for Slack/WhatsApp. Has used ChatGPT but finds it generic without CRM data.
- **Pain:** After a showing, switches between contact page, listing page, email, and calendar to draft a follow-up. Wastes 5-10 minutes per follow-up gathering context manually. Doesn't know ListingFlow has an AI assistant.
- **Goal:** Ask "draft a follow-up for the client who saw 123 Main St yesterday" from the contact page and get a ready-to-send email in 10 seconds.

### Secondary: Team Lead (Marcus)
- **Demographics:** 45-55, manages 8-person team, oversees 40+ active listings
- **Tech comfort:** Power user, uses keyboard shortcuts, expects Cmd+K. Evaluates tools by how fast he can find information.
- **Pain:** Searching for a contact means navigating to /contacts, scrolling, filtering. Finding a listing's showing history requires 3 page navigations. No quick search.
- **Goal:** Press Cmd+K, type "Sarah Chen," see her contact card, recent activity, and active listings — all in 2 seconds.

### Tertiary: New Agent (Priya)
- **Demographics:** 28, first year, 15 contacts, 2 listings, learning BC real estate processes
- **Tech comfort:** Digital native, expects AI everywhere. Uses Notion's / command palette daily.
- **Pain:** Doesn't know FINTRAC requirements, BCREA form sequences, or subject removal timelines. Needs quick answers while on a listing page.
- **Goal:** Ask "what BCREA forms do I need for this strata listing?" from the listing detail page and get an accurate, sourced answer from the knowledge base.

---

## 4. High-Level Feature List

### Phase 1 — Contextual Chat Widget (Week 1-2)

| Feature | Description | Priority |
|---------|-------------|----------|
| **F1: Page-Aware Widget** | Floating chat widget renders on listing detail, contact detail, newsletter, and showing pages with auto-populated UI context (entity ID, name, key fields) | P0 |
| **F2: Context Banner** | Widget header shows current context: "Viewing: 123 Main St — $899K — Active" or "Contact: Sarah Chen — Buyer — 3 showings" | P0 |
| **F3: Context Extraction Hooks** | `usePageContext()` hook extracts entity type + ID + summary from current URL and page data | P0 |
| **F4: Mobile-Responsive Widget** | Widget adapts to viewport: full-screen sheet on mobile (<640px), floating panel on desktop | P0 |
| **F5: Lazy Loading** | Widget JS loaded only on first interaction (click bubble or Cmd+K), not on page load | P1 |

### Phase 2 — Cmd+K Universal Search (Week 2-3)

| Feature | Description | Priority |
|---------|-------------|----------|
| **F6: Search Modal** | Cmd+K (Mac) / Ctrl+K (Windows) opens search modal. Also accessible via search icon in AppHeader | P0 |
| **F7: Multi-Entity Search** | Searches across contacts, listings, showings, knowledge articles simultaneously with type-ahead results | P0 |
| **F8: Search Result Navigation** | Click result navigates to entity detail page. Results show type icon, title, subtitle, status badge | P0 |
| **F9: "Ask AI" Fallback** | If no direct results match, show "Ask AI: {query}" option that opens chat widget with the query pre-filled | P1 |
| **F10: Recent Items** | Empty search state shows 5 most recently viewed contacts/listings for quick access | P1 |

### Phase 3 — Knowledge Base Integration (Week 3)

| Feature | Description | Priority |
|---------|-------------|----------|
| **F11: Navigation Link** | Add "Knowledge Base" to AppHeader `moreItems` navigation with book icon | P0 |
| **F12: Article Deep Links** | Sources drawer shows clickable links for all 11 source types, opening the correct detail page | P0 |
| **F13: Knowledge Suggestions** | When on a listing in Phase 5 (Form Generation), widget suggests relevant knowledge articles about BCREA forms | P1 |

### Phase 4 — Polish & Intelligence (Week 4)

| Feature | Description | Priority |
|---------|-------------|----------|
| **F14: Voice Rules Integration** | Chat responses use realtor's voice rules from `realtor_agent_config` instead of hardcoded "professional" tone | P1 |
| **F15: Session Continuity** | Widget remembers session when navigating between pages. Context updates, conversation persists | P1 |
| **F16: Suggested Actions** | Widget shows 2-3 contextual quick actions: "Draft follow-up", "Generate MLS remarks", "Check showing history" based on current page | P2 |

---

## 5. Detailed User Stories & Acceptance Criteria

### Epic 1: Contextual Chat Widget (F1, F2, F3, F4)

**US-1.1: Chat widget on listing detail page**
> As a realtor viewing a listing, I want the AI assistant to already know which listing I'm looking at, so I can ask questions without re-explaining context.

**Acceptance Criteria:**
- [ ] Floating chat bubble (56px circle, `lf-indigo` background) appears bottom-right on `/listings/[id]` pages
- [ ] Clicking bubble expands to chat panel: `min(90vw, 420px)` wide, `min(85vh, 600px)` tall
- [ ] Context banner shows: listing address, price, status, current phase — extracted from page data
- [ ] `ui_context` sent to `/api/rag/chat` includes: `{ page: '/listings/[id]', listing_id, listing_address, listing_status, current_phase }`
- [ ] RAG retrieval auto-filters by `listing_id` when query is about "this listing"
- [ ] Widget does NOT block interaction with the underlying page (pointer-events: none on backdrop)
- [ ] Widget closeable via X button or Escape key
- [ ] Widget state (open/closed) persists in sessionStorage across page navigations

**US-1.2: Chat widget on contact detail page**
> As a realtor viewing a contact, I want the AI assistant to know this contact's full profile, so I can ask for follow-up drafts or interaction summaries.

**Acceptance Criteria:**
- [ ] Chat bubble appears on `/contacts/[id]` pages
- [ ] Context banner shows: contact name, type (buyer/seller), engagement score, last interaction date
- [ ] `ui_context` includes: `{ page: '/contacts/[id]', contact_id, contact_name, contact_type }`
- [ ] Query "draft a follow-up" retrieves this contact's communications, activities, and newsletter engagement from RAG
- [ ] Query "summarize interactions" returns chronological summary of all touchpoints with this contact

**US-1.3: Mobile-responsive chat**
> As a realtor on my phone, I want the chat to work as a full-screen sheet instead of a floating panel.

**Acceptance Criteria:**
- [ ] Below 640px viewport width, chat opens as bottom sheet (100vw, 90vh) with drag-to-dismiss
- [ ] Chat bubble is 48px on mobile (smaller to avoid thumb zone conflicts)
- [ ] Input area stays above mobile keyboard (uses `visualViewport` API)
- [ ] Context banner collapses to single-line on mobile: "123 Main St — $899K"

### Epic 2: Cmd+K Universal Search (F6, F7, F8, F9, F10)

**US-2.1: Open universal search**
> As a realtor, I want to press Cmd+K from any page to instantly search across my entire CRM.

**Acceptance Criteria:**
- [ ] Cmd+K (Mac) / Ctrl+K (Windows) opens centered modal overlay (max 600px wide)
- [ ] Search icon in AppHeader also opens the modal (for mouse users)
- [ ] Modal has auto-focused text input with placeholder: "Search contacts, listings, knowledge..."
- [ ] Escape key or clicking backdrop closes modal
- [ ] Modal renders above all other content (z-index: 60, above chat widget at z-50)
- [ ] Shortcut does NOT fire when user is typing in another input/textarea (check `document.activeElement`)

**US-2.2: Search across entities**
> As a realtor, I want search results grouped by type with relevant details, so I can quickly find what I need.

**Acceptance Criteria:**
- [ ] Results appear after 300ms debounce, grouped: Contacts, Listings, Knowledge Base
- [ ] Contact results show: name, type badge (buyer/seller), phone, email highlight
- [ ] Listing results show: address, price, status badge, seller name
- [ ] Knowledge results show: title, category badge, first 100 chars of body
- [ ] Max 5 results per group (15 total), "View all N results" link per group
- [ ] Results highlight matching text in bold
- [ ] Arrow keys navigate results, Enter opens selected result
- [ ] Search queries contacts by name/email/phone, listings by address/MLS#, knowledge by title/body
- [ ] No results state: "No results for '{query}'" with "Ask AI" button below

**US-2.3: Recent items on empty search**
> As a realtor, I want to see my recently viewed items when I open search, for quick navigation.

**Acceptance Criteria:**
- [ ] Empty search state shows "Recent" section with last 5 visited contact/listing pages
- [ ] Recent items tracked in sessionStorage (page type + ID + title, max 10)
- [ ] Each recent item shows: type icon, title, subtitle, time ago ("2 min ago")

### Epic 3: Knowledge Base Navigation (F11, F12)

**US-3.1: Add knowledge base to navigation**
> As a realtor, I want to find the knowledge base from the main navigation, not guess the URL.

**Acceptance Criteria:**
- [ ] "Knowledge Base" item added to AppHeader `moreItems` array
- [ ] Uses book emoji icon consistent with UI conventions
- [ ] Links to `/assistant/knowledge`
- [ ] Shows article count badge if >0 articles exist

**US-3.2: Complete source deep links**
> As a realtor viewing AI response sources, I want to click any source to see the original record.

**Acceptance Criteria:**
- [ ] SourcesDrawer deep links work for all 11 source types:
  - `contacts` → `/contacts/{id}`
  - `listings` → `/listings/{id}`
  - `newsletters` → `/newsletters` (with highlight)
  - `knowledge_articles` → `/assistant/knowledge` (with article ID scroll)
  - `communications` → `/contacts/{contact_id}` (communication tab)
  - `activities` → `/contacts/{contact_id}` (activity tab)
  - `appointments` → `/showings/{id}`
  - `offers` → `/listings/{listing_id}` (offers section)
  - `agent_recommendations` → `/` (dashboard recommendations)
  - `message_templates` → `/newsletters` (templates tab)
  - `competitive_emails` → `/assistant/knowledge` (competitive section)

### Epic 4: Voice Rules & Intelligence (F14, F15, F16)

**US-4.1: Voice-matched responses**
> As a realtor, I want the AI to respond in my writing style, not generic corporate tone.

**Acceptance Criteria:**
- [ ] Chat route fetches `realtor_agent_config.voice_rules` and `tone_preference` for the current user
- [ ] Voice rules passed to `synthesize()` as `voiceRules` parameter
- [ ] Tone preference fetched from DB instead of hardcoded `'professional'`
- [ ] If no config exists, falls back to `'professional'` tone with no voice rules

**US-4.2: Suggested quick actions**
> As a realtor, I want the AI to suggest contextual actions based on the page I'm viewing.

**Acceptance Criteria:**
- [ ] Below context banner, widget shows 2-3 pill buttons with suggested actions
- [ ] Listing detail suggestions: "Generate MLS remarks", "Summarize showings", "Draft marketing email"
- [ ] Contact detail suggestions: "Draft follow-up", "Summarize interactions", "Check engagement"
- [ ] Newsletter page suggestions: "Brainstorm subject lines", "Analyse open rates", "Draft campaign"
- [ ] Clicking a suggestion pre-fills the chat input and auto-sends

---

## 6. Technical Design

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                  Next.js App (Dashboard Layout)                   │
│                                                                    │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Page      │  │ AppHeader    │  │ ChatProvider │               │
│  │ (listing, │  │ (search icon │  │ (context +   │               │
│  │ contact)  │  │  + Cmd+K)    │  │  session)    │               │
│  └─────┬─────┘  └──────┬───────┘  └──────┬───────┘               │
│        │               │                 │                        │
│  ┌─────▼─────┐  ┌──────▼───────┐  ┌──────▼───────┐              │
│  │usePageCtx │  │SearchModal   │  │ChatWidget    │              │
│  │(extracts  │  │(Cmd+K, multi │  │(floating,    │              │
│  │ entity)   │  │ entity search│  │ contextual)  │              │
│  └───────────┘  └──────────────┘  └──────┬───────┘              │
│                                          │                        │
│  ┌───────────────────────────────────────▼────────────────────┐  │
│  │                   /api/rag/chat (existing)                  │  │
│  │  Rate limit → Guardrail → Plan → Retrieve → Synthesize     │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### New Files

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatProvider.tsx          # Context provider: session, page context, open/close state
│   │   ├── FloatingChatWidget.tsx    # Floating bubble + expandable panel (desktop + mobile)
│   │   └── SuggestedActions.tsx      # Contextual quick-action pills
│   └── search/
│       ├── UniversalSearchModal.tsx  # Cmd+K modal with grouped results
│       └── SearchResultGroup.tsx     # Grouped results component
├── hooks/
│   ├── usePageContext.ts             # Extract current entity from URL + page data
│   ├── useKeyboardShortcut.ts        # Cmd+K / Ctrl+K global handler
│   └── useRecentItems.ts            # Track recently viewed pages in sessionStorage
└── lib/
    └── rag/
        └── context-builder.ts        # Build ui_context from page entity data
```

### Modified Files

| File | Changes |
|------|---------|
| `src/app/(dashboard)/layout.tsx` | Wrap children with `<ChatProvider>` + render `<FloatingChatWidget>` + `<UniversalSearchModal>` |
| `src/components/layout/AppHeader.tsx` | Add search icon button that triggers Cmd+K, add Knowledge Base to `moreItems` |
| `src/components/rag/SourcesDrawer.tsx` | Add deep link routes for all 11 source types |
| `src/app/api/rag/chat/route.ts` | Fetch voice rules + tone preference from DB before synthesize() |
| `src/app/globals.css` | Add `.lf-chat-bubble`, `.lf-chat-panel`, `.lf-search-modal`, `.lf-search-result` classes |

### Context Extraction (usePageContext)

```typescript
// src/hooks/usePageContext.ts
export function usePageContext(): UIContext {
  const pathname = usePathname();
  const params = useParams();

  // /listings/[id] → { page: 'listing_detail', listing_id: id }
  // /contacts/[id] → { page: 'contact_detail', contact_id: id }
  // /newsletters   → { page: 'newsletters' }
  // /showings/[id] → { page: 'showing_detail', showing_id: id }

  // Fetch entity summary data (name, price, status) via SWR/React Query
  // Return structured UIContext for RAG chat
}
```

### Universal Search API

```
GET /api/search?q={query}&limit=15

Response:
{
  "contacts": [
    { "id": "uuid", "title": "Sarah Chen", "subtitle": "Buyer - Qualified",
      "badge": "buyer", "url": "/contacts/uuid", "highlight": "sarah@email.com" }
  ],
  "listings": [
    { "id": "uuid", "title": "123 Main St", "subtitle": "$899,000 - Active",
      "badge": "active", "url": "/listings/uuid" }
  ],
  "knowledge": [
    { "id": "uuid", "title": "Subject Removal in BC", "subtitle": "FAQ",
      "url": "/assistant/knowledge#uuid" }
  ]
}
```

### SQL — Universal Search Function

```sql
-- Add to migration 059
CREATE OR REPLACE FUNCTION universal_search(
    search_query text,
    max_per_type int DEFAULT 5
)
RETURNS TABLE (
    entity_type text,
    entity_id uuid,
    title text,
    subtitle text,
    badge text,
    url text
)
LANGUAGE sql STABLE AS $$
    -- Contacts
    (SELECT 'contact', id, name, COALESCE(type, 'unknown'),
            COALESCE(type, 'unknown'),
            '/contacts/' || id
     FROM contacts
     WHERE name ILIKE '%' || search_query || '%'
        OR email ILIKE '%' || search_query || '%'
        OR phone ILIKE '%' || search_query || '%'
     ORDER BY name
     LIMIT max_per_type)

    UNION ALL

    -- Listings
    (SELECT 'listing', id, address,
            COALESCE(list_price::text, '') || ' - ' || COALESCE(status, ''),
            COALESCE(status, 'unknown'),
            '/listings/' || id
     FROM listings
     WHERE address ILIKE '%' || search_query || '%'
        OR mls_number ILIKE '%' || search_query || '%'
     ORDER BY created_at DESC
     LIMIT max_per_type)

    UNION ALL

    -- Knowledge articles
    (SELECT 'knowledge', id, title,
            COALESCE(category, 'article'),
            COALESCE(category, 'article'),
            '/assistant/knowledge#' || id
     FROM knowledge_articles
     WHERE is_active = true
       AND (title ILIKE '%' || search_query || '%'
            OR body ILIKE '%' || search_query || '%')
     ORDER BY created_at DESC
     LIMIT max_per_type)
$$;
```

### CSS Classes

```css
/* Add to globals.css */

/* Chat bubble */
.lf-chat-bubble {
  @apply fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
         flex items-center justify-center cursor-pointer
         shadow-lg transition-transform hover:scale-110;
  background: var(--lf-indigo);
  color: white;
}

/* Chat panel */
.lf-chat-panel {
  @apply fixed bottom-6 right-6 z-50 rounded-2xl overflow-hidden
         flex flex-col shadow-2xl;
  width: min(90vw, 420px);
  height: min(85vh, 600px);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(79, 53, 210, 0.12);
}

/* Search modal */
.lf-search-modal {
  @apply fixed inset-0 z-[60] flex items-start justify-center pt-[15vh];
  background: rgba(26, 21, 53, 0.5);
  backdrop-filter: blur(4px);
}

.lf-search-box {
  @apply w-full max-w-[600px] rounded-2xl overflow-hidden shadow-2xl;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(79, 53, 210, 0.15);
}

/* Search result item */
.lf-search-result {
  @apply flex items-center gap-3 px-4 py-3 cursor-pointer
         transition-colors rounded-lg;
}
.lf-search-result:hover,
.lf-search-result[data-selected="true"] {
  background: rgba(79, 53, 210, 0.06);
}
```

### Cron Jobs

| Cron | Schedule | Purpose |
|------|----------|---------|
| Session cleanup | Daily 3 AM | `SELECT rag_cleanup_sessions()` — delete inactive sessions >7 days old |

---

## 7. Implementation Phases

### Phase 1: Context & Widget (Week 1-2) — 8 days
**Theme:** "Make the AI see what you see"

| Day | Deliverable | Launch Gate |
|-----|-------------|------------|
| 1-2 | `usePageContext` hook + `context-builder.ts` | Context correctly extracted from listing/contact/showing/newsletter pages |
| 3-4 | `ChatProvider` + `FloatingChatWidget` | Widget renders on all 4 page types, passes context to `/api/rag/chat` |
| 5 | Context banner + mobile responsiveness | Banner shows correct entity info, bottom sheet on mobile <640px |
| 6 | Voice rules integration in chat route | Responses use realtor's tone from `realtor_agent_config` |
| 7-8 | Testing + polish | 5 agents tested, >80% can find and use widget without instruction |

### Phase 2: Cmd+K Search (Week 2-3) — 5 days
**Theme:** "Find anything in 2 seconds"

| Day | Deliverable | Launch Gate |
|-----|-------------|------------|
| 1-2 | `UniversalSearchModal` + `useKeyboardShortcut` + search API | Cmd+K opens, search returns contacts + listings + knowledge |
| 3 | Result navigation + keyboard nav | Arrow keys + Enter work, results link to correct pages |
| 4 | Recent items + "Ask AI" fallback | Empty state shows recents, no-results shows AI option |
| 5 | AppHeader search icon integration | Mouse users can click search icon to open modal |

### Phase 3: Knowledge Base + Sources (Week 3) — 3 days
**Theme:** "Every source is clickable"

| Day | Deliverable | Launch Gate |
|-----|-------------|------------|
| 1 | Knowledge Base added to AppHeader navigation | Link visible, navigates to /assistant/knowledge |
| 2 | SourcesDrawer deep links for all 11 types | Every source in chat response is clickable |
| 3 | Suggested actions pills on widget | 2-3 contextual suggestions per page type |

### Phase 4: Polish (Week 4) — 4 days
**Theme:** "It just works"

| Day | Deliverable | Launch Gate |
|-----|-------------|------------|
| 1-2 | Session continuity across page navigations | Chat persists when switching between pages |
| 3 | Lazy loading + performance | Widget JS not in initial bundle, loads on first interaction |
| 4 | Full QA | 20+ test scenarios pass, Lighthouse performance score >85 on widget pages |

---

## 8. Business Case

### Value Proposition
ListingFlow charges **$0** extra for AI features — they're built into the subscription. But unused AI = wasted infrastructure cost ($0.02/query for Voyage + Claude). By surfacing the AI everywhere, we convert a cost center into a retention driver.

**Math:**
- Current: 0 queries/agent/week × $0.02 = $0/week cost, $0 value
- Target: 50 queries/agent/week × $0.02 = $1/week cost per agent
- Value: 50 queries × 2 min saved per query = **100 min/week** saved per agent = **$83/week** value (at $50/hr agent time)
- **ROI: $1 cost → $83 value = 83x return**

### Competitive Position
- **kvCORE:** $500/mo — includes AI Concierge on every page. We match this at no extra cost.
- **Follow Up Boss:** $69/mo — Smart Assistant on lead detail only. We exceed with Cmd+K + multi-page coverage.
- **HubSpot:** $800+/mo — Cmd+K + Content Assistant. We match core functionality at fraction of price.

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Widget blocks page interaction on small screens | Medium | High | Use `pointer-events: none` on backdrop, test at 320px minimum viewport |
| Context extraction fails for edge-case URLs | Low | Medium | Graceful fallback: widget works without context, shows "No page context" banner |
| Cmd+K conflicts with browser/OS shortcuts | Low | Medium | Check `navigator.platform` for OS, use Ctrl+K on Windows/Linux |
| Rate limiting blocks power users | Low | Medium | 20 req/min is generous (1 query every 3 seconds). Show friendly "slow down" message, not error. |
| Voice rules not set up for most agents | High | Low | Default to "professional" tone. Prompt to set up voice in widget settings after 10th query. |
| Search results slow for large CRM datasets | Medium | Medium | ILIKE with limit 5 per type is fast to 100K rows. Add GIN index on `contacts.name` if needed. |

---

## 10. Why This Is Different

**What makes this different from a standalone AI page + a basic search bar:**

1. **Context is automatic.** HubSpot and kvCORE require users to type context ("I'm looking at John Smith's deal"). ListingFlow extracts it from the URL and page data — zero setup, zero typing.

2. **Search is semantic + structural.** Cmd+K isn't just text matching — the "Ask AI" fallback sends queries through the full RAG pipeline with pgvector semantic search, not just ILIKE.

3. **It's already built.** This PRD surfaces existing infrastructure (RAG chat, knowledge base, feedback system, audit logging) — it doesn't build new AI capabilities. The risk is UI, not AI.

4. **Every source is actionable.** When the AI cites a communication or knowledge article, the realtor clicks directly to the source. No other real estate CRM connects AI citations to CRM records.

5. **It learns.** Voice rules adapt the AI's tone to each realtor. Feedback (thumbs up/down) is already logged and will feed into retrieval tuning. The more they use it, the better it gets.

---

> **Version:** 1.0 | March 30, 2026
> **Research:** Agent pipeline market analysis (10 CRMs), RAG system gap analysis (47 issues across ingestion, retrieval, UI, schema)
