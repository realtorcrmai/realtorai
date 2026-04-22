<!-- docs-audit-reviewed: 2026-04-21 --task-mgmt -->
<!-- docs-audit: tests/**, scripts/test-*, vitest.config.ts -->
<!-- last-verified: 2026-04-13 -->
# Testing Strategy — Realtors360 CRM

> **Status:** Reference doc. Approved direction for the test-infra refactor.
> **Created:** 2026-04-08
> **Owner:** Engineering — see compliance log entries dated 2026-04-08 for execution.
> **Scope:** Realtors360 CRM (`/realestate-crm`) and the nested newsletter service (`/realestate-crm/realtors360-newsletter`).

This document defines how Realtors360 is tested — locally, in CI, and in production. It is grounded in the actual stack (Next.js 16 + Vitest + Playwright MCP + Supabase + Vercel + Resend + the nested newsletter service), not a generic template. Where infrastructure already exists, this doc references it. Where it does not, the gap is called out explicitly.

---

## 1. Real-Time (Production-Like) Testing

### 1.1 Layers

| Layer | Tooling | What it catches |
|---|---|---|
| Smoke / health | `scripts/health-check.sh` | server up, env vars present, Supabase reachable |
| API contract | `scripts/test-suite.sh` (73 tests) | route 200s, CRUD, auth, cron Bearer, cascade deletes |
| Email pipeline | `scripts/qa-test-email-engine.mjs` (27) + `scripts/test-workflow-emails.mjs` (46 real sends) | text-pipeline, quality scorer, Resend delivery |
| UI flows | Playwright MCP (already wired globally) | clicks, screenshots, console errors, mobile 375px viewport |
| Service unit | Vitest in `realtors360-newsletter/` (67 currently) | pure functions, schemas, retry logic |
| Production canaries | Spec'd in `memory/project_production_testing.md` — **not built** | post-deploy validation against live infra |

### 1.2 Real-Time Data Handling

- **Seed isolation:** every test run reseeds via `scripts/seed-demo.mjs` (idempotent, phone prefix `+1604555` so seed contacts can't collide with real ones).
- **Tenant isolation:** all DB reads go through `getAuthenticatedTenantClient()` — tests for new actions MUST assert that cross-tenant queries return zero rows. The cross-tenant bug caught during the M3-C newsletter port (`src/lib/learning-engine.ts:51`) is exactly what this rule prevents in the future.
- **External services:** stub Anthropic, Voyage, Resend, Twilio in unit tests. Hit real APIs only in nightly full-suite runs against a dedicated `staging` Supabase project.

### 1.3 Monitoring & Validation in Production

- Vercel logs + Supabase dashboards (already configured)
- **Gap to add:** post-deploy health probe that hits `/api/health`, `/api/cron/*` (with valid Bearer), and one read on each major table — runs as a Vercel Cron 5 min after deploy, alerts to a Slack webhook if anything 5xxs.

---

## 2. Full QA Team Plan (Local Environment)

Treat each role as a *swimlane*, not a person — one developer wears multiple hats but runs each as a separate step.

### 2.1 Roles → Concrete Artifacts

| Role | Owns | Concrete artifact |
|---|---|---|
| Test Lead | `docs/TEST_PLAN_1000.md` (16 categories, 1170 cases) | Already exists; gaps must be added per new feature (mandatory rule in CLAUDE.md) |
| Functional QA | Per-feature test files in `tests/` (Vitest) and `scripts/test-*.mjs` | One file per feature, mirrors `src/` layout |
| API QA | `scripts/test-suite.sh` extensions | Add new routes here (mandatory) |
| Email QA | `scripts/qa-test-email-engine.mjs` + `scripts/test-workflow-emails.mjs` | Real Resend sandbox sends |
| Visual / UX QA | Playwright MCP — screenshot diff against `tests/snapshots/` | Browser testing is already a standing instruction |
| Performance | k6 or autocannon scripts in `scripts/perf/` | **Gap — not built** |
| Security / RLS | `scripts/test-rls.mjs` or `tests/integration/rls/*.test.ts` | **Gap — not built**; asserts tenant A can't read tenant B rows on every table with `realtor_id` |
| Compliance | `scripts/test-casl.mjs` | **Gap — not built**; verifies CASL/CAN-SPAM unsubscribe + consent expiry |

### 2.2 Environments

- Local CRM: `npm run dev` → `localhost:3000`
- Local newsletter service: `npm run dev` in `realtors360-newsletter/`
- Local form server: Python on `localhost:8767`
- Single-command boot: extend the `/deploy` skill to start all three.

### 2.3 Test Data

- Baseline: existing `scripts/seed-demo.mjs` (29 contacts, 84 emails, 129 events)
- For perf testing: add `scripts/seed-stress.mjs` for 1k contacts, 10k emails, 50k events

### 2.4 Workflow

1. Branch → write failing tests first (TDD pressure on the playbook's `TESTING` task type)
2. Implement → all tests green locally
3. Run `/test` (full skill, 10 phases) before opening the PR
4. CI re-runs everything on the PR

---

## 3. Automated Test Execution

### 3.1 Triggers

```yaml
# .github/workflows/test.yml
on:
  pull_request: [opened, synchronize]
  push: { branches: [dev, main] }
  schedule: [{ cron: '0 9 * * *' }]   # nightly full suite
  workflow_dispatch: {}
```

### 3.2 Job Matrix

| Job | When | Approx Runtime | Notes |
|---|---|---|---|
| `lint + tsc` | every PR | <2 min | already exists |
| `vitest (newsletter service)` | every PR | ~30s | 67 tests today |
| `vitest (CRM unit)` | every PR | TBD | needs scaffold (this doc's §6) |
| `test-suite.sh` (api+crud) | every PR | ~3 min | needs Supabase test branch |
| `playwright (e2e + visual)` | every PR | ~5 min | headless Chrome + WebKit |
| `email-engine real sends` | nightly only | ~10 min | costs Resend credits |
| `rls + tenant isolation` | every PR | ~1 min | new — see §6 canary |
| `perf smoke (k6)` | nightly only | ~5 min | new |

### 3.3 Reporting

- JUnit XML → GitHub Actions check annotations
- Playwright HTML report → uploaded as artifact
- Failed-test screenshots auto-attached to PR comments via `actions/upload-artifact` + `marocchino/sticky-pull-request-comment`

### 3.4 Deploy Gates

- **Vercel preview deploys:** only after `lint + tsc + vitest + test-suite.sh` are green
- **Production (`main`) deploy:** runs the full matrix including real email sends and the post-deploy probe in §1.3

---

## 4. Test Isolation & Codebase Management

### 4.1 Project Structure

```
realestate-crm/
├── src/
│   ├── (production code)
│   └── __tests__/              # existing unit tests — colocated convention, 81 tests
│       ├── lib/
│       └── utils/
├── tests/
│   ├── integration/            # hits a TEST Supabase project (env-gated)
│   │   ├── actions/
│   │   └── rls/                # cross-tenant isolation canary tests
│   ├── e2e/                    # playwright (future)
│   │   ├── flows/
│   │   └── visual/
│   ├── fixtures/               # static JSON, never imported from src/ (future)
│   └── factories/              # test data builders (future)
├── vitest.config.ts            # include: ['src/__tests__/**', 'tests/integration/**']
├── playwright.config.ts        # testDir: './tests/e2e' (future)
└── scripts/                    # one-shot operational + .mjs test scripts (kept)
```

**Why two test locations?** When the scaffold landed, the CRM already had 81
vitest unit tests living in `src/__tests__/` per the colocated convention.
Migrating them all in one PR would have been a noisy diff with no behavioural
value, so this scaffold preserves them in place and introduces `tests/` as the
home for **integration** tests that need real external resources (Supabase,
Resend, etc.) and must be env-gated. The two locations are unified at the
vitest config level — `npm run test:quick` runs both. Future cleanup may
migrate everything under `tests/unit/`, but it is not a prerequisite for any
of the §6 work.

### 4.2 Naming Conventions

- `*.test.ts` → Vitest
- `*.spec.ts` → Playwright
- Unit test files mirror the source path: `src/lib/foo.ts` ↔ `src/__tests__/lib/foo.test.ts`
- Integration tests live under `tests/integration/<area>/<name>.test.ts`
- Factories: `tests/factories/contact.ts` exports `makeContact(overrides)` — never inline test data in tests

### 4.3 Config Separation

- `vitest.config.ts` excludes `src/**` from coverage's "tested code" wrapper, excludes `tests/**` from production builds
- `tsconfig.test.json` extends base, adds `vitest/globals` types — referenced via TS project references so test-only types never bleed into prod
- `.env.test` → gitignored; CI sets test-only Supabase URL + service key

### 4.4 Why This Matters in This Repo

Today the CRM has scattered test infrastructure: `scripts/test-*.mjs`, `evals.md`, `docs/TEST_PLAN_1000.md`, vitest in the newsletter service, plus 876 E2E tests referenced in memory — but **no single canonical test directory**. The refactor in §6 establishes one.

---

## 5. Bug Fixing & Continuous Retesting Loop

### 5.1 Tracking

- GitHub Issues with labels: `bug:p0|p1|p2|p3`, `area:newsletter|listings|auth|...`, `regression`
- `docs/TECH_DEBT.md` already exists for non-bug debt — keep using it

### 5.2 Prioritization

| Severity | Definition | SLA |
|---|---|---|
| P0 | Data loss, security, prod down | Stop everything, hotfix to `main` |
| P1 | Feature broken for all users | Fix in current sprint |
| P2 | Edge case, workaround exists | Next sprint |
| P3 | Cosmetic, polish | Backlog |

### 5.3 Fix Workflow (one bug = one branch)

1. **Reproduce** with a failing test added to `tests/unit/` or `tests/e2e/` first
2. **Classify** in compliance log per playbook
3. **Fix** with the smallest possible diff
4. **Verify** the new test passes and the full suite still passes
5. **PR** with `Fixes #NNN` — required link to the regression test
6. **Post-merge:** that test stays in the suite forever — *every fixed bug becomes a permanent regression test*

### 5.4 Continuous Retesting

- Nightly full suite against staging (catches drift between fix and other in-flight changes)
- Pre-release: run the full `TEST_PLAN_1000.md` against `dev` before merging `dev → main`
- Post-release: post-deploy health probe runs every 5 min for 1 hour after a `main` deploy

### 5.5 Release Gate

- Zero P0/P1 open
- All new tests in PR are green
- Coverage delta non-negative
- Visual diff has 0 unreviewed changes
- Manual sign-off from a human on the Vercel preview URL (ties into the standing browser-test instruction in `~/.claude/CLAUDE.md`)

---

## 6. First Concrete Steps (the scaffold task)

Executed on branch `claude/test-infra-scaffold` in the same series of commits as this doc:

| # | Step | Status |
|---|---|---|
| 1 | Cherry-pick the cross-tenant `learning-engine` fix from `188f85d` so the regression test in step 3 has something to lock in | ✅ commit `8631c17` |
| 2 | Discover that `vitest.config.ts` already exists at the CRM root with 81 passing tests in `src/__tests__/` — adapt strategy: keep colocated unit tests, add `tests/` for integration | ✅ docs §4.1 amended |
| 3 | Write `src/__tests__/lib/learning-engine.test.ts` — regression test for the cross-tenant fix (asserts the newsletters query receives `.eq('realtor_id', realtorId)`) | ✅ |
| 4 | Write `tests/integration/rls/cross-tenant.test.ts` — env-gated RLS canary that would have caught the M3-C bug at the SQL layer | ✅ skipped without `TEST_SUPABASE_*` env vars |
| 5 | Extend `vitest.config.ts` to include `tests/integration/**` alongside the existing `src/__tests__/**` | ✅ |
| 6 | Add npm scripts: `test:unit`, `test:integration`, `test:rls`, `test:watch` | ✅ |
| 7 | Wire into `.github/workflows/test.yml` as new jobs (additive — does not touch existing jobs) | ⏸ deferred to follow-up — needs CI secrets setup for the test Supabase project |

### 6.1 Out of Scope for the Initial Scaffold

- Migrating `src/__tests__/` → `tests/unit/` (separate cleanup PR; not load-bearing)
- Migrating existing `scripts/test-*.mjs` files into `tests/integration/` (separate cleanup PR)
- Building the production canary system
- Building `seed-stress.mjs`, k6 perf tests, CASL compliance tests
- Provisioning the staging Supabase project for the RLS canary in CI (needs env secrets + a one-time admin setup)

These are tracked in `docs/TECH_DEBT.md` after the scaffold lands.

### 6.2 How to Enable the RLS Canary Locally

```bash
# Point at a TEST Supabase project — never prod
export TEST_SUPABASE_URL="https://<test-project>.supabase.co"
export TEST_SUPABASE_SERVICE_ROLE_KEY="<service role key>"
npm run test:rls
```

Without those vars, the RLS suite skips automatically (`describe.skipIf`).

---

## 7. References

- `realestate-crm/CLAUDE.md` — testing rules (mandatory `/test` after build/deploy)
- `realestate-crm/.claude/agent-playbook.md` — TESTING task type checklist
- `realestate-crm/.claude/rules/execution-patterns.md` — per-feature test requirements
- `realestate-crm/docs/TEST_PLAN_1000.md` — 1170 manual + automated cases
- `realestate-crm/docs/TECH_DEBT.md` — open testing gaps tracked here
- `realestate-crm/realtors360-newsletter/vitest.config.ts` — reference vitest setup (newsletter service)
- `~/.claude/CLAUDE.md` — global Auto Browser Testing standing instruction

<!-- Last reviewed: 2026-04-21 -->



<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->

<!-- Last reviewed: 2026-04-21 — Waves 2a/2b/2c -->
