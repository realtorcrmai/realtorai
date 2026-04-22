---
name: api-integration
description: "L4 API integration testing for Realtors360 server actions and API routes. Trigger on: 'test the API', 'add coverage for this route', 'verify auth on this endpoint', 'server action is buggy', 'webhook isn't processing', 'test RLS isolation', 'write integration tests', 'cron endpoint returns wrong status', 'action doesn't validate input', 'tenant isolation broken', 'test this server action', 'API route returns 500'."
---

# L4 API Integration Testing — Realtors360

## Position in Test Architecture

| Layer | Scope | Example | Mocks |
|-------|-------|---------|-------|
| **L1 Unit** | Zod schemas, pure helpers, formatters | `fuzzy-match.ts`, `cdm-mapper.ts` | Everything |
| **L3 Contract** | API request/response shape | `GET /api/listings` returns `{ data: Listing[] }` | DB + externals |
| **L4 Integration (this)** | Server actions + API routes with real Supabase | `createContact()` inserts row, enforces RLS, fires notification | Only third-party APIs |
| **L5 E2E** | Full browser flows via Playwright | Login → create listing → advance workflow | Nothing |

L4 answers: **does the server action / API route actually do what it should, with a real database?**

---

## Absolute Rules

1. **Never mock Supabase** — use real test DB with `createAdminClient()` for setup/teardown. The admin client bypasses RLS, which is exactly what you need for test fixtures and assertions.

2. **Every server action tested with authenticated AND unauthenticated context** — server actions call `getAuthenticatedTenantClient()` which throws if no session. Test that the throw happens.

3. **Every error branch has a test** — if the action has a `try/catch`, test the catch path. If there is a validation `.parse()`, test invalid input. If there is a status check (`if (!listing)`), test the missing case.

4. **RLS tested explicitly** — User A cannot read/modify User B's data. Create data with `realtor_id = userA`, then query with `realtor_id = userB` context and assert empty/forbidden.

5. **No test asserts only on return value** — also verify DB state via admin client. A server action might return `{ success: true }` but silently skip the INSERT. Always confirm the row exists.

6. **Stubs for third parties, real for Supabase** — Twilio (`src/lib/twilio.ts`), Resend (`src/lib/resend.ts`), Claude AI (`src/lib/anthropic/`), Kling AI (`src/lib/kling/`), Google Calendar (`src/lib/google-calendar.ts`) get stubbed. Supabase is always real.

---

## Task 0 — Discover the Route / Action

Before writing any test, build a per-route inventory document. For every server action or API route under test, extract:

1. **Path / method** (API routes) or **function signature** (server actions)
   - API: `GET /api/contacts?search=&limit=` or `POST /api/webhooks/twilio`
   - Action: `export async function createContact(formData: ContactFormData): Promise<ActionResult>`

2. **Auth check** — how does it get the session?
   - Server actions: `getAuthenticatedTenantClient()` from `src/lib/supabase/tenant.ts`
   - API routes: `getServerSession(authOptions)` or Bearer token (cron endpoints)
   - Webhooks: Twilio signature verification or no auth (public)

3. **Request / input shape** — Zod schema reference, every validation rule
   - Find the Zod schema (usually co-located or in `src/types/`)
   - List every `.min()`, `.max()`, `.email()`, `.optional()`, `.refine()` rule

4. **Response / return shape** — success type and each error type
   - Success: `{ data: Contact }` or `{ success: true, id: string }`
   - Errors: `{ error: string }`, HTTP status codes, thrown exceptions

5. **DB operations** — every Supabase query
   - Table name, operation (select/insert/update/delete), filters, joins
   - Example: `supabase.from('contacts').insert({ ...data, realtor_id }).select().single()`

6. **External service calls** — Twilio sendSMS, Resend send, Claude generate, etc.
   - Which function, what arguments, what happens if it fails

7. **Side effects** — beyond the primary operation
   - `revalidatePath('/contacts')` calls
   - Notification creation via `src/lib/notifications.ts`
   - Communications table logging
   - Speed-to-lead alerts

8. **Error branches** — every throw, catch, early return
   - No session → throw/redirect
   - Validation failure → return error
   - DB error → catch and return
   - External service failure → catch and log

9. **Tenant isolation** — how `realtor_id` is enforced
   - Tenant client auto-injects `.eq('realtor_id', userId)`
   - Manual `.eq('realtor_id', ...)` in some queries
   - Admin client usage (should be rare in user-facing actions)

**Output:** `tests/api/inventory/<route-name>.md` — one file per route/action file.

---

## Task 1 — Bootstrap Test Infrastructure

### Install dependencies

```bash
npm install -D vitest @faker-js/faker
```

### Create test helpers

**`tests/api/helpers/setup.ts`** — Global setup/teardown
- Create two test realtor users (User A and User B) for RLS testing
- Clean up test data after each suite (delete by known test prefixes or IDs)
- Export `testRealtorA`, `testRealtorB` with their IDs

**`tests/api/helpers/db.ts`** — Supabase admin helpers
```ts
import { createAdminClient } from '@/lib/supabase/admin';

export const supabaseAdmin = createAdminClient();

export async function insertTestContact(overrides = {}) {
  const { data } = await supabaseAdmin.from('contacts').insert({
    name: 'Test Contact',
    email: 'test@example.com',
    type: 'buyer',
    realtor_id: testRealtorA.id,
    ...overrides,
  }).select().single();
  return data;
}

export async function cleanupTestData(table: string, ids: string[]) {
  if (ids.length === 0) return;
  await supabaseAdmin.from(table).delete().in('id', ids);
}
```

**`tests/api/helpers/auth.ts`** — Session mocking
- Mock `getServerSession` to return a controlled session object
- Helper to switch between User A, User B, and no-session contexts
- Mock `getAuthenticatedTenantClient()` to return a client scoped to the test user

**`tests/api/helpers/stubs.ts`** — Third-party stubs
```ts
import { vi } from 'vitest';

export function stubTwilio() {
  return vi.mock('@/lib/twilio', () => ({
    sendSMS: vi.fn().mockResolvedValue({ sid: 'SM_test_123' }),
    sendWhatsApp: vi.fn().mockResolvedValue({ sid: 'WA_test_123' }),
  }));
}

export function stubResend() {
  return vi.mock('@/lib/resend', () => ({
    sendEmail: vi.fn().mockResolvedValue({ id: 'email_test_123' }),
  }));
}

export function stubClaude() {
  return vi.mock('@/lib/anthropic/creative-director', () => ({
    generateRemarks: vi.fn().mockResolvedValue({ public: 'Test remarks', realtor: 'Test realtor remarks' }),
  }));
}

export function stubKling() {
  return vi.mock('@/lib/kling', () => ({
    createImageTask: vi.fn().mockResolvedValue({ task_id: 'kling_test_123' }),
    createVideoTask: vi.fn().mockResolvedValue({ task_id: 'kling_test_456' }),
  }));
}

export function stubGoogleCalendar() {
  return vi.mock('@/lib/google-calendar', () => ({
    createEvent: vi.fn().mockResolvedValue({ id: 'gcal_test_123' }),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
  }));
}
```

### npm scripts

Add to `package.json`:
```json
{
  "scripts": {
    "test:api": "vitest run tests/api/",
    "test:api:watch": "vitest watch tests/api/",
    "test:api:coverage": "vitest run tests/api/ --coverage"
  }
}
```

### Vitest config

Create `vitest.config.api.ts` with:
- `resolve.alias` matching `@/` → `src/`
- `test.include` → `['tests/api/**/*.test.ts']`
- `test.setupFiles` → `['tests/api/helpers/setup.ts']`
- `test.testTimeout` → `15000` (DB operations can be slow)

---

## Task 2 — Write Server Action Tests

One spec file per action file. File naming: `tests/api/actions/<action-name>.test.ts`

### Mandatory test sections per action file

#### 1. Auth
```ts
describe('auth', () => {
  it('throws when no session exists', async () => {
    mockNoSession();
    await expect(createContact(validInput)).rejects.toThrow();
  });

  it('scopes queries to authenticated realtor_id', async () => {
    mockSession(testRealtorA);
    const result = await createContact(validInput);
    const { data } = await supabaseAdmin.from('contacts').select().eq('id', result.id).single();
    expect(data.realtor_id).toBe(testRealtorA.id);
  });
});
```

#### 2. Validation — one test per Zod rule
```ts
describe('validation', () => {
  it('rejects empty name', async () => { /* ... */ });
  it('rejects invalid email format', async () => { /* ... */ });
  it('rejects phone without +1 prefix after formatting', async () => { /* ... */ });
  it('accepts valid input with all optional fields', async () => { /* ... */ });
});
```

#### 3. Happy paths — per valid input variant
```ts
describe('happy paths', () => {
  it('creates buyer contact with minimal fields', async () => { /* ... */ });
  it('creates seller contact with all fields', async () => { /* ... */ });
  it('updates existing contact', async () => { /* ... */ });
});
```

#### 4. RLS / Tenant isolation
```ts
describe('tenant isolation', () => {
  it('User A cannot read User B contacts', async () => {
    const contact = await insertTestContact({ realtor_id: testRealtorB.id });
    mockSession(testRealtorA);
    const result = await getContacts();
    expect(result.find(c => c.id === contact.id)).toBeUndefined();
  });

  it('User A cannot update User B contact', async () => {
    const contact = await insertTestContact({ realtor_id: testRealtorB.id });
    mockSession(testRealtorA);
    await expect(updateContact(contact.id, { name: 'Hacked' })).rejects.toThrow();
    // Verify unchanged via admin
    const { data } = await supabaseAdmin.from('contacts').select().eq('id', contact.id).single();
    expect(data.name).not.toBe('Hacked');
  });
});
```

#### 5. Business logic — status transitions, quotas, uniqueness
```ts
describe('business logic', () => {
  it('listing status follows valid transitions: active → conditional', async () => { /* ... */ });
  it('rejects invalid transition: sold → active', async () => { /* ... */ });
  it('workflow phase advances sequentially', async () => { /* ... */ });
});
```

#### 6. DB writes — confirm row via admin client
```ts
describe('db writes', () => {
  it('inserts contact with correct fields', async () => {
    const result = await createContact(validInput);
    const { data } = await supabaseAdmin.from('contacts').select('*').eq('id', result.id).single();
    expect(data).toMatchObject({
      name: validInput.name,
      email: validInput.email,
      type: validInput.type,
      realtor_id: testRealtorA.id,
    });
  });
});
```

#### 7. External calls — stubs captured the call
```ts
describe('external calls', () => {
  it('sends SMS via Twilio when showing confirmed', async () => {
    const { sendSMS } = await import('@/lib/twilio');
    await confirmShowing(showingId);
    expect(sendSMS).toHaveBeenCalledWith(
      expect.objectContaining({ to: sellerPhone, body: expect.stringContaining('confirmed') })
    );
  });
});
```

#### 8. Error responses — each catch branch
```ts
describe('errors', () => {
  it('returns error when listing not found', async () => {
    const result = await getListingById('nonexistent-uuid');
    expect(result).toEqual({ error: expect.any(String) });
  });

  it('handles Supabase error gracefully', async () => {
    // Force a constraint violation
    const result = await createContact({ ...validInput, email: null as any });
    expect(result.error).toBeDefined();
  });
});
```

#### 9. Side effects — notifications, communications, revalidation
```ts
describe('side effects', () => {
  it('creates speed-to-lead notification on new contact', async () => {
    const result = await createContact(validInput);
    const { data: notifs } = await supabaseAdmin.from('notifications')
      .select().eq('related_id', result.id).eq('type', 'speed_to_lead');
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });

  it('logs communication when SMS sent', async () => {
    await sendMessageToContact(contactId, 'Hello');
    const { data: comms } = await supabaseAdmin.from('communications')
      .select().eq('contact_id', contactId).eq('channel', 'sms');
    expect(comms.length).toBeGreaterThanOrEqual(1);
  });
});
```

### Priority action files to test first

| Priority | File | Why |
|----------|------|-----|
| P0 | `src/actions/contacts.ts` | Core CRUD, speed-to-lead, RLS critical |
| P0 | `src/actions/listings.ts` | Core CRUD, status transitions |
| P0 | `src/actions/showings.ts` | Twilio integration, status workflow |
| P1 | `src/actions/workflow.ts` | Phase advancement, audit trail |
| P1 | `src/actions/newsletters.ts` | Resend integration, approval flow |
| P2 | `src/actions/enrichment.ts` | External BC APIs, JSONB updates |
| P2 | `src/actions/journeys.ts` | Phase logic, enrollment |

---

## Task 3 — Write API Route Tests

Similar structure to Task 2 but using `fetch` against the Next.js dev server or `next/test-utils`.

### GET endpoints with query params

```ts
describe('GET /api/contacts', () => {
  it('returns contacts scoped to authenticated user', async () => { /* ... */ });
  it('search param filters by name', async () => {
    const res = await fetch('/api/contacts?search=Jane&limit=10');
    const { data } = await res.json();
    expect(data.every(c => c.name.includes('Jane'))).toBe(true);
  });
  it('limit param caps results (parseInt NaN guard)', async () => {
    const res = await fetch('/api/contacts?limit=notanumber');
    expect(res.status).toBe(200); // should not crash
  });
  it('sanitizes quotes in search param', async () => {
    const res = await fetch("/api/contacts?search=O'Brien");
    expect(res.status).toBe(200);
  });
});
```

### Cron endpoints — Bearer token auth

```ts
describe('cron auth', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await fetch('/api/cron/process-workflows', { method: 'POST' });
    expect(res.status).toBe(401);
  });
  it('returns 401 with invalid token', async () => {
    const res = await fetch('/api/cron/process-workflows', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-token' },
    });
    expect(res.status).toBe(401);
  });
  it('returns 200 with valid CRON_SECRET', async () => {
    const res = await fetch('/api/cron/process-workflows', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(res.status).toBe(200);
  });
});
```

### Form generation proxy

```ts
describe('POST /api/forms/generate', () => {
  it('maps listing to CDM payload correctly', async () => { /* ... */ });
  it('returns HTML for valid DORTS form request', async () => { /* ... */ });
  it('returns error for unknown form type', async () => { /* ... */ });
  it('handles form server unavailable gracefully', async () => { /* ... */ });
});
```

---

## Task 4 — Write Webhook Tests

### Twilio inbound SMS (`/api/webhooks/twilio`)

```ts
describe('Twilio webhook', () => {
  it('rejects request without valid Twilio signature', async () => {
    const res = await fetch('/api/webhooks/twilio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'From=%2B16045551234&Body=YES',
    });
    expect(res.status).toBe(403);
  });

  it('processes YES response — updates showing to confirmed', async () => {
    const showing = await insertTestShowing({ status: 'pending' });
    await simulateTwilioWebhook({ From: sellerPhone, Body: 'YES' });
    const { data } = await supabaseAdmin.from('appointments')
      .select().eq('id', showing.id).single();
    expect(data.status).toBe('confirmed');
  });

  it('processes NO response — updates showing to denied', async () => {
    const showing = await insertTestShowing({ status: 'pending' });
    await simulateTwilioWebhook({ From: sellerPhone, Body: 'NO' });
    const { data } = await supabaseAdmin.from('appointments')
      .select().eq('id', showing.id).single();
    expect(data.status).toBe('denied');
  });

  it('logs inbound message to communications table', async () => {
    await simulateTwilioWebhook({ From: sellerPhone, Body: 'YES' });
    const { data } = await supabaseAdmin.from('communications')
      .select().eq('channel', 'sms').eq('direction', 'inbound')
      .order('created_at', { ascending: false }).limit(1);
    expect(data[0].body).toBe('YES');
  });

  it('sends lockbox code SMS after confirmation', async () => {
    const { sendSMS } = await import('@/lib/twilio');
    await simulateTwilioWebhook({ From: sellerPhone, Body: 'YES' });
    expect(sendSMS).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('lockbox') })
    );
  });

  it('handles unknown phone number gracefully', async () => {
    const res = await simulateTwilioWebhook({ From: '+19999999999', Body: 'YES' });
    expect(res.status).not.toBe(500); // should not crash
  });
});
```

---

## Task 5 — Debug Failing Tests

When a test fails, follow this sequence:

1. **Read the error** — full stack trace, not just the assertion message
2. **Check the inventory** (Task 0 output) — is the test expectation matching the actual implementation?
3. **Query the DB directly** via admin client — is the data there but in unexpected shape?
4. **Check auth context** — is the session mock returning the right `realtor_id`?
5. **Check RLS** — if query returns empty, try same query with admin client. If admin returns data, RLS is blocking.
6. **Check side effects timing** — some side effects (notifications, communications) may be async. Add small delay or poll.
7. **Check stub setup** — is the mock in place before the action runs? `vi.mock()` must be at module level.

Common Realtors360-specific gotchas:
- `getAuthenticatedTenantClient()` caches the session — clear between test cases
- Phone numbers must have `+1` prefix — Twilio helpers auto-format
- `revalidatePath` throws in test context — stub `next/cache`
- JSONB columns (`forms_status`, `envelopes`, `listing_enrichment.enrich_status`) need deep matching
- `is_sample` flag on seed data — exclude from test queries with `.eq('is_sample', false)` or use admin cleanup

---

## 4-Layer Assertion Pattern

Every L4 test MUST assert across these four layers:

```ts
test('REQ-CONTACT-001 api-cc-001: creates contact with valid input @p0', async () => {
  // Arrange
  mockSession(testRealtorA);
  const input = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    type: 'buyer',
    phone: '+16045551234',
  };

  // Act
  const result = await createContact(input);

  // Layer 1: Return value assertion
  expect(result.id).toBeDefined();
  expect(result.name).toBe('Jane Doe');

  // Layer 2: DB state assertion (via admin client bypassing RLS)
  const { data } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('id', result.id)
    .single();
  expect(data).toMatchObject({
    name: 'Jane Doe',
    email: 'jane@example.com',
    type: 'buyer',
    realtor_id: testRealtorA.id,
  });

  // Layer 3: External calls assertion
  // N/A for basic create — no Twilio/Resend calls

  // Layer 4: Side effects assertion
  const { data: notifications } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('related_id', result.id)
    .eq('type', 'speed_to_lead');
  expect(notifications).toHaveLength(1); // speed-to-lead alert
});
```

---

## Realtors360-Specific Patterns

### Tenant client scoping
Server actions use `getAuthenticatedTenantClient()` which returns a Supabase client that automatically appends `.eq('realtor_id', userId)` to every query. Tests must verify this scoping works — not just that the action returns data, but that it returns ONLY the authenticated user's data.

### Cron endpoint auth
Cron endpoints at `/api/cron/*` (process-workflows, daily-digest, consent-expiry) use Bearer token auth:
```ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
Test all three states: valid token, invalid token, missing header.

### Form generation proxy
`/api/forms/generate/` proxies to the Python form server at `REALTORS360_URL`. Tests should:
- Verify CDM payload mapping via `src/lib/cdm-mapper.ts`
- Stub the Python server response
- Test all 12 form types: DORTS, MLC, PDS, FINTRAC, PRIVACY, C3, DRUP, MLS_INPUT, MKTAUTH, AGENCY, C3CONF, FAIRHSG

### Twilio webhook processing
`/api/webhooks/twilio/` processes inbound SMS for showing confirmation:
- Matches `From` number to a seller contact
- Parses `Body` for YES/NO
- Updates `appointments` table status
- Sends lockbox code on YES
- Logs to `communications` table

### Communications table logging
Most mutations log to the `communications` table:
- `contact_id` — the affected contact
- `direction` — 'inbound' or 'outbound'
- `channel` — 'sms', 'whatsapp', 'email', 'system'
- `body` — message content
- `related_id` — FK to the triggering entity (showing, listing, etc.)

Always verify communications rows are created as a side effect.

### Test naming convention
```
REQ-<ENTITY>-<NNN> api-<prefix>-<NNN>: <description> @p<priority>
```
- `REQ-CONTACT-001 api-cc-001: creates contact with valid input @p0`
- `REQ-LISTING-003 api-ll-003: rejects invalid status transition @p0`
- `REQ-SHOWING-002 api-sh-002: sends SMS on confirmation @p1`
- `REQ-WEBHOOK-001 api-wh-001: processes YES response @p0`
- `REQ-CRON-001 api-cr-001: rejects missing auth header @p0`
