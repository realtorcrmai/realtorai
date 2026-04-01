# PLAN: Voice Agent Phase 1 Completion

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Date | 2026-03-31 |
| Author | Claude + Rahul |
| Status | DRAFT — awaiting approval |
| PRD References | `docs/PRD_Voice_Agent_Complete.md` (PRD1), `docs/PRD_Multi_Tenant_Voice_Agent_External_Assistants.md` (PRD2) |
| Gap Analysis | `docs/gap-analysis/voice-agent/v1_2026-03-31.md` |
| Tier | Large |
| Est. Files | 17 new + 8 modified |
| Migrations | 1 new |

---

## 1. Objective

Complete the remaining Phase 1 (Voice Foundation) and high-priority Phase 2 (CRM Integration) gaps from the voice agent gap analysis v1. This plan covers gaps 1.7–1.11, 2.3–2.6 from the gap analysis.

**What we're building:**
- Daily.co WebRTC integration (replace Web Speech API as primary audio)
- Voice dashboard page (`/voice`)
- Session cleanup cron
- PIPEDA/CASL consent flow
- Call transcript logging
- Click-to-voice on contact/listing pages
- Voice calls in CommunicationTimeline

**What we're NOT building (deferred to later plans):**
- Calendar integration (Phase 3)
- SSE notifications (Phase 3)
- Post-call workflows (Phase 4)
- FINTRAC flagging (Phase 4)
- External assistants — Siri, Alexa, Google (PRD2 Phases 2-4)
- Multi-language support (Phase 4)

---

## 2. Gap Analysis Reference

From `docs/gap-analysis/voice-agent/v1_2026-03-31.md`:

| Gap # | Requirement | Status in v1 | This Plan |
|-------|------------|--------------|-----------|
| 1.7 | Daily.co WebRTC integration | NOT DONE | ✅ Building |
| 1.8 | Voice Dashboard page `/voice-agent` | NOT DONE | ✅ Building |
| 1.9 | Session auto-expiry cron | NOT DONE | ✅ Building |
| 1.10 | PIPEDA/PIPA consent notice | NOT DONE | ✅ Building |
| 1.11 | Rate limit: 5 sessions/realtor/hour | NOT DONE | ✅ Building |
| 2.3 | Click-to-voice on contact/listing pages | NOT DONE | ✅ Building |
| 2.4 | Call transcript logging | NOT DONE | ✅ Building |
| 2.5 | Voice calls in CommunicationTimeline | NOT DONE | ✅ Building |
| 2.6 | Voice status indicator in header | NOT DONE | ✅ Building |

---

## 3. Architecture

```
Browser (React)
  ├── VoiceAgentWidget.tsx (upgraded)
  │   ├── Daily.co JS SDK (@daily-co/daily-js)
  │   ├── Consent check before session start
  │   └── Fallback: Web Speech API if Daily.co fails
  ├── VoiceDashboard.tsx (new page /voice)
  │   ├── Active sessions panel
  │   ├── Call history table (filterable)
  │   ├── Cost + metrics cards
  │   └── Provider status
  ├── CallButton.tsx (on contact/listing pages)
  ├── ConsentModal.tsx (PIPEDA/CASL)
  └── ActiveCallWidget.tsx (in-call controls)
        │
        ↓ HTTP/SSE
        │
Python Voice Agent Server (port 8768)
  ├── Daily.co room creation + token management
  ├── Whisper STT (server-side, wired to Daily.co audio)
  ├── Edge TTS (response playback)
  └── Call transcript → voice_calls table via API bridge
        │
        ↓ HTTP
        │
Next.js API Routes (port 3000)
  ├── /api/voice-agent/calls — Call CRUD
  ├── /api/voice-agent/consent — Consent management
  ├── /api/voice-agent/daily-webhook — Daily.co events
  └── /api/cron/voice-session-cleanup — Stale session expiry
        │
        ↓ Supabase SDK
        │
Supabase (PostgreSQL + RLS)
  ├── voice_sessions (existing)
  ├── voice_calls (existing — start populating)
  ├── voice_notifications (existing)
  └── contact_consent (new)
```

---

## 4. Implementation Batches

### Batch 1: Database + Foundation
**Files: 2 new, 1 modified**

| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `supabase/migrations/062_voice_consent_and_call_logging.sql` | New | `contact_consent` table, indexes, RLS; add missing columns to `voice_calls` if needed |
| 2 | `src/types/voice-agent.ts` | Modified | Add `ContactConsent` types, call logging types |
| 3 | `src/api/cron/voice-session-cleanup/route.ts` | New | Expire sessions idle >30 min, delete Daily.co rooms, requires `CRON_SECRET` |

### Batch 2: Backend Services + APIs
**Files: 6 new, 1 modified**

| # | File | Type | Description |
|---|------|------|-------------|
| 4 | `src/lib/daily-co.ts` | New | Daily.co REST API wrapper: `createRoom()`, `getToken()`, `deleteRoom()` |
| 5 | `src/actions/voice-calls.ts` | Modified | Add `logCallTranscript()`, `getCallHistory()`, `updateCallDisposition()` |
| 6 | `src/actions/consent.ts` | New | `checkConsent()`, `grantConsent()`, `withdrawConsent()` |
| 7 | `src/app/api/voice-agent/calls/route.ts` | New | GET (list + filter) + POST (create call record) |
| 8 | `src/app/api/voice-agent/consent/route.ts` | New | GET (check status) + POST (grant/withdraw) |
| 9 | `src/app/api/voice-agent/daily-webhook/route.ts` | New | Handle Daily.co events: participant-joined, participant-left, recording-started |

### Batch 3: UI Components
**Files: 5 new**

| # | File | Type | Description |
|---|------|------|-------------|
| 10 | `src/components/voice-agent/ConsentModal.tsx` | New | Pre-call PIPEDA notice + consent collection. Shows: "This session may be transcribed for your records." Requires acknowledgement. |
| 11 | `src/components/voice-agent/CallButton.tsx` | New | Reusable click-to-call. Props: `contactId`, `listingId` (optional context). Checks consent first. |
| 12 | `src/components/voice-agent/ActiveCallWidget.tsx` | New | Floating in-call controls: mute, end call, timer, provider badge |
| 13 | `src/components/voice-agent/CallHistoryTable.tsx` | New | Filterable table: date, contact, duration, disposition, transcript preview |
| 14 | `src/components/voice-agent/PostCallModal.tsx` | New | After call: disposition dropdown, notes textarea, auto-log to communications |

### Batch 4: Pages + Integration
**Files: 4 new, 6 modified**

| # | File | Type | Description |
|---|------|------|-------------|
| 15 | `src/app/(dashboard)/voice/page.tsx` | New | Voice dashboard: stat cards (sessions, avg duration, cost), active sessions, call history table |
| 16 | `src/hooks/useVoiceCalls.ts` | New | React Query hooks: `useCallHistory()`, `useActiveSession()` |
| 17 | `src/hooks/useConsent.ts` | New | React Query hooks: `useConsentStatus(contactId)` |
| 18 | `src/components/voice-agent/VoiceAgentWidget.tsx` | Modified | Upgrade: Daily.co primary, Web Speech API fallback, consent check, call logging |
| 19 | `src/components/contacts/ContactCard.tsx` | Modified | Add `CallButton` component |
| 20 | `src/components/contacts/CommunicationTimeline.tsx` | Modified | Show voice calls with phone emoji, duration, expandable transcript |
| 21 | `src/app/(dashboard)/layout.tsx` or navigation | Modified | Add "Voice" nav link |
| 22 | `package.json` | Modified | Add `@daily-co/daily-js` dependency |

---

## 5. Database Schema

### New Table: `contact_consent`

```sql
CREATE TABLE contact_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('voice', 'sms', 'email', 'recording')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('granted', 'denied', 'withdrawn', 'pending')),
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  method TEXT CHECK (method IN ('verbal', 'written', 'electronic')),
  compliance_notes TEXT,          -- CASL/PIPEDA documentation
  ip_address INET,                -- For electronic consent
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, consent_type)
);

-- Indexes
CREATE INDEX idx_consent_contact ON contact_consent(contact_id);
CREATE INDEX idx_consent_type_status ON contact_consent(consent_type, status);

-- RLS
ALTER TABLE contact_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage consent"
  ON contact_consent FOR ALL TO authenticated USING (true);
```

### Modified: `voice_calls` (add columns if missing)

```sql
-- Ensure these columns exist (some may already be in migration 060)
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS disposition TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS daily_room_name TEXT;
```

---

## 6. Environment Variables

### Required (new)
```
DAILY_API_KEY=               # Daily.co REST API key
DAILY_DOMAIN=                # e.g., realtorai.daily.co
DAILY_WEBHOOK_SECRET=        # HMAC validation for webhooks (optional, recommended)
```

### Existing (already configured)
```
CRON_SECRET=                 # For cron job auth
NEXT_PUBLIC_VOICE_AGENT_URL= # Python server URL (default http://127.0.0.1:8768)
```

---

## 7. Consent Flow (PIPEDA/CASL)

```
User clicks "Start Voice Session" or CallButton
  ↓
Check contact_consent for consent_type='voice'
  ↓
If NOT granted:
  → Show ConsentModal:
    "This voice session may be transcribed and stored for your records.
     Transcripts are retained for 90 days per PIPEDA requirements.
     You can withdraw consent at any time from Settings."
    [Allow] [Deny]
  → On Allow: INSERT contact_consent, proceed
  → On Deny: Cancel session, show "Voice session requires consent"
  ↓
If granted:
  → Proceed to Daily.co room creation
```

---

## 8. Daily.co Integration

### Room Lifecycle
1. **Create room** — `POST https://api.daily.co/v1/rooms` with `{ properties: { exp: now+1h, enable_recording: true } }`
2. **Get token** — `POST https://api.daily.co/v1/meeting-tokens` with `{ properties: { room_name, user_name, exp } }`
3. **Join** — `@daily-co/daily-js` SDK in browser: `callObject.join({ url, token })`
4. **Audio only** — `callObject.setLocalAudio(true); callObject.setLocalVideo(false);`
5. **End** — `callObject.leave()` → trigger post-call flow
6. **Cleanup** — `DELETE https://api.daily.co/v1/rooms/:name` (via cron or webhook)

### Fallback
If Daily.co fails (network error, no API key):
- Fall back to existing Web Speech API pipeline
- Log warning in console
- Show "Using browser audio (limited accuracy)" badge

---

## 9. Session Cleanup Cron

```
Schedule: Every 30 minutes
Auth: CRON_SECRET Bearer token
Endpoint: /api/cron/voice-session-cleanup

Logic:
1. SELECT voice_sessions WHERE status = 'active' AND last_activity_at < NOW() - INTERVAL '30 minutes'
2. For each stale session:
   a. Update status → 'expired'
   b. DELETE Daily.co room (if daily_room_name set)
   c. Log final transcript to voice_calls (if messages exist)
3. Return { expired: count, rooms_deleted: count }
```

---

## 10. Success Criteria

| Criteria | Metric |
|----------|--------|
| Daily.co connection success | >90% of session attempts connect successfully |
| Fallback works | Web Speech API activates within 3s of Daily.co failure |
| Consent flow | 100% of new sessions show consent modal if no prior consent |
| Call logging | Every session >5s logged to voice_calls with transcript |
| Dashboard loads | `/voice` page renders with real data in <2s |
| Timeline integration | Voice calls appear in CommunicationTimeline with correct icon/duration |
| Session cleanup | Stale sessions expired within 30 min, Daily.co rooms deleted |
| Click-to-voice | CallButton appears on contact detail page, launches session with context |

---

## 11. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| No Daily.co API key available | Medium | Build with fallback-first — Web Speech API works today, Daily.co enhances it |
| Daily.co latency in Canada | Low | Daily.co has Vancouver PoP; stream TTS incrementally |
| Consent fatigue (users dismiss) | Medium | Remember consent per contact, don't re-ask |
| Migration conflict with existing voice_calls | Low | Use ADD COLUMN IF NOT EXISTS |
| Browser microphone permission denied | Medium | Clear prompt, fallback to text input, show setup guide |

---

## 12. Out of Scope (Deferred)

| Item | Deferred To |
|------|-------------|
| Google Calendar auto-sync | Phase 3 plan |
| SSE notification stream | Phase 3 plan |
| Post-call auto-task creation | Phase 4 plan |
| FINTRAC compliance flagging | Phase 4 plan |
| Client mode voice portal | Phase 4 plan |
| Multi-language (Mandarin, etc.) | Phase 4 plan |
| OAuth2 + PKCE server | Multi-tenant plan |
| External assistants (Siri/Alexa/Google) | PRD2 Phases 2-4 |
