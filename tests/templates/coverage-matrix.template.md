# Coverage Matrix — Realtors360 CRM

## Format
Each feature maps requirements → test cases → test types → status.

---

## Feature: Listing Create (REQ-LISTING-001)

### Source Files
| File | Type | Purpose |
|------|------|---------|
| `src/actions/listings.ts` | Server Action | `createListing()` mutation |
| `src/app/api/listings/route.ts` | API Route | GET listings endpoint |
| `src/components/listings/ListingForm.tsx` | Component | Form UI with Zod validation |
| `src/types/database.ts` | Types | Listing DB schema types |

### Test Matrix

| TC-ID | Description | Type | Layer | Priority | Status |
|-------|-------------|------|-------|----------|--------|
| TC-LST-001 | Create listing with valid data | Unit | Action | P0 | PASS |
| TC-LST-002 | Create listing with seller FK | Integration | DB | P0 | PASS |
| TC-LST-003 | Status defaults to active | Unit | Action | P1 | PASS |
| TC-LST-004 | Missing address validation | Unit | Validation | P0 | PASS |
| TC-LST-005 | ListingForm renders fields | Component | UI | P1 | PASS |
| TC-LST-006 | ListingForm Zod validation | Component | UI | P1 | PASS |
| TC-LST-007 | API GET /listings returns tenant data | Integration | API | P0 | PASS |
| TC-LST-008 | Cross-tenant isolation | Security | DB | P0 | PASS |
| TC-LST-009 | E2E create listing flow | E2E | Full | P0 | PASS |
| TC-LST-010 | Revalidate /listings path | Integration | Cache | P2 | TODO |

### 4-Layer Assertion Coverage

| Layer | What to Assert | Covered |
|-------|---------------|---------|
| **UI** | Form submits, success toast, redirect to /listings | TC-LST-009 |
| **DB** | Row exists in listings table, realtor_id set, seller_id FK valid | TC-LST-002, TC-LST-008 |
| **Integration** | revalidatePath called, recent items updated | TC-LST-010 |
| **Side-effects** | Notification created (optional), audit log entry | — |

---

## Feature: Contact Create (REQ-CONTACT-001)

### Source Files
| File | Type | Purpose |
|------|------|---------|
| `src/actions/contacts.ts` | Server Action | `createContact()` mutation |
| `src/app/api/contacts/route.ts` | API Route | GET/POST contacts |
| `src/components/contacts/ContactForm.tsx` | Component | Form with CASL consent |
| `src/lib/notifications.ts` | Library | Speed-to-lead trigger |

### Test Matrix

| TC-ID | Description | Type | Layer | Priority | Status |
|-------|-------------|------|-------|----------|--------|
| TC-CON-001 | Create contact happy path | Unit | Action | P0 | PASS |
| TC-CON-002 | Missing required fields | Unit | Validation | P0 | PASS |
| TC-CON-003 | Speed-to-lead notification | Integration | Side-effect | P1 | PASS |
| TC-CON-004 | CASL consent date saved | Unit | DB | P1 | PASS |
| TC-CON-005 | ContactForm renders | Component | UI | P1 | PASS |
| TC-CON-006 | ContactForm a11y | Accessibility | UI | P2 | PASS |
| TC-CON-007 | Tenant isolation | Security | DB | P0 | PASS |
| TC-CON-008 | E2E contact create | E2E | Full | P0 | TODO |

### 4-Layer Assertion Coverage

| Layer | What to Assert | Covered |
|-------|---------------|---------|
| **UI** | Form submits, toast shows, redirect to /contacts | TC-CON-008 |
| **DB** | Row in contacts, realtor_id set, CASL fields | TC-CON-001, TC-CON-004, TC-CON-007 |
| **Integration** | Speed-to-lead notification created | TC-CON-003 |
| **Side-effects** | Recent items store updated, CommandPalette indexed | — |

---

## Feature: Showing Confirmation (REQ-SHOWING-002)

### Source Files
| File | Type | Purpose |
|------|------|---------|
| `src/app/api/webhooks/twilio/route.ts` | Webhook | Inbound SMS handler |
| `src/actions/showings.ts` | Server Action | Status transitions |
| `src/lib/twilio.ts` | Library | SMS/WhatsApp send |
| `src/lib/google-calendar.ts` | Library | Event creation |

### Test Matrix

| TC-ID | Description | Type | Layer | Priority | Status |
|-------|-------------|------|-------|----------|--------|
| TC-SHW-004 | YES confirms showing | Integration | Webhook | P0 | PASS |
| TC-SHW-005 | NO denies showing | Integration | Webhook | P0 | PASS |
| TC-SHW-006 | Lockbox code sent | Integration | Side-effect | P1 | PASS |
| TC-SHW-007 | Calendar event created | Integration | Side-effect | P1 | TODO |
| TC-SHW-008 | Invalid Twilio signature | Security | Webhook | P0 | PASS |
| TC-SHW-009 | Duplicate confirmation | Edge | Webhook | P2 | TODO |

### 4-Layer Assertion Coverage

| Layer | What to Assert | Covered |
|-------|---------------|---------|
| **UI** | Status badge updates to confirmed/denied | — (E2E needed) |
| **DB** | appointments.status = confirmed, google_event_id set | TC-SHW-004, TC-SHW-007 |
| **Integration** | Twilio SMS sent (lockbox), Google Calendar API called | TC-SHW-006, TC-SHW-007 |
| **Side-effects** | Communication logged, notification created | TC-SHW-004 |

---

## Summary Dashboard

| Area | Total TCs | P0 | P1 | P2 | Pass | Fail | TODO |
|------|-----------|----|----|----|----|------|------|
| Auth | 8 | 6 | 2 | 0 | 8 | 0 | 0 |
| Contacts | 8 | 4 | 3 | 1 | 7 | 0 | 1 |
| Listings | 10 | 5 | 4 | 1 | 9 | 0 | 1 |
| Showings | 6 | 3 | 2 | 1 | 4 | 0 | 2 |
| Workflow | 5 | 3 | 2 | 0 | 5 | 0 | 0 |
| Newsletter | 6 | 2 | 4 | 0 | 6 | 0 | 0 |
| **TOTAL** | **43** | **23** | **17** | **3** | **39** | **0** | **4** |

### Coverage Gaps (Action Required)
1. E2E contact create flow (TC-CON-008) — needs Playwright test
2. Listing path revalidation (TC-LST-010) — needs cache assertion
3. Calendar event creation (TC-SHW-007) — needs Google API mock
4. Duplicate confirmation handling (TC-SHW-009) — edge case
