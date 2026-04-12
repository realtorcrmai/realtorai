<!-- docs-audit: src/lib/rag/*, src/app/(dashboard)/assistant/* -->
# PRD: Unified Agentic RAG — Single AI Agent for Realtors360

> **Version:** 1.0 | **Date:** 2026-04-01
> **Author:** Claude (AI Agent) | **Owner:** Rahul Mittal
> **Status:** DRAFT — Awaiting user review (Large tier, Section 3.1)
> **7-pass process:** Applied to architecture decisions
> **Method:** Pipeline research (15 gaps, 403 lines competitive analysis) + current codebase gap analysis

---

## 1. Problem Statement

Realtors360 has **two separate AI systems** doing overlapping work:

| System | Stack | Data Access | Actions | Interface |
|--------|-------|-------------|---------|-----------|
| RAG Chat | TypeScript (Next.js) | pgvector embeddings (stale) | Read-only | Text chat |
| Voice Agent | Python (aiohttp) | Live Supabase queries (56 tools) | Read + Write | Voice |

**Problems this causes:**
1. **User confusion:** Two floating buttons (chat + voice) — which one to use?
2. **Developer confusion:** Two codebases, two auth systems, two session managers
3. **Data inconsistency:** RAG searches embeddings (may be stale), Voice queries live DB
4. **Duplicate effort:** Both systems build prompts, manage sessions, handle errors — separately
5. **Multi-tenancy gap:** RAG just got tenant isolation; Voice has its own auth
6. **No cross-capability:** RAG can't take actions; Voice can't search embeddings

**Competitor context:** Follow Up Boss, kvCORE, LionDesk all have a **single AI button** that handles both text and voice. We're the only product with two separate systems.

---

## 2. Vision

**One button. One agent. Text and voice. Grounded in CRM data. Can take actions.**

A realtor clicks the AI button → types or speaks → the agent:
- Retrieves relevant CRM data (RAG: embeddings + live queries)
- Takes actions when asked (create task, draft email, schedule showing)
- Responds in text or voice (seamless mode switching)
- Maintains context across the conversation
- Scoped to the realtor's data only (multi-tenant)

---

## 3. Goals & Non-Goals

### Goals
- G1: Single floating button replacing both chat + voice widgets
- G2: Seamless text ↔ voice mode switching within same conversation
- G3: Unified agent with both RAG retrieval AND action tools
- G4: Vercel AI SDK for orchestration (streaming, tool calling, provider-agnostic)
- G5: Multi-tenant using `getAuthenticatedTenantClient()` everywhere
- G6: Page-aware context (usePageContext hook feeds entity info to agent)
- G7: Maintain all 56 voice agent tools in the unified system

### Non-Goals
- NG1: Full Python→TypeScript migration of STT/TTS (keep Python for audio processing)
- NG2: WebRTC real-time calling (defer to Phase 3)
- NG3: Multi-language support (English only for now)
- NG4: Mobile native app (web only)

---

## 4. Architecture Decision

### Decision: Hybrid — TypeScript Orchestrator + Python Audio Service

```
┌─────────────────────────────────────────────────────┐
│                  User Interface                       │
│  ┌──────────────────────────────────────────────┐   │
│  │         Unified Agent Button (1 button)       │   │
│  │    [Text input] [🎤 Voice toggle] [Send]      │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│           TypeScript Orchestrator (Next.js)           │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Vercel AI   │  │ RAG Retriever │  │ CRM Tools  │ │
│  │ SDK         │  │ (pgvector)    │  │ (56 tools) │ │
│  │ streamText()│  │ embeddings    │  │ via Supabase│ │
│  │ tool()      │  │ live queries  │  │ tenant-    │ │
│  │ useChat()   │  │               │  │ scoped     │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│                                                       │
│  Multi-tenant: getAuthenticatedTenantClient()        │
│  Session: unified_agent_sessions table               │
└─────────────────┬───────────────────────────────────┘
                  │ (only when voice mode active)
                  ▼
┌─────────────────────────────────────────────────────┐
│           Python Audio Service (port 8768)            │
│  ┌──────────┐  ┌──────────┐                          │
│  │ Whisper   │  │ Edge TTS │                          │
│  │ STT       │  │          │                          │
│  │ /api/stt  │  │ /api/tts │                          │
│  └──────────┘  └──────────┘                          │
└─────────────────────────────────────────────────────┘
```

### Why Hybrid (not full TypeScript)?

| Factor | Full TS | Hybrid | Full Python |
|--------|---------|--------|-------------|
| Audio latency | ❌ No native Whisper in Node | ✅ Python Whisper is fast | ✅ |
| Tool calling | ✅ Vercel AI SDK | ✅ Vercel AI SDK | ⚠️ Custom |
| RAG integration | ✅ Native | ✅ Native | ❌ Separate |
| Multi-tenant | ✅ Tenant client | ✅ Tenant client | ❌ Own auth |
| Streaming | ✅ Vercel AI SDK | ✅ Vercel AI SDK | ⚠️ Custom SSE |
| Deployment | ✅ Single Vercel | ✅ Vercel + Python svc | ❌ Two services |
| Migration effort | ❌ Rewrite 2656 Python files | ✅ Rewrite agent logic only | ❌ Rewrite 23 TS RAG files |
| Maintenance | ✅ Single language | ⚠️ Two languages | ❌ Two separate systems |

**Hybrid wins:** Keep Python for what it's best at (audio processing), move everything else to TypeScript with Vercel AI SDK.

---

## 5. Data Model

### New Table: `unified_agent_sessions`

```sql
CREATE TABLE unified_agent_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL REFERENCES auth.users(id),
  session_type text NOT NULL DEFAULT 'text', -- 'text', 'voice', 'unified'
  current_mode text NOT NULL DEFAULT 'text', -- 'text', 'voice'
  ui_context jsonb DEFAULT '{}',
  tone_preference text DEFAULT 'professional',
  messages jsonb DEFAULT '[]',
  summary text, -- compressed history when > 20 messages
  tools_used text[] DEFAULT '{}',
  total_tokens_in int DEFAULT 0,
  total_tokens_out int DEFAULT 0,
  total_cost_usd numeric(8,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now()
);

CREATE INDEX idx_uas_realtor ON unified_agent_sessions(realtor_id);
CREATE INDEX idx_uas_activity ON unified_agent_sessions(last_activity_at);
ALTER TABLE unified_agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_rls_uas ON unified_agent_sessions
  FOR ALL USING (realtor_id = auth.uid()::uuid);
```

### New Table: `agent_tool_definitions`

```sql
CREATE TABLE agent_tool_definitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL, -- 'contacts', 'listings', 'calendar', 'email', 'tasks', 'search', 'knowledge'
  input_schema jsonb NOT NULL,
  is_read_only boolean DEFAULT true,
  requires_confirmation boolean DEFAULT false, -- true for write operations
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Migration from existing tables

| Old Table | New Table | Migration |
|-----------|-----------|-----------|
| `rag_sessions` | `unified_agent_sessions` | Copy + add mode fields |
| Voice sessions (Python) | `unified_agent_sessions` | Migrate from Python DB |
| `rag_embeddings` | Keep as-is | Used by RAG retriever |
| `rag_feedback` | Keep as-is | Unified feedback |
| `rag_audit_log` | Keep as-is | Unified audit |

---

## 6. Vercel AI SDK Integration

### Core API: `/api/agent/chat`

```typescript
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages, sessionId, uiContext } = await req.json();
  
  const db = isAdmin ? createAdminClient() : (await getAuthenticatedTenantClient()).raw;
  
  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: buildSystemPrompt(uiContext, realtorProfile),
    messages,
    tools: {
      // RAG Retrieval
      searchKnowledge: tool({
        description: 'Search CRM knowledge base for grounded answers',
        parameters: z.object({
          query: z.string(),
          filters: z.object({
            contact_id: z.string().optional(),
            listing_id: z.string().optional(),
            content_type: z.string().optional(),
          }).optional(),
        }),
        execute: async ({ query, filters }) => {
          return await retrieveContext(db, query, filters, 5);
        },
      }),
      
      // CRM Actions
      searchContacts: tool({
        description: 'Search contacts by name, phone, or email',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const { data } = await db.from('contacts')
            .select('id, name, phone, email, type, stage_bar')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5);
          return data;
        },
      }),
      
      createTask: tool({
        description: 'Create a new task for the realtor',
        parameters: z.object({
          title: z.string(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']),
          due_date: z.string().optional(),
          contact_id: z.string().optional(),
        }),
        execute: async (params) => {
          const { data } = await db.from('tasks').insert(params).select().single();
          return { success: true, task: data };
        },
      }),
      
      // ... 50+ more tools migrated from Python
    },
    maxSteps: 5, // allow multi-step tool use
  });
  
  return result.toDataStreamResponse();
}
```

### Client: Unified Widget

```typescript
'use client';
import { useChat } from '@ai-sdk/react';
import { usePageContext } from '@/hooks/usePageContext';

export function UnifiedAgentWidget() {
  const pageContext = usePageContext();
  const [voiceMode, setVoiceMode] = useState(false);
  
  const { messages, input, handleSubmit, setInput, isLoading } = useChat({
    api: '/api/agent/chat',
    body: { uiContext: pageContext },
  });
  
  // Voice mode: Whisper STT → input → send → TTS response
  // Text mode: Type → send → display response
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Single button — expands to chat panel */}
      {/* Toggle between text and voice mode */}
      {/* Streaming responses via useChat() */}
    </div>
  );
}
```

---

## 7. Tool Migration Plan

### Phase 1: Core tools (20 tools, Week 1-2)

| Category | Tools | Priority |
|----------|-------|----------|
| Contacts | searchContacts, getContact, updateContactNotes | Must-have |
| Listings | searchListings, getListing, getListingStatus | Must-have |
| Calendar | checkAvailability, getUpcomingEvents | Must-have |
| Tasks | createTask, getTasks, completeTask | Must-have |
| Search | searchKnowledge (RAG), instantSearch | Must-have |
| Email | draftEmail, getEmailHistory | Must-have |

### Phase 2: Extended tools (20 tools, Week 3)

| Category | Tools |
|----------|-------|
| Showings | createShowingRequest, getShowings, confirmShowing |
| Workflows | getWorkflowStatus, advancePhase |
| Newsletter | getNewsletterDrafts, approveNewsletter |
| Deals | getDealStatus, updateDealStage |
| Reports | getContactStats, getListingStats |

### Phase 3: Advanced tools (16 tools, Week 4)

| Category | Tools |
|----------|-------|
| Forms | generateForm, getFormStatus |
| Enrichment | triggerEnrichment, getEnrichmentData |
| Import | importListing |
| Voice-specific | setReminder, startTimer, readNotifications |

---

## 8. Voice Integration

### Text Mode (default)
```
User types → /api/agent/chat → Vercel AI SDK → streamed response → display
```

### Voice Mode (toggle)
```
User speaks → Python /api/stt (Whisper) → text → /api/agent/chat → response text → Python /api/tts (Edge TTS) → audio playback
```

### Mode Switching
- User clicks 🎤 → voice mode activates
- Conversation context preserved (same session)
- Voice responses auto-play via TTS
- User can switch back to text anytime
- Voice mode shows transcript of what was said/heard

### Latency Budget (voice mode)
| Step | Target | Method |
|------|--------|--------|
| STT | <1s | Whisper on Python server |
| Agent thinking | <2s | Sonnet with streaming |
| Tool execution | <1s | Supabase direct query |
| TTS | <1s | Edge TTS with caching |
| **Total** | **<5s** | Acceptable for conversational UX |

---

## 9. Multi-Tenancy

**Every database operation uses `getAuthenticatedTenantClient()`:**

```typescript
// In /api/agent/chat route:
const session = await auth();
const isAdmin = session.user.role === 'admin';
const db = isAdmin ? createAdminClient() : (await getAuthenticatedTenantClient()).raw;

// Pass db to all tool executions
// All queries automatically scoped by realtor_id
```

**Voice service (Python) auth:**
- Python STT/TTS are stateless — they process audio, not CRM data
- Auth header forwarded from Next.js to Python for request validation
- No direct DB access from Python (all CRM queries go through TypeScript tools)

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1) — Must-have
- [ ] Install Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`)
- [ ] Create `unified_agent_sessions` migration
- [ ] Create `/api/agent/chat` route with Vercel AI SDK `streamText()`
- [ ] Implement 10 core tools (contacts, listings, tasks, search, calendar)
- [ ] Create `UnifiedAgentWidget` component with `useChat()` hook
- [ ] Replace ChatWidget + VoiceAgentWidget with single UnifiedAgentWidget in layout
- [ ] Multi-tenant: all tools use `db` param

### Phase 2: Voice + RAG (Week 2) — Must-have
- [ ] Voice mode toggle (STT via Python, TTS via Python)
- [ ] RAG retrieval as a tool (`searchKnowledge`)
- [ ] Page context injection (`usePageContext`)
- [ ] Session persistence (save/load from `unified_agent_sessions`)
- [ ] Migrate 10 more tools

### Phase 3: Full Migration (Week 3-4) — Should-have
- [ ] Migrate remaining 36 tools from Python
- [ ] Guardrails (tax/legal/financial blocks)
- [ ] Feedback system (thumbs up/down)
- [ ] Audit logging (every query)
- [ ] Cost tracking (tokens per message)
- [ ] Remove old ChatWidget + VoiceAgentWidget
- [ ] Update all references

### Phase 4: Polish (Week 5) — Could-have
- [ ] Mobile responsive bottom sheet
- [ ] Suggested action pills per page
- [ ] Cmd+K integration (Ask AI fallback)
- [ ] Knowledge Base management UI
- [ ] Performance optimization (tool result caching)

---

## 11. Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|---------------|
| User-facing buttons | 2 | **1** | Visual count |
| Agent codebases | 2 (TS + Python) | **1 orchestrator + 1 audio service** | File count |
| Auth systems | 2 | **1** (tenant client) | Code audit |
| Data access patterns | 2 (admin client + voice auth) | **1** (tenant client) | grep |
| Average response latency (text) | 3-5s | **<3s** | Audit log |
| Average response latency (voice) | 5-10s | **<5s** | Audit log |
| Tools available to agent | 56 (voice only) | **56+** (both modes) | Tool count |
| RAG + action in same turn | Not possible | **Yes** | Test scenario |

---

## 12. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vercel AI SDK doesn't support our use case | HIGH | Prototype in Phase 1 before full migration; fallback to custom pipeline |
| Voice latency increases | MEDIUM | Keep Python STT/TTS (already fast); optimize agent to respond quickly |
| Tool migration breaks existing functionality | MEDIUM | Migrate incrementally; keep old system running in parallel until Phase 3 |
| Multi-tenant bugs in tools | HIGH | Every tool must use `db` param; automated cross-tenant test |
| Cost increase from more capable agent | LOW | Token budget per session; model routing (Haiku for simple, Sonnet for complex) |

---

## 13. Dependencies

| Dependency | Required For | Status |
|------------|-------------|--------|
| Vercel AI SDK | Agent orchestration | `npm install ai @ai-sdk/anthropic @ai-sdk/react` |
| Python STT/TTS server | Voice mode | Already running at :8768 |
| pgvector + embeddings | RAG retrieval | Already implemented |
| Tenant client | Multi-tenancy | Already implemented (Sprint 1) |
| `usePageContext` hook | Context awareness | Already created (Sprint 2) |

---

## 14. Open Questions

1. **Token budget per session:** What's the maximum cost per conversation? ($0.50? $1.00?)
2. **Tool confirmation UX:** Should write operations (create task, send email) require explicit user confirmation, or propose-then-confirm pattern?
3. **Parallel system duration:** How long do we keep the old Chat + Voice systems running alongside the new unified system?
4. **Offline mode:** Should the agent work (limited) when Python audio service is down?

---

## 15. Appendix: Vercel AI SDK Quick Reference

```typescript
// Streaming text with tools
const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: '...',
  messages: [...],
  tools: { ... },
  maxSteps: 5,
});

// Client hook
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/agent/chat',
  body: { sessionId, uiContext },
});

// Tool definition
const myTool = tool({
  description: 'What this tool does',
  parameters: z.object({ ... }),
  execute: async (params) => { ... },
});
```

---

*PRD v1.0 — 2026-04-01. Unified Agentic RAG for Realtors360. Awaiting user review.*
