# Adding a New Test — Step-by-Step Workflow

## When to Use This

Use this workflow every time you need to add test coverage for:
- A new feature being developed
- An existing feature that lacks coverage (found via audit)
- A bug fix that needs a regression test

---

## Step 1: Identify the Process to Test

Clearly define what you are testing. A "process" is a user-visible behavior or system operation.

**Examples:**
- "Realtor creates a new contact with CASL consent"
- "Showing status transitions from requested → confirmed"
- "Newsletter AI generates content and enters approval queue"
- "Workflow advances from Phase 2 to Phase 3"

**Output:** A one-sentence process description + the affected domain (contacts, listings, showings, workflow, newsletters, etc.)

---

## Step 2: Determine the Lowest Appropriate Layer

Apply the **"lowest layer that gives confidence"** principle:

| If the behavior is... | Test at layer... |
|----------------------|-----------------|
| Pure data transformation (no I/O) | L1 — Unit |
| Component rendering/interaction (no network) | L2 — Component |
| API shape agreement between client/server | L3 — Contract |
| Server action + database mutation | L4 — Integration |
| Multi-step user journey through browser | L5 — E2E |
| Accessibility compliance | L6a |
| Visual appearance | L6b |
| Failure/outage handling | L7 — Resilience |

**Rule:** Always write the test at the LOWEST layer possible. Only go higher if the lower layer cannot capture the behavior. Most logic tests should be L1 or L4, not L5.

---

## Step 3: Read Source Code (Discovery)

Before writing any test, read the implementation thoroughly:

1. **Entry point:** Find the function/component/route being tested
   - Server actions: `src/actions/{domain}.ts`
   - Components: `src/components/{domain}/`
   - API routes: `src/app/api/{domain}/`
   - Utilities: `src/lib/`

2. **Dependencies:** Map what the code calls
   - Supabase queries (which tables, what operations)
   - External APIs (Twilio, Resend, Anthropic, Kling)
   - Other server actions
   - Shared utilities

3. **Edge cases:** Look for
   - Early returns / guard clauses
   - Error handling (`try/catch`, `.error` checks)
   - Null/undefined handling
   - Conditional branches
   - Type coercions

4. **Side effects:** Identify what changes
   - Database inserts/updates/deletes
   - External API calls (SMS, email, AI)
   - Revalidation (`revalidatePath`)
   - Session mutations

**Output:** A list of behaviors, branches, and side effects.

---

## Step 4: Produce Inventory

Convert your discovery into a structured inventory of test cases:

```markdown
## Inventory: {Process Name}

### Happy Path
- [ ] TC-{LAYER}-{DOMAIN}-001: {description}
- [ ] TC-{LAYER}-{DOMAIN}-002: {description}

### Edge Cases
- [ ] TC-{LAYER}-{DOMAIN}-003: Empty input → {expected}
- [ ] TC-{LAYER}-{DOMAIN}-004: Null field → {expected}
- [ ] TC-{LAYER}-{DOMAIN}-005: Boundary value → {expected}

### Error Cases
- [ ] TC-{LAYER}-{DOMAIN}-006: DB error → {expected}
- [ ] TC-{LAYER}-{DOMAIN}-007: Auth failure → {expected}
- [ ] TC-{LAYER}-{DOMAIN}-008: External API timeout → {expected}

### Multi-Tenancy
- [ ] TC-{LAYER}-{DOMAIN}-009: Cross-tenant access blocked
```

---

## Step 5: Build Coverage Matrix

Map each test case to the requirement it verifies:

```markdown
| REQ-ID | TC-ID | Layer | Description | Priority |
|--------|-------|-------|-------------|----------|
| REQ-CONTACT-001 | TC-UNIT-CONTACT-001 | L1 | Phone formatting | P1 |
| REQ-CONTACT-001 | TC-INT-CONTACT-001 | L4 | Create saves to DB | P1 |
| REQ-CONTACT-002 | TC-INT-CONTACT-002 | L4 | CASL consent stored | P1 |
| REQ-CONTACT-003 | TC-E2E-CONTACT-001 | L5 | Full create journey | P2 |
```

**Priority guide:**
- P1: Must have before merge (critical path)
- P2: Should have before release (secondary flows)
- P3: Nice to have (defensive/unlikely scenarios)

---

## Step 6: Review with Team

Before implementing, validate:
- [ ] Process description is correct and complete
- [ ] Layer choices are justified (not testing at too high a layer)
- [ ] No duplicate coverage (check existing tests)
- [ ] Edge cases are realistic (not testing impossible states)
- [ ] Priority assignments match business impact

---

## Step 7: Implement Tests

### File Placement

```
tests/
├── unit/
│   └── lib/
│       └── {module}.test.ts          # L1
├── components/
│   └── {domain}/
│       └── {Component}.test.tsx      # L2
├── contract/
│   └── {domain}.contract.test.ts     # L3
├── integration/
│   └── {domain}/
│       └── {process}.test.ts         # L4
├── e2e/
│   └── {journey}.spec.ts            # L5
├── a11y/
│   └── {page}.a11y.spec.ts          # L6a
├── visual/
│   └── {page}.visual.spec.ts        # L6b
├── resilience/
│   └── {service}.resilience.test.ts  # L7
└── load/
    └── {scenario}.js                 # L8 (k6)
```

### Naming Convention

```typescript
// Unit test
describe('cdm-mapper', () => {
  // REQ-LISTING-005: Listing maps to valid CDM
  it('TC-UNIT-LISTING-005: maps listing with all fields to complete CDM', () => {})
  it('TC-UNIT-LISTING-006: maps listing with missing optional fields', () => {})
})

// Integration test
describe('Contact CRUD', () => {
  // REQ-CONTACT-001: Create contact with valid data
  it('TC-INT-CONTACT-001: creates contact and returns id', async () => {})
})
```

### Implementation Checklist

- [ ] REQ-ID annotation in comment above each test
- [ ] TC-ID in the test name (for traceability)
- [ ] Arrange / Act / Assert structure
- [ ] No shared mutable state between tests
- [ ] Cleanup in `afterEach` or `afterAll`
- [ ] Assertions are specific (not just "no error thrown")
- [ ] External services stubbed (Nock/MSW)
- [ ] Test runs in < 5s individually

---

## Step 8: Update RTM

Add entries to `docs/testing/rtm.md`:

```markdown
| REQ-CONTACT-001 | Create contact with valid data | L1, L4 | TC-UNIT-CONTACT-001, TC-INT-CONTACT-001 | Covered |
```

---

## Step 9: Verify 3/3 Green

Before marking the test as complete:

1. **Local pass:** `npm run test -- --filter={your-test-file}` passes
2. **Full suite pass:** `npm run test` passes (no regressions introduced)
3. **CI pass:** Push to branch, CI runs G1 gate, all green

If any fail, fix before proceeding. Never merge with a failing test "that will be fixed later."
