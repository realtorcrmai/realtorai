# Test Discovery Inventory — Realtors360 CRM

## Purpose
Document all testable surfaces discovered during codebase analysis. This inventory feeds into the RTM and coverage matrix.

---

## 1. Server Actions (`src/actions/`)

| File | Functions | Complexity | Test Priority |
|------|-----------|-----------|---------------|
| `contacts.ts` | createContact, updateContact, deleteContact, sendMessage, bulkDelete | High — Twilio + notifications | P0 |
| `listings.ts` | createListing, updateListing, deleteListing, updateStatus | Medium — FK validation | P0 |
| `showings.ts` | createShowing, updateShowingStatus, requestShowing, completeShowing | High — Twilio + Calendar | P0 |
| `workflow.ts` | advancePhase, getWorkflowState, validatePhase | High — sequential logic | P0 |
| `newsletters.ts` | createNewsletter, sendNewsletter, approveNewsletter, generateContent | High — AI + Resend | P1 |
| `journeys.ts` | enrollContact, advanceJourney, pauseJourney | Medium — state machine | P1 |
| `calendar.ts` | getEvents, createEvent, checkBusy | Medium — Google API | P1 |
| `enrichment.ts` | enrichListing, geocode, fetchParcel | Medium — external APIs | P2 |
| `content.ts` | generatePrompts, createMediaAsset | Medium — Kling + Claude | P2 |
| `notifications.ts` | createNotification, markRead, dismissAll | Low | P2 |
| `recommendations.ts` | getRecommendations, executeRecommendation | Medium — AI | P2 |
| `templates.ts` | createTemplate, duplicateTemplate, previewTemplate | Low | P2 |
| `segments.ts` | buildSegment, bulkEnroll | Medium — query builder | P2 |

---

## 2. API Routes (`src/app/api/`)

| Route | Methods | Auth | External Deps | Test Priority |
|-------|---------|------|--------------|---------------|
| `/api/listings` | GET | Session | Supabase | P0 |
| `/api/contacts` | GET | Session | Supabase | P0 |
| `/api/showings` | GET | Session | Supabase | P0 |
| `/api/webhooks/twilio` | POST | Twilio Sig | Twilio | P0 |
| `/api/calendar/events` | GET | Session | Google Calendar | P1 |
| `/api/calendar/busy` | GET | Session | Google Calendar | P1 |
| `/api/forms/generate` | POST | Session | Python form server | P1 |
| `/api/mls-remarks` | POST | Session | Anthropic Claude | P1 |
| `/api/kling/status` | GET | Session | Kling AI | P2 |
| `/api/neighborhood` | GET | Session | Mock data | P2 |
| `/api/onboarding/nps` | POST | Session | Supabase | P2 |
| `/api/cron/process-workflows` | POST | Bearer CRON_SECRET | Supabase + Resend | P0 |
| `/api/cron/daily-digest` | POST | Bearer CRON_SECRET | Supabase + Resend | P1 |
| `/api/cron/consent-expiry` | POST | Bearer CRON_SECRET | Supabase | P2 |

---

## 3. Components (Testable UI)

| Component | File | Interactions | Test Priority |
|-----------|------|-------------|---------------|
| ContactForm | `src/components/contacts/ContactForm.tsx` | Form submit, validation, CASL toggle | P0 |
| ListingForm | `src/components/listings/ListingForm.tsx` | Form submit, seller select, price input | P0 |
| ShowingRequestForm | `src/components/showings/ShowingRequestForm.tsx` | Date picker, agent fields, submit | P1 |
| ContactsTableClient | `src/components/contacts/ContactsTableClient.tsx` | Search, filter, bulk select, row click | P1 |
| ListingsTableClient | `src/components/listings/ListingsTableClient.tsx` | Search, status filter, row click | P1 |
| CommandPalette | `src/components/layout/CommandPalette.tsx` | Cmd+K, search, navigate | P1 |
| NotificationDropdown | `src/components/layout/NotificationDropdown.tsx` | Bell click, mark read, dismiss | P2 |
| WorkflowStepper | `src/components/workflow/WorkflowStepper.tsx` | Phase click, advance, collapse | P1 |
| DataTable | `src/components/ui/data-table.tsx` | Sort, paginate, bulk actions | P1 |
| ContactPreviewSheet | `src/components/contacts/ContactPreviewSheet.tsx` | Open, close, data display | P2 |

---

## 4. Database Constraints

| Table | Constraint | Type | Test Priority |
|-------|-----------|------|---------------|
| contacts | name NOT NULL | NOT NULL | P0 |
| contacts | realtor_id NOT NULL | NOT NULL | P0 |
| listings | address NOT NULL | NOT NULL | P0 |
| listings | status CHECK | CHECK (active/conditional/pending/sold/expired/withdrawn) | P0 |
| appointments | listing_id FK | FOREIGN KEY | P0 |
| appointments | status CHECK | CHECK (pending/confirmed/denied/completed/cancelled) | P0 |
| seller_identities | listing_id FK | FOREIGN KEY | P1 |
| communications | contact_id FK | FOREIGN KEY | P1 |
| listing_documents | listing_id FK CASCADE | CASCADE DELETE | P1 |
| seller_identities | listing_id FK CASCADE | CASCADE DELETE | P1 |

---

## 5. External Integration Points

| Service | Library | Mock Strategy | Test Priority |
|---------|---------|--------------|---------------|
| Twilio SMS | `src/lib/twilio.ts` | Nock HTTP stub | P0 |
| Twilio WhatsApp | `src/lib/twilio.ts` | Nock HTTP stub | P1 |
| Resend Email | `src/lib/resend.ts` | Nock HTTP stub | P1 |
| Google Calendar | `src/lib/google-calendar.ts` | Nock HTTP stub | P1 |
| Anthropic Claude | `src/lib/anthropic/creative-director.ts` | Nock HTTP stub | P2 |
| Kling AI | `src/lib/kling/` | Nock HTTP stub | P2 |
| BC Geocoder | `src/actions/enrichment.ts` | Nock HTTP stub | P2 |
| Python Form Server | `localhost:8767` | Nock HTTP stub | P2 |

---

## 6. Security Surfaces

| Surface | Risk | Test Type | Priority |
|---------|------|-----------|----------|
| Tenant isolation (RLS) | Data leak between realtors | Integration | P0 |
| Cron auth (Bearer token) | Unauthorized cron execution | API | P0 |
| Twilio signature validation | Webhook spoofing | Webhook | P0 |
| Session expiry | Stale JWT access | API | P1 |
| SQL injection (search params) | Data exfiltration | API | P1 |
| XSS in contact notes | Stored XSS | Component | P2 |

---

## 7. Accessibility Surfaces

| Page/Component | WCAG Requirement | Test Priority |
|----------------|-----------------|---------------|
| All pages | Skip-to-content link | P1 |
| DataTable | aria-label, focus ring, keyboard nav | P1 |
| CommandPalette | aria-expanded, arrow key nav | P1 |
| ContactForm | aria-describedby on fields | P2 |
| PageHeader tabs | role="tab", aria-selected | P2 |
| File upload | aria-label on input | P2 |

---

## 8. Performance Surfaces

| Endpoint | Expected SLA | Load Test Priority |
|----------|-------------|-------------------|
| GET /api/listings | < 200ms p95 | P1 |
| GET /api/contacts | < 200ms p95 | P1 |
| POST /api/webhooks/twilio | < 500ms p95 | P0 |
| POST /api/cron/process-workflows | < 30s total | P2 |
| Dashboard page load | < 2s LCP | P1 |

---

## Discovery Notes
- **Total testable functions:** ~65 server actions + API handlers
- **Total testable components:** ~25 interactive components
- **External dependencies:** 8 services requiring mocks
- **DB constraints:** 10+ enforceable constraints
- **Estimated total test cases needed:** 150-200 for full coverage
