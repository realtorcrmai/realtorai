# DEBUGGING Playbook

> Task type: `DEBUGGING:error`, `DEBUGGING:performance`, `DEBUGGING:data_issue`

---

## Phase 1 — Restate Symptom

Precisely. Error message? Stack trace? When does it occur? Scope?

## Phase 2 — Reproduce

Trace call path. Check: data issue? env issue? race condition?

## Phase 3 — Hypotheses

Form 2-4, ordered by likelihood. Check most likely first.

## Phase 4 — Minimal Fix

Fix ONLY the bug. No surrounding refactors.

## Phase 5 — Regression Test

Write test that catches this bug. Grep for same anti-pattern elsewhere.
