# Testing Glossary

## Core Concepts

### RTM (Requirements Traceability Matrix)
A document that maps every requirement (REQ-ID) to one or more test cases (TC-IDs). Ensures bidirectional traceability: every requirement has tests, every test traces to a requirement. Located at `docs/testing/rtm.md`.

### REQ-ID (Requirement Identifier)
A unique identifier for a testable requirement. Format: `REQ-{DOMAIN}-{SEQ}` (e.g., `REQ-CONTACT-001`, `REQ-SHOWING-003`). Domains include: AUTH, CONTACT, LISTING, SHOWING, WORKFLOW, NEWSLETTER, CONTENT, CALENDAR, NOTIFICATION, FORM, ENRICHMENT.

### TC-ID (Test Case Identifier)
A unique identifier for a test case. Format: `TC-{LAYER}-{DOMAIN}-{SEQ}` (e.g., `TC-UNIT-CONTACT-001`, `TC-E2E-LISTING-003`). Layer abbreviations: UNIT (L1), COMP (L2), CONT (L3), INT (L4), E2E (L5), A11Y (L6a), VIS (L6b), RES (L7), LOAD (L8).

### Layer
One of the 9 levels in the test architecture (L0-L9). Each layer targets a different scope and uses different tools. Lower layers are faster and more focused; higher layers are broader and slower.

### Gate
A quality checkpoint (G0-G4) where specific test layers must pass before code progresses. Code must pass all tests at a gate before advancing to the next stage.

---

## Metrics

### Pyramid Ratio
The distribution of tests across layers. Ideal: 70% unit/static (L0-L1), 20% integration (L2-L4), 10% system (L5-L9). An inverted pyramid (more E2E than unit tests) is a structural problem that leads to slow, brittle test suites.

### Mutation Score
The percentage of code mutations (artificially introduced bugs) that are caught by tests. Measured by Stryker. A high mutation score (>80%) means tests have strong assertions. A low score means tests pass even when code is broken.

### Flake Rate
The percentage of CI runs that contain at least one non-deterministic test failure. Target: <1%. Calculated as: (runs with flaky failures) / (total runs) * 100.

### Escape Rate
The number of bugs that reach production without being caught by tests. Target: 0 for P0/P1. Every escape triggers the `responding-to-prod-incident.md` workflow.

### Behavioral Coverage
The percentage of user-visible behaviors that have at least one test. Unlike line coverage (which measures code execution), behavioral coverage measures whether features work correctly. Measured via RTM completeness.

---

## Test States

### Passing
A test that consistently produces the expected result. The default desired state.

### Failing
A test that consistently produces an unexpected result. Either the code has a bug or the test needs updating. Never merge with a failing test.

### Flaky
A test that non-deterministically passes or fails on the same code. See `debugging-a-flake.md`. Must be resolved or quarantined within 24 hours.

### Quarantined
A flaky test moved to `tests/quarantine/` to prevent it from blocking CI. Tracked in `tests/flakes.md`. Maximum quarantine period: 7 days. After that, fix or remove.

### Skipped
A test intentionally disabled (`.skip` or `xit`). Must have a comment explaining why and a deadline for re-enabling. Skipped tests are tracked and reviewed in audits.

---

## Processes

### Discovery
The process of reading source code to identify all behaviors, branches, and side effects that need testing. Performed when adding new tests or auditing existing coverage.

### Inventory
A structured list of all test cases needed for a process, organized by happy path, edge cases, error cases, and multi-tenancy scenarios.

### Coverage Matrix
A table mapping requirements to test cases with their layer, priority, and status. Used to ensure no gaps and identify the right layer for each test.

### Waiver
A documented exception to a testing rule. For example: "This module is exempt from mutation testing because it only calls external APIs." Waivers must be approved and logged in `tests/deviations.md`.

### Post-Mortem
An investigation conducted after a production incident that includes writing a regression test. See `responding-to-prod-incident.md`.

---

## Tools

### Vitest
Fast unit test runner for TypeScript/JavaScript. Used for L1-L4 tests. Configuration in `vitest.config.ts`. Supports `describe`, `it`, `expect`, mocking, timers.

### React Testing Library (RTL)
Component testing library that encourages testing behavior over implementation. Used for L2 tests. Queries by role, label, text (accessibility-first).

### happy-dom
Lightweight DOM implementation for Node.js. Faster than JSDOM. Used as the test environment for L2 component tests.

### Playwright
Browser automation framework for E2E tests (L5-L6). Supports Chromium, Firefox, WebKit. Features: auto-wait, trace recording, screenshots, network interception.

### MSW (Mock Service Worker)
API mocking library that intercepts requests at the network level. Used in L2-L3 tests to mock server responses without modifying application code.

### Nock
HTTP request interception library for Node.js. Used in L4 integration tests to stub external APIs (Twilio, Resend, Anthropic, Kling).

### Stryker
Mutation testing framework. Modifies source code and checks if tests catch the change. Used to measure test quality (mutation score) on `src/lib/` modules.

### fast-check
Property-based testing library. Generates random inputs to find edge cases. Used for L1 tests on utility functions (phone formatting, fuzzy matching, CDM mapping).

### axe-core
Accessibility testing engine. Checks for WCAG violations programmatically. Used via `@axe-core/playwright` in L6a tests.

### k6
Load testing tool. Simulates concurrent users and measures response times. Used for L8 load tests. Scripts written in JavaScript.

### size-limit
Bundle size checking tool. Ensures no single route exceeds the budget (200KB). Runs at L0 as part of the build check.

### gitleaks
Secret detection tool. Scans commits for accidentally committed API keys, tokens, passwords. Runs at L0 pre-commit.

### semgrep
Static analysis tool for security patterns. Detects SQL injection, XSS, and other vulnerability patterns in source code. Runs at L0.

---

## Realtors360-Specific Terms

### Tenant Isolation
The principle that each test uses a unique `realtor_id` to prevent data leakage between tests. Mirrors the production multi-tenancy model.

### Tenant Client
`getAuthenticatedTenantClient()` from `src/lib/supabase/tenant.ts`. Auto-scopes all queries to the authenticated user's `realtor_id`. Tests must verify this scoping works correctly.

### Server Action
A Next.js server-side function in `src/actions/`. The primary API surface for mutations. Tested at L4 (integration) with real database.

### CDM (Common Data Model)
The standardized data format used to populate BCREA forms. Produced by `src/lib/cdm-mapper.ts` from listing data.

### Phase (Workflow)
One of 8 sequential stages in the listing workflow. Tests must verify sequential enforcement (no skipping phases) and audit trail logging.

### CASL Consent
Canadian Anti-Spam Legislation compliance flag on contacts. Tests verify it's stored correctly and checked before sending marketing emails.

### Speed-to-Lead
Automatic notification triggered within 5 minutes of new contact creation. Tested at L4 to verify timing logic and at L5 to verify notification appears.

---

## Abbreviations

| Abbrev | Meaning |
|--------|---------|
| RTM | Requirements Traceability Matrix |
| TC | Test Case |
| REQ | Requirement |
| RLS | Row Level Security (Supabase) |
| E2E | End-to-End |
| RTL | React Testing Library |
| MSW | Mock Service Worker |
| SUT | System Under Test |
| AAA | Arrange-Act-Assert (test structure) |
| CI | Continuous Integration |
| WCAG | Web Content Accessibility Guidelines |
| CDM | Common Data Model |
| CASL | Canadian Anti-Spam Legislation |
