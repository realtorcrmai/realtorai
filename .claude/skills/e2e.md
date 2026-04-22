---
name: e2e
description: |
  Playwright end-to-end testing for Realtors360 CRM. Triggers on: "test this flow",
  "add E2E coverage", "make sure X works end to end", "write a Playwright test",
  "E2E test the listing workflow", "verify this feature in the browser",
  "automate this user journey", "add integration test for [feature]".
  Covers the full discovery-to-implementation pipeline: inventory the process from
  source code, build a coverage matrix, get approval, then write layered Playwright
  tests that validate UI state, DB state (Supabase), integration stubs, and side effects.
user_invocable: false
---

# Realtors360 E2E Testing Skill (Playwright)

## Absolute Rules

1. **Never write a test from memory.** Every selector, every route, every field name must come from actual source code read in this session. If you have not read the component file, you do not know the selector.

2. **Never write tests before completing the coverage matrix.** Task 0 (Plan) must finish and receive user approval before any test code is written.

3. **One process, one file.** Each logical process gets its own spec file (e.g., `create-listing.spec.ts`, `edit-contact.spec.ts`, `showing-lifecycle.spec.ts`). Never mix unrelated flows.

4. **Exhaustive enumeration, not representative sampling.** If a form has 8 required fields, test all 8 — not "a couple". If a status can transition through 6 states, cover all 6 transitions.

5. **Validate all four layers** in every state-mutating test:
   - **UI state** — what the user sees after the action (toasts, redirects, table rows, badges)
   - **DB state** — query Supabase via `createAdminClient()` to confirm the row exists/changed
   - **Integration calls** — stub external services and assert they were called with correct args
   - **Side effects** — notifications created, emails queued, SMS sent, calendar events made

6. **No hallucination recovery.** If you are unsure what a button does, what a field is named, or how a flow works — go back to discovery (Task 0a). Do not guess.

---

## Task 0: Plan (Discovery + Matrix)

### 0a: Discover the Process

Read all source code involved in the process under test. Output an inventory file at `tests/e2e/coverage/<process>.inventory.md`.

**Discovery checklist — read these in order:**

1. **Page component** — `src/app/(dashboard)/<route>/page.tsx` and any `[id]/page.tsx` variants
2. **Client components** — every component imported by the page (check `src/components/<feature>/`)
3. **Server actions** — `src/actions/<feature>.ts` — every exported function, its params, its DB queries, its revalidation calls
4. **API routes** — `src/app/api/<feature>/route.ts` — request/response shape, auth checks
5. **Supabase schema** — table structure from `src/types/database.ts`, relevant migrations in `supabase/migrations/`
6. **External service calls** — Twilio (`src/lib/twilio.ts`), Resend (`src/lib/resend.ts`), Claude AI (`src/lib/anthropic/`), Kling AI (`src/lib/kling/`), Google Calendar (`src/lib/google-calendar.ts`)
7. **RLS / tenant isolation** — confirm `realtor_id` scoping in server actions via `getAuthenticatedTenantClient()`
8. **UI components** — PageHeader props, DataTable columns, form fields (React Hook Form + Zod schemas), dialog/sheet triggers
9. **Workflow logic** — for listing workflow, read `src/actions/workflow.ts` and `src/components/workflow/` phase components

**Inventory file format:**
```markdown
# Process: <name>
## Pages: <list of routes>
## Components: <list of files read>
## Server Actions: <function signatures>
## API Routes: <endpoints>
## DB Tables: <tables touched, key columns>
## External Services: <which ones, what they do>
## RLS: <how tenant isolation works>
## Form Fields: <every field with type and validation>
## State Transitions: <valid status changes>
```

### 0b: Enumerate Scenarios into Matrix

Create `tests/e2e/coverage/<process>.matrix.md` with columns:

| ID | Priority | Scenario | Preconditions | Steps | UI Assertion | DB Assertion | Integration Assertion | Side-Effect Assertion | Status |
|----|----------|----------|---------------|-------|--------------|--------------|----------------------|----------------------|--------|

**Scenario categories to cover:**

- **Happy path** — standard successful flow with valid data
- **Field validation** — each required field left blank, each field with invalid format
- **Boundary values** — min/max lengths, zero, negative numbers, future/past dates
- **Character edge cases** — Unicode, emoji, SQL injection strings, XSS payloads, very long strings
- **Error states** — network failure, server 500, Supabase constraint violation, duplicate entry
- **Permission / tenant isolation** — User A cannot see/edit/delete User B's records (`realtor_id` mismatch)
- **Integration points** — external service success, failure, timeout (Twilio, Resend, Claude AI, Kling, Google Calendar)
- **Concurrency** — double-submit prevention, stale data update
- **Navigation edge cases** — back button after submit, refresh mid-form, direct URL access
- **Visual state transitions** — loading spinners, disabled buttons during submit, toast appearance/dismissal, badge color changes

**Priority levels:**
- `@p0` — Critical path, blocks release (happy path, data integrity, auth)
- `@p1` — Important edge cases (validation, error states, tenant isolation)
- `@p2` — Nice-to-have coverage (concurrency, character edge cases, visual transitions)

### 0c: Review Gate

Present the matrix to the user. Do NOT proceed to Task 1 or Task 2 until the user approves the matrix. Ask explicitly: "Coverage matrix ready. Approve to proceed?"

---

## Task 1: Bootstrap

If the project does not already have Playwright configured, set it up:

### Install Dependencies

```bash
npm install -D @playwright/test @faker-js/faker
npx playwright install chromium
```

### playwright.config.ts

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
```

### Auth Setup — tests/e2e/auth.setup.ts

```ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate via demo login', async ({ page }) => {
  await page.goto('/login');
  // Use DEMO_EMAIL / DEMO_PASSWORD from env or fill demo credentials
  await page.getByLabel(/email/i).fill(process.env.DEMO_EMAIL || 'demo@realtors360.com');
  await page.getByLabel(/password/i).fill(process.env.DEMO_PASSWORD || 'demo123');
  await page.getByRole('button', { name: /sign in|log in|demo/i }).click();
  // Wait for redirect to dashboard
  await page.waitForURL('**/');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```

**Important:** Read the actual login page (`src/app/(auth)/login/page.tsx`) to confirm the exact form fields and button labels before finalizing auth setup. The snippet above is a starting template — adapt selectors to match actual source.

### Helpers — tests/e2e/helpers/supabase.ts

```ts
import { createClient } from '@supabase/supabase-js';

// Admin client for DB assertions — bypasses RLS
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Helpers — tests/e2e/helpers/stubs.ts

Template for stubbing external services via route interception:

```ts
import { Page } from '@playwright/test';

export async function stubTwilio(page: Page) {
  await page.route('**/api/twilio/**', route =>
    route.fulfill({ status: 200, body: JSON.stringify({ success: true, sid: 'SM_STUB' }) })
  );
}

export async function stubResend(page: Page) {
  await page.route('**/api/resend/**', route =>
    route.fulfill({ status: 200, body: JSON.stringify({ id: 'email_stub_id' }) })
  );
}

export async function stubClaudeAI(page: Page) {
  await page.route('**/api/mls-remarks/**', route =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({ publicRemarks: 'Stub remarks', realtorRemarks: 'Stub realtor remarks' }),
    })
  );
}

export async function stubKlingAI(page: Page) {
  await page.route('**/api/kling/**', route =>
    route.fulfill({ status: 200, body: JSON.stringify({ taskId: 'kling_stub', status: 'completed' }) })
  );
}
```

### npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "npx playwright test",
    "test:e2e:ui": "npx playwright test --ui",
    "test:e2e:debug": "npx playwright test --debug",
    "test:e2e:p0": "npx playwright test --grep @p0"
  }
}
```

### Directory Structure

```
tests/
  e2e/
    .auth/
      user.json          (gitignored — auth state)
    coverage/
      <process>.inventory.md
      <process>.matrix.md
    helpers/
      supabase.ts
      stubs.ts
    auth.setup.ts
    create-listing.spec.ts
    edit-contact.spec.ts
    showing-lifecycle.spec.ts
    ...
```

Add to `.gitignore`:
```
tests/e2e/.auth/
```

---

## Task 2: Implement Planned Tests

### Rules

- **One `test()` per matrix row.** Title format: `REQ-<FEATURE>-<NNN> TC-<CODE>-<NNN>: <description> @p<N>`
- **Priority tags** in the test title: `@p0`, `@p1`, `@p2`
- **Four-layer assertions** in every state-mutating test:

```ts
test('REQ-LISTING-001 TC-LC-001: creates listing with valid address @p0', async ({ page }) => {
  const address = faker.location.streetAddress();

  // --- Act ---
  await page.goto('/listings');
  await page.getByRole('button', { name: /add listing|new listing/i }).click();
  await page.getByLabel(/address/i).fill(address);
  // ... fill other required fields (read from ListingForm component) ...
  await page.getByRole('button', { name: /save|create/i }).click();

  // --- UI assertion ---
  await expect(page.getByText(/listing created|success/i)).toBeVisible();

  // --- DB assertion ---
  const { data } = await supabaseAdmin
    .from('listings')
    .select()
    .eq('address', address)
    .single();
  expect(data).toMatchObject({
    address,
    status: 'active',
    realtor_id: expect.any(String),
  });

  // --- Integration assertion ---
  // N/A for basic create

  // --- Side-effect assertion ---
  // N/A for basic create
});
```

- **No `page.waitForTimeout()`** — use `waitForURL`, `waitForResponse`, or `expect().toBeVisible()` instead
- **No per-test login** — auth state is shared via `storageState` from `auth.setup.ts`
- **Max ~40 lines per test** — extract shared steps into helper functions
- **Anti-hallucination check** — before using any selector, confirm it exists in the source code read during Task 0a. If the selector is not in the inventory, re-read the component file.

### Selector Strategy (Priority Order)

1. `getByRole()` — buttons, headings, links, textboxes (most resilient)
2. `getByLabel()` — form inputs via associated label
3. `getByText()` — visible text content
4. `getByTestId()` — `data-testid` attributes (add if needed, prefer `data-tour` attributes already in codebase)
5. `locator('[data-tour="..."]')` — existing `data-tour` attributes from onboarding system

### Realtors360-Specific Patterns

**PageHeader assertions:**
```ts
await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Listings/i);
```

**DataTable row assertions:**
```ts
const row = page.getByRole('row').filter({ hasText: expectedValue });
await expect(row).toBeVisible();
```

**shadcn Dialog/Sheet:**
```ts
// Dialogs use role="dialog"
await expect(page.getByRole('dialog')).toBeVisible();
// Sheets (slide-over panels) also use role="dialog"
```

**Toast notifications:**
```ts
// shadcn toasts — check for toast container
await expect(page.locator('[data-sonner-toaster]').getByText(/success/i)).toBeVisible();
```

**Multi-tenancy test pattern:**
```ts
test('REQ-AUTH-001 TC-ISO-001: cannot access another realtor\'s listing @p1', async ({ page }) => {
  // Get a listing owned by a different realtor via admin client
  const { data: otherListing } = await supabaseAdmin
    .from('listings')
    .select('id, realtor_id')
    .neq('realtor_id', testRealtorId)
    .limit(1)
    .single();

  if (!otherListing) return test.skip();

  await page.goto(`/listings/${otherListing.id}`);
  // Should see 404 or redirect, NOT the listing data
  await expect(page.getByText(otherListing.id)).not.toBeVisible();
});
```

**Listing workflow phase test pattern:**
```ts
test('REQ-WF-001 TC-WF-001: advances from Phase 1 to Phase 2 @p0', async ({ page }) => {
  await page.goto(`/listings/${testListingId}/workflow`);
  // Phase 1 — Seller Intake should be active
  await expect(page.getByText(/seller intake/i)).toBeVisible();
  // Complete required fields, click advance
  // ... (read Phase1 component for exact fields)
  await page.getByRole('button', { name: /next|advance|continue/i }).click();
  // Phase 2 should now be active
  await expect(page.getByText(/data enrichment/i)).toBeVisible();
});
```

### Cleanup

Every test that creates data must clean it up:

```ts
test.afterEach(async () => {
  if (createdListingId) {
    await supabaseAdmin.from('listings').delete().eq('id', createdListingId);
  }
});
```

---

## Task 3: Debug

When a test fails:

1. **Trace first** — run with `--trace on`, open the trace viewer: `npx playwright show-trace trace.zip`
2. **Diagnose second** — check:
   - Is the selector correct? Re-read the component source.
   - Is the page in the expected state? Check screenshots in `test-results/`.
   - Is the data in the expected state? Query Supabase manually.
   - Is the dev server running and healthy?
3. **Fix third** — update the test OR the application code, not both at the same time.

**If a selector does not match:** the discovery from Task 0a is stale. Re-read the component file and update the inventory before fixing the test.

**Common issues in Realtors360:**
- Form submissions trigger server actions, not API calls — `waitForResponse` will not work; use `waitForURL` or visible success indicators instead
- DataTable uses TanStack React Table — rows are virtualized on large datasets
- PageHeader tabs use `role="tab"` — use `getByRole('tab', { name: /.../ })` to click them
- Dialogs from shadcn use Radix — they portal to `<body>`, so scope selectors to `page.getByRole('dialog')`

---

## Task 4: Audit

After tests are written:

1. **Diff test IDs against matrix** — extract all `TC-*` IDs from spec files, compare against the matrix
2. **Flag gaps by priority** — any `@p0` scenario without a test is a blocker
3. **Report coverage** — output a summary:
   ```
   Matrix: 42 scenarios (18 @p0, 15 @p1, 9 @p2)
   Tests:  40 implemented (18 @p0, 14 @p1, 8 @p2)
   Gaps:   TC-VAL-015 (@p1), TC-NAV-009 (@p2)
   ```
4. **Check for orphan tests** — any test not in the matrix should be added to the matrix or deleted

---

## Critical Paths for Realtors360

These are the highest-priority processes to cover with E2E tests:

1. **Listing CRUD + Workflow** — create listing, advance through 8 phases, verify each phase's data persists
2. **Contact CRUD** — create, edit, delete, verify cascade to communications, verify tenant isolation
3. **Showing Lifecycle** — request showing, seller confirmation (Twilio stub), calendar event creation, status transitions
4. **Newsletter Send** — create newsletter, approve, send (Resend stub), verify events tracked
5. **Dashboard Widgets** — ActivityFeed, TodaysPriorities, PipelineWidget render correctly with data
6. **Auth + Tenant Isolation** — demo login works, realtor_id scoping enforced, no cross-tenant data leaks
7. **Form Generation** — BCREA form generation via Python server (stub the server, verify CDM payload)
8. **AI Content** — MLS remarks generation, Kling image/video generation (stub Claude + Kling APIs)
