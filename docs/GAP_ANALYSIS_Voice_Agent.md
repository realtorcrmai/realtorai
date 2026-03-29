# Gap Analysis: Voice Agent System

> **Date:** 2026-03-29
> **Scope:** Backend (`voice_agent/server/`), Frontend (`src/components/voice-agent/`), API Routes (`src/app/api/voice-agent/`)
> **Method:** 3-pass iterative analysis (Pass 1: parallel deep-dive → Pass 2: verification + best practices → Pass 3: consolidation)
> **Total Issues:** 60 (6 Critical, 14 High, 21 Medium, 12 Low, 7 Architecture Notes)

---

## Executive Summary

The voice agent is a functional prototype with strong foundational design (session focus tracking, dynamic tool selection, context summarization, cost tracking). However, it has **6 critical issues** that would cause crashes or security breaches in any deployment beyond localhost, **14 high-priority bugs** affecting core functionality, and significant gaps in deployment readiness (no tests, no dependency management, no Dockerfile, no structured logging).

---

## CRITICAL — Fix Immediately (6)

### C1. Hardcoded bearer token in client-side JavaScript
- **File:** `src/components/voice-agent/VoiceAgentWidget.tsx:29`
- **Code:** `Authorization: "Bearer va-bridge-secret-key-2026"`
- **Also:** `src/components/voice-agent/VoiceAgentPanel.tsx:307` (same token)
- **Impact:** Token is visible in browser DevTools, JS bundle, and network requests. Anyone can extract it and call the voice agent API directly, getting full admin-level CRM access (routes use `supabaseAdmin` bypassing RLS).
- **Fix:** Move to `NEXT_PUBLIC_VOICE_AGENT_KEY` env var, or use NextAuth session tokens instead of a static bearer token.

### C2. `api.delete()` method doesn't exist — 3 tools crash at runtime
- **File:** `voice_agent/server/api_client.py` — only has `get()`, `post()`, `patch()`
- **Crashes:** `realtor_tools.py:1204` (`delete_contact`), `:1228` (`delete_listing`), `:1267` (`delete_task`)
- **Impact:** `AttributeError` thrown when user asks to delete any contact, listing, or task.
- **Fix:** Add `delete()` method to `ListingFlowAPI` class.

### C3. Missing API route handlers — 2 tools return 405
- **File:** `src/app/api/voice-agent/listings/route.ts` — no POST handler
- **File:** `src/app/api/voice-agent/listings/[id]/route.ts` — no DELETE handler
- **Impact:** `create_listing` tool returns 405. `delete_listing` would 405 even after C2 is fixed.
- **Fix:** Add POST handler to `listings/route.ts`, DELETE handler to `listings/[id]/route.ts`.

### C4. In-memory session dict never evicted — memory leak
- **File:** `voice_agent/server/main.py:413`
- **Code:** `_sessions: dict[str, SessionState] = {}` — sessions added, never removed
- **Evidence:** `cleanup_expired_sessions()` at line 1184 only cleans SQLite, not the in-memory dict
- **Impact:** Every session accumulates messages and tool results in RAM indefinitely. Long-running server will OOM.
- **Fix:** Add periodic eviction of expired sessions from `_sessions` dict (match SQLite cleanup logic).

### C5. No dependency management — unreproducible builds
- **Files checked:** No `requirements.txt`, `pyproject.toml`, `Pipfile`, or `setup.py` exists
- **Impact:** Cannot install the voice agent on a new machine. Depends on ~15 packages (aiohttp, anthropic, openai, groq, httpx, edge_tts, faster_whisper, piper, dotenv, lxml, etc.) with no version pinning.
- **Fix:** Create `requirements.txt` with pinned versions from current venv.

### C6. Auth disabled by default — no API key = open access
- **File:** `voice_agent/server/config.py:72`
- **Code:** `VOICE_AGENT_API_KEY = os.getenv("VOICE_AGENT_API_KEY", "")`
- **Logic:** `main.py:428-432` — `_check_auth()` returns True when key is empty
- **Impact:** If env var is unset, all 14 endpoints are accessible without authentication.
- **Fix:** Require the key to be set. Refuse to start if empty.

---

## HIGH — Fix Soon (14)

### H1. Duplicate `"create"` key in `_TOOL_ROUTES` — tools silently lost
- **File:** `voice_agent/server/main.py:254` and `:270`
- **Impact:** Second definition overwrites first. `create_offer`, `create_household`, `create_relationship`, `log_activity` are never routed for "create" keyword messages.

### H2. Non-streaming chat handler only does 1 tool round
- **File:** `voice_agent/server/main.py:571-593`
- **Impact:** Multi-step tool chains (find contact → create task) fail in non-streaming mode. Streaming mode correctly does 3 rounds.

### H3. Fallback chain only works at startup, not at runtime
- **File:** `voice_agent/server/llm_providers.py:598-616`
- **Impact:** If Anthropic returns a 500 mid-conversation, error propagates instead of falling back to OpenAI. Fallback only applies when choosing initial provider.

### H4. No rate limiting on any endpoint
- **File:** `voice_agent/server/main.py` (all 14 handlers)
- **Impact:** A single client can flood `/api/chat/stream`, each request creating expensive LLM calls. No per-session or per-IP throttling.

### H5. CORS set to `*` — any website can call the API
- **File:** `voice_agent/server/config.py:73`
- **Impact:** Combined with C1 (hardcoded token in JS), any website can make authenticated cross-origin requests.

### H6. New LLM client created on every request
- **File:** `voice_agent/server/llm_providers.py:141,312,371,489`
- **Impact:** New HTTP connection pool per request. Wastes TCP handshakes, bypasses HTTP/2 connection reuse.

### H7. No tests whatsoever
- **Location:** Entire `voice_agent/` directory
- **Impact:** No unit, integration, or smoke tests. Any change risks silent regression. Cannot verify tools work after refactoring.

### H8. No Dockerfile or deployment configuration
- **Location:** Entire `voice_agent/` directory
- **Impact:** No reproducible way to deploy. Only runs from local `venv` with Python 3.14.

### H9. No graceful handling when Supabase/Next.js is down
- **File:** `voice_agent/server/api_client.py:39-42`
- **Impact:** Tool errors propagated as raw error strings to LLM, which explains them poorly to the user. No circuit breaker, no retry, no user-friendly fallback.

### H10. Tool messages corrupt streaming message index in frontend
- **File:** `src/components/voice-agent/VoiceAgentWidget.tsx:508` + `:522`
- **Impact:** When a tool message is appended mid-stream, subsequent tokens overwrite the tool message instead of the assistant message. Conversation display corrupts.

### H11. Session expiry not handled — messages silently fail
- **File:** `src/components/voice-agent/VoiceAgentWidget.tsx:464`
- **Impact:** After session expires server-side, frontend keeps sending to the expired session ID. No session refresh logic.

### H12. Safari/iOS: `audio/webm` MediaRecorder not supported
- **File:** `src/components/voice-agent/VoiceAgentWidget.tsx:342`
- **Impact:** Voice recording fails completely on Safari and iOS. No `MediaRecorder.isTypeSupported()` check or fallback codec.

### H13. No streaming request timeout — UI hangs forever
- **File:** `src/components/voice-agent/VoiceAgentWidget.tsx:474`
- **Impact:** If the voice agent server hangs, the frontend stays in `sending=true` with no way for the user to cancel or recover.

### H14. Health check stops polling after disconnect — never recovers
- **File:** `src/components/voice-agent/VoiceAgentWidget.tsx:198-199`
- **Impact:** Once the voice agent goes offline, the widget stays "offline" until full page refresh. No reconnection strategy.

---

## MEDIUM (21)

| # | Issue | File | Impact |
|---|-------|------|--------|
| M1 | Non-streaming handler uses OpenAI `"tool"` role instead of Anthropic format | `main.py:578` | Message format inconsistency across endpoints |
| M2 | `book_tour` time parsing fails at hour 23 | `client_tools.py:218-220` | "24:00:00" is invalid time |
| M3 | `weather` tool uses synchronous HTTP — blocks event loop | `generic_tools.py:391-393` | Entire server pauses during weather lookup |
| M4 | Groq streaming drops tool calls silently | `llm_providers.py:521-538` | Tools never execute when using Groq in streaming mode |
| M5 | Anthropic streaming swallows exceptions without logging | `llm_providers.py:458-461` | Streaming failures are invisible |
| M6 | PiperTTS `synthesize` is synchronous | `tts_providers.py:53-62` | Blocks event loop during TTS |
| M7 | In-memory sessions cleaned only at startup | `main.py:413` | Waste RAM for entire server lifetime |
| M8 | No request body size limits on POST handlers | `main.py` (all POSTs) | DoS via large payloads |
| M9 | Prompt caching only on first system block; tools not cached | `llm_providers.py:291-293` | Wastes tokens re-sending tool schemas |
| M10 | Client prompt defaults to "your agent" not realtor name | `main.py:75`, `system_prompts.py:110` | Unprofessional user experience |
| M11 | Fixed 420x560px panel on mobile | `VoiceAgentWidget.tsx:649` | Overflows viewport on mobile screens |
| M12 | No max recording duration — records until OOM | `VoiceAgentWidget.tsx:342-376` | Memory exhaustion if user forgets to stop |
| M13 | Auto-open on health check is intrusive | `VoiceAgentWidget.tsx:192` | Hijacks attention on every page load |
| M14 | Mic permission requested on mount | `VoiceAgentWidget.tsx:165` | Browser blocks permission before user interacts |
| M15 | `log_activity` sends wrong enum values vs API schema | `realtor_tools.py` vs `activities/route.ts` | Activity creation fails with validation error |
| M16 | `add_to_household` uses POST, route only accepts PATCH | `realtor_tools.py:1334` | Tool returns 405 |
| M17 | No structured logging — all `print()` statements | `main.py` (throughout) | Production debugging impossible |
| M18 | SQL f-string pattern in database.py | `database.py:146,345` | Fragile, invites future SQL injection |
| M19 | TTS cache unbounded by memory size | `main.py:865-866` | 100 entries could be 50-100MB |
| M20 | No try/catch in 14 API route handlers | All `src/app/api/voice-agent/*/route.ts` | Malformed JSON crashes route with 500 |
| M21 | "Transcribing..." can be sent as a message | `VoiceAgentWidget.tsx:350` | User sends placeholder text instead of transcription |

---

## LOW (12)

| # | Issue | File |
|---|-------|------|
| L1 | `get_neighborhood_info` is a stub returning placeholder | `client_tools.py:189-200` |
| L2 | Reminders stored but never delivered | `generic_tools.py:332-357` |
| L3 | Conversation logs grow unbounded | `database.py` |
| L4 | `classify_complexity` keyword matching is crude | `llm_providers.py:567-583` |
| L5 | 660-line if/elif chain should be dispatch table | `realtor_tools.py:958-1617` |
| L6 | TTS cache hardcodes Edge TTS, ignores config | `main.py:891-921` |
| L7 | `VoiceAgentPanel.tsx` is dead code | Entire file |
| L8 | No ARIA labels, live regions, or keyboard nav | `VoiceAgentWidget.tsx` (multiple) |
| L9 | Speaking indicator uses `Math.random()` in render | `VoiceAgentWidget.tsx:700` |
| L10 | Stale closures in `speak` callback | `VoiceAgentWidget.tsx:536` |
| L11 | `cost_daily_cache` table defined but never populated | `schema.sql`, `database.py` |
| L12 | Health endpoint leaks provider name without auth | `main.py:447-455` |

---

## Architecture Notes (7)

| # | Observation | Current State | Best Practice |
|---|------------|---------------|---------------|
| A1 | REST+SSE vs WebSocket | REST for sessions, SSE for streaming | Adequate for single-user. WebSocket needed for barge-in, bidirectional audio streaming, multi-tenant. |
| A2 | Single-process server | `main.py:1202` runs single aiohttp instance | Sufficient for single-realtor. Multi-tenant needs gunicorn/uvicorn workers or container scaling. |
| A3 | `CURRENT_REALTOR_ID` is global env var | `config.py:62` — one realtor per server | Multi-tenant impossible without per-request routing. |
| A4 | TTS happens after full response | Frontend waits for complete text, then TTS sentence-by-sentence | Best practice: stream TTS as sentences complete during LLM streaming (lower perceived latency). |
| A5 | No barge-in/interruption signaling | `stopSpeaking()` cancels TTS but SSE stream continues | Best practice: send abort signal to server to stop LLM generation on user interruption. |
| A6 | No "clear context" user command | Session persists until expiry | Users should be able to say "start over" or "forget this conversation". |
| A7 | API routes use admin client | All 21 routes use `createAdminClient()` | Acceptable with proper auth. If token leaks (C1), entire DB is exposed. |

---

## Tool Status Summary

| Status | Count | Details |
|--------|-------|---------|
| Working | 49 | Full round-trip verified through API routes |
| Crashing (missing `delete()`) | 3 | `delete_contact`, `delete_listing`, `delete_task` |
| 405 (missing route handler) | 2 | `create_listing` (no POST), `add_to_household` (uses POST, needs PATCH) |
| Wrong enum values | 1 | `log_activity` sends wrong activity_type values |
| Stubs | 1 | `get_neighborhood_info` returns placeholder |
| **Total defined** | **56** | 48 realtor + 8 generic |

---

## Recommended Fix Priority

### Week 1 — Security & Crashes
1. Move bearer token to env var (C1)
2. Add `delete()` to API client (C2)
3. Add missing route handlers (C3)
4. Add session eviction (C4)
5. Create `requirements.txt` (C5)
6. Require API key — refuse to start if empty (C6)
7. Fix duplicate `"create"` dict key (H1)

### Week 2 — Core Functionality
8. Fix non-streaming handler to do multi-round tool calls (H2)
9. Implement runtime fallback chain (H3)
10. Fix streaming message index corruption in frontend (H10)
11. Add session expiry handling in frontend (H11)
12. Add Safari/iOS codec fallback (H12)
13. Add streaming request timeout (H13)
14. Fix `add_to_household` HTTP method (M16)
15. Fix `log_activity` enum mismatch (M15)

### Week 3 — Production Readiness
16. Add rate limiting (H4)
17. Restrict CORS origins (H5)
18. Cache LLM clients (H6)
19. Add structured logging (M17)
20. Add try/catch to all API routes (M20)
21. Create Dockerfile (H8)
22. Write basic tests — at minimum, tool handler smoke tests (H7)

### Week 4 — UX & Polish
23. Add connection recovery in frontend (H14)
24. Fix mobile responsiveness (M11)
25. Add recording timeout (M12)
26. Fix auto-open behavior (M13)
27. Defer mic permission to first use (M14)
28. Add ARIA labels and keyboard nav (L8)
29. Delete dead `VoiceAgentPanel.tsx` (L7)

---

*Analysis completed 2026-03-29. 3-pass iterative refinement: Pass 1 found 45 issues, Pass 2 verified 4/5 critical findings (rejected 1) and found 16 new issues, Pass 3 consolidated to 60 total issues with prioritized fix plan.*
