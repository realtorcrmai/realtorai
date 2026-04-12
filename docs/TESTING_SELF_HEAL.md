# Testing Self-Heal Architecture

**Status:** Active
**Workflows:** 3 GitHub Actions + 1 CLI script

---

## Closed-Loop Pipeline

```
  Developer pushes code to dev
           │
           ▼
  ┌─────────────────────────────────┐
  │  CI (on every PR)               │
  │  ├── TypeScript                 │
  │  ├── Lint                       │
  │  ├── Build                      │
  │  ├── Docs freshness audit       │
  │  └── Test plan freshness audit  │◄── blocks merge if test plans stale
  └─────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────┐
  │  Test Plan Sync (on push)       │  .github/workflows/test-plan-sync.yml
  │  ├── Detect new endpoints/pages │
  │  ├── Generate test stubs        │
  │  └── Open PR with new stubs     │◄── auto-keeps stubs in sync with code
  └─────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────┐
  │  Nightly Regression (2am PT)    │  .github/workflows/nightly-regression.yml
  │  ├── TypeScript + Build         │
  │  ├── Core CRM (500 tests)       │
  │  ├── Newsletter (3000 tests)    │
  │  ├── Endpoints (90 tests)       │
  │  ├── Visual (60 tests)          │
  │  ├── Generated stubs (660+)     │
  │  ├── Test plan sync check       │
  │  └── Upload results artifact    │
  └─────────────────────────────────┘
           │
       PASS│         FAIL
           │           │
           ▼           ▼
        Done    ┌──────────────────────┐
                │  Auto-Heal (on fail) │  .github/workflows/auto-heal.yml
                │  ├── Reproduce       │
                │  ├── Capture output  │
                │  ├── Diagnose        │
                │  └── Open GH issue   │  ◄── no API cost
                └──────────────────────┘
                         │
                         ▼
                ┌──────────────────────┐
                │  GitHub Issue opened │
                │  ├── Failure report  │
                │  ├── Per-suite diff  │
                │  └── Fix instructions│
                └──────────────────────┘
                         │
                         ▼
                Developer or Claude Code
                session picks up issue
                and fixes the code
```

---

## Three Self-Healing Scenarios

### Scenario 1: New API endpoint without test

```
Developer adds:  src/app/api/contacts/[id]/notes/route.ts
                 ↓
CI blocks PR:    "Test plan audit: /api/contacts/:id/notes — no test case"
                 ↓
Developer adds test case to TEST_PLAN_1000.md
                 ↓
Test Plan Sync:  Detects new test case, generates stub in test-plan-generated.sh
                 ↓
Nightly:         Runs the new stub → passes or fails
                 ↓
If fails:        Auto-Heal creates PR fixing the stub assertion
```

### Scenario 2: Code change breaks existing test

```
Developer changes:  src/actions/contacts.ts (renames a field)
                    ↓
Nightly regression: "❌ Contact update: expected 'phone' got 'phone_number'"
                    ↓
Auto-Heal triggers: Reproduces failure, captures exact error
                    ↓
GitHub Issue:       "[Regression] 1 test failure — 2026-04-12"
                    with failure output, affected suite, fix instructions
                    ↓
Developer or Claude Code session picks up the issue and fixes it
```

### Scenario 3: Test plan drift detection

```
Test plans document 923 cases, but only 247 are executable
                    ↓
Nightly sync check: "Coverage: 28.5% — drift detected"
                    ↓
Auto-generates:     660 test stubs covering uncovered cases
                    ↓
Opens GitHub issue:  "Test plan drift: 660 cases need executable tests"
                    ↓
Next nightly run:   Includes generated stubs (660 additional tests)
```

---

## Workflow Files

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Every PR | Blocks merge if test plans stale |
| `test-plan-sync.yml` | Push to dev (API/page/action changes) | Auto-generate test stubs from plans |
| `nightly-regression.yml` | 2am Pacific daily + manual | Run all 3,500+ tests + sync check |
| `auto-heal.yml` | Nightly failure + manual | Claude Code diagnoses + fixes + PRs |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/audit-test-plans.mjs` | 7-check freshness audit (CI blocker) |
| `scripts/sync-test-plans.mjs --check` | Compare plan cases vs executable tests |
| `scripts/sync-test-plans.mjs --generate` | Auto-generate bash stubs from plans |
| `scripts/test-plan-generated.sh` | Auto-generated executable test stubs |
| `scripts/run-all-tests.sh` | Master regression runner (8 layers) |

## Required GitHub Secrets

No additional secrets needed. The auto-heal workflow uses only the
existing Supabase/NextAuth/Resend secrets to reproduce failures.
No Claude API calls — diagnosis is reported via GitHub Issues.

## Manual Triggers

All workflows support `workflow_dispatch` for manual triggering:

```bash
# Trigger nightly regression manually
gh workflow run "Nightly Regression + Test Plan Sync"

# Trigger auto-heal with context
gh workflow run "Auto-Heal — Fix Regression Failures" \
  -f failure_context="Contact API returns 500 on POST"

# Trigger test plan sync
gh workflow run "Test Plan Auto-Sync"
```
