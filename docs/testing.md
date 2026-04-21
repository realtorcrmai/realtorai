# Testing Architecture — Realtors360 CRM

## Overview

### Goal

**Zero regression escapes to production.** Every requirement has a test. Every test traces back to a requirement. The test suite is the living specification of the system.

### Non-Goals

- 100% line coverage as a vanity metric (we target meaningful behavioral coverage)
- Testing third-party library internals (Supabase SDK, NextAuth internals)
- Performance benchmarking in CI (deferred to L8 load testing)

### The Reframe

Tests are not a tax on development — they are the **primary deliverable**. Code that works but has no test is unverified. A failing test is a feature working as designed. The test suite is the single source of truth for "does the system behave correctly?"

---

## 9-Layer Test Architecture

```
                    ┌─────────────────────┐
               L9   │  Prod Observability  │  Synthetic monitors
                    ├─────────────────────┤
               L8   │     Load Testing     │  k6, concurrent users
                    ├─────────────────────┤
               L7   │     Resilience       │  Outage simulation
                    ├─────────────────────┤
          L6a-d     │   Accessibility /    │  axe-core, visual,
                    │   Visual / Compat    │  browser matrix
                    ├─────────────────────┤
               L5   │        E2E           │  Playwright flows
                    ├─────────────────────┤
               L4   │   API Integration    │  Server actions + DB
                    ├─────────────────────┤
               L3   │      Contract        │  Zod schema sharing
                    ├─────────────────────┤
               L2   │     Component        │  RTL + happy-dom
                    ├─────────────────────┤
               L1   │        Unit          │  Vitest + fast-check
                    ├─────────────────────┤
               L0   │       Static         │  tsc, eslint, gitleaks
                    └─────────────────────┘

Ideal Pyramid Ratio: L0-L1 70% | L2-L4 20% | L5-L9 10%
```

---

### L0 — Static Analysis

**Tools:** TypeScript compiler (`tsc --noEmit`), ESLint, gitleaks, semgrep, size-limit

**What it catches:**
- Type errors across all `src/` files
- Unused imports, unreachable code
- Secrets accidentally committed (API keys, tokens)
- Security anti-patterns (SQL injection, XSS vectors)
- Bundle size regressions (size-limit on `npm run build`)

**Config files:**
- `tsconfig.json` — strict mode enabled
- `.eslintrc.json` / `eslint.config.mjs` — Next.js + custom rules
- `.gitleaksignore` — false positive suppressions
- `size-limit.json` — per-route budget (target: <200KB first load JS)

**Runs at:** G0 (pre-commit), G1 (PR), G2 (merge)

---

### L1 — Unit Tests

**Tools:** Vitest, fast-check (property-based testing), Stryker (mutation testing)

**Scope:** Pure functions, utilities, transformers, validators

**Key targets in Realtors360:**
| Module | File | What to test |
|--------|------|-------------|
| CDM Mapper | `src/lib/cdm-mapper.ts` | Listing → Common Data Model transformation |
| Fuzzy Match | `src/lib/fuzzy-match.ts` | Jaro-Winkler scoring accuracy |
| Phone Formatting | `src/lib/twilio.ts` | +1 prefix, whitespace strip, edge cases |
| Email Blocks | `src/lib/email-blocks.ts` | 13 block types render valid HTML |
| Text Pipeline | `src/lib/text-pipeline.ts` | Personalization token replacement |
| Quality Pipeline | `src/lib/quality-pipeline.ts` | 7-dimension scoring boundaries |
| Send Governor | `src/lib/send-governor.ts` | Frequency cap enforcement |
| Flow Converter | `src/lib/flow-converter.ts` | React Flow ↔ workflow_steps round-trip |
| Notification Helper | `src/lib/notifications.ts` | Speed-to-lead timing logic |

**Property-based tests (fast-check):**
- Phone formatting: any string with 10+ digits → valid E.164
- CDM mapper: any listing object → valid CDM (no undefined fields)
- Fuzzy match: score always in [0, 1], identical strings → 1.0

**Mutation testing (Stryker):**
- Target: >80% mutation score on `src/lib/` modules
- Catches: tests that pass regardless of code changes (weak assertions)

**File pattern:** `tests/unit/**/*.test.ts`
**Runs at:** G0 (pre-commit, affected files only), G1 (PR, full suite)

---

### L2 — Component Tests

**Tools:** React Testing Library, happy-dom (fast JSDOM alternative), MSW (API mocking)

**Scope:** React components in isolation — rendering, user interaction, state

**Key targets:**
| Component | File | Test scenarios |
|-----------|------|---------------|
| DataTable | `src/components/ui/data-table.tsx` | Sort, filter, paginate, bulk select, row click |
| ContactForm | `src/components/contacts/ContactForm.tsx` | Validation, submit, error display |
| CommandPalette | `src/components/layout/CommandPalette.tsx` | Open/close, search, keyboard nav, result selection |
| ListingCard | `src/components/listings/ListingCard.tsx` | Render all statuses, price formatting |
| WorkflowStepper | `src/components/workflow/WorkflowStepper.tsx` | Phase progression, disabled states |
| NotificationDropdown | `src/components/layout/NotificationDropdown.tsx` | Unread badge, mark read, polling |
| ContactPreviewSheet | `src/components/contacts/ContactPreviewSheet.tsx` | Open/close, data display |
| PageHeader | `src/components/layout/PageHeader.tsx` | Breadcrumbs, tabs, actions render |

**Patterns:**
- Use `render()` + `screen.getByRole()` for accessibility-first queries
- Prefer `userEvent` over `fireEvent` for realistic interaction
- Mock server actions with MSW handlers
- Never test implementation details (internal state, refs)

**File pattern:** `tests/components/**/*.test.tsx`
**Runs at:** G1 (PR), G2 (merge)

---

### L3 — Contract Tests

**Tools:** Zod schema extraction, custom schema diffing

**Scope:** API shape verification between client and server

**How it works in Realtors360:**
1. Server actions (`src/actions/*.ts`) define Zod schemas for input validation
2. Contract tests import those same schemas and verify:
   - Client components pass data matching the schema
   - API responses match expected shape
   - Database query results match TypeScript types

**Key contracts:**
| Contract | Producer | Consumer |
|----------|----------|----------|
| Contact CRUD | `src/actions/contacts.ts` | `ContactForm`, `ContactsTableClient` |
| Listing CRUD | `src/actions/listings.ts` | `ListingForm`, `ListingsTableClient` |
| Showing CRUD | `src/actions/showings.ts` | `ShowingRequestForm`, `ShowingsTableClient` |
| Newsletter Send | `src/actions/newsletters.ts` | `ApprovalQueueClient` |
| Workflow Advance | `src/actions/workflow.ts` | `WorkflowStepper` |

**Breaking change detection:**
- Schema field removed → contract test fails
- Type changed (string → number) → contract test fails
- New required field without default → contract test fails

**File pattern:** `tests/contract/**/*.test.ts`
**Runs at:** G1 (PR), G2 (merge)

---

### L4 — API Integration Tests

**Tools:** Vitest with real Supabase (test project or local), Nock (external API stubs)

**Scope:** Server actions end-to-end with real database operations

**Setup:**
- Dedicated test database (Supabase local via Docker or test project)
- Each test gets a fresh tenant (unique `realtor_id`)
- External APIs (Twilio, Resend, Anthropic, Kling) stubbed via Nock
- Tests run sequentially within a file (shared DB state)

**Key test suites:**
| Suite | Actions Tested | What's Verified |
|-------|---------------|-----------------|
| Contact lifecycle | create, read, update, delete | CRUD, RLS isolation, CASL consent |
| Listing lifecycle | create, update status transitions | Status machine, enrichment triggers |
| Showing workflow | create, confirm, complete | Twilio notification, calendar event |
| Newsletter flow | create, approve, send | Resend call, event logging |
| Workflow phases | advance phase 1→8 | Sequential enforcement, audit trail |
| Multi-tenancy | cross-tenant access | RLS blocks unauthorized reads |

**External service stubs (Nock):**
```typescript
// Twilio SMS
nock('https://api.twilio.com').post('/2010-04-01/Accounts/*/Messages.json').reply(201, {...})

// Resend email
nock('https://api.resend.com').post('/emails').reply(200, { id: 'test-email-id' })

// Anthropic Claude
nock('https://api.anthropic.com').post('/v1/messages').reply(200, {...})
```

**File pattern:** `tests/integration/**/*.test.ts`
**Runs at:** G1 (PR), G2 (merge)

---

### L5 — End-to-End Tests

**Tools:** Playwright (Chromium, Firefox, WebKit)

**Scope:** Full user journeys through the browser

**4-Layer Assertion Model:**
1. **Visual** — element visible, correct text
2. **Data** — database state matches expected
3. **Side-effect** — SMS sent, email queued, calendar created
4. **Navigation** — correct URL, breadcrumbs, back button works

**Coverage Matrix (critical paths):**

| Journey | Steps | Assertions |
|---------|-------|-----------|
| Login → Dashboard | Demo login, verify widgets | Dashboard loads, 3 widgets render |
| Create Contact | Form fill, submit, verify list | DB row exists, appears in table |
| Create Listing | Full form, save | DB row, status = draft |
| Listing Workflow | Advance phases 1-8 | Each phase saves, sequential |
| Schedule Showing | Select listing, fill form, submit | Appointment created, SMS sent |
| Confirm Showing | Webhook simulation | Status = confirmed, calendar event |
| Generate Content | Select listing, run AI | Prompt saved, media task created |
| Command Palette | Cmd+K, search, navigate | Results appear, navigation works |
| Bulk Operations | Select rows, apply action | All selected items updated |
| Newsletter Approve | Queue view, approve, verify send | Status = sent, Resend called |

**Test data management:**
- Seed fixtures via API calls in `beforeAll`
- Clean up via cascade delete in `afterAll`
- Never share state between test files

**File pattern:** `tests/e2e/**/*.spec.ts`
**Runs at:** G2 (merge to dev), G3 (pre-deploy)

---

### L6a — Accessibility Testing

**Tools:** axe-core (via @axe-core/playwright), manual keyboard flow tests

**Scope:** WCAG 2.1 AA compliance on all pages

**Automated checks (axe-core):**
- Color contrast ratios (already 18/18 passing)
- ARIA roles and labels
- Form label associations
- Focus management
- Landmark regions

**Manual keyboard flow tests (Playwright):**
- Tab through all interactive elements on each page
- Enter/Space activate buttons and links
- Escape closes modals and dropdowns
- Arrow keys navigate CommandPalette results
- Skip-to-content link works

**File pattern:** `tests/a11y/**/*.spec.ts`
**Runs at:** G1 (PR, axe-core only), G2 (merge, full keyboard flows)

---

### L6b — Visual Regression

**Tools:** Playwright screenshots + `pixelmatch` or Percy/Chromatic

**Scope:** Catch unintended visual changes to key pages

**Baseline pages:**
- Dashboard (empty state + populated)
- Contacts list + detail
- Listings list + detail + workflow
- Showings list + detail
- Login page (desktop + mobile)
- Newsletter queue

**Threshold:** 0.1% pixel difference triggers review

**File pattern:** `tests/visual/**/*.spec.ts`
**Runs at:** G1 (PR, generates diff), G2 (merge, updates baseline)

---

### L6c — i18n Testing

**Status:** Deferred. Realtors360 is English-only. Placeholder for future BC French language support.

---

### L6d — Browser Compatibility

**Tools:** Playwright multi-browser (Chromium, Firefox, WebKit)

**Matrix:**
| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome 120+ | Yes | Android |
| Firefox 120+ | Yes | — |
| Safari 17+ | Yes | iOS |
| Edge | Chromium-based, covered by Chrome | — |

**What's tested:** L5 E2E suite runs on all 3 engines. Mobile viewport (375px) for responsive layouts.

**Runs at:** G2 (merge), G3 (pre-deploy, full matrix)

---

### L7 — Resilience Testing

**Tools:** Custom middleware interceptors, Nock fault injection

**Scenarios:**
| Failure | Simulation | Expected Behavior |
|---------|-----------|-------------------|
| Supabase down | Nock returns 503 | Graceful error UI, no data loss |
| Twilio timeout | Nock delays 30s | Showing still created, SMS queued for retry |
| Resend rate limit | Nock returns 429 | Newsletter marked "retry", not "failed" |
| Anthropic error | Nock returns 500 | AI features show fallback, no crash |
| Google Calendar expired | Nock returns 401 | Token refresh attempted, user notified if fails |
| Network partition | Fetch throws | Offline indicator, local state preserved |

**File pattern:** `tests/resilience/**/*.test.ts`
**Runs at:** G3 (pre-deploy, weekly scheduled)

---

### L8 — Load Testing

**Tools:** k6

**Scenarios:**
| Scenario | Target | Threshold |
|----------|--------|-----------|
| Dashboard load | 50 concurrent users | p95 < 2s |
| Contact search | 100 req/s | p95 < 500ms |
| Listing creation | 20 concurrent | 0 failures |
| Newsletter send | 1000 recipients | Complete in < 5min |
| API auth check | 200 req/s | p95 < 100ms |

**File pattern:** `tests/load/**/*.js` (k6 scripts)
**Runs at:** G3 (pre-deploy, weekly), G4 (release)

---

### L9 — Production Observability

**Tools:** Synthetic monitors (Checkly or custom cron)

**Monitors:**
- Health check endpoint: `/api/health` every 60s
- Login flow: synthetic user every 5min
- Critical API: contacts list, listings list every 2min
- External deps: Supabase connectivity, Twilio status page

**Alerting:** Slack notification on 2+ consecutive failures

**Runs at:** Continuous (production only)

---

## 5 Quality Gates

| Gate | When | What Runs | Pass Criteria |
|------|------|-----------|---------------|
| **G0** | Pre-commit (husky) | L0 (tsc, lint, gitleaks), L1 (affected unit tests) | 0 errors, 0 secrets |
| **G1** | PR opened/updated | L0-L4 full, L6a (axe), L6b (visual diff) | All pass, no new a11y violations |
| **G2** | Merge to `dev` | L0-L6 full (3 browsers) | All pass, visual baselines updated |
| **G3** | Pre-deploy | L5-L8 (full E2E + resilience + load) | p95 thresholds met, 0 critical failures |
| **G4** | Release (`dev` → `main`) | Full suite + manual exploratory | Sign-off from reviewer |

---

## Absolute Rules

1. **Every test has a REQ-ID annotation.** No orphan tests. If a test cannot trace to a requirement, it is deleted or a requirement is created.

2. **Tests never share mutable state.** Each test file creates its own fixtures, cleans up after itself. No implicit ordering.

3. **Flaky tests are quarantined within 24 hours.** A test that fails non-deterministically is moved to `tests/quarantine/` and tracked in `tests/flakes.md`.

4. **The RTM is updated on every PR.** If a feature is added/changed/removed, the Requirements Traceability Matrix is updated in the same PR.

5. **No test is deleted without a log entry.** Removed tests are documented in `tests/removed-tests.md` with rationale.

6. **Mutation score gates merge.** If Stryker mutation score for changed files drops below 80%, the PR is blocked.

---

## Requirements Traceability Matrix (RTM) Format

Location: `docs/testing/rtm.md`

```markdown
| REQ-ID | Requirement | Layer | TC-IDs | Status |
|--------|-------------|-------|--------|--------|
| REQ-AUTH-001 | Demo login grants session | L4, L5 | TC-AUTH-001, TC-E2E-LOGIN-001 | Covered |
| REQ-CONTACT-001 | Create contact with valid data | L1, L4, L5 | TC-UNIT-CONTACT-001, TC-INT-CONTACT-001, TC-E2E-CONTACT-001 | Covered |
| REQ-LISTING-002 | Status transitions follow state machine | L1, L4 | TC-UNIT-STATUS-001, TC-INT-LISTING-002 | Covered |
```

**REQ-ID format:** `REQ-{DOMAIN}-{SEQ}` (e.g., `REQ-SHOWING-003`)
**TC-ID format:** `TC-{LAYER}-{DOMAIN}-{SEQ}` (e.g., `TC-E2E-LISTING-001`)

---

## Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Pyramid ratio** | 70/20/10 (unit/integration/e2e) | Count by layer |
| **RTM completeness** | 100% requirements covered | REQ-IDs without TC-IDs = 0 |
| **Flake rate** | < 1% of runs | Quarantine log entries / total runs |
| **Mutation score** | > 80% on `src/lib/` | Stryker report |
| **Escape rate** | 0 P0/P1 bugs reaching production | Post-mortem count |
| **Test execution time** | G0 < 30s, G1 < 5min, G2 < 15min | CI timing |
| **Coverage (behavioral)** | > 90% of user journeys | RTM audit |

---

## Related Documents

- `docs/testing/adding-a-new-test.md` — Step-by-step new test workflow
- `docs/testing/responding-to-prod-incident.md` — Post-mortem testing framework
- `docs/testing/performing-an-audit.md` — Quarterly audit checklist
- `docs/testing/debugging-a-flake.md` — Flake diagnostic tree
- `docs/testing/updating-on-feature-change.md` — Feature change test update process
- `docs/testing/glossary.md` — Testing terminology reference
- `tests/flakes.md` — Flake tracking log
- `tests/deviations.md` — Deviation log
- `tests/removed-tests.md` — Removed test log
