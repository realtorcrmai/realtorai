# Updating Tests on Feature Change

## When to Use

Use this workflow whenever a feature is modified, extended, or partially removed. This ensures tests stay in sync with the implementation and the RTM accurately reflects reality.

**Triggers:**
- Feature behavior changes (new validation rule, different status transitions)
- Feature extended (new field, new step in workflow, new integration)
- Feature simplified (field removed, step skipped, integration dropped)
- Feature refactored (same behavior, different implementation)
- Database schema change affecting a feature

---

## Step 1: Re-run Discovery for Affected Process

Re-read the modified source code following the same discovery process as `adding-a-new-test.md` Step 3.

### Files to examine based on change type:

| Change In | Also Check |
|-----------|-----------|
| `src/actions/contacts.ts` | `ContactForm.tsx`, `ContactsTableClient.tsx`, `tests/integration/contacts/` |
| `src/actions/listings.ts` | `ListingForm.tsx`, `ListingsTableClient.tsx`, `WorkflowStepper.tsx`, `tests/integration/listings/` |
| `src/actions/showings.ts` | `ShowingRequestForm.tsx`, `tests/integration/showings/`, `tests/e2e/showing*.spec.ts` |
| `src/actions/workflow.ts` | All `Phase*.tsx` components, `WorkflowStepper.tsx`, `tests/integration/workflow/` |
| `src/lib/*.ts` | `tests/unit/lib/` corresponding test file |
| `src/components/**/*.tsx` | `tests/components/` corresponding test file |
| Database migration | All integration tests touching that table |

### Discovery output:
```markdown
## Change Discovery: {feature name}

### What changed:
- {description of change}

### Affected behaviors:
- {behavior 1} — changed from {old} to {new}
- {behavior 2} — new behavior added
- {behavior 3} — removed

### Affected test files:
- `tests/unit/lib/{file}.test.ts`
- `tests/integration/{domain}/{file}.test.ts`
- `tests/e2e/{journey}.spec.ts`
```

---

## Step 2: Diff Inventory Against Previous

Compare the new behavior list against the existing test inventory:

### Categories:

| Category | Action |
|----------|--------|
| **Unchanged behavior** | Verify existing tests still pass (no changes needed) |
| **Modified behavior** | Update existing test assertions to match new behavior |
| **New behavior** | Write new tests following `adding-a-new-test.md` |
| **Removed behavior** | Remove tests, log in `tests/removed-tests.md` |

### Example diff:
```markdown
## Inventory Diff: Contact Creation

### Unchanged (verify passes)
- TC-INT-CONTACT-001: Create with valid data ✓
- TC-INT-CONTACT-003: Reject duplicate email ✓

### Modified (update assertions)
- TC-INT-CONTACT-002: CASL consent — NOW REQUIRES consent_date when consent_given=true

### New (write test)
- TC-INT-CONTACT-010: Phone validation now rejects non-Canadian numbers

### Removed (delete + log)
- TC-INT-CONTACT-004: Fax field validation — fax field removed from schema
```

---

## Step 3: Update Coverage Matrix

Modify the coverage matrix to reflect the new state:

```markdown
| REQ-ID | TC-ID | Layer | Description | Status |
|--------|-------|-------|-------------|--------|
| REQ-CONTACT-002 | TC-INT-CONTACT-002 | L4 | CASL consent with date | Updated |
| REQ-CONTACT-010 | TC-INT-CONTACT-010 | L4 | Canadian phone validation | New |
| ~~REQ-CONTACT-004~~ | ~~TC-INT-CONTACT-004~~ | ~~L4~~ | ~~Fax validation~~ | Removed |
```

---

## Step 4: Add / Modify / Remove Tests

### Modifying an existing test:

```typescript
// BEFORE
it('TC-INT-CONTACT-002: stores CASL consent', async () => {
  const result = await createContact({ 
    name: 'Test', 
    casl_consent_given: true 
  })
  expect(result.casl_consent_given).toBe(true)
})

// AFTER — updated to match new requirement
it('TC-INT-CONTACT-002: stores CASL consent with required date', async () => {
  // Now requires consent_date when consent_given is true
  const result = await createContact({ 
    name: 'Test', 
    casl_consent_given: true,
    casl_consent_date: '2026-04-20'
  })
  expect(result.casl_consent_given).toBe(true)
  expect(result.casl_consent_date).toBe('2026-04-20')
})

// NEW — test the validation
it('TC-INT-CONTACT-011: rejects consent without date', async () => {
  const result = await createContact({ 
    name: 'Test', 
    casl_consent_given: true
    // missing casl_consent_date
  })
  expect(result.error).toContain('consent_date required')
})
```

### Removing a test:

1. Delete the test from the file
2. Log in `tests/removed-tests.md`:
   ```markdown
   | 2026-04-20 | TC-INT-CONTACT-004 | Fax field validation | Fax field removed from contact schema in migration 098 |
   ```
3. Remove from RTM (or mark as "Removed")

### Adding a new test:

Follow `adding-a-new-test.md` Steps 4-9 for the new behavior.

---

## Step 5: Update RTM

Ensure `docs/testing/rtm.md` reflects the current state:

- [ ] New REQ-IDs added for new behaviors
- [ ] Modified REQ-IDs updated with correct TC-IDs
- [ ] Removed REQ-IDs struck through or removed
- [ ] All active TC-IDs have corresponding test implementations
- [ ] No orphan tests (TC-IDs without REQ-IDs)

---

## Refactoring (Same Behavior, Different Implementation)

When code is refactored without changing behavior:

1. **Do NOT change test assertions** — tests verify behavior, not implementation
2. **Run all affected tests** — they should all pass without modification
3. **If tests break:** The refactor changed behavior (intentionally or not)
   - Intentional: Follow steps 1-5 above
   - Unintentional: Fix the refactor, not the tests

### Example: `ListingWorkflow.tsx` monolith split into modules

The 1,138-line `ListingWorkflow.tsx` was split into focused modules. Tests should not change because the behavior (phase rendering, advancement, data saving) is identical. If a test breaks, the refactor introduced a regression.

---

## Checklist Before Marking Complete

- [ ] All modified tests pass locally
- [ ] Full test suite passes (no regressions)
- [ ] RTM updated in the same PR as the feature change
- [ ] `tests/removed-tests.md` updated if any tests deleted
- [ ] `tests/deviations.md` updated if test approach differs from spec
- [ ] Coverage matrix reflects new state
- [ ] No orphan tests remain
