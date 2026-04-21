# TESTING.md — Realtors360 test authoring rules

**You are editing Realtors360's test suite. Read this file first, every session.**
**Detailed rationale: `docs/testing.md` — read only when a rule below points you there.**

## Before you write a single line

1. Run `./scripts/preflight.sh`. If it fails, fix the environment first.
2. Open `tests/rtm.yaml`. Find the REQ-ID(s) your change affects. If none exist, add them before writing tests.
3. Pick the right layer (see Layer table below). If unsure, stop and ask the user.

---

## The 10 Rules You Will Not Violate

### 1. Every test title matches this regex — enforced by CI

```
^REQ-[A-Z]+-\d+(,\s*REQ-[A-Z]+-\d+)*\s+TC-[A-Z]+-\d+:\s+.+@p[012](\s+@\w+)*$
```

Example: `REQ-AUTH-003 TC-LI-001: rejects unauthenticated API call @p0 @auth`

### 2. Every requirement in `rtm.yaml` must map to at least 1 test

Run `npm run test:rtm` — it must pass before you open a PR. No exceptions; use a waiver with expiry if truly blocked.

### 3. L4 API tests use 3-layer assertions

For state-mutating operations, assert on:
- **Response** — HTTP status + body shape
- **Database** — row created/updated/deleted via Supabase admin client
- **Side effects** — Twilio SMS sent, Resend email sent, notification created

If a layer is N/A, write a one-line comment: `// N/A: no external side effects`

### 4. Every tenant-scoped test includes a two-user RLS assertion

User A creates data; assert User B cannot see it via the API. Use two separately-authenticated sessions. Our `getAuthenticatedTenantClient()` auto-injects `realtor_id` — test that it actually isolates.

### 5. Never mock the Supabase client for integration tests

Use a real Supabase connection with test data. Mocking hides RLS policy bugs, constraint violations, and trigger failures. Clean up test data in `afterEach`.

### 6. Never bypass auth to "make the test simpler"

Mint a real session via the demo login flow or `tests/helpers/auth-helpers.ts`. Route-level auth mocking hides real auth bugs.

### 7. External services are stubbed at the HTTP boundary

Twilio, Resend, Anthropic Claude, Kling AI, Google Calendar — stub with `nock` or MSW, never by mocking the SDK module. Stubs live in `tests/helpers/stubs.ts`.

### 8. Flaky tests do not get retried into green

If a test is flaky, quarantine it with `@flaky` tag and add a row to `tests/flakes.md` with root cause. Max 30 days in quarantine — then fix or delete.

### 9. No new E2E test unless the scenario genuinely requires a browser

Default to L1 (unit) / L2 (component) / L4 (integration). E2E is capped at 15% of the pyramid. If your change would push us over, move coverage down a layer.

### 10. Push bugs down the pyramid

When a bug is found, add a test at the **lowest layer** that could have caught it. A bug found in E2E that a unit test could catch → write the unit test, not another E2E test.

---

## Layer — Pick One

| If your change is... | Layer | Template |
|---|---|---|
| A pure function, validator, formatter, calculator | L1 unit | `tests/templates/unit.template.test.ts` |
| A React component's render/interaction logic | L2 component | `tests/templates/component.template.spec.tsx` |
| A Zod schema or API contract shape | L3 contract | `tests/templates/contract.template.spec.ts` |
| A server action or API route | L4 integration | `tests/templates/server-action.template.spec.ts` |
| A full user journey that can't be decomposed | L5 E2E | `tests/templates/e2e-process.template.spec.ts` |
| Accessibility (axe-core, keyboard nav) | L6a | `tests/templates/a11y.template.spec.ts` |
| Resilience to dependency failure | L7 | see `docs/testing.md` L7 section |

---

## Before You Open the PR

Run, in order:

```bash
./scripts/preflight.sh           # types + lint + secrets
npm run test:rtm                 # requirements <-> tests
npm run test:quick               # unit tests for changed files
npm run test:e2e:p0              # P0 E2E (<10min)
```

All four must be green. CI will re-run them; running locally saves cycles.

---

## Quality Gates

| Gate | When | What runs | Time budget |
|---|---|---|---|
| G0 | Pre-commit (local) | L0 on changed files, L1 on changed files | <10s |
| G1 | PR opened | L0 full + L1 full + L2 + L3 + L5 @p0 only | <10min |
| G2 | PR ready for review | G1 + L4 full + L5 @p0+@p1 + L6a changed pages | <20min |
| G3 | Merge to dev | G2 + L5 full + L6a full | <45min |

---

## When Unsure

Stop and ask the user. Do not guess a REQ-ID, do not invent a TC-prefix, do not write a test without an `rtm.yaml` entry. The cost of asking is 30 seconds; the cost of a non-compliant test is a full revert.

---

## Escalation

- Rule seems wrong in context -> flag to user, do not silently deviate
- Template missing for your case -> use closest match, note the gap in PR description
- RTM audit fails and you think it's a false positive -> it isn't; re-read Rule 2
