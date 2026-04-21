---
name: testing
description: Write, organize, and maintain tests for Realtors360 CRM following the 9-layer zero-regression architecture
user_invocable: true
---

# Testing Skill — Realtors360 Zero-Regression System

Write tests for Realtors360 CRM following the 9-layer test pyramid, RTM traceability, and quality gate enforcement.

## Before ANY Test Work

1. **Read `TESTING.md`** at repo root — the 10 rules, the layer table, the preflight command.
2. **Run preflight**: `./scripts/preflight.sh`
3. **Open `tests/rtm.yaml`** — find or create the REQ-ID(s) your test covers.

---

## How to Write a Test — Step by Step

### Step 1: Identify the Layer

```
Pure function / validator / formatter?        -> L1 unit     (src/__tests__/)
React component render / interaction?         -> L2 component (src/components/**/*.test.tsx)
API contract / Zod schema shape?              -> L3 contract  (tests/contract/)
Server action / API route with DB?            -> L4 integration (tests/integration/)
Full browser user journey?                    -> L5 E2E       (tests/browser/)
Accessibility / keyboard / screen reader?     -> L6a a11y     (tests/browser/accessibility/)
```

**Default to the lowest layer that can catch the bug.** E2E is a last resort.

### Step 2: Create RTM Entry

Add to `tests/rtm.yaml` under the correct area:

```yaml
- id: REQ-AREA-NNN
  description: What the system must do
  priority: P0  # P0=ship-blocker, P1=important, P2=nice-to-have
  acceptance: How to verify it works
  tests: []  # Will be filled after writing the test
```

### Step 3: Pick the Template

Copy the appropriate template from `tests/templates/`:

| Layer | Template | Placement |
|-------|----------|-----------|
| L1 | `unit.template.test.ts` | `src/__tests__/<module>.test.ts` |
| L2 | `component.template.spec.tsx` | `src/components/<name>/<name>.test.tsx` |
| L3 | `contract.template.spec.ts` | `tests/contract/<resource>.spec.ts` |
| L4 | `server-action.template.spec.ts` | `tests/integration/<action>.spec.ts` |
| L5 | `e2e-process.template.spec.ts` | `tests/browser/journeys/<process>.spec.ts` |
| L6a | `a11y.template.spec.ts` | `tests/browser/accessibility/<page>.spec.ts` |

### Step 4: Write the Test

**Title format (mandatory):**
```typescript
it('REQ-AUTH-001 TC-LI-001: demo user can log in with credentials @p0 @auth', async () => {
```

**For state-mutating tests, use 3-layer assertions:**
```typescript
// --- Response ---
expect(result.data).toMatchObject({ id: expect.any(String), name: 'Test' });

// --- Database ---
const { data: row } = await supabaseAdmin.from('contacts').select().eq('id', result.data.id).single();
expect(row.name).toBe('Test');

// --- Side effects ---
// N/A: create contact has no external side effects
```

**For tenant-scoped data, add RLS assertion:**
```typescript
// --- RLS isolation ---
const { data: leaked } = await tenantClientB.from('contacts').select().eq('id', result.data.id);
expect(leaked).toHaveLength(0);  // User B cannot see User A's data
```

### Step 5: Update RTM

After the test passes, update `tests/rtm.yaml`:

```yaml
tests:
  - id: TC-LI-001
    file: tests/integration/contacts-create.spec.ts
    layer: L4
```

### Step 6: Run & Verify

```bash
# Unit/component/contract/integration
npx vitest run <path-to-test-file>

# E2E
npx playwright test <path-to-test-file>

# Run 3 times to confirm no flakiness
npx vitest run <path> && npx vitest run <path> && npx vitest run <path>
```

---

## Realtors360-Specific Testing Patterns

### Testing Server Actions (L4)

Server actions in `src/actions/*.ts` are the primary mutation path. Test pattern:

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { createServerClient } from '@supabase/ssr';

describe('createContact server action', () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    // Clean up test data
    for (const id of createdIds) {
      await supabaseAdmin.from('contacts').delete().eq('id', id);
    }
    createdIds.length = 0;
  });

  it('REQ-CONTACT-001 TC-CC-001: creates contact with required fields @p0', async () => {
    // Call the server action directly (import from src/actions/contacts.ts)
    // Assert response, DB state, and side effects
  });
});
```

### Testing Supabase RLS (L4)

```typescript
it('REQ-RLS-001 TC-RL-001: tenant A cannot read tenant B contacts @p0 @security', async () => {
  // Create contact as User A
  const { data: contact } = await tenantClientA
    .from('contacts').insert({ name: 'Secret', realtor_id: userAId }).select().single();

  // Attempt read as User B
  const { data: leaked } = await tenantClientB
    .from('contacts').select().eq('id', contact.id);

  expect(leaked).toHaveLength(0);
});
```

### Testing Cron Endpoints (L4)

```typescript
it('REQ-CRON-001 TC-CR-001: cron endpoint rejects missing Bearer token @p0 @security', async () => {
  const res = await fetch('http://localhost:3000/api/cron/process-workflows');
  expect(res.status).toBe(401);
});

it('REQ-CRON-002 TC-CR-002: cron endpoint accepts valid CRON_SECRET @p0', async () => {
  const res = await fetch('http://localhost:3000/api/cron/process-workflows', {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  });
  expect(res.status).toBe(200);
});
```

### Testing Twilio Webhooks (L4)

```typescript
it('REQ-SHOW-005 TC-TW-001: Twilio YES webhook confirms showing @p0', async () => {
  // POST to /api/webhooks/twilio with Twilio signature
  // Assert: appointment status = 'confirmed' in DB
  // Assert: lockbox code SMS sent (nock stub consumed)
});
```

### Testing Email Pipeline (L1 + L4)

```typescript
// L1: Unit test email-blocks.ts
it('REQ-NEWS-001 TC-EB-001: NewListingAlert block renders valid HTML @p1', () => {
  const html = renderBlock('new-listing-alert', { listings: mockListings });
  expect(html).toContain('<table');  // email-safe HTML
  expect(html).not.toContain('<div');  // no divs in email
});

// L4: Integration test newsletter send
it('REQ-NEWS-002 TC-NS-001: newsletter send calls Resend with correct payload @p0', async () => {
  // nock stub for Resend
  // Call sendNewsletter action
  // Assert: Resend called with correct to/subject/html
  // Assert: newsletter_events row created
});
```

---

## Test Infrastructure

### Helpers Location

| Helper | Path | Purpose |
|--------|------|---------|
| Auth helpers | `tests/helpers/auth-helpers.ts` | Mint sessions, get tenant clients |
| DB helpers | `tests/helpers/db-helpers.ts` | Supabase admin client, cleanup utilities |
| Stubs | `tests/helpers/stubs.ts` | nock stubs for Twilio, Resend, Anthropic, Kling |
| Factories | `tests/helpers/factories.ts` | Create test contacts, listings, showings |

### Test Data Cleanup

**Every test cleans up after itself.** Pattern:

```typescript
const cleanup: Array<{ table: string; id: string }> = [];

afterEach(async () => {
  for (const { table, id } of cleanup.reverse()) {
    await supabaseAdmin.from(table).delete().eq('id', id);
  }
  cleanup.length = 0;
});
```

### Stubbing External Services

```typescript
import nock from 'nock';

// Twilio SMS
nock('https://api.twilio.com')
  .post(/\/Messages\.json$/)
  .reply(201, { sid: 'SM_test', status: 'queued' });

// Resend Email
nock('https://api.resend.com')
  .post('/emails')
  .reply(200, { id: 'email_test' });

// Anthropic Claude
nock('https://api.anthropic.com')
  .post('/v1/messages')
  .reply(200, { content: [{ type: 'text', text: 'AI response' }] });
```

---

## File Placement Rules

```
src/
  __tests__/                    # L1 unit tests
    lib/                        # Tests for src/lib/*.ts
    utils/                      # Tests for utility functions
  components/
    contacts/
      ContactForm.test.tsx      # L2 component test (co-located)

tests/
  browser/                      # L5 E2E (Playwright)
    journeys/                   # Full user flows
    accessibility/              # L6a axe-core tests
    components/                 # Component-level browser tests
    security/                   # Auth isolation tests
    performance/                # Page load timing
    visual/                     # Screenshot comparison
  contract/                     # L3 contract tests
  integration/                  # L4 server action + API tests
    rls/                        # Multi-tenant isolation tests
  helpers/                      # Shared test utilities
  templates/                    # Test templates (copy, don't import)
  rtm.yaml                     # Requirements Traceability Matrix
  flakes.md                    # Flaky test registry
  deviations.md                # Intentional spec deviations
  removed-tests.md             # Why tests were removed
```

---

## Priority Tags

- `@p0` — Ship-blocker. Auth, data integrity, payment, compliance. Must pass at G1.
- `@p1` — Important. Core CRUD, workflow, notifications. Must pass at G2.
- `@p2` — Nice-to-have. UI polish, edge cases, performance. Must pass at G3.

---

## RTM Areas for Realtors360

| Area ID | Scope |
|---------|-------|
| AUTH | Login, logout, session, OAuth, cron auth |
| CONTACT | Contact CRUD, bulk ops, CSV, preview |
| LISTING | Listing CRUD, status transitions, workflow phases |
| SHOWING | Showing request, confirm/deny, Twilio SMS |
| WORKFLOW | 8-phase advancement, phase validation |
| ENRICHMENT | BC Geocoder, ParcelMap, LTSA, Assessment |
| FORMS | BCREA form generation, CDM mapping |
| CALENDAR | Google Calendar sync, availability |
| CONTENT | AI remarks, Kling video/image, prompts |
| NEWSLETTER | Email pipeline, journeys, analytics |
| NOTIFICATION | In-app notifications, speed-to-lead |
| RLS | Multi-tenant isolation, realtor_id scoping |
| CRON | Cron endpoint auth, process-workflows, digest |
| NAV | Page routes return 200, redirects work |
| A11Y | WCAG AA, keyboard nav, screen reader |

---

## Common Mistakes to Avoid

1. **Writing E2E when unit would do** — If you're testing a pure function through the browser, push it down to L1.
2. **Mocking Supabase** — Use real DB. Mocks hide RLS bugs.
3. **Forgetting cleanup** — Test pollution is the #1 flake source.
4. **Using `page.waitForTimeout()`** — Use auto-retrying assertions instead.
5. **Tests from memory** — Always read the source code first. Verify selectors, field names, API paths exist.
6. **Missing RTM entry** — No test without a requirement. No requirement without a test.
7. **Weak assertions** — `toBeTruthy()` catches nothing. Assert specific values.
8. **Hardcoded IDs** — Use generated UUIDs. Hardcoded IDs collide in parallel runs.

---

## Running Tests

```bash
# Smoke (existing 73+ tests)
bash scripts/test-suite.sh

# Unit tests (fast)
npm run test:quick

# Specific unit test
npx vitest run src/__tests__/lib/email-blocks.test.ts

# All E2E
npm run test:e2e

# P0 E2E only
npm run test:e2e:p0

# Contract tests
npm run test:contract

# Integration tests
npm run test:integration

# Accessibility
npm run test:a11y

# RTM audit
npm run test:rtm

# Full preflight
./scripts/preflight.sh
```
