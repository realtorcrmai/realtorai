# TESTING Playbook

> Task type: `TESTING:unit`, `TESTING:integration`, `TESTING:e2e`, `TESTING:eval`

---

## Phase 1 — Determine Level

- Unit / integration / e2e / eval
- e2e: use Playwright (`playwright.config.ts`, run: `npx playwright test`)
- Check existing tests + `evals.md` (200 QA test cases at repo root)
- Check `scripts/eval-*.mjs` (8 eval suites) before creating new

## Phase 1.5 — Test Documentation

Each core feature must have a `tests/<feature-name>.md` that:
- Lists ALL test cases: happy path, edge cases, error conditions, race conditions, cascade effects
- Marks each as: `[auto]` (with file path), `[manual]` (with steps), `[pending]` (not yet implemented)
- Tracks coverage: X of Y test cases automated

When to update:
- Adding functionality → add test cases to relevant MD file
- Changing behavior → update affected test cases
- Bug fix → add the test case that would have caught the bug

Existing test inventory (check before creating new):
- `evals.md` — 200 QA test cases (high-level)
- `scripts/test-suite.sh` — 73+ automated tests
- `scripts/qa-test-email-engine.mjs` — 28 email marketing tests
- `scripts/eval-*.mjs` — 8 domain-specific eval suites
- `tests/` — Playwright e2e tests

## Phase 2 — Test Plan

Cover: happy path, empty/null inputs, boundary values, duplicates, race conditions, cascade effects, permission denied, timeout/retry

## Phase 3 — Implement

Use vitest. Deterministic, isolated, descriptive names.

## Phase 4 — Failure Analysis

Classify each failure: environment / flaky / actual bug / wrong assertion

## Phase 5 — Report

X/Y passing, gaps identified, recommendations
