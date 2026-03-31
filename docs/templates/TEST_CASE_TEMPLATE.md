# Test Plan: [Feature Name]

> **Version:** 1.0
> **Date:** YYYY-MM-DD
> **Feature PRD:** `docs/PRD_[name].md`
> **Total Test Cases:** [target count based on scope — see playbook Section 20.1]
> **Automation Script:** `scripts/test-[feature].mjs` (to be created)

---

## Scope & Scale

| Feature Scope | Test Case Target | Use Case Target |
|--------------|-----------------|----------------|
| New major system (15+ files) | 2000+ | 50-100 |
| Major feature (5-15 files) | 500-800 | 20-40 |
| Sub-feature / module (2-5 files) | 200-300 | 10-20 |
| Bug fix / micro (1-2 files) | 10-30 | N/A |

**This feature is:** [scope level] → Target: [N] test cases, [N] use cases

---

## Category Distribution

| Category | Target Count | Actual Count | Coverage |
|----------|-------------|-------------|----------|
| Happy Path | [15% of total] | | |
| Input Validation | [15% of total] | | |
| Error Handling | [10% of total] | | |
| Edge Cases | [15% of total] | | |
| Security | [10% of total] | | |
| Integration | [10% of total] | | |
| State Transitions | [10% of total] | | |
| Concurrency | [5% of total] | | |
| Performance | [5% of total] | | |
| Accessibility | [5% of total] | | |
| **Total** | **[target]** | | |

---

## CATEGORY 1: HAPPY PATH — [N] Tests

### [PREFIX]-001: [Short title]
**Story:** As a [role], I want to [action], so that [outcome].
**Preconditions:** [Required state before test — e.g., "User is logged in, at least 1 listing exists"]
**Steps:**
1. Navigate to [page]
2. [Action]
3. [Action]
**Expected Result:** [Precise, testable outcome — not vague]
**Priority:** P0
**Category:** Happy Path

### [PREFIX]-002: [Next test]
...

---

## CATEGORY 2: INPUT VALIDATION — [N] Tests

### [PREFIX]-050: [Field] accepts valid input
**Story:** As the system, I want to validate [field] input, so that bad data doesn't enter the CRM.
**Preconditions:** [Form/API is accessible]
**Steps:**
1. Submit form with [valid input]
2. Submit form with [empty input]
3. Submit form with [too-long input: 1000 chars]
4. Submit form with [special characters: <script>alert(1)</script>]
5. Submit form with [SQL injection: ' OR 1=1 --]
6. Submit form with [boundary value: max int, 0, negative]
**Expected Result:**
- Valid: accepted, saved correctly
- Empty: Zod validation error shown
- Too-long: rejected with clear message
- Special chars: sanitized or escaped, no XSS
- SQL injection: rejected, no DB impact
- Boundary: handled per business rules
**Priority:** P1
**Category:** Input Validation

---

## CATEGORY 3: ERROR HANDLING — [N] Tests

### [PREFIX]-100: API timeout handling
**Story:** As a realtor, I want the system to handle slow APIs gracefully, so I'm not stuck on a spinner.
**Preconditions:** [Feature relies on external API]
**Steps:**
1. Simulate API timeout (disconnect network / mock timeout)
2. Trigger the feature action
**Expected Result:** Error message within 10s, no unhandled exception, retry option shown
**Priority:** P1
**Category:** Error Handling

---

## CATEGORY 4: EDGE CASES — [N] Tests

### [PREFIX]-150: Empty state — no data exists
**Story:** As a new realtor with no data, I want the feature to show helpful guidance instead of an error.
**Preconditions:** Clean account, zero records
**Steps:**
1. Navigate to [feature page]
**Expected Result:** Empty state with guidance text, not a blank page or error
**Priority:** P1
**Category:** Edge Cases

---

## CATEGORY 5: SECURITY — [N] Tests

### [PREFIX]-200: Unauthenticated access blocked
**Story:** As the system, I want to block unauthenticated API access, so that data is protected.
**Preconditions:** No session/cookie
**Steps:**
1. Call [API endpoint] without auth header
2. Call [API endpoint] with expired session
3. Call [API endpoint] with forged session
**Expected Result:** 401 Unauthorized for all three, no data leaked
**Priority:** P0
**Category:** Security

### [PREFIX]-201: Cross-user data isolation
**Story:** As the system, I want to ensure User A cannot access User B's data.
**Preconditions:** Two authenticated users exist
**Steps:**
1. User A creates a record
2. User B queries for that record's ID directly
**Expected Result:** User B gets 404 or empty result (RLS enforced)
**Priority:** P0
**Category:** Security

---

## CATEGORY 6: INTEGRATION — [N] Tests

### [PREFIX]-250: Cross-feature workflow
**Story:** As a realtor, I want [feature A] to trigger [feature B] correctly.
**Preconditions:** Both features configured
**Steps:**
1. Complete action in feature A
2. Verify feature B receives the event
3. Verify data consistency between both
**Expected Result:** [Specific cross-feature outcome]
**Priority:** P1
**Category:** Integration

---

## CATEGORY 7: STATE TRANSITIONS — [N] Tests

### [PREFIX]-300: Valid state transition
**Story:** As the system, I want to enforce valid state transitions, so data integrity is maintained.
**Steps:**
1. Record is in state [A]
2. Attempt transition to state [B] (valid)
3. Attempt transition to state [C] (invalid — skip)
**Expected Result:** A→B succeeds, A→C rejected with clear error
**Priority:** P1
**Category:** State Transitions

---

## CATEGORY 8: CONCURRENCY — [N] Tests

### [PREFIX]-350: Simultaneous edits
**Story:** As the system, I want to handle concurrent modifications gracefully.
**Steps:**
1. User A opens record for editing
2. User B opens same record
3. User A saves changes
4. User B saves different changes
**Expected Result:** Last write wins OR optimistic locking error shown to User B
**Priority:** P2
**Category:** Concurrency

---

## CATEGORY 9: PERFORMANCE — [N] Tests

### [PREFIX]-400: Page load with large dataset
**Story:** As a realtor with many records, I want pages to load in under 3 seconds.
**Preconditions:** 10,000+ records in the table
**Steps:**
1. Navigate to [page]
2. Measure time to interactive
**Expected Result:** Page loads in <3s, no browser crash, pagination works
**Priority:** P2
**Category:** Performance

---

## CATEGORY 10: ACCESSIBILITY — [N] Tests

### [PREFIX]-450: Keyboard navigation
**Story:** As a realtor using keyboard-only navigation, I want to complete all actions without a mouse.
**Steps:**
1. Tab through all interactive elements
2. Enter/Space to activate buttons
3. Escape to close modals
4. Arrow keys for lists/menus
**Expected Result:** All actions completable, focus visible, no keyboard traps
**Priority:** P2
**Category:** Accessibility

### [PREFIX]-451: Screen reader compatibility
**Story:** As a realtor using a screen reader, I want all content to be announced correctly.
**Steps:**
1. Navigate with VoiceOver/NVDA
2. Check all buttons have labels
3. Check all form fields have associated labels
4. Check dynamic content uses aria-live
**Expected Result:** All content meaningful via screen reader
**Priority:** P2
**Category:** Accessibility

---

## Use Case Summary

| UC ID | Title | Actor | Priority |
|-------|-------|-------|----------|
| UC-001 | [Title] | Realtor | P0 |
| UC-002 | [Title] | Buyer | P1 |
| ... | ... | ... | ... |

*Detailed use cases in `docs/use-cases/[feature].md`*

---

## Automation Plan

**All tests are fully automated. Zero manual tests.**

| Automation Layer | Tests | Tool | Timeline |
|-----------------|-------|------|----------|
| API / DB / Constraints | [N] | `scripts/test-[feature].mjs` + `test-suite.sh` | With feature |
| Component Interaction (every button, form, modal) | [N] | Playwright `tests/browser/components/` | With feature |
| Cross-Feature Journeys (end-to-end workflows) | [N] | Playwright `tests/browser/journeys/` | With feature |
| Accessibility (WCAG 2.1 AA) | [N] | Playwright + `@axe-core/playwright` | With feature |
| Security (auth, XSS, CSRF, isolation) | [N] | Playwright `tests/browser/security/` | With feature |
| Performance (page load <3s, LCP, CLS) | [N] | Playwright + web-vitals | With feature |
| Visual Regression (screenshot diff) | [N] | Playwright `toHaveScreenshot()` | With feature |

**Run all:** `npx playwright test && bash scripts/test-suite.sh && npm run typecheck`

---

*Template v2.0 — 100% automated, zero manual. From agent-playbook.md Section 20*
