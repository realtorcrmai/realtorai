# Responding to a Production Incident — Test-First Framework

## Purpose

When a bug reaches production, it means the test suite has a gap. This workflow ensures every incident results in a permanent regression test that prevents recurrence.

---

## Step 1: Reproduce the Bug

**Goal:** Create a minimal reproduction that demonstrates the failure.

### Actions:
1. **Gather evidence:** Error logs, user report, screenshots, affected data
2. **Identify conditions:** What user, what data, what sequence of actions?
3. **Reproduce locally:**
   - Set up matching data state in local Supabase
   - Follow the exact user flow
   - Confirm the bug manifests

### Output:
```markdown
## Bug Reproduction
- **Reported:** {date}
- **Reporter:** {user/system}
- **Symptoms:** {what the user saw}
- **Root cause (hypothesis):** {what went wrong}
- **Reproduction steps:**
  1. {step}
  2. {step}
  3. {observed incorrect behavior}
- **Expected behavior:** {correct behavior}
```

---

## Step 2: Identify the Lowest Layer That Should Have Caught It

Analyze WHY the test suite missed this:

| Bug Type | Should Have Been Caught At | Example |
|----------|---------------------------|---------|
| Logic error in utility | L1 — Unit | Phone formatting drops leading zero |
| Component renders wrong state | L2 — Component | Badge shows "active" for expired listing |
| Client sends wrong shape to server | L3 — Contract | Missing required field in form submission |
| Server action doesn't validate | L4 — Integration | Null seller_id accepted, FK violation in DB |
| Multi-step flow breaks | L5 — E2E | Workflow skips Phase 3 under specific conditions |
| Accessibility regression | L6a | Modal traps focus, no escape |
| Third-party outage unhandled | L7 — Resilience | Twilio 503 crashes showing creation |

**Questions to ask:**
- Is there a pure function that could be tested in isolation? → L1
- Is there a component rendering issue? → L2
- Is there a data shape mismatch? → L3
- Does it require a real database to manifest? → L4
- Does it only appear in a multi-step browser flow? → L5

---

## Step 3: Write the Failing Test FIRST

**Critical:** Write the test BEFORE fixing the bug. This ensures:
- The test actually catches the bug (not a false positive)
- The fix is verified by the test going green
- The test is a permanent regression guard

### Template:

```typescript
describe('Regression: {BUG-ID}', () => {
  // REQ-{DOMAIN}-{SEQ}: {requirement that was violated}
  // Bug: {one-line description of what went wrong}
  // Reported: {date}
  it('TC-{LAYER}-{DOMAIN}-{SEQ}: {describes correct behavior}', async () => {
    // Arrange: set up the exact conditions that triggered the bug
    
    // Act: perform the operation that exposed the bug
    
    // Assert: verify the CORRECT behavior (this should FAIL before the fix)
  })
})
```

### Verify the test fails:
```bash
npm run test -- --filter={test-file}
# Expected: 1 failed test (the new regression test)
```

---

## Step 4: Fix the Bug

Now fix the code. The goal is minimal change that makes the failing test pass without breaking anything else.

### Checklist:
- [ ] Fix addresses root cause (not symptoms)
- [ ] Fix is in the correct layer (not a workaround)
- [ ] No unrelated changes in the same commit
- [ ] All existing tests still pass

### Verify:
```bash
npm run test
# Expected: all tests pass, including the new regression test
```

---

## Step 5: Update RTM

Add the new test to the Requirements Traceability Matrix:

```markdown
| REQ-{DOMAIN}-{SEQ} | {requirement} | L{n} | TC-{LAYER}-{DOMAIN}-{SEQ} | Covered (regression) |
```

If this exposed a missing requirement, add the REQ-ID first:
```markdown
| REQ-SHOWING-007 | Showing creation handles Twilio 503 gracefully | L7 | TC-RES-SHOWING-001 | Covered (regression) |
```

---

## Step 6: Document in Post-Mortem

Create or update the post-mortem record:

### Post-Mortem Template

```markdown
## Incident: {BUG-ID} — {title}

**Date:** {date}
**Severity:** P{0-3}
**Duration:** {time from report to fix deployed}
**Impact:** {users affected, data corrupted, etc.}

### Timeline
- {time}: Bug reported
- {time}: Reproduced locally
- {time}: Root cause identified
- {time}: Failing test written
- {time}: Fix implemented
- {time}: Fix deployed

### Root Cause
{Technical explanation of why this happened}

### Why Tests Missed It
{Which layer should have caught it and why the gap existed}
- Missing test for: {specific scenario}
- Layer gap: {e.g., "No L7 resilience test for Twilio failures"}

### Prevention
- Added: TC-{ID} at layer L{n}
- Updated: {any process/documentation changes}
- RTM entry: REQ-{ID}

### Follow-up Actions
- [ ] Review similar code paths for same pattern
- [ ] Add property-based test if applicable
- [ ] Consider adding to L5 E2E if user-facing
```

**File location:** `docs/incidents/{date}-{bug-id}.md`

---

## Escalation Criteria

| Severity | Definition | Response Time |
|----------|-----------|---------------|
| P0 | System down, all users affected | Fix within 1 hour |
| P1 | Feature broken, workaround exists | Fix within 4 hours |
| P2 | Edge case, minor impact | Fix within 24 hours |
| P3 | Cosmetic, no functional impact | Fix in next sprint |

For P0/P1: Fix first, post-mortem after. For P2/P3: Follow this full workflow before fixing.
