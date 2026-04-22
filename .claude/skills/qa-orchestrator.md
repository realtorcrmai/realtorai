---
name: qa-orchestrator
description: Master QA strategy layer for Realtors360 CRM — enforces 9-layer zero-regression testing architecture (L0-L9), manages Requirements Traceability Matrix, routes work to specialty skills (e2e, api-integration, mcp-consumer), audits coverage gaps, triages escaped bugs, and reports quality metrics. Triggered by context when planning test strategy, analyzing coverage, or responding to production incidents.
---

# QA Orchestrator — Realtors360 CRM

Master QA strategy layer. Does NOT write individual tests — it plans, dispatches, audits, and enforces quality gates across the entire Realtors360 test pyramid.

---

## Absolute Rules

1. **No requirement without a test.** Every user story, API endpoint, server action, and DB constraint maps to at least one test. Untested requirements are tracked as coverage debt in the RTM.
2. **Push bugs down the pyramid.** If a bug can be caught by L1 (unit), it must NOT wait for L5 (E2E). Escalate to higher layers only when lower layers cannot express the assertion.
3. **Gates don't get bypassed.** No code merges without passing its required gate. No "we'll fix it later" exceptions.
4. **Flakes are defects.** A flaky test is filed as a bug, quarantined with `@flaky` tag, and fixed within 48 hours. Quarantined tests still block the gate — they just get retried 3x first.
5. **Every test title contains a REQ-ID.** Format: `[REQ-XXX] description`. This enables automated RTM tracing.

---

## The 9-Layer Testing Architecture

### Layer 0 — Static Analysis
**What:** TypeScript strict mode, ESLint, security pattern scanning
**Tools:** `tsc --noEmit`, `eslint`, custom regex rules for secrets/SQL injection
**Scope:**
- All `src/**/*.{ts,tsx}` files — zero type errors
- No `any` casts without `// eslint-disable-next-line` justification
- No hardcoded secrets (scan for API key patterns in committed code)
- No raw SQL — all DB access through Supabase client or server actions
**Baseline:** TypeScript check passes across 732+ source files (Layer 1 of existing regression suite)
**Run:** `npx tsc --noEmit && npx eslint src/`

### Layer 1 — Unit Tests
**What:** Pure functions, validators, hooks, utility libraries
**Tools:** Vitest
**Scope:**
- `src/lib/*.ts` — cdm-mapper, fuzzy-match, flow-converter, email-blocks, notifications
- `src/lib/validators/*.ts` — content, design, compliance-gate, quality-scorer
- `src/lib/ai-agent/*.ts` — lead-scorer, send-advisor, next-best-action
- Zod schemas in `src/types/` — parse/safeParse with valid and invalid inputs
- Phone formatting, date helpers, price formatters
**Baseline:** 126+ vitest cases (Layers 7+8 of existing regression suite)
**Run:** `npx vitest run`
**Target:** Every exported function in `src/lib/` has at least one happy-path and one error-path test.

### Layer 2 — Component Tests
**What:** React components in isolation with mocked data
**Tools:** React Testing Library + Vitest (jsdom)
**Scope:**
- `src/components/ui/data-table.tsx` — renders rows, handles sort, bulk select, pagination
- `src/components/contacts/ContactForm.tsx` — validation, submit, error display
- `src/components/listings/ListingForm.tsx` — field rendering, Zod validation
- `src/components/layout/CommandPalette.tsx` — keyboard nav, search, result rendering
- `src/components/layout/NotificationDropdown.tsx` — badge count, mark read
- `src/components/workflow/*.tsx` — phase card rendering, expand/collapse
**Run:** `npx vitest run --config vitest.component.config.ts`
**Target:** Every component with user interaction (forms, modals, tables) has render + interaction tests.

### Layer 3 — Contract Tests
**What:** Zod schema sharing between frontend forms and server actions — ensure shape agreement
**Tools:** Vitest + custom contract assertions
**Scope:**
- `src/actions/contacts.ts` — input schema matches `ContactForm.tsx` output shape
- `src/actions/listings.ts` — input schema matches `ListingForm.tsx` output shape
- `src/actions/showings.ts` — input schema matches `ShowingRequestForm.tsx` output shape
- `src/actions/newsletters.ts` — input schema matches newsletter editor output
- `src/app/api/` route handlers — request/response shapes match TypeScript types in `src/types/`
- Supabase table types in `src/types/database.ts` — match actual DB schema (migration drift detection)
**Run:** `npx vitest run --config vitest.contract.config.ts`
**Target:** Zero schema drift between frontend, server actions, and database types.

### Layer 4 — API Integration Tests
**What:** Server actions + API routes tested against real Supabase test database
**Tools:** Vitest + Supabase test project (or local Supabase via Docker)
**Scope:**
- `src/actions/contacts.ts` — full CRUD cycle with tenant isolation
- `src/actions/listings.ts` — create, update status transitions, delete with cascade
- `src/actions/showings.ts` — create, confirm, complete, cancel lifecycle
- `src/actions/workflow.ts` — phase advancement, sequential enforcement, audit logging
- `src/actions/enrichment.ts` — BC Geocoder and ParcelMap API calls (mocked external)
- `src/actions/newsletters.ts` — create, approve, send, webhook processing
- `src/actions/journeys.ts` — enrollment, phase advancement, cron trigger
- `src/app/api/` GET endpoints — correct auth enforcement, response shapes
- `src/app/api/webhooks/twilio/` — inbound SMS parsing, YES/NO processing
- RLS verification: tenant A cannot read tenant B's data
**Baseline:** 590+ tests (Layers 3+4+5 of existing regression suite)
**Run:** `bash scripts/test-suite.sh && bash scripts/integration-test-newsletter.sh && bash scripts/test-endpoints.sh`
**Dispatch to:** `api-integration` skill for new endpoint tests

### Layer 5 — End-to-End Tests
**What:** Full browser flows through the real application
**Tools:** Playwright
**Scope:**
- Login flow (demo credentials + Google OAuth mock)
- Contact lifecycle: create → view → edit → communicate → delete
- Listing lifecycle: create → workflow phases 1-8 → status transitions
- Showing lifecycle: request → confirm → complete → feedback
- Newsletter lifecycle: create → AI generate → approve → send
- Command palette: Cmd+K → search → navigate
- Notification center: receive → read → dismiss
- Dashboard widgets: pipeline, priorities, activity feed render with data
- Onboarding: wizard → personalization → sample data → checklist
- Mobile responsive: sidebar collapse, bottom nav, touch targets
**Baseline:** 26 Playwright integration tests passing + 60 visual/browser tests
**Run:** `npx playwright test` and `bash scripts/test-visual-browser.sh`
**Dispatch to:** `e2e` skill for new browser flow tests

### Layer 6 — Specialized Quality

#### L6a — Accessibility (axe-core)
**What:** WCAG AA compliance on every page
**Tools:** @axe-core/playwright
**Scope:** All 35+ dashboard routes, all form pages, all modal/sheet overlays
**Baseline:** 18/18 color contrast pairs passing
**Target:** Zero axe violations on any rendered page

#### L6b — Visual Regression
**What:** Screenshot comparison to catch unintended UI changes
**Tools:** Playwright visual comparisons or Percy
**Scope:** Login page, dashboard, listings table, contact detail, workflow stepper
**Run:** `npx playwright test --project=visual`

#### L6c — Internationalization (future)
**What:** String extraction, RTL layout, date/currency formatting
**Status:** Not yet implemented — English only. Placeholder for when i18n is added.

#### L6d — Browser Compatibility
**What:** Chrome, Firefox, Safari, Mobile Safari, Mobile Chrome
**Tools:** Playwright browser matrix
**Run:** `npx playwright test --project=chromium,firefox,webkit`

### Layer 7 — Resilience Tests
**What:** Third-party outage simulation — graceful degradation when external services fail
**Tools:** Vitest + MSW (Mock Service Worker) or custom fetch interceptors
**Scope:**
- **Twilio down:** SMS send fails → showing request queued, user sees error toast, no data loss
- **Supabase slow (>5s):** Loading skeletons render, no timeout crash, retry logic works
- **Supabase unavailable:** Auth fails gracefully → redirect to login with error message
- **Resend down:** Newsletter send fails → status set to `failed`, retry available
- **Google Calendar API error:** Calendar sync fails → local data preserved, error logged
- **Claude AI timeout:** MLS remarks generation fails → user can retry, no partial save
- **Kling AI unavailable:** Content generation shows error state, polling stops gracefully
- **Form server (8767) down:** Form generation shows connection error, not 500
**Target:** Every integration point has a failure test. No integration failure causes data loss or app crash.

### Layer 8 — Load Tests
**What:** Concurrent user simulations to find bottlenecks
**Tools:** k6 or Artillery
**Scope:**
- 50 concurrent listing views
- 20 concurrent contact creates (with tenant isolation)
- 10 simultaneous workflow phase advancements
- Newsletter send to 1000 contacts (queue behavior)
- Command palette search under load (debounce effectiveness)
**Target:** P95 response time <2s for all CRUD operations under load

### Layer 9 — Production Monitoring
**What:** Synthetic monitoring of live endpoints
**Tools:** Vercel Analytics + custom health checks
**Scope:**
- `/api/health` returns 200 (create if not exists)
- Login flow completes in <3s
- Dashboard renders with data in <5s
- Cron endpoints respond to valid Bearer token
- Supabase connection pool health
**Target:** 99.9% uptime, <3s TTFB on critical paths

---

## Quality Gates

### G0 — Pre-Commit (local, automatic)
**Blocks:** `git commit`
**Requires:**
- L0: `tsc --noEmit` passes (zero type errors)
- L0: `eslint` passes (zero errors, warnings allowed)
- L1: `npx vitest run --changed` (unit tests for changed files only)
**Enforced by:** `.husky/pre-commit` hook (or lint-staged)
**Bypass:** Never. If it blocks, fix the issue.

### G1 — Pre-Push (local, automatic)
**Blocks:** `git push`
**Requires:**
- G0 (all pre-commit checks)
- L1: Full unit test suite passes
- L3: Contract tests pass (no schema drift)
**Enforced by:** `.husky/pre-push` hook
**Bypass:** Never.

### G2 — PR Gate (CI, automatic)
**Blocks:** PR merge to `dev`
**Requires:**
- G1 (all pre-push checks)
- L2: Component tests pass
- L4: API integration tests pass (`scripts/test-suite.sh`)
- L5: E2E smoke tests pass (critical path subset)
- L6a: Accessibility — zero new axe violations
- Coverage: No net decrease in line coverage
**Enforced by:** GitHub Actions CI pipeline
**Bypass:** Never for `dev`. Emergency hotfix to `main` requires post-merge full suite within 1 hour.

### G3 — Integration Gate (CI, on `dev` merge)
**Blocks:** Promotion to release candidate
**Requires:**
- G2 (all PR gate checks)
- L4: Full newsletter integration suite (`scripts/integration-test-newsletter.sh`)
- L5: Full E2E suite (all 26+ Playwright tests)
- L6b: Visual regression — no unexpected diffs
- L7: Resilience tests pass (all outage simulations)
**Enforced by:** Post-merge CI job on `dev`
**Run:** `bash scripts/run-all-tests.sh`

### G4 — Release Gate (manual approval + CI)
**Blocks:** PR merge from `dev` to `main`
**Requires:**
- G3 (all integration gate checks)
- L8: Load test results within thresholds
- RTM: 100% requirement coverage (no untested requirements)
- Flake rate: <1% across last 10 runs
- Manual QA sign-off on new features
**Enforced by:** GitHub branch protection (1 approval required) + CI status checks

---

## Task Types

### 1. STRATEGIZE — Plan test approach for a feature or epic

**Trigger:** New feature request, epic kickoff, or sprint planning
**Procedure:**
1. Read the feature spec or PR description thoroughly
2. Identify all affected files: `src/actions/`, `src/app/api/`, `src/components/`, `src/lib/`, `supabase/migrations/`
3. Map requirements to test layers:
   - New server action → L1 (unit for validators) + L4 (integration) + L5 (E2E)
   - New API route → L3 (contract) + L4 (integration)
   - New component → L2 (component) + L5 (E2E) + L6a (accessibility)
   - New migration → L4 (integration) + data integrity tests
   - New integration → L7 (resilience) + L4 (integration with mocks)
4. Estimate test count per layer
5. Assign REQ-IDs: `REQ-{feature}-{seq}` (e.g., `REQ-LISTING-DETAILS-001`)
6. Output: Test strategy document with layer assignments, REQ-IDs, and priority order
7. Update RTM with new requirements

### 2. DISPATCH — Route test implementation to specialty skills

**Trigger:** Strategy approved, ready to write tests
**Procedure:**
1. For each test layer needed, prepare dispatch instructions:
   - **L1/L2/L3:** Implement directly (Vitest + RTL, no special skill needed)
   - **L4 (API integration):** Dispatch to `api-integration` skill with:
     - Endpoint or server action path
     - Input/output shapes (from Zod schemas)
     - Auth requirements (tenant isolation, Bearer token)
     - Expected status codes and error responses
   - **L5 (E2E):** Dispatch to `e2e` skill with:
     - User journey steps (click-by-click)
     - Test data setup requirements
     - Assertions (visual state, DB state, API responses)
   - **L6a (Accessibility):** Dispatch to `e2e` skill with axe-core integration flag
   - **L7 (Resilience):** Dispatch to `api-integration` skill with failure injection specs
2. Track dispatch status in RTM
3. Verify returned tests have correct REQ-IDs in titles

### 3. AUDIT — Assess current test coverage against requirements

**Trigger:** Before release, after major feature, on schedule (weekly)
**Procedure:**
1. Inventory all requirements from:
   - `CLAUDE.md` — feature descriptions, database schema, integrations
   - `docs/functional-specs/` — detailed feature specs
   - `supabase/migrations/` — every table, column, constraint, RLS policy
   - `src/actions/*.ts` — every exported function
   - `src/app/api/**/route.ts` — every API endpoint
   - `src/app/(dashboard)/**/page.tsx` — every page route
2. Cross-reference against existing tests:
   - `scripts/test-suite.sh` — 73+ core tests (baseline)
   - `scripts/integration-test-newsletter.sh` — 3000 newsletter tests
   - `scripts/test-endpoints.sh` — 90 endpoint tests
   - `scripts/test-visual-browser.sh` — 60 visual/browser tests
   - `src/**/*.test.ts` — Vitest unit tests (126+)
   - `tests/**/*.spec.ts` — Playwright E2E tests (26+)
3. Identify gaps: requirements without tests, tests without REQ-IDs
4. Calculate metrics (see Metrics section)
5. Output: Coverage report with gap list, prioritized by risk
6. File coverage debt items in RTM

### 4. TRIAGE — Investigate and classify escaped bugs

**Trigger:** Bug found in `dev` or production that was not caught by tests
**Procedure:**
1. **Reproduce:** Identify exact steps, affected data, environment
2. **Root cause:** Which layer SHOULD have caught this?
   - Type error → L0 gap (TypeScript strictness)
   - Logic error in pure function → L1 gap (missing unit test)
   - UI renders wrong → L2 gap (missing component test)
   - Schema mismatch → L3 gap (missing contract test)
   - Data integrity issue → L4 gap (missing integration test)
   - User flow broken → L5 gap (missing E2E test)
   - Accessibility regression → L6a gap
   - Outage handling failure → L7 gap
3. **Write the missing test FIRST** (red), then fix the bug (green)
4. **Assign REQ-ID** to the new test
5. **Update RTM** with the escaped bug and its layer assignment
6. **Calculate escape cost:** L5 bug found in prod = 10x cost vs. caught at L1
7. **Output:** Bug triage report with root cause, layer gap, fix PR, and prevention recommendation

### 5. CONFIGURE GATES — Set up or update quality gate enforcement

**Trigger:** New CI pipeline, gate requirements change, new tool added
**Procedure:**
1. Map current gate configuration:
   - G0: Check `.husky/pre-commit` or equivalent
   - G1: Check `.husky/pre-push` or equivalent
   - G2: Check GitHub Actions workflow for PR checks
   - G3: Check post-merge CI job
   - G4: Check branch protection rules on `main`
2. Identify missing enforcement:
   - Are all required layers running at each gate?
   - Are failures actually blocking (not just reporting)?
   - Is coverage threshold enforced (no decrease)?
3. Generate configuration files:
   - `.github/workflows/pr-gate.yml` for G2
   - `.github/workflows/integration-gate.yml` for G3
   - `scripts/pre-commit.sh` for G0
4. Test gate enforcement: deliberately introduce a failure, verify it blocks

### 6. REPORT — Generate quality metrics dashboard

**Trigger:** Sprint end, release candidate, on-demand
**Procedure:**
1. Collect raw data:
   - Test counts per layer (from test runners)
   - Pass/fail rates per layer (from `test-results/regression-results.json`)
   - Flake rate (tests that pass on retry but failed initially)
   - Coverage percentages (from Vitest coverage report)
   - RTM completeness (requirements with tests / total requirements)
   - Escaped bug count and layer distribution
2. Calculate metrics (see Metrics section)
3. Compare against targets and previous period
4. Output: Quality report with metrics table, trend arrows, and action items

---

## Requirements Traceability Matrix (RTM)

### Schema (YAML)

```yaml
# File: docs/rtm.yaml
requirements:
  - id: REQ-CONTACT-001
    title: Create contact with tenant isolation
    source: CLAUDE.md > Database Schema > contacts
    priority: P0  # P0=critical, P1=high, P2=medium, P3=low
    status: covered  # covered | partial | uncovered | debt
    tests:
      - layer: L1
        file: src/lib/__tests__/contacts.test.ts
        title: "[REQ-CONTACT-001] validates contact create input"
      - layer: L4
        file: scripts/test-suite.sh
        title: "[REQ-CONTACT-001] CRUD create contact returns 201"
      - layer: L5
        file: tests/contacts.spec.ts
        title: "[REQ-CONTACT-001] user can create contact from UI"

  - id: REQ-LISTING-WF-001
    title: Workflow phase advancement is sequential
    source: CLAUDE.md > 8-Phase Listing Workflow
    priority: P0
    status: partial
    tests:
      - layer: L4
        file: scripts/test-suite.sh
        title: "[REQ-LISTING-WF-001] phase skip returns 400"
    gaps:
      - layer: L5
        description: "Missing E2E test for workflow stepper UI enforcement"

  - id: REQ-RLS-001
    title: Tenant A cannot read Tenant B data
    source: CLAUDE.md > Multi-Tenancy & RLS
    priority: P0
    status: covered
    tests:
      - layer: L4
        file: scripts/test-suite.sh
        title: "[REQ-RLS-001] cross-tenant query returns empty"
```

### RTM Operations
- **Add requirement:** When a new feature is planned (STRATEGIZE task)
- **Link test:** When a test is written with a REQ-ID (DISPATCH task)
- **Mark gap:** When audit finds untested requirement (AUDIT task)
- **Close gap:** When missing test is added and passes
- **Escape flag:** When a bug escapes to production (TRIAGE task)

---

## Metrics

| Metric | Formula | Target | Current Baseline |
|--------|---------|--------|-----------------|
| **RTM completeness** | requirements with >=1 test / total requirements | >95% | ~60% (estimated) |
| **Pyramid ratio** | L1:L2:L3:L4:L5 test counts | 50:25:10:10:5 | Inverted (heavy L4/L5, light L1/L2) |
| **Flake rate** | flaky runs / total runs (last 30 days) | <1% | Unknown (no tracking yet) |
| **Mutation score** | killed mutants / total mutants (Stryker) | >80% | Not yet measured |
| **Escape rate** | bugs found in prod / total bugs found | <5% | Unknown |
| **Gate pass rate** | PRs passing G2 on first attempt / total PRs | >90% | Unknown |
| **Mean time to green** | avg time from red CI to green CI | <15 min | Unknown |
| **Coverage delta** | line coverage change per PR | >=0% | No threshold enforced |

---

## Existing Test Baseline (as of 2026-04-20)

The current Realtors360 test infrastructure provides a strong L4/L5 foundation. The orchestrator builds on top of this — it does not replace it.

| Suite | Script | Tests | Layers |
|-------|--------|-------|--------|
| Core CRM | `scripts/test-suite.sh` | 73+ | L4 |
| Newsletter Integration | `scripts/integration-test-newsletter.sh` | 3,000 | L4 |
| API Endpoints | `scripts/test-endpoints.sh` | 90 | L4 |
| Visual/Browser | `scripts/test-visual-browser.sh` | 60 | L5, L6b |
| Newsletter Unit (Vitest) | `npx vitest run` (newsletter service) | 121 | L1 |
| CRM Unit (Vitest) | `npx vitest run` (CRM) | 5+ | L1 |
| Playwright E2E | `npx playwright test` | 26 | L5 |
| Full Regression | `scripts/run-all-tests.sh` | 3,500+ | L0-L5 |

**Key gaps to close (priority order):**
1. L1 unit tests for `src/actions/*.ts` — server action logic is only tested at L4
2. L2 component tests — zero component-level tests currently
3. L3 contract tests — no automated schema drift detection
4. L6a accessibility — manual checks only, no automated axe scans in CI
5. L7 resilience — no failure injection tests for any integration
6. RTM — no formal requirements traceability exists yet

---

## Dispatch Reference — Specialty Skills

| Skill | Invocation | Use For |
|-------|-----------|---------|
| `test` | `/test` | Run existing 73-test core suite (`scripts/test-suite.sh`) |
| `regression` | `/regression` | Run full 3,500+ test regression (`scripts/run-all-tests.sh`) |
| `e2e` | Context-triggered | Playwright browser flow tests, accessibility scans |
| `api-integration` | Context-triggered | Server action + API route integration tests |
| `mcp-consumer` | Context-triggered | MCP tool integration tests (Playwright MCP, etc.) |

---

## Decision Log

When the orchestrator makes a routing or prioritization decision, it logs:

```yaml
decision:
  date: 2026-04-20
  context: "New listing property details feature on branch claude/listing-property-details"
  question: "Which layers need new tests?"
  options:
    - "L4 only (integration) — fast, covers data flow"
    - "L1 + L4 + L5 — full pyramid coverage"
    - "L5 only (E2E) — covers user-visible behavior"
  chosen: "L1 + L4 + L5"
  reasoning: "Listing details touches server actions (needs L1 for validators), DB queries (needs L4 for integration), and user-facing workflow (needs L5 for E2E). Pyramid principle requires lowest-layer-first coverage."
```
