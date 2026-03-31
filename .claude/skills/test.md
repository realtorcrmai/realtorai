---
name: test
description: Run the full Realtors360 test suite — navigation, CRUD, constraints, auth, cascade, sample data validation
user_invocable: true
---

Run the comprehensive test suite for Realtors360 CRM.

## Steps

1. **Check dev server is running** on localhost:3000. If not, start it with `npm run dev &` and wait 8 seconds.

2. **Run the test suite**: `bash scripts/test-suite.sh`

3. **Report results** to the user with the pass/fail summary.

4. **If any tests fail**, investigate the root cause and fix it. Then re-run only the failed tests to confirm.

5. **After all tests pass**, save the state: `bash scripts/save-state.sh`

## What It Tests (73 tests)

- **Navigation (35):** All page routes return 200/307
- **API Auth (5):** Protected endpoints enforce auth, exempt routes work
- **CRUD (16):** Create/Read/Update/Delete for contacts, listings, tasks, deals, households, communications
- **Data Integrity (6):** NOT NULL, CHECK constraints, UNIQUE, self-relationship prevention
- **Cron Auth (4):** Bearer token required, rejects invalid/missing tokens
- **Cascade Delete (1):** Contact deletion cascades to communications
- **Sample Data (7):** Property type diversity, status variety, CASL consent, households, relationships

## When to Run

| Trigger | Scope |
|---------|-------|
| After any code change | `npx vitest run` (unit tests only — fast) |
| After 5+ files changed | Full suite: `bash scripts/test-suite.sh` |
| Before every build/deploy | Full suite (mandatory — see CLAUDE.md) |
| After schema migration | Full suite + verify migration constraints |
| After new feature complete | Full suite + any new feature-specific tests |

## Post-Feature Validation Checklist

When a new feature is built, the test run must also verify:

1. **New routes return 200** — add the page route to the navigation test list in test-suite.sh
2. **New API endpoints work** — test CRUD operations for any new server actions
3. **Data integrity holds** — test FK constraints, NOT NULL, CHECK for new columns/tables
4. **Integration points work** — if feature touches Twilio/Resend/Calendar, verify the call path
5. **Existing tests still pass** — zero regressions from the new feature
6. **Edge cases covered** — empty inputs, null values, duplicates, concurrent ops, invalid state transitions
