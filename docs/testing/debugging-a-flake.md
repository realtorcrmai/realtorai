# Debugging a Flaky Test

## Definition

A flaky test is one that passes and fails non-deterministically on the same code. It erodes trust in the test suite and must be resolved or quarantined within 24 hours of identification.

---

## Diagnostic Tree

Follow this tree top-to-bottom. Stop at the first root cause you identify.

```
Flaky test detected
│
├─► Step 1: Run with trace/verbose
│   └─ Does it reveal timing, ordering, or data issues?
│       ├─ YES → Fix the timing/ordering/data issue
│       └─ NO → Continue
│
├─► Step 2: Check DB state isolation
│   └─ Is the test reading data from a prior test?
│       ├─ YES → Add proper setup/teardown, use unique realtor_id
│       └─ NO → Continue
│
├─► Step 3: Check session/auth expiry
│   └─ Does it fail when auth token is near expiry?
│       ├─ YES → Mock auth with fresh token per test
│       └─ NO → Continue
│
├─► Step 4: Check external stub timing
│   └─ Is a Nock/MSW stub being consumed by the wrong request?
│       ├─ YES → Scope stubs more precisely, use request matching
│       └─ NO → Continue
│
├─► Step 5: Run 5x in isolation
│   └─ Does it pass 5/5 when run alone?
│       ├─ YES → It's a test-ordering issue (shared state)
│       └─ NO → It's inherently non-deterministic (race condition)
│
└─► Step 6: Quarantine if unfixable in 24h
    └─ Move to tests/quarantine/, log in tests/flakes.md
```

---

## Step 1: Run with Trace

### Vitest (L1-L4):
```bash
# Single test with verbose output
npx vitest run tests/integration/contacts/create.test.ts --reporter=verbose

# With Node debugging
node --inspect-brk ./node_modules/.bin/vitest run {test-file}
```

### Playwright (L5-L6):
```bash
# With trace recording (captures screenshots + network + console)
npx playwright test tests/e2e/contact-create.spec.ts --trace=on

# View the trace
npx playwright show-trace test-results/{test-name}/trace.zip

# With headed browser (watch it happen)
npx playwright test {test-file} --headed --slowMo=500
```

**What to look for:**
- Race conditions (element not ready, API response not arrived)
- Timing dependencies (setTimeout, animation completion)
- Network order (responses arriving in different order)

---

## Step 2: Check DB State Isolation

Common causes of DB-related flakes in Realtors360:

### Problem: Shared `realtor_id` between tests
```typescript
// BAD: Multiple tests share the same tenant
const REALTOR_ID = 'test-user-123'

// GOOD: Each test gets a unique tenant
const REALTOR_ID = `test-${crypto.randomUUID()}`
```

### Problem: Prior test's data not cleaned up
```typescript
// BAD: No cleanup
afterEach(() => {})

// GOOD: Clean up all test data
afterEach(async () => {
  await supabase.from('contacts').delete().eq('realtor_id', testRealtorId)
  await supabase.from('listings').delete().eq('realtor_id', testRealtorId)
})
```

### Problem: Auto-increment IDs cause ordering assumptions
```typescript
// BAD: Assumes first contact has id=1
expect(contacts[0].id).toBe(1)

// GOOD: Find by known property
expect(contacts.find(c => c.email === testEmail)).toBeDefined()
```

### Diagnosis:
```bash
# Run the test 3 times in sequence — does it fail on 2nd or 3rd run?
npx vitest run {test-file} && npx vitest run {test-file} && npx vitest run {test-file}
```

---

## Step 3: Check Session/Auth Expiry

Realtors360 uses NextAuth JWT sessions. Flakes can occur when:

- Test creates a session at the start, session expires mid-test
- Auth token cached between tests, second test gets expired token
- Google Calendar token refresh races with test assertions

### Fix:
```typescript
// Create fresh auth for each test
beforeEach(async () => {
  session = await createTestSession({ userId: testRealtorId })
})
```

---

## Step 4: Check External Stub Timing

### Nock stubs consumed out of order:
```typescript
// BAD: Two stubs for same endpoint, wrong one consumed
nock('https://api.twilio.com').post('/Messages.json').reply(201, { sid: 'msg1' })
nock('https://api.twilio.com').post('/Messages.json').reply(201, { sid: 'msg2' })

// GOOD: Match on request body to differentiate
nock('https://api.twilio.com')
  .post('/Messages.json', body => body.To === '+16045551234')
  .reply(201, { sid: 'msg1' })
```

### MSW handler not scoped:
```typescript
// BAD: Global handler persists across tests
server.use(http.post('/api/contacts', () => HttpResponse.json({ id: '1' })))

// GOOD: Reset handlers between tests
afterEach(() => server.resetHandlers())
```

### Diagnosis:
```bash
# Enable Nock debug logging
DEBUG=nock.* npx vitest run {test-file}
```

---

## Step 5: Run 5x in Isolation

```bash
# Run the specific test 5 times
for i in {1..5}; do
  echo "Run $i:"
  npx vitest run {test-file} --reporter=dot || echo "FAILED on run $i"
done
```

**If it passes 5/5 in isolation but fails in full suite:**
- It's a test-ordering problem
- Another test is polluting shared state (DB, env vars, global mocks)
- Fix: ensure complete isolation (unique IDs, proper cleanup)

**If it fails intermittently even in isolation:**
- It's inherently non-deterministic
- Likely causes: race condition in app code, timing-dependent assertion, system clock
- Fix: add explicit waits, retry logic, or deterministic mocking

---

## Step 6: Quarantine

If the flake cannot be fixed within 24 hours:

### 1. Move to quarantine:
```bash
mv tests/integration/contacts/flaky-test.test.ts tests/quarantine/
```

### 2. Log in `tests/flakes.md`:
```markdown
| 2026-04-20 | TC-INT-CONTACT-005 | DB state leak from TC-INT-LISTING-003 | Investigating | Quarantined |
```

### 3. Create a tracking issue with:
- Flake frequency (how often it fails)
- Diagnostic attempts so far
- Hypothesis for root cause
- Deadline for resolution (7 days max quarantine)

### 4. Review quarantine weekly:
- Tests in quarantine > 7 days must be either fixed or removed (with `tests/removed-tests.md` entry)
- Quarantine is not a permanent home

---

## Common Flake Patterns in Realtors360

| Pattern | Symptom | Fix |
|---------|---------|-----|
| Supabase connection pool exhaustion | Random "connection refused" | Add connection limit in test config, close clients in afterAll |
| Revalidation timing | Page still shows old data | Add `waitForRevalidation()` helper or assert after delay |
| Twilio webhook race | Test checks DB before webhook processes | Wait for webhook response before asserting |
| Playwright selector timing | Element not found | Use `page.waitForSelector()` or Playwright auto-wait |
| Date-dependent logic | Test fails at midnight/month boundary | Mock `Date.now()` or use fixed test dates |
| Random UUIDs in snapshots | Snapshot always differs | Normalize UUIDs before comparison |

---

## Prevention Checklist

When writing new tests, avoid flakes by:

- [ ] Using unique identifiers per test (UUID-based `realtor_id`)
- [ ] Cleaning up all created data in `afterEach`/`afterAll`
- [ ] Never depending on execution order
- [ ] Mocking time-dependent code (`vi.useFakeTimers()`)
- [ ] Using Playwright auto-wait instead of `page.waitForTimeout()`
- [ ] Scoping Nock/MSW stubs to specific request bodies
- [ ] Asserting on specific data, not array indices or counts
- [ ] Adding explicit waits for async side effects before asserting
