# Final Gap Report: Agent Infrastructure + Testing + Implementation

> **Date:** March 30, 2026
> **Version:** 1.0 — Post-verification, all inputs consolidated
> **Scope:** Complete gap analysis after playbook v8.0, hooks v2, subagents, templates, verified bug fixes, and fully-automated testing mandate
> **Method:** 3 parallel verification agents + codebase audit + competitive research

---

## CURRENT STATE INVENTORY

### What We Have

| Layer | Files | Test Count | Status |
|-------|-------|-----------|--------|
| **API + DB tests** | `test-suite.sh` | 73 | Active, healthy |
| **Browser eval scripts** | `eval-browser-ui.mjs` | 22 | Playwright, clicks tabs |
| **E2E journey evals** | `eval-e2e-journeys.mjs` | 94 | Full buyer/seller/dormancy workflows |
| **Edge case evals** | `eval-edge-cases.mjs` | 149 | Constraint violations, boundaries |
| **Template/campaign evals** | `eval-campaigns-templates.mjs` | 91 | Email block assembly, HTML validation |
| **Trigger engine evals** | `eval-trigger-engine.mjs` | 36 | State machine transitions |
| **Webhook/compliance evals** | `eval-webhooks-compliance.mjs` | 90 | Webhook simulation, CASL compliance |
| **Full 1000-contact eval** | `eval-full-1000.mjs` | 167 | Bulk operations, schema integrity |
| **Email engine QA** | `qa-test-email-engine.mjs` | 27 | Resend + AI + DB pipeline |
| **AI agent QA** | `qa-test-ai-agent.mjs` | 56 | Full 10-section agent workflow |
| **Email marketing UI** | `test-email-marketing-ui.mjs` | 100+ | HTTP-based page testing |
| **Workflow emails** | `test-workflow-emails.mjs` | 30 | 7 workflow step execution |
| **Playwright specs** | `tests/browser/*.spec.ts` | 64 | Page load + some interactions |
| **Total** | **16 files** | **~1000** | |

### What We Built This Session

| File | Purpose | Status |
|------|---------|--------|
| `.claude/agent-playbook.md` v8.0 | SDLC state machine, verification lattice, model routing | Done |
| `.claude/hooks/secret-scan.sh` | Blocks commits with API keys (12 patterns) | Done, has bug |
| `.claude/hooks/auto-lint.sh` | Auto ESLint --fix after edits | Done |
| `.claude/agents/` (4 agents) | security, code, test, migration reviewers | Done |
| `AGENTS.md` | Cross-tool instructions | Done |
| `docs/templates/TEST_CASE_TEMPLATE.md` | 10-category test structure | Done, needs update |
| `docs/templates/USE_CASE_TEMPLATE.md` | 7-category use case structure | Done |
| `docs/ANALYSIS_Playbook_Enhancement.md` | 18-gap enhancement analysis | Done |
| Updated `settings.json` | 6 hooks registered | Done, timeout issue |
| Updated `completion-gate.sh` | Automated tsc --noEmit | Done, timeout issue |
| Updated `package.json` | 7 new npm scripts | Done |
| Updated `deploy.md` | Removed hardcoded secrets | Done |
| Updated `hooks/README.md` | Documented all 6 hooks | Done |

---

## ALL REMAINING GAPS

### CATEGORY 1: CRITICAL BUGS (Fix before any implementation)

#### GAP C1: Hardcoded Secrets in 10+ Test Scripts

**Severity: CRITICAL**
**Files:** All `eval-*.mjs`, `qa-test-*.mjs`, `test-email-marketing-ui.mjs`, `test-workflow-emails.mjs`
**Evidence:** `eval-full-system.mjs:21-23` contains plaintext Supabase service role JWT, Resend API key, and CRON_SECRET. These files are committed to git.
**Impact:** Anyone with repo access has full Supabase admin access and can send emails via Resend.
**Fix:** Replace all hardcoded credentials with `process.env.*` reads. Add fallback error: `throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY — run scripts/vault.sh decrypt')`.

#### GAP C2: secret-scan.sh Pipe Bug (Line 59)

**Severity: HIGH**
**File:** `.claude/hooks/secret-scan.sh:59`
**Evidence:** `echo "$ADDED_LINES" | grep -qE 'sk-[a-zA-Z0-9]{32,}' | grep -vE 'sk-ant'` — the `-q` flag on the first grep suppresses all output, so the second grep receives empty stdin. The `sk-ant` exclusion filter is dead code.
**Impact:** Not critical in practice (Anthropic and OpenAI key patterns don't overlap due to hyphen characters), but the exclusion logic doesn't work as intended.
**Fix:**
```bash
# Replace line 59 with:
if echo "$ADDED_LINES" | grep -E 'sk-[a-zA-Z0-9]{48,}' | grep -qv 'sk-ant'; then
```

#### GAP C3: completion-gate.sh Timeout = 5s

**Severity: HIGH**
**File:** `.claude/settings.json:68`
**Evidence:** Stop hook timeout is 5 seconds. `completion-gate.sh` runs `npx tsc --noEmit` which takes 10-30s on a real Next.js project. Default Claude Code hook timeout is 600s — we self-imposed 5s.
**Impact:** TypeScript compilation never completes → false positive "TS failed" errors on micro/small tasks, or timeout = fail-open (broken code passes).
**Fix:** Change `"timeout": 5` to `"timeout": 60` on the Stop hook in settings.json.

---

### CATEGORY 2: TESTING GAPS (No manual tests — everything automated)

#### GAP T1: No Component-Level Interaction Tests

**Severity: CRITICAL**
**What's missing:** Nobody tests "does clicking the Edit button on Contact Detail open the form with pre-filled data and persist changes on Save?"

**Current state:**
- `test-suite.sh` checks `curl /contacts/[id]` → 200. Page loads. That's it.
- `eval-browser-ui.mjs` clicks tabs on /newsletters page only (22 tests).
- `tests/browser/*.spec.ts` has 64 tests for page loads and some text matching.

**What's needed:** Playwright tests that click EVERY button, open EVERY modal, submit EVERY form, switch EVERY tab, on EVERY page.

**Pages requiring component interaction tests:**

| Page | Interactive Elements | Estimated Tests |
|------|---------------------|----------------|
| `/` (Dashboard) | Pipeline cards, AI recommendations, reminders widget, quick actions | 30 |
| `/listings` | Filter, sort, search, create button, list cards | 25 |
| `/listings/[id]` | Edit form, phase stepper, document upload, showing request, all 8 phase tabs | 80 |
| `/listings/[id]/workflow` | Phase advancement, form generation, enrichment triggers, MLS remarks | 60 |
| `/contacts` | Search, filter (buyer/seller), create, segment builder, import | 30 |
| `/contacts/[id]` | Edit, delete, tabs (overview/intelligence/activity/deals/comms), add note, send message, timeline | 70 |
| `/showings` | Create request, confirm/deny, reschedule, calendar link, communication log | 40 |
| `/showings/[id]` | Status actions (confirm/deny/cancel), lockbox delivery, calendar sync | 25 |
| `/calendar` | Month/week/day views, event creation, availability check, Google sync | 30 |
| `/newsletters` | 7 tabs, approval queue (approve/edit/reject/skip), campaign creation, analytics charts, settings toggles | 100 |
| `/content` | Content stepper (3 steps), AI prompt generation, Kling task polling, gallery | 35 |
| `/tasks` | Create, status change, priority, assignment, due date, bulk actions | 25 |
| `/pipeline` | Deal cards, stage drag, contact link, value display, pipeline switch | 30 |
| `/forms` | Form generation, template selection, CDM mapping, PDF preview | 25 |
| `/search` | Multi-entity results, keyboard navigation, recent items, "Ask AI" fallback | 20 |
| `/settings` | All toggles, frequency caps, quiet hours, voice rules, CASL config | 25 |
| `/automations` | Workflow builder (React Flow), step creation, template assignment | 40 |
| **Total** | | **~690** |

**Format:** `tests/browser/components/[page].spec.ts` — standard Playwright, runs with `npx playwright test`.

#### GAP T2: No Cross-Feature Integration Tests in Playwright

**Severity: HIGH**
**What's missing:** The eval scripts trace journeys at the API/DB level but don't test the UI flow. A user action that touches 5 systems needs an end-to-end browser test.

**Missing cross-feature journeys:**

| Journey | Touchpoints | Tests |
|---------|-------------|-------|
| **Listing intake → enrichment → forms → MLS** | Listings page → create → Phase 1 form → Phase 2 enrichment APIs → Phase 5 form generation → Phase 7 MLS remarks | 25 |
| **Contact → showing → calendar → communication** | Contact detail → request showing → seller notification → confirmation webhook → calendar event → communication log | 20 |
| **New listing → auto-enroll buyers → AI draft → approve → send → track** | Listing create → matching contacts → journey enrollment → AI email generation → approval queue → Resend send → open/click tracking | 20 |
| **Cmd+K search → result → detail → action** | Cmd+K → type query → results appear → click contact → detail loads → click "Draft email" → email compose | 15 |
| **Dashboard morning routine** | Dashboard load → review pipeline → check AI recommendations → approve drafts → view today's showings → open first contact | 15 |
| **Workflow builder → execution → email** | Create workflow in builder → assign template → trigger enrollment → workflow engine processes step → email sent | 15 |
| **Contact lifecycle (lead → dormancy → re-engagement)** | Create contact → auto-enroll → emails sent → no engagement → dormancy flag → re-engagement campaign → click → reactivation | 15 |
| **Total** | | **~125** |

**Format:** `tests/browser/journeys/[workflow].spec.ts`

#### GAP T3: No Automated Accessibility Tests

**Severity: MEDIUM**
**What's missing:** Zero automated WCAG compliance testing.
**Fix:** Add `@axe-core/playwright` for automated a11y scans on every page.

```typescript
// tests/browser/accessibility/all-pages-a11y.spec.ts
import AxeBuilder from '@axe-core/playwright';

test('dashboard has no a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
// Repeat for every page route
```

**Estimated tests:** 35 (one per page route) + 20 (component-specific: modals, dropdowns, forms)

#### GAP T4: No Visual Regression Tests

**Severity: LOW**
**What's missing:** No screenshot comparison to catch CSS drift.
**Fix:** Playwright `toHaveScreenshot()` on key pages × 2 viewports (desktop + mobile).

**Estimated tests:** 40 (20 pages × 2 viewports)

#### GAP T5: No Performance Threshold Tests

**Severity: MEDIUM**
**What's missing:** No automated checks that pages load under 3 seconds.
**Fix:** Playwright `page.evaluate(() => performance.timing)` + LCP/CLS/FID thresholds.

**Estimated tests:** 20 (critical pages with load time assertions)

#### GAP T6: No Security Automation Tests (Browser-Level)

**Severity: MEDIUM**
**What's missing:** Webhook/API security is tested in eval scripts, but no browser-level security tests.
**Fix:** Playwright tests for:
- Unauthenticated navigation → redirect to /login
- Cross-user data isolation (login as user A, try to access user B's data)
- XSS in user-generated content (inject `<script>` in contact name, verify it's escaped)
- CSRF protection on forms

**Estimated tests:** 30

#### GAP T7: Eval Scripts Not Integrated into Single Test Command

**Severity: MEDIUM**
**What's missing:** 12 separate `node scripts/eval-*.mjs` commands. No single `npm test:all` that runs everything.
**Fix:** Add orchestrator script or npm script that runs all evals in sequence with unified reporting.

#### GAP T8: No Vitest Configuration

**Severity: MEDIUM**
**What's missing:** `package.json` has `"test:quick": "npx vitest run"` but no `vitest.config.ts` exists. Fast unit testing for pure functions (formatters, validators, mappers) doesn't work.
**Fix:** Create `vitest.config.ts`, add unit tests for `src/lib/*.ts` pure functions.

---

### CATEGORY 3: INFRASTRUCTURE GAPS

#### GAP I1: .claude/rules/ Directory Not Created

**Severity: MEDIUM**
**What's missing:** Official Claude Code docs support `.claude/rules/*.md` for modular instructions loaded on demand. Playbook is 800+ lines (should be <200). The split was discussed and verified as feasible but not implemented.
**Fix:** Create `.claude/rules/` with path-scoped rule files:
- `execution-patterns.md` (paths: `src/**`) — "Add a Page", "Add a Server Action", etc.
- `domain-contacts.md` (paths: `src/**/contacts/**`) — Contact domain rules
- `domain-email.md` (paths: `src/**/newsletters/**`, `src/emails/**`) — Email engine rules
- `domain-workflow.md` (paths: `src/**/workflow/**`) — Workflow rules
- `domain-voice.md` (paths: `voice_agent/**`) — Voice agent rules

Keep core playbook at ~200 lines: hard constraints, state machine, classification, verification lattice.

#### GAP I2: CLAUDE.md Missing Infrastructure References

**Severity: MEDIUM**
**What's missing:** CLAUDE.md doesn't mention `.claude/agents/`, `.claude/hooks/`, AGENTS.md, or `.claude/rules/`.
**Fix:** Add to CLAUDE.md after "Agent Playbook" section:
```
### Agent Infrastructure
- **Playbook:** `.claude/agent-playbook.md` — process rules
- **Hooks:** `.claude/hooks/` — 6 mechanical enforcement hooks
- **Subagents:** `.claude/agents/` — security, code, test, migration reviewers
- **Cross-tool:** `AGENTS.md` — vendor-neutral instructions
```

#### GAP I3: Playbook Claims 14 Task Types, Only 9 Defined

**Severity: LOW**
**File:** CLAUDE.md references "14 task types" but playbook Section 3 lists 9.
**Fix:** Update CLAUDE.md to say "9 task types" or add the missing 5 types to the playbook.

#### GAP I4: test-writer Subagent Doesn't Reference Template or Playwright

**Severity: MEDIUM**
**What's missing:** `test-writer.md` generates vitest scripts but has no awareness of:
- `TEST_CASE_TEMPLATE.md` (output structure)
- Playwright test format (component interaction tests)
- 10-category distribution (Happy Path 15%, Security 10%, etc.)
- Cross-feature journey pattern
- Automated-only mandate (no manual tests)

**Fix:** Rewrite `test-writer.md` with dual output (documented test plan + executable Playwright/script), referencing the template and enforcing 100% automation.

#### GAP I5: TEST_CASE_TEMPLATE.md Has "Manual" Category

**Severity: MEDIUM**
**File:** `docs/templates/TEST_CASE_TEMPLATE.md:238`
**Evidence:** Automation Plan table includes "Manual | [N] (visual, UX, exploratory) | Human QA | Before release"
**Fix:** Remove the Manual row. All tests automated.

#### GAP I6: Playbook Section 20 References Manual Testing

**Severity: MEDIUM**
**File:** `agent-playbook.md` Section 20
**Evidence:** Section 20.2 mentions "Semi-automated" and Section 20.6 mentions "Manual exploration happens separately as QA review."
**Fix:** Rewrite Section 20 to enforce fully automated testing only. Semi-automated → fully automated via Playwright. Manual → eliminated.

#### GAP I7: code-reviewer Checklist Incomplete

**Severity: LOW**
**What's missing:** No checks for: logging/PII in console output, TypeScript strictness (const, readonly), React hooks dependency arrays.
**Fix:** Add 3 checklist items.

#### GAP I8: security-reviewer Checklist Incomplete

**Severity: LOW**
**What's missing:** No checks for: hardcoded secrets in code, rate limiting, CORS/CSRF, dependency supply chain.
**Fix:** Add 4 checklist items.

#### GAP I9: Playbook-reminder.sh Verbose Output

**Severity: LOW**
**What's missing:** Injects ~50 tokens of boilerplate on every user message. Could be trimmed.
**Fix:** Remove "Follow .claude/agent-playbook.md for next steps. Update .claude/current-task.json as you complete each phase." — keep only the task state line.

---

## PRIORITY MATRIX

### P0 — Fix Before Next Implementation

| # | Gap | Effort | Impact |
|---|-----|--------|--------|
| C1 | Hardcoded secrets in 10+ eval scripts | 2 hours | Security — anyone with repo access has admin keys |
| C2 | secret-scan.sh pipe bug | 5 min | Hook logic doesn't work as intended |
| C3 | completion-gate.sh 5s timeout | 5 min | tsc never completes on real projects |
| I5 | Template has "Manual" category | 5 min | Contradicts fully-automated testing mandate |
| I6 | Playbook references manual testing | 15 min | Contradicts fully-automated testing mandate |

### P1 — Build Before Feature Development

| # | Gap | Effort | Impact |
|---|-----|--------|--------|
| T1 | Component interaction tests (~690 tests) | 5-7 days | Every button, form, modal, tab tested automatically |
| T2 | Cross-feature journey tests (~125 tests) | 2-3 days | Full workflows across 3-5 pages |
| T7 | Unified test command | 2 hours | One command runs everything |
| I1 | Split playbook into .claude/rules/ | 3 hours | Agent performance improves with <200 line core |
| I4 | Rewrite test-writer for Playwright + dual output | 2 hours | Subagent generates useful tests |

### P2 — Build During Feature Development

| # | Gap | Effort | Impact |
|---|-----|--------|--------|
| T3 | Automated accessibility tests (~55 tests) | 1 day | WCAG 2.1 AA automated |
| T5 | Performance threshold tests (~20 tests) | 4 hours | Pages guaranteed <3s load |
| T6 | Browser-level security tests (~30 tests) | 1 day | XSS, CSRF, auth tested in browser |
| T8 | Vitest configuration + unit tests | 1 day | Fast unit test loop for pure functions |
| I2 | CLAUDE.md infrastructure references | 30 min | New developers find agent infra |
| I7 | code-reviewer checklist additions | 15 min | Better review coverage |
| I8 | security-reviewer checklist additions | 15 min | Better security coverage |

### P3 — Nice to Have

| # | Gap | Effort | Impact |
|---|-----|--------|--------|
| T4 | Visual regression screenshots (~40 tests) | 1 day | Catches CSS drift |
| I3 | Fix "14 task types" claim | 5 min | Documentation accuracy |
| I9 | Trim playbook-reminder.sh | 10 min | ~30 tokens/message saved |

---

## EFFORT SUMMARY

| Priority | Gap Count | Total Effort |
|----------|-----------|-------------|
| P0 | 5 | 3 hours |
| P1 | 5 | 8-12 days |
| P2 | 7 | 3-4 days |
| P3 | 3 | 1 day |
| **Total** | **20 gaps** | **12-18 days** |

---

## THE BIG PICTURE

### What's Strong
- **827+ existing automated tests** across 16 files — far more than most CRM projects
- **Mechanical enforcement** via 6 hooks — can't skip playbook, can't commit secrets, can't push to main
- **4 specialized subagents** — security, code, test, migration reviewers
- **State machine enforcement** — classify → scope → plan → implement → verify → review → commit

### What's Missing (The 3 Big Gaps)

1. **Component interaction tests.** We have 1000 tests but most check "does this exist?" not "does this work when you click it?" The gap is ~690 Playwright tests that click every button on every page. This is the largest single gap.

2. **Cross-feature integration tests in the browser.** The eval scripts trace workflows at the DB level, but nobody verifies that "create showing → Twilio webhook → calendar event → communication log" works as a user would experience it. The gap is ~125 journey tests.

3. **Hardcoded secrets in test scripts.** 10+ files have plaintext API keys committed to git. This is the most urgent security fix.

### After Fixing These Gaps

The test suite would be:

| Layer | Current | After |
|-------|---------|-------|
| Component interaction (Playwright) | 64 tests (page loads) | **754** (every button, form, modal) |
| Cross-feature journeys (Playwright) | 0 (only eval scripts at DB level) | **125** (browser-level workflows) |
| API + DB (test-suite.sh + evals) | 763 tests | 763 (no change needed) |
| Accessibility (axe-core) | 0 | **55** |
| Performance (thresholds) | 20 (in eval-e2e-journeys.mjs) | **40** |
| Security (browser) | 0 | **30** |
| Visual regression | 0 | **40** |
| **Total** | **~827** | **~1807** |

**From ~827 to ~1800 automated tests.** Zero manual. Every button clicked. Every workflow traced. Every page accessible. Every commit secret-scanned.
